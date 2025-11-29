import { App, FrontMatterInfo, Notice, TFile, Vault, getFrontMatterInfo, TFolder, TAbstractFile, parseFrontMatterTags } from 'obsidian';
import { AiTaggerSettings } from "../settings";
import { generateTags } from "../ai-generation";

/**
 * 为指定文件和文本生成标签。
 * @param app Obsidian App 实例
 * @param settings 插件设置
 * @param currentFile 当前文件
 * @param text 文本内容
 */
export async function tagText(app: App, settings: AiTaggerSettings, currentFile: TFile, text: string) {
	// 通知用户正在生成标签
	new Notice("Generating tags...");
	console.info("Generating tags...");

	// 如果文档没有 frontmatter，contentStart 将返回 0
	let { contentStart }: FrontMatterInfo = getFrontMatterInfo(text);

	// 获取去除 frontmatter 之后的文档内容
	let content: string = text.substring(contentStart);
	console.debug("Content:", content.substring(0, 30) + "...")

	try {
		// 使用 parseFrontMatterTags 获取现有标签
		const existingTags: string[] = parseFrontMatterTags(app.metadataCache.getFileCache(currentFile)?.frontmatter) || [];
		console.debug("Existing Tags:", existingTags);

		// 使用 generateTags 函数为文档生成标签
		let generatedTags: string[] = await generateTags(app, content, existingTags, settings);
		console.debug("Generated Tags:", generatedTags);

		// 如果设置了强制小写标签，则转为小写
		if (settings.lowercaseTags) {
			generatedTags = generatedTags.map(tag => tag.toLowerCase());
		}

		// 使用生成的标签更新 frontmatter
		app.fileManager.processFrontMatter(currentFile, frontmatter => {
			if (!frontmatter["tags"]) {
				frontmatter["tags"] = generatedTags;
			} else {
				frontmatter["tags"].push(...generatedTags)
			}
		});
	} catch (error) {
		const message = (error as any)?.message ?? String(error);
		console.error('Error in tagText():', error, (error as any)?.stack);
		// 针对连接/超时及鉴权错误，显示更具指导性的提示
		const lower = message.toLowerCase();
		if (lower.includes('connection') || lower.includes('failed to fetch') || lower.includes('timeout') || lower.includes('network')) {
			new Notice(`Failed to generate tags: ${message}. Hint: check your network, OpenAI Base URL, or API key. Use the Test Connection button in settings.`);
		} else if (lower.includes('unauthorized') || lower.includes('invalid') || lower.includes('api key')) {
			new Notice(`Failed to generate tags: ${message}. Hint: verify your OpenAI API key in plugin settings.`);
		} else {
			new Notice(`Failed to generate tags: ${message}`);
		}
	}
}

/**
 * 为文件或文件夹生成标签。
 * @param app Obsidian App 实例
 * @param settings 插件设置
 * @param abstractFile 文件或文件夹
 */
export async function tagFileOrFolder(app: App, settings: AiTaggerSettings, abstractFile: TAbstractFile) {
	if (abstractFile instanceof TFile) {
		const fileContents = await abstractFile.vault.read(abstractFile);
		await tagText(app, settings, abstractFile, fileContents);
	} else if (abstractFile instanceof TFolder) {
		for (const child of abstractFile.children) {
			await tagFileOrFolder(app, settings, child);
		}
	}
}