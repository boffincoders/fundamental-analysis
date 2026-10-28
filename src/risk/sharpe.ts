
import { safeDivide } from "../core/safeDivide";

/**
 * Sharpe Ratio (from precomputed inputs)
 * Formula: (Return - Risk Free Rate) / Std Dev
 *
 * All three inputs must be on the same period basis — normally annualised
 * return, annualised risk-free rate and annualised volatility. The evaluator
 * thresholds (1 = good, 2 = very good) assume annualised figures.
 * To compute from a series of periodic returns, use sharpeFromReturns().
 *
 * Interpretation:
 * - > 1 → good
 * - > 2 → very good
 * - < 1 → risky
 */
export const sharpe = (
  returnVal: number,
  riskFree: number,
  stdDev: number
): number | null => safeDivide(returnVal - riskFree, stdDev);

/**
 * Annualised Sharpe Ratio from a series of periodic returns
 *
 * Formula: mean(excess) × periodsPerYear / (sd(excess) × √periodsPerYear)
 *        = mean(excess) / sd(excess) × √periodsPerYear
 * where excess = periodReturn − riskFreePerPeriod and sd is the SAMPLE
 * standard deviation (n − 1).
 *
 * @param periodReturns      Simple returns per period as decimals (0.01 = 1 %), e.g. daily returns
 * @param riskFreePerPeriod  Risk-free rate for ONE period as a decimal (e.g. annual rate / 252 for daily data). Default 0.
 * @param periodsPerYear     252 for trading days, 52 weekly, 12 monthly, 4 quarterly. Default 252.
 * @returns Annualised Sharpe ratio, or null with fewer than 2 returns, zero
 *          volatility, a non-positive periodsPerYear, or non-finite input
 */
export const sharpeFromReturns = (
  periodReturns: number[],
  riskFreePerPeriod = 0,
  periodsPerYear = 252
): number | null => {
  if (!Array.isArray(periodReturns) || periodReturns.length < 2) return null;
  if (!Number.isFinite(riskFreePerPeriod) || !Number.isFinite(periodsPerYear) || periodsPerYear <= 0) return null;
  if (!periodReturns.every((r) => r != null && Number.isFinite(r))) return null;

  const excess = periodReturns.map((r) => r - riskFreePerPeriod);
  const n = excess.length;
  const mean = excess.reduce((s, v) => s + v, 0) / n;
  const variance = excess.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
  const sd = Math.sqrt(variance);
  if (sd === 0) return null;

  return (mean * periodsPerYear) / (sd * Math.sqrt(periodsPerYear));
};
