import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
  AliasConfig,
  parseAliasConfig,
  resolvePathByAliasOrRelative,
} from './aliasCore';

export function loadAliasConfig(workspaceRoot: string): AliasConfig {
  const configFiles = ['jsconfig.json', 'tsconfig.json'];

  for (const configFile of configFiles) {
    const configPath = path.join(workspaceRoot, configFile);
    if (!fs.existsSync(configPath)) {
      continue;
    }

    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return parseAliasConfig(content, workspaceRoot);
    } catch (error) {
      console.error(`[GetMixins] 解析 ${configFile} 失败:`, error);
    }
  }

  return {};
}

export function getMixinsPaths() {
  const files =
    vscode.workspace.getConfiguration().get<Array<string>>('less.files') || [];

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return files;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const aliasConfig = loadAliasConfig(workspaceRoot);

  return files.map((file) => {
    if (typeof file !== 'string') {
      return file;
    }
    return resolvePathByAliasOrRelative(file, workspaceRoot, aliasConfig);
  });
}
