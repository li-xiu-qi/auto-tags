import { Editor, MarkdownView, Notice, Plugin, Workspace, TFile } from 'obsidian';

import { AiTaggerSettings } from "./settings";
import { AiTaggerSettingTab } from "./settings-tab";
import { tagText, tagFileOrFolder } from "./features/tag-generator";

const DEFAULT_SETTINGS: Partial<AiTaggerSettings> = {
	llmApiKey: '',
	llmModel: 'gpt-4o-mini',
	llmBaseUrl: 'https://api.openai.com/v1'
	,language: 'en'
	,lowercaseTags: false
	,enableEmbedding: false
	,maxTagsCapacity: 3000
	,embeddingApiKey: ''
	,embeddingBaseUrl: 'https://api.openai.com/v1'
	,embeddingModel: 'text-embedding-ada-002'
}

/**
 * AiTagger 插件主类，用于为 Obsidian 文档自动生成标签。
 */
export default class AiTagger extends Plugin {
	settings: AiTaggerSettings;

	/**
	 * 从磁盘读取设置。
	 */
	async loadSettings() {
		// Object.assign() 是一个 JavaScript 函数，用于把一个对象的所有属性复制到另一个对象。
		// loadData() 返回的属性会覆盖 DEFAULT_SETTINGS 中对应的属性。
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		// 统一使用插件设置（this.saveData / this.loadData）
	}

	/**
	 * 将设置存储到磁盘。
	 */
	async saveSettings() {
		// loadData() 和 saveData() 提供了一个简单方式读写磁盘上的插件数据。
		await this.saveData(this.settings);
	}

	// Unified settings via this.saveData()/this.loadData()

	/**
	 * 插件加载时调用，初始化设置和事件。
	 */
	async onload() {
		// 插件加载期间读取设置
		await this.loadSettings();

		// 添加一个设置页面，允许用户配置插件
		this.addSettingTab(new AiTaggerSettingTab(this.app, this));

		// 在左侧工具栏创建一个图标按钮。
		this.addRibbonIcon('wand-2', 'Generate tags!', async () => {
			// 当用户点击该图标时触发。

			try {
				const workspace: Workspace = this.app.workspace
				const markdownView: MarkdownView | null = workspace.getActiveViewOfType(MarkdownView);
				const currentFile: TFile | null = workspace.getActiveFile();
				if (markdownView !== null && currentFile !== null) {
					// 获取当前文档的字符串内容
					let fileContents: string = markdownView.editor.getValue();
					tagText(this.app, this.settings, currentFile, fileContents);
				} else {
					const message = "Open and select a document to use auto tags"
					new Notice(message);
					console.info(message);
				}
			} catch (error) {
				const message = (error as any)?.message ?? String(error);
				new Notice(message);
				console.error('Error while generating tags:', message);
			}
		});


		// 添加编辑器命令，用于为当前选区生成标签
		this.addCommand({
			id: 'generate-tags',
			name: 'Generate tags',
			editorCallback: async (editor: Editor, view: MarkdownView) => {

				try {
					// 获取当前选区的字符串内容
					let selection: string = editor.getSelection();
					const currentFile: TFile | null = this.app.workspace.getActiveFile();

					if (currentFile !== null) {
						if (selection === "") {
							// 如果选区为空，则使用整个文档
							let fileContents: string = editor.getValue();
							tagText(this.app, this.settings, currentFile, fileContents);
						} else {
							tagText(this.app, this.settings, currentFile, selection);
						}
					}
				} catch (error) {
					const message = (error as any)?.message ?? String(error);
					new Notice(message);
					console.error('Error while generating tags:', message);
				}
			}
		});

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file, source, leaf) => {
				menu.addItem((item) => {
					item
						.setTitle('Generate tags 🪄')
						.setIcon('wand-2')
						.onClick(async () => {
							await tagFileOrFolder(this.app, this.settings, file);
						});
				});
			})
		);

		this.registerEvent(
			this.app.workspace.on('files-menu', (menu, files, source, leaf) => {
				menu.addItem((item) => {
					item
						.setTitle('Generate tags 🪄')
						.setIcon('wand-2')
						.onClick(async () => {
							for (const file of files) {
								await tagFileOrFolder(this.app, this.settings, file);
							}
						});
				});
			})
		);
	}

	/**
	 * 插件卸载时调用。
	 */
	onunload() {

	}
}


