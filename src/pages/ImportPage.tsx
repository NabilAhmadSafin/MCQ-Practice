import React, { useState, useEffect } from 'react';
import { 
  FileCode2, 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  Layers, 
  Database,
  Copy,
  Info
} from 'lucide-react';
import { parseCodeInput } from '../utils/codeParser';
import { parseDocxFile, parseTextToQuestions } from '../utils/docxParser';
import { validateParsedQuestion } from '../utils/validator';
import { db } from '../db';
import { getAllSubjects, getAllChapters, createSubject, createChapter } from '../services/subjectService';
import type { ValidationItem, Subject, Chapter, Question } from '../types';
import type { NavSection } from '../components/layout/Sidebar';

interface ImportPageProps {
  onNavigate: (section: NavSection, params?: any) => void;
}

const SAMPLE_CODE = `addQuestions({
  subject: "Physics",
  chapter: "Motion",

  questions: [
    {
      question: "Which of the following is a vector quantity?",
      options: [
        "Distance",
        "Speed",
        "Velocity",
        "Mass"
      ],
      answer: "C",
      explanation: "Velocity has both magnitude and direction.",
      sources: [
        { type: "Board", name: "Dhaka Board 2024" },
        { type: "Guide", name: "Panjaree", entryNo: "142" }
      ]
    },
    {
      question: "What is the SI unit of acceleration?",
      options: [
        "m",
        "m/s",
        "m/s²",
        "N"
      ],
      answer: "C",
      explanation: "Acceleration is the rate of change of velocity.",
      sources: [
        { type: "Board", name: "Chittagong Board 2023" },
        { type: "School", name: "Notre Dame College" },
        { type: "Guide", name: "Lecture", entryNo: "88" }
      ]
    }
  ]
});`;

