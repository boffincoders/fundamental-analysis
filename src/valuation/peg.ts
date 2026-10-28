/**
 * Price/Earnings-to-Growth (PEG) Ratio
 * Formula: P/E Ratio / (Expected Annual EPS Growth Rate × 100)
 *
 * Units: `earningsGrowthRate` is a DECIMAL (0.15 = 15 % a year), the same
 * convention used everywhere else in this library. It is converted to a whole
 * percentage before dividing, which is how PEG is conventionally quoted
 * (Peter Lynch): a P/E of 30 with 15 % growth gives 30 / 15 = 2.0.
 *
 * Interpretation:
 * - < 1 → Undervalued relative to growth
 * - 1 → Fairly valued
 * - > 1 → Overvalued relative to growth
 *
 * Returns null when P/E is zero or negative (no earnings), or when growth is
 * zero or negative: PEG is not meaningful in either case.
 *
 * @param peRatio            Price / EPS
 * @param earningsGrowthRate Expected annual EPS growth as a decimal (0.15 = 15 %)
 */
export const peg = (peRatio: number, earningsGrowthRate: number): number | null => {
  if (peRatio == null || earningsGrowthRate == null) return null;
  if (!isFinite(peRatio) || !isFinite(earningsGrowthRate)) return null;
  if (peRatio <= 0 || earningsGrowthRate <= 0) return null;
  return peRatio / (earningsGrowthRate * 100);
};
