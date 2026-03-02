import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import type { SpecJson } from './types';

export interface TDDExport {
  specId: string;
  title: string;
  version: string;
  exportedAt: string;
  testSuites: TDDTestSuite[];
}

export interface TDDTestSuite {
  id: string;
  title: string;
  testMethod: string;
  acceptanceCriteria: string;
  testCases: TDDTestCase[];
}

export interface TDDTestCase {
  description: string;
  input: string;
  expected: string;
  edge?: string;
}

export class ExportService {
  async export(spec: SpecJson, targetDir?: string): Promise<string> {
    const exportData: TDDExport = {
      specId: spec.specId,
      title: spec.title,
      version: spec.version,
      exportedAt: new Date().toISOString(),
      testSuites: spec.mappings.map((m) => ({
        id: m.id,
        title: m.title,
        testMethod: m.testMethod,
        acceptanceCriteria: m.acceptanceCriteria,
        testCases: m.testData.map((td) => ({
          description: `${m.id}: ${m.title}`,
          input: td.input,
          expected: td.expected,
          edge: td.edge,
        })),
      })),
    };

    const filename = `${spec.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-tdd-export.json`;

    // Use provided dir or ask the user
    let outPath: string;
    if (targetDir) {
      outPath = path.join(targetDir, filename);
    } else {
      const saveUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(filename),
        filters: { 'JSON Files': ['json'] },
      });
      if (!saveUri) throw new Error('Export cancelled');
      outPath = saveUri.fsPath;
    }

    await fs.writeFile(outPath, JSON.stringify(exportData, null, 2), 'utf-8');
    return outPath;
  }
}
