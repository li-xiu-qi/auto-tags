# 🪄 auto tags / AI Tag Generator

[中文版本](README.md)

"auto tags" is an Obsidian plugin that uses various Large Language Models (LLMs) to analyze documents and generate tags with a single click.

The plugin analyzes the document in the editor and any previously used tags (if available), returns up to 5 related existing tags, and generates up to 3 new suggested tags.

This project is forked from [lucagrippa/obsidian-ai-tagger](https://github.com/lucagrippa/obsidian-ai-tagger), with code updates and feature enhancements.

## 🚀 Quick Start

1. Install and enable this plugin from Obsidian's [Community Plugins](https://obsidian.md/plugins).
2. Enter your API key in the plugin settings (supports OpenAI, Ollama, and other compatible services).
3. Choose a model (e.g., GPT-4o mini).

## 📝 Usage

### One click tagging

- Click the "Wand" icon in the left sidebar to tag current note

    ![One click tagging](images/one_click_tagging.gif)

### Selection-Based Tagging

- Highlight text and use Command Palette (Ctrl/Cmd + P) → "Generate tags"

    ![Precise tagging](images/precise_tagging.gif)

### Batch Tagging

- Right-click file(s) or folders to tag multiple documents

    ![Multi-file tagging](images/multi_file_tagging.gif)

## 🔧 Configuration Options

- Custom Endpoints: Set alternative API endpoints (supports Ollama and other compatible services)
- Lowercase Tags: Force all tags to lowercase
- Context Awareness: Plugin considers existing tags to avoid duplicates

    ![Context-aware tagging](images/context_aware_tagging.gif)

## 🔧 Features

### 1. Settings Management

- Load and save plugin settings, including OpenAI API key, model name, base URL, and prompt language.
- Support for default settings initialization and user custom configuration.
- Allow users to configure API key, model selection (e.g., GPT-4o mini), and language preferences through the plugin settings tab.

### 2. Tag Generation

- Use AI (OpenAI) to generate relevant tags for document content.
- Support processing pure content after removing frontmatter.
- Generate more relevant tags based on all tags in the entire vault as context.
- Avoid generating duplicate existing tags.
- Analyze document content, return up to 5 related existing tags and up to 3 new suggested tags.
- Support Chinese and English prompt languages, using predefined system prompts and examples.

### 3. Tag Application

- Add generated tags to the document's frontmatter.
- Support appending new tags to the existing tag list.
- Use Obsidian's processFrontMatter API to update document metadata.

### 4. Recursive Tag Generation

- Support generating tags for individual files.
- Support recursively generating tags for folders and all their subfiles.
- Allow batch processing of multiple files for efficiency.

### 5. User Interface Integration

- **Ribbon Icon**: Add an icon button in Obsidian's left toolbar to generate tags for the current active document.
- **Editor Command**: Add a command for generating tags for selection or entire document, supporting command palette calls.
- **File Menu Options**: Add options in the file right-click menu for generating tags for single or multiple files, supporting right-click batch operations.

### 6. User Notifications

- Display progress notifications during tag generation.
- Provide appropriate feedback on success or failure.
- Use Obsidian's Notice API to display messages, such as generating, success, or error prompts.

## 🔗 More Info

- [Quick Start Guide](docs/quick-start.md)
- [Development Documentation](docs/development.md)
- [License](LICENSE)

## 🤝 Contributing

Found a bug or want a new feature? Open an Issue or submit a PR.
