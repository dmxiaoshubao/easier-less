import * as path from 'path';

export type AliasConfig = Record<string, string>;

export function stripJsonComments(content: string): string {
  return content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
}

export function parseAliasConfig(
  configContent: string,
  workspaceRoot: string
): AliasConfig {
  const result: AliasConfig = {};
  const parsed = JSON.parse(stripJsonComments(configContent));
  const compilerOptions = parsed?.compilerOptions;
  const baseUrl = (compilerOptions?.baseUrl || '.') as string;
  const paths = compilerOptions?.paths as Record<string, string[]> | undefined;

  if (!paths) {
    return result;
  }

  for (const [alias, targets] of Object.entries(paths)) {
    if (!Array.isArray(targets) || targets.length === 0) {
      continue;
    }
    const cleanAlias = alias.replace(/\/\*$/, '');
    const cleanTarget = String(targets[0]).replace(/\/\*$/, '');
    result[cleanAlias] = path.join(workspaceRoot, baseUrl, cleanTarget);
  }

  return result;
}

export function resolvePathByAliasOrRelative(
  inputPath: string,
  workspaceRoot: string,
  aliasConfig: AliasConfig
): string {
  for (const [alias, aliasPath] of Object.entries(aliasConfig)) {
    if (inputPath === alias || inputPath.startsWith(alias + '/')) {
      const relativePath = inputPath.substring(alias.length + 1);
      return path.join(aliasPath, relativePath);
    }
  }

  if (!path.isAbsolute(inputPath)) {
    return path.join(workspaceRoot, inputPath);
  }

  return inputPath;
}

export function toAliasOrWorkspaceRelativePath(
  absolutePath: string,
  workspaceRoot: string,
  aliasConfig: AliasConfig
): string {
  const normalizedAbsPath = path.normalize(absolutePath);
  const normalizedWorkspaceRoot = path.normalize(workspaceRoot);

  if (!normalizedAbsPath.startsWith(normalizedWorkspaceRoot)) {
    return absolutePath;
  }

  for (const [alias, aliasPath] of Object.entries(aliasConfig)) {
    const normalizedAliasPath = path.normalize(aliasPath);
    if (normalizedAbsPath.startsWith(normalizedAliasPath)) {
      const relativePath = path.relative(normalizedAliasPath, normalizedAbsPath);
      return alias + '/' + relativePath.replace(/\\/g, '/');
    }
  }

  return path.relative(workspaceRoot, normalizedAbsPath).replace(/\\/g, '/');
}
