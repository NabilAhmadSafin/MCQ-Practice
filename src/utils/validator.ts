import type { ValidationItem, Question, QuestionSource } from '../types';

export function validateParsedQuestion(
  raw: any,
  index: number,
  defaultSubjectName?: string,
  defaultChapterName?: string,
  existingQuestionTexts: Set<string> = new Set()
): ValidationItem {
  const errors: string[] = [];
  const warnings: string[] = [];

  const questionText = typeof raw?.question === 'string' ? raw.question.trim() : '';
  if (!questionText) {
    errors.push('Question text is missing or empty');
  }

  // Check duplicate question text
  if (questionText && existingQuestionTexts.has(questionText.toLowerCase())) {
    warnings.push('A question with very similar or identical text already exists');
  }

  // Options validation
  let optionsObj: Record<string, string> = {};
  if (Array.isArray(raw?.options)) {
    if (raw.options.length < 2) {
      errors.push(`At least 2 options required (found ${raw.options.length})`);
    } else if (raw.options.length > 6) {
      warnings.push(`Unusual number of options (${raw.options.length})`);
    }

    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const seenOptionTexts = new Set<string>();

    raw.options.forEach((opt: any, i: number) => {
      const key = letters[i] || `Opt${i + 1}`;
      const text = typeof opt === 'string' ? opt.trim() : String(opt || '').trim();
      if (!text) {
        errors.push(`Option ${key} is empty`);
      }
      if (seenOptionTexts.has(text.toLowerCase())) {
        errors.push(`Duplicate option value: "${text}"`);
      }
      seenOptionTexts.add(text.toLowerCase());
      optionsObj[key] = text;
    });
  } else if (typeof raw?.options === 'object' && raw.options !== null) {
    const keys = Object.keys(raw.options);
    if (keys.length < 2) {
      errors.push(`At least 2 options required (found ${keys.length})`);
    }
    const seenTexts = new Set<string>();
    for (const k of keys) {
      const text = String(raw.options[k] || '').trim();
      if (!text) {
        errors.push(`Option ${k} is empty`);
      }
      if (seenTexts.has(text.toLowerCase())) {
        errors.push(`Duplicate option value: "${text}"`);
      }
      seenTexts.add(text.toLowerCase());
      optionsObj[k.toUpperCase()] = text;
    }
  } else {
    errors.push('Options must be an array of strings or an object { A: "...", B: "..." }');
  }

  // Correct answer validation
  let rawAns = raw?.correctAnswer || raw?.answer;
  let normalizedAnswer = '';
  if (typeof rawAns === 'string') {
    normalizedAnswer = rawAns.trim().toUpperCase();
    if (normalizedAnswer.startsWith('OPTION ')) {
      normalizedAnswer = normalizedAnswer.replace('OPTION ', '').trim();
    }
    if (normalizedAnswer.startsWith('ANS: ')) {
      normalizedAnswer = normalizedAnswer.replace('ANS: ', '').trim();
    }
  } else if (typeof rawAns === 'number') {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    normalizedAnswer = letters[rawAns] || '';
  }

  if (!normalizedAnswer) {
    errors.push('Missing correct answer (e.g. "A", "B", "C", "D")');
  } else if (!Object.keys(optionsObj).includes(normalizedAnswer)) {
    errors.push(`Invalid correct answer "${normalizedAnswer}". Must be one of available options: ${Object.keys(optionsObj).join(', ')}`);
  }

  // Explanation
  const explanation = typeof raw?.explanation === 'string' ? raw.explanation.trim() : undefined;
  if (!explanation) {
    warnings.push('No explanation provided');
  }

  // Subject and Chapter
  const subjectName = (raw?.subject || defaultSubjectName || '').trim();
  const chapterName = (raw?.chapter || defaultChapterName || '').trim();

  if (!subjectName) {
    errors.push('Missing subject');
  }
  if (!chapterName) {
    errors.push('Missing chapter');
  }

  // Sources (Multiple support)
  let sources: QuestionSource[] = [];
  if (Array.isArray(raw?.sources) && raw.sources.length > 0) {
    sources = raw.sources
      .map((s: any) => ({
        type: typeof s?.type === 'string' ? s.type.trim() : 'Board',
        name: typeof s?.name === 'string' ? s.name.trim() : ''
      }))
      .filter((s: any) => s.name || s.type);
  } else if (raw?.sourceType || raw?.sourceName || raw?.source) {
    const type = typeof raw?.sourceType === 'string' ? raw.sourceType.trim() : 'Board';
    const name = typeof raw?.sourceName === 'string' ? raw.sourceName.trim() : (typeof raw?.source === 'string' ? raw.source.trim() : 'General');
    sources = [{ type, name }];
  } else {
    sources = [{ type: 'Board', name: 'General' }];
  }

  const isValid = errors.length === 0;

  return {
    index,
    questionText: questionText || `Question #${index + 1}`,
    isValid,
    errors,
    warnings,
    parsedQuestion: {
      question: questionText,
      options: optionsObj,
      correctAnswer: normalizedAnswer,
      explanation,
      sources,
      important: Boolean(raw?.important),
      veryImportant: Boolean(raw?.veryImportant),
      dontUnderstand: Boolean(raw?.dontUnderstand),
      subjectName,
      chapterName
    }
  };
}
