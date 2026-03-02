import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import type { SpecJson, SpecFile, SpecMeta } from './types';

function getWorkspaceRoot(): string | null {
  const folders = vscode.workspace.workspaceFolders;
  return folders?.[0]?.uri.fsPath ?? null;
}

function getSpecDir(root: string): string {
  return path.join(root, '.speccraft');
}

function buildFrontmatter(meta: SpecMeta): string {
  return `---
specId: ${meta.specId}
title: ${meta.title}
version: ${meta.version}
created: ${meta.created}
updated: ${meta.updated}
---\n\n`;
}

function parseFrontmatter(content: string): { meta: Partial<SpecMeta>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const fmText = match[1];
  const body = match[2];
  const meta: Partial<SpecMeta> = {};

  for (const line of fmText.split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) {
      const value = rest.join(':').trim();
      (meta as Record<string, string>)[key.trim()] = value;
    }
  }

  return { meta, body };
}

const DEFAULT_MD_TEMPLATE = (title: string) => `# ${title}

## 软件需求规格

### 功能需求

#### FR-001: 核心功能
描述系统的核心功能需求。

### 非功能需求

#### NFR-001: 性能要求
系统响应时间不超过 2 秒。

## 设计要求

### 架构设计
描述系统整体架构设计。

### 模块设计
描述各模块职责和接口。

## 界面要求

### UI/UX 设计
描述用户界面设计规范。

### 交互流程
描述主要用户交互流程。
`;

export class SpecFileProvider {
  async ensureSpecDir(): Promise<string | null> {
    const root = getWorkspaceRoot();
    if (!root) return null;
    const specDir = getSpecDir(root);
    await fs.mkdir(specDir, { recursive: true });
    return specDir;
  }

  async listSpecs(): Promise<SpecFile[]> {
    const uris = await vscode.workspace.findFiles('**/*.spec.md', '**/node_modules/**', 200);
    const results: SpecFile[] = [];

    for (const uri of uris) {
      try {
        const content = await fs.readFile(uri.fsPath, 'utf-8');
        const { meta } = parseFrontmatter(content);
        if (meta.specId) {
          results.push({
            specId: meta.specId,
            title: meta.title ?? path.basename(uri.fsPath).replace('.spec.md', ''),
            version: meta.version ?? '1.0.0',
            mdPath: uri.fsPath,
            created: meta.created ?? new Date().toISOString(),
            updated: meta.updated ?? new Date().toISOString(),
          });
        }
      } catch {
        // skip unreadable files
      }
    }

    return results.sort((a, b) => b.updated.localeCompare(a.updated));
  }

  async readSpec(specId: string): Promise<{ spec: SpecJson; mdContent: string } | null> {
    const specs = await this.listSpecs();
    const specFile = specs.find((s) => s.specId === specId);
    if (!specFile) return null;

    try {
      const mdContent = await fs.readFile(specFile.mdPath, 'utf-8');
      const spec: SpecJson = {
        specId,
        title: specFile.title,
        version: specFile.version,
      };
      return { spec, mdContent };
    } catch {
      return null;
    }
  }

  async createSpec(title: string): Promise<SpecFile> {
    const specDir = await this.ensureSpecDir();
    if (!specDir) throw new Error('No workspace folder open');

    const specId = `spec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const mdPath = path.join(specDir, `${slug}.spec.md`);
    const now = new Date().toISOString();

    const meta: SpecMeta = { specId, title, version: '1.0.0', created: now, updated: now };
    const mdContent = buildFrontmatter(meta) + DEFAULT_MD_TEMPLATE(title);

    await fs.writeFile(mdPath, mdContent, 'utf-8');

    return { specId, title, version: '1.0.0', mdPath, created: now, updated: now };
  }

  async createSpecAtPath(mdPath: string): Promise<SpecFile> {
    const dir = path.dirname(mdPath);
    await fs.mkdir(dir, { recursive: true });

    const filename = path.basename(mdPath).replace(/\.spec\.md$/i, '').replace(/\.md$/i, '');
    const title = filename.replace(/[-_]/g, ' ').trim() || 'New Spec';
    const specId = `spec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const meta: SpecMeta = { specId, title, version: '1.0.0', created: now, updated: now };
    const content = buildFrontmatter(meta) + DEFAULT_MD_TEMPLATE(title);

    await fs.writeFile(mdPath, content, 'utf-8');
    return { specId, title, version: '1.0.0', mdPath, created: now, updated: now };
  }

  async applyImprovement(specId: string, requirementId: string, improvedText: string): Promise<void> {
    const specs = await this.listSpecs();
    const specFile = specs.find((s) => s.specId === specId);
    if (!specFile) throw new Error(`Spec not found: ${specId}`);

    const uri = vscode.Uri.file(specFile.mdPath);
    const doc = await vscode.workspace.openTextDocument(uri);

    const headingPattern = new RegExp(`^#{4}\\s+${requirementId}:`);
    let headingLine = -1;
    for (let i = 0; i < doc.lineCount; i++) {
      if (headingPattern.test(doc.lineAt(i).text)) {
        headingLine = i;
        break;
      }
    }
    if (headingLine < 0) {
      throw new Error(`Requirement ${requirementId} not found in document`);
    }

    let bodyEndLine = doc.lineCount;
    for (let i = headingLine + 1; i < doc.lineCount; i++) {
      if (doc.lineAt(i).text.startsWith('#')) {
        bodyEndLine = i;
        break;
      }
    }

    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      uri,
      new vscode.Range(new vscode.Position(headingLine + 1, 0), new vscode.Position(bodyEndLine, 0)),
      improvedText + '\n\n'
    );
    await vscode.workspace.applyEdit(edit);
    await vscode.workspace.save(uri);
  }

  async openSpecInEditor(mdPath: string): Promise<void> {
    const uri = vscode.Uri.file(mdPath);
    await vscode.window.showTextDocument(uri, { preview: false });
  }
}
