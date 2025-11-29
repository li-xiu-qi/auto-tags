import { systemMessage as systemMessageEn } from './en/system-prompt';
import { examples as examplesEn } from './en/examples';
import { systemMessage as systemMessageZh } from './zh/system-prompt';
import { examples as examplesZh } from './zh/examples';

export type PromptLanguage = 'en' | 'zh';

export interface PromptSet {
    systemMessage: string;
    examples: any[];
}

/**
 * 返回指定语言的提示词与示例集合。
 * @param language 选择 'en' 或 'zh'，默认为 'en'
 */
export function getPrompts(language: PromptLanguage = 'en'): PromptSet {
    switch (language) {
        case 'zh':
            return { systemMessage: systemMessageZh, examples: examplesZh };
        case 'en':
        default:
            return { systemMessage: systemMessageEn, examples: examplesEn };
    }
}

export default getPrompts;

/**
 * Prompt template helper - returns a fully formatted user message string
 * containing existing tags and the document text.
 * Accepts either an array of tags or a preformatted string.
 */
export function promptTemplate(inputTags: string[] | string, document: string): string {
    const tagsStr = Array.isArray(inputTags) ? inputTags.join('\n') : String(inputTags);
    return `EXISTING TAGS:\n\`\`\`\n${tagsStr}\n\`\`\`\n\nDOCUMENT:\n\`\`\`\n${document}\n\`\`\``;
}

export { promptTemplate as prompt_template };
