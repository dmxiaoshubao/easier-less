import { AliasConfig, toAliasOrWorkspaceRelativePath } from './aliasCore';

export function shouldShowWelcomePrompt(
  notice: unknown,
  suppressNotice: unknown,
  files: Array<string>
): boolean {
  if (!notice) {
    return false;
  }
  if (suppressNotice) {
    return false;
  }
  return files.length === 0;
}

export function buildWorkspaceMixinPaths(
  uris: Array<{ path: string }>,
  workspaceRoot: string | null,
  aliasConfig: AliasConfig,
  existsSync: (filePath: string) => boolean
): string[] {
  const mixinsPaths: string[] = [];

  uris.forEach((uri) => {
    if (!uri.path || !existsSync(uri.path)) {
      return;
    }

    if (!workspaceRoot) {
      mixinsPaths.push(uri.path);
      return;
    }

    mixinsPaths.push(
      toAliasOrWorkspaceRelativePath(uri.path, workspaceRoot, aliasConfig)
    );
  });

  return mixinsPaths;
}
