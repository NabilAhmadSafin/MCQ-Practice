import mammoth from 'mammoth';

export interface RawParsedQuestion {
  question: string;
  questionType?: 'STANDARD' | 'MULTIPLE_STATEMENT' | 'COMMON_STEM';
  statements?: string[];
  commonInfoTitle?: string;
  commonInfoContent?: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation?: string;
  sourceType?: string;
  sourceName?: string;
  sources?: { type: string; name: string }[];
}

export async function parseDocxFile(file: File): Promise<RawParsedQuestion[]> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const rawText = result.value;

  return parseTextToQuestions(rawText);
}

export function parseTextToQuestions(rawText: string): RawParsedQuestion[] {
  // Normalize newlines
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const questions: RawParsedQuestion[] = [];
  let currentQ: Partial<RawParsedQuestion> | null = null;
  let currentSection: 'question' | 'explanation' | null = null;
  let currentStem: { title: string; content: string } | null = null;
  let parsingStem = false;

  // Regex helpers
  const stemHeaderRegex = /^(?:(?:নিচের\s+)?(?:উদ্দীপক|অনুচ্ছেদ)(?:টি)?\s*(?:পড়ে|পড়ে)?|Passage|Common\s*(?:Stem|Info)|Stem|Context)\s*[:=-]?\s*(.*)/i;
  const qStartRegex = /^(?:Q(?:uestion)?\s*(\d+)[:.]?|(\d+)[\.\)]\s+)(.*)/i;
  const stmtRegex = /^(?:([ivxIVX]+)\.|\(([ivxIVX]+)\)|([১-৩ivxIVX]+)[\.\)]\s+)\s*(.+)/;
  const typeRegex = /^(?:Question\s*Type|Type|প্রশ্নের\s*ধরন|ধরন)\s*[:=-]\s*(.*)/i;
  const optRegex = /^[\(\[]?([A-Fa-f1-6])[\.\)\]]\s*(.+)/;
  const ansRegex = /^(?:Answer|Ans|Correct\s*Answer|Correct\s*Option|উত্তর)\s*[:=-]\s*[\(\[]?([A-Fa-f1-6])[\)\]]?/i;
  const expRegex = /^(?:Explanation|Solution|Notes?|ব্যাখ্যা)\s*[:=-]\s*(.*)/i;
  const srcRegex = /^(?:Source|Reference|উৎস)\s*[:=-]\s*(.*)/i;

  const finalizeCurrentQ = () => {
    if (currentQ && currentQ.question) {
      const opts = currentQ.options || {};
      const answer = currentQ.correctAnswer || '';
      const sName = currentQ.sourceName?.trim() || 'General';
      const sType = currentQ.sourceType || 'Board';

      let qType = currentQ.questionType || 'STANDARD';
      if (currentQ.statements && currentQ.statements.length > 0) {
        qType = 'MULTIPLE_STATEMENT';
      } else if (currentStem && currentStem.content) {
        qType = 'COMMON_STEM';
      }

      questions.push({
        question: currentQ.question.trim(),
        questionType: qType,
        statements: currentQ.statements && currentQ.statements.length > 0 ? currentQ.statements : undefined,
        commonInfoTitle: currentStem?.title,
        commonInfoContent: currentStem?.content,
        options: opts,
        correctAnswer: answer,
        explanation: currentQ.explanation?.trim() || undefined,
        sourceName: sName,
        sourceType: sType,
        sources: currentQ.sources || [{ type: sType, name: sName }]
      });
    }
    currentQ = null;
    currentSection = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for stimulus / stem start
    const stemMatch = line.match(stemHeaderRegex);
    if (stemMatch && !currentQ) {
      parsingStem = true;
      const initialContent = stemMatch[1] || '';
      currentStem = {
        title: line.length > 50 ? line.slice(0, 45) + '...' : line,
        content: initialContent
      };
      continue;
    }

    // Check Question Start
    const qMatch = line.match(qStartRegex);
    if (qMatch) {
      finalizeCurrentQ();
      parsingStem = false;
      currentQ = {
        question: qMatch[3] || '',
        options: {},
        correctAnswer: '',
        questionType: currentStem ? 'COMMON_STEM' : 'STANDARD'
      };
      currentSection = 'question';
      continue;
    }

    // If parsing a stem before questions start, append lines
    if (parsingStem && currentStem) {
      currentStem.content = (currentStem.content ? currentStem.content + '\n' : '') + line;
      continue;
    }

    // If not started yet, ignore header noise
    if (!currentQ) continue;

    // Check explicit Type specification
    const typeMatch = line.match(typeRegex);
    if (typeMatch) {
      const tVal = typeMatch[1].trim().toUpperCase();
      if (tVal.includes('MULTIPLE') || tVal.includes('STATEMENT') || tVal.includes('বহুপদী')) {
        currentQ.questionType = 'MULTIPLE_STATEMENT';
      } else if (tVal.includes('COMMON') || tVal.includes('STEM') || tVal.includes('অভিন্ন')) {
        currentQ.questionType = 'COMMON_STEM';
      } else {
        currentQ.questionType = 'STANDARD';
      }
      continue;
    }

    // Check Multiple Statements (e.g. i. statement / ii. statement)
    const stmtMatch = line.match(stmtRegex);
    if (stmtMatch && Object.keys(currentQ.options || {}).length === 0) {
      currentSection = null;
      const statementText = stmtMatch[4].trim();
      currentQ.statements = currentQ.statements || [];
      currentQ.statements.push(statementText);
      currentQ.questionType = 'MULTIPLE_STATEMENT';
      continue;
    }

    // Check Options
    const optMatch = line.match(optRegex);
    if (optMatch) {
      currentSection = null;
      let letter = optMatch[1].toUpperCase();
      // If 1,2,3,4 convert to A,B,C,D
      const numMap: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
      if (numMap[letter]) letter = numMap[letter];

      currentQ.options = currentQ.options || {};
      currentQ.options[letter] = optMatch[2].trim();
      continue;
    }

    // Check Answer
    const ansMatch = line.match(ansRegex);
    if (ansMatch) {
      currentSection = null;
      let letter = ansMatch[1].toUpperCase();
      const numMap: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
      if (numMap[letter]) letter = numMap[letter];
      currentQ.correctAnswer = letter;
      continue;
    }

    // Check Explanation
    const expMatch = line.match(expRegex);
    if (expMatch) {
      currentSection = 'explanation';
      currentQ.explanation = expMatch[1].trim();
      continue;
    }

    // Check Source
    const srcMatch = line.match(srcRegex);
    if (srcMatch) {
      currentSection = null;
      const sVal = srcMatch[1].trim();
      currentQ.sourceName = sVal;
      currentQ.sourceType = sVal.toLowerCase().includes('board') ? 'Board' : 'School';
      currentQ.sources = [{ type: currentQ.sourceType, name: sVal }];
      continue;
    }

    // Multiline continuation
    if (currentSection === 'question') {
      currentQ.question += ' ' + line;
    } else if (currentSection === 'explanation') {
      currentQ.explanation = (currentQ.explanation ? currentQ.explanation + ' ' : '') + line;
    }
  }

  // Finalize last question
  finalizeCurrentQ();

  return questions;
}
