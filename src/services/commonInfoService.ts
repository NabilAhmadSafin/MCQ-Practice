import { apiFetch } from './apiClient';
import type { CommonInformation, Question, QuestionImage, ContentBlock } from '../types';

export async function getCommonInfoById(id: string): Promise<CommonInformation | undefined> {
  try {
    return await apiFetch<CommonInformation>(`/api/common-info/${encodeURIComponent(id)}`);
  } catch {
    return undefined;
  }
}

export async function getAllCommonInfo(): Promise<CommonInformation[]> {
  return apiFetch<CommonInformation[]>('/api/common-info');
}

export async function findCommonInfoByContent(content: string): Promise<CommonInformation | null> {
  return apiFetch<CommonInformation | null>('/api/common-info/find-by-content', {
    method: 'POST',
    body: JSON.stringify({ content })
  });
}

export async function createCommonInfo(data: {
  title: string;
  content: string;
  images?: QuestionImage[];
  contentBlocks?: ContentBlock[];
  subjectId: string;
  chapterId: string;
}): Promise<CommonInformation> {
  return apiFetch<CommonInformation>('/api/common-info', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateCommonInfo(
  id: string,
  data: Partial<Omit<CommonInformation, 'id' | 'createdAt'>>
): Promise<void> {
  await apiFetch(`/api/common-info/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteCommonInfo(id: string, deleteLinkedQuestions: boolean = false): Promise<void> {
  await apiFetch(
    `/api/common-info/${encodeURIComponent(id)}?deleteLinkedQuestions=${deleteLinkedQuestions ? 'true' : 'false'}`,
    { method: 'DELETE' }
  );
}

export async function getQuestionsForCommonInfo(commonInfoId: string): Promise<Question[]> {
  return apiFetch<Question[]>(`/api/common-info/${encodeURIComponent(commonInfoId)}/questions`);
}

export async function getCommonInfoWithQuestions(id: string): Promise<{
  commonInfo: CommonInformation;
  questions: Question[];
} | null> {
  return apiFetch<{ commonInfo: CommonInformation; questions: Question[] } | null>(
    `/api/common-info/${encodeURIComponent(id)}/with-questions`
  );
}
