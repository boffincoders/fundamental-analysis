
/**
 * Division that never returns NaN or ±Infinity.
 * Returns null when the denominator is 0, either input is missing or
 * non-finite, or the result is not a finite number.
 */
export function safeDivide(n: number, d: number): number | null {
  if (!d || !Number.isFinite(d) || n == null || !Number.isFinite(n)) return null;
  const result = n / d;
  return Number.isFinite(result) ? result : null;
}
