const assert = require('assert');
const {
  isInStyleTag,
  isInParentheses,
  matchAtCompletion,
  matchPropertyValueCompletion,
  shouldTriggerDotCompletion,
  detectHoverSearchKey,
  formatHoverDefinition,
  normalizeDefinitionWord,
  isLessSymbolWord,
} = require('../../out/editorCore');

describe('editorCore', () => {
  it('可判断光标是否位于 vue style 标签内', () => {
    const text = '<template>x</template><style lang="less">\n.a{color:@x}\n</style>';
    const offset = text.indexOf('.a');
    assert.strictEqual(isInStyleTag(text, offset), true);
    assert.strictEqual(isInStyleTag(text, text.indexOf('<template>')), false);
  });

  it('可判断是否在括号中', () => {
    assert.strictEqual(isInParentheses('.mixin(@color'), true);
    assert.strictEqual(isInParentheses('.mixin(@color)'), false);
  });

  it('可匹配 @ 补全和属性值补全', () => {
    assert.ok(matchAtCompletion('color: @pri'));
    assert.ok(matchPropertyValueCompletion('color: @pri'));
    assert.strictEqual(shouldTriggerDotCompletion('.btn.'), true);
  });

  it('可识别 hover 的变量和类名 key', () => {
    assert.strictEqual(
      detectHoverSearchKey('color: @primary-color;', 'color: @prim'.length),
      '@primary-color'
    );
    assert.strictEqual(
      detectHoverSearchKey('.btn-primary { color: red; }', '.btn-pr'.length),
      '.btn-primary'
    );
  });

  it('可格式化 hover 展示内容', () => {
    assert.strictEqual(
      formatHoverDefinition('@a', '#fff'),
      '@a: #fff'
    );
    assert.strictEqual(
      formatHoverDefinition('.btn', '.btn{color:red;background:#fff;}'),
      '.btn {\n  color:red;\n  background:#fff;\n}'
    );
  });

  it('可标准化 definition 单词并判断符号类型', () => {
    assert.strictEqual(normalizeDefinitionWord('btn', '.btn {', 1), '.btn');
    assert.strictEqual(isLessSymbolWord('.btn'), true);
    assert.strictEqual(isLessSymbolWord('@color'), true);
    assert.strictEqual(isLessSymbolWord('plain'), false);
  });
});
