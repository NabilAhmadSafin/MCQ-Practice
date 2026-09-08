import { db } from '../db';
import type { Question, QuestionFilter, QuestionSource, CorrectAnswer } from '../types';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function normalizeQuestionSources(sources: QuestionSource[]): {
  sources: QuestionSource[];
  sourceTypes: string[];
  guides: string[];
} {
  const cleanSources: QuestionSource[] = sources
    .filter(s => s && (s.name?.trim() || s.type))
    .map(s => {
      const type = (s.type || 'Board').trim();
      const name = (s.name || '').trim();
      const isGuide = type.toLowerCase() === 'guide';
      const entryNo = isGuide && s.entryNo !== undefined && s.entryNo !== null && String(s.entryNo).trim() !== ''
        ? String(s.entryNo).trim()
        : undefined;

      return {
        type,
        name,
        ...(entryNo ? { entryNo } : {})
      };
    });
  const sourceTypes = Array.from(new Set(cleanSources.map(s => s.type).filter(Boolean)));
  const guides = Array.from(
    new Set(
      cleanSources
        .filter(s => s.type?.toLowerCase() === 'guide' && s.name?.trim())
        .map(s => s.name.trim())
    )
  );

  return {
    sources: cleanSources,
    sourceTypes,
    guides
  };
}

/**
 * Extract entry number for a specific guide from a question's sources.
 */
export function getGuideEntryNo(question: Question, guideName?: string): string | undefined {
  if (!question.sources || question.sources.length === 0) return undefined;

  if (guideName && guideName.trim()) {
    const target = guideName.toLowerCase().trim();
    const match = question.sources.find(
      s => s.type?.toLowerCase() === 'guide' && s.name?.toLowerCase().trim() === target
    );
    if (match?.entryNo !== undefined && match?.entryNo !== null && String(match.entryNo).trim() !== '') {
      return String(match.entryNo).trim();
    }
  }

  // Fallback: search for any guide source that has an entryNo
  const anyGuide = question.sources.find(
    s => s.type?.toLowerCase() === 'guide' && s.entryNo !== undefined && s.entryNo !== null && String(s.entryNo).trim() !== ''
  );
  return anyGuide?.entryNo ? String(anyGuide.entryNo).trim() : undefined;
}

/**
 * Compare two questions by entry number using natural sorting (e.g. 1, 2, 10, 100).
 * Questions without an entry number are sorted to the end.
 */
export function compareQuestionsByEntryNo(
  a: Question,
  b: Question,
  guideName?: string,
  direction: 'asc' | 'desc' = 'asc'
): number {
  const entryA = getGuideEntryNo(a, guideName);
  const entryB = getGuideEntryNo(b, guideName);

  // If neither has entryNo, maintain stable ordering (createdAt descending)
  if (!entryA && !entryB) {
    return b.createdAt - a.createdAt;
  }
  // Questions without entry number always go to the end
  if (!entryA) return 1;
  if (!entryB) return -1;

  // Natural numeric sort
  const cmp = entryA.localeCompare(entryB, undefined, { numeric: true, sensitivity: 'base' });
  if (cmp !== 0) {
    return direction === 'desc' ? -cmp : cmp;
  }

  return b.createdAt - a.createdAt;
}

