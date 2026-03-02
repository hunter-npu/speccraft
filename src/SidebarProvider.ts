import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { VscodeMessage } from './types';
import { SpecFileProvider } from './SpecFileProvider';
import { GitService } from './GitService';
import { LLMConfigProvider } from './LLMConfigProvider';

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _streamControllers = new Map<string, AbortController>();
  // Tracks whether we have already set the webview HTML.
  // With retainContextWhenHidden: true, resolveWebviewView is called only once,
  // so this flag prevents re-initialization if the view briefly fires a second resolve.
  private _htmlSet = false;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly specProvider: SpecFileProvider,
    private readonly gitService: GitService,
    private readonly llmConfig: LLMConfigProvider
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.onDidReceiveMessage((message: VscodeMessage) => {
      this.handleMessage(message, webviewView.webview);
    });

    // VSCode registers a service worker for every webview. During startup the
    // renderer's browsing context may not be "active" yet, causing:
    //   InvalidStateError: Failed to register a ServiceWorker
    // which prevents the webview from loading at all.
    //
    // Fix: never set HTML synchronously in resolveWebviewView.
    // Instead, set it the first time the panel is actually visible.
    //   • onDidChangeVisibility handles the normal user-opens-panel case.
    //   • setTimeout(200) is a fallback for when the panel is already visible
    //     at startup (visibility doesn't "change", so the event doesn't fire).
    const initHtml = () => {
      if (this._htmlSet || !webviewView.visible) return;
      this._htmlSet = true;
      webviewView.webview.html = this.getHtml(webviewView.webview);
    };

    webviewView.onDidChangeVisibility(initHtml);
    setTimeout(initHtml, 200);
  }

  postMessage(message: VscodeMessage): void {
    this._view?.webview.postMessage(message);
  }

  private async handleMessage(message: VscodeMessage, webview: vscode.Webview): Promise<void> {
    try {
      switch (message.type) {
        case 'LOAD_SPEC_LIST': {
          const specs = await this.specProvider.listSpecs();
          webview.postMessage({ type: 'SPEC_LIST_LOADED', payload: { specs } });
          break;
        }

        case 'LLM_STREAM_REQUEST': {
          const { requestId, messages, config } = message.payload as {
            requestId: string;
            messages: Array<{ role: string; content: string }>;
            config: { endpoint: string; apiKey: string; model: string };
          };
          const ctrl = new AbortController();
          this._streamControllers.set(requestId, ctrl);
          this.streamLLM(requestId, config, messages, ctrl.signal, webview).finally(() => {
            this._streamControllers.delete(requestId);
          });
          break;
        }

        case 'LLM_STREAM_CANCEL': {
          const { requestId } = message.payload as { requestId: string };
          this._streamControllers.get(requestId)?.abort();
          this._streamControllers.delete(requestId);
          break;
        }

        case 'NEW_SPEC': {
          const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
          const defaultUri = root
            ? vscode.Uri.file(path.join(root, '新规格.spec.md'))
            : undefined;
          const uri = await vscode.window.showSaveDialog({
            defaultUri,
            title: '新建规格文档',
            saveLabel: '新建',
          });
          if (!uri) break;
          let mdPath = uri.fsPath;
          if (!mdPath.endsWith('.spec.md')) {
            mdPath = mdPath.endsWith('.md') ? mdPath.slice(0, -3) + '.spec.md' : mdPath + '.spec.md';
          }
          const specFile = await this.specProvider.createSpecAtPath(mdPath);
          await this.specProvider.openSpecInEditor(specFile.mdPath);
          const specs = await this.specProvider.listSpecs();
          webview.postMessage({ type: 'SPEC_LIST_LOADED', payload: { specs } });
          webview.postMessage({ type: 'SPEC_CREATED', payload: { specFile } });
          break;
        }

        case 'LOAD_SPEC': {
          const { specId } = message.payload as { specId: string };
          const result = await this.specProvider.readSpec(specId);
          if (result) {
            webview.postMessage({
              type: 'SPEC_LOADED',
              payload: { spec: result.spec, mdContent: result.mdContent },
            });
            const specs = await this.specProvider.listSpecs();
            const specFile = specs.find((s) => s.specId === specId);
            if (specFile) {
              await this.specProvider.openSpecInEditor(specFile.mdPath);
            }
          } else {
            webview.postMessage({
              type: 'ERROR',
              payload: { message: `Spec not found: ${specId}` },
            });
          }
          break;
        }

        case 'APPLY_IMPROVEMENT': {
          const { specId, requirementId, improvedText } = message.payload as {
            specId: string;
            requirementId: string;
            improvedText: string;
          };
          await this.specProvider.applyImprovement(specId, requirementId, improvedText);
          break;
        }

        case 'GIT_COMMIT': {
          const { message: msg } = message.payload as { message: string };
          await this.gitService.commit(msg);
          break;
        }

        case 'GIT_LOG': {
          const commits = await this.gitService.log();
          webview.postMessage({ type: 'GIT_LOG_LOADED', payload: { commits } });
          break;
        }

        case 'GIT_CHECKOUT': {
          const { hash } = message.payload as { hash: string };
          await this.gitService.checkout(hash);
          const specs = await this.specProvider.listSpecs();
          webview.postMessage({ type: 'SPEC_LIST_LOADED', payload: { specs } });
          break;
        }

        case 'LLM_CONFIG_GET': {
          const config = this.llmConfig.get();
          webview.postMessage({ type: 'LLM_CONFIG_LOADED', payload: config });
          break;
        }

        case 'LLM_CONFIG_SET': {
          await this.llmConfig.set(message.payload as any);
          break;
        }
      }
    } catch (err) {
      webview.postMessage({
        type: 'ERROR',
        payload: { message: (err as Error).message },
      });
    }
  }

  private getHtml(_webview: vscode.Webview): string {
    const distPath = path.join(this.extensionUri.fsPath, 'webview', 'dist', 'assets');
    const nonce = this.getNonce();

    let js = '';
    let css = '';
    try {
      js = fs.readFileSync(path.join(distPath, 'index.js'), 'utf-8');
      css = fs.readFileSync(path.join(distPath, 'index.css'), 'utf-8');
    } catch (e) {
      return `<!DOCTYPE html><html><body style="color:#ccc;padding:16px;font-family:sans-serif;">
        <p>SpecCraft: webview assets not found.</p>
        <p>Run: <code>cd webview && npm install && npm run build</code></p>
        <p style="color:#f88;font-size:11px;">${e}</p>
      </body></html>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src https: http: ws: wss:; img-src data:;">
  <style>${css}</style>
  <title>SpecCraft</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}">
    window.onerror = function(msg, _src, _line, _col, err) {
      document.getElementById('root').innerHTML =
        '<pre style="color:#f88;font-family:monospace;padding:12px;white-space:pre-wrap;font-size:11px;">[ERROR] ' +
        msg + (err ? '\\n' + err.stack : '') + '</pre>';
    };
    window.addEventListener('unhandledrejection', function(e) {
      document.getElementById('root').innerHTML =
        '<pre style="color:#f88;font-family:monospace;padding:12px;white-space:pre-wrap;font-size:11px;">[PROMISE ERROR] ' +
        String(e.reason) + '</pre>';
    });
  </script>
  <script nonce="${nonce}">${js}</script>
</body>
</html>`;
  }

  private async streamLLM(
    requestId: string,
    config: { endpoint: string; apiKey: string; model: string },
    messages: Array<{ role: string; content: string }>,
    signal: AbortSignal,
    webview: vscode.Webview
  ): Promise<void> {
    const base = config.endpoint.replace(/\/+$/, '');
    try {
      const response = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({ model: config.model, messages, stream: true }),
        signal,
      });

      if (!response.ok) {
        const text = await response.text();
        webview.postMessage({ type: 'LLM_STREAM_ERROR', payload: { requestId, error: `HTTP ${response.status}: ${text}` } });
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === 'data: [DONE]') {
            webview.postMessage({ type: 'LLM_STREAM_DONE', payload: { requestId } });
            return;
          }
          if (trimmed.startsWith('data: ')) {
            const raw = trimmed.slice(6).trim();
            if (!raw || raw === '[DONE]') continue;
            try {
              const json = JSON.parse(raw);
              const content = json.choices?.[0]?.delta?.content ?? '';
              if (content) {
                webview.postMessage({ type: 'LLM_STREAM_CHUNK', payload: { requestId, content } });
              }
              const finishReason = json.choices?.[0]?.finish_reason;
              if (finishReason && finishReason !== 'null') {
                webview.postMessage({ type: 'LLM_STREAM_DONE', payload: { requestId } });
                return;
              }
            } catch { /* skip malformed lines */ }
          }
        }
      }
      webview.postMessage({ type: 'LLM_STREAM_DONE', payload: { requestId } });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const cause = (err as any).cause;
      const detail = cause
        ? `${(err as Error).message}: ${(cause as Error).message ?? String(cause)}`
        : (err as Error).message;
      webview.postMessage({ type: 'LLM_STREAM_ERROR', payload: { requestId, error: detail } });
    }
  }

  private getNonce(): string {
    let text = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
  }
}
