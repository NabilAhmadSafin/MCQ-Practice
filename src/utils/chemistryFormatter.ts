/**
 * Chemistry formatting utilities for chemical formulas, ions, charges, and reactions.
 */

// Unicode Subscript Map
const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉'
};

// Unicode Superscript Map for charges & powers
const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '=': '⁼'
};

/**
 * Converts a single number or string of digits to subscript
 */
export function toSubscript(str: string): string {
  return str
    .split('')
    .map(ch => SUBSCRIPT_MAP[ch] || ch)
    .join('');
}

/**
 * Converts numbers/signs to superscript
 */
export function toSuperscript(str: string): string {
  return str
    .split('')
    .map(ch => SUPERSCRIPT_MAP[ch] || ch)
    .join('');
}

/**
 * Formats a single chemical formula or ion token:
 * e.g. "H2SO4" -> "H₂SO₄"
 * e.g. "Fe3+" or "Fe^3+" -> "Fe³⁺"
 * e.g. "SO4^2-" or "SO4 2-" -> "SO₄²⁻"
 * e.g. "(NH4)2SO4" -> "(NH₄)₂SO₄"
 * e.g. "Ca(OH)2" -> "Ca(OH)₂"
 * e.g. "CH3COOH" -> "CH₃COOH"
 */
export function formatChemicalFormula(formula: string): string {
  if (!formula || typeof formula !== 'string') return '';

  let res = formula.trim();

  // First handle explicit superscript syntax: ^2+, ^3+, ^+, ^-, ^2-
  res = res.replace(/\^([0-9]*[\+\-])/g, (_, charge) => toSuperscript(charge));

  // Handle ion charges attached to end of formulas:
  // e.g. "Fe3+" -> "Fe³⁺", "Cu2+" -> "Cu²⁺", "Cl-" -> "Cl⁻", "Na+" -> "Na⁺"
  // Look for element or parenthesis followed by charge
  res = res.replace(/([A-Za-z\)\]])(\d*)([\+\-])(?!\w)/g, (match, base, num, sign) => {
    return base + toSuperscript(num + sign);
  });

  // Handle numbers following element symbols or closing brackets:
  // e.g. "H2" -> "H₂", "O4" -> "O₄", ")2" -> ")₂", "]3" -> "]₃"
  res = res.replace(/([A-Za-z\)\]])(\d+)/g, (match, letterOrParen, digits) => {
    return letterOrParen + toSubscript(digits);
  });

  return res;
}

/**
 * Formats a complete chemical reaction equation:
 * e.g. "2H2 + O2 -> 2H2O" -> "2H₂ + O₂ → 2H₂O"
 * e.g. "CaCO3 -> CaO + CO2" -> "CaCO₃ → CaO + CO₂"
 * e.g. "Zn + 2HCl -> ZnCl2 + H2" -> "Zn + 2HCl → ZnCl₂ + H₂"
 * e.g. "CH3COOH + C2H5OH <-> CH3COOC2H5 + H2O" -> "CH₃COOH + C₂H₅OH ⇌ CH₃COOC₂H₅ + H₂O"
 * e.g. "N2(g) + 3H2(g) <=> 2NH3(g)" -> "N₂(g) + 3H₂(g) ⇌ 2NH₃(g)"
 */
export function formatChemicalReaction(reaction: string): string {
  if (!reaction || typeof reaction !== 'string') return '';

  // Replace arrow shortcuts with clean Unicode arrows
  let formatted = reaction
    .replace(/<==>|<=>|<->/g, ' ⇌ ')
    .replace(/-->|->/g, ' → ')
    .replace(/<--|<-/g, ' ← ')
    .replace(/\s+/g, ' ')
    .trim();

  // Handle temperature / catalyst conditions e.g. "-[Δ]->" or "->[heat]->"
  formatted = formatted.replace(/-\[([^\]]+)\]->/g, ' ⎯⎯⎯($1)⎯⎯→ ');

  // Split equation into tokens preserving operators and arrows
  // Operators: +, →, ⇌, ←, ⎯⎯⎯...
  const tokens = formatted.split(/(\s+[+\-→⇌←]\s+|\s+⎯⎯⎯.+?⎯⎯→\s+)/g);

  return tokens
    .map(token => {
      const trimmed = token.trim();
      if (['+', '→', '⇌', '←'].includes(trimmed) || trimmed.startsWith('⎯⎯⎯')) {
        return ` ${trimmed} `;
      }

      // Check if this is a reactant / product term with a coefficient:
      // e.g. "2H2", "5 H2O", "1/2 O2", "3BaCl2"
      const termMatch = token.match(/^(\s*)(\d+(?:\/\d+)?(?:\.\d+)?\s*)([A-Za-z0-9\(\)\[\]\^+\-]+)(\([sSlLgG]|aq|AQ\))?(\s*)$/);
      if (termMatch) {
        const leading = termMatch[1];
        const coeff = termMatch[2].trim();
        const formula = formatChemicalFormula(termMatch[3]);
        const state = termMatch[4] ? termMatch[4] : '';
        const trailing = termMatch[5];
        return `${leading}${coeff} ${formula}${state}${trailing}`;
      }

      // If token contains state notation: e.g. "H2(g)" or "NaCl(aq)"
      const stateMatch = token.match(/^(\s*)([A-Za-z0-9\(\)\[\]\^+\-]+)(\([sSlLgG]|aq|AQ\))(\s*)$/);
      if (stateMatch) {
        return `${stateMatch[1]}${formatChemicalFormula(stateMatch[2])}${stateMatch[3]}${stateMatch[4]}`;
      }

      // Default formula formatting
      return formatChemicalFormula(token);
    })
    .join('')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Checks if a string likely represents a chemical equation
 */
export function isLikelyChemicalReaction(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  // Contains an arrow and plus sign or chemical formula characters
  const hasArrow = /->|<->|<=>|-->|→|⇌/.test(text);
  const hasFormulaChars = /[A-Z][a-z]?\d*/.test(text);
  return hasArrow && hasFormulaChars;
}

/**
 * Checks if a short token looks like a chemical formula (e.g. H2O, CO2, H2SO4, NaCl, CH4)
 */
export function isLikelyChemicalFormula(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  // Typical chemical formula regex: starts with capital letter, contains elements and numbers
  return /^[A-Z][a-z]?\d*(?:[A-Z][a-z]?\d*|\([A-Za-z0-9]+\)\d*)+[0-9]*[\+\-]?$/.test(trimmed);
}
