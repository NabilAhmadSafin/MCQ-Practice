import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Upload, 
  Trash2, 
  FileJson, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle,
  Database
} from 'lucide-react';
import { 
  exportQuestionsJSON, 
  exportQuestionsCSV, 
  exportHistoryJSON, 
  importQuestionsJSON, 
  resetEntireDatabase 
} from '../utils/exportImport';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { db } from '../db';
import type { NavSection } from '../components/layout/Sidebar';

interface ExportDataPageProps {
  onNavigate: (section: NavSection, params?: any) => void;
}

export const ExportDataPage: React.FC<ExportDataPageProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState({ questions: 0, subjects: 0, chapters: 0, sessions: 0 });
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadCounts = async () => {
    const [qCount, sCount, cCount, sessCount] = await Promise.all([
      db.questions.count(),
      db.subjects.count(),
      db.chapters.count(),
      db.sessions.count()
    ]);
    setStats({
      questions: qCount,
      subjects: sCount,
      chapters: cCount,
      sessions: sessCount
    });
  };

  useEffect(() => {
    loadCounts();
  }, []);

  const handleJSONFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setIsProcessing(true);
    setImportStatus(null);

    try {
      const text = await file.text();
      const count = await importQuestionsJSON(text);
      setImportStatus(`Successfully restored ${count} questions and curriculum structures!`);
      await loadCounts();
    } catch (err: any) {
      setImportStatus(`Import failed: ${err.message || String(err)}`);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleResetConfirm = async () => {
    await resetEntireDatabase();
    setIsResetModalOpen(false);
    setImportStatus('Database successfully reset to a clean state.');
    await loadCounts();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Data Export & Backup
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          Safeguard your questions and practice stats with full offline backups.
        </p>
      </div>

      {importStatus && (
        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs sm:text-sm text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* Database Snapshot Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-500">Stored Questions</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{stats.questions}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-500">Subjects</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{stats.subjects}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-500">Chapters</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{stats.chapters}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-500">Practice Logs</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{stats.sessions}</div>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 sm:p-6 space-y-4 shadow-xs">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Download className="w-4 h-4 text-indigo-600" />
          <span>Export Options</span>
        </h2>
        <p className="text-xs text-zinc-500">
          Download your complete question bank or test history. All downloads are generated locally in your browser.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            onClick={exportQuestionsJSON}
            className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 text-left transition-colors group"
          >
            <FileJson className="w-6 h-6 text-indigo-600 mb-2 group-hover:scale-105 transition-transform" />
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Questions (JSON)</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">Full schema backup with options & flags</div>
          </button>

          <button
            type="button"
            onClick={exportQuestionsCSV}
            className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 text-left transition-colors group"
          >
            <FileSpreadsheet className="w-6 h-6 text-emerald-600 mb-2 group-hover:scale-105 transition-transform" />
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Questions (CSV)</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">Compatible with Excel, Sheets & Calc</div>
          </button>

          <button
            type="button"
            onClick={exportHistoryJSON}
            className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-purple-500 text-left transition-colors group"
          >
            <Database className="w-6 h-6 text-purple-600 mb-2 group-hover:scale-105 transition-transform" />
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Practice History (JSON)</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">All sessions, scores, and timestamps</div>
          </button>
        </div>
      </div>

      {/* Restore from JSON */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 sm:p-6 space-y-4 shadow-xs">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Upload className="w-4 h-4 text-indigo-600" />
          <span>Restore from Backup</span>
        </h2>
        <p className="text-xs text-zinc-500">
          Restore questions and subjects from a previously exported JSON backup file.
        </p>

        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs transition-colors">
          <Upload className="w-4 h-4" />
          <span>Select JSON Backup File</span>
          <input
            type="file"
            accept=".json"
            onChange={handleJSONFileImport}
            disabled={isProcessing}
            className="hidden"
          />
        </label>
      </div>

      {/* Danger Zone: Reset Database */}
      <div className="bg-red-50/40 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Danger Zone: Reset Database</span>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Permanently deletes all questions, chapters, subjects, and test records from your local storage.
        </p>
        <button
          type="button"
          onClick={() => setIsResetModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Reset Question Bank</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isResetModalOpen}
        title="Reset Entire Question Bank"
        message="Are you sure you want to reset the question bank?\n\nThis will permanently erase all questions, subjects, chapters, attempts, and history.\n\nMake sure you have exported a JSON backup first if you want to keep your data."
        confirmText="Yes, Permanently Reset Everything"
        onConfirm={handleResetConfirm}
        onCancel={() => setIsResetModalOpen(false)}
      />
    </div>
  );
};
