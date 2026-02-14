import * as path from 'path';

export function dedupeFilePaths(paths: string[]): string[] {
  const normalized = paths.map((item) => path.normalize(item));
  return [...new Set(normalized)];
}

export function shouldReactToConfigChange(
  affectsConfiguration: (key: string) => boolean
): boolean {
  const configList = ['less.files', 'less.notice'];
  return configList.some((key) => affectsConfiguration(key));
}
