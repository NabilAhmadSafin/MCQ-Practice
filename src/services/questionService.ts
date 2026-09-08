import { db } from '../db';
import type { Question, QuestionFilter, Difficulty, SourceType, CorrectAnswer } from '../types';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function createQuestion(data: {
  subjectId: string;
  chapterId: string;
  question: string;
  options: Record<string, string>;
  correctAnswer: CorrectAnswer;
  explanation?: string;
  sourceType: SourceType;
  sourceName: string;
  important: boolean;
  veryImportant: boolean;
  dontUnderstand: boolean;
  difficulty: Difficulty;
  tags: string[];
}): Promise<Question> {
  const newQuestion: Question = {
    ...data,
    id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
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
  await db.questions.update(id, {
    ...changes,
    updatedAt: Date.now()
  });
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
  sourceType?: string;
  difficulty?: string;
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

  if (params.sourceType && params.sourceType !== 'ALL') {
    questions = questions.filter(q => q.sourceType === params.sourceType);
  }

  if (params.difficulty && params.difficulty !== 'ALL') {
    questions = questions.filter(q => q.difficulty === params.difficulty);
  }

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

  if (params.shuffle) {
    // Fisher-Yates shuffle
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
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
  } else if (filter.sourceType && filter.sourceType !== 'ALL') {
    collection = db.questions.where('sourceType').equals(filter.sourceType);
  } else if (filter.difficulty && filter.difficulty !== 'ALL') {
    collection = db.questions.where('difficulty').equals(filter.difficulty);
  } else if (filter.tag) {
    collection = db.questions.where('tags').equals(filter.tag);
  }

  // Filter in memory for compound conditions
  let filtered = await collection.filter(q => {
    if (filter.subjectId && !filter.chapterId && q.subjectId !== filter.subjectId) return false;
    if (filter.chapterId && !filter.subjectId && q.chapterId !== filter.chapterId) return false;
    if (filter.sourceType && filter.sourceType !== 'ALL' && q.sourceType !== filter.sourceType) return false;
    if (filter.sourceName && !q.sourceName.toLowerCase().includes(filter.sourceName.toLowerCase())) return false;
    if (filter.difficulty && filter.difficulty !== 'ALL' && q.difficulty !== filter.difficulty) return false;
    if (filter.important !== undefined && q.important !== filter.important) return false;
    if (filter.veryImportant !== undefined && q.veryImportant !== filter.veryImportant) return false;
    if (filter.dontUnderstand !== undefined && q.dontUnderstand !== filter.dontUnderstand) return false;
    if (filter.tag && !q.tags.includes(filter.tag)) return false;

    if (filter.searchQuery && filter.searchQuery.trim()) {
      const qLower = filter.searchQuery.toLowerCase().trim();
      const inQuestion = q.question.toLowerCase().includes(qLower);
      const inExplanation = q.explanation?.toLowerCase().includes(qLower) ?? false;
      const inSource = q.sourceName.toLowerCase().includes(qLower);
      const inOptions = Object.values(q.options).some(opt => opt.toLowerCase().includes(qLower));
      if (!inQuestion && !inExplanation && !inSource && !inOptions) return false;
    }

    return true;
  }).toArray();

  // If filter by attempt status
  if (filter.attemptStatus && filter.attemptStatus !== 'all') {
    const allAttempts = await db.attempts.toArray();
    const attemptsByQuestion = new Map<string, { total: number; wrong: number }>();
    for (const att of allAttempts) {
      const current = attemptsByQuestion.get(att.questionId) || { total: 0, wrong: 0 };
      current.total += 1;
      if (!att.isCorrect) current.wrong += 1;
      attemptsByQuestion.set(att.questionId, current);
    }

    if (filter.attemptStatus === 'attempted') {
      filtered = filtered.filter(q => attemptsByQuestion.has(q.id));
    } else if (filter.attemptStatus === 'unattempted') {
      filtered = filtered.filter(q => !attemptsByQuestion.has(q.id));
    } else if (filter.attemptStatus === 'wrong') {
      filtered = filtered.filter(q => {
        const stats = attemptsByQuestion.get(q.id);
        return stats && stats.wrong > 0;
      });
    }
  }

  // Sorting
  const sortBy = filter.sortBy || 'createdAtDesc';
  filtered.sort((a, b) => {
    if (sortBy === 'createdAtDesc') return b.createdAt - a.createdAt;
    if (sortBy === 'createdAtAsc') return a.createdAt - b.createdAt;
    if (sortBy === 'difficulty') {
      const weight = { Easy: 1, Medium: 2, Hard: 3 };
      return weight[a.difficulty] - weight[b.difficulty];
    }
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
      | 'set_difficulty'
      | 'set_subject_chapter'
      | 'set_source'
      | 'add_tag'
      | 'remove_tag';
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
        case 'set_difficulty':
          updates.difficulty = action.value as Difficulty;
          break;
        case 'set_subject_chapter':
          if (action.value?.subjectId) updates.subjectId = action.value.subjectId;
          if (action.value?.chapterId) updates.chapterId = action.value.chapterId;
          break;
        case 'set_source':
          if (action.value?.sourceType) updates.sourceType = action.value.sourceType;
          if (action.value?.sourceName !== undefined) updates.sourceName = action.value.sourceName;
          break;
        case 'add_tag':
          if (action.value && typeof action.value === 'string') {
            const tagToAdd = action.value.trim();
            if (tagToAdd && !q.tags.includes(tagToAdd)) {
              updates.tags = [...q.tags, tagToAdd];
            }
          }
          break;
        case 'remove_tag':
          if (action.value && typeof action.value === 'string') {
            updates.tags = q.tags.filter(t => t !== action.value);
          }
          break;
      }

      await db.questions.update(id, updates);
    }
  });

  return ids.length;
}

export async function getAllUniqueTags(): Promise<string[]> {
  const set = new Set<string>();
  await db.questions.each(q => {
    q.tags?.forEach(t => set.add(t));
  });
  return Array.from(set).sort();
}

export async function getAllUniqueSourceNames(): Promise<string[]> {
  const set = new Set<string>();
  await db.questions.each(q => {
    if (q.sourceName?.trim()) set.add(q.sourceName.trim());
  });
  return Array.from(set).sort();
}
