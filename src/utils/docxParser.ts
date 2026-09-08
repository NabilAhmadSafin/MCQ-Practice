import mammoth from 'mammoth';

export interface RawParsedQuestion {
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation?: string;
  sourceType?: string;
  sourceName?: string;
  difficulty?: string;
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
      // Clean up options
      const opts = currentQ.options || {};
      const answer = currentQ.correctAnswer || '';
      questions.push({
        question: currentQ.question.trim(),
        options: opts,
        correctAnswer: answer,
        explanation: currentQ.explanation?.trim() || undefined,
        sourceName: currentQ.sourceName?.trim() || undefined,
        sourceType: currentQ.sourceType || 'Other',
        difficulty: currentQ.difficulty || 'Medium'
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

    // Check Answer
    const ansMatch = line.match(ansRegex);
    if (ansMatch && currentQ) {
      currentQ.correctAnswer = ansMatch[1].toUpperCase();
      currentSection = null;
      continue;
    }

    // Check Explanation
    const expMatch = line.match(expRegex);
    if (expMatch && currentQ) {
      currentQ.explanation = expMatch[1] || '';
      currentSection = 'explanation';
      continue;
    }

    // Check Source
    const srcMatch = line.match(srcRegex);
    if (srcMatch && currentQ) {
      const srcVal = srcMatch[1].trim();
      currentQ.sourceName = srcVal;
      if (/board/i.test(srcVal)) currentQ.sourceType = 'Board';
      else if (/college|school/i.test(srcVal)) currentQ.sourceType = 'School';
      else if (/guide|panjeri|royal/i.test(srcVal)) currentQ.sourceType = 'Guide';
      else if (/model|test/i.test(srcVal)) currentQ.sourceType = 'Model Test';
      else currentQ.sourceType = 'Other';
      currentSection = null;
      continue;
    }

    // Check Option
    const optMatch = line.match(optRegex);
    if (optMatch && currentQ) {
      let letter = optMatch[1].toUpperCase();
      // Map 1,2,3,4 to A,B,C,D if numerical
      if (letter === '1') letter = 'A';
      else if (letter === '2') letter = 'B';
      else if (letter === '3') letter = 'C';
      else if (letter === '4') letter = 'D';

      if (!currentQ.options) currentQ.options = {};
      currentQ.options[letter] = optMatch[2].trim();
      currentSection = null;
      continue;
    }

    // If continuation line
    if (currentQ) {
      if (currentSection === 'question') {
        currentQ.question += ' ' + line;
      } else if (currentSection === 'explanation') {
        currentQ.explanation = (currentQ.explanation ? currentQ.explanation + ' ' : '') + line;
      }
    }
  }

  finalizeCurrentQ();

  return questions;
}
