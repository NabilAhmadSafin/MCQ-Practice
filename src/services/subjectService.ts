import { apiFetch } from './apiClient';
import type { Subject, Chapter } from '../types';

export async function getAllSubjects(): Promise<Subject[]> {
  return apiFetch<Subject[]>('/api/subjects');
}

export async function getSubjectById(id: string): Promise<Subject | undefined> {
  try {
    return await apiFetch<Subject>(`/api/subjects/${encodeURIComponent(id)}`);
  } catch {
    return undefined;
  }
}

export async function createSubject(name: string): Promise<Subject> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Subject name cannot be empty');
  return apiFetch<Subject>('/api/subjects', {
    method: 'POST',
    body: JSON.stringify({ name: trimmed })
  });
}

export async function updateSubject(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Subject name cannot be empty');
  await apiFetch(`/api/subjects/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: trimmed })
  });
}

export async function deleteSubject(
  id: string
): Promise<{ deletedQuestions: number; deletedChapters: number }> {
  return apiFetch<{ deletedQuestions: number; deletedChapters: number }>(
    `/api/subjects/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  );
}

export async function getChaptersBySubject(subjectId: string): Promise<Chapter[]> {
  return apiFetch<Chapter[]>(`/api/chapters?subjectId=${encodeURIComponent(subjectId)}`);
}

export async function getAllChapters(): Promise<Chapter[]> {
  return apiFetch<Chapter[]>('/api/chapters');
}

export async function getChapterById(id: string): Promise<Chapter | undefined> {
  try {
    return await apiFetch<Chapter>(`/api/chapters/${encodeURIComponent(id)}`);
  } catch {
    return undefined;
  }
}

export async function createChapter(subjectId: string, name: string): Promise<Chapter> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Chapter name cannot be empty');
  return apiFetch<Chapter>('/api/chapters', {
    method: 'POST',
    body: JSON.stringify({ subjectId, name: trimmed })
  });
}

export async function updateChapter(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Chapter name cannot be empty');
  await apiFetch(`/api/chapters/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: trimmed })
  });
}

export async function reorderChapters(_subjectId: string, chapterIdsInOrder: string[]): Promise<void> {
  await apiFetch('/api/chapters/reorder', {
    method: 'PUT',
    body: JSON.stringify({ chapterIdsInOrder })
  });
}

export async function deleteChapter(id: string): Promise<{ deletedQuestions: number }> {
  return apiFetch<{ deletedQuestions: number }>(
    `/api/chapters/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  );
}

export async function getQuestionCountsBySubject(): Promise<Record<string, number>> {
  return apiFetch<Record<string, number>>('/api/subjects/counts');
}

export async function getQuestionCountsByChapter(): Promise<Record<string, number>> {
  return apiFetch<Record<string, number>>('/api/chapters/counts');
}
