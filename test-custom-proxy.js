// 测试自定义反代 API 提供商的简单脚本
// 运行方式: node test-custom-proxy.js

const { CustomProxyProvider, createLLM } = require('./src/features/common/ai/providers/custom-proxy.js');

async function testCustomProxy() {
    console.log('========================================');
    console.log('测试自定义反代 API 提供商');
    console.log('========================================\n');

    const apiKey = 'Fzx123123';
    const model = 'gemini-3-pro-preview';
    const baseURL = 'https://gcli2api.fuzhouxing.cn';

    // 测试 1: 验证 API Key
    console.log('测试 1: 验证 API Key...');
    try {
        const validation = await CustomProxyProvider.validateApiKey(apiKey);
        if (validation.success) {
            console.log('✅ API Key 验证成功\n');
        } else {
            console.log('❌ API Key 验证失败:', validation.error, '\n');
            return;
        }
    } catch (error) {
        console.log('❌ 验证过程出错:', error.message, '\n');
        return;
    }

    // 测试 2: 创建 LLM 实例并发送简单请求
    console.log('测试 2: 创建 LLM 实例并发送测试消息...');
    try {
        const llm = createLLM({
            apiKey,
            model,
            baseURL,
            temperature: 0.7,
            maxTokens: 100
        });

        console.log('发送测试消息: "你好，请用一句话介绍你自己"');

        const response = await llm.chat([
            { role: 'user', content: '你好，请用一句话介绍你自己' }
        ]);

        console.log('✅ 收到响应:');
        console.log('---');
        console.log(response.content);
        console.log('---\n');
    } catch (error) {
        console.log('❌ LLM 请求失败:', error.message, '\n');
        console.error('详细错误:', error);
        return;
    }

    console.log('========================================');
    console.log('所有测试完成！');
    console.log('========================================');
}

// 运行测试
testCustomProxy().catch(error => {
    console.error('测试脚本执行失败:', error);
    process.exit(1);
});
