import fs from 'fs';
import { promisify } from 'util';
import path from 'path';

const read = promisify(fs.readFile);

export type Store = {
  [index: string]: string;
};

// 记录每一个less文件的数据
export let originalData: string[][] = [];

/**
 * 解析 @import 路径
 */
function resolveImportPath(importPath: string, currentFilePath: string): string | null {
  // 移除引号和分号
  importPath = importPath.replace(/['"]/g, '').replace(/;/g, '').trim();

  // 处理 @/ 别名 - 需要从工作区根目录解析
  if (importPath.startsWith('@/')) {
    // 这里简化处理，假设 @/ 指向 src 目录
    // 实际使用中可能需要读取项目配置
    const workspaceRoot = process.cwd();
    const srcPath = path.join(workspaceRoot, 'src', importPath.substring(2));
    if (fs.existsSync(srcPath)) {
      return srcPath;
    }
    if (!path.extname(srcPath) && fs.existsSync(srcPath + '.less')) {
      return srcPath + '.less';
    }
  }

  // 处理相对路径
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const currentDir = path.dirname(currentFilePath);
    const resolvedPath = path.resolve(currentDir, importPath);
    if (fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }
    // 如果没有后缀，尝试添加 .less
    if (!path.extname(resolvedPath) && fs.existsSync(resolvedPath + '.less')) {
      return resolvedPath + '.less';
    }
  }

  // 处理绝对路径
  if (path.isAbsolute(importPath)) {
    if (fs.existsSync(importPath)) {
      return importPath;
    }
    if (!path.extname(importPath) && fs.existsSync(importPath + '.less')) {
      return importPath + '.less';
    }
  }

  return null;
}

/**
 * 递归读取文件及其导入的文件
 */
async function readFileWithImports(
  filePath: string,
  processedFiles: Set<string> = new Set()
): Promise<Array<[string, string]>> {
  // 规范化路径
  const normalizedPath = path.resolve(filePath);

  // 避免循环引用
  if (processedFiles.has(normalizedPath)) {
    return [];
  }

  processedFiles.add(normalizedPath);

  try {
    const content = await read(normalizedPath, { encoding: 'utf-8' });
    const result: Array<[string, string]> = [[normalizedPath, content]];

    // 查找所有 @import 语句
    const importRegex = /@import\s*(?:\([^)]*\))?\s*['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      const resolvedPath = resolveImportPath(importPath, normalizedPath);

      if (resolvedPath && fs.existsSync(resolvedPath)) {
        // 递归读取导入的文件
        const importedFiles = await readFileWithImports(resolvedPath, processedFiles);
        result.push(...importedFiles);
      }
    }

    return result;
  } catch (err) {
    console.error('Error reading file:', normalizedPath, err);
    return [];
  }
}

export async function getStore(mixinsPaths: string[]) {
  if (!mixinsPaths.length) {
    return [{}, {}, {}];
  }

  // 清空之前的数据
  originalData = [];

  // 递归读取所有文件
  const allFilesData: Array<[string, string]> = [];
  for (const mixinPath of mixinsPaths) {
    const filesData = await readFileWithImports(mixinPath);
    allFilesData.push(...filesData);
  }

  // 保存到 originalData
  allFilesData.forEach((fileData) => {
    originalData.push([fileData[0], fileData[1]]);
  });

  // 合并所有文件内容
  const data = allFilesData.map(([, content]) => content).join('\n');

  let variablesMap: Store = {};
  let methodsMap: Store = {};

  try {
    // 解析变量
    variablesMap = (data.match(/^@(?!import).*:.*/gm) || []).reduce(
      (pre: Store, cur: string) => {
        const arr: string[] = cur.split(/:\s*/);
        pre[arr[0]] = arr[1]
          .replace(/;?/g, '')
          .replace(/\/\/.*/g, '')
          .replace(/\/\*.*\*\/.*/g, '')
          ?.trim();
        return pre;
      },
      {}
    );

    // 匹配带括号的方法，如 .method(...) { ... }
    const methodMatches = data.match(/\.(.+?)\(.*?\)\s+{([^]*?)}/g) || [];
    methodsMap = methodMatches.reduce((pre: Store, cur: string) => {
      const name = cur.match(/^\..*?(?=(\(|\s+{))/g)?.[0] || '';
      pre[name] = cur;
      return pre;
    }, {});

    // 匹配普通的类，如 .class-name { ... }，但排除已经匹配的方法
    const classMatches = data.match(/\.([a-zA-Z0-9_-]+)\s*\{[^}]*\}/g) || [];
    classMatches.forEach((cur) => {
      const name = cur.match(/^\.[a-zA-Z0-9_-]+/)?.[0] || '';
      // 只添加那些不是方法的类（不包含括号）
      if (name && !methodsMap[name] && !cur.includes('(')) {
        methodsMap[name] = cur;
      }
    });

    return [{ ...variablesMap, ...methodsMap }, variablesMap, methodsMap];
  } catch (err) {
    console.log('err', err);
    return [{}, {}, {}];
  }
}
