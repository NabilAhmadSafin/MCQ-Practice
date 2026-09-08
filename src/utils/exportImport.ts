import { db } from '../db';
import type { Question, Subject, Chapter, PracticeSession, Attempt } from '../types';

export async function exportAllDataAsJson(): Promise<string> {
  const subjects = await db.subjects.toArray();
  const chapters = await db.chapters.toArray();
  const questions = await db.questions.toArray();
  const attempts = await db.attempts.toArray();
  const sessions = await db.sessions.toArray();

  const exportPayload = {
    app: 'Fast MCQ Practice',
    version: '2.0',
    exportedAt: new Date().toISOString(),
    subjects,
    chapters,
    questions,
    attempts,
    sessions
  };

  return JSON.stringify(exportPayload, null, 2);
}

export async function exportQuestionsAsCsv(): Promise<string> {
  const questions = await db.questions.toArray();
  const subjects = await db.subjects.toArray();
  const chapters = await db.chapters.toArray();

  const subjMap = new Map(subjects.map(s => [s.id, s.name]));
  const chapMap = new Map(chapters.map(c => [c.id, c.name]));

  const escapeCsv = (str: string = '') => {
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const headers = [
    'ID',
    'Subject',
    'Chapter',
    'Question',
    'Option A',
    'Option B',
    'Option C',
    'Option D',
    'Correct Answer',
    'Explanation',
    'Sources',
    'Important',
    'Very Important',
    'Dont Understand'
  ];

  const rows = questions.map(q => {
    const sourcesStr = (q.sources || [])
      .map(s => `${s.type}: ${s.name}`)
      .join(' | ');

    return [
      escapeCsv(q.id),
      escapeCsv(subjMap.get(q.subjectId) || ''),
      escapeCsv(chapMap.get(q.chapterId) || ''),
      escapeCsv(q.question),
      escapeCsv(q.options['A'] || ''),
      escapeCsv(q.options['B'] || ''),
      escapeCsv(q.options['C'] || ''),
      escapeCsv(q.options['D'] || ''),
      escapeCsv(q.correctAnswer),
      escapeCsv(q.explanation || ''),
      escapeCsv(sourcesStr),
      escapeCsv(q.important ? 'TRUE' : 'FALSE'),
      escapeCsv(q.veryImportant ? 'TRUE' : 'FALSE'),
      escapeCsv(q.dontUnderstand ? 'TRUE' : 'FALSE')
    ];
  });

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function triggerDownload(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportQuestionsJSON(): Promise<void> {
  const json = await exportAllDataAsJson();
  triggerDownload(json, `mcq-questions-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
}

export async function exportQuestionsCSV(): Promise<void> {
  const csv = await exportQuestionsAsCsv();
  triggerDownload(csv, `mcq-questions-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
}

export async function exportHistoryJSON(): Promise<void> {
  const sessions = await db.sessions.toArray();
  const attempts = await db.attempts.toArray();
  const payload = {
    exportedAt: new Date().toISOString(),
    sessions,
    attempts
  };
  triggerDownload(
    JSON.stringify(payload, null, 2),
    `mcq-practice-history-${new Date().toISOString().slice(0, 10)}.json`,
    'application/json'
  );
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

  const subjects: Subject[] = parsed.subjects || [];
  const chapters: Chapter[] = parsed.chapters || [];
  const questions: Question[] = parsed.questions || [];

  if (!Array.isArray(questions)) {
    throw new Error('JSON backup must contain a "questions" array');
  }

  await db.transaction('rw', [db.subjects, db.chapters, db.questions], async () => {
    if (subjects.length > 0) {
      for (const s of subjects) {
        await db.subjects.put(s);
      }
    }
    if (chapters.length > 0) {
      for (const c of chapters) {
        await db.chapters.put(c);
      }
    }
    if (questions.length > 0) {
      for (const q of questions) {
        // Ensure sources exist and remove legacy tags/difficulty
        if (!q.sources || !Array.isArray(q.sources)) {
          q.sources = [];
          if ((q as any).sourceType || (q as any).sourceName) {
            q.sources.push({ type: (q as any).sourceType || 'Board', name: (q as any).sourceName || '' });
          }
        }
        delete (q as any).difficulty;
        delete (q as any).tags;
        await db.questions.put(q);
      }
    }
  });

  return {
    subjectsCount: subjects.length,
    chaptersCount: chapters.length,
    questionsCount: questions.length
  };
}

export async function resetEntireDatabase(): Promise<void> {
  await db.transaction('rw', [db.subjects, db.chapters, db.questions, db.attempts, db.sessions], async () => {
    await db.subjects.clear();
    await db.chapters.clear();
    await db.questions.clear();
    await db.attempts.clear();
    await db.sessions.clear();
  });
}
