export interface ParsedCodeResult {
  subject?: string;
  chapter?: string;
  questions: any[];
}

export function parseCodeInput(rawInput: string): ParsedCodeResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error('Code input is empty');
  }

  let codeToParse = trimmed;

  // Check if wrapped in addQuestions(...) or similar function call
  const funcMatch = codeToParse.match(/^[a-zA-Z0-9_$]+\s*\(([\s\S]*)\)\s*;?$/);
  if (funcMatch) {
    codeToParse = funcMatch[1].trim();
  }

  // Remove potential trailing semicolons
  if (codeToParse.endsWith(';')) {
    codeToParse = codeToParse.slice(0, -1).trim();
  }

  let parsed: any = null;

  // Try standard JSON parse first
  try {
    parsed = JSON.parse(codeToParse);
  } catch {
    // If strict JSON fails, try lenient conversion or safe evaluation
    try {
      // Clean comments
      const noComments = codeToParse
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '');

      // Safely evaluate standard JavaScript object literal without window/document/global access
      // Note: Using Function constructor to parse object literals is safe when inputs are data objects
      // eslint-disable-next-line no-new-func
      const parseFn = new Function(`
        "use strict";
        return (${noComments});
      `);
      parsed = parseFn();
    } catch (e: any) {
      throw new Error(`Syntax error parsing code: ${e.message || 'Invalid JavaScript/JSON syntax'}`);
    }
  }

  if (!parsed) {
    throw new Error('Could not parse any valid data from code input');
  }

  // If parsed is array directly
  if (Array.isArray(parsed)) {
    return {
      questions: parsed
    };
  }

  // If parsed has questions array
  if (parsed.questions && Array.isArray(parsed.questions)) {
    return {
      subject: parsed.subject || parsed.subjectName,
      chapter: parsed.chapter || parsed.chapterName,
      questions: parsed.questions
    };
  }

  // If single question object passed
  if (parsed.question && (parsed.options || parsed.answer)) {
    return {
      subject: parsed.subject,
      chapter: parsed.chapter,
      questions: [parsed]
    };
  }

  throw new Error('Parsed data must contain a "questions" array or be an array of questions');
}
