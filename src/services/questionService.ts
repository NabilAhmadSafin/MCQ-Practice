import { apiFetch } from './apiClient';
import type {
  Question,
  QuestionFilter,
  QuestionSource,
  CorrectAnswer,
  QuestionType,
  QuestionImage,
  ContentBlock
} from '../types';

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
      const entryNo =
        isGuide && s.entryNo !== undefined && s.entryNo !== null && String(s.entryNo).trim() !== ''
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

  const anyGuide = question.sources.find(
    s => s.type?.toLowerCase() === 'guide' && s.entryNo !== undefined && s.entryNo !== null && String(s.entryNo).trim() !== ''
  );
  return anyGuide?.entryNo ? String(anyGuide.entryNo).trim() : undefined;
}

export function compareQuestionsByEntryNo(
  a: Question,
  b: Question,
  guideName?: string,
  direction: 'asc' | 'desc' = 'asc'
): number {
  const entryA = getGuideEntryNo(a, guideName);
  const entryB = getGuideEntryNo(b, guideName);

  if (!entryA && !entryB) return b.createdAt - a.createdAt;
  if (!entryA) return 1;
  if (!entryB) return -1;

  const cmp = entryA.localeCompare(entryB, undefined, { numeric: true, sensitivity: 'base' });
  if (cmp !== 0) return direction === 'desc' ? -cmp : cmp;

  return b.createdAt - a.createdAt;
}

export async function getQuestionCount(): Promise<number> {
  const res = await apiFetch<{ count: number }>('/api/questions/count');
  return res.count;
}

export async function checkDuplicateQuestions(texts: string[]): Promise<Set<string>> {
  const res = await apiFetch<{ duplicates: string[] }>('/api/questions/check-duplicates', {
    method: 'POST',
    body: JSON.stringify({ texts })
  });
  return new Set(res.duplicates || []);
}

export async function bulkPutQuestions(questions: Question[]): Promise<number> {
  const res = await apiFetch<{ inserted: number }>('/api/questions/bulk-put', {
    method: 'POST',
    body: JSON.stringify({ questions })
  });
  return res.inserted;
}

export async function createQuestion(data: {
  subjectId: string;
  chapterId: string;
  questionType?: QuestionType;
  question: string;
  images?: QuestionImage[];
  contentBlocks?: ContentBlock[];
  statements?: string[];
  statementImages?: Record<number, QuestionImage[]>;
  commonInfoId?: string;
  options: Record<string, string>;
  optionImages?: Record<string, QuestionImage>;
  correctAnswer: CorrectAnswer;
  explanation?: string;
  explanationImages?: QuestionImage[];
  explanationBlocks?: ContentBlock[];
  sources: QuestionSource[];
  important: boolean;
  veryImportant: boolean;
  dontUnderstand: boolean;
}): Promise<Question> {
  return apiFetch<Question>('/api/questions', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateQuestion(
  id: string,
  changes: Partial<Omit<Question, 'id' | 'createdAt'>>
): Promise<void> {
  await apiFetch(`/api/questions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(changes)
  });
}

export async function deleteQuestion(id: string): Promise<void> {
  await apiFetch(`/api/questions/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

export async function deleteQuestions(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const res = await apiFetch<{ deleted: number }>('/api/questions/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids })
  });
  return res.deleted;
}

export async function toggleQuestionFlag(
  id: string,
  flag: 'important' | 'veryImportant' | 'dontUnderstand'
): Promise<boolean> {
  const res = await apiFetch<{ value: boolean }>(
    `/api/questions/${encodeURIComponent(id)}/toggle-flag`,
    {
      method: 'POST',
      body: JSON.stringify({ flag })
    }
  );
  return res.value;
}

export async function getPracticeQuestions(params: {
  subjectId?: string;
  chapterId?: string;
  questionTypes?: QuestionType[];
  sourceTypes?: string[];
  guides?: string[];
  set?: 'all' | 'unattempted' | 'wrong' | 'important' | 'veryImportant' | 'dontUnderstand';
  count?: number;
  shuffle?: boolean;
}): Promise<Question[]> {
  return apiFetch<Question[]>('/api/questions/practice', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

export async function getQuestionById(id: string): Promise<Question | undefined> {
  try {
    return await apiFetch<Question>(`/api/questions/${encodeURIComponent(id)}`);
  } catch {
    return undefined;
  }
}

export async function getQuestionsPaginated(
  filter: QuestionFilter,
  page: number = 1,
  pageSize: number = 25
): Promise<PaginatedResult<Question>> {
  return apiFetch<PaginatedResult<Question>>('/api/questions/query', {
    method: 'POST',
    body: JSON.stringify({ filter, page, pageSize })
  });
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
  const res = await apiFetch<{ updated: number }>('/api/questions/bulk-update', {
    method: 'POST',
    body: JSON.stringify({ ids, action })
  });
  return res.updated;
}

export async function getAllUniqueSourceNames(): Promise<string[]> {
  return apiFetch<string[]>('/api/questions/sources');
}
