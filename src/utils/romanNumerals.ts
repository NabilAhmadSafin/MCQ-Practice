/**
 * Converts a positive number to lower-case Roman numeral (1 -> i, 2 -> ii, 3 -> iii, etc.)
 */
export function toRomanNumeral(num: number): string {
  if (num <= 0) return String(num);
  const romanMap: [number, string][] = [
    [50, 'l'],
    [40, 'xl'],
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i']
  ];
  let n = num;
  let result = '';
  for (const [val, letter] of romanMap) {
    while (n >= val) {
      result += letter;
      n -= val;
    }
  }
  return result || String(num);
}
