import * as vscode from 'vscode';
import { Store } from './getStore';
import { unRegisters } from './extension';

export default function (
  context: vscode.ExtensionContext,
  store: Store,
  mixinsPaths: string[]
) {
  function provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ) {
    const fileName = document.fileName;

    // 如果是 mixin 文件本身，不显示悬停提示
    if (mixinsPaths.includes(fileName)) {
      return;
    }

    const line = document.lineAt(position);
    const lineText = line.text;
    const cursorPos = position.character;

    let searchKey = '';

    // 1. 尝试匹配变量 @variable-name
    // 向前查找 @ 符号
    let startPos = cursorPos;
    while (startPos > 0 && /[a-zA-Z0-9_-]/.test(lineText[startPos - 1])) {
      startPos--;
    }
    // 检查前面是否有 @
    if (startPos > 0 && lineText[startPos - 1] === '@') {
      startPos--;
      // 向后查找完整的变量名
      let endPos = cursorPos;
      while (endPos < lineText.length && /[a-zA-Z0-9_-]/.test(lineText[endPos])) {
        endPos++;
      }
      searchKey = lineText.substring(startPos, endPos);
    }

    // 2. 如果不是变量，尝试匹配类名 .class-name
    if (!searchKey) {
      startPos = cursorPos;
      // 向前查找到 . 或非类名字符
      while (startPos > 0 && /[a-zA-Z0-9_-]/.test(lineText[startPos - 1])) {
        startPos--;
      }
      // 检查前面是否有 .
      if (startPos > 0 && lineText[startPos - 1] === '.') {
        startPos--;
        // 向后查找完整的类名
        let endPos = cursorPos;
        while (endPos < lineText.length && /[a-zA-Z0-9_-]/.test(lineText[endPos])) {
          endPos++;
        }
        searchKey = lineText.substring(startPos, endPos);
      } else if (lineText[cursorPos] === '.') {
        // 光标恰好在 . 上
        let endPos = cursorPos + 1;
        while (endPos < lineText.length && /[a-zA-Z0-9_-]/.test(lineText[endPos])) {
          endPos++;
        }
        searchKey = lineText.substring(cursorPos, endPos);
      }
    }

    // 检查是否在 store 中有定义
    const definition = store[searchKey];

    if (!definition) {
      return;
    }

    // 格式化定义内容
    let formattedDefinition = definition;

    // 如果是变量定义（不包含大括号），直接显示
    if (!definition.includes('{') || !definition.includes('}')) {
      // 变量定义，如 #f5f5f5 或 10px 等
      formattedDefinition = `${searchKey}: ${definition}`;
    } else {
      // 如果定义包含多行（类定义或方法定义），格式化显示
      const match = definition.match(/(\.[a-zA-Z0-9_-]+(?:\([^)]*\))?)\s*\{([^}]*)\}/);
      if (match) {
        const header = match[1]; // 类名或方法名（包括参数）
        const innerContent = match[2].trim();

        // 分割成多行并格式化
        const lines = innerContent.split(/;[\s\n]*/)
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(line => '  ' + line + ';');

        if (lines.length > 0) {
          formattedDefinition = `${header} {\n${lines.join('\n')}\n}`;
        }
      }
    }

    // 创建 MarkdownString 以支持颜色预览
    const markdown = new vscode.MarkdownString();
    markdown.appendCodeblock(formattedDefinition, 'less');

    return new vscode.Hover(markdown);
  }

  const unRegister = vscode.languages.registerHoverProvider('less', {
    provideHover,
  });
  const unRegisterVue = vscode.languages.registerHoverProvider('vue', {
    provideHover,
  });
  unRegisters.push(unRegister, unRegisterVue);
  context.subscriptions.push(unRegister, unRegisterVue);
}
