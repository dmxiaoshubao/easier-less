import * as vscode from 'vscode';
import { Store } from './getStore';
import { unRegisters } from './extension';
import { autoImportLessFile } from './autoImport';
import {
  isInParentheses,
  isInStyleTag,
  matchAtCompletion,
  matchPropertyValueCompletion,
  shouldTriggerDotCompletion,
} from './editorCore';

export default function (
  context: vscode.ExtensionContext,
  variableStore: Store,
  methodsStore: Store
) {
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

  function shouldSkipForVue(
    document: vscode.TextDocument,
    position: vscode.Position,
    lineText: string
  ): boolean {
    if (document.languageId !== 'vue') {
      return false;
    }
    return !isInStyleTag(document.getText(), document.offsetAt(position)) || isInParentheses(lineText);
  }

  function provideAtCompletion(
    document: vscode.TextDocument,
    position: vscode.Position
  ) {
    const lineText = document.lineAt(position).text.substring(0, position.character);
    if (shouldSkipForVue(document, position, lineText)) {
      return;
    }

    const atMatch = matchAtCompletion(lineText);
    if (!atMatch) {
      return;
    }

    const matchStartPos = position.character - atMatch[0].length;
    const replaceRange = new vscode.Range(
      position.line,
      matchStartPos + 1,
      position.line,
      position.character
    );

    return Object.entries(variableStore).map(([key, val]) => {
      const label = key.startsWith('@') ? key.substring(1) : key;
      const completionItem = new vscode.CompletionItem(
        label,
        vscode.CompletionItemKind.Variable
      );

      completionItem.detail = val;
      completionItem.insertText = label;
      completionItem.range = replaceRange;
      completionItem.filterText = '@' + label;
      completionItem.command = {
        command: 'easierLess.autoImport',
        title: 'Auto Import',
        arguments: [key],
      };

      if (
        /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(val) ||
        key.indexOf('Color') !== -1 ||
        key.indexOf('color') !== -1
      ) {
        completionItem.kind = vscode.CompletionItemKind.Color;
      }

      return completionItem;
    });
  }

  function providePropertyValueCompletion(
    document: vscode.TextDocument,
    position: vscode.Position
  ) {
    const lineText = document.lineAt(position).text.substring(0, position.character);
    if (shouldSkipForVue(document, position, lineText)) {
      return;
    }

    const match = matchPropertyValueCompletion(lineText);
    if (!match) {
      return;
    }

    const atPart = match[1];
    let replaceRange: vscode.Range | undefined;

    if (atPart) {
      const matchStartPos = position.character - atPart.length;
      replaceRange = new vscode.Range(
        position.line,
        matchStartPos,
        position.line,
        position.character
      );
    }

    return Object.entries(variableStore).map(([key, val]) => {
      const label = key.startsWith('@') ? key.substring(1) : key;
      const completionItem = new vscode.CompletionItem(
        '@' + label,
        vscode.CompletionItemKind.Variable
      );

      completionItem.detail = val;
      completionItem.insertText = '@' + label;
      completionItem.filterText = '@' + label;
      completionItem.sortText = '0' + label;

      if (replaceRange) {
        completionItem.range = replaceRange;
      }

      completionItem.command = {
        command: 'easierLess.autoImport',
        title: 'Auto Import',
        arguments: [key],
      };

      if (
        /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(val) ||
        key.indexOf('Color') !== -1 ||
        key.indexOf('color') !== -1
      ) {
        completionItem.kind = vscode.CompletionItemKind.Color;
      }

      return completionItem;
    });
  }

  function provideDotCompletion(
    document: vscode.TextDocument,
    position: vscode.Position
  ) {
    const lineText = document.lineAt(position).text.substring(0, position.character);
    if (shouldSkipForVue(document, position, lineText)) {
      return;
    }

    if (!shouldTriggerDotCompletion(lineText)) {
      return;
    }

    return Object.entries(methodsStore).map(([key, val]) => {
      const label = key.startsWith('.') ? key.substring(1) : key;
      const completionItem = new vscode.CompletionItem(label);
      completionItem.detail = val;
      completionItem.kind = vscode.CompletionItemKind.Method;
      completionItem.command = {
        command: 'easierLess.autoImport',
        title: 'Auto Import',
        arguments: [key],
      };
      return completionItem;
    });
  }

  function resolveCompletionItem() {
    return null;
  }

  const unRegister1 = vscode.languages.registerCompletionItemProvider(
    'less',
    { provideCompletionItems: provideAtCompletion, resolveCompletionItem },
    '@'
  );
  const unRegister2 = vscode.languages.registerCompletionItemProvider(
    'less',
    { provideCompletionItems: provideDotCompletion, resolveCompletionItem },
    '.'
  );
  const unRegister3 = vscode.languages.registerCompletionItemProvider(
    'vue',
    { provideCompletionItems: provideAtCompletion, resolveCompletionItem },
    '@'
  );
  const unRegister4 = vscode.languages.registerCompletionItemProvider(
    'vue',
    { provideCompletionItems: provideDotCompletion, resolveCompletionItem },
    '.'
  );
  const unRegister5 = vscode.languages.registerCompletionItemProvider(
    'less',
    { provideCompletionItems: providePropertyValueCompletion, resolveCompletionItem },
    ':',
    ' '
  );
  const unRegister6 = vscode.languages.registerCompletionItemProvider(
    'vue',
    { provideCompletionItems: providePropertyValueCompletion, resolveCompletionItem },
    ':',
    ' '
  );

  unRegisters.push(
    unRegister1,
    unRegister2,
    unRegister3,
    unRegister4,
    unRegister5,
    unRegister6
  );
  context.subscriptions.push(
    unRegister1,
    unRegister2,
    unRegister3,
    unRegister4,
    unRegister5,
    unRegister6
  );
}
