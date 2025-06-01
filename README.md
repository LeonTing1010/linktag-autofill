# LinkTagAutoFill for Obsidian

An intelligent Obsidian plugin that automatically generates relevant tags for your notes using AI language models. LinkTagAutoFill brings a new level of automation and insight to your note organization workflow.

---

## 🚀 Features

### 🤖 AI-Powered Tag Generation
- **Multiple AI Providers**: Supports OpenAI, Claude (Anthropic), and local models via Ollama, giving you flexibility to choose the best provider for your needs.
- **Smart Content Analysis**: Uses advanced language models to analyze your notes, extract keywords, and generate highly relevant tags.
- **Customizable Settings**: Adjust confidence thresholds, set maximum tags per note, and control hierarchical tag depth for tailored results.

### 🎯 Smart Tag Management
- **Visual Tag Selection**: Interactive UI for reviewing, selecting, and applying suggested tags, complete with confidence scores.
- **Hierarchical Tagging**: Generate nested tag structures for better organization.
- **Conflict Detection & Merging**: Identifies overlapping or conflicting tags and offers to merge or resolve them.
- **Historical Analytics**: Track tag performance and view analytics on tag usage over time.

### ⚡ Flexible Integration
- **Manual & Auto Modes**: Generate tags on-demand or enable automatic tagging on note creation/edit.
- **Batch Processing**: Quickly process and tag multiple notes at once.
- **Context Menu & Command Palette**: Access all plugin features from Obsidian's UI for maximum convenience.

### 📊 Analytics & Insights
- **Tag Statistics**: Visualize tag frequency and usage trends.
- **Suggestion Success Rate**: Monitor how often suggested tags are accepted or modified.
- **Export/Import Tag History**: Easily back up or transfer your tag history and analytics.

---

## 🛠 Installation

### From Obsidian Community Plugins
1. Open Obsidian Settings.
2. Go to **Community Plugins**.
3. Search for `"LinkTag AutoFill"`.
4. Click **Install** and enable the plugin.

### Manual Installation
1. Download the latest release from GitHub.
2. Extract files to your vault's `.obsidian/plugins/linktag-autofill/` directory.
3. Enable the plugin in Obsidian settings.

---

## ⚙️ Configuration

### API Setup

#### OpenAI
1. Get your API key from [OpenAI Platform](https://platform.openai.com/).
2. Enter the API key in the plugin settings.
3. Choose your preferred model (e.g., `gpt-3.5-turbo`, `gpt-4`, `gpt-4o`, etc.).

#### Claude (Anthropic)
1. Obtain your API key from [Anthropic Console](https://console.anthropic.com/).
2. Enter the key in plugin settings and select your Claude model version.

#### Ollama (Local)
1. Download and install [Ollama](https://ollama.ai/).
2. Choose a local AI model.
3. Configure your local API endpoint in the plugin settings.

> **Tip:** You can set different models and endpoints per note using frontmatter, This allows for maximum flexibility and privacy.

---

## ✨ Usage

### Manual Tag Generation
1. Open a note.
2. Click the LinkTag icon in the ribbon.
3. Review the list of AI-suggested tags and confidence scores.
4. Select and apply the tags you want.

### Automatic Mode
1. Enable auto-tagging in plugin settings.
2. Set your preferred trigger conditions (e.g., on note creation, on edit).
3. Tags are generated and suggested automatically based on note content.

### Batch Tagging
1. Open the Command Palette and run `"Batch process multiple notes"`.
2. Select the files to process.
3. Review and apply tags in bulk.

---

## 🔧 Features in Detail

### AI Provider Options
- **OpenAI**: General-purpose, high-quality tagging.
- **Claude**: Excellent for academic and technical documents.
- **Ollama**: Private, offline tagging with local LLMs.

### Tag Generation Settings
- Adjustable **confidence threshold** for suggested tags.
- **Maximum tag count** per note.
- Custom **tag formatting** options.
- Control **hierarchical tag depth**.

### Analytics Dashboard
- Visualize tag frequencies and trends.
- Track the acceptance rate of tag suggestions.
- View and export historical tagging performance.

---

## ⌨️ Commands

- `Generate tags for current note` – Generate tags for the active note.
- `Batch process multiple notes` – Tag multiple notes at once.
- `Quick tag generation (auto-apply)` – Instantly apply high-confidence tags.

---

## 🧑‍💻 Support & Documentation

- [GitHub Issues](https://github.com/LeonTing1010/linktag-autofill/issues)
- [Documentation](https://github.com/LeonTing1010/linktag-autofill)

---

## 🏁 Quick Start

1. **Install** the plugin via Community Plugins or manually.
2. **Configure** your preferred AI provider (OpenAI, Claude, or Ollama).
3. **Generate tags** manually or enable automatic tagging for your workflow.
4. **Explore analytics** to optimize your note organization over time.

> **Pro Tip:** Use the Command Palette and set up hotkeys for your favorite tag generation actions for maximum productivity!

---

## 🤝 Contributions Welcome

Pull requests, feature ideas, and bug reports are highly encouraged. Help us make LinkTagAutoFill the best tagging assistant for the Obsidian community!

---

**Enjoy smarter, automated tagging in your Obsidian vault with LinkTagAutoFill!**