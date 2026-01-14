import * as vscode from "vscode";
import { Store } from "./getStore";
import { unRegisters } from "./extension";
import { autoImportLessFile } from "./autoImport";

export default function (
  context: vscode.ExtensionContext,
  variableStore: Store,
  methodsStore: Store
) {
  // 注册自动导入命令
  const autoImportCommand = vscode.commands.registerCommand(
    'easierLess.autoImport',
    async (varOrClassName: string) => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await autoImportLessFile(editor.document, varOrClassName);
      }
    }
  );

  context.subscriptions.push(autoImportCommand);
  unRegisters.push(autoImportCommand);

  /**
   * 检查光标是否在 Vue 文件的 <style> 标签内
   */
  function isInStyleTag(document: vscode.TextDocument, position: vscode.Position): boolean {
    // 如果不是 Vue 文件，返回 false
    if (document.languageId !== 'vue') {
      return false;
    }

    const text = document.getText();
    const offset = document.offsetAt(position);

    // 查找光标前最近的 <style> 标签
    const beforeText = text.substring(0, offset);
    const styleOpenMatch = beforeText.lastIndexOf('<style');
    const styleCloseMatch = beforeText.lastIndexOf('</style>');

    // 如果找到 <style> 且在 </style> 之后（或没有 </style>），说明在 style 标签内
    if (styleOpenMatch !== -1 && styleOpenMatch > styleCloseMatch) {
      // 确保已经过了开始标签的 >
      const tagEndIndex = text.indexOf('>', styleOpenMatch);
      if (tagEndIndex !== -1 && offset > tagEndIndex) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查当前位置是否在括号内
   */
  function isInParentheses(lineText: string): boolean {
    let openCount = 0;
    for (let i = 0; i < lineText.length; i++) {
      if (lineText[i] === '(') {
        openCount++;
      } else if (lineText[i] === ')') {
        openCount--;
      }
    }
    // 如果 openCount > 0，说明在括号内
    return openCount > 0;
  }

  /**
   * @ 自动补全
   * @param document
   * @param position
   * @param token
   */
  function provideCompletionItems1(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ) {
    const line = document.lineAt(position);

    // 只截取到光标位置为止，防止一些特殊情况
    const lineText = line.text.substring(0, position.character);

    // 检查是否在 Vue 文件的 style 标签内，且不在括号内
    if (document.languageId === 'vue') {
      if (!isInStyleTag(document, position) || isInParentheses(lineText)) {
        return;
      }
    }

    // 匹配 @ 后面跟着任意字符（支持过滤式补全）
    const atMatch = lineText.match(/@([\w-]*)$/);
    if (atMatch) {
      // 计算 @ 符号的位置
      const matchStartPos = position.character - atMatch[0].length;
      const replaceRange = new vscode.Range(
        position.line,
        matchStartPos + 1, // 从 @ 之后开始替换，保留 @
        position.line,
        position.character  // 到光标位置
      );

      return Object.entries(variableStore).map(([key, val]) => {
        // 移除key中的@符号，避免重复
        const label = key.startsWith('@') ? key.substring(1) : key;
        const completionItem = new vscode.CompletionItem(label, vscode.CompletionItemKind.Variable);

        completionItem.detail = val;
        completionItem.insertText = label;
        // 设置替换范围：只替换 @ 之后的内容，保留 @
        completionItem.range = replaceRange;
        // 设置 filterText 为带 @ 的完整变量名，这样 VSCode 才能正确过滤 @prim 这样的输入
        completionItem.filterText = '@' + label;

        // 添加自动导入命令
        completionItem.command = {
          command: 'easierLess.autoImport',
          title: 'Auto Import',
          arguments: [key] // 传递完整的变量名（带 @）
        };

        if (
          /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(val) ||
          key.indexOf("Color") !== -1 ||
          key.indexOf("color") !== -1
        ) {
          completionItem.kind = vscode.CompletionItemKind.Color;
        }

        return completionItem;
      });
    }
  }

  /**
   * 属性值位置的 @ 变量补全（支持 color: @、color: @p 等场景）
   * 这个提供器在手动触发补全或输入冒号后触发
   */
  function provideCompletionItems3(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ) {
    const line = document.lineAt(position);
    const lineText = line.text.substring(0, position.character);

    // 检查是否在 Vue 文件的 style 标签内，且不在括号内
    if (document.languageId === 'vue') {
      if (!isInStyleTag(document, position) || isInParentheses(lineText)) {
        return;
      }
    }

    // 检查是否在属性值位置：匹配 : 后面可能有空格，以及可能已经输入的 @ 变量（可能输入了部分）
    // 支持 color: | 和 color:| 和 color: @p 等场景（|表示光标位置）
    const propertyValueMatch = lineText.match(/:\s*(@[\w-]*)?$/);

    if (propertyValueMatch) {
      const atPart = propertyValueMatch[1]; // 获取 @ 部分，如 "@p" 或 undefined
      const hasAt = !!atPart;

      // 计算替换范围
      let replaceRange: vscode.Range | undefined;
      if (hasAt) {
        // 如果已经有 @，则替换整个 @ 变量部分
        const matchStartPos = position.character - atPart.length;
        replaceRange = new vscode.Range(
          position.line,
          matchStartPos,
          position.line,
          position.character
        );
      }

      // 在属性值位置，显示所有变量补全
      return Object.entries(variableStore).map(([key, val]) => {
        const label = key.startsWith('@') ? key.substring(1) : key;
        const completionItem = new vscode.CompletionItem(
          '@' + label,
          vscode.CompletionItemKind.Variable
        );

        completionItem.detail = val;
        // 插入完整的变量名（包括 @）
        completionItem.insertText = '@' + label;
        completionItem.filterText = '@' + label;
        completionItem.sortText = '0' + label; // 确保变量排在前面

        // 如果已经有 @，设置替换范围
        if (replaceRange) {
          completionItem.range = replaceRange;
        }

        // 添加自动导入命令
        completionItem.command = {
          command: 'easierLess.autoImport',
          title: 'Auto Import',
          arguments: [key] // 传递完整的变量名（带 @）
        };

        if (
          /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(val) ||
          key.indexOf("Color") !== -1 ||
          key.indexOf("color") !== -1
        ) {
          completionItem.kind = vscode.CompletionItemKind.Color;
        }

        return completionItem;
      });
    }
  }

  /**
   * . 自动补全
   * @param document
   * @param position
   * @param token
   */
  function provideCompletionItems2(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ) {
    const line = document.lineAt(position);
    // 只截取到光标位置为止，防止一些特殊情况
    const lineText = line.text.substring(0, position.character);

    // 检查是否在 Vue 文件的 style 标签内，且不在括号内
    if (document.languageId === 'vue') {
      if (!isInStyleTag(document, position) || isInParentheses(lineText)) {
        return;
      }
    }

    // 简单匹配，只要当前光标前的字符串为 . 都自动带出所有的依赖
    if (/\.$/g.test(lineText)) {
      return Object.entries(methodsStore).map(([key, val]) => {
        // 移除key中的点号，避免重复
        const label = key.startsWith('.') ? key.substring(1) : key;
        const completionItem = new vscode.CompletionItem(label);
        completionItem.detail = val;
        completionItem.kind = vscode.CompletionItemKind.Method;

        // 添加自动导入命令
        completionItem.command = {
          command: 'easierLess.autoImport',
          title: 'Auto Import',
          arguments: [key] // 传递完整的类名（带 .）
        };

        return completionItem;
      });
    }
  }

  /**
   * 光标选中当前自动补全item时触发动作，一般情况下无需处理
   * @param {*} item
   * @param {*} token
   */
  function resolveCompletionItem() {
    return null;
  }

  // 注册 @ 符号触发的补全（用于 @var 这样的场景）
  const unRegister1 = vscode.languages.registerCompletionItemProvider(
    "less",
    {
      provideCompletionItems: provideCompletionItems1,
      resolveCompletionItem,
    },
    "@"
  );

  // 注册 . 符号触发的补全
  const unRegister2 = vscode.languages.registerCompletionItemProvider(
    "less",
    {
      provideCompletionItems: provideCompletionItems2,
      resolveCompletionItem,
    },
    "."
  );

  // 注册 Vue 文件的 @ 补全
  const unRegister3 = vscode.languages.registerCompletionItemProvider(
    "vue",
    {
      provideCompletionItems: provideCompletionItems1,
      resolveCompletionItem,
    },
    "@"
  );

  // 注册 Vue 文件的 . 补全
  const unRegister4 = vscode.languages.registerCompletionItemProvider(
    "vue",
    {
      provideCompletionItems: provideCompletionItems2,
      resolveCompletionItem,
    },
    "."
  );

  // 注册冒号和空格触发的补全（用于 color: @ 和 color:@ 场景）
  const unRegister5 = vscode.languages.registerCompletionItemProvider(
    "less",
    {
      provideCompletionItems: provideCompletionItems3,
      resolveCompletionItem,
    },
    ":", " "  // 冒号和空格都可以触发
  );

  // 注册 Vue 文件的冒号和空格补全
  const unRegister6 = vscode.languages.registerCompletionItemProvider(
    "vue",
    {
      provideCompletionItems: provideCompletionItems3,
      resolveCompletionItem,
    },
    ":", " "
  );

  unRegisters.push(unRegister1, unRegister2, unRegister3, unRegister4, unRegister5, unRegister6);
  context.subscriptions.push(unRegister1, unRegister2, unRegister3, unRegister4, unRegister5, unRegister6);
}
