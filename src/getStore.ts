import fs from 'fs';
import { promisify } from 'util';
import path from 'path';

const read = promisify(fs.readFile);

export type Store = {
  [index: string]: string;
};

// 记录每个变量/类名来自哪个主文件（less.files 中配置的文件）
export type SourceMap = {
  [varOrClass: string]: string; // key: 变量名或类名, value: 主文件路径
};

// 记录每一个less文件的数据
export let originalData: string[][] = [];
// 记录变量和类名的源文件映射
export let variableSourceMap: SourceMap = {};
export let methodSourceMap: SourceMap = {};

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

    // 移除注释后再查找 @import 语句
    // 先移除多行注释 /* ... */
    let contentWithoutComments = content.replace(/\/\*[\s\S]*?\*\//g, '');
    // 再移除单行注释 // ...（但保留字符串内的 //）
    contentWithoutComments = contentWithoutComments.replace(/(?<!['"])\/\/.*/g, '');

    // 查找所有 @import 语句
    const importRegex = /@import\s*(?:\([^)]*\))?\s*['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(contentWithoutComments)) !== null) {
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
  variableSourceMap = {};
  methodSourceMap = {};

  // 递归读取所有文件
  const allFilesData: Array<[string, string]> = [];
  // 记录每个文件属于哪个主文件
  const fileToMainFileMap: Map<string, string> = new Map();

  for (const mixinPath of mixinsPaths) {
    const filesData = await readFileWithImports(mixinPath);
    allFilesData.push(...filesData);

    // 记录所有文件都属于这个主文件
    filesData.forEach(([filePath]) => {
      fileToMainFileMap.set(filePath, mixinPath);
    });
  }

  // 保存到 originalData
  allFilesData.forEach((fileData) => {
    originalData.push([fileData[0], fileData[1]]);
  });

  let variablesMap: Store = {};
  let methodsMap: Store = {};

  try {
    // 为每个文件单独解析变量和类，并记录其源文件
    allFilesData.forEach(([filePath, content]) => {
      const mainFile = fileToMainFileMap.get(filePath) || filePath;

      // 解析变量
      const variables = content.match(/^@(?!import).*:.*/gm) || [];
      variables.forEach((cur: string) => {
        const arr: string[] = cur.split(/:\s*/);
        const varName = arr[0];
        const varValue = arr[1]
          ?.replace(/;?/g, '')
          .replace(/\/\/.*/g, '')
          .replace(/\/\*.*\*\/.*/g, '')
          ?.trim();

        if (varName && !variablesMap[varName]) {
          variablesMap[varName] = varValue;
          variableSourceMap[varName] = mainFile; // 记录应该导入的主文件
        }
      });

      // 匹配带括号的方法，如 .method(...) { ... }
      const methodMatches = content.match(/\.(.+?)\(.*?\)\s+{([^]*?)}/g) || [];
      methodMatches.forEach((cur: string) => {
        const name = cur.match(/^\..*?(?=(\(|\s+{))/g)?.[0] || '';
        if (name && !methodsMap[name]) {
          methodsMap[name] = cur;
          methodSourceMap[name] = mainFile; // 记录应该导入的主文件
        }
      });

      // 匹配普通的类，如 .class-name { ... }，但排除已经匹配的方法
      const classMatches = content.match(/\.([a-zA-Z0-9_-]+)\s*\{[^}]*\}/g) || [];
      classMatches.forEach((cur) => {
        const name = cur.match(/^\.[a-zA-Z0-9_-]+/)?.[0] || '';
        // 只添加那些不是方法的类（不包含括号）
        if (name && !methodsMap[name] && !cur.includes('(')) {
          methodsMap[name] = cur;
          methodSourceMap[name] = mainFile; // 记录应该导入的主文件
        }
      });
    });

    return [{ ...variablesMap, ...methodsMap }, variablesMap, methodsMap];
  } catch (err) {
    console.log('err', err);
    return [{}, {}, {}];
  }
}
