import { App, getAllTags, TFile, CachedMetadata } from 'obsidian';

/**
 * 获取工作区中的所有标签。
 * @param app Obsidian 应用实例
 * @returns 标签数组
 */
export function getVaultTags(app: App): string[] {
    const tagsSet: Set<string> = new Set(); // 使用 Set 来确保标签唯一

    const files: TFile[] = app.vault.getMarkdownFiles();
    // 获取每个文件的标签
    files.forEach((file: TFile) => {
        const cache: CachedMetadata | null = app.metadataCache.getFileCache(file);
        if (cache !== null) {
            const tags: string[] | null = getAllTags(cache);

            if (tags !== null) {
                tags.forEach((tag) => tagsSet.add(tag));
            }
        }
    })

    const uniqueTagsArray: string[] = [...tagsSet];

    return uniqueTagsArray;
}

/**
 * 将标签转换为小写。
 * @param tags 标签数组
 * @returns 小写标签数组
 */
export function convertTagsToLowerCase(tags: string[]): string[] {
    return tags.map(tag => tag.toLowerCase());
}