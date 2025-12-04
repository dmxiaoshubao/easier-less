// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { welcome } from './welcome';
import registerHover from './registerHover';
import registerDefinition from './registerDefinition';
import { getMixinsPaths } from './getMixins';
import { getStore, originalData } from './getStore';
import registerAutoComplete from './registerAutoComplete';
import { watchAllImportedFiles, watchConfig, watchers } from './watcher';

export const unRegisters: vscode.Disposable[] = [];

export async function activate(context: vscode.ExtensionContext) {
  console.log('-----easier-less 插件已激活-----');
  welcome();
  init();
  watchConfig(init);

  async function init() {
    unRegisters.forEach((unRegister) => unRegister.dispose());
    watchers.forEach((watcher) => watcher.dispose());
    originalData.length = 0;

    const mixinsPaths = getMixinsPaths();
    const [store, variableStore, methodsStore] = await getStore(mixinsPaths);

    // 收集所有被加载的文件路径（包括递归导入的）
    const allFilePaths = originalData.map((item) => item[0]);

    // 监听所有文件的变化（包括递归导入的文件）
    watchAllImportedFiles(allFilePaths, init);

    registerHover(context, store, mixinsPaths);
    registerDefinition(context, mixinsPaths);
    registerAutoComplete(context, variableStore, methodsStore);

    // 显示成功消息
    if (allFilePaths.length > 0) {
      console.log(`已加载 ${allFilePaths.length} 个 Less 文件`);
      vscode.window.setStatusBarMessage(
        `$(check) Less 文件已加载 (${allFilePaths.length} 个文件)`,
        3000
      );
    }
  }
}

// this method is called when your extension is deactivated
export function deactivate() {}
