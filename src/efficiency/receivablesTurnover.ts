import { safeDivide } from "../core/safeDivide";

/**
 * Receivables Turnover
 * How many times a company collects its average accounts receivable in a period.
 * Higher is better — indicates faster collection and less credit risk.
 *
 * @param totalRevenue Total revenue
 * @param tradeReceivables Trade receivables (accounts receivable)
 * @returns Receivables turnover ratio or null
 */
export const receivablesTurnover = (
  totalRevenue: number,
  tradeReceivables: number
): number | null => safeDivide(totalRevenue, tradeReceivables);

/**
 * Days Sales Outstanding (DSO)
 * The average number of days it takes to collect payment after a sale.
 * Formula: (Trade Receivables / Revenue) × 365  (= 365 / receivables turnover)
 * Lower is better — under 45 days is generally healthy.
 *
 * @param totalRevenue Total revenue for the period
 * @param tradeReceivables Trade receivables
 * @param daysInPeriod Days covered by totalRevenue: 365 for annual/TTM revenue (default), ~91 for one quarter
 * @returns DSO in days or null
 */
export const daysSalesOutstanding = (
  totalRevenue: number,
  tradeReceivables: number,
  daysInPeriod = 365
): number | null => safeDivide(tradeReceivables * daysInPeriod, totalRevenue);
