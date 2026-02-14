const assert = require('assert');
const path = require('path');
const {
  parseAliasConfig,
  resolvePathByAliasOrRelative,
  toAliasOrWorkspaceRelativePath,
} = require('../../out/aliasCore');

describe('aliasCore', () => {
  it('可以解析带注释的 tsconfig paths 配置', () => {
    const workspaceRoot = path.join('/', 'repo');
    const content = `{
      // test
      "compilerOptions": {
        "baseUrl": ".",
        "paths": {
          "@/*": ["src/*"],
          "~/*": ["app/*"]
        }
      }
    }`;

    const aliasConfig = parseAliasConfig(content, workspaceRoot);
    assert.strictEqual(aliasConfig['@'], path.join(workspaceRoot, 'src'));
    assert.strictEqual(aliasConfig['~'], path.join(workspaceRoot, 'app'));
  });

  it('可按别名与相对路径解析 mixin 路径', () => {
    const workspaceRoot = path.join('/', 'repo');
    const aliasConfig = { '@': path.join(workspaceRoot, 'src') };
    assert.strictEqual(
      resolvePathByAliasOrRelative('@/styles/a.less', workspaceRoot, aliasConfig),
      path.join(workspaceRoot, 'src', 'styles', 'a.less')
    );
    assert.strictEqual(
      resolvePathByAliasOrRelative('styles/a.less', workspaceRoot, aliasConfig),
      path.join(workspaceRoot, 'styles', 'a.less')
    );
  });

  it('可把绝对路径转换成别名或工作区相对路径', () => {
    const workspaceRoot = path.join('/', 'repo');
    const aliasConfig = { '@': path.join(workspaceRoot, 'src') };

    assert.strictEqual(
      toAliasOrWorkspaceRelativePath(
        path.join(workspaceRoot, 'src', 'styles', 'a.less'),
        workspaceRoot,
        aliasConfig
      ),
      '@/styles/a.less'
    );

    assert.strictEqual(
      toAliasOrWorkspaceRelativePath(
        path.join(workspaceRoot, 'styles', 'b.less'),
        workspaceRoot,
        aliasConfig
      ),
      'styles/b.less'
    );
  });
});
