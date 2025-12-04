import * as vscode from 'vscode';

export let watchers: vscode.FileSystemWatcher[] = [];

// 当mixinsPathsb变化后需要重新创建, 创建之前要把之前的干掉
export function watchMixins(mixinsPaths: string[], callback: () => void) {
  mixinsPaths.forEach((path) => {
    // 转换为 glob 模式以适配文件系统监听器
    const globPattern = new vscode.RelativePattern(
      vscode.Uri.file(path).fsPath.replace(/[^/\\]+$/, ''),
      vscode.Uri.file(path).fsPath.split(/[/\\]/).pop() || ''
    );

    const watcher = vscode.workspace.createFileSystemWatcher(
      globPattern,
      false,
      false,
      false
    );

    watcher.onDidChange((e) => {
      console.log('Less file changed:', e.fsPath);
      vscode.window.setStatusBarMessage('$(sync~spin) 重新加载 Less 文件...', 1000);
      callback();
    });

    watcher.onDidDelete((e) => {
      console.log('Less file deleted:', e.fsPath);
      vscode.window.showWarningMessage(`Less 文件已删除: ${e.fsPath}`);
      callback();
    });

    watchers.push(watcher);
  });
}

// 监听所有通过 @import 导入的文件
export function watchAllImportedFiles(allFilePaths: string[], callback: () => void) {
  // 清理之前的所有 watchers
  watchers.forEach((watcher) => watcher.dispose());
  watchers = [];

  // 为所有文件（包括递归导入的）创建监听器
  const uniquePaths = [...new Set(allFilePaths)];
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

      watcher.onDidChange((e) => {
        console.log('Imported less file changed:', e.fsPath);
        vscode.window.setStatusBarMessage('$(sync~spin) 重新加载 Less 文件...', 1000);
        callback();
      });

      watcher.onDidDelete((e) => {
        console.log('Imported less file deleted:', e.fsPath);
        vscode.window.showWarningMessage(`Less 文件已删除: ${e.fsPath}`);
        callback();
      });

      watchers.push(watcher);
    } catch (error) {
      console.error('Failed to watch file:', filePath, error);
    }
  });

  console.log(`正在监听 ${uniquePaths.length} 个 Less 文件`);
}

// 全局只需要注册一次即可
export function watchConfig(callback: () => void) {
  vscode.workspace.onDidChangeConfiguration(function (event) {
    const configList = ['less.files', 'less.notice'];
    // affectsConfiguration: 判断是否变更了指定配置项
    const affected = configList.some((item) =>
      event.affectsConfiguration(item)
    );
    if (affected) {
      console.log('Less configuration changed, reloading...');
      vscode.window.setStatusBarMessage('$(sync~spin) 重新加载 Less 配置...', 1000);
      callback();
    }
  });
}
