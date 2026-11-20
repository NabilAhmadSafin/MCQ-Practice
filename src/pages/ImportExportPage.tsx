import React, { useState } from 'react';
import {
  Download,
  Upload,
  FileJson,
  Database,
  History,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import {
  exportQuestionsJSON,
  exportHistoryJSON,
  importQuestionsJSON,
  importHistoryJSON
} from '../utils/exportImport';
import { CodeImportSection } from '../components/settings/CodeImportSection';
import type { NavSection } from '../components/layout/Sidebar';

interface ImportExportPageProps {
  onNavigate: (section: NavSection, params?: any) => void;
  onDataChanged?: () => void;
}

export const ImportExportPage: React.FC<ImportExportPageProps> = ({
  onNavigate,
  onDataChanged
}) => {
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleJSONFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const text = await file.text();
      const count = await importQuestionsJSON(text);
      setStatusMessage({
        type: 'success',
        text: `Successfully restored ${count} questions and curriculum structures into SQLite.`
      });
      onDataChanged?.();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Backup restore failed: ${err.message || String(err)}`
      });
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleHistoryFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const text = await file.text();
      const res = await importHistoryJSON(text);
      setStatusMessage({
        type: 'success',
        text: `Successfully restored ${res.sessionsCount} practice sessions and ${res.attemptsCount} question attempt records.`
      });
      onDataChanged?.();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `History restore failed: ${err.message || String(err)}`
      });
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-lc-page">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-[var(--lc-text)] tracking-tight">
          Import, Export &amp; Restore
        </h1>
        <p className="text-xs sm:text-sm text-[var(--lc-text-secondary)] mt-1">
          Bulk-import questions by structured code, export JSON backups, or restore your question bank and practice history.
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

      {/* Export & Restore */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export */}
        <div className="lc-card p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-semibold text-[var(--lc-text)] flex items-center gap-2">
            <Download className="w-4 h-4 text-[var(--lc-accent)]" />
            <span>Export Backups</span>
          </h2>
          <p className="text-xs text-[var(--lc-text-secondary)] leading-relaxed">
            Download your complete question bank or practice history as JSON files. For full multi-GB backups including images, you can also copy the <code className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[var(--lc-text)]">data/</code> folder directly.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={exportQuestionsJSON}
              className="lc-card-interactive p-4 text-left group"
            >
              <FileJson className="w-6 h-6 text-[var(--lc-accent)] mb-2 group-hover:scale-105 transition-transform" />
              <div className="text-xs font-semibold text-[var(--lc-text)]">
                Questions Backup (JSON)
              </div>
              <div className="text-[11px] text-[var(--lc-text-muted)] mt-0.5">
                Full schema backup with options, flags &amp; history
              </div>
            </button>

            <button
              type="button"
              onClick={exportHistoryJSON}
              className="lc-card-interactive p-4 text-left group"
            >
              <Database className="w-6 h-6 text-violet-400 mb-2 group-hover:scale-105 transition-transform" />
              <div className="text-xs font-semibold text-[var(--lc-text)]">
                Practice History (JSON)
              </div>
              <div className="text-[11px] text-[var(--lc-text-muted)] mt-0.5">
                All sessions, scores, attempts &amp; timestamps
              </div>
            </button>
          </div>
        </div>

        {/* Restore */}
        <div className="lc-card p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-semibold text-[var(--lc-text)] flex items-center gap-2">
            <Upload className="w-4 h-4 text-[var(--lc-accent)]" />
            <span>Restore from Backup</span>
          </h2>
          <p className="text-xs text-[var(--lc-text-secondary)] leading-relaxed">
            Restore your complete question bank or restore only your practice sessions and attempt history from exported JSON files.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="lc-card-interactive p-4 text-left cursor-pointer group block">
              <Upload className="w-6 h-6 text-[var(--lc-accent)] mb-2 group-hover:scale-105 transition-transform" />
              <div className="text-xs font-semibold text-[var(--lc-text)]">
                Restore Questions (JSON)
              </div>
              <div className="text-[11px] text-[var(--lc-text-muted)] mt-0.5">
                Select a full question bank backup JSON
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleJSONFileImport}
                disabled={isProcessing}
                className="hidden"
              />
            </label>

            <label className="lc-card-interactive p-4 text-left cursor-pointer group block">
              <History className="w-6 h-6 text-violet-400 mb-2 group-hover:scale-105 transition-transform" />
              <div className="text-xs font-semibold text-[var(--lc-text)]">
                Restore History (JSON)
              </div>
              <div className="text-[11px] text-[var(--lc-text-muted)] mt-0.5">
                Restore sessions &amp; question attempts JSON
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleHistoryFileImport}
                disabled={isProcessing}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Bulk Import by Code */}
      <CodeImportSection onNavigate={onNavigate} onImportSuccess={onDataChanged} />
    </div>
  );
};
