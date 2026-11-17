export interface ParsedCodeResult {
  subject?: string;
  chapter?: string;
  questions: any[];
}

const LATEX_COMMANDS_REGEX =
  /(\\\\)|\\(ce|pu|frac|dfrac|tfrac|cfrac|sqrt|Delta|Gamma|Theta|Lambda|Sigma|Omega|Phi|Psi|Pi|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|varphi|chi|psi|omega|text|textbf|textit|textrm|mathrm|mathbf|mathit|times|div|cdot|pm|mp|leq|le|geq|ge|neq|approx|equiv|propto|infty|partial|nabla|forall|exists|in|notin|subset|subseteq|cup|cap|rightarrow|leftarrow|leftrightarrow|Rightarrow|Leftarrow|Leftrightarrow|xrightarrow|xleftarrow|uparrow|downarrow|to|gets|implies|iff|int|oint|sum|prod|lim|sin|cos|tan|cot|sec|csc|log|ln|exp|left|right|big|Big|vec|hat|bar|tilde|dot|ddot|overline|underline|begin|end|degree|circ|angle|perp|parallel|triangle|square)\b/g;

/**
 * Protects unescaped single-backslash LaTeX commands inside JS/JSON code inputs
 * (e.g. "\ce{H2O}" -> "\\ce{H2O}", "\frac{1}{2}" -> "\\frac{1}{2}") without touching
 * already-escaped "\\ce" or regular "\n" line breaks.
 */
function protectUnescapedLatexCommands(code: string): string {
  return code.replace(LATEX_COMMANDS_REGEX, (fullMatch, alreadyEscaped: string, cmd: string) => {
    if (alreadyEscaped) return alreadyEscaped;
    return `\\\\${cmd}`;
  });
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
    try {
      // Strip block comments and full-line / trailing JS comments outside strings
      const noComments = codeToParse
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');

      const protectedCode = protectUnescapedLatexCommands(noComments);

      // eslint-disable-next-line no-new-func
      const parseFn = new Function(`
        "use strict";
        return (${protectedCode});
      `);
      parsed = parseFn();
    } catch (e: any) {
      throw new Error(`Syntax error parsing code: ${e.message || 'Invalid JavaScript/JSON syntax'}`);
    }
  }

  if (!parsed) {
    throw new Error('Could not parse any valid data from code input');
  }

  if (Array.isArray(parsed)) {
    return {
      questions: parsed
    };
  }

  if (parsed.questions && Array.isArray(parsed.questions)) {
    return {
      subject: parsed.subject || parsed.subjectName,
      chapter: parsed.chapter || parsed.chapterName,
      questions: parsed.questions
    };
  }

  if (parsed.question && (parsed.options || parsed.answer)) {
    return {
      subject: parsed.subject,
      chapter: parsed.chapter,
      questions: [parsed]
    };
  }

  throw new Error('Parsed data must contain a "questions" array or be an array of questions');
}
