const assert = require('assert');
const path = require('path');
const {
  resolveImportPathToAbsolute,
  hasImportedTarget,
  buildImportPath,
  getVueStyleInsertOffset,
} = require('../../out/autoImportCore');

describe('autoImportCore', () => {
  it('可解析别名、相对、绝对导入路径', () => {
    const workspaceRoot = path.join('/', 'repo');
    const aliasConfig = { '@': path.join(workspaceRoot, 'src') };
    const currentDir = path.join(workspaceRoot, 'src', 'components');

    assert.strictEqual(
      resolveImportPathToAbsolute('@/styles/theme', currentDir, workspaceRoot, aliasConfig),
      path.join(workspaceRoot, 'src', 'styles', 'theme.less')
    );
    assert.strictEqual(
      resolveImportPathToAbsolute('../styles/theme', currentDir, workspaceRoot, aliasConfig),
      path.join(workspaceRoot, 'src', 'styles', 'theme.less')
    );
    assert.strictEqual(
      resolveImportPathToAbsolute(
        path.join(workspaceRoot, 'src', 'styles', 'theme'),
        currentDir,
        workspaceRoot,
        aliasConfig
      ),
      path.join(workspaceRoot, 'src', 'styles', 'theme.less')
    );
  });

  it('可识别是否已经导入目标 less 文件', () => {
    const workspaceRoot = path.join('/', 'repo');
    const aliasConfig = { '@': path.join(workspaceRoot, 'src') };
    const currentDir = path.join(workspaceRoot, 'src', 'pages');
    const text = "@import (reference) '@/styles/theme';\n.box { color: @c; }";

    const imported = hasImportedTarget(
      text,
      path.join(workspaceRoot, 'src', 'styles', 'theme.less'),
      currentDir,
      workspaceRoot,
      aliasConfig
    );
    assert.strictEqual(imported, true);
  });

  it('导入检测应忽略注释中的 @import', () => {
    const workspaceRoot = path.join('/', 'repo');
    const aliasConfig = { '@': path.join(workspaceRoot, 'src') };
    const currentDir = path.join(workspaceRoot, 'src', 'pages');
    const text = [
      "// @import (reference) '@/styles/theme';",
      "/* @import (reference) '@/styles/theme'; */",
      ".box { background: url(http://example.com/a.png); }",
    ].join('\n');

    const imported = hasImportedTarget(
      text,
      path.join(workspaceRoot, 'src', 'styles', 'theme.less'),
      currentDir,
      workspaceRoot,
      aliasConfig
    );
    assert.strictEqual(imported, false);
  });

  it('生成导入路径时优先使用别名', () => {
    const workspaceRoot = path.join('/', 'repo');
    const aliasConfig = { '@': path.join(workspaceRoot, 'src') };
    const fromPath = path.join(workspaceRoot, 'src', 'pages', 'home.less');
    const toPath = path.join(workspaceRoot, 'src', 'styles', 'theme.less');
    assert.strictEqual(
      buildImportPath(fromPath, toPath, workspaceRoot, aliasConfig),
      '@/styles/theme.less'
    );
  });

  it('可定位 vue style 标签导入插入位置', () => {
    const text = '<template></template>\n<style lang="less">\n.box{}';
    const offset = getVueStyleInsertOffset(text);
    assert.strictEqual(text.slice(offset, offset + 1), '.');
  });

  it('可处理 vue style 标签后的 CRLF 换行', () => {
    const text = '<template></template>\r\n<style lang="less">\r\n.box{}';
    const offset = getVueStyleInsertOffset(text);
    assert.strictEqual(text.slice(offset, offset + 1), '.');
  });

  it('vue 文件缺少 style 标签时返回 -1', () => {
    const text = '<template><div /></template>';
    assert.strictEqual(getVueStyleInsertOffset(text), -1);
  });
});
