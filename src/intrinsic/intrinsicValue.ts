/**
 * Options for computeIntrinsicValue.
 */
export interface IntrinsicValueOptions {
  /** P/E multiple applied to the projected EPS at the end of the horizon. Default 15. Must be > 0. */
  terminalPE?: number;
  /** Annual required return used to discount the future price, as a decimal. Default 0.10. Must be > -1. */
  discountRate?: number;
  /** Projection horizon in years. Default 5. Must be > 0. */
  years?: number;
}

/**
 * Intrinsic Value per Share — EPS growth + exit multiple, discounted to today
 *
 * Method (a common "earnings-multiple DCF" used for screening):
 *   1. futureEps   = EPS × (1 + growthRate) ^ years
 *   2. futurePrice = futureEps × terminalPE
 *   3. presentVal  = futurePrice / (1 + discountRate) ^ years
 *   4. intrinsic   = presentVal × (1 − safetyMargin)
 *
 * The result is a PRICE per share (same currency as EPS), already reduced by
 * the margin of safety, so it can be compared directly to the market price.
 * Dividends paid during the horizon are ignored, which makes the estimate
 * slightly conservative for dividend payers.
 *
 * Example: EPS 10, growth 15 %, margin 25 %, defaults (P/E 15, 10 %, 5 yrs)
 *   10 × 1.15^5 = 20.11 → × 15 = 301.70 → ÷ 1.10^5 = 187.33 → × 0.75 = 140.50
 *
 * @param eps           Earnings Per Share (current or TTM). Must be > 0.
 * @param growthRate    Expected annual EPS growth over the horizon, as a decimal (0.15 = 15 %). Must be > -1.
 * @param safetyMargin  Margin of safety as a decimal in [0, 1) (0.25 = value reduced by 25 %).
 * @param options       terminalPE (default 15), discountRate (default 0.10), years (default 5).
 *
 * Interpretation:
 * - Market price < intrinsic value → potential undervaluation even after the margin of safety
 * - Highly sensitive to growthRate and terminalPE — stress-test with pessimistic inputs
 *
 * Returns null for non-positive EPS or any out-of-range / non-finite input.
 */
export const computeIntrinsicValue = (
  eps: number,
  growthRate: number,
  safetyMargin: number,
  options: IntrinsicValueOptions = {}
): number | null => {
  const { terminalPE = 15, discountRate = 0.10, years = 5 } = options;

  const inputs = [eps, growthRate, safetyMargin, terminalPE, discountRate, years];
  if (inputs.some((v) => v == null || !isFinite(v))) return null;
  if (eps <= 0) return null;
  if (growthRate <= -1) return null;
  if (safetyMargin < 0 || safetyMargin >= 1) return null;
  if (terminalPE <= 0) return null;
  if (discountRate <= -1) return null;
  if (years <= 0) return null;

  const futureEps = eps * Math.pow(1 + growthRate, years);
  const futurePrice = futureEps * terminalPE;
  const presentValue = futurePrice / Math.pow(1 + discountRate, years);
  return presentValue * (1 - safetyMargin);
};
