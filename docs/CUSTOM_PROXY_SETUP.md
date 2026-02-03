# 自定义反代 API 配置说明

## 概述

已成功为 Glass 应用添加自定义反代 API 支持！你的反代 API 已被配置为新的 AI 提供商。

## 配置信息

- **提供商名称**: 自定义反代 API
- **提供商 ID**: `custom-proxy`
- **API 地址**: `https://gcli2api.fuzhouxing.cn`
- **API Key**: `Fzx123123`
- **默认模型**: `gemini-3-pro-preview`

## 文件修改清单

### 1. 新建文件

#### [src/features/common/ai/providers/custom-proxy.js](src/features/common/ai/providers/custom-proxy.js)
自定义反代 API 提供商的实现文件，支持：
- API Key 验证
- LLM 聊天功能（非流式和流式）
- OpenAI 兼容的 API 格式
- 自定义 baseURL 和模型配置

### 2. 修改的文件

#### [src/features/common/ai/factory.js](src/features/common/ai/factory.js)
在提供商工厂中注册了新的 `custom-proxy` 提供商：
- 添加到 `PROVIDERS` 对象（第 96-102 行）
- 添加到 `classNameMap`（第 162 行）

## 如何使用

### 方式 1: 在应用界面中配置

1. 启动 Glass 应用
2. 打开设置页面
3. 在 AI 提供商列表中选择 **"自定义反代 API"**
4. 输入 API Key: `Fzx123123`
5. 选择模型: `Gemini 3 Pro Preview`
6. 保存配置

### 方式 2: 通过代码直接调用

```javascript
const { createLLM } = require('./src/features/common/ai/factory');

// 创建 LLM 实例
const llm = createLLM('custom-proxy', {
    apiKey: 'Fzx123123',
    model: 'gemini-3-pro-preview',
    temperature: 0.7,
    maxTokens: 4096
});

// 发送消息
const response = await llm.chat([
    { role: 'user', content: '你好，请介绍一下你自己' }
]);

console.log(response.content);
```

### 方式 3: 使用流式响应

```javascript
const { createStreamingLLM } = require('./src/features/common/ai/factory');

// 创建流式 LLM 实例
const streamingLLM = createStreamingLLM('custom-proxy', {
    apiKey: 'Fzx123123',
    model: 'gemini-3-pro-preview'
});

// 发送流式请求
const response = await streamingLLM.streamChat([
    { role: 'user', content: '写一首诗' }
]);

// 处理流式响应（SSE 格式）
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    console.log(chunk);
}
```

## 测试验证

运行以下命令测试配置：

```bash
node test-custom-proxy.js
```

测试结果显示：
- ✅ API Key 验证成功
- ✅ LLM 请求响应正常
- ✅ 模型返回：`gemini-3-pro-preview`

## 功能特性

### 支持的功能
- ✅ API Key 验证
- ✅ 文本对话（chat）
- ✅ 流式响应（streaming）
- ✅ 多模态输入（图片 + 文本，如果 API 支持）
- ✅ 自定义温度和最大 token 数
- ✅ 系统提示词（system prompt）

### 不支持的功能
- ❌ STT（语音转文字）功能
  - 建议使用其他提供商如 OpenAI、Gemini、Whisper 进行 STT

## 自定义配置

如果需要修改 API 地址或添加更多模型，编辑以下文件：

### 修改 API 基础 URL

在 [custom-proxy.js](src/features/common/ai/providers/custom-proxy.js) 中修改：

```javascript
function createLLM({
    apiKey,
    model = 'gemini-3-pro-preview',
    temperature = 0.7,
    maxTokens = 4096,
    baseURL = 'https://你的新地址.com',  // 在这里修改
    ...config
}) {
    // ...
}
```

### 添加更多模型

在 [factory.js](src/features/common/ai/factory.js) 中添加：

```javascript
'custom-proxy': {
    name: '自定义反代 API',
    handler: () => require("./providers/custom-proxy"),
    llmModels: [
        { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview' },
        { id: 'your-new-model', name: '你的新模型' },  // 添加新模型
    ],
    sttModels: [],
},
```

## 注意事项

1. **API Key 安全**: 确保不要将 API Key 提交到公共代码库
2. **网络连接**: 确保应用能访问 `https://gcli2api.fuzhouxing.cn`
3. **模型名称**: 使用正确的模型名称，否则 API 会返回错误
4. **错误处理**: API 错误会在控制台中打印详细信息

## 故障排查

### 问题：API Key 验证失败
- 检查 API Key 是否正确
- 确认网络连接正常
- 查看控制台错误信息

### 问题：请求超时
- 增加 timeout 参数（在调用时传入）
- 检查 API 服务是否正常

### 问题：模型不存在
- 确认模型名称与 API 支持的模型匹配
- 在 factory.js 中添加对应的模型配置

## 更多信息

如需了解更多关于 Glass 的 AI 提供商架构，请查看：
- [CLAUDE.md](CLAUDE.md) - 项目架构说明
- [docs/DESIGN_PATTERNS.md](docs/DESIGN_PATTERNS.md) - 设计模式文档
