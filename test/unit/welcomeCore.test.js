const assert = require('assert');
const path = require('path');
const {
  shouldShowWelcomePrompt,
  buildWorkspaceMixinPaths,
} = require('../../out/welcomeCore');

describe('welcomeCore', () => {
  it('可正确判断是否展示首次提示', () => {
    assert.strictEqual(shouldShowWelcomePrompt(true, false, []), true);
    assert.strictEqual(shouldShowWelcomePrompt(false, false, []), false);
    assert.strictEqual(shouldShowWelcomePrompt(true, true, []), false);
    assert.strictEqual(shouldShowWelcomePrompt(true, false, ['a.less']), false);
  });

  it('可将已选择文件转换为工作区别名路径', () => {
    const workspaceRoot = path.join('/', 'repo');
    const aliasConfig = { '@': path.join(workspaceRoot, 'src') };
    const uris = [
      { path: path.join(workspaceRoot, 'src', 'styles', 'a.less') },
      { path: path.join(workspaceRoot, 'styles', 'b.less') },
    ];

    const result = buildWorkspaceMixinPaths(
      uris,
      workspaceRoot,
      aliasConfig,
      () => true
    );

    assert.deepStrictEqual(result, ['@/styles/a.less', 'styles/b.less']);
  });
});
