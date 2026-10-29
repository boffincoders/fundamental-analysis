# Changelog

## 1.3.2 — 2026-10-29

A patch release: functions that already return `number | null` no longer
leak `NaN` or `±Infinity`. Valid inputs give exactly the same results as
1.3.1.

### Changed outputs

| Function | 1.3.1 | 1.3.2 |
|---|---|---|
| `computeTTM([1, 2, undefined, 4])` | `NaN` | `null` (skipping a missing quarter would give a nine-month figure) |
| `computeTTMAvg`, `computeNYearSum`, `computeNYearAverage` with a missing or non-finite value in the window | `NaN` | `null` |
| `computeHistoricalPoint` landing on a missing or non-finite value | that value (`NaN`, `undefined`…) | `null` |
| `cagr(1e-300, 1e300, 0.001)` and other overflowing growth | `Infinity` | `null` |
| `computeIntrinsicValue`, `calculateDCF`, `grahamNumber` with results too large to represent | `Infinity` | `null` |
| `analyzeSolvency().netDebt` / `netCash` with a non-finite or overflowing debt or cash input | `NaN` / `Infinity` | `null` |
| Sums of the last N quarters that overflow | `Infinity` | `null` |

### Not changed yet

The plain-arithmetic helpers typed `number` (`netDebt`, `netCash`,
`calculateEnterpriseValue`, `cashConversionCycle`, `computeGFactor`) and the
composite score functions (`computeQualityScore`, `computeGrowthScore`,
`computeValueScore`, `computeMomentumScore`) still pass `NaN` through when
given invalid input. Making them return `null` changes their TypeScript
return type, so it is planned for the next minor release.

### Also

- Tests run in GitHub Actions on Node 18, 20 and 22 for every push and pull
  request (`.github/workflows/test.yml`).
- Docs: the "null instead of NaN" wording now says exactly which functions
  it covers.

## 1.3.1 — 2026-10-29

Documentation-only release. **No code changes:** every function returns
exactly what it did in 1.3.0, so upgrading is safe.

- README: new banner in the Boffin Coders brand and an "About Boffin
  Coders" section (with links to the sister packages
  ts-netstorageapi-akamai and durable_queue), so the npm page matches the
  docs site.
- Docs site (https://boffincoders.github.io/fundamental-analysis/):
  redesigned home page with concept diagrams, a "Try it" demo that
  analyses 20 US companies from their SEC filings, and Boffin Coders
  branding.

## 1.3.0 — 2026-10-28

### Renamed

The package is now published as **`fundamental-analysis`** (formerly
`finance-calculator-pro`). Install with `npm install fundamental-analysis`
and change imports from `'finance-calculator-pro'` to
`'fundamental-analysis'`; the API is otherwise the same as described below.
The GitHub repository is `boffincoders/fundamental-analysis` and the docs
moved to https://boffincoders.github.io/fundamental-analysis/.

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
