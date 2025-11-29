# 调试：CORS / 浏览器环境与 StepFun/OpenAI SDK 问题

以下为本次问题的概述、原因分析、解决步骤、修改记录和后续建议。该文档旨在帮助维护者和用户理解在 Obsidian 插件（renderer / 浏览器-like 环境）下调用 OpenAI API 时，为什么会出现“Connection error”和 CORS 报错，以及本仓库如何修复和缓解这些问题。

---

## 问题描述

在 Obsidian 插件内调用模型生成标签时，用户看到如下错误（示例）：

- `Test failed: Connection error: Check your network connectivity and the Base URL setting. See console for details.`
- DevTools Console 中可能出现：
  - `Access to fetch at 'https://api.stepfun.com/v1/chat/completions' from origin 'app://obsidian.md' has been blocked by CORS policy: Request header field x-stainless-os is not allowed by Access-Control-Allow-Headers in preflight response.`
  - `POST https://api.stepfun.com/v1/chat/completions net::ERR_FAILED`

通过在 Node 中直接运行 `node test_stepfun_chat.js` 能够成功返回 response，说明 API Key、Base URL 与模型均正常可用。

---

## 根因分析

1. **SDK 默认阻止浏览器端使用秘钥**：OpenAI / StepFun SDK 为避免 API Key 泄露，默认检测到“浏览器-like”环境时会阻止 Key 的直接使用并抛出错误。解决办法包括在安全场景下显式设置 `dangerouslyAllowBrowser: true`，或者在后端代理/Node 端使用。

2. **CORS 预检失败**：服务器对浏览器的跨域请求（preflight）会检查 `Access-Control-Allow-Headers`。SDK 或 LangChain 在请求中可能添加自定义头（如 `x-stainless-os`），而目标服务未允许该头，于是 preflight 被拒绝导致请求失败。

3. **fetch / 环境问题**：在某些 renderer 或 Electron 环境下，`globalThis.fetch` 可能不稳定或不存在，导致 SDK 抛 `fetch is not defined` 或直接失败。

综合以上，插件在 renderer（Obsidian）环境中出现的问题与浏览器策略 + SDK 自增 header 有直接关系，而 Node 环境（如 `test_stepfun_chat.js`）没有这些限制，所以能成功运行。

---

## 本仓库的解决策略（已实现）

为同时兼容用户向内快速调试与尽量减少跨域问题，我们采取了如下合并与防护措施：

1. **允许显式在浏览器环境使用 Key（开发/测试）**：在 `OpenAI` client 初始化中默认设置 `dangerouslyAllowBrowser: true`，可在后续改为可选开关（`allowBrowserApiKey`）。
   - 相关改动：
     - `src/utils.ts`：`new OpenAI({ apiKey, baseURL, dangerouslyAllowBrowser: true, ...(fetch ? { fetch } : {}) })`
     - `test_stepfun_chat.js`：`dangerouslyAllowBrowser: true`（保持测试脚本行为一致）。

2. **显式传入 `fetch`（如果存在）**：在运行时检测 `globalThis.fetch`，若可用则作为 `fetch` 传入 OpenAI client，避免 SDK 内部尝试读取可能不存在的全局 `fetch`。
   - 相关改动：`src/utils.ts`

3. **优先使用原生 `fetch` 发起 POST 请求到 `/chat/completions`（避开 SDK 添加的非标准头）**：
   - 原理：如果使用 SDK（或 LangChain）发起请求，它可能自动插入自定义头部（如 `x-stainless-os`），这会导致服务端 preflight 被拒绝。我们先尝试用 `fetch(chatUrl, { headers: { Authorization } })` 以避免非标准 header，若请求失败则回退到 SDK 方式（保留兼容性）。
   - 相关改动：`src/utils.ts`（在 `generateTags` 中实现：fetch 优先 -> SDK 回退）

4. **改进 Test Connection 流程（增加 ping）**：在 `Settings` 中的 Test Connection 按钮先 Ping `{baseURL}/models` 检查网络/鉴权，再运行小型 `generateTags` 测试。Ping 成功但 POST 失败通常意味着 CORS 或 请求头问题。
   - 相关改动：`src/settings-tab.ts`

5. **改进错误诊断与提示**：对于常见情况（fetch 未定义 / CORS / x-stainless-os / connection）抛出更加友好的错误提示，同时将详细响应或 body 打印到控制台以便调试。
   - 相关改动：`src/utils.ts`、`src/settings-tab.ts`

6. **保留 SDK fallback**：若 `fetch` 方式失败（例如网络 error 或服务端返回不同格式）、我们会回退到 SDK 的 create 方法以维持兼容性和功能完整性。

