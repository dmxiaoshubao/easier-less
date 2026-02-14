export function isInStyleTag(text: string, offset: number): boolean {
  const beforeText = text.substring(0, offset);
  const styleOpenIndex = beforeText.lastIndexOf('<style');
  const styleCloseIndex = beforeText.lastIndexOf('</style>');

  if (styleOpenIndex === -1 || styleOpenIndex <= styleCloseIndex) {
    return false;
  }

  const tagEndIndex = text.indexOf('>', styleOpenIndex);
  return tagEndIndex !== -1 && offset > tagEndIndex;
}

export function isInParentheses(lineText: string): boolean {
  let openCount = 0;
  for (let i = 0; i < lineText.length; i++) {
    if (lineText[i] === '(') {
      openCount++;
    } else if (lineText[i] === ')') {
      openCount--;
    }
  }
  return openCount > 0;
}

export function matchAtCompletion(lineText: string): RegExpMatchArray | null {
  return lineText.match(/@([\w-]*)$/);
}

export function matchPropertyValueCompletion(lineText: string): RegExpMatchArray | null {
  return lineText.match(/:\s*(@[\w-]*)?$/);
}

export function shouldTriggerDotCompletion(lineText: string): boolean {
  return /\.$/g.test(lineText);
}

export function detectHoverSearchKey(lineText: string, cursorPos: number): string {
  let searchKey = '';
  let startPos = cursorPos;

  while (startPos > 0 && /[a-zA-Z0-9_-]/.test(lineText[startPos - 1])) {
    startPos--;
  }

  if (startPos > 0 && lineText[startPos - 1] === '@') {
    startPos--;
    let endPos = cursorPos;
    while (endPos < lineText.length && /[a-zA-Z0-9_-]/.test(lineText[endPos])) {
      endPos++;
    }
    searchKey = lineText.substring(startPos, endPos);
  }

  if (searchKey) {
    return searchKey;
  }

  startPos = cursorPos;
  while (startPos > 0 && /[a-zA-Z0-9_-]/.test(lineText[startPos - 1])) {
    startPos--;
  }

  if (startPos > 0 && lineText[startPos - 1] === '.') {
    startPos--;
    let endPos = cursorPos;
    while (endPos < lineText.length && /[a-zA-Z0-9_-]/.test(lineText[endPos])) {
      endPos++;
    }
    return lineText.substring(startPos, endPos);
  }

  if (lineText[cursorPos] === '.') {
    let endPos = cursorPos + 1;
    while (endPos < lineText.length && /[a-zA-Z0-9_-]/.test(lineText[endPos])) {
      endPos++;
    }
    return lineText.substring(cursorPos, endPos);
  }

  return '';
}

export function formatHoverDefinition(searchKey: string, definition: string): string {
  if (!definition.includes('{') || !definition.includes('}')) {
    return `${searchKey}: ${definition}`;
  }

  const match = definition.match(/(\.[a-zA-Z0-9_-]+(?:\([^)]*\))?)\s*\{([^}]*)\}/);
  if (!match) {
    return definition;
  }

  const header = match[1];
  const innerContent = match[2].trim();
  const lines = innerContent
    .split(/;[\s\n]*/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => '  ' + line + ';');

  if (!lines.length) {
    return definition;
  }

  return `${header} {\n${lines.join('\n')}\n}`;
}

export function normalizeDefinitionWord(
  word: string,
  lineText: string,
  wordStart: number
): string {
  if (word.startsWith('.')) {
    return word;
  }

  if (wordStart > 0 && lineText[wordStart - 1] === '.') {
    return '.' + word;
  }

  return word;
}

export function isLessSymbolWord(word: string): boolean {
  return /^\.[a-zA-Z0-9_-]+/i.test(word) || /^@(?!import)\w+/i.test(word);
}