export async function createQuestion(data: {
  subjectId: string;
  chapterId: string;
  question: string;
  options: Record<string, string>;
  correctAnswer: CorrectAnswer;
  explanation?: string;
  sources: QuestionSource[];
  important: boolean;
  veryImportant: boolean;
  dontUnderstand: boolean;
}): Promise<Question> {
  const { sources, sourceTypes, guides } = normalizeQuestionSources(data.sources || []);

  const newQuestion: Question = {
    id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
    subjectId: data.subjectId,
    chapterId: data.chapterId,
    question: data.question,
    options: data.options,
    correctAnswer: data.correctAnswer,
    explanation: data.explanation,
    sources,
    sourceTypes,
    guides,
    important: data.important,
    veryImportant: data.veryImportant,
    dontUnderstand: data.dontUnderstand,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await db.questions.add(newQuestion);
  return newQuestion;
}

export async function updateQuestion(
  id: string,
  changes: Partial<Omit<Question, 'id' | 'createdAt'>>
): Promise<void> {
  const updates: Partial<Question> = {
    ...changes,
    updatedAt: Date.now()
  };

  if (changes.sources) {
    const norm = normalizeQuestionSources(changes.sources);
    updates.sources = norm.sources;
    updates.sourceTypes = norm.sourceTypes;
    updates.guides = norm.guides;
  }

  await db.questions.update(id, updates);
}

export async function deleteQuestion(id: string): Promise<void> {
  await db.transaction('rw', [db.questions, db.attempts], async () => {
    await db.attempts.where('questionId').equals(id).delete();
    await db.questions.delete(id);
  });
}

export async function deleteQuestions(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  await db.transaction('rw', [db.questions, db.attempts], async () => {
    await db.attempts.where('questionId').anyOf(ids).delete();
    await db.questions.where('id').anyOf(ids).delete();
  });
  return ids.length;
}

export async function toggleQuestionFlag(
  id: string,
  flag: 'important' | 'veryImportant' | 'dontUnderstand'
): Promise<boolean> {
  const q = await db.questions.get(id);
  if (!q) throw new Error('Question not found');
  const nextVal = !q[flag];
  const updatePayload: Partial<Question> = { updatedAt: Date.now() };
  updatePayload[flag] = nextVal;
  await db.questions.update(id, updatePayload);
  return nextVal;
}

export async function getPracticeQuestions(params: {
  subjectId?: string;
  chapterId?: string;
  sourceTypes?: string[];
  guides?: string[];
  set?: 'all' | 'unattempted' | 'wrong' | 'important' | 'veryImportant' | 'dontUnderstand';
  count?: number;
  shuffle?: boolean;
}): Promise<Question[]> {
  let collection = db.questions.toCollection();

  if (params.subjectId && params.chapterId) {
    collection = db.questions.where('[subjectId+chapterId]').equals([params.subjectId, params.chapterId]);
  } else if (params.subjectId) {
    collection = db.questions.where('subjectId').equals(params.subjectId);
  } else if (params.chapterId) {
    collection = db.questions.where('chapterId').equals(params.chapterId);
  }

  let questions = await collection.toArray();

  // Multi-sourceType filtering
  if (params.sourceTypes && params.sourceTypes.length > 0) {
    const selectedTypes = new Set(params.sourceTypes.map(t => t.toLowerCase()));
    questions = questions.filter(q =>
      (q.sources || []).some(s => selectedTypes.has(s.type?.toLowerCase()))
    );
  }

  // Multi-guide filtering
  if (params.guides && params.guides.length > 0) {
    const selectedGuides = new Set(params.guides.map(g => g.toLowerCase()));
    questions = questions.filter(q =>
      (q.sources || []).some(
        s => s.type?.toLowerCase() === 'guide' && selectedGuides.has(s.name?.toLowerCase().trim())
      )
    );
  }

  // Question subset
  if (params.set === 'important') {
    questions = questions.filter(q => q.important);
  } else if (params.set === 'veryImportant') {
    questions = questions.filter(q => q.veryImportant);
  } else if (params.set === 'dontUnderstand') {
    questions = questions.filter(q => q.dontUnderstand);
  } else if (params.set === 'wrong' || params.set === 'unattempted') {
    const allAttempts = await db.attempts.toArray();
    const attemptsMap = new Map<string, { correct: number; wrong: number }>();
    for (const a of allAttempts) {
      const cur = attemptsMap.get(a.questionId) || { correct: 0, wrong: 0 };
      if (a.isCorrect) cur.correct++;
      else cur.wrong++;
      attemptsMap.set(a.questionId, cur);
    }

    if (params.set === 'wrong') {
      questions = questions.filter(q => {
        const att = attemptsMap.get(q.id);
        return att && att.wrong > 0;
      });
    } else if (params.set === 'unattempted') {
      questions = questions.filter(q => !attemptsMap.has(q.id));
    }
  }

  // If a specific guide is selected and shuffle is not enabled, sort by entry number
  const hasSpecificGuide = params.guides && params.guides.length === 1;
  const specificGuide = hasSpecificGuide ? params.guides![0] : undefined;

  if (params.shuffle) {
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
  } else if (hasSpecificGuide) {
    questions.sort((a, b) => compareQuestionsByEntryNo(a, b, specificGuide, 'asc'));
  }

  const limit = params.count && params.count > 0 ? params.count : 20;
  return questions.slice(0, limit);
}

export async function getQuestionById(id: string): Promise<Question | undefined> {
  return await db.questions.get(id);
}

export async function getQuestionsPaginated(
  filter: QuestionFilter,
  page: number = 1,
  pageSize: number = 25
): Promise<PaginatedResult<Question>> {
  let collection = db.questions.toCollection();

  // Apply primary index if available
  if (filter.subjectId && filter.chapterId) {
    collection = db.questions.where('[subjectId+chapterId]').equals([filter.subjectId, filter.chapterId]);
  } else if (filter.subjectId) {
    collection = db.questions.where('subjectId').equals(filter.subjectId);
  } else if (filter.chapterId) {
    collection = db.questions.where('chapterId').equals(filter.chapterId);
  }

  // Filter in memory for compound conditions and multiple selections
  let filtered = await collection.filter(q => {
    if (filter.subjectId && !filter.chapterId && q.subjectId !== filter.subjectId) return false;
    if (filter.chapterId && !filter.subjectId && q.chapterId !== filter.chapterId) return false;

    // Multi-sourceType filtering (e.g. ['Board', 'School'])
    const activeSourceTypes = filter.sourceTypes || (filter.sourceType && filter.sourceType !== 'ALL' ? [filter.sourceType] : []);
    if (activeSourceTypes.length > 0) {
      const selectedTypes = new Set(activeSourceTypes.map(t => t.toLowerCase()));
      const hasMatchingType = (q.sources || []).some(s => selectedTypes.has(s.type?.toLowerCase()))
        || (q.sourceType && selectedTypes.has(q.sourceType.toLowerCase()));
      if (!hasMatchingType) return false;
    }

    // Multi-guide filtering (e.g. ['Panjaree', 'Lecture', 'Royal', 'Chorcha', 'eProshnobank'])
    if (filter.guides && filter.guides.length > 0) {
      const selectedGuides = new Set(filter.guides.map(g => g.toLowerCase().trim()));
      const hasMatchingGuide = (q.sources || []).some(
        s => s.type?.toLowerCase() === 'guide' && selectedGuides.has(s.name?.toLowerCase().trim())
      ) || (q.guides && q.guides.some(g => selectedGuides.has(g.toLowerCase().trim())));
      if (!hasMatchingGuide) return false;
    }

    // Source name search
    if (filter.sourceName && filter.sourceName.trim()) {
      const term = filter.sourceName.toLowerCase().trim();
      const hasTerm = (q.sources || []).some(s => s.name?.toLowerCase().includes(term))
        || (q.sourceName && q.sourceName.toLowerCase().includes(term));
      if (!hasTerm) return false;
    }

    // Flags (multi-select)
    if (filter.flags && filter.flags.length > 0) {
      const matchesAnyFlag = filter.flags.some(f => Boolean(q[f]));
      if (!matchesAnyFlag) return false;
    } else {
      if (filter.important !== undefined && q.important !== filter.important) return false;
      if (filter.veryImportant !== undefined && q.veryImportant !== filter.veryImportant) return false;
      if (filter.dontUnderstand !== undefined && q.dontUnderstand !== filter.dontUnderstand) return false;
    }

    // Text search query
    if (filter.searchQuery && filter.searchQuery.trim()) {
      const qLower = filter.searchQuery.toLowerCase().trim();
      const inQuestion = q.question.toLowerCase().includes(qLower);
      const inExplanation = q.explanation?.toLowerCase().includes(qLower) ?? false;
      const inSources = (q.sources || []).some(s => s.name?.toLowerCase().includes(qLower) || s.type?.toLowerCase().includes(qLower));
      const inOptions = Object.values(q.options || {}).some(opt => opt.toLowerCase().includes(qLower));
      if (!inQuestion && !inExplanation && !inSources && !inOptions) return false;
    }

    return true;
  }).toArray();

  // If filter by attempt status
  const activeAttemptStatuses = filter.attemptStatuses || (filter.attemptStatus && filter.attemptStatus !== 'all' ? [filter.attemptStatus as any] : []);
  if (activeAttemptStatuses.length > 0) {
    const allAttempts = await db.attempts.toArray();
    const attemptsByQuestion = new Map<string, { total: number; wrong: number }>();
    for (const att of allAttempts) {
      const current = attemptsByQuestion.get(att.questionId) || { total: 0, wrong: 0 };
      current.total += 1;
      if (!att.isCorrect) current.wrong += 1;
      attemptsByQuestion.set(att.questionId, current);
    }

    filtered = filtered.filter(q => {
      const stats = attemptsByQuestion.get(q.id);
      const isAttempted = Boolean(stats && stats.total > 0);
      const isUnattempted = !isAttempted;
      const isWrong = Boolean(stats && stats.wrong > 0);

      return activeAttemptStatuses.some(status => {
        if (status === 'attempted') return isAttempted;
        if (status === 'unattempted') return isUnattempted;
        if (status === 'wrong') return isWrong;
        return true;
      });
    });
  }

  // Sorting
  const hasSpecificGuide = filter.guides && filter.guides.length === 1;
  const specificGuide = hasSpecificGuide ? filter.guides![0] : undefined;

  let sortBy = filter.sortBy;
  if (!sortBy) {
    sortBy = hasSpecificGuide ? 'entryNoAsc' : 'createdAtDesc';
  }

  filtered.sort((a, b) => {
    if (sortBy === 'entryNoAsc') {
      return compareQuestionsByEntryNo(a, b, specificGuide, 'asc');
    }
    if (sortBy === 'entryNoDesc') {
      return compareQuestionsByEntryNo(a, b, specificGuide, 'desc');
    }
    if (sortBy === 'createdAtDesc') return b.createdAt - a.createdAt;
    if (sortBy === 'createdAtAsc') return a.createdAt - b.createdAt;
    if (sortBy === 'question') return a.question.localeCompare(b.question);
    return 0;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const validPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (validPage - 1) * pageSize;
  const items = filtered.slice(startIndex, startIndex + pageSize);

  return {
    items,
    total,
    page: validPage,
    pageSize,
    totalPages
  };
}

export async function bulkUpdateQuestions(
  ids: string[],
  action: {
    type: 
      | 'set_important'
      | 'unset_important'
      | 'set_veryImportant'
      | 'unset_veryImportant'
      | 'set_dontUnderstand'
      | 'unset_dontUnderstand'
      | 'set_subject_chapter'
      | 'add_source';
    value?: any;
  }
): Promise<number> {
  if (ids.length === 0) return 0;

  await db.transaction('rw', db.questions, async () => {
    for (const id of ids) {
      const q = await db.questions.get(id);
      if (!q) continue;

      const updates: Partial<Question> = { updatedAt: Date.now() };

      switch (action.type) {
        case 'set_important':
          updates.important = true;
          break;
        case 'unset_important':
          updates.important = false;
          break;
        case 'set_veryImportant':
          updates.veryImportant = true;
          break;
        case 'unset_veryImportant':
          updates.veryImportant = false;
          break;
        case 'set_dontUnderstand':
          updates.dontUnderstand = true;
          break;
        case 'unset_dontUnderstand':
          updates.dontUnderstand = false;
          break;
        case 'set_subject_chapter':
          if (action.value?.subjectId) updates.subjectId = action.value.subjectId;
          if (action.value?.chapterId) updates.chapterId = action.value.chapterId;
          break;
        case 'add_source':
          if (action.value && action.value.type && action.value.name) {
            const currentSources = q.sources || [];
            const newSources = [...currentSources, { type: action.value.type, name: action.value.name }];
            const norm = normalizeQuestionSources(newSources);
            updates.sources = norm.sources;
            updates.sourceTypes = norm.sourceTypes;
            updates.guides = norm.guides;
          }
          break;
      }

      await db.questions.update(id, updates);
    }
  });

  return ids.length;
}

export async function getAllUniqueSourceNames(): Promise<string[]> {
  const set = new Set<string>();
  await db.questions.each(q => {
    (q.sources || []).forEach(s => {
      if (s.name?.trim()) set.add(s.name.trim());
    });
  });
  return Array.from(set).sort();
}
