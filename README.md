# SpecCraft

A VSCode extension for writing, reviewing, and managing software specification documents with LLM assistance. Outputs structured data to drive TDD workflows.

## Features

- **Spec Editor** — Write structured `.spec.md` files with YAML frontmatter (specId, title, version)
- **AI Assistant** — Chat panel for drafting and refining requirements via OpenAI-compatible LLMs
- **AI Polish** — Right-click any selected text in a `.md` file → *AI 润色* (streaming rewrite)
- **Requirement Improve** — `✨ Improve` CodeLens on every `####` / `#####` requirement heading for LLM-driven improvement
- **Add Sibling / Child Requirement** — Right-click context menu to insert a new same-level or sub-level requirement and auto-renumber the entire section
- **Test Mapping** — Map each requirement to test type, test data, and acceptance criteria
- **Version History** — Built-in Git integration for committing and browsing spec versions
- **TDD Export** — Export structured JSON to drive test-driven development

## Tech Stack

- **Extension Host**: TypeScript + esbuild
- **Webview**: React 19 + Vite + Tailwind CSS v4 + Zustand v5
- **LLM**: Direct SSE fetch to any OpenAI-compatible endpoint

## Getting Started

### Build

```bash
# 1. Build webview
cd webview && npm install && npm run build && cd ..

# 2. Build extension host
npm install && node esbuild.mjs

# 3. Package
npx @vscode/vsce package --allow-missing-repository
```

### Install

```bash
code --install-extension speccraft-0.1.0.vsix
```

### Configure LLM

Open the Command Palette (`Ctrl+Shift+P`) → **SpecCraft: Configure LLM** → enter your API endpoint, API key, and model name.

## Spec File Format

Specs are stored as `.spec.md` files under `.speccraft/` in the workspace root:

```markdown
---
specId: spec-xxx
title: My Project
version: 1.0.0
created: 2026-01-01T00:00:00.000Z
updated: 2026-01-01T00:00:00.000Z
---

## Functional Requirements

#### FR-001: User Login
Users shall be able to log in with email and password.

##### FR-001-1: Password Validation
Password must be at least 8 characters.
```

## License

MIT
