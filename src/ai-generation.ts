import { App } from 'obsidian';
import OpenAI from 'openai';
import { getPrompts, PromptSet, promptTemplate } from './prompts';
import { AiTaggerSettings } from './settings';
import { getVaultTags } from './tag-utils';

/**
 * 计算两个向量的余弦相似度。
 * @param a 向量a
 * @param b 向量b
 * @returns 相似度
 */
function cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
    return dot / (normA * normB);
}

/**
 * 计算标签的容量单位（字数或单词数）。
 * @param tag 标签字符串
 * @param language 语言设置
 * @returns 容量单位
 */
function getTagCapacityUnit(tag: string, language: 'en' | 'zh'): number {
    if (language === 'zh') {
        // 中文：按字符数
        return tag.length;
    } else {
        // 英文：按单词数
        return tag.trim().split(/\s+/).length;
    }
}

/**
 * 根据容量限制选择标签。
 * @param tags 标签数组
 * @param maxCapacity 最大容量
 * @param language 语言设置
 * @returns 选择的标签数组
 */
function selectTagsByCapacity(tags: string[], maxCapacity: number, language: 'en' | 'zh'): string[] {
    const selected: string[] = [];
    let currentCapacity = 0;

    for (const tag of tags) {
        const unit = getTagCapacityUnit(tag, language);
        if (currentCapacity + unit <= maxCapacity) {
            selected.push(tag);
            currentCapacity += unit;
        } else {
            break; // 超过容量，停止
        }
    }

    return selected;
}

/**
 * 获取标签字符串，用于提示词。
 * @param app Obsidian 应用实例
 * @param existingTags 已存在的标签
 * @param content 文档内容
 * @param settings 插件设置
 * @returns 标签字符串
 */
export async function getTagsString(app: App, existingTags: string[], content: string, settings: AiTaggerSettings): Promise<string> {
    // 获取工作区中所有标签
    const vaultTags: string[] = getVaultTags(app)

    // 从工作区标签中移除已经存在的标签
    const filteredVaultTags = vaultTags.filter(tag =>
        !existingTags.some(existingTag =>
            existingTag.toLowerCase() === tag.toLowerCase()
        )
    )

    let candidateTags: string[];

    // 首先确定候选标签集合
    if (settings.enableEmbedding && settings.embeddingApiKey && filteredVaultTags.length > 10) { // 只有当启用embedding且标签足够多时才使用embedding
        // 使用embedding过滤，选择最相关的标签
        try {
            const client = new OpenAI({
                apiKey: settings.embeddingApiKey,
                baseURL: settings.embeddingBaseUrl || 'https://api.openai.com/v1',
                dangerouslyAllowBrowser: true
            });

            // 截断content以适应token限制
            const truncatedContent = content.substring(0, 8000);
            const inputs = [truncatedContent, ...filteredVaultTags];

            const embeddings = await client.embeddings.create({
                model: settings.embeddingModel || 'text-embedding-ada-002',
                input: inputs
            });

            const contentVec = embeddings.data[0].embedding;
            const similarities = filteredVaultTags.map((tag, i) => ({
                tag,
                sim: cosineSimilarity(contentVec, embeddings.data[i + 1].embedding)
            }));

            similarities.sort((a, b) => b.sim - a.sim);
            candidateTags = similarities.map(s => s.tag);
        } catch (error) {
            console.warn('Embedding filtering failed, falling back to sorted tags:', error);
            candidateTags = [...filteredVaultTags].sort();
        }
    } else {
        // 默认排序方式：按字母顺序
        candidateTags = [...filteredVaultTags].sort();
    }

    // 根据容量限制选择最终标签
    const selectedTags = selectTagsByCapacity(candidateTags, settings.maxTagsCapacity, settings.language);

    // 将选定的标签格式化成字符串，插入提示词中
    const tagsString: string = selectedTags.map(tag => `- ${tag}`).join("\n");

    return tagsString
}

/**
 * 使用 AI API 生成标签。
 * @param app Obsidian 应用实例
 * @param content 文档内容
 * @param existingTags 已存在的标签
 * @param settings 插件设置
 * @returns 生成的标签数组
 */
export async function generateTags(app: App, content: string, existingTags: string[], settings: AiTaggerSettings): Promise<string[]> {
    const apiKey = settings.llmApiKey;
    const baseUrl = settings.llmBaseUrl;
    const model = settings.llmModel;

    if (!apiKey) {
        throw new Error('LLM API key is not set.');
    }

    const fetchInstance = (globalThis as any).fetch ? (globalThis as any).fetch : undefined;
    if (!fetchInstance) {
        console.warn('警告：在此环境中未定义全局 fetch。除非您提供 fetch polyfill 或在 Node 环境中运行，否则 OpenAI SDK 可能失败。');
    }

    const client = new OpenAI({ apiKey, baseURL: baseUrl, dangerouslyAllowBrowser: true, ...(fetchInstance ? { fetch: fetchInstance } : {}) });

    // 获取工作区标签字符串
    const tagsString = await getTagsString(app, existingTags, content, settings);

    // 构建用户消息
    const userMessage = promptTemplate(tagsString, content);

    // 选择对应语言的提示词和示例
    const promptSet: PromptSet = getPrompts(settings.language || 'en');
    const system = promptSet.systemMessage;
    const selectedExamples = promptSet.examples;

    // 构建消息数组
    const messages: any[] = [
        { role: 'system', content: system },
        ...selectedExamples.flatMap(example => [
            { role: 'user', content: promptTemplate(example.inputTags, example.document) },
            { role: 'assistant', content: JSON.stringify({ tags: example.response.tags, newTags: example.response.newTags }) }
        ]),
        { role: 'user', content: userMessage }
    ];

    try {
        // 尝试使用普通 fetch POST 请求以避免 SDK 添加的标头（这可能会触发 CORS 问题）
        const cleanedBase = (baseUrl || '').replace(/\/+$/, '');
        const chatUrl = `${cleanedBase}/chat/completions`;
        let responseJson: any | null = null;

        const fetchFn = (globalThis as any).fetch;
        if (fetchFn) {
            try {
                const resp = await fetchFn(chatUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ model, messages })
                });

                // 如果服务器由于 CORS 预检而拒绝，resp.ok 可能为 false 或请求可能完全失败
                if (!resp.ok) {
                    const bodyText = await resp.text().catch(() => '');
                    throw new Error(`HTTP ${resp.status}: ${bodyText}`);
                }
                responseJson = await resp.json();
            } catch (fetchErr) {
                // 如果 fetch 失败，则回退到 SDK 方法并捕获原始错误以进行诊断
                console.warn('直接获取 chat/completions 失败，尝试 SDK 回退:', fetchErr);
            }
        }

        // 如果未设置 fetchJson，则回退到 SDK 调用（可能会添加导致 CORS 问题的标头）
        if (!responseJson) {
            const completion = await client.chat.completions.create({ model, messages });
            responseJson = completion as any;
        }

        const responseContent = responseJson?.choices?.[0]?.message?.content;
        if (!responseContent) {
            throw new Error('API 无响应。');
        }

        const parsedResponse = JSON.parse(responseContent);
        const generatedTags = [...(parsedResponse.tags || []), ...(parsedResponse.newTags || [])];

        return generatedTags;
    } catch (error) {
        // 统一记录错误信息并抛出包含原始错误信息的简洁错误，避免对不同错误做细粒度的处理。
        console.error('生成标签时出错:', error);
        throw new Error(`生成标签时出错: ${((error as any)?.message ?? String(error))}`);
    }
}