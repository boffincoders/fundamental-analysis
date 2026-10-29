# fundamental-analysis

[![NPM Version](https://img.shields.io/npm/v/fundamental-analysis.svg)](https://www.npmjs.com/package/fundamental-analysis)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue.svg)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg)](https://www.npmjs.com/package/fundamental-analysis?activeTab=dependencies)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Maintained by [Boffin Coders](https://boffincoders.com/?utm_source=npm&utm_medium=readme&utm_campaign=fundamental-analysis).

> Formerly published as `finance-calculator-pro`. Switching: `npm uninstall finance-calculator-pro && npm install fundamental-analysis`, then change your imports to `'fundamental-analysis'`. The functions and their names are the same; see the [CHANGELOG](./CHANGELOG.md) for outputs that changed in 1.3.0 (PEG, intrinsic value, net debt/EBITDA and others).

📖 **[Documentation & live playground →](https://boffincoders.github.io/fundamental-analysis/)**

![fundamental-analysis: financial ratios for TypeScript, by Boffin Coders](https://raw.githubusercontent.com/boffincoders/fundamental-analysis/refs/heads/master/.github/assets/banner.png)

> **Zero-dependency fundamental analysis for JavaScript and TypeScript.**
> Financial ratio analysis from raw income-statement, balance-sheet and cash-flow numbers: valuation (P/E, PEG, EV/EBITDA, DCF and intrinsic value), profitability, liquidity, leverage, efficiency and financial-distress metrics (Altman Z-Score, Piotroski score) — each with an optional plain-English rating. No API calls, no runtime dependencies. Runs in Node.js, browsers and edge runtimes.

---

## Contents

- [What it is (and is not)](#what-it-is-and-is-not)
- [Who it's for](#who-its-for)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Input conventions — read this first](#input-conventions--read-this-first)
- [About the ratings](#about-the-ratings)
- [Metrics reference](#metrics-reference)
- [Individual functions](#individual-functions)
- [Composite scores](#composite-scores)
- [TypeScript](#typescript)
- [Changelog](#changelog) · [License](#license)

---

## What it is (and is not)

`fundamental-analysis` is a library of financial-statement ratios plus a small analysis layer:

1. **Pure metric functions** — `pe()`, `roe()`, `netDebtToEbitda()`, `altmanZScore()`, `calculateDCF()` … Each takes plain numbers and returns `number | null`.
2. **Analyzers** — `analyzeCompany()` takes one flat object of fundamentals and returns every metric it can compute, grouped into valuation, profitability, liquidity, solvency, efficiency, risk and quality.
3. **Evaluator** — `evaluate.*` turns a value into `{ value, status: "Good" | "Neutral" | "Bad" | "N/A", insight }`.
4. **Series helpers** — growth rates, CAGR, median growth, trailing-twelve-month (TTM) and multi-year aggregation.
5. **Composite scores** — Quality, Growth, Value and Momentum scores (0–100) and a weighted G-Factor.

It does **not**:
- fetch market data (bring your own: `yahoo-finance2`, Alpha Vantage, Financial Modeling Prep, Polygon.io, your database, a CSV…);
- compute technical indicators (RSI, MACD, moving averages…). `computeMomentumScore()` expects you to supply RSI, ADX and SMA values computed elsewhere;
- provide time-value-of-money (NPV/IRR/PMT) or portfolio statistics beyond the Sharpe ratio;
- model banks, insurers or REITs. Ratios such as current ratio, EV/EBITDA and Altman Z are not meaningful for financial companies.

---

## Who it's for

| Who | Typical use | Main APIs |
|---|---|---|
| Fintech and investing-app developers | Company snapshot cards, "is this stock cheap?" panels | `analyzeCompany(data, true)` |
| Stock-screener builders | Rank and filter a watchlist on P/E, ROE, leverage, margins | `analyzeBatch()`, individual ratios |
| Value and dividend investors | Graham number, intrinsic value, payout sustainability, net cash | `grahamNumber()`, `computeIntrinsicValue()`, `payoutRatio()`, `netCash()` |
| Equity research and M&A analysts | Quick multiples and DCF sanity checks | `evEbitda()`, `evFcf()`, `calculateDCF()`, `impliedSharePrice()` |
| Credit and lending analysts | Leverage and distress screens for non-financial companies | `netDebtToEbitda()`, `interestCoverage()`, `altmanZScore()`, `altmanZScoreDoublePrime()` |
| CFOs and FP&A teams | Ratio packs from their own statements | `analyzeCompany()`, `daysSalesOutstanding()`, `payableDays()`, `cashConversionCycle()` |
| Educators and students | Calculators that show the formula and a plain-English reading | individual functions + `evaluate.*` |
| Dashboard builders | Growth trends and TTM figures from quarterly data | `analyzeFundamentalTrends()`, `computeTTM()`, `cagr()` |

Works for companies in any market (US, UK, EU, Canada, Australia, India …) as long as all amounts in one snapshot use the same currency and unit.

---

## Installation

```bash
npm install fundamental-analysis
```

Ships as CommonJS + ES modules + TypeScript declarations, marked side-effect-free for tree-shaking. Node.js ≥ 16.

---

## Quick start

```typescript
import { analyzeCompany } from 'fundamental-analysis';

const data = {
  price: 150, eps: 5, bookValuePerShare: 20, marketCap: 150_000,
  totalDebt: 20_000, cashAndEquivalents: 5_000,
  ebitda: 10_000, ebit: 7_500, interestExpense: 500,
  netIncome: 5_000, operatingCashFlow: 7_500, totalRevenue: 50_000,
  totalAssets: 100_000, totalLiabilities: 60_000, totalEquity: 40_000,
  currentAssets: 40_000, currentLiabilities: 25_000, inventory: 10_000,
  retainedEarnings: 20_000,
  expectedEarningsGrowthRate: 0.15,   // 15 %, as a decimal
};

const analysis = analyzeCompany(data, true); // true → { value, status, insight } per metric

analysis.valuation.pe;
// { value: 30, status: "Bad", insight: "Expensive by generic standards. High growth is priced in; normal for some sectors." }

analysis.valuation.peg;              // { value: 2, status: "Bad", ... }        P/E 30 ÷ 15 % growth
analysis.valuation.evEbitda;         // { value: 16.5, status: "Bad", ... }     (150k + 20k − 5k) / 10k
analysis.liquidity.currentRatio;     // { value: 1.6, status: "Good", ... }     40k / 25k
analysis.solvency.netDebtToEbitda;   // { value: 1.5, status: "Neutral", ... }  (20k − 5k) / 10k
analysis.quality.cashConversionRatio;// { value: 1.5, status: "Good", ... }     7.5k / 5k
analysis.risk.altmanZScore;          // { value: 2.7075, status: "Neutral", insight: "Grey Zone (original Z, manufacturers)..." }
analysis.risk.altmanZScoreDoublePrime; // { value: 2.84, status: "Good", insight: "Safe Zone (Z'', non-manufacturers)..." }
analysis.risk.piotroski;
// { value: 3, status: "Good", insight: "Strong fundamentals (3/3). Partial score: only 3 of 9 signals had data (prior-year inputs missing)." }
```

Call `analyzeCompany(data)` without `true` to get raw numbers only. Every input is optional; metrics whose inputs are missing come back as `null`.

Analyzing one category: `analyzeValuation`, `analyzeProfitability`, `analyzeLiquidity`, `analyzeSolvency`, `analyzeEfficiency`, `analyzeRisk`, `analyzeQuality` take the same input. `analyzeBatch(companies, true)` runs a whole watchlist:

```typescript
import { analyzeBatch } from 'fundamental-analysis';

const results = analyzeBatch(watchlist, true);
const cheapestFirst = results
  .filter(r => r.valuation.pe.value !== null)
  .sort((a, b) => a.valuation.pe.value! - b.valuation.pe.value!);
```

### Growth trends from time series

```typescript
import { analyzeFundamentalTrends } from 'fundamental-analysis';

const trends = analyzeFundamentalTrends({
  revenue:   [365_817, 394_328, 383_285],   // oldest → newest
  netIncome: [ 94_680,  99_803,  96_995],
}, 'annual');

trends.growth.revenueCagr;     // 0.0236  (+2.36 % a year)
trends.growth.revenueGrowth;   // [0.0779, -0.0280]
trends.margins.netMargins;     // [0.2588, 0.2531, 0.2531]
```

---

## Input conventions — read this first

| Convention | Rule |
|---|---|
| Rates | **Decimals**: `0.15` means 15 %. This applies to growth rates, tax rates, discount rates and returns. |
| Currency and units | Any currency, any unit (USD millions, INR crore, EUR thousands…) — but the same within one snapshot. Per-share inputs must match share-level prices. |
| Periods | Flow items (revenue, income, cash flow) cover one period, normally trailing twelve months or last fiscal year. Balance-sheet items are period-end values. Day-count ratios accept a `daysInPeriod` argument (default 365) for quarterly data. |
| Signs | Expenses (`costOfRevenue`, `interestExpense`) are positive numbers. Interest expense reported as a negative number is handled as a cost. |
| Zero | Zero is a real value and is used (zero cost of revenue → 100 % gross margin). Leave a field out when you do not know it. |
| `null` | A metric is `null` when an input is missing, a denominator is zero, or the result would not be meaningful (for example ROE with negative equity, PEG with negative growth, net debt/EBITDA with negative EBITDA). |
| `NaN` and `Infinity` | Functions typed `number \| null` (the ratio functions, TTM and history helpers, CAGR, intrinsic value, DCF and all analyzers) return `null` rather than `NaN` or `±Infinity`. The few plain-arithmetic helpers typed `number` (`netDebt`, `netCash`, `calculateEnterpriseValue`, `cashConversionCycle`, `computeGFactor`) and the composite score functions expect valid numbers and pass `NaN` through. |
| Missing debt or cash | For enterprise value and net debt, a missing `totalDebt` or `cashAndEquivalents` counts as 0 when the other one is supplied. |

---

## About the ratings

The `status` and `insight` returned by `evaluate.*` and by the analyzers with `withInsights = true` come from **fixed, generic rules of thumb**. For example, P/E < 15 is "Good", current ratio 1.2–2.0 is "Good" and net debt/EBITDA < 1.5 is "Good".

These thresholds do not know the company's sector, market or the interest-rate environment. A P/E of 30 is ordinary for a software company and high for a utility; a current ratio of 0.8 is normal for a supermarket. Use the ratings as a first-pass screen, compare against sector peers, and do not use them as investment advice.

---

## Metrics reference

### Valuation
| Metric | Function | Formula |
|---|---|---|
| Price-to-Earnings | `pe(price, eps)` | Price / EPS |
| Price-to-Book | `pb(price, bvps)` · `pbFromMarketCap()` | Price / Book Value per Share |
| Price-to-Sales | `ps(price, rps)` · `psFromMarketCap()` | Price / Revenue per Share |
| PEG | `peg(pe, growth)` | P/E ÷ (growth × 100). Growth is a decimal: `peg(30, 0.15)` = 2.0. Null for growth ≤ 0 or P/E ≤ 0 |
| EV/EBITDA | `evEbitda(ev, ebitda)` | Enterprise Value / EBITDA |
| Enterprise Value | `calculateEnterpriseValue(mcap, debt, cash)` | Market Cap + Debt − Cash |
| EV/Revenue | `evRevenue(ev, revenue)` | EV / Revenue |
| EV/FCF | `evFcf(ev, fcf)` | EV / Free Cash Flow |
| Price-to-Cash-Flow | `priceToCashFlow(mcap, ocf)` · `priceToCashFlowPerShare()` | Market Cap / Operating Cash Flow |
| Earnings Yield | `earningsYield(eps, price)` | EPS / Price |
| Dividend Yield | `dividendYield(dps, price)` | Annual Dividend per Share / Price |
| Market Cap to Total Capital | `marketCapToDebtCap(mcap, debt)` | Market Cap / (Market Cap + Debt) |

### Intrinsic value
| Metric | Function | Method |
|---|---|---|
| Discounted Cash Flow | `calculateDCF(fcfs, rate, terminalGrowth)` | PV of projected FCF + Gordon-growth terminal value |
| Implied Share Price | `impliedSharePrice(ev, debt, cash, shares)` | (EV − Debt + Cash) / Shares |
| Graham Number | `grahamNumber(eps, bvps)` | √(22.5 × EPS × Book Value per Share) |
| Intrinsic Value per Share | `computeIntrinsicValue(eps, growth, margin, { terminalPE, discountRate, years })` | EPS × (1+g)ⁿ × terminal P/E ÷ (1+r)ⁿ × (1 − margin). Defaults: P/E 15, r = 10 %, n = 5 |
| Net Current Value per Share | `computeNCVPS(currentAssets, totalLiabilities, shares)` | (Current Assets − Total Liabilities) / Shares |

### Profitability
| Metric | Function | Formula |
|---|---|---|
| Return on Assets | `roa(netIncome, totalAssets)` | Net Income / Total Assets |
| Return on Equity | `roe(netIncome, equity)` | Net Income / Equity (null if equity ≤ 0) |
| Return on Invested Capital | `roic(opIncome, taxRate, debt, equity, cash)` | Operating Income × (1 − tax) / (Debt + Equity − Cash) |
| Gross Margin | `grossMargin(revenue, costOfRevenue)` | (Revenue − Cost of Revenue) / Revenue |
| Operating Margin | `operatingMargin(opIncome, revenue)` | Operating Income / Revenue |
| Net Profit Margin | `netProfitMargin(netIncome, revenue)` | Net Income / Revenue |
| FCF Margin | `fcfMargin(fcf, revenue)` | Free Cash Flow / Revenue |

### Liquidity and leverage
| Metric | Function | Formula |
|---|---|---|
| Current Ratio | `currentRatio(currentAssets, currentLiabilities)` | Current Assets / Current Liabilities |
| Quick Ratio | `quickRatio(currentAssets, inventory, currentLiabilities)` | (Current Assets − Inventory) / Current Liabilities |
| Debt-to-Equity | `debtToEquity(debt, equity)` | Total Debt / Total Equity |
| Interest Coverage | `interestCoverage(ebit, interest)` | EBIT / Interest Expense |
| Net Debt | `netDebt(debt, cash)` | Debt − Cash (negative = net cash) |
| Net Cash | `netCash(debt, cash)` | max(Cash − Debt, 0) |
| Net Debt / EBITDA | `netDebtToEbitda(debt, cash, ebitda)` | (Debt − Cash) / EBITDA (null if EBITDA ≤ 0) |
| Debt-to-Assets | `debtToAssets(debt, totalAssets)` | Total Debt / Total Assets |

### Efficiency
| Metric | Function | Formula |
|---|---|---|
| Asset Turnover | `assetTurnover(revenue, totalAssets)` | Revenue / Total Assets (pass an average if you have one) |
| Inventory Turnover | `inventoryTurnover(cogs, inventory)` | COGS / Inventory |
| Receivables Turnover | `receivablesTurnover(revenue, receivables)` | Revenue / Trade Receivables |
| Days Sales Outstanding | `daysSalesOutstanding(revenue, receivables, days = 365)` | Receivables / Revenue × days |
| Days Payable Outstanding | `payableDays(payables, cogs, days = 365)` | Payables / COGS × days |
| Working Capital Days | `workingCapitalDays(wc, revenue, days = 365)` | Working Capital / Revenue × days |
| Cash Conversion Cycle | `cashConversionCycle(dso, dio, dpo)` | DSO + DIO − DPO |

### Earnings quality
| Metric | Function | Formula |
|---|---|---|
| Payout Ratio | `payoutRatio(dps, eps)` | Dividend per Share / EPS (null if EPS ≤ 0) |
| Cash Conversion Ratio | `cashConversionRatio(ocf, netIncome)` | Operating Cash Flow / Net Income (null if net income ≤ 0) |

### Risk and financial distress
| Metric | Function | Notes |
|---|---|---|
| Altman Z-Score | `altmanZScore(wc, re, ebit, marketCap, sales, assets, liabilities)` | Original model for **public manufacturers**. > 2.99 safe, 1.81–2.99 grey, < 1.81 distress |
| Altman Z''-Score | `altmanZScoreDoublePrime(wc, re, ebit, bookEquity, assets, liabilities)` | For **non-manufacturers and private firms**: 6.56A + 3.26B + 6.72C + 1.05D. > 2.6 safe, 1.1–2.6 grey, < 1.1 distress |
| Piotroski F-Score | `piotroski({...})` | 9 binary signals; returns `{ score, maxScore, signals }`. Prior-year inputs enable 6 of the 9 |
| Sharpe Ratio | `sharpe(return, riskFree, stdDev)` | Same period basis for all three (normally annualised) |
| Sharpe from returns | `sharpeFromReturns(returns, rfPerPeriod = 0, periodsPerYear = 252)` | Annualised: mean excess × N ÷ (sample sd × √N) |
| Analyst Target Upside | `targetUpside(price, target)` | (Target − Price) / Price |

### Growth, TTM and history
| Function | Description |
|---|---|
| `calculateGrowthRate(current, previous)` | (Current − Previous) / \|Previous\|; null if previous is 0 |
| `growthRates(values)` | Period-over-period growth; `null` where the previous value is 0 |
| `yoyGrowth(values)` · `qoqGrowth(values)` | Same, but reports undefined periods as 0 (kept for compatibility) |
| `cagr(begin, end, periods)` | (End / Begin)^(1/periods) − 1 |
| `medianGrowth(values)` | Median period growth, skipping undefined periods |
| `computeTTM(quarters)` · `computeTTMAvg(quarters)` | Sum / average of the last 4 quarters (`computeTTM` needs 4) |
| `computeNYearAverage(q, n)` · `computeNYearSum(q, n)` | Average / sum of the last n × 4 quarters |
| `computeHistoricalPoint(q, back)` | Value `back` quarters before the latest |

---

## Individual functions

```typescript
import {
  pe, peg, priceToCashFlow, earningsYield, grahamNumber, marketCapToDebtCap,
  netDebtToEbitda, netCash, debtToAssets,
  daysSalesOutstanding, payableDays, cashConversionCycle,
  altmanZScore, altmanZScoreDoublePrime, sharpe, sharpeFromReturns, piotroski,
  calculateDCF, computeNCVPS, computeIntrinsicValue,
  cagr, medianGrowth, computeTTM, evaluate,
} from 'fundamental-analysis';

pe(150, 5);                                // 30
peg(30, 0.15);                             // 2      (P/E 30 with 15 % growth)
priceToCashFlow(150_000, 7_000);           // 21.43
earningsYield(5, 150);                     // 0.0333 (3.33 %)
grahamNumber(5, 20);                       // 47.43
marketCapToDebtCap(150_000, 20_000);       // 0.882

netDebtToEbitda(20_000, 5_000, 10_000);    // 1.5
netDebtToEbitda(100, 10, -20);             // null   (negative EBITDA: not meaningful)
netCash(10, 100);                          // 90
debtToAssets(20_000, 100_000);             // 0.2

daysSalesOutstanding(50_000, 6_250);       // 45.6 days
payableDays(30_000, 200_000);              // 54.75 days
cashConversionCycle(45, 60, 55);           // 50 days

altmanZScore(15_000, 20_000, 7_500, 250_000, 50_000, 100_000, 60_000);  // 3.7075 (safe)
altmanZScoreDoublePrime(15_000, 20_000, 7_500, 40_000, 100_000, 60_000); // 2.84   (safe)
sharpe(0.12, 0.04, 0.15);                  // 0.533
sharpeFromReturns([0.02, 0.01, -0.01, 0.03], 0, 12); // 2.54 (monthly returns, annualised)

piotroski({
  netIncome: 5_000, totalAssets: 100_000, operatingCashFlow: 7_000,
  priorNetIncome: 4_000, priorTotalAssets: 100_000,
});                                        // { score: 4, maxScore: 4, signals: {...} }

calculateDCF([1_000, 1_100, 1_210], 0.10, 0.025); // 15151.5 (enterprise value)
computeNCVPS(500_000, 300_000, 100_000);   // 2
computeIntrinsicValue(10, 0.15, 0.25);     // 140.50  per share, after a 25 % margin of safety
computeIntrinsicValue(10, 0.15, 0.25, { terminalPE: 20, discountRate: 0.08 }); // 205.33

cagr(1_000, 2_000, 5);                     // 0.1487 (14.87 %)
medianGrowth([800, 900, 1_100, 1_050, 1_300]); // 0.1736
computeTTM([2_200, 2_400, 2_600, 2_800]);  // 10000

evaluate.pe(pe(150, 5));
// { value: 30, status: "Bad", insight: "Expensive by generic standards. High growth is priced in; normal for some sectors." }
```

`computeIntrinsicValue(10, 0.15, 0.25)` step by step: 10 × 1.15⁵ = 20.11 EPS in year 5 → × 15 = 301.70 → ÷ 1.10⁵ = 187.33 today → × 0.75 = **140.50**.

---

## Composite scores

All four scores return 0–100. Weights are this library's heuristics, not an academic standard.

```typescript
import { computeQualityScore, computeGrowthScore, computeValueScore, computeMomentumScore, computeGFactor } from 'fundamental-analysis';

computeQualityScore({
  piotroskiScore: 7, piotroskiMaxScore: 9,   // pass PiotroskiResult.score / .maxScore
  roeVsSector: 1.1,                          // company ROE ÷ sector median ROE
  marginsImproving: true,
  insiderPledgeFree: true,                   // optional: insider/promoter shares pledged ≈ 0
  insiderHoldingStable: true,                // optional: insider/promoter holding stable or rising
});                                          // 93.33

computeQualityScore({ piotroskiScore: 7, roeVsSector: 1.1, marginsImproving: true }); // 90.48
// The insider/promoter signals are optional (common in India, rarely reported elsewhere).
// When omitted, the remaining weights are rescaled so the score still spans 0–100.

computeGrowthScore({ revenueGrowthVsSector: 1.3, profitGrowthRate: 0.20,
  epsGrowthRate: 0.18, cfoPositive: true, revenueAccelerating: true });  // 86.07
computeValueScore({ peVs3yrAvg: 0.8, pbVsSector: 0.75, peg: 0.9,
  historicalPePercentile: 30 });                                         // 65.96
computeMomentumScore({ priceVsSma200: 1.08, rsi: 58, adx: 28,
  volumeRatio: 1.2, roc125: 0.18 });                                     // 81.67 (RSI/ADX/SMA computed elsewhere)
computeGFactor(82, 78, 67);                  // 76.85 = 0.40 × Quality + 0.35 × Growth + 0.25 × Momentum
```

The older field names `pledgeFree` and `promoterStable` are still accepted.

---

## TypeScript

Full declarations are included. With `withInsights = true` the analyzers are typed as `{ value, status, insight }` per metric; without it, as `number | null`:

```typescript
import { analyzeCompany, type CompanySnapshotInput } from 'fundamental-analysis';

const snapshot: CompanySnapshotInput = { price: 150, eps: 5 };

const raw = analyzeCompany(snapshot);          // raw.valuation.pe: number | null
const rated = analyzeCompany(snapshot, true);  // rated.valuation.pe.status: "Good" | "Neutral" | "Bad" | "N/A"
```

`CompanySnapshotInput` fields — all optional numbers:

- **Market data:** `price`, `marketCap`, `eps`, `bookValuePerShare`, `revenuePerShare`, `annualDividendPerShare`, `analystTargetPrice`, `expectedEarningsGrowthRate` (decimal, for PEG), `sharesOutstanding`
- **Income statement:** `totalRevenue`, `costOfRevenue`, `grossProfit`, `operatingIncome`, `ebit`, `ebitda`, `interestExpense`, `netIncome`, `taxRate`
- **Cash flow:** `operatingCashFlow`, `freeCashFlow`
- **Balance sheet:** `totalAssets`, `totalLiabilities`, `totalEquity`, `currentAssets`, `currentLiabilities` (current & quick ratio, working capital), `totalDebt`, `longTermDebt`, `cashAndEquivalents`, `inventory`, `tradeReceivables`, `workingCapital`, `retainedEarnings`
- **Precomputed risk inputs** (same period basis): `returns`, `riskFree`, `stdDev`

| Analyzer | Returns |
|---|---|
| `analyzeValuation` | pe, pb, ps, peg, evEbitda, dividendYield, grahamNumber, priceToCashFlow, earningsYield, evRevenue, evFcf |
| `analyzeProfitability` | roa, roe, roic, grossMargin, operatingMargin, netProfitMargin, fcfMargin |
| `analyzeLiquidity` | currentRatio, quickRatio, debtToEquity, interestCoverage |
| `analyzeSolvency` | netDebt, netCash, netDebtToEbitda, debtToAssets, debtToEquity, interestCoverage |
| `analyzeEfficiency` | assetTurnover, inventoryTurnover, receivablesTurnover, daysSalesOutstanding |
| `analyzeRisk` | altmanZScore, altmanZScoreDoublePrime, sharpe, piotroski |
| `analyzeQuality` | payoutRatio, cashConversionRatio, targetUpside |
| `analyzeFundamentalTrends(series, 'annual' \| 'quarterly')` | growth arrays, CAGR (annual), margin arrays |

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md). Version 1.3.0 corrects several outputs (PEG, intrinsic value, net debt/EBITDA, current ratio in the analyzer and others); read it before upgrading.

## License

[MIT](./LICENSE) © 2026 Boffin Coders

---

## About Boffin Coders

<img src="https://raw.githubusercontent.com/boffincoders/fundamental-analysis/refs/heads/master/docs/public/brand/bc-gold.png" alt="Boffin Coders logo" width="48" align="left">

fundamental-analysis is built and maintained by [Boffin Coders](https://boffincoders.com/?utm_source=npm&utm_medium=readme&utm_campaign=fundamental-analysis). We design and build websites, web applications and mobile apps, and run their SEO, for businesses and agencies. Building a screener, a finance dashboard or fundamentals into your product? See our [web application development](https://boffincoders.com/services/web-application-development?utm_source=npm&utm_medium=readme&utm_campaign=fundamental-analysis) work or [talk to us](https://boffincoders.com/contact-us?utm_source=npm&utm_medium=readme&utm_campaign=fundamental-analysis).

More open source by Boffin Coders: [ts-netstorageapi-akamai](https://boffincoders.github.io/akamai-netstorageapi-typescript/) · [durable_queue](https://boffincoders.github.io/durable_queue/) · [all Boffin Coders open source](https://boffincoders.github.io/) · [github.com/boffincoders](https://github.com/boffincoders)

Issues and pull requests: [github.com/boffincoders/fundamental-analysis](https://github.com/boffincoders/fundamental-analysis/issues).

This library computes financial ratios from the numbers you supply. It is not investment advice.
