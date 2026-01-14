import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { variableSourceMap, methodSourceMap } from './getStore';

// 防止重复导入的锁
const importingFiles = new Set<string>();

// 缓存别名配置
let aliasCache: { [key: string]: string } | null = null;

/**
 * 读取项目的别名配置（从 jsconfig.json 或 tsconfig.json）
 */
function getAliasConfig(workspaceRoot: string): { [key: string]: string } {
  if (aliasCache !== null) {
    return aliasCache;
  }

  aliasCache = {};

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
              aliasCache[cleanAlias] = actualPath;

              console.log(`[AutoImport] 找到别名配置: ${cleanAlias} -> ${actualPath}`);
            }
          }
        }

        break; // 找到配置文件就停止
      } catch (error) {
        console.error(`[AutoImport] 解析 ${configFile} 失败:`, error);
      }
    }
  }

  return aliasCache;
}

/**
 * 清除别名配置缓存（当配置文件变化时调用）
 */
export function clearAliasCache() {
  aliasCache = null;
}

/**
 * 解析导入路径为绝对路径（支持 alias、相对路径、绝对路径）
 */
function resolveImportPathToAbsolute(
  importPath: string,
  currentFileDir: string,
  workspaceRoot: string
): string {
  // 获取别名配置
  const aliasConfig = getAliasConfig(workspaceRoot);

  // 处理别名（如 @/、~/等）
  for (const [alias, aliasPath] of Object.entries(aliasConfig)) {
    if (importPath.startsWith(alias + '/') || importPath === alias) {
      // 替换别名为实际路径
      const relativePath = importPath.substring(alias.length + 1); // +1 是为了跳过斜杠
      let resolvedPath = path.join(aliasPath, relativePath);

      // 添加 .less 后缀（如果没有）
      if (!path.extname(resolvedPath)) {
        resolvedPath += '.less';
      }

      console.log(`[AutoImport] 别名解析: ${importPath} -> ${resolvedPath}`);
      return path.normalize(resolvedPath);
    }
  }

  // 处理相对路径
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    let resolvedPath = path.resolve(currentFileDir, importPath);
    if (!path.extname(resolvedPath)) {
      resolvedPath += '.less';
    }
    return path.normalize(resolvedPath);
  }

  // 处理绝对路径
  if (path.isAbsolute(importPath)) {
    let resolvedPath = importPath;
    if (!path.extname(resolvedPath)) {
      resolvedPath += '.less';
    }
    return path.normalize(resolvedPath);
  }

  return '';
}

/**
 * 检查当前文件是否已经导入了指定的 Less 文件
 */
function hasImported(document: vscode.TextDocument, targetPath: string): boolean {
  const text = document.getText();
  const importRegex = /@import\s*(?:\([^)]*\))?\s*['"]([^'"]+)['"]/g;
  let match;

  const currentDir = path.dirname(document.uri.fsPath);
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const workspaceRoot = workspaceFolders && workspaceFolders.length > 0
    ? workspaceFolders[0].uri.fsPath
    : '';

  // 规范化目标路径
  const normalizedTargetPath = path.normalize(targetPath);
  console.log(`[AutoImport] 检查是否已导入: ${normalizedTargetPath}`);

  let foundImports: string[] = [];

  while ((match = importRegex.exec(text)) !== null) {
    const importPath = match[1];

    // 解析导入路径为绝对路径
    const resolvedImportPath = resolveImportPathToAbsolute(
      importPath,
      currentDir,
      workspaceRoot
    );

    foundImports.push(`${importPath} -> ${resolvedImportPath}`);

    if (resolvedImportPath && resolvedImportPath === normalizedTargetPath) {
      console.log(`[AutoImport] 找到匹配的导入: ${importPath}`);
      return true;
    }
  }

  console.log(`[AutoImport] 未找到匹配的导入。当前导入:`, foundImports);
  return false;
}

/**
 * 计算导入路径（优先使用 alias，如果不在别名目录下则使用相对路径）
 */
