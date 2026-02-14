import * as vscode from 'vscode';
import fs from 'fs';
import * as path from 'path';
import { loadAliasConfig } from './getMixins';
import { buildWorkspaceMixinPaths, shouldShowWelcomePrompt } from './welcomeCore';

export function welcome() {
  const notice = vscode.workspace.getConfiguration().get('less.notice');
  const suppressNotice = vscode.workspace.getConfiguration().get('less.suppressNotice');
  const files =
    vscode.workspace.getConfiguration().get<Array<string>>('less.files') || [];

  if (!shouldShowWelcomePrompt(notice, suppressNotice, files)) {
    return;
  }

  vscode.window
    .showInformationMessage('初次使用，请选择mixin文件', '选择', '不再提示')
    .then(
      (item) => {
        if (item === '选择') {
          selectMixinsAndSave();
          return;
        }
        if (item === '不再提示') {
          suppressNoticeForWorkspace();
        }
      },
      () => {
        // ignore cancel
      }
    );
}

function selectMixinsAndSave() {
  vscode.window
    .showOpenDialog({
      canSelectMany: true,
      filters: { Less: ['less'] },
    })
    .then((uris) => {
      if (!uris || !uris.length) {
        return;
      }

      const workspaceFolders = vscode.workspace.workspaceFolders;
      const workspaceRoot =
        workspaceFolders && workspaceFolders.length > 0
          ? workspaceFolders[0].uri.fsPath
          : null;

      const aliasConfig = workspaceRoot ? loadAliasConfig(workspaceRoot) : {};
      const mixinsPaths = buildWorkspaceMixinPaths(
        uris.map((item) => ({ path: item.path })),
        workspaceRoot,
        aliasConfig,
        fs.existsSync
      );

      if (!mixinsPaths.length) {
        return;
      }

      vscode.workspace
        .getConfiguration()
        .update('less.files', mixinsPaths, vscode.ConfigurationTarget.Workspace);
      vscode.window.showInformationMessage('设置成功! 已保存到项目 .vscode/settings.json');
    });
}

function suppressNoticeForWorkspace() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showWarningMessage('未找到工作区，无法保存配置');
    return;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const vscodeDir = path.join(workspaceRoot, '.vscode');
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir, { recursive: true });
  }

  vscode.workspace
    .getConfiguration()
    .update('less.suppressNotice', true, vscode.ConfigurationTarget.Workspace)
    .then(
      () => {
        vscode.window.showInformationMessage(
          '已设置不再提示。如需重新提示，请在 .vscode/settings.json 中删除或修改 less.suppressNotice 配置'
        );
      },
      (error) => {
        vscode.window.showErrorMessage('保存配置失败: ' + error.message);
      }
    );
}
