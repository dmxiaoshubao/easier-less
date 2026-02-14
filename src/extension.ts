import * as vscode from 'vscode';
import { welcome } from './welcome';
import registerHover from './registerHover';
import registerDefinition from './registerDefinition';
import { getMixinsPaths } from './getMixins';
import { getStore, originalData } from './getStore';
import registerAutoComplete from './registerAutoComplete';
import {
  disposeAllWatchers,
  watchAllImportedFiles,
  watchConfig,
  watchers,
} from './watcher';
import {
  evaluateRuntimeSnapshots,
  getRuntimeSnapshots,
  recordRuntimeSnapshot,
} from './diagnostics';

export const unRegisters: vscode.Disposable[] = [];

let configDisposable: vscode.Disposable | null = null;
let isInitializing = false;
let hasPendingInit = false;

function disposeDynamicRegistrations() {
  while (unRegisters.length > 0) {
    const disposable = unRegisters.pop();
    disposable?.dispose();
  }
}

async function runInit(context: vscode.ExtensionContext): Promise<void> {
  if (isInitializing) {
    hasPendingInit = true;
    return;
  }

  isInitializing = true;
  const startAt = Date.now();
  try {
    disposeDynamicRegistrations();
    disposeAllWatchers();
    originalData.length = 0;

    const mixinsPaths = getMixinsPaths();
    const [store, variableStore, methodsStore] = await getStore(mixinsPaths);
    const allFilePaths = originalData.map((item) => item[0]);

    watchAllImportedFiles(allFilePaths, () => {
      void runInit(context);
    });

    registerHover(context, store, mixinsPaths);
    registerDefinition(context, mixinsPaths);
    registerAutoComplete(context, variableStore, methodsStore);

    if (allFilePaths.length > 0) {
      vscode.window.setStatusBarMessage(
        `$(check) Less 文件已加载 (${allFilePaths.length} 个文件)`,
        3000
      );
    }

    const duration = Date.now() - startAt;
    recordRuntimeSnapshot(duration, watchers.length, unRegisters.length);
  } finally {
    isInitializing = false;
    if (hasPendingInit) {
      hasPendingInit = false;
      void runInit(context);
    }
  }
}

export async function activate(context: vscode.ExtensionContext) {
  console.log('-----easier-less 插件已激活-----');
  welcome();

  if (configDisposable) {
    configDisposable.dispose();
  }

  configDisposable = watchConfig(() => {
    void runInit(context);
  });
  context.subscriptions.push(configDisposable);

  await runInit(context);
}

export function deactivate() {
  if (configDisposable) {
    configDisposable.dispose();
    configDisposable = null;
  }
  disposeDynamicRegistrations();
  disposeAllWatchers();
  originalData.length = 0;
}

export function getDiagnosticResult() {
  return evaluateRuntimeSnapshots(undefined, getRuntimeSnapshots());
}
