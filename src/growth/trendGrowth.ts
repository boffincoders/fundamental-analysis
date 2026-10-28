import { safeDivide } from "../core/safeDivide";

/**
 * Calculate basic growth rate given current and previous values.
 * Useful for building out mapping functions natively in the analyzer.
 */
export const calculateGrowthRate = (currentValue: number, previousValue: number): number | null => {
  if (previousValue === 0) return null; // Prevent infinity or nonsense returns

  // If both are negative and current is "less negative", it's growth, but math requires care
  // We generally use pure absolute change over previous absolute if previous was negative
  // to avoid confusing results. But the standard financial formula:
  return safeDivide(currentValue - previousValue, Math.abs(previousValue));
};

/**
 * Period-over-period growth rates, keeping undefined periods as null.
 * Expects oldest data first, newest data last. [2021, 2022, 2023]
 * A period whose previous value is 0 has no defined growth rate and is null.
 * Returns an array of length (N - 1).
 */
export const growthRates = (dataPoints: number[]): (number | null)[] => {
  const rates: (number | null)[] = [];
  if (!Array.isArray(dataPoints)) return rates;
  for (let i = 1; i < dataPoints.length; i++) {
    rates.push(calculateGrowthRate(dataPoints[i], dataPoints[i - 1]));
  }
  return rates;
};

/**
 * Calculates Year-over-Year (YoY) growth rates for a chronological array of annual data points.
 * Expects oldest data first, newest data last. [2021, 2022, 2023]
 *
 * Kept for backward compatibility: a period whose previous value is 0 (growth
 * undefined) is reported as 0 so the result stays number[]. Use growthRates()
 * to get null for those periods instead; medianGrowth() and
 * analyzeFundamentalTrends() already skip / report them as null.
 */
export const yoyGrowth = (dataPoints: number[]): number[] =>
  growthRates(dataPoints).map((rate) => (rate === null ? 0 : rate)); // length (N - 1)

/**
 * Calculates Quarter-over-Quarter (QoQ) growth rates for an array of quarterly data:
 * each quarter vs the quarter immediately before it, [Q1, Q2, Q3, Q4] in chronological order.
 * Same zero-handling as yoyGrowth(). For seasonal businesses, compare each quarter with the
 * same quarter a year earlier instead (e.g. computeHistoricalPoint(values, 4)).
 */
export const qoqGrowth = (dataPoints: number[]): number[] => yoyGrowth(dataPoints);

/**
 * Compound Annual Growth Rate (CAGR)
 * Formula: (Ending Value / Beginning Value) ^ (1 / Years) - 1
 * Returns null when the beginning value is <= 0 or the ending value is < 0
 * (CAGR is undefined across a sign change), or periods <= 0.
 */
export const cagr = (beginningValue: number, endingValue: number, periods: number): number | null => {
  if (!(periods > 0) || !(beginningValue > 0) || !(endingValue >= 0) || !Number.isFinite(endingValue)) return null;
  return Math.pow(endingValue / beginningValue, 1 / periods) - 1;
};

/**
 * Median Growth Rate
 * Calculates the YoY growth rates for a series of annual values (oldest first),
 * then returns the median of those rates.
 * Interpretation:
 * - More robust than mean growth because it is not skewed by outlier years.
 * - Useful for evaluating the "typical" annual growth of earnings, revenue, etc.
 * Periods whose previous value is 0 (growth undefined) are skipped.
 * Returns null if fewer than 2 data points are provided or no period has a defined rate.
 */
export const medianGrowth = (annualValues: number[]): number | null => {
  if (!Array.isArray(annualValues) || annualValues.length < 2) return null;

  // Periods with an undefined growth rate (previous value 0) are skipped, not counted as 0 %.
  const rates = growthRates(annualValues).filter((r): r is number => r !== null && isFinite(r));
  if (rates.length === 0) return null;

  const sorted = [...rates].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};
