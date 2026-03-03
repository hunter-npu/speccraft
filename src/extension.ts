import * as vscode from 'vscode';
import { SpecFileProvider, SpecTemplateType, SPEC_TEMPLATE_LABELS } from './SpecFileProvider';
import { GitService } from './GitService';
import { LLMConfigProvider } from './LLMConfigProvider';
import { LLMService } from './LLMService';
import { SidebarProvider } from './SidebarProvider';
import { SpecCodeLensProvider } from './SpecCodeLensProvider';
import { buildImproveRequirementPrompt, buildRefinePrompt } from './prompts';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getNonce(): string {
  let text = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Requirement helpers ───────────────────────────────────────────────────────

/** Matches exactly 4-hash headings: `#### FR-001: Title` */
const MAIN_REQ_HEADING = /^#{4}\s+((?:FR|NFR|DR|UIR)-(\d+)):\s+(.+)$/;

interface ReqInfo {
  headingLine: number;
  prefix: string;        // "FR" | "NFR" | "DR" | "UIR"
  num: number;           // current number integer (1-based)
  id: string;            // e.g. "FR-001"
  title: string;
  insertionLine: number; // first depth-≤4 heading after block, or lineCount
}

function findRequirementAtCursor(
  document: vscode.TextDocument,
  position: vscode.Position
): ReqInfo | null {
  // Scan upward from cursor to find the parent #### heading
  let headingLine = -1;
  let prefix = '';
  let num = 0;
  let id = '';
  let title = '';

  for (let i = position.line; i >= 0; i--) {
    const lineText = document.lineAt(i).text;
    // Hit #/##/### → cursor is above any requirement block
    if (/^#{1,3}\s/.test(lineText)) { return null; }
    const m = lineText.match(MAIN_REQ_HEADING);
    if (m) {
      headingLine = i;
      id = m[1];
      prefix = id.replace(/-\d+$/, '');
      num = parseInt(m[2], 10);
      title = m[3];
      break;
    }
  }

  if (headingLine === -1) { return null; }

  // Scan downward to find the next same-or-higher-level heading.
  // ##### lines (5 hashes) do NOT match /^#{1,4}\s/ because after 4 # the
  // 5th # is not whitespace — so child requirement lines are skipped.
  const lineCount = document.lineCount;
  let insertionLine = lineCount;
  for (let i = headingLine + 1; i < lineCount; i++) {
    if (/^#{1,4}\s/.test(document.lineAt(i).text)) {
      insertionLine = i;
      break;
    }
  }

  return { headingLine, prefix, num, id, title, insertionLine };
}

/**
 * Renumber all `#### PREFIX-NNN:` headings sequentially (1-based, zero-padded
 * to 3 digits) and cascade the change into `##### PREFIX-NNN-M:` child lines.
 */
function renumberRequirementsInText(text: string, prefix: string): string {
  const parentRe = new RegExp(`^(#{4}\\s+)(${prefix}-)(\\d+)(:)`, 'gm');

  // First pass: collect old numbers in document order
  const oldNums: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = parentRe.exec(text)) !== null) { oldNums.push(m[3]); }

  // Build old→new map (only entries that actually change)
  const oldToNew = new Map<string, string>();
  oldNums.forEach((oldNum, idx) => {
    const newNum = String(idx + 1).padStart(3, '0');
    if (oldNum !== newNum) { oldToNew.set(oldNum, newNum); }
  });

  // Second pass: replace parent numbers
  let counter = 0;
  text = text.replace(
    new RegExp(`^(#{4}\\s+)(${prefix}-)(\\d+)(:)`, 'gm'),
    (_m, hashes, pfx, _num, colon) => {
      counter++;
      return `${hashes}${pfx}${String(counter).padStart(3, '0')}${colon}`;
    }
  );

  // Third pass: cascade parent ID changes into child headings
  if (oldToNew.size > 0) {
    text = text.replace(
      new RegExp(`^(#{5}\\s+)(${prefix}-)(\\d+)(-\\d+:)`, 'gm'),
      (_m, hashes, pfx, parentNum, suffix) => {
        const newNum = oldToNew.get(parentNum);
        return newNum ? `${hashes}${pfx}${newNum}${suffix}` : _m;
      }
    );
  }

  return text;
}

