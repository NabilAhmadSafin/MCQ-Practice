import React, { useState, useEffect } from 'react';
import {
  Trash2,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  ArrowRightLeft,
  Eraser
} from 'lucide-react';
import {
  clearQuestionAdditionalData,
  resetEntireDatabase,
  getDatabaseStatus,
  getLegacyIndexedDbCounts,
  migrateLegacyIndexedDbToSqlite,
  type DatabaseStatus
} from '../utils/exportImport';
import { ConfirmModal } from '../components/common/ConfirmModal';
import type { NavSection } from '../components/layout/Sidebar';

interface ExportDataPageProps {
  onNavigate: (section: NavSection, params?: any) => void;
  onDataChanged?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export const ExportDataPage: React.FC<ExportDataPageProps> = ({ onDataChanged }) => {
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [legacyCounts, setLegacyCounts] = useState<{
    hasData: boolean;
    questions: number;
    subjects: number;
    mediaFiles: number;
  }>({ hasData: false, questions: 0, subjects: 0, mediaFiles: 0 });
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isClearStatsModalOpen, setIsClearStatsModalOpen] = useState(false);
  const [alsoClearSessions, setAlsoClearSessions] = useState(false);
  const [alsoClearFlags, setAlsoClearFlags] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadCounts = async () => {
    try {
      const [status, legacy] = await Promise.all([
        getDatabaseStatus(),
        getLegacyIndexedDbCounts()
      ]);
      setDbStatus(status);
      setLegacyCounts(legacy);
    } catch (err) {
      console.error('Failed to load database status:', err);
    }
  };

  useEffect(() => {
    loadCounts();
  }, []);

  const refreshAll = async () => {
    await loadCounts();
    onDataChanged?.();
  };

