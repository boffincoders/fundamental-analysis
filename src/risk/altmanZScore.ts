/**
 * Shared ratio builder for the Altman models.
 * Returns null when any input is missing / non-finite, total assets are not
 * positive, or total liabilities are negative.
 *
 * Total liabilities of exactly 0 make the equity / liabilities term
 * unbounded. Instead of returning null for a liability-free company, that
 * term is capped at ALTMAN_MAX_EQUITY_TO_LIABILITIES, which on its own
 * already places the company well inside the safe zone of either model.
 */
export const ALTMAN_MAX_EQUITY_TO_LIABILITIES = 10;

const isNum = (v: number) => v != null && Number.isFinite(v);

const equityToLiabilities = (equity: number, totalLiabilities: number): number =>
  totalLiabilities === 0
    ? (equity > 0 ? ALTMAN_MAX_EQUITY_TO_LIABILITIES : 0)
    : equity / totalLiabilities;

/**
 * Altman Z-Score — ORIGINAL (1968) model for publicly traded manufacturers
 * Formula: 1.2A + 1.4B + 3.3C + 0.6D + 1.0E
 * Where:
 * A = Working Capital / Total Assets
 * B = Retained Earnings / Total Assets
 * C = EBIT / Total Assets
 * D = Market Value of Equity / Total Liabilities
 * E = Sales / Total Assets
 *
 * Interpretation:
 * - > 2.99 → "Safe" Zone
 * - 1.81 to 2.99 → "Grey" Zone
 * - < 1.81 → "Distress" Zone (High probability of bankruptcy)
 *
 * The coefficients and zones were fitted on US public manufacturing firms.
 * For service, technology, retail or private companies, and for companies
 * outside the US, prefer altmanZScoreDoublePrime(). The model is not
 * meaningful for banks, insurers and other financial companies.
 *
 * Returns null if any input is missing or non-finite, total assets <= 0, or
 * total liabilities < 0. Total liabilities of 0 are allowed (see
 * ALTMAN_MAX_EQUITY_TO_LIABILITIES).
 */
export const altmanZScore = (
  workingCapital: number,
  retainedEarnings: number,
  ebit: number,
  marketValueEquity: number,
  sales: number,
  totalAssets: number,
  totalLiabilities: number
): number | null => {
  const inputs = [workingCapital, retainedEarnings, ebit, marketValueEquity, sales, totalAssets, totalLiabilities];
  if (!inputs.every(isNum)) return null;
  if (totalAssets <= 0 || totalLiabilities < 0) return null;

  const A = workingCapital / totalAssets;
  const B = retainedEarnings / totalAssets;
  const C = ebit / totalAssets;
  const D = equityToLiabilities(marketValueEquity, totalLiabilities);
  const E = sales / totalAssets;

  return 1.2 * A + 1.4 * B + 3.3 * C + 0.6 * D + 1.0 * E;
};

/**
 * Altman Z''-Score — model for NON-MANUFACTURERS and PRIVATE firms (Altman 1995)
 * Formula: 6.56A + 3.26B + 6.72C + 1.05D
 * Where:
 * A = Working Capital / Total Assets
 * B = Retained Earnings / Total Assets
 * C = EBIT / Total Assets
 * D = Book Value of Equity / Total Liabilities
 *
 * Drops the sales-turnover term (which varies widely by industry) and uses
 * book rather than market equity, so it also works for unlisted companies.
 *
 * Interpretation:
 * - > 2.6 → "Safe" Zone
 * - 1.1 to 2.6 → "Grey" Zone
 * - < 1.1 → "Distress" Zone
 *
 * This is the version without the +3.25 constant used in Altman's
 * emerging-market variant; do not compare it against those thresholds.
 * Not meaningful for banks, insurers and other financial companies.
 *
 * Returns null under the same conditions as altmanZScore().
 */
export const altmanZScoreDoublePrime = (
  workingCapital: number,
  retainedEarnings: number,
  ebit: number,
  bookEquity: number,
  totalAssets: number,
  totalLiabilities: number
): number | null => {
  const inputs = [workingCapital, retainedEarnings, ebit, bookEquity, totalAssets, totalLiabilities];
  if (!inputs.every(isNum)) return null;
  if (totalAssets <= 0 || totalLiabilities < 0) return null;

  const A = workingCapital / totalAssets;
  const B = retainedEarnings / totalAssets;
  const C = ebit / totalAssets;
  const D = equityToLiabilities(bookEquity, totalLiabilities);

  return 6.56 * A + 3.26 * B + 6.72 * C + 1.05 * D;
};
