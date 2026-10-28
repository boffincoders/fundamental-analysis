import { safeDivide } from "../core/safeDivide";

/**
 * Payable Days (Days Payable Outstanding — DPO)
 * Formula: (Trade Payables / COGS) × 365
 * Interpretation:
 * - How many days on average it takes the company to pay its suppliers.
 * - Higher DPO can indicate strong bargaining power, but excessively high values
 *   may signal liquidity stress or strained supplier relationships.
 *
 * @param daysInPeriod Days covered by cogs: 365 for annual/TTM (default), ~91 for one quarter
 */
export const payableDays = (tradePayables: number, cogs: number, daysInPeriod = 365): number | null =>
  safeDivide(tradePayables * daysInPeriod, cogs);
