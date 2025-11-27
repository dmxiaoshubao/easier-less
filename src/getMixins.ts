import * as vscode from 'vscode';
import * as path from 'path';
// import path, { resolve } from 'path';
// import { rejects } from 'assert';

export function getMixinsPaths() {
  /*   // 所有变量文件
  let mixinsPaths: string[] = [];
  // 在当前文件内 查找变量所在文件
  const editor = vscode.window.activeTextEditor;
  const content = editor?.document.getText();
  // 当前文件的路径
  const fileName = editor?.document.fileName;
  console.log('111 fileName', fileName);
  // 可能引用了多个less文件
  const targets = content?.match(/(?<=@import ['"])(.+?)(?=['"])(?=;?)/gm);
  console.log('111 targets', targets);
  if (targets?.length) {
    targets.forEach((target) => {
      if (fileName) {
        const filePath = path.resolve(
          fileName,
          '../' + (/\.less/.test(target) ? target : target + '.less') // 判断是否有.less后缀
        );
        console.log(
          '111 filePath',
          '../' + /\.less/.test(target) ? target : target + '.less',
          filePath,
          fs.existsSync(filePath)
        );
        if (fs.existsSync(filePath)) {
          mixinsPaths.push(filePath);
        }
      }
    });
  } */

  // 从外部找变量所在文件
  // 项目中可能使用了 style-resources-loader 实现全局注入
  //   if (!targets?.length) {
  //   }

  // return new Promise((resolve, reject) => {
  // let mixinsPaths: string[] = [];

  const files =
    vscode.workspace.getConfiguration().get<Array<string>>('less.files') || [];
  console.log(files);

  // 解析 @ 符号路径别名和相对路径
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const resolvedFiles = files.map((file) => {
      if (typeof file === 'string') {
        // 处理 @/ 开头的路径
        if (file.startsWith('@/')) {
          return path.join(workspaceRoot, file.substring(2));
        }
        // 处理相对路径（不是绝对路径的情况）
        // 判断是否为绝对路径：Windows 下以盘符开头，Unix 下以 / 开头
        const isAbsolute = path.isAbsolute(file);
        if (!isAbsolute) {
          return path.join(workspaceRoot, file);
        }
      }
      return file;
    });
    console.log('Resolved files:', resolvedFiles);
    return resolvedFiles;
  }

  return files;
}
