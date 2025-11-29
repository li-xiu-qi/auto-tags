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
- 工作流会上传编译后的插件文件作为 Release 资产：`main.js`、`manifest.json` 和 `styles.css`，并会打包一个 `obsidian-auto-tags-<tag>.zip`（包含这三个文件）作为附加资产。

## 常见错误与排查

### 错误：`Error: Resource not accessible by integration`

该错误表示 GitHub Actions 运行的 token（通常是 `GITHUB_TOKEN`）没有足够权限去创建 Release 或上传资产。这通常出现在以下场景：

- 仓库 `Settings -> Actions -> General` 中的 Workflow permissions 设置为 `Read repository contents only`。
- 触发工作流的事件来自 fork（为安全起见，来自 fork 的运行受限）。
- 组织策略或分支保护策略限制了写权限。

解决步骤：

1) 在仓库 Settings -> Actions -> General 中将 Workflow permissions 设置为 **Read and write permissions**。

2) 如果你的 tag 是从 fork 推送或你需要更高权限，建议创建一个 Personal Access Token（PAT）并把它保存为 `RELEASE_TOKEN`：

    - 在 GitHub：Settings -> Developer settings -> Personal access tokens -> Fine-grained tokens -> Generate new token。
    - 选择目标仓库并设置以下 Repository permissions：
       - Contents: Read and write
       - Actions: Read and write
       - Packages: Read and write（如果需要）
    - 生成后复制 token（仅显示一次），并在仓库 Settings -> Secrets and variables -> Actions -> New repository secret 中创建 `RELEASE_TOKEN`。

3) Workflow 里已经设置为优先使用 `secrets.RELEASE_TOKEN`，如果存在，将替代 `GITHUB_TOKEN`。设置好 secret 后，重新触发 workflow 或重新创建 tag。

4) 如果上面步骤仍然失效，请把 GitHub Actions 的完整失败日志贴出来，我会帮你分析错误码（例如 403/401）并给出更具体的修复建议。

## 可选：如何手动打包并上传 zip（如果你希望用户一次性下载 zip）

1. 在本地或 CI 中创建 zip 包：

   ```bash
   zip -r plugin-v0.0.1.zip main.js manifest.json styles.css
   ```

2. 在 GitHub Releases 页面上传 zip，或使用 gh CLI：

   ```bash
   gh release upload v0.0.1 plugin-v0.0.1.zip --clobber
   ```

注：如果你希望恢复自动构建 zip 的功能，我可以在 workflow 中添加一个非常简单的打包上传步骤。

## 重新触发/覆盖已有 Tag（重新发布）

如果你需要重置远程 tag 并重新触发 release（例如修复了构建或上传问题），可以使用下面的命令：

```bash
# 删除远程标签 v0.0.1
git push origin --delete v0.0.1

# 如果需要，删除本地标签（如果存在）
git tag -d v0.0.1

# 重新创建本地标签（可选 - 指向当前提交）
git tag v0.0.1

# 推送标签到远程（触发 Actions）
git push origin v0.0.1
```

说明：

- 删除远程 tag 会移除相应的 GitHub Release（如有）。有时需要在 GitHub Releases 页面删除 Draft Release 后再重新创建 tag。
- 在重新创建并推送 tag 后，工作流会重新运行，生成新的 Release 并上传资产。
- 注意：如果你的 Release 已经发布（而非草稿），删除 tag 并不会自动删除该 Release；你可能还需在 Releases 页面手动删除相应的 Release 条目。

