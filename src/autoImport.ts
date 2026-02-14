import * as vscode from 'vscode';
import * as path from 'path';
import { variableSourceMap, methodSourceMap } from './getStore';
import { AliasConfig } from './aliasCore';
import { loadAliasConfig } from './getMixins';
import {
  buildImportPath,
  getVueStyleInsertOffset,
  hasImportedTarget,
} from './autoImportCore';

const importingFiles = new Set<string>();
let aliasCache: AliasConfig | null = null;

export function clearAliasCache() {
  aliasCache = null;
}

function getWorkspaceRoot(): string {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return '';
  }
  return workspaceFolders[0].uri.fsPath;
}

function getAliasConfig(workspaceRoot: string): AliasConfig {
  if (!workspaceRoot) {
    return {};
  }
  if (aliasCache !== null) {
    return aliasCache;
  }
  aliasCache = loadAliasConfig(workspaceRoot);
  return aliasCache;
}

function hasImported(document: vscode.TextDocument, targetPath: string): boolean {
  const workspaceRoot = getWorkspaceRoot();
  const aliasConfig = getAliasConfig(workspaceRoot);
  return hasImportedTarget(
    document.getText(),
    targetPath,
    path.dirname(document.uri.fsPath),
    workspaceRoot,
    aliasConfig
  );
}

function getImportPath(fromPath: string, toPath: string): string {
  const workspaceRoot = getWorkspaceRoot();
  const aliasConfig = getAliasConfig(workspaceRoot);
  return buildImportPath(fromPath, toPath, workspaceRoot, aliasConfig);
}

async function insertImport(
  document: vscode.TextDocument,
  targetPath: string
): Promise<boolean> {
  const edit = new vscode.WorkspaceEdit();
  const importPath = getImportPath(document.uri.fsPath, targetPath);
  const importStatement = `@import (reference) '${importPath}';\n`;

  let insertPosition = new vscode.Position(0, 0);

  if (document.languageId === 'vue') {
    const text = document.getText();
    const insertOffset = getVueStyleInsertOffset(text);
    insertPosition = document.positionAt(insertOffset);
    const nextChar = text.charAt(insertOffset);
    if (nextChar !== '\n' && nextChar !== '\r' && insertOffset !== 0) {
      edit.insert(document.uri, insertPosition, '\n' + importStatement);
      await vscode.workspace.applyEdit(edit);
      return true;
    }
  }

  edit.insert(document.uri, insertPosition, importStatement);
  await vscode.workspace.applyEdit(edit);
  return true;
}

export async function autoImportLessFile(
  document: vscode.TextDocument,
  varOrClassName: string
): Promise<void> {
  const sourceFile = variableSourceMap[varOrClassName] || methodSourceMap[varOrClassName];

  if (!sourceFile) {
    return;
  }

  const lockKey = `${document.uri.fsPath}::${sourceFile}`;
  if (importingFiles.has(lockKey)) {
    return;
  }

  if (hasImported(document, sourceFile)) {
    return;
  }

  importingFiles.add(lockKey);
  try {
    const success = await insertImport(document, sourceFile);
    if (success) {
      vscode.window.setStatusBarMessage(
        `$(check) 已自动导入: ${path.basename(sourceFile)}`,
        3000
      );
    }
  } catch (error) {
    console.error('[AutoImport] 导入失败:', error);
  } finally {
    setTimeout(() => {
      importingFiles.delete(lockKey);
    }, 500);
  }
}
