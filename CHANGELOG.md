# Changelog

## 1.3.0 — 2026-10-28

A correctness release. Several functions returned wrong numbers or wrong
ratings in 1.2.x; they are fixed here, so **some outputs change**. If you
store or compare results, read the "Changed outputs" list before upgrading.

### Changed outputs (behaviour changes)

| Function | 1.2.x | 1.3.0 | Why |
|---|---|---|---|
| `peg(30, 0.15)` and `analyzeValuation().peg` | 200 | **2** | Growth is a decimal; PEG divides P/E by growth in whole percent. Every PEG is 100× smaller. |
| `peg()` with growth ≤ 0 or P/E ≤ 0 | negative / 0 | `null` | PEG is not meaningful there. |
| `computeIntrinsicValue(10, 0.15, 0.25)` | 26.82 | **140.50** | Old result was a future EPS, never discounted, and the margin of safety *raised* it. Now: EPS × (1+g)⁵ × terminal P/E 15 ÷ 1.10⁵ × (1 − margin). New optional 4th argument `{ terminalPE, discountRate, years }`. |
| `netDebtToEbitda(100, 10, -20)` | −4.5 | `null` | Ratio is undefined for EBITDA ≤ 0. |
| `analyzeSolvency` rating for net debt + negative EBITDA | "Good: net cash position" | **Bad** | "Net cash" now requires net debt < 0. |
| `analyzeLiquidity().currentRatio` / `quickRatio` | total assets ÷ total liabilities | current assets ÷ current liabilities, `null` without them | The old value was not a current ratio. New inputs `currentAssets`, `currentLiabilities`. |
| `analyzeValuation()` without `price` | P/E, P/B, P/S = 0 | `null` | Missing price was treated as 0. |
| `analyzeValuation()` without `marketCap` | EV multiples from EV = debt − cash | `null` | Missing market cap was treated as 0. |
| `analyzeValuation().grahamNumber` rating without price | "Good, 100 % margin of safety" | N/A | |
| `analyzeRisk().altmanZScore` without `marketCap` / `totalRevenue` | computed with 0 | `null` | |
| `altmanZScore()` with `totalLiabilities = 0` | `null` | a score (equity/liabilities capped at 10) | Debt-free companies get a score. |
| `altmanZScore()` with a missing / NaN input | that term silently 0 | `null` | |
| `computeQualityScore()` with Piotroski 3 of max 3 | counted as 3/9 | counted as 3/3 | New `piotroskiMaxScore` (default 9). |
| `computeQualityScore()` with negative `roeVsSector` | could go negative | clamped at 0 | |
| `computeValueScore()` with negative P/E or P/B ratio | full points | 0 points | Percentile also clamped to 0–100. |
| `medianGrowth([0, 100, 110])` | 0.05 | **0.10** | A period with previous value 0 is skipped, not counted as 0 %. |
| `analyzeFundamentalTrends().growth.*Growth` | 0 for undefined periods | `null` | Type is now `(number \| null)[]`. |
| `analyzeFundamentalTrends().growth.netIncomeCagr` with arrays of different length | used revenue's length | uses its own length | |
| `roe()` with equity ≤ 0 | a number (loss could look positive) | `null` | |
| `roic()` with invested capital ≤ 0 | a negative number | `null` | |
| `cashConversionRatio()` with net income ≤ 0 | e.g. 0.5 for −100 / −200, rated Good | `null` | |
| `payoutRatio()` with EPS ≤ 0 | negative | `null` | |
| `interestCoverage(ebit, interest)` with negative-signed interest | negative | uses \|interest\| | |
| `evaluate.interestCoverage(≤ 0)` | N/A "No debt" | **Bad** | |
| `evaluate.debtToEquity(< 0)` | Good "funded by equity" | **Bad** (negative equity) | |
| `evaluate.payoutRatio(0)` | Neutral "paying out most earnings" | N/A "No dividend paid" | |
| `evaluate.piotroski(3, 3)` | Neutral "Mixed signals" | Good, flagged as partial | Rated on the share of available signals. |
| `analyzeRisk().piotroski` with insufficient data (insights) | value 0 | value `null` | |
| `evaluate.roic` bands | Good ≥ 10 %, Neutral > 2 % | Good ≥ 10 %, Neutral > 5 % | |
| `daysSalesOutstanding(revenue, 0)` | `null` | 0 days | |
| `computeTTM()` with fewer than 4 quarters | partial sum | `null` | |
| `computeNYearSum()` with fewer than years × 4 quarters | partial sum | `null` | |
| `analyzeSolvency().netDebt` with no debt or cash given | 0 | `null` | |
| `evaluate.netDebt` / `analyzeSolvency` insight for positive net debt | status "N/A" | "Neutral" | |
| Any ratio given a NaN / Infinity input | NaN | `null` | `safeDivide` now checks both inputs and the result. |
| Insight texts | — | reworded | They now say thresholds are generic rules of thumb; several were wrong ("Gross Margin margin", P/S "correlation"). |

### Added

- `altmanZScoreDoublePrime()` (Altman Z'' for non-manufacturers and private
  firms) and `evaluate.altmanZScoreDoublePrime`; `analyzeRisk` returns it.
- `sharpeFromReturns(periodReturns, riskFreePerPeriod = 0, periodsPerYear = 252)`.
- `netCash()`; `analyzeSolvency` returns `netCash`; `evaluate.netDebt`.
- `growthRates()` — period growth with `null` for undefined periods.
- `CompanySnapshotInput.currentAssets` / `currentLiabilities`; `grossProfit`
  is now used for gross margin when `costOfRevenue` is absent; working
  capital is derived from current assets/liabilities when omitted.
- Optional `daysInPeriod` (default 365) for `daysSalesOutstanding`,
  `payableDays`, `workingCapitalDays`.
- `computeQualityScore`: optional `piotroskiMaxScore`, and generic
  `insiderPledgeFree` / `insiderHoldingStable` (both optional; weights are
  rescaled when omitted). `pledgeFree` / `promoterStable` still work.
- Typed overloads: `analyzeCompany(data, true).valuation.pe.value` now
  type-checks under `strict`. New exported result types
  (`CompanyAnalysis`, `CompanyAnalysisWithInsights`, `ValuationMetrics`, …).
- `LICENSE` (MIT), `"license": "MIT"`, `"sideEffects": false`, `engines`.

### Documentation

- README and docs site rewritten; every example output was recomputed from
  the built package. Input conventions (decimals, currency, signs, `null`)
  and the sector-blind nature of ratings are documented.
- package.json description and keywords no longer list features the library
  does not have (RSI, MACD, Bollinger Bands, ATR, VWAP, Beta, pivot points).

### Unchanged

`yoyGrowth()` / `qoqGrowth()` keep their `number[]` signature (0 for
undefined periods); `sharpe()` and all other function signatures are
backward compatible.
