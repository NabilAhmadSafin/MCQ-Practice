import React, { useState } from 'react';
import { Pi, Atom, ChevronDown, Check, Plus, HelpCircle } from 'lucide-react';
import { MathRenderer } from './MathRenderer';
import { ChemistryRenderer } from './ChemistryRenderer';
import { formatChemicalReaction, formatChemicalFormula } from '../../utils/chemistryFormatter';

interface MathChemistryToolbarProps {
  onInsertMath: (latex: string, displayMode?: boolean) => void;
  onInsertChemistry: (chem: string, isReaction?: boolean) => void;
  className?: string;
}

export const MathChemistryToolbar: React.FC<MathChemistryToolbarProps> = ({
  onInsertMath,
  onInsertChemistry,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'math' | 'chem' | null>(null);

  // Math builder state
  const [mathInput, setMathInput] = useState('x^2 - 5x + 6 = 0');
  const [isMathDisplayMode, setIsMathDisplayMode] = useState(false);

  // Chemistry builder state
  const [chemInput, setChemInput] = useState('2H2 + O2 -> 2H2O');
  const [isReaction, setIsReaction] = useState(true);

  // Quick Math Snippets
  const mathTemplates = [
    { label: 'x²', snippet: 'x^2' },
    { label: 'x₁', snippet: 'x_1' },
    { label: 'a/b', snippet: '\\frac{a}{b}' },
    { label: '√x', snippet: '\\sqrt{x}' },
    { label: 'n√x', snippet: '\\sqrt[n]{x}' },
    { label: '±', snippet: '\\pm' },
    { label: '×', snippet: '\\times' },
    { label: '÷', snippet: '\\div' },
    { label: '∑', snippet: '\\sum_{i=1}^{n}' },
    { label: '∫', snippet: '\\int_{0}^{1}' },
    { label: 'α', snippet: '\\alpha' },
    { label: 'β', snippet: '\\beta' },
    { label: 'θ', snippet: '\\theta' },
    { label: 'π', snippet: '\\pi' },
    { label: 'Δ', snippet: '\\Delta' },
    { label: '∞', snippet: '\\infty' },
    { label: '≤', snippet: '\\le' },
    { label: '≥', snippet: '\\ge' },
    { label: '≠', snippet: '\\neq' },
    { label: 'Quadratic', snippet: 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}' }
  ];

  // Quick Chemistry Snippets
  const chemTemplates = [
    { label: '→ (Arrow)', snippet: ' -> ' },
    { label: '⇌ (Reversible)', snippet: ' <-> ' },
    { label: 'Δ (Heat)', snippet: ' -[Δ]-> ' },
    { label: '(aq)', snippet: '(aq)' },
    { label: '(g)', snippet: '(g)' },
    { label: '(s)', snippet: '(s)' },
    { label: '(l)', snippet: '(l)' },
    { label: 'H₂SO₄', snippet: 'H2SO4' },
    { label: 'CaCO₃', snippet: 'CaCO3' },
    { label: 'CH₃COOH', snippet: 'CH3COOH' },
    { label: 'Na⁺', snippet: 'Na+' },
    { label: 'Cl⁻', snippet: 'Cl-' },
    { label: 'SO₄²⁻', snippet: 'SO4^2-' },
    { label: 'Fe³⁺', snippet: 'Fe^3+' },
    { label: '2H₂ + O₂ → 2H₂O', snippet: '2H2 + O2 -> 2H2O' },
    { label: 'Zn + 2HCl → ZnCl₂ + H₂', snippet: 'Zn + 2HCl -> ZnCl2 + H2' }
  ];

  const handleAppendMath = (snippet: string) => {
    setMathInput(prev => (prev ? `${prev} ${snippet}` : snippet));
  };

  const handleAppendChem = (snippet: string) => {
    setChemInput(prev => (prev ? `${prev}${snippet}` : snippet));
  };

  const insertCurrentMath = () => {
    if (!mathInput.trim()) return;
    onInsertMath(mathInput.trim(), isMathDisplayMode);
    setActiveTab(null);
  };

  const insertCurrentChem = () => {
    if (!chemInput.trim()) return;
    onInsertChemistry(chemInput.trim(), isReaction);
    setActiveTab(null);
  };

  return (
    <div className={`border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-xs overflow-hidden ${className}`}>
      {/* Top action buttons */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-50/80 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Insert Rich Content:
          </span>
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'math' ? null : 'math')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
              activeTab === 'math'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-zinc-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50'
            }`}
          >
            <Pi className="w-3.5 h-3.5" />
            <span>Math / LaTeX</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${activeTab === 'math' ? 'rotate-180' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'chem' ? null : 'chem')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
              activeTab === 'chem'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <Atom className="w-3.5 h-3.5" />
            <span>Chemistry Formula / Reaction</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${activeTab === 'chem' ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="text-[11px] text-zinc-400 hidden sm:block">
          Use $...$ or \(...\) inline in text anytime
        </div>
      </div>

      {/* MATH BUILDER PANEL */}
      {activeTab === 'math' && (
        <div className="p-4 bg-indigo-50/20 dark:bg-indigo-950/10 space-y-3.5 animate-fadeIn">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Mathematical Expression (LaTeX)
              </label>
              <div className="flex items-center gap-3 text-xs">
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-zinc-600 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    checked={isMathDisplayMode}
                    onChange={e => setIsMathDisplayMode(e.target.checked)}
                    className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Block / Centered Equation</span>
                </label>
              </div>
            </div>

            <textarea
              rows={2}
              value={mathInput}
              onChange={e => setMathInput(e.target.value)}
              placeholder="e.g. \frac{-b \pm \sqrt{b^2-4ac}}{2a} or x^2 + 2x + 1"
              className="w-full font-mono text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500"
            />
          </div>

          {/* Quick symbol shortcuts */}
          <div>
            <div className="text-[11px] font-medium text-zinc-500 mb-1.5">Quick Formulas & Symbols:</div>
            <div className="flex flex-wrap gap-1.5">
              {mathTemplates.map(tpl => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => handleAppendMath(tpl.snippet)}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-zinc-700 transition"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview */}
          <div className="p-3 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-zinc-900">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
              Live KaTeX Preview:
            </div>
            <div className="min-h-8 flex items-center justify-center">
              <MathRenderer math={mathInput} displayMode={isMathDisplayMode} />
            </div>
          </div>

          {/* Insert Action */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveTab(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={insertCurrentMath}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Insert Math into Question</span>
            </button>
          </div>
        </div>
      )}

      {/* CHEMISTRY BUILDER PANEL */}
      {activeTab === 'chem' && (
        <div className="p-4 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-3.5 animate-fadeIn">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Chemical Formula or Reaction Equation
              </label>
              <div className="flex items-center gap-3 text-xs">
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-zinc-600 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    checked={isReaction}
                    onChange={e => setIsReaction(e.target.checked)}
                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Reaction Equation (auto-converts -&gt; to → and &lt;-&gt; to ⇌)</span>
                </label>
              </div>
            </div>

            <input
              type="text"
              value={chemInput}
              onChange={e => setChemInput(e.target.value)}
              placeholder="e.g. 2H2 + O2 -> 2H2O or CaCO3 -> CaO + CO2 or H2SO4"
              className="w-full font-mono text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-emerald-500"
            />
          </div>

          {/* Quick chemistry shortcuts */}
          <div>
            <div className="text-[11px] font-medium text-zinc-500 mb-1.5">Quick Symbols & Pre-sets:</div>
            <div className="flex flex-wrap gap-1.5">
              {chemTemplates.map(tpl => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => handleAppendChem(tpl.snippet)}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-zinc-700 transition"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Chemistry Preview */}
          <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-zinc-900">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
              Formatted Chemistry Preview:
            </div>
            <div className="min-h-8 flex items-center justify-center">
              <ChemistryRenderer equation={isReaction ? chemInput : undefined} formula={!isReaction ? chemInput : undefined} displayMode />
            </div>
          </div>

          {/* Insert Action */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveTab(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={insertCurrentChem}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Insert Chemistry into Question</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
