// 插件设置定义
// 这个接口声明了用户可以在设置中配置的项
// 插件启用时，这些设置将通过 settings 成员变量访问

/**
 * AiTagger 插件设置接口。
 */
export interface AiTaggerSettings {
	/** LLM API 密钥 */
	llmApiKey: string;
	/** LLM 模型名字 */
	llmModel: string;
	/** LLM base URL */
	llmBaseUrl: string;
	/** 语言设置 */
	language: 'en' | 'zh';
	/** 是否默认标签为小写 */
	lowercaseTags?: boolean;
	/** 是否启用embedding过滤 */
	enableEmbedding: boolean;
	/** 标签最大容量（字数/单词数） */
	maxTagsCapacity: number;
	/** Embedding API 密钥 */
	embeddingApiKey: string;
	/** Embedding base URL */
	embeddingBaseUrl: string;
	/** Embedding 模型名字 */
	embeddingModel: string;
}