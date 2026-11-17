import { apiFetch } from '../services/apiClient';
import { db } from '../db';

export interface DatabaseStatus {
  engine: string;
  dbPath: string;
  mediaDir: string;
  dbSizeBytes: number;
  mediaSizeBytes: number;
  mediaCount: number;
  counts: {
    subjects: number;
    chapters: number;
    questions: number;
    sessions: number;
    attempts: number;
  };
}

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  return apiFetch<DatabaseStatus>('/api/db/status');
}

export async function exportQuestionsJSON(): Promise<void> {
  window.location.assign('/api/export/json');
}

export async function exportQuestionsCSV(): Promise<void> {
  window.location.assign('/api/export/csv');
}

export async function exportHistoryJSON(): Promise<void> {
  window.location.assign('/api/export/history');
}

export async function importQuestionsJSON(jsonString: string): Promise<number> {
  const res = await importDataFromJson(jsonString);
  return res.questionsCount;
}

export async function importDataFromJson(jsonString: string): Promise<{
  subjectsCount: number;
  chaptersCount: number;
  questionsCount: number;
}> {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e: any) {
    throw new Error('Invalid JSON format: ' + e.message);
  }

  return apiFetch('/api/import/json', {
    method: 'POST',
    body: JSON.stringify(parsed)
  });
}

export async function resetEntireDatabase(): Promise<void> {
  await apiFetch('/api/db/reset', { method: 'POST' });
}

export async function getLegacyIndexedDbCounts(): Promise<{
  hasData: boolean;
  questions: number;
  subjects: number;
  mediaFiles: number;
}> {
  try {
    if (typeof indexedDB === 'undefined') {
      return { hasData: false, questions: 0, subjects: 0, mediaFiles: 0 };
    }
    if (typeof indexedDB.databases === 'function') {
      const dbs = await indexedDB.databases();
      const exists = dbs.some(d => d.name === 'MCQPracticeDB');
      if (!exists) {
        return { hasData: false, questions: 0, subjects: 0, mediaFiles: 0 };
      }
    }
    const [questions, subjects, mediaFiles] = await Promise.all([
      db.questions.count(),
      db.subjects.count(),
      db.mediaFiles.count()
    ]);
    return {
      hasData: questions > 0 || subjects > 0 || mediaFiles > 0,
      questions,
      subjects,
      mediaFiles
    };
  } catch {
    return { hasData: false, questions: 0, subjects: 0, mediaFiles: 0 };
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read media blob'));
    reader.onload = () => {
      const res = String(reader.result || '');
      const idx = res.indexOf(',');
      resolve(idx >= 0 ? res.slice(idx + 1) : res);
    };
    reader.readAsDataURL(blob);
  });
}

export async function migrateLegacyIndexedDbToSqlite(): Promise<{
  subjectsCount: number;
  chaptersCount: number;
  questionsCount: number;
  mediaCount: number;
}> {
  const [subjects, chapters, commonInformation, questions, attempts, sessions, rawMedia] =
    await Promise.all([
      db.subjects.toArray(),
      db.chapters.toArray(),
      db.commonInformation.toArray(),
      db.questions.toArray(),
      db.attempts.toArray(),
      db.sessions.toArray(),
      db.mediaFiles.toArray()
    ]);

  const mediaFiles = await Promise.all(
    rawMedia.map(async m => ({
      id: m.id,
      name: m.name,
      mimeType: m.mimeType,
      size: m.size,
      createdAt: m.createdAt,
      base64: await blobToBase64(m.data)
    }))
  );

  return apiFetch('/api/import/json', {
    method: 'POST',
    body: JSON.stringify({
      subjects,
      chapters,
      commonInformation,
      questions,
      attempts,
      sessions,
      mediaFiles
    })
  });
}
