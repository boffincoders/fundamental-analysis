import { describe, it, expect } from "vitest";
import { altmanZScoreDoublePrime } from "../risk/altmanZScore";
import { sharpeFromReturns } from "../risk/sharpe";
import { growthRates, yoyGrowth, medianGrowth } from "../growth/trendGrowth";
import { roe } from "../profitability/roe";
import { roic } from "../profitability/roic";
import { interestCoverage } from "../liquidity/interestCoverage";
import { cashConversionRatio } from "../quality/cashConversionRatio";
import { payoutRatio } from "../quality/payoutRatio";
import { evaluate } from "../evaluator/evaluate";
import {
  analyzeValuation,
  analyzeProfitability,
  analyzeLiquidity,
  analyzeEfficiency,
  analyzeRisk,
  analyzeQuality,
} from "../analyzer/categorical";
import { analyzeFundamentalTrends } from "../analyzer/analyzeFundamentalTrends";

// ---------------------------------------------------------------------------
// Altman Z'' (non-manufacturers / private firms)
// ---------------------------------------------------------------------------
describe("altmanZScoreDoublePrime", () => {
  it("hand-checked: 6.56×0.15 + 3.26×0.20 + 6.72×0.075 + 1.05×(40000/60000) = 2.84 (safe)", () => {
    const z = altmanZScoreDoublePrime(15000, 20000, 7500, 40000, 100000, 60000)!;
    expect(z).toBeCloseTo(2.84, 4);
    expect(evaluate.altmanZScoreDoublePrime(z).status).toBe("Good");
  });
  it("grey zone between 1.1 and 2.6", () => {
    // 6.56×0.05 + 3.26×0.1 + 6.72×0.03 + 1.05×(20000/80000) = 0.328+0.326+0.2016+0.2625 = 1.1181
    const z = altmanZScoreDoublePrime(5000, 10000, 3000, 20000, 100000, 80000)!;
    expect(z).toBeCloseTo(1.1181, 4);
    expect(evaluate.altmanZScoreDoublePrime(z).status).toBe("Neutral");
  });
  it("distress zone below 1.1", () => {
    const z = altmanZScoreDoublePrime(-5000, -10000, -2000, -60000, 20000, 80000)!;
    expect(z).toBeCloseTo(-4.7295, 4);
    expect(evaluate.altmanZScoreDoublePrime(z).status).toBe("Bad");
  });
  it("returns null for missing input or non-positive assets", () => {
    expect(altmanZScoreDoublePrime(1, 1, 1, NaN, 100, 50)).toBeNull();
    expect(altmanZScoreDoublePrime(1, 1, 1, 10, 0, 50)).toBeNull();
  });
  it("zero liabilities caps equity/liabilities at 10", () => {
    // 0.984 + 0.652 + 0.504 + 1.05×10 = 12.64
    expect(altmanZScoreDoublePrime(15000, 20000, 7500, 40000, 100000, 0)).toBeCloseTo(12.64, 4);
  });
});

