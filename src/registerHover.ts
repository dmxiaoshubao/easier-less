import * as vscode from 'vscode';
import { Store } from './getStore';
import { unRegisters } from './extension';
import { detectHoverSearchKey, formatHoverDefinition } from './editorCore';

export default function (
  context: vscode.ExtensionContext,
  store: Store,
  mixinsPaths: string[]
) {
  function provideHover(document: vscode.TextDocument, position: vscode.Position) {
    if (mixinsPaths.includes(document.fileName)) {
      return;
    }

    const lineText = document.lineAt(position).text;
    const searchKey = detectHoverSearchKey(lineText, position.character);
    if (!searchKey) {
      return;
    }

    const definition = store[searchKey];
    if (!definition) {
      return;
    }

    const markdown = new vscode.MarkdownString();
    markdown.appendCodeblock(formatHoverDefinition(searchKey, definition), 'less');
    return new vscode.Hover(markdown);
  }

  const unRegisterLess = vscode.languages.registerHoverProvider('less', { provideHover });
  const unRegisterVue = vscode.languages.registerHoverProvider('vue', { provideHover });
  unRegisters.push(unRegisterLess, unRegisterVue);
  context.subscriptions.push(unRegisterLess, unRegisterVue);
}
