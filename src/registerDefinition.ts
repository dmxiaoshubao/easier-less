import * as vscode from 'vscode';
import { unRegisters } from './extension';
import { originalData } from './getStore';

export default function (
  context: vscode.ExtensionContext,
  mixinsPaths: string[]
) {
  function provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ) {
    let uris: vscode.Location[] = [];
    const fileName = document.fileName;

    // 获取单词，支持 . 开头的类名
    let wordRange = document.getWordRangeAtPosition(position, /\.?[a-zA-Z0-9_-]+/);
    if (!wordRange) {
      return uris;
    }
    let word = document.getText(wordRange);

    // 如果没有点号，检查前一个字符是否是点号
    if (!word.startsWith('.')) {
      const lineText = document.lineAt(position.line).text;
      const wordStart = wordRange.start.character;
      if (wordStart > 0 && lineText[wordStart - 1] === '.') {
        word = '.' + word;
      }
    }

    // 和 hover 中的判断有所区分
    const isMethod = /^\.[a-zA-Z0-9_-]+/i.test(word);
    const isVariable = /^@(?!import)\w+/i.test(word);

    originalData.forEach((item) => {
      const [path, content] = item;
      console.log(111, content.indexOf(word), mixinsPaths);
      if (
        !mixinsPaths.includes(fileName) &&
        content.indexOf(word) !== -1 &&
        (isMethod || isVariable)
      ) {
        const lines = content
          .slice(0, content.indexOf(word))
          ?.match(/\n/g)?.length;
        uris.push(
          new vscode.Location(
            vscode.Uri.file(path),
            new vscode.Position(lines ? lines : 0, 0)
          )
        );
      }
    });

    return uris;
  }

  const unRegister1 = vscode.languages.registerDefinitionProvider('less', {
    provideDefinition,
  });
  const unRegister2 = vscode.languages.registerDefinitionProvider('vue', {
    provideDefinition,
  });

  unRegisters.push(unRegister1);
  unRegisters.push(unRegister2);
  context.subscriptions.push(unRegister1);
  context.subscriptions.push(unRegister2);
}