  const handleMigrateLegacy = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await migrateLegacyIndexedDbToSqlite();
      setStatusMessage({
        type: 'success',
        text: `Migrated ${res.questionsCount} questions, ${res.subjectsCount} subjects, and ${res.mediaCount} images from browser IndexedDB into SQLite.`
      });
      await refreshAll();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Migration failed: ${err.message || String(err)}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearAdditionalDataConfirm = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await clearQuestionAdditionalData({
        clearAttempts: true,
        clearSessions: alsoClearSessions,
        clearFlags: alsoClearFlags
      });
      setIsClearStatsModalOpen(false);
      const parts = [`${res.deletedAttempts} question attempt records`];
      if (alsoClearSessions) parts.push(`${res.deletedSessions} practice sessions`);
      if (alsoClearFlags) parts.push(`flags on ${res.resetFlaggedQuestions} questions`);
      setStatusMessage({
        type: 'success',
        text: `Cleared ${parts.join(', ')}. All questions, options, explanations, and images were preserved.`
      });
      await refreshAll();
    } catch (err: any) {
      setIsClearStatsModalOpen(false);
      setStatusMessage({
        type: 'error',
        text: `Failed to clear question data: ${err.message || String(err)}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetConfirm = async () => {
    await resetEntireDatabase();
    setIsResetModalOpen(false);
    setStatusMessage({
      type: 'success',
      text: 'SQLite database and media folder successfully reset to a clean state.'
    });
    await refreshAll();
  };

  const stats = dbStatus?.counts || { questions: 0, subjects: 0, chapters: 0, sessions: 0, attempts: 0 };

  const clearConfirmSummary = [
    `• Permanently delete all ${stats.attempts} per-question attempt & wrong-count records (resets Attempted, Correct, Wrong counts, and Accuracy to 0).`,
    alsoClearSessions
      ? `• Permanently delete all ${stats.sessions} practice session history logs.`
      : '• Practice session history logs will be kept.',
    alsoClearFlags
      ? '• Reset Important, Very Important, and Don\'t Understand flags on all questions.'
      : '• Question flags (Important / Very Important / Don\'t Understand) will be kept.',
    '\nYour questions, options, explanations, sources, and images will NOT be deleted.'
  ].join('\n');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-lc-page">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-[var(--lc-text)] tracking-tight">
          Settings &amp; Database
        </h1>
        <p className="text-xs sm:text-sm text-[var(--lc-text-secondary)] mt-1">
          Inspect local SQLite storage, clear question attempt statistics, or reset your database.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`lc-glass-subtle p-4 rounded-[12px] text-xs sm:text-sm flex items-center gap-2.5 ${
            statusMessage.type === 'error'
              ? 'border-[var(--lc-error)]/40 bg-[var(--lc-error-soft)] text-[var(--lc-text)]'
              : 'border-[var(--lc-accent-border)] bg-[var(--lc-accent-soft)] text-[var(--lc-text)]'
          }`}
        >
          {statusMessage.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-[var(--lc-error)] shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[var(--lc-accent)] shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Database Snapshot Bar */}
      <div className="lc-card overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[var(--lc-divider)] tabular-nums">
          <div className="p-4">
            <div className="text-xs text-[var(--lc-text-muted)]">Stored Questions</div>
            <div className="text-2xl font-semibold text-[var(--lc-text)] mt-1">{stats.questions}</div>
          </div>
          <div className="p-4">
            <div className="text-xs text-[var(--lc-text-muted)]">Subjects</div>
            <div className="text-2xl font-semibold text-[var(--lc-text)] mt-1">{stats.subjects}</div>
          </div>
          <div className="p-4">
            <div className="text-xs text-[var(--lc-text-muted)]">Chapters</div>
            <div className="text-2xl font-semibold text-[var(--lc-text)] mt-1">{stats.chapters}</div>
          </div>
          <div className="p-4">
            <div className="text-xs text-[var(--lc-text-muted)]">Practice Logs</div>
            <div className="text-2xl font-semibold text-[var(--lc-text)] mt-1">{stats.sessions}</div>
          </div>
          <div className="p-4 col-span-2 sm:col-span-1">
            <div className="text-xs text-[var(--lc-text-muted)]">Question Attempts</div>
            <div className="text-2xl font-semibold text-[var(--lc-text)] mt-1">{stats.attempts}</div>
          </div>
        </div>
      </div>

      {/* SQLite Storage Info Card */}
      {dbStatus && (
        <div className="lc-card p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-[var(--lc-text)] flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[var(--lc-success)]" />
              <span>Active Storage Engine: {dbStatus.engine}</span>
            </h2>
            <span className="text-xs font-medium text-[var(--lc-text-secondary)] tabular-nums">
              DB: {formatBytes(dbStatus.dbSizeBytes)} · Media ({dbStatus.mediaCount} files):{' '}
              {formatBytes(dbStatus.mediaSizeBytes)}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[var(--lc-divider)] text-xs">
            <div className="pt-2">
              <div className="text-[11px] font-medium text-[var(--lc-text-muted)]">SQLite Database File</div>
              <div className="font-mono text-[11px] text-[var(--lc-text)] break-all mt-1">
                {dbStatus.dbPath}
              </div>
            </div>
            <div className="pt-2">
              <div className="text-[11px] font-medium text-[var(--lc-text-muted)]">Disk Media Folder</div>
              <div className="font-mono text-[11px] text-[var(--lc-text)] break-all mt-1">
                {dbStatus.mediaDir}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Optional 1-click migration from legacy browser IndexedDB */}
      {legacyCounts.hasData && (
        <div className="lc-card p-5 bg-[var(--lc-warning-soft)] border-[var(--lc-warning)]/30 space-y-3">
          <div className="flex items-center gap-2 text-[var(--lc-warning)] font-semibold text-sm">
            <ArrowRightLeft className="w-4 h-4" />
            <span>Existing Browser IndexedDB Data Found</span>
          </div>
          <p className="text-xs text-[var(--lc-text-secondary)] tabular-nums">
            Found {legacyCounts.questions} questions, {legacyCounts.subjects} subjects, and{' '}
            {legacyCounts.mediaFiles} images in your old browser storage. Import them directly into your SQLite database:
          </p>
          <button
            type="button"
            onClick={handleMigrateLegacy}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>{isProcessing ? 'Migrating...' : 'Migrate Browser Data to SQLite'}</span>
          </button>
        </div>
      )}

      {/* Clear Additional Question Data */}
      <div className="lc-card p-5 sm:p-6 bg-amber-500/[0.06] border-amber-400/25 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-[var(--lc-warning)] font-semibold text-sm">
            <Eraser className="w-4 h-4" />
            <span>Delete Additional Data of All Questions</span>
          </div>
          <span className="text-xs text-[var(--lc-text-secondary)] tabular-nums">
            {stats.attempts.toLocaleString()} attempts · {stats.sessions.toLocaleString()} sessions
          </span>
        </div>
        <p className="text-xs text-[var(--lc-text-secondary)] leading-relaxed">
          Clears per-question attempt tracking across your entire bank — including how many times each question was attempted, answered correctly, and answered wrong — without deleting your questions, options, explanations, subjects, or images.
        </p>

        <div className="space-y-2 text-xs text-[var(--lc-text)]">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={alsoClearSessions}
              onChange={e => setAlsoClearSessions(e.target.checked)}
              className="rounded border-white/25 bg-white/10 accent-amber-400"
            />
            <span>Also clear Practice History session logs ({stats.sessions} sessions)</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={alsoClearFlags}
              onChange={e => setAlsoClearFlags(e.target.checked)}
              className="rounded border-white/25 bg-white/10 accent-amber-400"
            />
            <span>Also reset question flags (Important, Very Important, Don't Understand)</span>
          </label>
        </div>

        <button
          type="button"
          disabled={isProcessing}
          onClick={() => setIsClearStatsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 transition-colors"
        >
          <Eraser className="w-3.5 h-3.5" />
          <span>Delete Question Attempt &amp; Additional Data</span>
        </button>
      </div>

      {/* Danger Zone: Reset Database */}
      <div className="lc-card p-5 sm:p-6 bg-rose-500/[0.06] border-rose-400/25 space-y-3">
        <div className="flex items-center gap-2 text-[var(--lc-error)] font-semibold text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Danger Zone: Reset Database</span>
        </div>
        <p className="text-xs text-[var(--lc-text-secondary)] leading-relaxed">
          Permanently deletes all questions, chapters, subjects, media files, and test records from your SQLite database.
        </p>
        <button
          type="button"
          onClick={() => setIsResetModalOpen(true)}
          className="lc-btn-danger inline-flex items-center gap-1.5 px-4 py-2 text-xs"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Reset Question Bank</span>
        </button>
      </div>

      {/* Clear Question Additional Data Modal */}
      <ConfirmModal
        isOpen={isClearStatsModalOpen}
        title="Delete Additional Question Data"
        message={clearConfirmSummary}
        confirmText="Yes, Delete Attempt Data"
        onConfirm={handleClearAdditionalDataConfirm}
        onCancel={() => setIsClearStatsModalOpen(false)}
      />

      {/* Reset Database Confirmation Modal */}
      <ConfirmModal
        isOpen={isResetModalOpen}
        title="Reset Entire Question Bank"
        message={`Are you sure you want to reset the question bank?\n\nThis will permanently erase all questions, subjects, chapters, media files, attempts, and history from SQLite.\n\nMake sure you have backed up your data folder or exported a JSON backup first.`}
        confirmText="Yes, Permanently Reset Everything"
        onConfirm={handleResetConfirm}
        onCancel={() => setIsResetModalOpen(false)}
      />
    </div>
  );
};
