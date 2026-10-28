/**
 * Composite Scoring Engine
 *
 * Four domain scores — Quality, Growth, Value, Momentum — each in range [0, 100].
 * Each score is a weighted sum of normalised sub-signals (also 0-100 or boolean).
 *
 * These scores feed into computeGFactor for the overall composite.
 *
 * The weights and caps are heuristic design choices of this library, not an
 * academic standard. Momentum inputs (SMA, RSI, ADX, volume, ROC) must be
 * computed elsewhere; this library does not calculate technical indicators.
 */

// ---------------------------------------------------------------------------
// Quality Score
// ---------------------------------------------------------------------------

export interface QualityScoreInput {
  /** Piotroski F-Score points achieved (PiotroskiResult.score) */
  piotroskiScore: number;
  /**
   * Maximum Piotroski points possible with the data you had
   * (PiotroskiResult.maxScore). Default 9. When prior-year data is missing
   * the maximum is lower, and the score is normalised by it.
   */
  piotroskiMaxScore?: number;
  /**
   * Company ROE divided by the sector median ROE.
   * e.g. if company ROE is 18% and sector median is 15%, pass 18/15 = 1.2.
   * Clamped to [0, 1] (100 points at or above the sector median). Only
   * meaningful when the sector median ROE is positive.
   */
  roeVsSector: number;
  /** Whether operating margins are improving YoY (boolean) */
  marginsImproving: boolean;
  /**
   * Insider/promoter shares pledged are zero or negligible. Optional — omit
   * for markets where share pledging by insiders/promoters is not reported.
   */
  insiderPledgeFree?: boolean;
  /**
   * Insider/promoter holding is stable or increasing YoY. Optional — omit if
   * you do not track insider/promoter ownership.
   */
  insiderHoldingStable?: boolean;
  /** @deprecated Use insiderPledgeFree. Still accepted. */
  pledgeFree?: boolean;
  /** @deprecated Use insiderHoldingStable. Still accepted. */
  promoterStable?: boolean;
}

/**
 * Quality Score (0–100)
 * Weights when every signal is supplied:
 *   Piotroski (score / maxScore → 0–100): 30 %
 *   ROE vs Sector (clamped 0–1): 20 %
 *   Margins improving: 20 %
 *   Insider/promoter shares pledge-free: 15 %
 *   Insider/promoter holding stable: 15 %
 *
 * Optional signals that are omitted (the two insider/promoter signals, or
 * Piotroski when piotroskiMaxScore is 0) are dropped and the remaining
 * weights are rescaled to sum to 100 %, so the score still spans 0–100.
 * Without the insider/promoter signals the weights become
 * Piotroski 42.9 %, ROE 28.6 %, Margins 28.6 %.
 */
export const computeQualityScore = (input: QualityScoreInput): number => {
  const { piotroskiScore, piotroskiMaxScore = 9, roeVsSector, marginsImproving } = input;
  const pledgeFree    = input.insiderPledgeFree ?? input.pledgeFree;
  const holdingStable = input.insiderHoldingStable ?? input.promoterStable;

  const signals: Array<[score: number, weight: number]> = [
    [Math.min(Math.max(roeVsSector, 0), 1) * 100, 0.20],
    [marginsImproving ? 100 : 0, 0.20],
  ];
  if (piotroskiMaxScore > 0) {
    signals.push([Math.min(Math.max(piotroskiScore / piotroskiMaxScore, 0), 1) * 100, 0.30]);
  }
  if (pledgeFree != null)    signals.push([pledgeFree ? 100 : 0, 0.15]);
  if (holdingStable != null) signals.push([holdingStable ? 100 : 0, 0.15]);

  const totalWeight = signals.reduce((sum, [, w]) => sum + w, 0);
  return signals.reduce((sum, [score, w]) => sum + score * w, 0) / totalWeight;
};

