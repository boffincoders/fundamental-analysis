import { safeDivide } from "../core/safeDivide";

/**
 * Net Debt
 * Total debt minus cash and cash equivalents.
 * A negative result means the company holds more cash than debt (net cash position).
 *
 * @param totalDebt Total debt (short-term + long-term)
 * @param cashAndEquivalents Cash and cash equivalents
 * @returns Net debt (can be negative for net cash companies)
 */
export const netDebt = (
  totalDebt: number,
  cashAndEquivalents: number
): number => totalDebt - cashAndEquivalents;

/**
 * Net Cash
 * Cash and cash equivalents in excess of total debt, floored at 0.
 * A positive result means the company could repay all its debt from cash today.
 *
 * @param totalDebt Total debt (short-term + long-term)
 * @param cashAndEquivalents Cash and cash equivalents
 * @returns Net cash (>= 0); 0 when debt is greater than or equal to cash
 */
export const netCash = (
  totalDebt: number,
  cashAndEquivalents: number
): number => Math.max(cashAndEquivalents - totalDebt, 0);

/**
 * Net Debt to EBITDA
 * Key leverage ratio used widely by analysts and credit agencies.
 * Indicates how many years of EBITDA it would take to repay all debt.
 *
 * Only defined for positive EBITDA. A negative result therefore always means
 * a net cash position (cash > debt), never a loss-making company.
 *
 * @param totalDebt Total debt
 * @param cashAndEquivalents Cash and equivalents
 * @param ebitda Earnings before interest, taxes, depreciation, and amortisation
 * @returns Ratio, or null if EBITDA is zero or negative (the ratio is not meaningful)
 */
export const netDebtToEbitda = (
  totalDebt: number,
  cashAndEquivalents: number,
  ebitda: number
): number | null => {
  if (ebitda == null || !(ebitda > 0)) return null;
  const nd = netDebt(totalDebt, cashAndEquivalents);
  return safeDivide(nd, ebitda);
};

/**
 * Debt to Assets Ratio
 * Shows what proportion of a company's assets are financed by debt.
 *
 * @param totalDebt Total debt
 * @param totalAssets Total assets
 * @returns Ratio (0-1 range) or null
 */
export const debtToAssets = (
  totalDebt: number,
  totalAssets: number
): number | null => safeDivide(totalDebt, totalAssets);
