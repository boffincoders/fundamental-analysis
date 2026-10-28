/**
 * Trailing Twelve Months (TTM) Utilities
 *
 * TTM aggregates the most recent four quarters of data to produce
 * an annualised figure without waiting for a full fiscal year.
 */

/**
 * Trailing Twelve Months Sum
 * Returns the sum of the last 4 quarterly values.
 * Expects values in chronological order: oldest first, most recent last.
 * e.g. [Q1, Q2, Q3, Q4, Q1_next, Q2_next] → sums last 4
 * Returns null when fewer than 4 quarters are supplied (a shorter sum is not
 * a twelve-month figure).
 */
export const computeTTM = (quarterlyValues: number[]): number | null => {
  if (!quarterlyValues || quarterlyValues.length < 4) return null;
  const last4 = quarterlyValues.slice(-4);
  return last4.reduce((sum, v) => sum + v, 0);
};

/**
 * Trailing Twelve Months Average
 * Returns the average of the last 4 quarterly values (or fewer if < 4 available).
 * Handles arrays shorter than 4 gracefully by averaging whatever is available.
 * Expects chronological order: oldest first, most recent last.
 */
export const computeTTMAvg = (quarterlyValues: number[]): number | null => {
  if (!quarterlyValues || quarterlyValues.length === 0) return null;
  const last4 = quarterlyValues.slice(-4);
  return last4.reduce((sum, v) => sum + v, 0) / last4.length;
};
