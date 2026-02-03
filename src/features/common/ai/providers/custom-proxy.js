/**
 * 自定义反代 API 提供商
 * 支持 OpenAI 兼容的 API 格式
 */
class CustomProxyProvider {
    static async validateApiKey(key) {
        // 简单验证密钥格式
        if (!key || typeof key !== 'string') {
            return { success: false, error: '无效的 API Key 格式' };
        }

        try {
            // 尝试发送一个简单的请求来验证密钥
            const response = await fetch('https://gcli2api.fuzhouxing.cn/v1/models', {
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok || response.status === 404) {
                // 即使 /v1/models 不存在，只要不是认证错误就算成功
                return { success: true };
            } else if (response.status === 401 || response.status === 403) {
                return { success: false, error: 'API Key 验证失败' };
            } else {
                return { success: true }; // 其他错误不影响密钥有效性
            }
        } catch (error) {
            console.error(`[CustomProxyProvider] 验证密钥时网络错误:`, error);
            return { success: false, error: '网络错误，无法验证密钥' };
        }
    }
}

/**
 * 创建自定义代理 STT 会话
 * 注意: 如果反代 API 不支持 STT，这将是一个占位符
 */
async function createSTT({ apiKey, language = "en", callbacks = {}, ...config }) {
    console.warn("[CustomProxy] STT 功能可能不被反代 API 支持。建议使用其他 STT 提供商。");

    return {
        sendRealtimeInput: async (audioData) => {
            console.warn("[CustomProxy] STT sendRealtimeInput 被调用但未实现");
        },
        close: async () => {
            console.log("[CustomProxy] STT 会话已关闭");
        },
    };
}

/**
 * 创建自定义代理 LLM 实例
 * @param {object} opts - 配置选项
 * @param {string} opts.apiKey - API 密钥
 * @param {string} [opts.model='gemini-3-pro-preview'] - 模型名称
 * @param {number} [opts.temperature=0.7] - 温度参数
 * @param {number} [opts.maxTokens=4096] - 最大 token 数
 * @param {string} [opts.baseURL='https://gcli2api.fuzhouxing.cn'] - API 基础 URL
 * @returns {object} LLM 实例
 */
function createLLM({
    apiKey,
    model = 'gemini-3-pro-preview',
    temperature = 0.7,
    maxTokens = 4096,
    baseURL = 'https://gcli2api.fuzhouxing.cn',
    ...config
}) {
    const apiUrl = `${baseURL}/v1/chat/completions`;

    const callApi = async (messages) => {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    temperature: temperature,
                    max_tokens: maxTokens,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`自定义代理 API 错误: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();

            return {
                content: result.choices[0].message.content,
                raw: result
            };
        } catch (error) {
            console.error("自定义代理 API 错误:", error);
            throw error;
        }
    };

    return {
        generateContent: async (parts) => {
            const messages = [];
            let systemPrompt = '';
            let userContent = [];

            for (const part of parts) {
                if (typeof part === 'string') {
                    if (systemPrompt === '' && part.includes('You are')) {
                        systemPrompt = part;
                    } else {
                        userContent.push({ type: 'text', text: part });
                    }
                } else if (part.inlineData) {
                    // 支持图片（如果 API 支持多模态）
                    userContent.push({
                        type: 'image_url',
                        image_url: {
                            url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
                        }
                    });
                }
            }

            if (systemPrompt) {
                messages.push({ role: 'system', content: systemPrompt });
            }
            if (userContent.length > 0) {
                // 如果只有文本，直接传字符串；如果有图片，传数组
                const content = userContent.length === 1 && userContent[0].type === 'text'
                    ? userContent[0].text
                    : userContent;
                messages.push({ role: 'user', content: content });
            }

            const result = await callApi(messages);

            return {
                response: {
                    text: () => result.content
                },
                raw: result.raw
            };
        },

        // 兼容聊天式接口
        chat: async (messages) => {
            return await callApi(messages);
        }
    };
}

/**
 * 创建自定义代理流式 LLM 实例
 * @param {object} opts - 配置选项
 * @param {string} opts.apiKey - API 密钥
 * @param {string} [opts.model='gemini-3-pro-preview'] - 模型名称
 * @param {number} [opts.temperature=0.7] - 温度参数
 * @param {number} [opts.maxTokens=4096] - 最大 token 数
 * @param {string} [opts.baseURL='https://gcli2api.fuzhouxing.cn'] - API 基础 URL
 * @returns {object} 流式 LLM 实例
 */
function createStreamingLLM({
    apiKey,
    model = 'gemini-3-pro-preview',
    temperature = 0.7,
    maxTokens = 4096,
    baseURL = 'https://gcli2api.fuzhouxing.cn',
    ...config
}) {
    const apiUrl = `${baseURL}/v1/chat/completions`;

    return {
        streamChat: async (messages) => {
            console.log("[CustomProxy Provider] 开始流式请求");

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: messages,
                        temperature: temperature,
                        max_tokens: maxTokens,
                        stream: true,
                    }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`自定义代理 API 错误: ${response.status} ${response.statusText} - ${errorText}`);
                }

                console.log("[CustomProxy Provider] 流式响应已建立");
                return response;
            } catch (error) {
                console.error("[CustomProxy Provider] 流式请求错误:", error);
                throw error;
            }
        }
    };
}

module.exports = {
    CustomProxyProvider,
    createSTT,
    createLLM,
    createStreamingLLM
};
