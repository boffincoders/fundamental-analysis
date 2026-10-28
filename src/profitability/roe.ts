
import { safeDivide } from "../core/safeDivide";

/**
 * Return on Equity (ROE)
 * Formula: Net Income / Equity
 * Interpretation:
 * - > 15% → strong
 * - 10–15% → average
 * - < 10% → weak
 *
 * Returns null when equity is zero or negative: with negative equity a loss
 * would show as a positive ROE, so the ratio is not meaningful.
 */
export const roe = (netIncome: number, equity: number): number | null =>
  equity > 0 ? safeDivide(netIncome, equity) : null;
