import mammoth from 'mammoth';

export interface RawParsedQuestion {
  question: string;
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

  // Regex helpers
  const qStartRegex = /^(?:Q(?:uestion)?\s*(\d+)[:.]?|(\d+)[\.\)]\s+)(.*)/i;
  const optRegex = /^[\(\[]?([A-Fa-f1-6])[\.\)\]]\s*(.+)/;
  const ansRegex = /^(?:Answer|Ans|Correct\s*Answer|Correct\s*Option)\s*[:=-]\s*[\(\[]?([A-Fa-f1-6])[\)\]]?/i;
  const expRegex = /^(?:Explanation|Solution|Notes?)\s*[:=-]\s*(.*)/i;
  const srcRegex = /^(?:Source|Reference)\s*[:=-]\s*(.*)/i;

  const finalizeCurrentQ = () => {
    if (currentQ && currentQ.question) {
      const opts = currentQ.options || {};
      const answer = currentQ.correctAnswer || '';
      const sName = currentQ.sourceName?.trim() || 'General';
      const sType = currentQ.sourceType || 'Board';
      questions.push({
        question: currentQ.question.trim(),
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

    // Check Question Start
    const qMatch = line.match(qStartRegex);
    if (qMatch) {
      finalizeCurrentQ();
      currentQ = {
        question: qMatch[3] || '',
        options: {},
        correctAnswer: ''
      };
      currentSection = 'question';
      continue;
    }

    // If not started yet, ignore header noise
    if (!currentQ) continue;

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
