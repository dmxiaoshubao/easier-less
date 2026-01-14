import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 读取项目的别名配置（从 jsconfig.json 或 tsconfig.json）
 */
function getAliasConfig(workspaceRoot: string): { [key: string]: string } {
  const aliasConfig: { [key: string]: string } = {};

  // 尝试读取 jsconfig.json 或 tsconfig.json
  const configFiles = ['jsconfig.json', 'tsconfig.json'];

  for (const configFile of configFiles) {
    const configPath = path.join(workspaceRoot, configFile);

    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        // 移除注释（简单处理）
        const jsonContent = configContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
        const config = JSON.parse(jsonContent);

        const compilerOptions = config.compilerOptions;
        if (compilerOptions && compilerOptions.paths) {
          const baseUrl = compilerOptions.baseUrl || '.';
          const paths = compilerOptions.paths;

          // 解析 paths 配置
          for (const [alias, targets] of Object.entries(paths)) {
            if (Array.isArray(targets) && targets.length > 0) {
              // 移除通配符 /*
              const cleanAlias = alias.replace(/\/\*$/, '');
              const cleanTarget = (targets[0] as string).replace(/\/\*$/, '');

              // 计算实际路径
              const actualPath = path.join(workspaceRoot, baseUrl, cleanTarget);
              aliasConfig[cleanAlias] = actualPath;

              console.log(`[GetMixins] 找到别名配置: ${cleanAlias} -> ${actualPath}`);
            }
          }
        }

        break; // 找到配置文件就停止
      } catch (error) {
        console.error(`[GetMixins] 解析 ${configFile} 失败:`, error);
      }
    }
  }

  return aliasConfig;
}

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

  // 解析别名路径和相对路径
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    // 获取别名配置
    const aliasConfig = getAliasConfig(workspaceRoot);

    const resolvedFiles = files.map((file) => {
      if (typeof file === 'string') {
        // 尝试匹配配置的别名
        for (const [alias, aliasPath] of Object.entries(aliasConfig)) {
          if (file.startsWith(alias + '/') || file === alias) {
            // 替换别名为实际路径
            const relativePath = file.substring(alias.length + 1); // +1 是为了跳过斜杠
            const resolvedPath = path.join(aliasPath, relativePath);
            console.log(`[GetMixins] 别名解析: ${file} -> ${resolvedPath}`);
            return resolvedPath;
          }
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
