import { finiteOrNull } from "../core/finite";


/**
 * Graham Number
 * Formula: sqrt(22.5 * EPS * Book Value)
 * Interpretation:
 * - Price < Graham → undervalued
 * - Price > Graham → overvalued
 */
export const grahamNumber = (eps: number, book: number): number | null => {
  if (!Number.isFinite(eps) || !Number.isFinite(book) || eps <= 0 || book <= 0) return null;
  return finiteOrNull(Math.sqrt(22.5 * eps * book));
};
