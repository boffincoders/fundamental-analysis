import { safeDivide } from "../core/safeDivide";

/**
 * Cash Conversion Ratio (CCR)
 * Measures the quality of reported earnings by comparing operating cash flow
 * to net income. A ratio > 1 means earnings are well-supported by actual cash.
 * Low or negative CCR is a red flag for earnings quality.
 *
 * @param operatingCashFlow Cash flow from operations
 * @param netIncome Net income (profit after tax)
 * @returns CCR ratio, or null when net income is zero or negative (a loss with
 *          negative cash flow would otherwise show as a "high quality" ratio)
 */
export const cashConversionRatio = (
  operatingCashFlow: number,
  netIncome: number
): number | null => (netIncome > 0 ? safeDivide(operatingCashFlow, netIncome) : null);
