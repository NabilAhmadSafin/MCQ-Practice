import React, { useState } from 'react';
import { Pi, Atom, ChevronDown, Plus } from 'lucide-react';
import { MathRenderer } from './MathRenderer';
import { ChemistryRenderer } from './ChemistryRenderer';

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

  const [mathInput, setMathInput] = useState('x^2 - 5x + 6 = 0');
  const [isMathDisplayMode, setIsMathDisplayMode] = useState(false);

  const [chemInput, setChemInput] = useState('2H2 + O2 -> 2H2O');
  const [isReaction, setIsReaction] = useState(true);

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
    <div className={`lc-glass-subtle rounded-[12px] overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-white/[0.025] border-b border-[var(--lc-divider)]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-[var(--lc-text-secondary)]">
            Insert Rich Content:
          </span>
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'math' ? null : 'math')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-xs font-semibold border transition-colors ${
              activeTab === 'math'
                ? 'bg-indigo-500 text-white border-indigo-400/40 shadow-sm'
                : 'bg-white/[0.04] text-indigo-300 border-indigo-400/25 hover:bg-indigo-500/15'
            }`}
          >
            <Pi className="w-3.5 h-3.5" />
            <span>Math / LaTeX</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${activeTab === 'math' ? 'rotate-180' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'chem' ? null : 'chem')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-xs font-semibold border transition-colors ${
              activeTab === 'chem'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400/40 shadow-sm'
                : 'bg-white/[0.04] text-emerald-300 border-emerald-400/25 hover:bg-emerald-500/15'
            }`}
          >
            <Atom className="w-3.5 h-3.5" />
            <span>Chemistry Formula / Reaction</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${activeTab === 'chem' ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="text-[11px] text-[var(--lc-text-muted)] hidden sm:block">
          Use $...$ or \(...\) inline in text anytime
        </div>
      </div>

      {activeTab === 'math' && (
        <div className="p-4 bg-indigo-500/[0.05] space-y-3.5 animate-fadeIn">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[var(--lc-text)]">
                Mathematical Expression (LaTeX)
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-[var(--lc-text-secondary)]">
                <input
                  type="checkbox"
                  checked={isMathDisplayMode}
                  onChange={e => setIsMathDisplayMode(e.target.checked)}
                  className="rounded accent-indigo-400"
                />
                <span>Block / Centered Equation</span>
              </label>
            </div>

            <textarea
              rows={2}
              value={mathInput}
              onChange={e => setMathInput(e.target.value)}
              placeholder="e.g. \frac{-b \pm \sqrt{b^2-4ac}}{2a} or x^2 + 2x + 1"
              className="lc-input w-full font-mono text-xs px-3 py-2"
            />
          </div>

          <div>
            <div className="text-[11px] font-medium text-[var(--lc-text-secondary)] mb-1.5">
              Quick Formulas &amp; Symbols:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {mathTemplates.map(tpl => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => handleAppendMath(tpl.snippet)}
                  className="px-2 py-1 rounded-[8px] bg-white/[0.05] border border-[var(--lc-border)] text-xs font-mono text-[var(--lc-text)] hover:border-indigo-400/50 hover:text-indigo-300 transition-colors"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-[10px] border border-indigo-400/25 bg-black/25">
            <div className="text-[11px] font-medium text-indigo-300 mb-1">
              Live KaTeX Preview
            </div>
            <div className="min-h-8 flex items-center justify-center">
              <MathRenderer math={mathInput} displayMode={isMathDisplayMode} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveTab(null)}
              className="lc-btn-ghost px-3 py-1.5 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={insertCurrentMath}
              className="lc-btn-primary inline-flex items-center gap-1.5 px-4 py-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Insert Math into Question</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'chem' && (
        <div className="p-4 bg-emerald-500/[0.05] space-y-3.5 animate-fadeIn">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label className="text-xs font-semibold text-[var(--lc-text)]">
                Chemical Formula or Reaction Equation
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-[var(--lc-text-secondary)]">
                <input
                  type="checkbox"
                  checked={isReaction}
                  onChange={e => setIsReaction(e.target.checked)}
                  className="rounded accent-emerald-400"
                />
                <span>Reaction Equation (auto-converts -&gt; to → and &lt;-&gt; to ⇌)</span>
              </label>
            </div>

            <input
              type="text"
              value={chemInput}
              onChange={e => setChemInput(e.target.value)}
              placeholder="e.g. 2H2 + O2 -> 2H2O or CaCO3 -> CaO + CO2 or H2SO4"
              className="lc-input w-full font-mono text-xs px-3 py-2"
            />
          </div>

          <div>
            <div className="text-[11px] font-medium text-[var(--lc-text-secondary)] mb-1.5">
              Quick Symbols &amp; Pre-sets:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {chemTemplates.map(tpl => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => handleAppendChem(tpl.snippet)}
                  className="px-2 py-1 rounded-[8px] bg-white/[0.05] border border-[var(--lc-border)] text-xs font-mono text-[var(--lc-text)] hover:border-emerald-400/50 hover:text-emerald-300 transition-colors"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-[10px] border border-emerald-400/25 bg-black/25">
            <div className="text-[11px] font-medium text-emerald-300 mb-1">
              Formatted Chemistry Preview
            </div>
            <div className="min-h-8 flex items-center justify-center">
              <ChemistryRenderer
                equation={isReaction ? chemInput : undefined}
                formula={!isReaction ? chemInput : undefined}
                displayMode
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveTab(null)}
              className="lc-btn-ghost px-3 py-1.5 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={insertCurrentChem}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[10px] text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors"
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
