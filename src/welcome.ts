import * as vscode from 'vscode';
import fs from 'fs';
import * as path from 'path';

export function welcome() {
  const notice = vscode.workspace.getConfiguration().get('less.notice');

  if (!notice) {
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
      .showInformationMessage('初次使用，请选择mixin文件', '选择')
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
          }
        },
        (_e) => {
          // return reject([]);
        }
      );
  }
}
