import * as path from 'path';
import { AliasConfig } from './aliasCore';

function stripCommentsForImportScan(text: string): string {
  let result = '';
  let i = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];
    const prev = i > 0 ? text[i - 1] : '';

    if (inLineComment) {
      if (ch === '\n' || ch === '\r') {
        inLineComment = false;
        result += ch;
      } else {
        result += ' ';
      }
      i++;
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        result += '  ';
        i += 2;
        continue;
      }
      result += ch === '\n' || ch === '\r' ? ch : ' ';
      i++;
      continue;
    }

    if (inSingleQuote) {
      result += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '\'') {
        inSingleQuote = false;
      }
      i++;
      continue;
    }

    if (inDoubleQuote) {
      result += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inDoubleQuote = false;
      }
      i++;
      continue;
    }

    if (ch === '\'') {
      inSingleQuote = true;
      result += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inDoubleQuote = true;
      result += ch;
      i++;
      continue;
    }

    if (ch === '/' && next === '*') {
      inBlockComment = true;
      result += '  ';
      i += 2;
      continue;
    }

    const isLikelyLineComment = ch === '/' && next === '/' && /[\s{(;,]/.test(prev || ' ');
    if (isLikelyLineComment) {
      inLineComment = true;
      result += '  ';
      i += 2;
      continue;
    }

    result += ch;
    i++;
  }

  return result;
}

export function resolveImportPathToAbsolute(
  importPath: string,
  currentFileDir: string,
  workspaceRoot: string,
  aliasConfig: AliasConfig
): string {
  for (const [alias, aliasPath] of Object.entries(aliasConfig)) {
    if (importPath === alias || importPath.startsWith(alias + '/')) {
      const relativePath = importPath.substring(alias.length + 1);
      let resolvedPath = path.join(aliasPath, relativePath);
      if (!path.extname(resolvedPath)) {
        resolvedPath += '.less';
      }
      return path.normalize(resolvedPath);
    }
  }

  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    let resolvedPath = path.resolve(currentFileDir, importPath);
    if (!path.extname(resolvedPath)) {
      resolvedPath += '.less';
    }
    return path.normalize(resolvedPath);
  }

  if (path.isAbsolute(importPath)) {
    let resolvedPath = importPath;
    if (!path.extname(resolvedPath)) {
      resolvedPath += '.less';
    }
    return path.normalize(resolvedPath);
  }

  return '';
}

export function hasImportedTarget(
  documentText: string,
  targetPath: string,
  currentFileDir: string,
  workspaceRoot: string,
  aliasConfig: AliasConfig
): boolean {
  const importRegex = /@import\s*(?:\([^)]*\))?\s*['"]([^'"]+)['"]/g;
  const normalizedTargetPath = path.normalize(targetPath);
  const scanText = stripCommentsForImportScan(documentText);
  let match: RegExpExecArray | null = null;

  while ((match = importRegex.exec(scanText)) !== null) {
    const resolvedPath = resolveImportPathToAbsolute(
      match[1],
      currentFileDir,
      workspaceRoot,
      aliasConfig
    );
    if (resolvedPath && resolvedPath === normalizedTargetPath) {
      return true;
    }
  }

  return false;
}

export function buildImportPath(
  fromPath: string,
  toPath: string,
  workspaceRoot: string,
  aliasConfig: AliasConfig
): string {
  const normalizedToPath = path.normalize(toPath);

  for (const [alias, aliasPath] of Object.entries(aliasConfig)) {
    const normalizedAliasPath = path.normalize(aliasPath);
    if (normalizedToPath.startsWith(normalizedAliasPath)) {
      const relativePath = path.relative(normalizedAliasPath, normalizedToPath);
      return alias + '/' + relativePath.replace(/\\/g, '/');
    }
  }

  if (!workspaceRoot) {
    const relativeNoRoot = path.relative(path.dirname(fromPath), toPath);
    const withPrefix = relativeNoRoot.startsWith('.')
      ? relativeNoRoot
      : './' + relativeNoRoot;
    return withPrefix.replace(/\\/g, '/');
  }

  const relativePath = path.relative(path.dirname(fromPath), toPath);
  const withPrefix = relativePath.startsWith('.') ? relativePath : './' + relativePath;
  return withPrefix.replace(/\\/g, '/');
}

export function getVueStyleInsertOffset(text: string): number {
  const styleTagMatch = text.match(/<style[^>]*>/);
  if (!styleTagMatch || styleTagMatch.index === undefined) {
    return -1;
  }

  const tagEndOffset = styleTagMatch.index + styleTagMatch[0].length;
  const nextChar = text.charAt(tagEndOffset);
  if (nextChar === '\r' && text.charAt(tagEndOffset + 1) === '\n') {
    return tagEndOffset + 2;
  }
  if (nextChar === '\n' || nextChar === '\r') {
    return tagEndOffset + 1;
  }
  return tagEndOffset;
}
