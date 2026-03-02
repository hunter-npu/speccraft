import * as vscode from 'vscode';

interface RequirementInfo {
  id: string;
  title: string;
  line: number;
  contentLines: string[];
}

function parseRequirements(document: vscode.TextDocument): RequirementInfo[] {
  const results: RequirementInfo[] = [];
  const requirementPattern = /^#{4,5}\s+((?:FR|NFR|DR|UIR)-\d+(?:-\d+)?):\s+(.+)$/;

  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i).text;
    const match = line.match(requirementPattern);
    if (match) {
      const id = match[1];
      const title = match[2].trim();

      const contentLines: string[] = [];
      for (let j = i + 1; j < document.lineCount; j++) {
        const bodyLine = document.lineAt(j).text;
        if (bodyLine.startsWith('#')) break;
        if (bodyLine.trim()) contentLines.push(bodyLine);
      }

      results.push({ id, title, line: i, contentLines });
    }
  }

  return results;
}

export class SpecCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    if (!document.fileName.endsWith('.spec.md')) return [];

    const requirements = parseRequirements(document);
    const lenses: vscode.CodeLens[] = [];

    for (const req of requirements) {
      const range = new vscode.Range(req.line, 0, req.line, 0);
      const content = req.contentLines.join('\n');

      lenses.push(
        new vscode.CodeLens(range, {
          title: '✨ Improve',
          command: 'speccraft.codelensImprove',
          arguments: [{ id: req.id, title: req.title, content }],
        })
      );
    }

    return lenses;
  }
}
