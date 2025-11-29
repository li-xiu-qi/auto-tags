import AiTagger from "./main";
import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import { generateTags } from './ai-generation';

/**
 * AiTagger 设置标签页类。
 */
export class AiTaggerSettingTab extends PluginSettingTab {
    plugin: AiTagger;

    /**
     * 构造函数。
     * @param app Obsidian 应用实例
     * @param plugin 插件实例
     */
    constructor(app: App, plugin: AiTagger) {
        super(app, plugin);
        this.plugin = plugin;
    }

    /**
     * 添加 LLM API Key 设置项。
     * @param containerEl 容器元素
     */
    private addLlmApiKeySetting(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName(`LLM API Key`)
            .setDesc(`Your API key for LLM service (compatible with OpenAI)`)
            .addText(text =>
                text
                    .setPlaceholder('Enter API key')
                    .setValue(this.plugin.settings.llmApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.llmApiKey = value;
                        await this.plugin.saveSettings();
                    })
            );
    }

    /**
     * 显示设置页面。
     */
    display(): void {
        const { containerEl: containerElement } = this;
        containerElement.empty();

        // 添加 LLM API Key 设置项
        this.addLlmApiKeySetting(containerElement);

        // Secrets file support removed; prefer unified plugin settings (this.saveData())

        new Setting(containerElement)
            .setName('LLM Model')
            .setDesc('Enter the model name (e.g., step-2-mini for StepFun, gpt-4o-mini for OpenAI, etc.)')
            .addText(text =>
                text
                    .setPlaceholder('step-2-mini')
                    .setValue(this.plugin.settings.llmModel)
                    .onChange(async (value) => {
                        this.plugin.settings.llmModel = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerElement)
            .setName('LLM Base URL')
            .setDesc('The base URL for LLM API (default: https://api.stepfun.com/v1 for StepFun)')
            .addText(text =>
                text
                    .setPlaceholder('https://api.stepfun.com/v1')
                    .setValue(this.plugin.settings.llmBaseUrl)
                    .onChange(async (value) => {
                        this.plugin.settings.llmBaseUrl = value;
                        await this.plugin.saveSettings();
                    })
            );

            // Language setting
            new Setting(containerElement)
                .setName('Language')
                .setDesc('Choose the language for prompts and tag processing (English / 中文)')
                .addDropdown(dropdown =>
                    dropdown
                        .addOption('en', 'English')
                        .addOption('zh', '中文')
                        .setValue(this.plugin.settings.language || 'en')
                        .onChange(async (value) => {
                            this.plugin.settings.language = value as 'en' | 'zh';
                            await this.plugin.saveSettings();
                        })
                );

            // Max tags capacity setting
            new Setting(containerElement)
                .setName('Max Tags Capacity')
                .setDesc('Maximum capacity for tags in characters/words (default: 3000 for English, 1000 for Chinese)')
                .addText(text =>
                    text
                        .setPlaceholder('3000')
                        .setValue(this.plugin.settings.maxTagsCapacity?.toString() || '3000')
                        .onChange(async (value) => {
                            const num = parseInt(value);
                            if (!isNaN(num) && num > 0) {
                                this.plugin.settings.maxTagsCapacity = num;
                                await this.plugin.saveSettings();
                            }
                        })
                );

            // Lowercase tags setting
            new Setting(containerElement)
                .setName('Lowercase Tags')
                .setDesc('Force all generated tags to be lowercase')
                .addToggle(toggle =>
                    toggle
                        .setValue(this.plugin.settings.lowercaseTags || false)
                        .onChange(async (value) => {
                            this.plugin.settings.lowercaseTags = value;
                            await this.plugin.saveSettings();
                        })
                );

            // Enable embedding setting
            new Setting(containerElement)
                .setName('Enable Embedding Filtering')
                .setDesc('Use embedding similarity to filter and rank tags (requires embedding API configuration)')
                .addToggle(toggle =>
                    toggle
                        .setValue(this.plugin.settings.enableEmbedding || false)
                        .onChange(async (value) => {
                            this.plugin.settings.enableEmbedding = value;
                            await this.plugin.saveSettings();
                        })
                );

            // Embedding API Key setting
            new Setting(containerElement)
                .setName('Embedding API Key')
                .setDesc('API key for embedding service (optional, for filtering tags when too many)')
                .addText(text =>
                    text
                        .setPlaceholder('Enter embedding API key')
                        .setValue(this.plugin.settings.embeddingApiKey || '')
                        .onChange(async (value) => {
                            this.plugin.settings.embeddingApiKey = value;
                            await this.plugin.saveSettings();
                        })
                );

            // Embedding Base URL setting
            new Setting(containerElement)
                .setName('Embedding Base URL')
                .setDesc('Base URL for embedding API (default: https://api.openai.com/v1)')
                .addText(text =>
                    text
                        .setPlaceholder('https://api.openai.com/v1')
                        .setValue(this.plugin.settings.embeddingBaseUrl || 'https://api.openai.com/v1')
                        .onChange(async (value) => {
                            this.plugin.settings.embeddingBaseUrl = value;
                            await this.plugin.saveSettings();
                        })
                );

            // Embedding Model setting
            new Setting(containerElement)
                .setName('Embedding Model')
                .setDesc('Model name for embeddings (e.g., text-embedding-ada-002)')
                .addText(text =>
                    text
                        .setPlaceholder('text-embedding-ada-002')
                        .setValue(this.plugin.settings.embeddingModel || 'text-embedding-ada-002')
                        .onChange(async (value) => {
                            this.plugin.settings.embeddingModel = value;
                            await this.plugin.saveSettings();
                        })
                );

        // 添加一个测试连接按钮，帮助用户验证 API key 和 Base URL 是否正常
        new Setting(containerElement)
            .setName('Test Connection')
            .setDesc('Ping the model endpoint and run a small sample request to validate credentials and network.')
            .addButton(button =>
                button
                    .setButtonText('Test')
                    .onClick(async () => {
                        try {
                            const base = this.plugin.settings.llmBaseUrl || 'https://api.openai.com/v1';
                            let modelsUrl = base;
                            if (modelsUrl.endsWith('/')) modelsUrl = modelsUrl.slice(0, -1);
                            if (!modelsUrl.endsWith('/models')) {
                                if (modelsUrl.endsWith('/v1')) modelsUrl = `${modelsUrl}/models`;
                                else modelsUrl = `${modelsUrl}/models`;
                            }

                            // check fetch availability
                            const fetchFn = (globalThis as any).fetch;
                            if (!fetchFn) {
                                new Notice('Warning: fetch() is not available in this environment. The test may fail.');
                            }

                            new Notice('Pinging models endpoint...');
                            try {
                                const resp = await (fetchFn || fetch)(modelsUrl, {
                                    method: 'GET',
                                    headers: {
                                        'Authorization': `Bearer ${this.plugin.settings.llmApiKey}`,
                                        'Content-Type': 'application/json'
                                    }
                                });
                                const body = await resp.text();
                                console.info('Ping response:', { status: resp.status, bodyPreview: body?.slice(0, 500) });
                                if (!resp.ok) {
                                    new Notice(`Ping failed: status ${resp.status}. Check API key and base URL. See console for details.`);
                                    console.error('Ping response body:', body);
                                    return;
                                } else {
                                    new Notice(`Ping OK - status ${resp.status}`);
                                }
                            } catch (pingErr) {
                                const pingMsg = (pingErr as any)?.message ?? String(pingErr);
                                console.error('Ping failed:', pingMsg, (pingErr as any)?.stack);
                                new Notice(`Ping failed: ${pingMsg}. Check network, proxy, or base URL.`);
                                return;
                            }

                            // perform small end-to-end validation with generateTags
                            const testDoc = 'Test document for tag generation. Small check.';
                            new Notice('Running small test request to validate API...');
                            const result = await generateTags(this.app, testDoc, [], this.plugin.settings);
                            console.info('Test Connection result:', result);
                            new Notice(`Test OK - example tags: ${result.slice(0, 5).join(', ') || 'none'}`);
                        } catch (err) {
                            const message = (err as any)?.message ?? String(err);
                            console.error('Test Connection failed:', message, (err as any)?.stack, (err as any)?.response);
                            const status = (err as any)?.response?.status;
                            const data = (err as any)?.response?.data ?? (err as any)?.response?.body;
                            if (status) {
                                new Notice(`Test failed: status ${status} - ${message}`);
                                console.error('Test Connection response body:', data ? JSON.stringify(data, null, 2) : data);
                            } else {
                                new Notice(`Test failed: ${message}. Check console for details.`);
                            }
                        }
                    })
            );

    }
}

