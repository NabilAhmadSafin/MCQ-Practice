import React, { useState } from 'react';
import {
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Database,
  Info
} from 'lucide-react';
import { parseCodeInput } from '../../utils/codeParser';
import { validateParsedQuestion } from '../../utils/validator';
import { getAllSubjects, getAllChapters, createSubject, createChapter } from '../../services/subjectService';
import { createCommonInfo, findCommonInfoByContent } from '../../services/commonInfoService';
import { bulkPutQuestions, checkDuplicateQuestions } from '../../services/questionService';
import { RichContentRenderer } from '../common/RichContentRenderer';
import type { ValidationItem, Question } from '../../types';
import type { NavSection } from '../layout/Sidebar';

interface CodeImportSectionProps {
  onNavigate: (section: NavSection, params?: any) => void;
  onImportSuccess?: () => void | Promise<void>;
}

const SAMPLE_CODE = `addQuestions({
  subject: "Physics",
  chapter: "Motion & Dynamics",

  questions: [
    // 1. Standard MCQ with Mathematical Equation ($...$)
    {
      question: "একটি বস্তুর গতিশক্তি $E_k = \\\\frac{1}{2}mv^2$। যদি ভর $m = 4\\\\text{ kg}$ এবং বেগ $v = 10\\\\text{ m/s}$ হয়, তবে গতিশক্তি কত?",
      options: [
        "$100\\\\text{ J}$",
        "$200\\\\text{ J}$",
        "$400\\\\text{ J}$",
        "$50\\\\text{ J}$"
      ],
      answer: "B",
      explanation: "$E_k = \\\\frac{1}{2} \\\\times 4 \\\\times (10)^2 = 2 \\\\times 100 = 200\\\\text{ J}$",
      sources: [
        { type: "Board", name: "Dhaka Board 2024" },
        { type: "Guide", name: "Panjaree", entryNo: "142" }
      ]
    },

    // 2. Chemistry Reaction MCQ (\\\\ce{...})
    {
      question: "নিচের বিক্রিয়াটিতে উৎপন্ন গ্যাসটি চুনের পানিকে ঘোলা করে:\\n$$\\\\ce{CaCO3(s) ->[\\\\Delta] CaO(s) + CO2(g)}$$\\nএখানে বিক্রিয়ক এবং উৎপাদের বৈশিষ্ট্য সম্পর্কে কোনটি সঠিক?",
      questionType: "MULTIPLE_STATEMENT",
      statements: [
        "বিক্রিয়াটি একটি তাপহারী বিযোজন বিক্রিয়া",
        "উৎপন্ন $\\\\ce{CO2}$ এসিডধর্মী গ্যাস",
        "উৎপন্ন $\\\\ce{CaO}$ হলো কলিচুন"
      ],
      options: [
        "i ও ii",
        "ii ও iii",
        "i ও iii",
        "i, ii ও iii"
      ],
      answer: "A",
      explanation: "i ও ii সঠিক। $\\\\ce{CaO}$ হলো পোড়াচুন (Quicklime); কলিচুন বা স্লেকড লাইম হলো $\\\\ce{Ca(OH)2}$।",
      sources: [
        { type: "Board", name: "Rajshahi Board 2024" }
      ]
    },

    // 3. অভিন্ন তথ্যভিত্তিক MCQ (Common Stem with Math/Equations)
    {
      question: "10 সেকেন্ড পর গাড়িটির অতিক্রান্ত দূরত্ব কত হবে?",
      questionType: "COMMON_STEM",
      stem: "একটি স্থির গাড়ি $u = 0$ থেকে $a = 2\\\\text{ m/s}^2$ সুষম ত্বরণে চলা শুরু করল। 10 সেকেন্ড পর চালক ব্রেক চেপে পরবর্তী 5 সেকেন্ডে গাড়িটি থামিয়ে দিলেন।",
      options: [
        "$50\\\\text{ m}$",
        "$100\\\\text{ m}$",
        "$150\\\\text{ m}$",
        "$200\\\\text{ m}$"
      ],
      answer: "B",
      explanation: "$s = ut + \\\\frac{1}{2}at^2 = 0 + \\\\frac{1}{2}(2)(10)^2 = 100\\\\text{ m}$",
      sources: [
        { type: "School", name: "Notre Dame College" },
        { type: "Guide", name: "Panjaree", entryNo: "88" }
      ]
    }
  ]
});`;