/**
 * Renumber ALL requirement headings in a spec document in document order:
 *   #### PREFIX-NNN:     → sequential, 3-digit zero-padded, per prefix
 *   ##### PREFIX-NNN-MM: → sequential within parent, 2-digit zero-padded
 * Heading depth, order, title text, and body content are never modified.
 */
function renumberAllRequirements(text: string, eol: string): string {
  // Strip \r so we can work with plain \n lines regardless of original EOL
  const lines = text.split('\n').map(l => l.replace(/\r$/, ''));

  const PFX = 'FR|NFR|DR|UIR';
  const parentRe = new RegExp(`^(#{4}\\s+)((?:${PFX})-\\d+)(:.*)$`);
  const childRe  = new RegExp(`^(#{5}\\s+)((?:${PFX})-\\d+-\\d+)(:.*)$`);

  const parentCounters: Record<string, number> = {};
  const childCounters:  Record<string, number> = {};
  const oldToNew = new Map<string, string>();

  // Pass 1 — build old → new mapping in document order
  for (const line of lines) {
    const pm = line.match(parentRe);
    if (pm) {
      const oldId = pm[2];
      const prefix = oldId.replace(/-\d+$/, '');
      parentCounters[prefix] = (parentCounters[prefix] ?? 0) + 1;
      const newId = `${prefix}-${String(parentCounters[prefix]).padStart(3, '0')}`;
      if (oldId !== newId) { oldToNew.set(oldId, newId); }
      continue;
    }
    const cm = line.match(childRe);
    if (cm) {
      const oldChildId  = cm[2];
      const oldParentId = oldChildId.replace(/-\d+$/, '');
      const newParentId = oldToNew.get(oldParentId) ?? oldParentId;
      childCounters[newParentId] = (childCounters[newParentId] ?? 0) + 1;
      const newChildId = `${newParentId}-${String(childCounters[newParentId]).padStart(2, '0')}`;
      if (oldChildId !== newChildId) { oldToNew.set(oldChildId, newChildId); }
    }
  }

  if (oldToNew.size === 0) { return text; }

  // Pass 2 — apply replacements line by line
  const result = lines.map(line => {
    const pm = line.match(parentRe);
    if (pm) {
      const newId = oldToNew.get(pm[2]);
      return newId ? `${pm[1]}${newId}${pm[3]}` : line;
    }
    const cm = line.match(childRe);
    if (cm) {
      const newChildId = oldToNew.get(cm[2]);
      return newChildId ? `${cm[1]}${newChildId}${cm[3]}` : line;
    }
    return line;
  });

  return result.join(eol);
}

/**
 * Show a centered modal dialog (WebviewPanel) with a textarea, OK and Cancel buttons.
 * Returns the user's input string, or undefined if cancelled.
 */
