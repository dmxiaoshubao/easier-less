const assert = require('assert');
const path = require('path');
const { dedupeFilePaths, shouldReactToConfigChange } = require('../../out/watcherCore');

describe('watcherCore', () => {
  it('可对文件路径去重并规范化', () => {
    const base = path.join('/', 'repo');
    const list = [
      path.join(base, 'a.less'),
      path.join(base, '.', 'a.less'),
      path.join(base, 'b.less'),
    ];
    const deduped = dedupeFilePaths(list);
    assert.strictEqual(deduped.length, 2);
  });

  it('仅对相关配置变更返回 true', () => {
    assert.strictEqual(
      shouldReactToConfigChange((key) => key === 'less.files'),
      true
    );
    assert.strictEqual(
      shouldReactToConfigChange((key) => key === 'editor.fontSize'),
      false
    );
  });
});
