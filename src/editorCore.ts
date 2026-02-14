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

export function getAtIdentifierSuffixLength(rightText: string): number {
  const match = rightText.match(/^[\w-]*/);
  return match ? match[0].length : 0;
}

export function shouldTriggerDotCompletion(lineText: string): boolean {
  return /(?:^|[\s,{;(])\.[\w.-]*$/.test(lineText);
}

function shouldAppendSemicolon(rightText: string): boolean {
  const trimmed = rightText.trimStart();
  if (!trimmed) {
    return true;
  }
  if (trimmed.startsWith('//') || trimmed.startsWith('/*')) {
    return true;
  }
  return false;
}

function hasLeadingSemicolon(rightText: string): boolean {
  return /^\s*;/.test(rightText);
}

type LeadingMethodCallInfo = {
  full: string;
  args: string;
  hasSemicolon: boolean;
};

function getLeadingMethodCallInfo(rightText: string): LeadingMethodCallInfo | null {
  let i = 0;
  while (i < rightText.length && /\s/.test(rightText[i])) {
    i++;
  }

  if (rightText[i] !== '(') {
    return null;
  }

  const openIndex = i;
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (; i < rightText.length; i++) {
    const ch = rightText[i];

    if (inSingleQuote) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '\'') {
        inSingleQuote = false;
      }
      continue;
    }

    if (inDoubleQuote) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inDoubleQuote = false;
      }
      continue;
    }

    if (ch === '\'') {
      inSingleQuote = true;
      continue;
    }
    if (ch === '"') {
      inDoubleQuote = true;
      continue;
    }

    if (ch === '(') {
      depth++;
      continue;
    }
    if (ch === ')') {
      depth--;
      if (depth === 0) {
        break;
      }
    }
  }

  if (depth !== 0 || i >= rightText.length) {
    return null;
  }

  const closeIndex = i;
  const args = rightText.slice(openIndex + 1, closeIndex);
  const cursorAfterCall = closeIndex + 1;
  let semicolonProbeIndex = cursorAfterCall;
  while (semicolonProbeIndex < rightText.length && /\s/.test(rightText[semicolonProbeIndex])) {
    semicolonProbeIndex++;
  }
  const hasSemicolon = rightText[semicolonProbeIndex] === ';';
  let endIndex = cursorAfterCall;
  if (hasSemicolon) {
    endIndex = semicolonProbeIndex + 1;
  }

  return {
    full: rightText.slice(0, endIndex),
    args,
    hasSemicolon,
  };
}

export function buildDotCompletionInsertText(
  key: string,
  definition: string,
  rightText: string = ''
): string {
  const label = key.startsWith('.') ? key.substring(1) : key;
  const isMethodLike = /^\s*\.[a-zA-Z0-9_-]+\s*\([^)]*\)\s*\{/.test(definition);
  if (isMethodLike) {
    const methodCallInfo = getLeadingMethodCallInfo(rightText);
    if (methodCallInfo) {
      const methodCallText = methodCallInfo.full;
      const argsText = methodCallInfo.args;
      const hasSemicolonInCall = methodCallInfo.hasSemicolon;
      const callWithoutSemicolon = methodCallText
        .replace(/\s*;\s*$/, '')
        .replace(/\s+$/, '');
      const afterCall = rightText.slice(methodCallText.length);
      const needSemicolon = hasSemicolonInCall || shouldAppendSemicolon(afterCall);

      if (argsText.trim().length > 0) {
        return needSemicolon
          ? `${label}${callWithoutSemicolon};`
          : `${label}${callWithoutSemicolon}`;
      }

      return needSemicolon ? `${label}($1);` : `${label}($1)`;
    }

    const hasSemicolon = hasLeadingSemicolon(rightText);
    if (hasSemicolon || !shouldAppendSemicolon(rightText)) {
      return `${label}($1)`;
    }
    return `${label}($1);`;
  }

  if (hasLeadingSemicolon(rightText) || !shouldAppendSemicolon(rightText)) {
    return `${label}`;
  }
  return `${label};`;
}

export function getDotCompletionSuffixReplaceLength(
  definition: string,
  rightText: string
): number {
  const isMethodLike = /^\s*\.[a-zA-Z0-9_-]+\s*\([^)]*\)\s*\{/.test(definition);
  if (!isMethodLike) {
    return 0;
  }
  const methodCallInfo = getLeadingMethodCallInfo(rightText);
  return methodCallInfo ? methodCallInfo.full.length : 0;
}

export function buildAtCompletionInsertText(
  label: string,
  rightText: string,
  keepAtPrefix: boolean
): string {
  const base = keepAtPrefix ? '@' + label : label;
  if (hasLeadingSemicolon(rightText) || !shouldAppendSemicolon(rightText)) {
    return base;
  }
  return `${base};`;
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
  return (
    /^\.[a-zA-Z0-9_-]+/i.test(word) ||
    /^@(?!import\b)[a-zA-Z0-9_-]+/i.test(word)
  );
}