export const CodeImportSection: React.FC<CodeImportSectionProps> = ({
  onNavigate,
  onImportSuccess
}) => {
  const [codeInput, setCodeInput] = useState(SAMPLE_CODE);
  const [validationItems, setValidationItems] = useState<ValidationItem[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [insertSuccessMsg, setInsertSuccessMsg] = useState<string | null>(null);

  const handleParseCode = async () => {
    setParseError(null);
    setInsertSuccessMsg(null);
    setIsParsing(true);

    try {
      const result = parseCodeInput(codeInput);
      const defaultSubj = result.subject;
      const defaultChap = result.chapter;

      const candidateTexts = result.questions
        .map(q => String(q?.question || q?.questionText || ''))
        .filter(Boolean);
      const duplicatesSet = await checkDuplicateQuestions(candidateTexts);

      const items: ValidationItem[] = result.questions.map((rawQ, idx) =>
        validateParsedQuestion(rawQ, idx, defaultSubj, defaultChap, duplicatesSet)
      );

      setValidationItems(items);
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse code');
      setValidationItems([]);
    } finally {
      setIsParsing(false);
    }
  };

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
      const currentSubjects = await getAllSubjects();
      const currentChapters = await getAllChapters();

      const subjNameMap = new Map<string, string>(
        currentSubjects.map(s => [s.name.toLowerCase().trim(), s.id])
      );
      const chapKeyMap = new Map<string, string>(
        currentChapters.map(c => [`${c.subjectId}_${c.name.toLowerCase().trim()}`, c.id])
      );

      const dbQuestions: Question[] = [];
      const stemContentToId = new Map<string, string>();

      for (const q of questionsToInsert) {
        const sName = (q?.subjectName || 'General').trim();
        const cName = (q?.chapterName || 'General').trim();

        let sId = subjNameMap.get(sName.toLowerCase());
        if (!sId) {
          const newSubj = await createSubject(sName);
          sId = newSubj.id;
          subjNameMap.set(sName.toLowerCase(), sId);
        }

        const chapKey = `${sId}_${cName.toLowerCase()}`;
        let cId = chapKeyMap.get(chapKey);
        if (!cId) {
          const newChap = await createChapter(sId, cName);
          cId = newChap.id;
          chapKeyMap.set(chapKey, cId);
        }

        let resolvedCommonInfoId = q?.commonInfoId;
        const stemContent = q?.commonInfoContent?.trim();
        if (!resolvedCommonInfoId && stemContent) {
          if (stemContentToId.has(stemContent)) {
            resolvedCommonInfoId = stemContentToId.get(stemContent);
          } else {
            const existing = await findCommonInfoByContent(stemContent);
            if (existing) {
              resolvedCommonInfoId = existing.id;
            } else {
              const newInfo = await createCommonInfo({
                title: q?.commonInfoTitle || 'অভিন্ন তথ্যভিত্তিক উদ্দীপক',
                content: stemContent,
                subjectId: sId,
                chapterId: cId
              });
              resolvedCommonInfoId = newInfo.id;
            }
            stemContentToId.set(stemContent, resolvedCommonInfoId!);
          }
        }

        const validSources =
          q?.sources && q.sources.length > 0
            ? q.sources.map((s: any) => ({
                type: s.type || 'Board',
                name: s.name || '',
                ...(s.entryNo ? { entryNo: String(s.entryNo).trim() } : {})
              }))
            : [{ type: q?.sourceType || 'Board', name: q?.sourceName || 'General' }];

        const resolvedType =
          q?.questionType ||
          (resolvedCommonInfoId
            ? 'COMMON_STEM'
            : q?.statements && q.statements.length > 0
            ? 'MULTIPLE_STATEMENT'
            : 'STANDARD');

        dbQuestions.push({
          id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
          subjectId: sId,
          chapterId: cId,
          question: q?.question || '',
          questionType: resolvedType,
          statements: q?.statements && q.statements.length > 0 ? q.statements : undefined,
          commonInfoId: resolvedCommonInfoId,
          options: q?.options || {},
          correctAnswer: q?.correctAnswer || 'A',
          explanation: q?.explanation,
          images: q?.images,
          contentBlocks: q?.contentBlocks,
          optionImages: q?.optionImages,
          explanationImages: q?.explanationImages,
          sources: validSources,
          sourceTypes: validSources.map((s: any) => s.type),
          guides: validSources
            .filter((s: any) => s.type?.toLowerCase() === 'guide')
            .map((s: any) => s.name),
          important: Boolean(q?.important),
          veryImportant: Boolean(q?.veryImportant),
          dontUnderstand: Boolean(q?.dontUnderstand),
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }

      await bulkPutQuestions(dbQuestions);

      setInsertSuccessMsg(`Successfully imported ${dbQuestions.length} questions into your question bank!`);
      setValidationItems([]);
      await onImportSuccess?.();
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
    <div className="lc-card p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-[var(--lc-text)] flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-[var(--lc-accent)]" />
          <span>Import Questions by Code (JS / JSON)</span>
        </h2>
        <p className="text-xs text-[var(--lc-text-secondary)] mt-1">
          Bulk-import dozens or hundreds of MCQs at once using an <code className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[var(--lc-text)]">addQuestions(...)</code> block or JSON array.
        </p>
      </div>

      {parseError && (
        <div className="p-4 rounded-[12px] bg-rose-500/12 border border-rose-400/35 text-sm text-rose-200 flex items-start gap-3">
          <XCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <div>{parseError}</div>
        </div>
      )}

      {insertSuccessMsg && (
        <div className="p-4 rounded-[12px] bg-emerald-500/12 border border-emerald-400/35 text-sm text-emerald-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{insertSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('question-bank')}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-[8px] text-xs font-semibold transition-colors"
          >
            View in Question Bank →
          </button>
        </div>
      )}

      <div className="lc-glass-subtle rounded-[12px] p-4 text-xs text-[var(--lc-text-secondary)] space-y-2.5">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[var(--lc-accent)] shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <div>
              <span className="font-semibold text-[var(--lc-text)]">
                Safe Structured Code Parser:
              </span>{' '}
              Paste an <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-[var(--lc-text)]">addQuestions(...)</code> block or pure JSON array.
            </div>
          </div>
        </div>

        <div className="pt-2.5 border-t border-[var(--lc-divider)] grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
          <div className="p-2.5 rounded-[10px] bg-black/25 border border-[var(--lc-border)]">
            <span className="font-semibold text-[var(--lc-accent)] block mb-0.5">
              Math Equations (LaTeX)
            </span>
            <span className="text-[var(--lc-text-secondary)]">
              Use <code className="font-mono text-[var(--lc-text)] font-semibold">$...$</code> for inline or <code className="font-mono text-[var(--lc-text)] font-semibold">$$...$$</code> for block display. Escape backslashes in JS/JSON strings (e.g. <code className="font-mono text-[var(--lc-text)]">"$\\\\frac{1}{2}mv^2$"</code>).
            </span>
          </div>
          <div className="p-2.5 rounded-[10px] bg-black/25 border border-[var(--lc-border)]">
            <span className="font-semibold text-[var(--lc-success)] block mb-0.5">
              Chemical Formulas &amp; Reactions
            </span>
            <span className="text-[var(--lc-text-secondary)]">
              Wrap in <code className="font-mono text-[var(--lc-text)] font-semibold">\\ce&#123;...&#125;</code> (e.g. <code className="font-mono text-[var(--lc-text)]">"\ce&#123;2H2 + O2 -&gt; 2H2O&#125;"</code> or <code className="font-mono text-[var(--lc-text)]">"\ce&#123;CaCO3 -&gt; CaO + CO2 ^&#125;"</code>).
            </span>
          </div>
        </div>
      </div>

      <div className="relative">
        <textarea
          rows={12}
          value={codeInput}
          onChange={e => setCodeInput(e.target.value)}
          placeholder="Paste structured code or JSON here..."
          className="lc-input w-full font-mono text-xs p-4 leading-relaxed"
        />
        <button
          type="button"
          onClick={() => setCodeInput(SAMPLE_CODE)}
          className="lc-btn-secondary absolute right-3 top-3 px-2.5 py-1 text-[11px]"
        >
          Reset to Sample
        </button>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          disabled={isParsing || !codeInput.trim()}
          onClick={handleParseCode}
          className="lc-btn-primary px-5 py-2.5 text-sm disabled:opacity-50 flex items-center gap-2"
        >
          <span>{isParsing ? 'Parsing...' : 'Parse & Validate Questions'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {validationItems.length > 0 && (
        <div className="border-t border-white/10 pt-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-[#F3F5FA]">
                Validation Results
              </h3>
              <div className="flex items-center gap-3 text-xs mt-1 tabular-nums">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{validCount} Valid</span>
                </span>
                {warningCount > 0 && (
                  <>
                    <span className="text-[#7D859C]">·</span>
                    <span className="text-amber-300 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{warningCount} Warnings</span>
                    </span>
                  </>
                )}
                {invalidCount > 0 && (
                  <>
                    <span className="text-[#7D859C]">·</span>
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{invalidCount} Invalid</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={isInserting || validCount === 0}
              onClick={() => handleInsertQuestions(true)}
              className="lc-btn-primary px-4 py-2 text-xs disabled:opacity-40 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{isInserting ? 'Importing...' : `Import ${validCount} Valid Questions`}</span>
            </button>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2">
            {validationItems.map(item => (
              <div
                key={item.index}
                className={`p-3.5 rounded-[12px] border text-xs space-y-2 ${
                  item.isValid
                    ? 'lc-glass-subtle'
                    : 'bg-rose-500/10 border-rose-400/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {item.isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <span className="font-semibold text-[#F3F5FA] shrink-0">
                      Question #{item.index + 1}:
                    </span>
                    <div className="text-[#D4DAE8] flex-1 leading-snug">
                      <RichContentRenderer
                        content={item.questionText}
                        images={item.parsedQuestion?.images}
                      />
                    </div>
                  </div>

                  {item.parsedQuestion && (
                    <div className="flex items-center gap-2 text-[11px] text-[#A9B1C6] shrink-0">
                      <span className="font-medium">
                        {item.parsedQuestion.questionType === 'MULTIPLE_STATEMENT'
                          ? 'বহুপদী'
                          : item.parsedQuestion.questionType === 'COMMON_STEM'
                          ? 'অভিন্ন তথ্য'
                          : 'Standard'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-[#F3F5FA]">
                        Ans: {item.parsedQuestion.correctAnswer}
                      </span>
                    </div>
                  )}
                </div>

                {item.parsedQuestion?.questionType === 'COMMON_STEM' &&
                  (item.parsedQuestion.commonInfoContent || item.parsedQuestion.commonInfoTitle) && (
                    <div className="pl-6 text-[11px] text-violet-300 font-medium">
                      উদ্দীপক: {item.parsedQuestion.commonInfoTitle || 'সাধারণ অনুচ্ছেদ'} —{' '}
                      {item.parsedQuestion.commonInfoContent?.slice(0, 70)}...
                    </div>
                  )}
                {item.parsedQuestion?.questionType === 'MULTIPLE_STATEMENT' &&
                  item.parsedQuestion.statements && (
                    <div className="pl-6 text-[11px] text-sky-300 font-medium">
                      {item.parsedQuestion.statements.length} টি বক্তব্য (Statements)
                    </div>
                  )}

                {item.parsedQuestion?.sources && item.parsedQuestion.sources.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pl-6 text-[11px] text-[#7D859C]">
                    {item.parsedQuestion.sources.map((s, sIdx) => (
                      <span key={sIdx}>
                        {sIdx > 0 && <span className="mr-2">·</span>}
                        {s.type}: {s.name}
                        {s.entryNo ? ` (Entry #${s.entryNo})` : ''}
                      </span>
                    ))}
                  </div>
                )}

                {item.errors.length > 0 && (
                  <div className="text-rose-300 space-y-0.5 pl-6">
                    {item.errors.map((err, i) => (
                      <div key={i}>✗ {err}</div>
                    ))}
                  </div>
                )}

                {item.warnings.length > 0 && (
                  <div className="text-amber-300 space-y-0.5 pl-6">
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
