/**
 * Flat snapshot of one company's fundamentals. Every field is optional; a
 * metric whose inputs are missing returns null.
 *
 * Conventions:
 * - Monetary amounts in any single currency and unit (e.g. all in USD
 *   millions, or all in INR crore). Ratios are unit-free, so the currency does
 *   not matter as long as it is consistent within one snapshot.
 * - Rates are DECIMALS: 0.15 means 15 %.
 * - Flow items (revenue, income, cash flow) cover one period, normally the
 *   trailing twelve months or the last fiscal year. Balance-sheet items are
 *   period-end values.
 * - Expenses (costOfRevenue, interestExpense) are positive numbers.
 * - Zero is a valid value and is used as such; leave a field out when unknown.
 * - For enterprise value and net debt, a missing totalDebt or
 *   cashAndEquivalents is treated as 0 when the other one is supplied.
 */
export interface CompanySnapshotInput {
  // Market data
  /** Share price */
  price?: number;
  /** Market capitalisation (price × shares outstanding) */
  marketCap?: number;
  /** Earnings per share (TTM / last fiscal year) */
  eps?: number;
  bookValuePerShare?: number;
  revenuePerShare?: number;
  annualDividendPerShare?: number;
  analystTargetPrice?: number;
  /** Expected annual EPS growth as a decimal (0.15 = 15 %), used for PEG */
  expectedEarningsGrowthRate?: number;
  /** Shares outstanding — for Piotroski F7 */
  sharesOutstanding?: number;

  // Income statement
  totalRevenue?: number;
  /** Cost of revenue / cost of goods sold (positive number) */
  costOfRevenue?: number;
  /** Used for gross margin when costOfRevenue is not supplied */
  grossProfit?: number;
  operatingIncome?: number;
  /** Earnings before interest and taxes — Altman Z, interest coverage */
  ebit?: number;
  ebitda?: number;
  /** Interest expense (positive number) */
  interestExpense?: number;
  netIncome?: number;
  /** Effective tax rate as a decimal (0.25 = 25 %) — for ROIC */
  taxRate?: number;

  // Cash flow statement
  /** Cash flow from operations — P/CF, cash conversion, Piotroski F2/F4 */
  operatingCashFlow?: number;
  /** Operating cash flow minus capital expenditure */
  freeCashFlow?: number;

  // Balance sheet
  totalAssets?: number;
  totalLiabilities?: number;
  /** Shareholders' (book) equity */
  totalEquity?: number;
  /** Current assets — current ratio, quick ratio, working capital */
  currentAssets?: number;
  /** Current liabilities — current ratio, quick ratio, working capital */
  currentLiabilities?: number;
  /** Short-term + long-term borrowings */
  totalDebt?: number;
  /** Long-term debt — Piotroski F5 */
  longTermDebt?: number;
  cashAndEquivalents?: number;
  inventory?: number;
  /** Trade receivables (accounts receivable) — receivables turnover / DSO */
  tradeReceivables?: number;
  /** Current assets − current liabilities; derived from them when omitted */
  workingCapital?: number;
  retainedEarnings?: number;

  // Portfolio / risk (precomputed, same period basis)
  /** Portfolio or asset return for the period, as a decimal — Sharpe */
  returns?: number;
  /** Risk-free rate for the same period, as a decimal — Sharpe */
  riskFree?: number;
  /** Standard deviation of returns for the same period — Sharpe */
  stdDev?: number;
}
