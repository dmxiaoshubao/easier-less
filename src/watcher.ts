import * as vscode from 'vscode';
import { dedupeFilePaths, shouldReactToConfigChange } from './watcherCore';
import { clearAliasCache } from './autoImport';

export let watchers: vscode.FileSystemWatcher[] = [];

export function disposeAllWatchers() {
  watchers.forEach((watcher) => watcher.dispose());
  watchers = [];
}

export function watchMixins(mixinsPaths: string[], callback: () => void) {
  mixinsPaths.forEach((filePath) => {
    const globPattern = new vscode.RelativePattern(
      vscode.Uri.file(filePath).fsPath.replace(/[^/\\]+$/, ''),
      vscode.Uri.file(filePath).fsPath.split(/[/\\]/).pop() || ''
    );

    const watcher = vscode.workspace.createFileSystemWatcher(
      globPattern,
      false,
      false,
      false
    );

    watcher.onDidChange((e) => {
      vscode.window.setStatusBarMessage('$(sync~spin) 重新加载 Less 文件...', 1000);
      callback();
    });

    watcher.onDidDelete((e) => {
      vscode.window.showWarningMessage(`Less 文件已删除: ${e.fsPath}`);
      callback();
    });

    watchers.push(watcher);
  });
}

export function watchAllImportedFiles(allFilePaths: string[], callback: () => void) {
  disposeAllWatchers();

  const uniquePaths = dedupeFilePaths(allFilePaths);
  uniquePaths.forEach((filePath) => {
    try {
      const globPattern = new vscode.RelativePattern(
        vscode.Uri.file(filePath).fsPath.replace(/[^/\\]+$/, ''),
        vscode.Uri.file(filePath).fsPath.split(/[/\\]/).pop() || ''
      );

      const watcher = vscode.workspace.createFileSystemWatcher(
        globPattern,
        false,
        false,
        false
      );

      watcher.onDidChange(() => {
        vscode.window.setStatusBarMessage('$(sync~spin) 重新加载 Less 文件...', 1000);
        callback();
      });

      watcher.onDidDelete((e) => {
        vscode.window.showWarningMessage(`Less 文件已删除: ${e.fsPath}`);
        callback();
      });

      watchers.push(watcher);
    } catch (error) {
      console.error('Failed to watch file:', filePath, error);
    }
  });
}

export function watchConfig(callback: () => void): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((event) => {
    if (!shouldReactToConfigChange((key) => event.affectsConfiguration(key))) {
      return;
    }
    clearAliasCache();
    vscode.window.setStatusBarMessage('$(sync~spin) 重新加载 Less 配置...', 1000);
    callback();
  });
}