export const ImportPage: React.FC<ImportPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'code' | 'docx'>('code');

  // Code Tab state
  const [codeInput, setCodeInput] = useState(SAMPLE_CODE);

  // DOCX Tab state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docxFallbackText, setDocxFallbackText] = useState('');
  const [targetSubject, setTargetSubject] = useState('');
  const [targetChapter, setTargetChapter] = useState('');

  // Common validation state
  const [validationItems, setValidationItems] = useState<ValidationItem[]>([]);
  const [existingQuestions, setExistingQuestions] = useState<Set<string>>(new Set());
  const [isParsing, setIsParsing] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [insertSuccessMsg, setInsertSuccessMsg] = useState<string | null>(null);

  // Subjects & Chapters metadata
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    const loadMeta = async () => {
      const [subjs, chaps, qs] = await Promise.all([
        getAllSubjects(),
        getAllChapters(),
        db.questions.toArray()
      ]);
      setSubjects(subjs);
      setChapters(chaps);
      setExistingQuestions(new Set(qs.map(q => q.question.toLowerCase().trim())));

      if (subjs.length > 0) {
        setTargetSubject(subjs[0].name);
        const subjChaps = chaps.filter(c => c.subjectId === subjs[0].id);
        if (subjChaps.length > 0) setTargetChapter(subjChaps[0].name);
      }
    };
    loadMeta();
  }, []);

  // Parse and Validate Code Input
  const handleParseCode = () => {
    setParseError(null);
    setInsertSuccessMsg(null);
    setIsParsing(true);

    try {
      const result = parseCodeInput(codeInput);
      const defaultSubj = result.subject;
      const defaultChap = result.chapter;

      const items: ValidationItem[] = result.questions.map((rawQ, idx) =>
        validateParsedQuestion(rawQ, idx, defaultSubj, defaultChap, existingQuestions)
      );

      setValidationItems(items);
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse code');
      setValidationItems([]);
    } finally {
      setIsParsing(false);
    }
  };

  // Parse and Validate DOCX file
  const handleParseDocx = async () => {
    setParseError(null);
    setInsertSuccessMsg(null);
    setIsParsing(true);

    try {
      let rawQs: any[] = [];
      if (selectedFile) {
        rawQs = await parseDocxFile(selectedFile);
      } else if (docxFallbackText.trim()) {
        rawQs = parseTextToQuestions(docxFallbackText);
      } else {
        throw new Error('Please upload a .docx file or paste question text');
      }

      if (rawQs.length === 0) {
        throw new Error('No questions could be identified from the document. Please check the document format.');
      }

      const items: ValidationItem[] = rawQs.map((rawQ, idx) =>
        validateParsedQuestion(rawQ, idx, targetSubject, targetChapter, existingQuestions)
      );

      setValidationItems(items);
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse document');
      setValidationItems([]);
    } finally {
      setIsParsing(false);
    }
  };

  // Insert Valid Questions into DB
  const handleInsertQuestions = async (onlyValid: boolean = true) => {
    const questionsToInsert = validationItems
      .filter(item => (onlyValid ? item.isValid : true))
      .map(item => item.parsedQuestion)
      .filter(Boolean);

    if (questionsToInsert.length === 0) {
      setParseError('No questions to insert');
      return;
    }

    setIsInserting(true);
    setParseError(null);

    try {
      // Build Subject & Chapter map or create missing on the fly!
      const currentSubjects = await getAllSubjects();
      const currentChapters = await getAllChapters();

      const subjNameMap = new Map<string, string>(
        currentSubjects.map(s => [s.name.toLowerCase().trim(), s.id])
      );
      const chapKeyMap = new Map<string, string>(
        currentChapters.map(c => [`${c.subjectId}_${c.name.toLowerCase().trim()}`, c.id])
      );

      const dbQuestions: Question[] = [];

      for (const q of questionsToInsert) {
        const sName = (q?.subjectName || 'General').trim();
        const cName = (q?.chapterName || 'General').trim();

        // Check or create subject
        let sId = subjNameMap.get(sName.toLowerCase());
        if (!sId) {
          const newSubj = await createSubject(sName);
          sId = newSubj.id;
          subjNameMap.set(sName.toLowerCase(), sId);
        }

        // Check or create chapter
        const chapKey = `${sId}_${cName.toLowerCase()}`;
        let cId = chapKeyMap.get(chapKey);
        if (!cId) {
          const newChap = await createChapter(sId, cName);
          cId = newChap.id;
          chapKeyMap.set(chapKey, cId);
        }

        const validSources = q?.sources && q.sources.length > 0
          ? q.sources.map((s: any) => ({
              type: s.type || 'Board',
              name: s.name || '',
              ...(s.entryNo ? { entryNo: String(s.entryNo).trim() } : {})
            }))
          : [{ type: q?.sourceType || 'Board', name: q?.sourceName || 'General' }];

        dbQuestions.push({
          id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
          subjectId: sId,
          chapterId: cId,
          question: q?.question || '',
          options: q?.options || {},
          correctAnswer: q?.correctAnswer || 'A',
          explanation: q?.explanation,
          sources: validSources,
          sourceTypes: validSources.map((s: any) => s.type),
          guides: validSources.filter((s: any) => s.type?.toLowerCase() === 'guide').map((s: any) => s.name),
          important: Boolean(q?.important),
          veryImportant: Boolean(q?.veryImportant),
          dontUnderstand: Boolean(q?.dontUnderstand),
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }

      await db.questions.bulkPut(dbQuestions);

      setInsertSuccessMsg(`Successfully imported ${dbQuestions.length} questions into your question bank!`);
      setValidationItems([]);
      if (selectedFile) setSelectedFile(null);
      if (docxFallbackText) setDocxFallbackText('');
    } catch (err: any) {
      setParseError('Failed to insert questions: ' + (err.message || String(err)));
    } finally {
      setIsInserting(false);
    }
  };

  const validCount = validationItems.filter(i => i.isValid).length;
  const invalidCount = validationItems.filter(i => !i.isValid).length;
  const warningCount = validationItems.filter(i => i.warnings.length > 0).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Import Questions
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Add dozens or hundreds of MCQs at once using structured code or Word documents.
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab('code');
            setValidationItems([]);
            setParseError(null);
          }}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'code'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
          }`}
        >
          <FileCode2 className="w-4 h-4" />
          <span>Import by Code (JS / JSON)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('docx');
            setValidationItems([]);
            setParseError(null);
          }}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'docx'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Import from Word (.docx)</span>
        </button>
      </div>

      {/* Messages */}
      {parseError && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300 flex items-start gap-3">
          <XCircle className="w-5 h-5 shrink-0 text-red-600" />
          <div>{parseError}</div>
        </div>
      )}

      {insertSuccessMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{insertSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('question-bank')}
            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
          >
            View in Question Bank →
          </button>
        </div>
      )}

      {/* CODE IMPORT TAB */}
      {activeTab === 'code' && (
        <div className="space-y-4">
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                Safe Structured Code Parser:
              </span>{' '}
              Paste an <code className="bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono">addQuestions(...)</code> block or pure JSON array. No eval or execution occurs.
            </div>
          </div>

          <div className="relative">
            <textarea
              rows={14}
              value={codeInput}
              onChange={e => setCodeInput(e.target.value)}
              placeholder="Paste structured code or JSON here..."
              className="w-full font-mono text-xs p-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500 leading-relaxed shadow-xs"
            />
            <button
              type="button"
              onClick={() => setCodeInput(SAMPLE_CODE)}
              className="absolute right-3 top-3 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300 rounded text-[11px] font-medium"
            >
              Reset to Sample
            </button>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isParsing || !codeInput.trim()}
              onClick={handleParseCode}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors flex items-center gap-2"
            >
              <span>Parse & Validate Questions</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* DOCX IMPORT TAB */}
      {activeTab === 'docx' && (
        <div className="space-y-4">
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">Expected DOCX Format:</span>
              <pre className="mt-2 p-2.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px] leading-relaxed">
{`1. Which of the following is a vector quantity?
A. Distance
B. Speed
C. Velocity
D. Mass
Answer: C
Explanation: Velocity has both magnitude and direction.
Source: Dhaka Board 2024`}
              </pre>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                Assign Subject
              </label>
              <input
                type="text"
                value={targetSubject}
                onChange={e => setTargetSubject(e.target.value)}
                placeholder="e.g. Physics"
                className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                Assign Chapter
              </label>
              <input
                type="text"
                value={targetChapter}
                onChange={e => setTargetChapter(e.target.value)}
                placeholder="e.g. Motion"
                className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500"
              />
            </div>
          </div>

          {/* File Picker */}
          <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 text-center bg-white dark:bg-zinc-900/50 hover:border-indigo-500 transition-colors">
            <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
            <label className="cursor-pointer">
              <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                Choose a .docx file
              </span>{' '}
              <span className="text-sm text-zinc-500">or drag and drop</span>
              <input
                type="file"
                accept=".docx"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </label>
            {selectedFile && (
              <div className="mt-3 text-xs font-medium text-emerald-600 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>

          {/* Fallback text area */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              Or Paste Raw Questions Text directly
            </label>
            <textarea
              rows={6}
              value={docxFallbackText}
              onChange={e => setDocxFallbackText(e.target.value)}
              placeholder="1. Question text&#10;A. Option 1&#10;B. Option 2&#10;C. Option 3&#10;D. Option 4&#10;Answer: C"
              className="w-full font-mono text-xs p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isParsing || (!selectedFile && !docxFallbackText.trim())}
              onClick={handleParseDocx}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-xs transition-colors flex items-center gap-2"
            >
              <span>Parse & Validate Document</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* VALIDATION RESULTS & PREVIEW (Prompt 12 requirement) */}
      {validationItems.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Validation Results
              </h2>
              <div className="flex items-center gap-4 text-xs mt-1">
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{validCount} Valid</span>
                </span>
                {warningCount > 0 && (
                  <span className="text-amber-600 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{warningCount} Warnings</span>
                  </span>
                )}
                {invalidCount > 0 && (
                  <span className="text-rose-600 font-semibold flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{invalidCount} Invalid</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isInserting || validCount === 0}
                onClick={() => handleInsertQuestions(true)}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Import {validCount} Valid Questions</span>
              </button>
            </div>
          </div>

          {/* Validation items list */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {validationItems.map(item => (
              <div
                key={item.index}
                className={`p-3.5 rounded-lg border text-xs space-y-2 ${
                  item.isValid
                    ? 'bg-zinc-50/70 border-zinc-200 dark:bg-zinc-800/40 dark:border-zinc-700/60'
                    : 'bg-rose-50/40 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      Question #{item.index + 1}:
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-300 line-clamp-1">
                      {item.questionText}
                    </span>
                  </div>

                  {item.parsedQuestion && (
                    <span className="font-bold px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                      Ans: {item.parsedQuestion.correctAnswer}
                    </span>
                  )}
                </div>

                {item.parsedQuestion?.sources && item.parsedQuestion.sources.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pl-6 text-[11px]">
                    {item.parsedQuestion.sources.map((s, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300 font-medium"
                      >
                        {s.type}: {s.name}{s.entryNo ? ` (Entry #${s.entryNo})` : ''}
                      </span>
                    ))}
                  </div>
                )}

                {/* Errors */}
                {item.errors.length > 0 && (
                  <div className="text-rose-600 dark:text-rose-400 space-y-0.5 pl-6">
                    {item.errors.map((err, i) => (
                      <div key={i}>✗ {err}</div>
                    ))}
                  </div>
                )}

                {/* Warnings */}
                {item.warnings.length > 0 && (
                  <div className="text-amber-600 dark:text-amber-400 space-y-0.5 pl-6">
                    {item.warnings.map((warn, i) => (
                      <div key={i}>⚠ {warn}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