// ---------------------------------------------------------------------------
// Sharpe from a return series
// ---------------------------------------------------------------------------
describe("sharpeFromReturns", () => {
  it("monthly returns: mean 1.25%, sample sd 1.7078% → 0.0125×12 / (0.017078×√12) = 2.5355", () => {
    expect(sharpeFromReturns([0.02, 0.01, -0.01, 0.03], 0, 12)).toBeCloseTo(2.5355, 3);
  });
  it("daily returns with a per-period risk-free rate", () => {
    expect(sharpeFromReturns([0.01, -0.005, 0.02, 0.0, 0.015], 0.0001)).toBeCloseTo(12.0955, 3);
  });
  it("equals sharpe() on annualised inputs", () => {
    const r = [0.02, 0.01, -0.01, 0.03];
    const mean = r.reduce((a, b) => a + b) / r.length;
    const sd = Math.sqrt(r.reduce((a, b) => a + (b - mean) ** 2, 0) / (r.length - 1));
    expect(sharpeFromReturns(r, 0, 12)).toBeCloseTo((mean * 12) / (sd * Math.sqrt(12)), 10);
  });
  it("returns null for < 2 returns, zero volatility or bad input", () => {
    expect(sharpeFromReturns([0.01])).toBeNull();
    expect(sharpeFromReturns([0.01, 0.01, 0.01])).toBeNull();
    expect(sharpeFromReturns([0.01, NaN])).toBeNull();
    expect(sharpeFromReturns([0.01, 0.02], 0, 0)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Growth: undefined periods are skipped, not counted as 0 %
// ---------------------------------------------------------------------------
describe("growth with a zero base period", () => {
  const series = [0, 100, 110, 121];
  it("growthRates keeps the undefined period as null", () => {
    const r = growthRates(series);
    expect(r[0]).toBeNull();
    expect(r[1]).toBeCloseTo(0.1);
    expect(r[2]).toBeCloseTo(0.1);
  });
  it("yoyGrowth keeps its number[] shape (0 for the undefined period)", () => {
    expect(yoyGrowth(series)).toEqual([0, expect.closeTo(0.1), expect.closeTo(0.1)]);
  });
  it("medianGrowth skips the undefined period (was 0.05 in 1.2.x, now 0.10)", () => {
    expect(medianGrowth(series)).toBeCloseTo(0.1);
  });
  it("medianGrowth returns null when no period is defined", () => {
    expect(medianGrowth([0, 0, 0])).toBeNull();
  });
  it("analyzeFundamentalTrends reports the undefined period as null", () => {
    const t = analyzeFundamentalTrends({ revenue: [0, 100, 110], netIncome: [0, 10, 12] });
    expect(t.growth.revenueGrowth[0]).toBeNull();
    expect(t.growth.revenueGrowth[1]).toBeCloseTo(0.1);
  });
});

// ---------------------------------------------------------------------------
// Sign handling in single metrics
// ---------------------------------------------------------------------------
describe("sign handling", () => {
  it("ROE is null for negative equity (a loss must not look like a positive ROE)", () => {
    expect(roe(-100, -500)).toBeNull();
    expect(roe(100, -500)).toBeNull();
  });
  it("ROIC is null for non-positive invested capital", () => {
    expect(roic(1000, 0.25, 0, 500, 2000)).toBeNull();
  });
  it("interest coverage treats a negative-signed interest expense as a cost", () => {
    expect(interestCoverage(7500, -500)).toBeCloseTo(15);
  });
  it("negative coverage (negative EBIT) is rated Bad, not N/A", () => {
    expect(evaluate.interestCoverage(interestCoverage(-1000, 500)).status).toBe("Bad");
  });
  it("cash conversion ratio is null for a loss (OCF -100 / NI -200 is not 'high quality')", () => {
    expect(cashConversionRatio(-100, -200)).toBeNull();
  });
  it("payout ratio is null for negative EPS", () => {
    expect(payoutRatio(1, -2)).toBeNull();
  });
  it("payout ratio of 0 is 'No dividend', not 'paying out most earnings'", () => {
    const r = evaluate.payoutRatio(0);
    expect(r.status).toBe("N/A");
    expect(r.insight).toMatch(/no dividend/i);
  });
  it("negative debt-to-equity (negative equity) is Bad, not 'funded by equity'", () => {
    expect(evaluate.debtToEquity(-2).status).toBe("Bad");
  });
  it("break-even margin is not described as negative", () => {
    expect(evaluate.margin(0, "Net").insight).not.toMatch(/negative/i);
  });
  it("Graham / DCF comparison is N/A without a price", () => {
    expect(evaluate.grahamNumber(50, 0).status).toBe("N/A");
    expect(evaluate.dcf(50, 0).status).toBe("N/A");
  });
});

// ---------------------------------------------------------------------------
// Piotroski evaluation with partial data
// ---------------------------------------------------------------------------
describe("evaluate.piotroski with partial data", () => {
  it("3/3 available signals is Good and flagged as partial", () => {
    const r = evaluate.piotroski(3, 3);
    expect(r.status).toBe("Good");
    expect(r.insight).toMatch(/partial/i);
  });
  it("full 9-signal thresholds unchanged", () => {
    expect(evaluate.piotroski(7, 9).status).toBe("Good");
    expect(evaluate.piotroski(5, 9).status).toBe("Neutral");
    expect(evaluate.piotroski(2, 9).status).toBe("Bad");
    expect(evaluate.piotroski(7, 9).insight).not.toMatch(/partial/i);
  });
});

// ---------------------------------------------------------------------------
// Analyzer input handling
// ---------------------------------------------------------------------------
describe("analyzers keep legitimate zero values", () => {
  it("zero cost of revenue gives 100% gross margin", () => {
    expect(analyzeProfitability({ totalRevenue: 1000, costOfRevenue: 0 }).grossMargin).toBeCloseTo(1);
  });
  it("gross margin falls back to grossProfit when costOfRevenue is absent", () => {
    expect(analyzeProfitability({ totalRevenue: 1000, grossProfit: 400 }).grossMargin).toBeCloseTo(0.4);
  });
  it("zero net income gives 0 ROA and 0 net margin, not null", () => {
    const p = analyzeProfitability({ netIncome: 0, totalAssets: 1000, totalRevenue: 500 });
    expect(p.roa).toBe(0);
    expect(p.netProfitMargin).toBe(0);
  });
  it("zero dividend gives a 0 yield, not null", () => {
    expect(analyzeValuation({ price: 100, annualDividendPerShare: 0 }).dividendYield).toBe(0);
  });
  it("zero EBIT gives 0 interest coverage (rated Bad)", () => {
    const l = analyzeLiquidity({ ebit: 0, interestExpense: 100 }, true) as any;
    expect(l.interestCoverage.value).toBe(0);
    expect(l.interestCoverage.status).toBe("Bad");
  });
  it("zero inventory still gives an inventory-free quick ratio", () => {
    expect(analyzeLiquidity({ currentAssets: 300, currentLiabilities: 200, inventory: 0 }).quickRatio).toBeCloseTo(1.5);
  });
  it("zero receivables gives 0 days DSO", () => {
    expect(analyzeEfficiency({ totalRevenue: 1000, tradeReceivables: 0 }).daysSalesOutstanding).toBe(0);
  });
});

describe("analyzeLiquidity uses CURRENT assets/liabilities", () => {
  it("current ratio = current assets / current liabilities", () => {
    const l = analyzeLiquidity({ currentAssets: 300, currentLiabilities: 200, inventory: 50 });
    expect(l.currentRatio).toBeCloseTo(1.5);
    expect(l.quickRatio).toBeCloseTo(1.25);
  });
  it("does not compute current ratio from total assets / total liabilities", () => {
    const l = analyzeLiquidity({ totalAssets: 100000, totalLiabilities: 60000, inventory: 10000 });
    expect(l.currentRatio).toBeNull();
    expect(l.quickRatio).toBeNull();
  });
});

describe("analyzeValuation does not invent zeros for missing inputs", () => {
  it("no price → P/E is null (was 0)", () => {
    expect(analyzeValuation({ eps: 5 }).pe).toBeNull();
  });
  it("no market cap → EV-based multiples are null (EV was computed from a 0 market cap)", () => {
    const v = analyzeValuation({ totalDebt: 20000, cashAndEquivalents: 5000, ebitda: 10000, totalRevenue: 50000 });
    expect(v.evEbitda).toBeNull();
    expect(v.evRevenue).toBeNull();
  });
  it("EV/EBITDA with market cap: (150000 + 20000 − 5000) / 10000 = 16.5", () => {
    expect(analyzeValuation({ marketCap: 150000, totalDebt: 20000, cashAndEquivalents: 5000, ebitda: 10000 }).evEbitda).toBeCloseTo(16.5);
  });
  it("no price → Graham comparison is N/A rather than a 100% margin of safety", () => {
    const v = analyzeValuation({ eps: 5, bookValuePerShare: 20 }, true) as any;
    expect(v.grahamNumber.status).toBe("N/A");
  });
});

describe("analyzeRisk", () => {
  const base = { workingCapital: 15000, retainedEarnings: 20000, ebit: 7500, totalAssets: 100000, totalLiabilities: 60000 };
  it("original Z needs market cap and revenue (no silent 0)", () => {
    expect(analyzeRisk(base).altmanZScore).toBeNull();
    expect(analyzeRisk({ ...base, marketCap: 250000, totalRevenue: 50000 }).altmanZScore).toBeCloseTo(3.7075, 4);
  });
  it("Z'' is computed from book equity", () => {
    expect(analyzeRisk({ ...base, totalEquity: 40000 }).altmanZScoreDoublePrime).toBeCloseTo(2.84, 4);
  });
  it("working capital is derived from current assets/liabilities when omitted", () => {
    const { workingCapital, ...rest } = base;
    const r = analyzeRisk({ ...rest, currentAssets: 40000, currentLiabilities: 25000, totalEquity: 40000 });
    expect(r.altmanZScoreDoublePrime).toBeCloseTo(2.84, 4);
  });
  it("Piotroski without prior-year data is evaluated as partial", () => {
    const r = analyzeRisk({ netIncome: 5000, totalAssets: 100000, operatingCashFlow: 7000 }, true) as any;
    expect(r.piotroski.status).toBe("Good");
    expect(r.piotroski.insight).toMatch(/partial/i);
  });
});

describe("analyzeQuality", () => {
  it("cash conversion for a loss-maker is null", () => {
    expect(analyzeQuality({ operatingCashFlow: -100, netIncome: -200 }).cashConversionRatio).toBeNull();
  });
});
