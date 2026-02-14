const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const getStoreModule = require('../../out/getStore');
const { getStore, resolveImportPath, readFileWithImports } = getStoreModule;

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

describe('getStore', () => {
  let tempDir = '';

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'easier-less-test-'));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('可递归读取 import、处理循环引用并提取变量与方法', async () => {
    const a = path.join(tempDir, 'styles', 'a.less');
    const b = path.join(tempDir, 'styles', 'b.less');

    writeFile(
      a,
      `
@a-color: #fff;
@import './b.less';
// @import './ignore.less';
.btn { color: @a-color; }
`
    );
    writeFile(
      b,
      `
@b-color: #000;
@import './a.less';
.mixin(@v) { color: @v; }
`
    );

    const [store, variables, methods] = await getStore([a]);

    assert.strictEqual(variables['@a-color'], '#fff');
    assert.strictEqual(variables['@b-color'], '#000');
    assert.ok(methods['.mixin']);
    assert.ok(methods['.btn']);
    assert.strictEqual(getStoreModule.variableSourceMap['@b-color'], a);
    assert.strictEqual(getStoreModule.methodSourceMap['.mixin'], a);
    assert.strictEqual(getStoreModule.originalData.length, 2);
    assert.ok(store['@a-color']);
  });

  it('resolveImportPath 支持相对路径与绝对路径', () => {
    const current = path.join(tempDir, 'styles', 'a.less');
    const target = path.join(tempDir, 'styles', 'b.less');
    writeFile(current, '');
    writeFile(target, '');

    assert.strictEqual(resolveImportPath('./b.less', current), target);
    assert.strictEqual(resolveImportPath(target, current), target);
  });

  it('readFileWithImports 不会因循环引用无限递归', async () => {
    const a = path.join(tempDir, 'a.less');
    const b = path.join(tempDir, 'b.less');
    writeFile(a, "@import './b.less';\n@x: 1;");
    writeFile(b, "@import './a.less';\n@y: 2;");

    const files = await readFileWithImports(a);
    const loadedPaths = files.map((item) => item[0]).sort();
    assert.deepStrictEqual(loadedPaths, [a, b].sort());
  });
});
