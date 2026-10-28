export type MetricStatus = "Good" | "Neutral" | "Bad" | "N/A";

export interface EvaluatedMetric {
  value: number | null;
  status: MetricStatus;
  insight: string;
}

/**
 * The Evaluator centralizes interpretation of all financial metrics.
 * It provides beginner-friendly insights.
 *
 * IMPORTANT: every threshold here is a fixed, generic rule of thumb. It is
 * sector-blind and market-blind. Normal ranges differ widely by industry
 * (a P/E of 30 is ordinary for software, high for a utility; a current ratio
 * of 0.8 is normal for a supermarket) and by market and interest-rate regime.
 * Ratios such as current ratio, EV/EBITDA, inventory turnover and Altman Z
 * are not meaningful for banks and insurers. Use the status as a first-pass
 * screen and compare against sector peers before drawing conclusions.
 */
export const evaluate = {
  // ── Valuation ─────────────────────────────────────────────────────────────

  pe: (value: number | null): EvaluatedMetric => {
    if (value === null || value <= 0) return { value, status: "N/A", insight: "Earnings are negative or unavailable." };
    if (value < 15) return { value, status: "Good", insight: "Potentially undervalued or a value stock (generic threshold; compare with sector peers)." };
    if (value <= 25) return { value, status: "Neutral", insight: "Fairly valued by generic standards." };
    return { value, status: "Bad", insight: "Expensive by generic standards. High growth is priced in; normal for some sectors." };
  },

  pb: (value: number | null): EvaluatedMetric => {
    if (value === null || value <= 0) return { value, status: "N/A", insight: "Book value negative or unavailable." };
    if (value < 1) return { value, status: "Good", insight: "Trading below book value — possibly undervalued, or the market doubts the assets." };
    if (value <= 3) return { value, status: "Neutral", insight: "Moderate premium to book value." };
    return { value, status: "Bad", insight: "High premium to book value (common for asset-light businesses)." };
  },

  ps: (value: number | null): EvaluatedMetric => {
    if (value === null || value <= 0) return { value, status: "N/A", insight: "Sales data unavailable." };
    if (value < 1) return { value, status: "Good", insight: "Cheap relative to sales." };
    if (value <= 2) return { value, status: "Neutral", insight: "Average price relative to sales." };
    return { value, status: "Bad", insight: "Expensive relative to sales by generic standards; high-margin sectors trade higher." };
  },

  /**
   * PEG — expects the output of peg(), i.e. P/E ÷ growth expressed in whole
   * percent (P/E 30, 15 % growth → 2.0).
   */
  peg: (value: number | null): EvaluatedMetric => {
    if (value === null || value <= 0) return { value, status: "N/A", insight: "PEG not meaningful (negative earnings or zero/negative expected growth)." };
    if (value < 1) return { value, status: "Good", insight: "Undervalued relative to expected growth." };
    if (value <= 1.5) return { value, status: "Neutral", insight: "Fairly valued relative to growth." };
    return { value, status: "Bad", insight: "Overvalued relative to growth expectations." };
  },

  evEbitda: (value: number | null): EvaluatedMetric => {
    if (value === null || value <= 0) return { value, status: "N/A", insight: "Not meaningful: EBITDA negative/unavailable, or enterprise value zero/negative." };
    if (value < 10) return { value, status: "Good", insight: "Cheap relative to operating earnings by generic standards." };
    if (value <= 15) return { value, status: "Neutral", insight: "Fairly valued by generic standards." };
    return { value, status: "Bad", insight: "Expensive relative to operating earnings; compare with sector peers." };
  },

  dividendYield: (value: number | null): EvaluatedMetric => {
    if (value === null) return { value, status: "N/A", insight: "Dividend data not available." };
    if (value > 0.02 && value < 0.06) return { value, status: "Good", insight: "Healthy and sustainable dividend." };
    if (value >= 0.06) return { value, status: "Neutral", insight: "High dividend, ensure it's not a value trap." };
    if (value > 0) return { value, status: "Neutral", insight: "Small dividend payout." };
    return { value: 0, status: "N/A", insight: "No dividend paid." };
  },

  /**
   * Price-to-Cash-Flow
   * Cash flow is harder to manipulate than earnings, making this a more
   * conservative valuation check.
   */
  priceToCashFlow: (value: number | null): EvaluatedMetric => {
    if (value === null || value <= 0) return { value, status: "N/A", insight: "Negative or unavailable cash flow." };
    if (value < 10) return { value, status: "Good", insight: "Attractive valuation relative to cash flow." };
    if (value <= 20) return { value, status: "Neutral", insight: "Fairly valued on a cash flow basis." };
    return { value, status: "Bad", insight: "Expensive relative to cash generated." };
  },

  /**
   * Earnings Yield (inverse of P/E, expressed as a decimal)
   * Comparable to bond yields — helps assess opportunity cost.
   */
  earningsYield: (value: number | null): EvaluatedMetric => {
    if (value === null || value <= 0) return { value, status: "N/A", insight: "Negative earnings or unavailable." };
    const pct = Math.round(value * 10000) / 100; // e.g. 0.0667 → 6.67%
    if (value > 0.0667) return { value, status: "Good", insight: `Strong ${pct}% earnings yield (P/E below 15). Compare with current government bond yields.` };
    if (value >= 0.04) return { value, status: "Neutral", insight: `Moderate ${pct}% earnings yield (P/E 15–25).` };
    return { value, status: "Bad", insight: `Low ${pct}% earnings yield (P/E above 25) — may be expensive relative to bonds.` };
  },

  /**
   * EV/Revenue — especially relevant for pre-profit or high-growth companies.
   */
  evRevenue: (value: number | null): EvaluatedMetric => {
    if (value === null || value <= 0) return { value, status: "N/A", insight: "Not meaningful: revenue unavailable, or enterprise value zero/negative." };
    if (value < 1) return { value, status: "Good", insight: "Very cheap relative to revenue." };
    if (value <= 3) return { value, status: "Neutral", insight: "Reasonable revenue multiple." };
    return { value, status: "Bad", insight: "High revenue multiple — growth must justify the premium." };
  },

  /**
   * EV/FCF — one of the most reliable valuation multiples for mature businesses.
   */
  evFcf: (value: number | null): EvaluatedMetric => {
    if (value === null || value <= 0) return { value, status: "N/A", insight: "Not meaningful: free cash flow negative/unavailable, or enterprise value zero/negative." };
    if (value < 15) return { value, status: "Good", insight: "Attractively priced on a free cash flow basis." };
    if (value <= 25) return { value, status: "Neutral", insight: "Fairly valued on a free cash flow basis." };
    return { value, status: "Bad", insight: "Expensive on a free cash flow basis." };
  },

  /**
   * Graham Number Margin of Safety
   * Compares the Graham intrinsic value to the current price.
   * A positive margin means the stock trades below its Graham value.
   *
   * @param grahamValue Result of grahamNumber(eps, bookValuePerShare)
   * @param currentPrice Current market price
   */
  grahamNumber: (grahamValue: number | null, currentPrice: number): EvaluatedMetric => {
    if (grahamValue === null || grahamValue <= 0) return { value: null, status: "N/A", insight: "Graham Number unavailable (negative EPS or book value)." };
    if (!(currentPrice > 0)) return { value: grahamValue, status: "N/A", insight: "Current price unavailable — cannot compare with the Graham Number." };
    const margin = (grahamValue - currentPrice) / grahamValue;
    const pct = Math.round(margin * 100);
    if (margin >= 0.20) return { value: grahamValue, status: "Good", insight: `${pct}% margin of safety — trading well below Graham intrinsic value.` };
    if (margin >= 0) return { value: grahamValue, status: "Neutral", insight: `Modest ${pct}% margin of safety vs Graham Number.` };
    return { value: grahamValue, status: "Bad", insight: `Trading ${Math.abs(pct)}% above Graham intrinsic value.` };
  },

  /**
   * DCF Implied Price vs Current Price
   * Compares the DCF model's implied share price to the current market price.
   *
   * @param impliedPrice Result of impliedSharePrice()
   * @param currentPrice Current market price
   */
  dcf: (impliedPrice: number | null, currentPrice: number): EvaluatedMetric => {
    if (impliedPrice === null || impliedPrice <= 0) return { value: null, status: "N/A", insight: "DCF model could not produce a valid implied price." };
    if (!(currentPrice > 0)) return { value: impliedPrice, status: "N/A", insight: "Current price unavailable — cannot compare with the DCF value." };
    const upside = (impliedPrice - currentPrice) / currentPrice;
    const pct = Math.round(upside * 100);
    if (upside >= 0.15) return { value: impliedPrice, status: "Good", insight: `DCF implies ${pct}% upside — potentially undervalued.` };
    if (upside >= -0.10) return { value: impliedPrice, status: "Neutral", insight: `DCF implied price is close to market (${pct >= 0 ? '+' : ''}${pct}%).` };
    return { value: impliedPrice, status: "Bad", insight: `DCF implies ${Math.abs(pct)}% downside — market may be overpricing the stock.` };
  },

  // ── Profitability ──────────────────────────────────────────────────────────

  roa: (value: number | null): EvaluatedMetric => {
    if (value === null) return { value, status: "N/A", insight: "Assets or Income unavailable." };
    if (value >= 0.05) return { value, status: "Good", insight: "Efficiently using assets to generate profit." };
    if (value > 0) return { value, status: "Neutral", insight: "Positive but low asset efficiency." };
    return { value, status: "Bad", insight: "Losing money on its assets." };
  },

  roe: (value: number | null): EvaluatedMetric => {
    if (value === null) return { value, status: "N/A", insight: "Equity or Income unavailable." };
    if (value >= 0.15) return { value, status: "Good", insight: "Strong return on shareholder equity." };
    if (value >= 0.10) return { value, status: "Neutral", insight: "Average return on equity." };
    return { value, status: "Bad", insight: "Weak or negative return on equity." };
  },

  roic: (value: number | null): EvaluatedMetric => {
    if (value === null) return { value, status: "N/A", insight: "NOPAT unavailable, or invested capital zero/negative (e.g. net cash exceeds debt + equity)." };
    if (value >= 0.10) return { value, status: "Good", insight: "Strong return on capital — above a typical cost of capital (~8–10 %)." };
    if (value > 0.05) return { value, status: "Neutral", insight: "Moderate return on capital — compare with the company's own cost of capital." };
    return { value, status: "Bad", insight: "Low return on capital — likely below the cost of capital." };
  },

  margin: (value: number | null, name: string): EvaluatedMetric => {
    if (value === null) return { value, status: "N/A", insight: "Margin data unavailable." };
    if (value > 0.20) return { value, status: "Good", insight: `Very strong ${name} margin.` };
    if (value > 0.05) return { value, status: "Neutral", insight: `Healthy ${name} margin.` };
    if (value > 0) return { value, status: "Bad", insight: `Very tight ${name} margin.` };
    if (value === 0) return { value, status: "Bad", insight: `Break-even ${name} margin.` };
    return { value, status: "Bad", insight: `Negative ${name} margin.` };
  },

  // ── Liquidity & Solvency ───────────────────────────────────────────────────

  currentRatio: (value: number | null): EvaluatedMetric => {
    if (value === null) return { value, status: "N/A", insight: "Liquidity data unavailable." };
    if (value >= 1.2 && value <= 2) return { value, status: "Good", insight: "Healthy short-term liquidity." };
    if (value > 2) return { value, status: "Neutral", insight: "Highly liquid, possibly inefficient use of assets." };
    return { value, status: "Bad", insight: "Struggling to cover short-term liabilities (< 1.2)." };
  },

  quickRatio: (value: number | null): EvaluatedMetric => {
    if (value === null) return { value, status: "N/A", insight: "Liquidity data unavailable." };
    if (value >= 1.0) return { value, status: "Good", insight: "Can cover short term liabilities without selling inventory." };
    return { value, status: "Bad", insight: "Cannot cover liabilities immediately without inventory sales." };
  },

  debtToEquity: (value: number | null): EvaluatedMetric => {
    if (value === null) return { value, status: "N/A", insight: "Debt data unavailable." };
    if (value < 0) return { value, status: "Bad", insight: "Negative shareholder equity — liabilities exceed assets." };
    if (value < 1.0) return { value, status: "Good", insight: "Funded mostly by equity. Low debt risk." };
    if (value <= 2.0) return { value, status: "Neutral", insight: "Average leverage." };
    return { value, status: "Bad", insight: "High financial leverage. High risk." };
  },

  interestCoverage: (value: number | null): EvaluatedMetric => {
    if (value === null) return { value, status: "N/A", insight: "No interest expense, or EBIT unavailable." };
    if (value <= 0) return { value, status: "Bad", insight: "EBIT is zero or negative — operating earnings do not cover interest." };
    if (value >= 3.0) return { value, status: "Good", insight: "Easily pays interest on outstanding debt." };
    if (value >= 1.5) return { value, status: "Neutral", insight: "Can pay interest, but margin of safety is narrow." };
    return { value, status: "Bad", insight: "High risk of default on debt interest." };
  },

  /**
   * Net Debt (total debt − cash). Negative = net cash. A positive figure is
   * not good or bad on its own; judge it with netDebtToEbitda.
   */
  netDebt: (value: number | null): EvaluatedMetric => {
    if (value === null) return { value, status: "N/A", insight: "Debt or cash data unavailable." };
    if (value < 0) return { value, status: "Good", insight: `Net cash position of ${Math.abs(value).toLocaleString()}.` };
    if (value === 0) return { value, status: "Neutral", insight: "Cash exactly offsets debt." };
    return { value, status: "Neutral", insight: `Net debt of ${value.toLocaleString()}. Judge it against EBITDA (Net Debt / EBITDA).` };
  },

  /**
   * Net Debt to EBITDA — key leverage metric used by credit analysts.
   *
   * Pass `context` ({ netDebt, ebitda }) whenever you have it: the rating then
   * comes from the sign of net debt and EBITDA themselves, so a loss-maker
   * (negative EBITDA) with net debt is rated Bad, never "net cash".
   * Without context, `value` is assumed to come from netDebtToEbitda(), which
   * returns null for EBITDA <= 0 — so a negative value can only mean net cash.
   */
  netDebtToEbitda: (
    value: number | null,
    context?: { netDebt?: number | null; ebitda?: number | null }
  ): EvaluatedMetric => {
    const nd = context?.netDebt;
    const ebitda = context?.ebitda;
    if (ebitda != null && ebitda <= 0 && nd != null) {
      if (nd > 0) return { value: null, status: "Bad", insight: "Net debt with zero or negative EBITDA — operating earnings cannot service the debt." };
      return { value: null, status: "Neutral", insight: "No net debt, but EBITDA is zero or negative, so the ratio is not meaningful." };
    }
    if (value === null) return { value, status: "N/A", insight: "EBITDA (positive) or debt data unavailable." };
    const isNetCash = nd != null ? nd < 0 : value < 0;
    if (isNetCash) return { value, status: "Good", insight: "Net cash position — more cash than debt on the balance sheet." };
    if (value < 0) return { value, status: "N/A", insight: "Negative ratio without net cash — EBITDA must be negative; ratio not meaningful." };
    if (value < 1.5) return { value, status: "Good", insight: "Low leverage. Debt is very manageable." };
    if (value <= 3.0) return { value, status: "Neutral", insight: "Moderate leverage. Within acceptable range for most industries." };
    return { value, status: "Bad", insight: "High leverage. Could be restrictive if earnings deteriorate." };
  },

  /**
   * Debt to Assets — proportion of assets financed by debt.
   */
  debtToAssets: (value: number | null): EvaluatedMetric => {
    if (value === null) return { value, status: "N/A", insight: "Asset data unavailable." };
    if (value < 0.3) return { value, status: "Good", insight: "Conservatively financed — low debt relative to assets." };
    if (value <= 0.6) return { value, status: "Neutral", insight: "Moderate reliance on debt financing." };
    return { value, status: "Bad", insight: "Heavily debt-financed. Higher insolvency risk." };
  },

  // ── Efficiency ────────────────────────────────────────────────────────────

  /**
   * Asset Turnover — how efficiently revenue is generated from assets.
   * Varies significantly by industry (e.g., retail is high, utilities are low).
   */
  assetTurnover: (value: number | null): EvaluatedMetric => {
    if (value === null || value <= 0) return { value, status: "N/A", insight: "Asset turnover data unavailable." };
    if (value >= 1.0) return { value, status: "Good", insight: "Efficiently generating revenue from its asset base." };
    if (value >= 0.5) return { value, status: "Neutral", insight: "Moderate asset efficiency — compare to sector peers." };
    return { value, status: "Bad", insight: "Low asset utilisation. Possible overcapacity or capital inefficiency." };
  },

  /**
   * Inventory Turnover — how many times inventory is sold per period.
   * High turnover generally means strong demand and lean operations.
   */
  inventoryTurnover: (value: number | null): EvaluatedMetric => {
    if (value === null || value <= 0) return { value, status: "N/A", insight: "Inventory data unavailable." };
    if (value >= 8) return { value, status: "Good", insight: "Fast-moving inventory — strong demand or efficient stock management." };
    if (value >= 4) return { value, status: "Neutral", insight: "Average inventory turnover." };
    return { value, status: "Bad", insight: "Slow-moving inventory. Risk of obsolescence or weak demand." };
  },

  /**
   * Receivables Turnover — how quickly customers pay their invoices.
   */
  receivablesTurnover: (value: number | null): EvaluatedMetric => {
    if (value === null || value <= 0) return { value, status: "N/A", insight: "Receivables data unavailable." };
    if (value >= 8) return { value, status: "Good", insight: "Customers pay quickly (DSO < 46 days). Strong collections." };
    if (value >= 4) return { value, status: "Neutral", insight: "Average collection speed (DSO 46–90 days)." };
    return { value, status: "Bad", insight: "Slow collections (DSO > 90 days). Risk of bad debts." };
  },

  /**
   * Days Sales Outstanding (DSO) — average collection period in days.
   * Lower is better.
   */
  daysSalesOutstanding: (value: number | null): EvaluatedMetric => {
    if (value === null || value <= 0) return { value, status: "N/A", insight: "DSO data unavailable." };
    if (value <= 45) return { value, status: "Good", insight: `${Math.round(value)} days DSO — customers pay promptly.` };
    if (value <= 90) return { value, status: "Neutral", insight: `${Math.round(value)} days DSO — average collection speed.` };
    return { value, status: "Bad", insight: `${Math.round(value)} days DSO — slow collections, elevated credit risk.` };
  },

  // ── Quality of Earnings ───────────────────────────────────────────────────

  /**
   * Dividend Payout Ratio — sustainability check for dividend investors.
   */
  payoutRatio: (value: number | null): EvaluatedMetric => {
    if (value === null || value < 0) return { value, status: "N/A", insight: "Earnings negative, or earnings/dividend data unavailable." };
    if (value === 0) return { value, status: "N/A", insight: "No dividend paid." };
    if (value <= 0.75) return { value, status: "Good", insight: "Sustainable payout — retaining enough earnings for growth." };
    if (value <= 1.0) return { value, status: "Neutral", insight: "Paying out most earnings as dividends. Watch for sustainability." };
    return { value, status: "Bad", insight: "Dividends exceed earnings. Not sustainable without external financing." };
  },

  /**
   * Cash Conversion Ratio — quality of earnings check.
   * A ratio > 1 means cash earnings exceed accounting earnings (high quality).
   */
  cashConversionRatio: (value: number | null): EvaluatedMetric => {
    if (value === null) return { value, status: "N/A", insight: "Cash flow or income data unavailable." };
    if (value >= 1.0) return { value, status: "Good", insight: "Earnings are well-supported by real cash flow. High earnings quality." };
    if (value >= 0.8) return { value, status: "Neutral", insight: "Earnings moderately supported by cash. Monitor accruals." };
    return { value, status: "Bad", insight: "Earnings outpace cash flow. Potential accrual-based inflation of profits." };
  },

  // ── Risk ──────────────────────────────────────────────────────────────────

  /**
   * Altman Z (original model for public manufacturers): > 2.99 safe,
   * 1.81–2.99 grey, < 1.81 distress. Use altmanZScoreDoublePrime for
   * non-manufacturers and private firms; neither applies to financials.
   */
  altmanZScore: (value: number | null): EvaluatedMetric => {
    if (value === null) return { value, status: "N/A", insight: "Data unavailable." };
    if (value > 2.99) return { value, status: "Good", insight: "Safe Zone (original Z, manufacturers). Low risk of financial distress." };
    if (value >= 1.81) return { value, status: "Neutral", insight: "Grey Zone (original Z, manufacturers). Exercise caution." };
    return { value, status: "Bad", insight: "Distress Zone (original Z, manufacturers). Elevated risk of financial distress." };
  },

  /**
   * Altman Z'' (non-manufacturers / private firms): > 2.6 safe,
   * 1.1–2.6 grey, < 1.1 distress.
   */
  altmanZScoreDoublePrime: (value: number | null): EvaluatedMetric => {
    if (value === null) return { value, status: "N/A", insight: "Data unavailable." };
    if (value > 2.6) return { value, status: "Good", insight: "Safe Zone (Z'', non-manufacturers). Low risk of financial distress." };
    if (value >= 1.1) return { value, status: "Neutral", insight: "Grey Zone (Z'', non-manufacturers). Exercise caution." };
    return { value, status: "Bad", insight: "Distress Zone (Z'', non-manufacturers). Elevated risk of financial distress." };
  },

  /**
   * Sharpe Ratio — risk-adjusted return. Thresholds assume an ANNUALISED ratio.
   * > 2 is excellent, 1–2 is good, 0.5–1 is acceptable.
   */
  sharpe: (value: number | null): EvaluatedMetric => {
    if (value === null) return { value, status: "N/A", insight: "Return or volatility data unavailable." };
    if (value >= 2.0) return { value, status: "Good", insight: "Excellent risk-adjusted return." };
    if (value >= 1.0) return { value, status: "Good", insight: "Good risk-adjusted return." };
    if (value >= 0.5) return { value, status: "Neutral", insight: "Acceptable risk-adjusted return." };
    if (value > 0) return { value, status: "Bad", insight: "Poor risk-adjusted return — not compensating adequately for risk." };
    return { value, status: "Bad", insight: "Negative risk-adjusted return." };
  },

  /**
   * Piotroski F-Score — 9-point financial health scorecard.
   * With all 9 signals: 7–9 Good, 3–6 Neutral, 0–2 Bad. When prior-year data
   * is missing (maxScore < 9) the same cut-offs are applied to the share of
   * available signals met (≥ 7/9 Good, ≥ 3/9 Neutral), and the insight says
   * the score is partial.
   */
  piotroski: (score: number, maxScore: number): EvaluatedMetric => {
    const value = score;
    if (!(maxScore > 0)) return { value, status: "N/A", insight: "Insufficient data for Piotroski scoring." };
    const share = score / maxScore;
    const partial = maxScore < 9 ? ` Partial score: only ${maxScore} of 9 signals had data (prior-year inputs missing).` : "";
    if (share >= 7 / 9) return { value, status: "Good", insight: `Strong fundamentals (${score}/${maxScore}).${partial}` };
    if (share >= 3 / 9) return { value, status: "Neutral", insight: `Mixed signals (${score}/${maxScore}). Some positives but not across the board.${partial}` };
    return { value, status: "Bad", insight: `Weak fundamentals (${score}/${maxScore}). Multiple financial health signals are negative.${partial}` };
  },

  // ── Analyst Targets ───────────────────────────────────────────────────────

  targetUpside: (value: number | null): EvaluatedMetric => {
    if (value === null) return { value, status: "N/A", insight: "No analyst targets available." };
    if (value > 0.10) return { value, status: "Good", insight: `Analysts predict a ${Math.round(value * 100)}% upside.` };
    if (value > -0.05) return { value, status: "Neutral", insight: "Trading near analyst fair value." };
    return { value, status: "Bad", insight: `Analysts predict a ${Math.round(value * 100)}% downside.` };
  },
};