function showInputDialog(options: {
  title: string;
  prompt: string;
  placeholder: string;
}): Promise<string | undefined> {
  return new Promise((resolve) => {
    const nonce = getNonce();
    const panel = vscode.window.createWebviewPanel(
      'speccraftInputDialog',
      options.title,
      { viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
      { enableScripts: true, retainContextWhenHidden: false }
    );

    const inputHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--vscode-editor-background, #1e1e1e);
      color: var(--vscode-foreground, #d4d4d4);
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .dialog {
      background: var(--vscode-editorWidget-background, #252526);
      border: 1px solid var(--vscode-widget-border, #454545);
      border-radius: 6px;
      padding: 24px 28px 20px;
      width: 500px;
      max-width: 90vw;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    }
    h3 {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
      color: var(--vscode-titleBar-activeForeground, #ccc);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    p.prompt {
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #9d9d9d);
      margin-bottom: 10px;
      line-height: 1.4;
    }
    textarea {
      width: 100%;
      min-height: 72px;
      background: var(--vscode-input-background, #3c3c3c);
      color: var(--vscode-input-foreground, #d4d4d4);
      border: 1px solid var(--vscode-input-border, #3c3c3c);
      border-radius: 3px;
      padding: 7px 8px;
      font-family: inherit;
      font-size: 13px;
      resize: vertical;
      outline: none;
      line-height: 1.5;
    }
    textarea:focus { border-color: var(--vscode-focusBorder, #007fd4); }
    textarea::placeholder { color: var(--vscode-input-placeholderForeground, #6b6b6b); }
    .buttons {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 14px;
    }
    button {
      padding: 5px 18px;
      border-radius: 3px;
      border: none;
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
      line-height: 1.6;
    }
    .btn-ok {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #fff);
    }
    .btn-ok:hover { background: var(--vscode-button-hoverBackground, #1177bb); }
    .btn-cancel {
      background: var(--vscode-button-secondaryBackground, #3a3d41);
      color: var(--vscode-button-secondaryForeground, #d4d4d4);
    }
    .btn-cancel:hover { background: var(--vscode-button-secondaryHoverBackground, #45494e); }
    .hint {
      font-size: 11px;
      color: var(--vscode-descriptionForeground, #888);
      margin-top: 6px;
    }
  </style>
</head>
<body>
  <div class="dialog">
    <h3>${escapeHtml(options.title)}</h3>
    <p class="prompt">${escapeHtml(options.prompt)}</p>
    <textarea id="input" placeholder="${escapeHtml(options.placeholder)}"></textarea>
    <p class="hint">留空并点击"确定"将使用默认提示词；Ctrl+Enter 确认</p>
    <div class="buttons">
      <button class="btn-cancel" id="btnCancel">取消</button>
      <button class="btn-ok" id="btnOk">确定</button>
    </div>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const input = document.getElementById('input');
    setTimeout(() => input.focus(), 80);
    input.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') confirm();
      if (e.key === 'Escape') cancel();
    });
    document.getElementById('btnOk').addEventListener('click', confirm);
    document.getElementById('btnCancel').addEventListener('click', cancel);
    function confirm() { vscode.postMessage({ type: 'confirm', value: input.value }); }
    function cancel() { vscode.postMessage({ type: 'cancel' }); }
  </script>
</body>
</html>`;

    let resolved = false;
    function done(value: string | undefined) {
      if (resolved) return;
      resolved = true;
      resolve(value);
    }

    panel.webview.onDidReceiveMessage((msg) => {
      if (msg.type === 'confirm') { done(msg.value); panel.dispose(); }
      else if (msg.type === 'cancel') { done(undefined); panel.dispose(); }
    });
    panel.onDidDispose(() => done(undefined));

    // Defer HTML to avoid service worker InvalidStateError
    setTimeout(() => { panel.webview.html = inputHtml; }, 200);
  });
}

// ── Shared dialog HTML ────────────────────────────────────────────────────────
// Both the Refine and Improve panels use the same layout; only labels differ.

function makeDialogHtml(opts: {
  nonce: string;
  originalLabel: string;
  originalContent: string;   // already HTML-escaped
  resultLabel: string;
  requirementLabel: string;  // "润色要求" | "改进要求"
  requirementPlaceholder: string;
  actionLabel: string;       // "润色" | "改进"
}): string {
  const { nonce, originalLabel, originalContent, resultLabel,
          requirementLabel, requirementPlaceholder, actionLabel } = opts;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--vscode-editor-background, #1e1e1e);
      color: var(--vscode-foreground, #d4d4d4);
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      height: 100vh; display: flex; flex-direction: column; padding: 16px; gap: 10px;
    }
    .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; opacity: .5; margin-bottom: 5px; display: flex; align-items: center; gap: 6px; }
    .status { font-size: 11px; font-weight: 400; text-transform: none; letter-spacing: 0; opacity: 1; color: var(--vscode-charts-yellow, #cca700); }
    .status.done  { color: var(--vscode-charts-green, #4ec9b0); }
    .status.error { color: var(--vscode-errorForeground, #f48771); }
    .panels { display: flex; gap: 12px; flex: 1; min-height: 0; }
    .panel  { flex: 1; display: flex; flex-direction: column; min-height: 0; }
    .panels textarea {
      flex: 1; width: 100%;
      background: var(--vscode-input-background, #3c3c3c);
      color: var(--vscode-input-foreground, #d4d4d4);
      border: 1px solid var(--vscode-input-border, #3c3c3c);
      border-radius: 3px; padding: 8px 10px;
      font-family: var(--vscode-editor-font-family, 'Consolas', monospace);
      font-size: 13px; resize: none; outline: none; line-height: 1.6;
    }
    .panels textarea:focus     { border-color: var(--vscode-focusBorder, #007fd4); }
    .panels textarea[readonly] { opacity: .55; }
    /* Requirement block */
    .req-block { display: flex; flex-direction: column; gap: 6px; }
    .req-header { display: flex; align-items: center; justify-content: space-between; }
    .req-label  { font-size: 12px; opacity: .6; }
    .req-hint   { font-size: 11px; opacity: .35; margin-left: 6px; }
    .req-textarea {
      width: 100%;
      background: var(--vscode-input-background, #3c3c3c);
      color: var(--vscode-input-foreground, #d4d4d4);
      border: 1px solid var(--vscode-input-border, #3c3c3c);
      border-radius: 3px; padding: 6px 8px;
      font-family: inherit; font-size: 13px; outline: none;
      resize: vertical; min-height: 58px; max-height: 160px; line-height: 1.5;
    }
    .req-textarea:focus { border-color: var(--vscode-focusBorder, #007fd4); }
    .req-textarea::placeholder { color: var(--vscode-input-placeholderForeground, #6b6b6b); }
    /* Footer */
    .footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
    .hint { flex: 1; font-size: 11px; opacity: .4; }
    button { padding: 5px 16px; border-radius: 3px; border: none; cursor: pointer; font-size: 13px; font-family: inherit; line-height: 1.6; }
    button:disabled { opacity: .4; cursor: not-allowed; }
    .btn-primary   { background: var(--vscode-button-background, #0e639c); color: var(--vscode-button-foreground, #fff); }
    .btn-primary:not(:disabled):hover { background: var(--vscode-button-hoverBackground, #1177bb); }
    .btn-secondary { background: var(--vscode-button-secondaryBackground, #3a3d41); color: var(--vscode-button-secondaryForeground, #d4d4d4); }
    .btn-secondary:not(:disabled):hover { background: var(--vscode-button-secondaryHoverBackground, #45494e); }
  </style>
</head>
<body>
  <div class="panels">
    <div class="panel">
      <div class="label">${originalLabel}</div>
      <textarea readonly>${originalContent}</textarea>
    </div>
    <div class="panel">
      <div class="label">${resultLabel} <span class="status" id="status"></span></div>
      <textarea id="refined" placeholder="输入要求后点击&#8220;${actionLabel}&#8221;&#8230;"></textarea>
    </div>
  </div>
  <div class="req-block">
    <div class="req-header">
      <span>
        <span class="req-label">${requirementLabel}</span>
        <span class="req-hint">（Ctrl+Enter 确认）</span>
      </span>
      <button class="btn-primary" id="btnAction">${actionLabel}</button>
    </div>
    <textarea id="requirement" class="req-textarea" placeholder="${requirementPlaceholder}"></textarea>
  </div>
  <div class="footer">
    <span class="hint">可直接编辑右侧内容后再替换</span>
    <button class="btn-secondary" id="btnDiscard">放弃</button>
    <button class="btn-primary"   id="btnReplace" disabled>替换原文</button>
  </div>
  <script nonce="${nonce}">
    const vscodeApi  = acquireVsCodeApi();
    const refined    = document.getElementById('refined');
    const btnReplace = document.getElementById('btnReplace');
    const btnAction  = document.getElementById('btnAction');
    const reqInput   = document.getElementById('requirement');
    const status     = document.getElementById('status');

    function setStreaming() {
      status.textContent = '处理中…'; status.className = 'status';
      btnAction.disabled = true; btnReplace.disabled = true;
      refined.value = '';
    }
    function setDone() {
      status.textContent = '完成'; status.className = 'status done';
      btnAction.disabled = false; btnReplace.disabled = false;
      refined.focus();
    }
    function setError(msg) {
      status.textContent = '错误: ' + msg; status.className = 'status error';
      btnAction.disabled = false;
      btnReplace.disabled = refined.value.length === 0;
    }

    window.addEventListener('message', (e) => {
      const m = e.data;
      if      (m.type === 'streaming') setStreaming();
      else if (m.type === 'chunk')     refined.value += m.content;
      else if (m.type === 'done')      setDone();
      else if (m.type === 'error')     setError(m.message);
    });

    function doAction() {
      if (btnAction.disabled) return;
      vscodeApi.postMessage({ type: 'start', requirement: reqInput.value.trim() });
    }
    btnAction.addEventListener('click', doAction);
    reqInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); doAction(); }
    });
    btnReplace.addEventListener('click', () =>
      vscodeApi.postMessage({ type: 'replace', text: refined.value }));
    document.getElementById('btnDiscard').addEventListener('click', () =>
      vscodeApi.postMessage({ type: 'discard' }));

    reqInput.focus();
  </script>
</body>
</html>`;
}

// ── Refine Selection dialog ───────────────────────────────────────────────────

function showRefineDialog(options: {
  selectedText: string;
  editor: vscode.TextEditor;
  selection: vscode.Selection;
  llmService: LLMService;
}): void {
  const { selectedText, editor, selection, llmService } = options;
  const nonce = getNonce();

  const panel = vscode.window.createWebviewPanel(
    'speccraftRefineDialog', '✨ AI 润色',
    { viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
    { enableScripts: true, retainContextWhenHidden: true }
  );

  let streamCtrl: AbortController | null = null;

  async function doStream(requirement?: string): Promise<void> {
    if (streamCtrl) streamCtrl.abort();
    streamCtrl = new AbortController();
    panel.webview.postMessage({ type: 'streaming' });
    try {
      await llmService.stream(
        [
          { role: 'system', content: 'You are a professional technical writer. Output only the refined text, preserving the original language.' },
          { role: 'user', content: buildRefinePrompt(selectedText, requirement) },
        ],
        (chunk) => panel.webview.postMessage({ type: 'chunk', content: chunk }),
        streamCtrl.signal
      );
      panel.webview.postMessage({ type: 'done' });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        panel.webview.postMessage({ type: 'error', message: (err as Error).message });
      }
    }
  }

  panel.webview.onDidReceiveMessage(async (msg) => {
    if (msg.type === 'start') {
      await doStream(msg.requirement as string | undefined);
    } else if (msg.type === 'replace') {
      if (streamCtrl) streamCtrl.abort();
      const edit = new vscode.WorkspaceEdit();
      edit.replace(editor.document.uri, selection, msg.text as string);
      await vscode.workspace.applyEdit(edit);
      panel.dispose();
    } else if (msg.type === 'discard') {
      if (streamCtrl) streamCtrl.abort();
      panel.dispose();
    }
  });

  panel.onDidDispose(() => { if (streamCtrl) streamCtrl.abort(); });

  const html = makeDialogHtml({
    nonce,
    originalLabel: '原文',
    originalContent: escapeHtml(selectedText),
    resultLabel: 'AI 修订',
    requirementLabel: '润色要求',
    requirementPlaceholder: '可选：简洁化 / 更正式 / 增加量化指标…',
    actionLabel: '润色',
  });
  setTimeout(() => { panel.webview.html = html; }, 200);
}

// ── Improve Requirement dialog ────────────────────────────────────────────────

function showImproveDialog(options: {
  requirementId: string;
  requirementTitle: string;
  requirementContent: string;
  specId: string;
  specProvider: SpecFileProvider;
  llmService: LLMService;
}): void {
  const { requirementId, requirementTitle, requirementContent, specId, specProvider, llmService } = options;
  const nonce = getNonce();

  const panel = vscode.window.createWebviewPanel(
    'speccraftImproveDialog', `✨ 改进需求: ${requirementId}`,
    { viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
    { enableScripts: true, retainContextWhenHidden: true }
  );

  let streamCtrl: AbortController | null = null;

  async function doStream(requirement?: string): Promise<void> {
    if (streamCtrl) streamCtrl.abort();
    streamCtrl = new AbortController();
    panel.webview.postMessage({ type: 'streaming' });
    try {
      await llmService.stream(
        [
          { role: 'system', content: 'You are a software requirements expert. Output only the improved requirement text.' },
          { role: 'user', content: buildImproveRequirementPrompt(requirementId, requirementContent, requirement || undefined) },
        ],
        (chunk) => panel.webview.postMessage({ type: 'chunk', content: chunk }),
        streamCtrl.signal
      );
      panel.webview.postMessage({ type: 'done' });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        panel.webview.postMessage({ type: 'error', message: (err as Error).message });
      }
    }
  }

  panel.webview.onDidReceiveMessage(async (msg) => {
    if (msg.type === 'start') {
      await doStream(msg.requirement as string | undefined);
    } else if (msg.type === 'replace') {
      if (streamCtrl) streamCtrl.abort();
      try {
        await specProvider.applyImprovement(specId, requirementId, (msg.text as string).trim());
        vscode.window.showInformationMessage(`SpecCraft: ${requirementId} 需求改进已写入文档 ✓`);
      } catch (err) {
        vscode.window.showErrorMessage(`SpecCraft: 改进失败 — ${(err as Error).message}`);
      }
      panel.dispose();
    } else if (msg.type === 'discard') {
      if (streamCtrl) streamCtrl.abort();
      panel.dispose();
    }
  });

  panel.onDidDispose(() => { if (streamCtrl) streamCtrl.abort(); });

  const html = makeDialogHtml({
    nonce,
    originalLabel: `${requirementId}: ${escapeHtml(requirementTitle)}`,
    originalContent: escapeHtml(requirementContent),
    resultLabel: 'AI 改进',
    requirementLabel: '改进要求',
    requirementPlaceholder: '可选：增加可量化指标 / 明确验收标准 / 补充异常场景…',
    actionLabel: '改进',
  });
  setTimeout(() => { panel.webview.html = html; }, 200);
}

// ── Extension activate ────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
  const specProvider = new SpecFileProvider();
  const gitService = new GitService();
  const llmConfig = new LLMConfigProvider(context);
  const llmService = new LLMService(llmConfig);
  const codeLensProvider = new SpecCodeLensProvider();

  const sidebarProvider = new SidebarProvider(
    context.extensionUri,
    specProvider,
    gitService,
    llmConfig
  );

  // retainContextWhenHidden: true keeps the React app alive when the panel is
  // hidden, preserving chat history. Combined with deferred HTML init in
  // SidebarProvider, this avoids the service worker InvalidStateError on startup.
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('speccraft.assistant', sidebarProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { pattern: '**/*.spec.md' },
      codeLensProvider
    )
  );

  const watcher = vscode.workspace.createFileSystemWatcher('**/*.spec.md');
  context.subscriptions.push(
    watcher,
    watcher.onDidChange(() => codeLensProvider.refresh()),
    watcher.onDidCreate(() => codeLensProvider.refresh()),
    watcher.onDidDelete(() => codeLensProvider.refresh())
  );

  // Auto-sync sidebar when active editor switches to a .spec.md file
  async function syncEditorToSidebar(editor: vscode.TextEditor | undefined) {
    if (!editor || !editor.document.fileName.endsWith('.spec.md')) return;
    const content = editor.document.getText();
    const match = content.match(/^specId:\s*(.+)$/m);
    if (!match) return;
    const specId = match[1].trim();
    const result = await specProvider.readSpec(specId);
    if (result) {
      sidebarProvider.postMessage({
        type: 'SPEC_LOADED',
        payload: { spec: result.spec, mdContent: result.mdContent },
      });
    }
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(syncEditorToSidebar)
  );
  syncEditorToSidebar(vscode.window.activeTextEditor);

  // Command: New Specification
  context.subscriptions.push(
    vscode.commands.registerCommand('speccraft.newSpec', async () => {
      const title = await vscode.window.showInputBox({
        prompt: 'Specification title',
        placeHolder: 'My Project Specification',
      });
      if (!title) return;

      const typeItems: (vscode.QuickPickItem & { value: SpecTemplateType })[] = [
        { label: '$(globe) Web 应用',           description: '前后端分离 / SPA / SSR / PWA',       value: 'web'      },
        { label: '$(device-desktop) 桌面应用（跨平台）', description: 'Electron / Tauri / Qt',       value: 'desktop'  },
        { label: '$(window) Windows 应用',       description: 'WPF / WinForms / WinUI 3',            value: 'windows'  },
        { label: '$(circuit-board) 嵌入式软件',  description: 'MCU / RTOS / 裸机系统',               value: 'embedded' },
      ];

      const picked = await vscode.window.showQuickPick(typeItems, {
        title: '选择软件类型',
        placeHolder: '选择软件系统类型以生成对应规格模板',
        matchOnDescription: true,
      });
      if (!picked) return;

      // Step 3: English filename
      const autoSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new-spec';
      const slug = await vscode.window.showInputBox({
        title: '英文文件名',
        prompt: '文件将保存为 {name}.spec.md，只能包含小写字母、数字和连字符',
        value: autoSlug,
        validateInput: (v) => {
          if (!v) { return '文件名不能为空'; }
          if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(v)) {
            return '只能包含小写字母、数字和连字符，且不能以连字符开头或结尾';
          }
          return null;
        },
      });
      if (!slug) return;

      try {
        const specFile = await specProvider.createSpec(title, picked.value, slug);
        await specProvider.openSpecInEditor(specFile.mdPath);
        sidebarProvider.postMessage({ type: 'SPEC_LIST_LOADED', payload: { specs: await specProvider.listSpecs() } });
        vscode.window.showInformationMessage(`SpecCraft: Created "${title}" (${SPEC_TEMPLATE_LABELS[picked.value]}) → ${slug}.spec.md`);
      } catch (err) {
        vscode.window.showErrorMessage(`SpecCraft: ${(err as Error).message}`);
      }
    })
  );

  // Command: Git Commit
  context.subscriptions.push(
    vscode.commands.registerCommand('speccraft.gitCommit', async () => {
      const editor = vscode.window.activeTextEditor;
      const title = editor?.document.fileName
        ? editor.document.fileName.split(/[\\/]/).pop()?.replace('.spec.md', '') ?? 'spec'
        : 'spec';
      await gitService.promptCommit(title);
    })
  );

  // Command: Git Log
  context.subscriptions.push(
    vscode.commands.registerCommand('speccraft.gitLog', async () => {
      await vscode.commands.executeCommand('speccraft.assistant.focus');
      sidebarProvider.postMessage({
        type: 'INFO',
        payload: { message: 'Switch to the "版本历史" tab to view history.' },
      });
    })
  );

  // Command: Configure LLM
  context.subscriptions.push(
    vscode.commands.registerCommand('speccraft.configLLM', () => llmConfig.configure())
  );

  // Helper: read specId from a given editor (snapshot before focus changes)
  function readSpecId(editor: vscode.TextEditor | undefined): string {
    if (!editor || !editor.document.fileName.endsWith('.spec.md')) return '';
    const match = editor.document.getText().match(/^specId:\s*(.+)$/m);
    return match ? match[1].trim() : '';
  }

  // ── CodeLens: Improve Requirement ───────────────────────────────────────────
  // Streaming dialog (same layout as Refine) → replace requirement body in .spec.md
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'speccraft.codelensImprove',
      (args: { id: string; title: string; content: string }) => {
        // Capture specId BEFORE dialog opens (dialog changes activeTextEditor)
        const specId = readSpecId(vscode.window.activeTextEditor);
        if (!specId) {
          vscode.window.showWarningMessage('SpecCraft: 无法读取 specId，请确认文件包含 YAML frontmatter。');
          return;
        }
        showImproveDialog({
          requirementId: args.id,
          requirementTitle: args.title,
          requirementContent: args.content,
          specId,
          specProvider,
          llmService,
        });
      }
    )
  );

  // ── Command: Refine Selection ────────────────────────────────────────────────
  // Right-click selected text in any .md file → AI润色 → Replace or Discard
  context.subscriptions.push(
    vscode.commands.registerCommand('speccraft.refineSelection', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showWarningMessage('SpecCraft: 请先选中要润色的文字。');
        return;
      }
      const selectedText = editor.document.getText(selection);
      showRefineDialog({ selectedText, editor, selection, llmService });
    })
  );

  // ── Command: Renumber All Requirements ───────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('speccraft.renumberSpec', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !editor.document.fileName.endsWith('.spec.md')) {
        vscode.window.showWarningMessage('SpecCraft: 此命令仅适用于 .spec.md 文件。');
        return;
      }

      const document = editor.document;
      const text = document.getText();
      const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
      const result = renumberAllRequirements(text, eol);

      if (result === text) {
        vscode.window.showInformationMessage('SpecCraft: 编号已是最新，无需调整。');
        return;
      }

      const lineCount = document.lineCount;
      const fullRange = new vscode.Range(
        new vscode.Position(0, 0),
        document.lineAt(lineCount - 1).range.end
      );
      const edit = new vscode.WorkspaceEdit();
      edit.replace(document.uri, fullRange, result);
      await vscode.workspace.applyEdit(edit);
      vscode.window.showInformationMessage('SpecCraft: 规范编号已重新整理完成 ✓');
    })
  );

  // ── Command: Add Sibling Requirement ─────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('speccraft.addSiblingRequirement', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !editor.document.fileName.endsWith('.spec.md')) {
        vscode.window.showWarningMessage('SpecCraft: 此命令仅适用于 .spec.md 文件。');
        return;
      }

      const req = findRequirementAtCursor(editor.document, editor.selection.active);
      if (!req) {
        vscode.window.showWarningMessage('SpecCraft: 请将光标置于需求条目内（#### FR-xxx: 行）。');
        return;
      }

      const document = editor.document;
      const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
      const text = document.getText();
      const lineCount = document.lineCount;

      const insertOffset = req.insertionLine < lineCount
        ? document.offsetAt(new vscode.Position(req.insertionLine, 0))
        : text.length;

      // Add a blank separator line only when the preceding line is non-empty
      const prevLineIdx = Math.min(req.insertionLine, lineCount) - 1;
      const lead = prevLineIdx >= 0 && document.lineAt(prevLineIdx).text.trim() !== ''
        ? eol : '';

      const newBlock = `${lead}#### ${req.prefix}-999: 新需求${eol}新需求描述。${eol}${eol}`;
      const modified = text.slice(0, insertOffset) + newBlock + text.slice(insertOffset);
      const final = renumberRequirementsInText(modified, req.prefix);

      const fullRange = new vscode.Range(
        new vscode.Position(0, 0),
        document.lineAt(lineCount - 1).range.end
      );
      const edit = new vscode.WorkspaceEdit();
      edit.replace(document.uri, fullRange, final);
      await vscode.workspace.applyEdit(edit);

      // Move cursor to the newly inserted requirement
      const newDoc = vscode.window.activeTextEditor?.document;
      if (newDoc) {
        const searchStr = `#### ${req.prefix}-${String(req.num + 1).padStart(3, '0')}:`;
        const idx = newDoc.getText().indexOf(searchStr);
        if (idx >= 0) {
          const pos = newDoc.positionAt(idx);
          const activeEditor = vscode.window.activeTextEditor;
          if (activeEditor) {
            activeEditor.selection = new vscode.Selection(pos, pos);
            activeEditor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
          }
        }
      }
    })
  );

  // ── Command: Add Child Requirement ───────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('speccraft.addChildRequirement', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !editor.document.fileName.endsWith('.spec.md')) {
        vscode.window.showWarningMessage('SpecCraft: 此命令仅适用于 .spec.md 文件。');
        return;
      }

      const req = findRequirementAtCursor(editor.document, editor.selection.active);
      if (!req) {
        vscode.window.showWarningMessage('SpecCraft: 请将光标置于需求条目内（#### FR-xxx: 行）。');
        return;
      }

      const document = editor.document;
      const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
      const text = document.getText();
      const lineCount = document.lineCount;

      // Count existing child requirements for this parent
      const childRe = new RegExp(`^#{5}\\s+${req.id}-\\d+:`);
      let childCount = 0;
      for (let i = req.headingLine + 1; i < req.insertionLine; i++) {
        if (childRe.test(document.lineAt(i).text)) { childCount++; }
      }

      const childId = `${req.id}-${String(childCount + 1).padStart(2, '0')}`;

      const insertOffset = req.insertionLine < lineCount
        ? document.offsetAt(new vscode.Position(req.insertionLine, 0))
        : text.length;

      const prevLineIdx = Math.min(req.insertionLine, lineCount) - 1;
      const lead = prevLineIdx >= 0 && document.lineAt(prevLineIdx).text.trim() !== ''
        ? eol : '';

      const newBlock = `${lead}##### ${childId}: 新子需求${eol}新子需求描述。${eol}${eol}`;
      const modified = text.slice(0, insertOffset) + newBlock + text.slice(insertOffset);

      const fullRange = new vscode.Range(
        new vscode.Position(0, 0),
        document.lineAt(lineCount - 1).range.end
      );
      const edit = new vscode.WorkspaceEdit();
      edit.replace(document.uri, fullRange, modified);
      await vscode.workspace.applyEdit(edit);

      // Move cursor to the newly inserted child requirement
      const newDoc = vscode.window.activeTextEditor?.document;
      if (newDoc) {
        const searchStr = `##### ${childId}:`;
        const idx = newDoc.getText().indexOf(searchStr);
        if (idx >= 0) {
          const pos = newDoc.positionAt(idx);
          const activeEditor = vscode.window.activeTextEditor;
          if (activeEditor) {
            activeEditor.selection = new vscode.Selection(pos, pos);
            activeEditor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
          }
        }
      }
    })
  );
}

export function deactivate(): void {
  // cleanup handled by context.subscriptions
}
