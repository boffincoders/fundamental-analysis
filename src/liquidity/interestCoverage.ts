import { safeDivide } from "../core/safeDivide";

/**
 * Interest Coverage Ratio
 * Formula: EBIT (Operating Income) / |Interest Expense|
 * Interest expense is used as a magnitude, because some data providers report
 * it as a negative number. A negative result therefore always means negative
 * EBIT (earnings do not cover interest).
 * Interpretation:
 * - < 1.5 → Questionable ability to handle debt interest
 * - > 3.0 → Strong ability to meet interest obligations
 * Returns null when interest expense is 0 (no interest to cover).
 */
export const interestCoverage = (ebit: number, interestExpense: number): number | null =>
  safeDivide(ebit, Math.abs(interestExpense));