// ---------------------------------------------------------------------------
// Growth Score
// ---------------------------------------------------------------------------

export interface GrowthScoreInput {
  /**
   * Revenue growth rate relative to sector.
   * e.g. if company revenue grew 20% and sector average is 12%, pass 20/12 = 1.67.
   * Clamped to [0, 1] (100 points if >= sector growth). Only meaningful when
   * sector growth is positive: dividing two negative growth rates gives a
   * positive ratio, so pass 0 (or your own judgement) in that case.
   */
  revenueGrowthVsSector: number;
  /**
   * Profit (net income) growth rate as decimal (e.g. 0.20 for 20% growth).
   * Capped at 30% for full score (0.30 → 100).
   */
  profitGrowthRate: number;
  /**
   * EPS growth rate as decimal. Capped at 25% for full score (0.25 → 100).
   */
  epsGrowthRate: number;
  /** Operating cash flow is positive this period (boolean) */
  cfoPositive: boolean;
  /** Revenue acceleration: current year growth > prior year growth (boolean) */
  revenueAccelerating: boolean;
}

/**
 * Growth Score (0–100)
 * Weights:
 *   Revenue growth vs sector: 25 %
 *   Profit growth rate: 25 %
 *   EPS growth rate: 20 %
 *   CFO positive: 15 %
 *   Revenue accelerating: 15 %
 */
export const computeGrowthScore = (input: GrowthScoreInput): number => {
  const { revenueGrowthVsSector, profitGrowthRate, epsGrowthRate, cfoPositive, revenueAccelerating } = input;

  const revVsSectorNorm = Math.min(Math.max(revenueGrowthVsSector, 0), 1) * 100;
  const profitNorm      = Math.min(Math.max(profitGrowthRate / 0.30, 0), 1) * 100;
  const epsNorm         = Math.min(Math.max(epsGrowthRate / 0.25, 0), 1) * 100;
  const cfoScore        = cfoPositive ? 100 : 0;
  const accelScore      = revenueAccelerating ? 100 : 0;

  return (
    revVsSectorNorm * 0.25 +
    profitNorm      * 0.25 +
    epsNorm         * 0.20 +
    cfoScore        * 0.15 +
    accelScore      * 0.15
  );
};

// ---------------------------------------------------------------------------
// Value Score
// ---------------------------------------------------------------------------

export interface ValueScoreInput {
  /**
   * Current P/E divided by the stock's own 3-year average P/E (both positive).
   * e.g. currentPE = 15, avgPE = 20 → ratio = 15/20 = 0.75 (trading below avg → higher score).
   * Score is higher when ratio < 1 (currently cheaper than historical average).
   */
  peVs3yrAvg: number;
  /**
   * Current P/B vs sector median P/B. Score is higher when < 1.
   * e.g. company PB = 2, sector median PB = 3 → ratio = 2/3 ≈ 0.67
   */
  pbVsSector: number;
  /**
   * PEG ratio as returned by peg(): P/E ÷ growth in whole percent
   * (P/E 30, 15 % growth → 2.0). Lower is better; 1.0 = fair, < 1 = undervalued.
   * PEG ≤ 0 scores 0; PEG ≤ 0.5 scores 100; PEG ≥ 2.0 scores 0.
   */
  peg: number;
  /**
   * Current P/E percentile over the stock's own 5-year history (0–100).
   * Lower percentile = cheaper vs history = higher score.
   * Pass 0–100 directly.
   */
  historicalPePercentile: number;
}

/**
 * Value Score (0–100)
 * Weights:
 *   P/E vs 3yr avg: 30 %
 *   P/B vs sector: 25 %
 *   PEG: 25 %
 *   Historical P/E percentile: 20 %
 */
