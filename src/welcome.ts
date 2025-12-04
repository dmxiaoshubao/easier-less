import * as vscode from 'vscode';
import fs from 'fs';
import * as path from 'path';

export function welcome() {
  const notice = vscode.workspace.getConfiguration().get('less.notice');

  if (!notice) {
    return;
  }

  // 检查是否已设置不再提示
  const suppressNotice = vscode.workspace.getConfiguration().get('less.suppressNotice');
  if (suppressNotice) {
    return;
  }

  let mixinsPaths: string[] = [];

  const files =
    vscode.workspace.getConfiguration().get<Array<string>>('less.files') || [];

  // 如果项目中已经配置了 less.files，不再弹窗通知
  if (files?.length) {
    return;
  } else {
    vscode.window
      .showInformationMessage('初次使用，请选择mixin文件', '选择', '不再提示')
      .then(
        (item) => {
          if (item === '选择') {
            vscode.window
              .showOpenDialog({
                canSelectMany: true,
                filters: { Less: ['less'] },
              })
              .then((uris) => {
                if (uris && uris.length) {
                  // 获取工作区根路径
                  const workspaceFolders = vscode.workspace.workspaceFolders;
                  const workspaceRoot =
                    workspaceFolders && workspaceFolders.length > 0
                      ? workspaceFolders[0].uri.fsPath
                      : null;

                  uris?.forEach((uri) => {
                    let p = uri.path;
                    if (p && fs.existsSync(p)) {
                      // 如果路径在工作区内，转换为 @ 符号形式
                      if (workspaceRoot && p.startsWith(workspaceRoot)) {
                        const relativePath = path.relative(workspaceRoot, p);
                        p = '@/' + relativePath.replace(/\\/g, '/');
                      }
                      mixinsPaths.push(p);
                    }
                  });
                }
                if (mixinsPaths.length) {
                  vscode.workspace
                    .getConfiguration()
                    .update('less.files', mixinsPaths, vscode.ConfigurationTarget.Workspace);
                  vscode.window.showInformationMessage('设置成功! 已保存到项目 .vscode/settings.json');
                }
              });
          } else if (item === '不再提示') {
            // 用户选择不再提示，保存到项目配置中
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
              // 确保 .vscode 目录存在
              const workspaceRoot = workspaceFolders[0].uri.fsPath;
              const vscodeDir = path.join(workspaceRoot, '.vscode');
              if (!fs.existsSync(vscodeDir)) {
                fs.mkdirSync(vscodeDir, { recursive: true });
              }

              // 使用 VSCode API 更新配置，它会自动处理 JSONC 格式和现有配置
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
            } else {
              vscode.window.showWarningMessage('未找到工作区，无法保存配置');
            }
          }
        },
        (_e) => {
          // return reject([]);
        }
      );
  }
}
