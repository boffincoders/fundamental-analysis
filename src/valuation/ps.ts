import { safeDivide } from "../core/safeDivide";

/**
 * Price to Sales Ratio (P/S)
 * Formula: Price / Revenue Per Share
 * OR: Market Cap / Total Revenue
 * Interpretation:
 * - < 1 → Cheap relative to sales
 * - 1–2 → Average
 * - > 2 → Expensive (generic rule of thumb; software and other high-margin
 *   businesses routinely trade far higher)
 */
export const ps = (price: number, revenuePerShare: number): number | null =>
  safeDivide(price, revenuePerShare);

export const psFromMarketCap = (marketCap: number, totalRevenue: number): number | null =>
  safeDivide(marketCap, totalRevenue);