export const computeValueScore = (input: ValueScoreInput): number => {
  const { peVs3yrAvg, pbVsSector, peg, historicalPePercentile } = input;

  // Cheaper than historical → ratio < 1 → higher score; maps 0→100, 1→50, 2→0.
  // A ratio <= 0 means a negative P/E or P/B (losses / negative equity) and scores 0.
  const ratioScore = (ratio: number) => (ratio <= 0 ? 0 : Math.min(Math.max((2 - ratio) * 50, 0), 100));
  const peAvgScore = ratioScore(peVs3yrAvg);
  const pbScore    = ratioScore(pbVsSector);
  // PEG: ≤0.5 → 100, 1.0 → 66.7, 1.5 → 33.3, ≥2.0 → 0 (linear)
  const pegScore   = peg <= 0 ? 0 : Math.min(Math.max((2 - peg) / 1.5 * 100, 0), 100);
  // Lower percentile = better value: invert (percentile clamped to 0–100)
  const histScore  = 100 - Math.min(Math.max(historicalPePercentile, 0), 100);

  return (
    peAvgScore * 0.30 +
    pbScore    * 0.25 +
    pegScore   * 0.25 +
    histScore  * 0.20
  );
};

// ---------------------------------------------------------------------------
// Momentum Score
// ---------------------------------------------------------------------------

export interface MomentumScoreInput {
  /**
   * Current price vs its 200-day SMA ratio.
   * e.g. price = 105, SMA200 = 100 → ratio = 1.05 (above SMA → bullish).
   * Score peaks at ratio ≥ 1.10 (10% above SMA).
   */
  priceVsSma200: number;
  /**
   * RSI (14-period), computed by you or your data provider. Range 0–100.
   * Score peaks at RSI 57.5 and falls 2.5 points per RSI point either side.
   */
  rsi: number;
  /**
   * ADX (Average Directional Index). Range 0–100.
   * ADX > 25 indicates a strong trend; ADX < 20 is trendless.
   * Score peaks at ADX ≥ 30.
   */
  adx: number;
  /**
   * Volume ratio: current 20-day avg volume / 90-day avg volume.
   * > 1.0 = rising volume (confirming move). Score caps at 1.5x.
   */
  volumeRatio: number;
  /**
   * Rate of Change over 125 trading days (6 months), as a decimal.
   * e.g. 0.20 = 20% return over 6 months. Capped at 40% for full score.
   */
  roc125: number;
}

/**
 * Momentum Score (0–100)
 * Weights:
 *   Price vs SMA200: 25 %
 *   RSI: 20 %
 *   ADX: 20 %
 *   Volume ratio: 20 %
 *   ROC-125: 15 %
 */
export const computeMomentumScore = (input: MomentumScoreInput): number => {
  const { priceVsSma200, rsi, adx, volumeRatio, roc125 } = input;

  // Price vs SMA200: 1.0 → 50, ≥1.10 → 100, <1.0 → decreasing
  const smaScore = Math.min(Math.max((priceVsSma200 - 0.9) / 0.2 * 100, 0), 100);

  // RSI: 57.5 → 100, 50/65 → 81, 70 → 69, 30 → 31, ≤17.5 or ≥97.5 → 0
  const rsiScore = rsi <= 0 || rsi >= 100
    ? 0
    : Math.max(0, 100 - Math.abs(rsi - 57.5) * 2.5);

  // ADX: 0 → 0, 25 → ~83, ≥30 → 100
  const adxScore = Math.min(Math.max(adx / 30 * 100, 0), 100);

  // Volume ratio: 1.0 → 50, ≥1.5 → 100, <1 → lower
  const volScore = Math.min(Math.max((volumeRatio - 0.5) / 1.0 * 100, 0), 100);

  // ROC125: 0 → 0, 0.20 → 50, ≥0.40 → 100
  const rocScore = Math.min(Math.max(roc125 / 0.40 * 100, 0), 100);

  return (
    smaScore * 0.25 +
    rsiScore * 0.20 +
    adxScore * 0.20 +
    volScore * 0.20 +
    rocScore * 0.15
  );
};
