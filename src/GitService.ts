import * as vscode from 'vscode';
import type { GitCommit } from './types';

interface GitExtension {
  getAPI(version: number): GitAPI;
}

interface GitAPI {
  repositories: Repository[];
}

interface Repository {
  state: {
    HEAD: { name?: string; commit?: string } | undefined;
  };
  inputBox: { value: string };
  commit(message: string, opts?: { all?: boolean }): Promise<void>;
  log(opts?: { maxEntries?: number }): Promise<Commit[]>;
  checkout(treeish: string): Promise<void>;
}

interface Commit {
  hash: string;
  message: string;
  commitDate?: Date;
  authorName?: string;
  authorEmail?: string;
}

export class GitService {
  private getRepo(): Repository | null {
    try {
      const ext = vscode.extensions.getExtension<GitExtension>('vscode.git');
      if (!ext?.isActive) return null;
      const api = ext.exports.getAPI(1);
      return api.repositories[0] ?? null;
    } catch {
      return null;
    }
  }

  async commit(message: string): Promise<void> {
    const repo = this.getRepo();
    if (!repo) {
      vscode.window.showWarningMessage('SpecCraft: Git repository not found.');
      return;
    }
    try {
      await repo.commit(message, { all: true });
      vscode.window.showInformationMessage(`SpecCraft: Committed — "${message}"`);
    } catch (err) {
      vscode.window.showErrorMessage(`SpecCraft: Commit failed — ${(err as Error).message}`);
    }
  }

  async log(maxEntries = 50): Promise<GitCommit[]> {
    const repo = this.getRepo();
    if (!repo) return [];
    try {
      const commits = await repo.log({ maxEntries });
      return commits.map((c) => ({
        hash: c.hash,
        message: c.message,
        date: c.commitDate?.toISOString() ?? new Date().toISOString(),
        author: c.authorName ?? c.authorEmail ?? 'Unknown',
      }));
    } catch {
      return [];
    }
  }

  async checkout(hash: string): Promise<void> {
    const repo = this.getRepo();
    if (!repo) {
      vscode.window.showWarningMessage('SpecCraft: Git repository not found.');
      return;
    }
    try {
      await repo.checkout(hash);
      vscode.window.showInformationMessage(`SpecCraft: Checked out ${hash.slice(0, 7)}`);
    } catch (err) {
      vscode.window.showErrorMessage(`SpecCraft: Checkout failed — ${(err as Error).message}`);
    }
  }

  async promptCommit(specTitle: string): Promise<void> {
    const message = await vscode.window.showInputBox({
      prompt: 'Commit message',
      value: `spec: update ${specTitle}`,
      placeHolder: 'Describe this version',
    });
    if (!message) return;
    await this.commit(message);
  }
}
