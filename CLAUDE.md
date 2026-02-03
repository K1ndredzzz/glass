# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Glass by Pickle 是一个开源的桌面AI助手应用，能够实时查看屏幕、监听音频、理解上下文并将每一刻转化为结构化知识。这是一个基于 Electron 的跨平台应用（支持 macOS 和 Windows），使用 Next.js 构建 Web 界面。

## 核心架构原则

### 1. 集中化数据逻辑
- **所有数据持久化逻辑必须在 Electron 主进程中**（[src/index.js:1](src/index.js#L1)）
- UI 层（renderer 和 web dashboard）**禁止**直接访问数据源
- 所有数据库操作必须通过 Repository 层进行

### 2. 双数据库架构（Repository Pattern）
每个处理用户数据的 Repository 必须有两个实现：
- **SQLite**：默认本地存储，支持离线功能（[src/features/common/services/sqliteClient.js:1](src/features/common/services/sqliteClient.js#L1)）
- **Firebase Firestore**：云端存储，支持跨设备同步和 Web Dashboard

数据库选择逻辑：
- Repository 的 `index.js` 使用 Factory Pattern 动态选择数据源
- 通过 `authService.getCurrentUser()` 检查登录状态
- 已登录用户使用 Firebase，未登录用户使用 SQLite
- Adapter 自动注入当前用户的 `uid`，Service 层无需关心

### 3. 特性模块化（Feature-Based）
代码按功能组织在 [src/features/](src/features/) 目录下：
- `ask/`：AI 问答功能
- `listen/`：音频监听、语音转文字（STT）、会议摘要
- `settings/`：应用设置
- `shortcuts/`：快捷键管理
- `common/`：跨功能共享的服务、Repository、配置

### 4. AI Provider 抽象（Factory Pattern）
- AI 提供商在 [src/features/common/ai/providers/](src/features/common/ai/providers/) 中实现
- 支持的提供商：OpenAI、Anthropic、Gemini、Ollama（本地 LLM）、Whisper、Deepgram
- 添加新提供商：创建符合基础接口的模块并在 [factory.js](src/features/common/ai/factory.js) 中注册

### 5. 数据库 Schema 单一来源
- **所有 SQLite 表结构定义在** [src/features/common/config/schema.js](src/features/common/config/schema.js)
- 任何数据库结构变更**必须**在此文件中更新
- 核心表：users、sessions、transcripts、ai_messages、summaries、prompt_presets、provider_settings

### 6. 默认加密
- 所有敏感数据（API 密钥、对话标题、转录文本、AI 摘要）在存储到 Firebase 前**必须**加密
- 使用 [firestoreConverter.js](src/features/common/repositories/firestoreConverter.js) 中的 `createEncryptedConverter` 自动处理

## 常用命令

### 开发与构建
```bash
# 首次安装依赖并构建（必须使用 Node.js 20.x.x）
npm run setup

# 启动应用（会先构建 renderer）
npm start

# 仅构建 renderer 层
npm run build:renderer

# 仅构建 Web 前端
npm run build:web

# 构建所有组件（renderer + web）
npm run build:all

# 观察模式构建 renderer
npm run watch:renderer
```

### 打包与发布
```bash
# 打包应用（不发布）
npm run build

# 仅打包 Windows 版本
npm run build:win

# 打包为目录形式（调试用）
npm run package

# 发布到 GitHub（draft release）
npm run publish
```

### 代码质量
```bash
# ESLint 检查
npm run lint

# Web 前端 lint
cd pickleglass_web && npm run lint
```

## 项目结构

### Electron 主进程（src/）

#### Service-Repository 模式
- **Views**（`*.html`, `*View.js`）：UI 层，负责渲染和用户交互
- **Services**（`*Service.js`）：业务逻辑层，连接 View 和 Repository
- **Repositories**（`*.repository.js`）：数据访问层，唯一可直接操作数据库的层

关键目录：
- [src/index.js](src/index.js)：应用入口，初始化核心服务、数据库、窗口管理
- [src/features/](src/features/)：功能模块
- [src/window/](src/window/)：窗口管理（windowManager、layoutManager、smoothMovement）
- [src/bridge/](src/bridge/)：IPC 通信桥接（featureBridge、windowBridge、internalBridge）
- [src/ui/](src/ui/)：UI 组件（app、ask、listen、settings）
- [src/preload.js](src/preload.js)：Preload 脚本，暴露安全的 API 给 renderer

### Web Dashboard（pickleglass_web/）

Next.js 应用，三层架构：
1. **Frontend**（`app/`）：React 用户界面
2. **Backend**（`backend_node/`）：Express.js 中间层
3. **Electron Main**：数据访问的最终权威

#### IPC 数据流
```
Next.js Frontend → HTTP Request → Node.js Backend →
IPC (web-data-request) → Electron Main → SQLite/Firebase →
IPC Response → Node.js Backend → HTTP Response → Frontend
```

重要文件：
- [backend_node/ipcBridge.js](pickleglass_web/backend_node/ipcBridge.js)：IPC 请求辅助函数
- [backend_node/routes/](pickleglass_web/backend_node/routes/)：API 路由（auth、conversations、presets、user）

### 音频回声消除（aec/）

基于 Rust 的音频回声消除模块（使用 speexdsp）：
- 支持多平台（Windows、macOS、Linux、移动端）
- 提供 Rust 和 Python 绑定
- 用于分离麦克风音频和系统音频

## 关键服务说明

### authService（[src/features/common/services/authService.js](src/features/common/services/authService.js)）
- 管理 Firebase 身份验证
- 提供 `getCurrentUser()` 和 `getCurrentUserId()` 给 Repository 层
- 处理自定义 Token 登录

### modelStateService（[src/features/common/services/modelStateService.js](src/features/common/services/modelStateService.js)）
- API 密钥管理的单一来源
- 管理 LLM 和 STT 模型选择
- 通过 `provider_settings` 表持久化配置

### listenService（[src/features/listen/listenService.js](src/features/listen/listenService.js)）
- 音频捕获和实时转录
- 管理录音会话生命周期
- 协调 STT 和 Summary 子服务

### ollamaService（[src/features/common/services/ollamaService.js](src/features/common/services/ollamaService.js)）
- 管理本地 Ollama LLM
- 自动下载和预热模型
- 优雅关闭以避免资源泄漏

## 深度链接（Protocol Handling）

应用注册 `pickleglass://` 协议：
- `pickleglass://login?token=xxx`：Firebase 身份验证回调
- `pickleglass://personalize?...`：个性化设置跳转
- 跨平台支持（Windows 使用 `second-instance`，macOS 使用 `open-url`）

## Firebase 集成

### Firebase Functions（functions/）
- Node.js 20 运行时
- 提供云端认证回调端点
- 部署命令：`npm run deploy`（需进入 functions/ 目录）

### Firestore 结构
与 SQLite Schema 保持一致，但所有敏感字段经过加密：
- Collections：users、sessions、transcripts、ai_messages、summaries、prompt_presets

## 开发注意事项

### Node.js 版本要求
**必须使用 Node.js 20.x.x**，避免原生依赖构建错误：
```bash
node --version  # 确认版本
# 推荐使用 nvm 管理版本
```

### Windows 额外要求
安装 [Build Tools for Visual Studio](https://visualstudio.microsoft.com/downloads/)

### 首次构建
运行 `npm run setup` 前确保：
1. Web 前端构建输出目录存在（`pickleglass_web/out/`）
2. 如果缺失，先执行 `cd pickleglass_web && npm install && npm run build`

### 打包调试
如果打包后的应用无法启动：
1. 检查 [electron-builder.yml](electron-builder.yml) 的 `extraResources` 配置
2. 确认 `pickleglass_web/out/` 已正确复制到 `resources/out/`
3. 使用 `npm run package` 生成未压缩目录以便检查

### 数据库迁移
- 迁移逻辑在 [migrationService.js](src/features/common/services/migrationService.js)
- 添加新表/字段后，在 `schema.js` 中更新并创建迁移函数

### 快捷键
- **Ctrl/Cmd + \\**：显示/隐藏主窗口
- **Ctrl/Cmd + Enter**：基于屏幕和音频历史询问 AI
- **Ctrl/Cmd + 方向键**：移动主窗口位置

## 贡献指南

参考 [CONTRIBUTING.md](CONTRIBUTING.md) 和 [docs/DESIGN_PATTERNS.md](docs/DESIGN_PATTERNS.md)：
1. 所有工作必须关联 Issue（使用 `/assign` 认领）
2. 分支命名：`feat/描述` 或 `fix/描述`
3. 代码风格：使用 Prettier 和 ESLint
4. PR 必须链接 Issue（`Closes #123`）

## 相关链接

- Discord: https://discord.gg/UCZH5B5Hpd
- 官网: https://pickle.com
- 设计模式文档: [docs/DESIGN_PATTERNS.md](docs/DESIGN_PATTERNS.md)
