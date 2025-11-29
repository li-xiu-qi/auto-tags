# Release 工作流说明

本文档解释了 `.github/workflows/release.yml` 文件中定义的 GitHub Actions 工作流，用于自动发布 Obsidian 插件。

## 工作流概述

此工作流名为 "Release Obsidian plugin"，旨在当推送新标签时自动构建插件并创建 GitHub Release。

## 触发条件

工作流在以下情况下触发：

- **手动触发**：通过 GitHub UI 手动运行工作流（`workflow_dispatch`）。
- **标签推送**：当推送任何标签（`tags: - "*"`）到仓库时自动触发。

## 作业：build

作业在 `ubuntu-latest` 环境中运行，包含以下步骤：

### 1. 检出代码

使用 `actions/checkout@v3` 检出仓库代码。

### 2. 设置 Node.js

使用 `actions/setup-node@v3` 设置 Node.js 环境，版本为 18.x。

### 3. 构建插件

运行以下命令：

- `npm install`：安装项目依赖。
- `npm run build`：构建插件（通常使用 esbuild 或类似工具打包代码）。

### 4. 创建 GitHub Release

使用 `actions/create-release@v1` 创建 GitHub Release：

- 标签名和 Release 名称使用 `${{ github.ref_name }}`（即推送的标签名）。
- Release 设置为草稿（`draft: true`），需要手动发布。
- 使用 `GITHUB_TOKEN` 进行认证。

### 5. 上传 Release 资产

上传三个关键文件作为 Release 资产：

- **main.js**：插件的主文件，内容类型为 `application/javascript`。
- **manifest.json**：插件清单文件，内容类型为 `application/json`。
- **styles.css**：插件样式文件，内容类型为 `text/css`。

这些文件是 Obsidian 插件的标准组成部分，用户下载 Release 后可以安装插件。

## 使用方法

1. 在本地开发完成后，提交代码并推送新标签：

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. 工作流将自动触发，构建插件并创建草稿 Release。
3. 在 GitHub Release 页面手动发布草稿。

## 注意事项

- Release 创建为草稿，需要手动发布以使其公开。
- 确保 `GITHUB_TOKEN` 有足够的权限创建 Release 和上传资产。
- 如果构建失败，检查 `npm run build` 的配置和依赖。
