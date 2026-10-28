import { safeDivide } from "../core/safeDivide";

/**
 * Return on Invested Capital (ROIC)
 * Formula: NOPAT / Invested Capital
 * NOPAT = Operating Income * (1 - Tax Rate)
 * Invested Capital = Total Debt + Total Equity - Cash & Equivalents
 * Interpretation:
 * - ROIC above the company's cost of capital (WACC) creates value.
 * - Shows how well a company allocates capital to generate returns.
 *
 * @param taxRate Effective tax rate as a decimal (0.25 = 25 %)
 * Returns null when invested capital is zero or negative (not meaningful).
 */
export const roic = (
  operatingIncome: number,
  taxRate: number,
  totalDebt: number,
  totalEquity: number,
  cashAndEquivalents: number
): number | null => {
  const nopat = operatingIncome * (1 - taxRate);
  const investedCapital = totalDebt + totalEquity - cashAndEquivalents;
  if (!(investedCapital > 0)) return null;
  return safeDivide(nopat, investedCapital);
};