function getImportPath(fromPath: string, toPath: string): string {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const workspaceRoot = workspaceFolders && workspaceFolders.length > 0
    ? workspaceFolders[0].uri.fsPath
    : '';

  if (!workspaceRoot) {
    // 如果没有工作区，只能使用相对路径
    const relativePath = path.relative(path.dirname(fromPath), toPath);
    let formattedPath = relativePath.startsWith('.') ? relativePath : './' + relativePath;
    return formattedPath.replace(/\\/g, '/');
  }

  // 获取别名配置
  const aliasConfig = getAliasConfig(workspaceRoot);

  // 尝试匹配别名
  for (const [alias, aliasPath] of Object.entries(aliasConfig)) {
    const normalizedAliasPath = path.normalize(aliasPath);
    const normalizedToPath = path.normalize(toPath);

    // 检查目标文件是否在别名路径下
    if (normalizedToPath.startsWith(normalizedAliasPath)) {
      // 计算相对于别名路径的路径
      const relativePath = path.relative(normalizedAliasPath, normalizedToPath);
      // 生成别名路径
      const aliasImportPath = alias + '/' + relativePath.replace(/\\/g, '/');

      console.log(`[AutoImport] 生成别名路径: ${toPath} -> ${aliasImportPath}`);
      return aliasImportPath;
    }
  }

  // 如果没有匹配的别名，使用相对路径
  const relativePath = path.relative(path.dirname(fromPath), toPath);

  // 确保路径使用 ./ 或 ../ 开头
  let formattedPath = relativePath.startsWith('.') ? relativePath : './' + relativePath;

  // 统一使用正斜杠
  formattedPath = formattedPath.replace(/\\/g, '/');

  console.log(`[AutoImport] 生成相对路径: ${toPath} -> ${formattedPath}`);
  return formattedPath;
}

/**
 * 在文件开头或 <style> 标签内插入 import 语句
 */
async function insertImport(
  document: vscode.TextDocument,
  targetPath: string
): Promise<boolean> {
  const edit = new vscode.WorkspaceEdit();
  const importPath = getImportPath(document.uri.fsPath, targetPath);
  const importStatement = `@import (reference) '${importPath}';\n`;

  let insertPosition: vscode.Position;

  if (document.languageId === 'vue') {
    // Vue 文件：找到 <style> 标签并在其内部第一行插入
    const text = document.getText();
    const styleTagMatch = text.match(/<style[^>]*>/);

    if (styleTagMatch && styleTagMatch.index !== undefined) {
      const tagEndOffset = styleTagMatch.index + styleTagMatch[0].length;
      insertPosition = document.positionAt(tagEndOffset);

      // 检查标签后是否有换行，如果有则在换行后插入
      const nextChar = text.charAt(tagEndOffset);
      if (nextChar === '\n' || nextChar === '\r') {
        insertPosition = document.positionAt(tagEndOffset + 1);
      } else {
        // 如果没有换行，则添加换行
        edit.insert(document.uri, insertPosition, '\n' + importStatement);
        await vscode.workspace.applyEdit(edit);
        return true;
      }
    } else {
      // 如果找不到 style 标签，则在文件开头插入
      insertPosition = new vscode.Position(0, 0);
    }
  } else {
    // Less 文件：在文件开头插入
    insertPosition = new vscode.Position(0, 0);
  }

  edit.insert(document.uri, insertPosition, importStatement);
  await vscode.workspace.applyEdit(edit);

  return true;
}

/**
 * 自动导入 Less 文件
 */
export async function autoImportLessFile(
  document: vscode.TextDocument,
  varOrClassName: string
): Promise<void> {
  // 查找变量或类名对应的源文件
  let sourceFile = variableSourceMap[varOrClassName] || methodSourceMap[varOrClassName];

  if (!sourceFile) {
    // 如果找不到源文件，则不处理
    console.log(`[AutoImport] 未找到 ${varOrClassName} 的源文件`);
    return;
  }

  // 创建唯一的锁键（文档路径 + 源文件路径）
  const lockKey = `${document.uri.fsPath}::${sourceFile}`;

  // 检查是否正在导入中
  if (importingFiles.has(lockKey)) {
    console.log(`[AutoImport] ${sourceFile} 正在导入中，跳过重复操作`);
    return;
  }

  // 检查是否已经导入
  if (hasImported(document, sourceFile)) {
    console.log(`[AutoImport] ${sourceFile} 已导入，跳过`);
    return;
  }

  try {
    // 加锁
    importingFiles.add(lockKey);
    console.log(`[AutoImport] 开始导入 ${sourceFile} 到 ${document.uri.fsPath}`);

    // 插入 import 语句
    const success = await insertImport(document, sourceFile);

    if (success) {
      console.log(`[AutoImport] 成功导入 ${sourceFile}`);
      vscode.window.setStatusBarMessage(
        `$(check) 已自动导入: ${path.basename(sourceFile)}`,
        3000
      );
    }
  } catch (error) {
    console.error('[AutoImport] 导入失败:', error);
  } finally {
    // 解锁（延迟一点时间，确保文档已更新）
    setTimeout(() => {
      importingFiles.delete(lockKey);
      console.log(`[AutoImport] 解锁 ${lockKey}`);
    }, 500);
  }
}
