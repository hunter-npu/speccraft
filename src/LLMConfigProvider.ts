import * as vscode from 'vscode';
import type { LLMConfig } from './types';

const KEY = 'speccraft.llmConfig';

const DEFAULT_CONFIG: LLMConfig = {
  endpoint: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
};

export class LLMConfigProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  get(): LLMConfig {
    const stored = this.context.globalState.get<LLMConfig>(KEY);
    return stored ? { ...DEFAULT_CONFIG, ...stored } : { ...DEFAULT_CONFIG };
  }

  async set(config: LLMConfig): Promise<void> {
    await this.context.globalState.update(KEY, config);
  }

  async configure(): Promise<void> {
    const current = this.get();

    const endpoint = await vscode.window.showInputBox({
      prompt: 'LLM API Endpoint (OpenAI-compatible)',
      value: current.endpoint,
      placeHolder: 'https://api.openai.com/v1',
    });
    if (endpoint === undefined) return;

    const apiKey = await vscode.window.showInputBox({
      prompt: 'API Key',
      value: current.apiKey,
      password: true,
      placeHolder: 'sk-...',
    });
    if (apiKey === undefined) return;

    const model = await vscode.window.showInputBox({
      prompt: 'Model Name',
      value: current.model,
      placeHolder: 'gpt-4o-mini',
    });
    if (model === undefined) return;

    await this.set({ endpoint, apiKey, model });
    vscode.window.showInformationMessage('SpecCraft: LLM configuration saved.');
  }
}
