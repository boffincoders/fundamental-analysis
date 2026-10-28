import {
  pe, pb, ps, peg, evEbitda, dividendYield, calculateDCF, grahamNumber,
  priceToCashFlow, earningsYield, evRevenue, evFcf, marketCapToDebtCap,
  roa, roe, roic, grossMargin, operatingMargin, netProfitMargin, fcfMargin,
  currentRatio, quickRatio, debtToEquity, interestCoverage,
  netDebt, netCash, netDebtToEbitda, debtToAssets,
  assetTurnover, inventoryTurnover, receivablesTurnover, daysSalesOutstanding,
  payableDays, workingCapitalDays, cashConversionCycle,
  payoutRatio, cashConversionRatio,
  altmanZScore, altmanZScoreDoublePrime, sharpe, targetUpside, piotroski,
  computeNCVPS, computeGFactor, computeIntrinsicValue,
  computeQualityScore, computeGrowthScore, computeValueScore, computeMomentumScore,
  medianGrowth, cagr,
  computeTTM, computeTTMAvg,
  computeNYearAverage, computeNYearSum, computeHistoricalPoint,
  evaluate
} from 'fundamental-analysis';

export interface MetricDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  history: string;
  formula: string;
  benchmark?: string;
  inputs: { key: string; label: string; min: number; max: number; step: number; default: number; prefix?: string }[];
  calculate: (inputs: any) => number | null | any;
  /** Receives the computed value and the current playground inputs. */
  evaluateInsight: (val: number | null | any, inputs: Record<string, number>) => any;
}

export const metricsData: Record<string, MetricDefinition> = {
  // --- VALUATION ---
  'pe': {
    id: 'pe', name: 'Price-to-Earnings (P/E)', category: 'Valuation',
    description: 'Measures a company\'s current share price relative to its per-share earnings.',
    history: 'Popularized by Benjamin Graham, the P/E ratio is the most widely used valuation metric. It tells investors how much they are paying for $1 of earnings.',
    formula: 'P/E = Price / EPS',
    benchmark: '< 15 = value territory · 15–25 = fairly priced · > 25 = growth premium. High-growth sectors (tech, biotech) routinely trade at 40–60×.',
    inputs: [
      { key: 'price', label: 'Share Price', min: 1, max: 10000, step: 1, default: 150, prefix: '$' },
      { key: 'eps', label: 'Earnings Per Share (EPS)', min: -100, max: 1000, step: 0.1, default: 5, prefix: '$' }
    ],
    calculate: (inputs) => pe(inputs.price, inputs.eps),
    evaluateInsight: evaluate.pe
  },
  'pb': {
    id: 'pb', name: 'Price-to-Book (P/B)', category: 'Valuation',
    description: 'Compares a firm\'s market capitalization to its book value.',
    history: 'Essential for value investors, it shows how much equity investors are paying for the net assets of a company. A P/B under 1 often signifies deep value.',
    formula: 'P/B = Price / Book Value Per Share',
    benchmark: '< 1.0 often signals deep value — you\'re buying assets below replacement cost. Graham recommended ≤ 1.5 for defensive investing. Asset-light businesses (software, services) naturally trade at 5–20×.',
    inputs: [
        { key: 'price', label: 'Share Price', min: 1, max: 10000, step: 1, default: 150, prefix: '$' },
        { key: 'bookValuePerShare', label: 'Book Value Per Share', min: -50, max: 500, step: 0.1, default: 20, prefix: '$' }
    ],
    calculate: (inputs) => pb(inputs.price, inputs.bookValuePerShare),
    evaluateInsight: evaluate.pb
  },
  'ps': {
    id: 'ps', name: 'Price-to-Sales (P/S)', category: 'Valuation',
    description: 'Compares a company\'s stock price to its revenues.',
    history: 'Crucial for evaluating young, high-growth companies that are not yet profitable but have strong top-line revenue growth.',
    formula: 'P/S = Price / Revenue Per Share',
    benchmark: '< 1 = cheap relative to sales · 1–2 = average · > 2 = expensive by generic standards. High-margin businesses such as software routinely trade at 5–15× sales, so compare within a sector.',
    inputs: [
        { key: 'price', label: 'Share Price', min: 1, max: 10000, step: 1, default: 150, prefix: '$' },
        { key: 'revenuePerShare', label: 'Revenue Per Share', min: 0, max: 1000, step: 1, default: 50, prefix: '$' }
    ],
    calculate: (inputs) => ps(inputs.price, inputs.revenuePerShare),
    evaluateInsight: evaluate.ps
  },
  'peg': {
    id: 'peg', name: 'PEG Ratio', category: 'Valuation',
    description: 'The P/E ratio adjusted for earnings growth.',
    history: 'Popularized by Peter Lynch, the PEG ratio improves on the P/E ratio by factoring in the expected growth rate.',
    formula: 'PEG = P/E ÷ (annual EPS growth × 100)   e.g. P/E 30, growth 0.15 → 30 ÷ 15 = 2.0',
    benchmark: '< 1 = cheap relative to growth (Lynch\'s rule) · 1–1.5 = fairly valued · > 1.5 = expensive relative to growth. Enter growth as a decimal (0.15 = 15 %). PEG is not meaningful for negative earnings or zero/negative growth, so the function returns null.',
    inputs: [
        { key: 'peRatio', label: 'P/E Ratio', min: 1, max: 100, step: 1, default: 25 },
        { key: 'earningsGrowthRate', label: 'Expected EPS Growth (decimal, 0.15 = 15%)', min: -0.2, max: 0.6, step: 0.01, default: 0.15 }
    ],
    calculate: (inputs) => peg(inputs.peRatio, inputs.earningsGrowthRate),
    evaluateInsight: evaluate.peg
  },
  'ev-ebitda': {
    id: 'ev-ebitda', name: 'EV/EBITDA', category: 'Valuation',
    description: 'Compares a company\'s total value to its cash earnings minus non-cash expenses.',
    history: 'Heavily used in private equity and mergers/acquisitions to value a business regardless of its capital structure.',
    formula: 'EV/EBITDA = Enterprise Value / EBITDA',
    benchmark: '< 10× = cheap · 10–15× = fairly valued · > 15× = expensive (the library\'s generic rating thresholds). Normal ranges differ by sector; not meaningful for banks and insurers.',
    inputs: [
        { key: 'enterpriseValue', label: 'Enterprise Value', min: 1000, max: 5000000, step: 1000, default: 165000, prefix: '$' },
        { key: 'ebitda', label: 'EBITDA', min: -10000, max: 500000, step: 1000, default: 10000, prefix: '$' }
    ],
    calculate: (inputs) => evEbitda(inputs.enterpriseValue, inputs.ebitda),
    evaluateInsight: evaluate.evEbitda
  },
  'dcf': {
    id: 'dcf', name: 'Discounted Cash Flow (DCF)', category: 'Valuation',
    description: 'Estimates the value of an investment based on its expected future cash flows.',
    history: 'The gold standard of theoretical intrinsic valuation, computing the present value of all future cash generation.',
    formula: 'DCF = Sum(FCF / (1 + r)^t) + Terminal Value',
    inputs: [
        { key: 'fcf1', label: 'FCF Year 1', min: 0, max: 500000, step: 100, default: 3000, prefix: '$' },
        { key: 'fcf2', label: 'FCF Year 2', min: 0, max: 500000, step: 100, default: 3500, prefix: '$' },
        { key: 'fcf3', label: 'FCF Year 3', min: 0, max: 500000, step: 100, default: 4000, prefix: '$' },
        { key: 'discountRate', label: 'Discount Rate (WACC)', min: 0.01, max: 0.5, step: 0.01, default: 0.10 },
        { key: 'terminalGrowthRate', label: 'Terminal Growth Rate', min: 0.01, max: 0.1, step: 0.005, default: 0.025 }
    ],
    calculate: (inputs) => calculateDCF([inputs.fcf1, inputs.fcf2, inputs.fcf3], inputs.discountRate, inputs.terminalGrowthRate),
    evaluateInsight: (val) => ({ value: val, status: 'Neutral', insight: 'Present value of the cash flows = enterprise value. Compare with market cap + debt − cash, or convert to a per-share value with impliedSharePrice().' })
  },
  'graham': {
    id: 'graham', name: 'Graham Number', category: 'Valuation',
    description: 'Identifies the max price a defensive investor should pay for a stock.',
    history: 'Created by Benjamin Graham ("the father of value investing" & Warren Buffett\'s mentor), it assumes a P/E under 15 and P/B under 1.5 is safe.',
    formula: '√(22.5 × EPS × Book Value Per Share)',
    inputs: [
        { key: 'eps', label: 'EPS', min: -10, max: 500, step: 1, default: 5, prefix: '$' },
        { key: 'bookValuePerShare', label: 'Book Value Per Share', min: -50, max: 500, step: 0.1, default: 20, prefix: '$' }
    ],
    calculate: (inputs) => grahamNumber(inputs.eps, inputs.bookValuePerShare),
    evaluateInsight: (val) => ({ value: val, status: 'Neutral', insight: 'Defensive Value limit. Do not pay more than this if you are a strict value investor.' })
  },
  'dividend': {
    id: 'dividend', name: 'Dividend Yield', category: 'Valuation',
    description: 'Shows how much a company pays out in dividends each year relative to its stock price.',
    history: 'A critical metric for income investors seeking cash flow directly from their equity holdings.',
    formula: 'Dividend Yield = Annual Dividend Per Share / Price',
    inputs: [
        { key: 'annualDividendPerShare', label: 'Annual Dividend', min: 0, max: 50, step: 0.1, default: 1.5, prefix: '$' },
        { key: 'price', label: 'Share Price', min: 1, max: 10000, step: 1, default: 150, prefix: '$' }
    ],
    calculate: (inputs) => dividendYield(inputs.annualDividendPerShare, inputs.price),
    evaluateInsight: evaluate.dividendYield
  },
  
  // --- PROFITABILITY ---
  'roa': {
    id: 'roa', name: 'Return on Assets (ROA)', category: 'Profitability',
    description: 'Indicator of how profitable a company is relative to its total assets.',
    history: 'A foundational metric created by DuPont in the 1920s to evaluate management efficiency in deploying assets to generate income.',
    formula: 'ROA = Net Income / Total Assets',
    benchmark: '> 5% is solid · > 10% is excellent. Banks typically earn about 1% because they are highly leveraged; capital-intensive utilities 2–4%. Compare only within the same industry.',
    inputs: [
        { key: 'netIncome', label: 'Net Income', min: -100000, max: 1000000, step: 1000, default: 5000 },
        { key: 'totalAssets', label: 'Total Assets', min: 1000, max: 5000000, step: 1000, default: 100000 }
    ],
    calculate: (inputs) => roa(inputs.netIncome, inputs.totalAssets),
    evaluateInsight: evaluate.roa
  },
  'roe': {
    id: 'roe', name: 'Return on Equity (ROE)', category: 'Profitability',
    description: 'Measure of the profitability of a business in relation to the equity.',
    history: 'Loved by Warren Buffett, ROE specifically isolates how much profit management generates using the shareholders\' deployed capital.',
    formula: 'ROE = Net Income / Total Equity',
    benchmark: '> 15% is strong · > 20% is exceptional and Buffett\'s typical threshold for quality businesses. ROE inflated by high leverage (D/E > 2) should be discounted.',
    inputs: [
        { key: 'netIncome', label: 'Net Income', min: -100000, max: 1000000, step: 1000, default: 5000 },
        { key: 'totalEquity', label: 'Total Equity', min: 1000, max: 5000000, step: 1000, default: 40000 }
    ],
    calculate: (inputs) => roe(inputs.netIncome, inputs.totalEquity),
    evaluateInsight: evaluate.roe
  },
  'roic': {
    id: 'roic', name: 'Return on Invested Capital (ROIC)', category: 'Profitability',
    description: 'Assesses a company\'s efficiency at allocating the capital under its control to profitable investments.',
    history: 'Widely considered the ultimate metric of capital allocation strength, famously touted by Charlie Munger.',
    formula: 'ROIC = NOPAT / Invested Capital',
    inputs: [
        { key: 'operatingIncome', label: 'Operating Income', min: -50000, max: 500000, step: 1000, default: 7000 },
        { key: 'taxRate', label: 'Tax Rate', min: 0, max: 0.5, step: 0.01, default: 0.21 },
        { key: 'totalDebt', label: 'Total Debt', min: 0, max: 500000, step: 1000, default: 20000 },
        { key: 'totalEquity', label: 'Total Equity', min: 1000, max: 500000, step: 1000, default: 40000 },
        { key: 'cashAndEquivalents', label: 'Cash & Equivalents', min: 0, max: 500000, step: 1000, default: 5000 }
    ],
    calculate: (inputs) => roic(inputs.operatingIncome, inputs.taxRate, inputs.totalDebt, inputs.totalEquity, inputs.cashAndEquivalents),
    evaluateInsight: evaluate.roic
  },
  'gross-margin': {
    id: 'gross-margin', name: 'Gross Margin', category: 'Profitability',
    description: 'The percent of total sales revenue that the company retains after incurring the direct costs associated with producing the goods and services it sells.',
    history: 'The fundamental start of the income statement analysis indicating pricing power against core production costs.',
    formula: 'Gross Margin = (Revenue - Cost of Revenue) / Revenue',
    inputs: [
        { key: 'revenue', label: 'Total Revenue', min: 1000, max: 1000000, step: 1000, default: 50000 },
        { key: 'costOfRevenue', label: 'Cost of Revenue', min: 0, max: 1000000, step: 1000, default: 20000 }
    ],
    calculate: (inputs) => grossMargin(inputs.revenue, inputs.costOfRevenue),
    evaluateInsight: (val) => evaluate.margin(val, 'Gross')
  },
  'operating-margin': {
    id: 'operating-margin', name: 'Operating Margin', category: 'Profitability',
    description: 'Measures how much profit a company makes on each unit of sales after all operating expenses — cost of goods sold, selling, general and administrative costs, R&D, depreciation — but before interest and tax.',
    history: 'A prime indicator of operational efficiency, excluding taxes and interest to focus purely on the core business.',
    formula: 'Operating Margin = Operating Income / Revenue',
    inputs: [
        { key: 'operatingIncome', label: 'Operating Income', min: -50000, max: 500000, step: 1000, default: 7000 },
        { key: 'revenue', label: 'Total Revenue', min: 1000, max: 1000000, step: 1000, default: 50000 }
    ],
    calculate: (inputs) => operatingMargin(inputs.operatingIncome, inputs.revenue),
    evaluateInsight: (val) => evaluate.margin(val, 'Operating')
  },
  'net-margin': {
    id: 'net-margin', name: 'Net Profit Margin', category: 'Profitability',
    description: 'The percentage of revenue left after all expenses have been deducted from sales.',
    formula: 'Net Margin = Net Income / Total Revenue',
    history: 'The ultimate bottom-line metric indicating the overall efficiency of a company\'s cost structure.',
    inputs: [
        { key: 'netIncome', label: 'Net Income', min: -10000, max: 100000, step: 1000, default: 5000 },
        { key: 'revenue', label: 'Revenue', min: 1000, max: 500000, step: 1000, default: 50000 }
    ],
    calculate: (inputs) => netProfitMargin(inputs.netIncome, inputs.revenue),
    evaluateInsight: (val) => evaluate.margin(val, 'Net Profit')
  },
  'fcf-margin': {
    id: 'fcf-margin', name: 'Free Cash Flow Margin', category: 'Profitability',
    description: 'Measures what percentage of revenue is converted into free cash flow.',
    formula: 'FCF Margin = Free Cash Flow / Revenue',
    history: 'Preferred by institutional investors who believe "cash is king" and earnings can be manipulated.',
    inputs: [
        { key: 'freeCashFlow', label: 'Free Cash Flow', min: -10000, max: 100000, step: 1000, default: 3000 },
        { key: 'revenue', label: 'Revenue', min: 1000, max: 500000, step: 1000, default: 50000 }
    ],
    calculate: (inputs) => fcfMargin(inputs.freeCashFlow, inputs.revenue),
    evaluateInsight: (val) => evaluate.margin(val, 'Free Cash Flow')
  },

  // --- LIQUIDITY ---
  'current-ratio': {
    id: 'current-ratio', name: 'Current Ratio', category: 'Liquidity',
    description: 'Measures a company\'s ability to pay short-term obligations.',
    history: 'A classic bank-loan liquidity test to ensure the company has enough assets to cover liabilities over the next 12 months.',
    formula: 'Current Ratio = Current Assets / Current Liabilities',
    benchmark: '1.2–2.0 = healthy (rated Good) · above 2.0 = very liquid, possibly idle assets (Neutral) · below 1.2 = tight (Bad). Supermarkets and other fast-cash businesses run below 1 comfortably. Use current — not total — assets and liabilities.',
    inputs: [
        { key: 'currentAssets', label: 'Current Assets', min: 1000, max: 500000, step: 1000, default: 40000 },
        { key: 'currentLiabilities', label: 'Current Liabilities', min: 1000, max: 500000, step: 1000, default: 25000 }
    ],
    calculate: (inputs) => currentRatio(inputs.currentAssets, inputs.currentLiabilities),
    evaluateInsight: evaluate.currentRatio
  },
  'quick-ratio': {
    id: 'quick-ratio', name: 'Quick Ratio', category: 'Liquidity',
    description: 'Also known as the Acid-Test Ratio, this tightens short-term liquidity evaluation by removing inventory.',
    history: 'A more stringent version of the Current Ratio used because inventory is often difficult to liquidate immediately in a crisis.',
    formula: 'Quick Ratio = (Current Assets - Inventory) / Current Liabilities',
    inputs: [
        { key: 'currentAssets', label: 'Current Assets', min: 1000, max: 500000, step: 1000, default: 40000 },
        { key: 'inventory', label: 'Inventory', min: 0, max: 200000, step: 1000, default: 10000 },
        { key: 'currentLiabilities', label: 'Current Liabilities', min: 1000, max: 500000, step: 1000, default: 25000 }
    ],
    calculate: (inputs) => quickRatio(inputs.currentAssets, inputs.inventory, inputs.currentLiabilities),
    evaluateInsight: evaluate.quickRatio
  },
  'debt-to-equity': {
    id: 'debt-to-equity', name: 'Debt-to-Equity', category: 'Liquidity',
    description: 'Evaluates a company\'s financial leverage by dividing total debt (borrowings) by shareholder equity.',
    history: 'Crucial for understanding how a company is financing its operations—whether heavily reliant on debt or equity.',
    formula: 'D/E = Total Debt / Total Equity',
    benchmark: '< 1.0 is conservative · 1–2 is moderate · > 2 signals elevated financial risk. Capital-intensive industries (industrials, utilities) routinely operate at 2–4×. A negative value means negative shareholder equity and is rated Bad.',
    inputs: [
        { key: 'totalDebt', label: 'Total Debt', min: 0, max: 1000000, step: 1000, default: 20000 },
        { key: 'totalEquity', label: 'Total Equity', min: 1000, max: 1000000, step: 1000, default: 40000 },
    ],
    calculate: (inputs) => debtToEquity(inputs.totalDebt, inputs.totalEquity),
    evaluateInsight: evaluate.debtToEquity
  },
  'interest-coverage': {
    id: 'interest-coverage', name: 'Interest Coverage Ratio', category: 'Liquidity',
    description: 'Measures how easily a company can pay interest on its outstanding debt.',
    history: 'Bondholders and lenders heavily scrutinize this to identify companies at risk of defaulting on coupon payments.',
    formula: 'Interest Coverage = EBIT / |Interest Expense|',
    benchmark: '≥ 3× = comfortable · 1.5–3× = narrow · < 1.5× = risky. Zero or negative EBIT is rated Bad. Interest expense reported as a negative number is treated as a cost.',
    inputs: [
        { key: 'ebit', label: 'EBIT', min: -10000, max: 500000, step: 1000, default: 7500 },
        { key: 'interestExpense', label: 'Interest Expense', min: 0, max: 100000, step: 500, default: 500 },
    ],
    calculate: (inputs) => interestCoverage(inputs.ebit, inputs.interestExpense),
    evaluateInsight: evaluate.interestCoverage
  },

  // --- EFFICIENCY ---
  'asset-turnover': {
    id: 'asset-turnover', name: 'Asset Turnover', category: 'Efficiency',
    description: 'Measures the value of a company\'s sales or revenues generated relative to the value of its assets.',
    history: 'Often used comparatively within the same industry to see which management team extracts the most value from their property and equipment.',
    formula: 'Asset Turnover = Revenue / Total Assets  (pass the average of opening and closing assets if you have both)',
    benchmark: '≥ 1.0 = efficient · 0.5–1.0 = moderate · < 0.5 = low. Retailers run well above 1; utilities and telecoms well below. Compare within a sector.',
    inputs: [
        { key: 'revenue', label: 'Total Revenue', min: 1000, max: 1000000, step: 1000, default: 50000 },
        { key: 'averageTotalAssets', label: 'Total Assets (or average)', min: 1000, max: 1000000, step: 1000, default: 100000 },
    ],
    calculate: (inputs) => assetTurnover(inputs.revenue, inputs.averageTotalAssets),
    evaluateInsight: evaluate.assetTurnover
  },
  'inventory-turnover': {
    id: 'inventory-turnover', name: 'Inventory Turnover', category: 'Efficiency',
    description: 'Shows how many times a company has sold and replaced inventory during a given period.',
    history: 'Critical for retail and manufacturing. A low turnover implies weak sales or excess inventory.',
    formula: 'Inventory Turnover = COGS / Inventory  (pass average inventory if you have it)',
    inputs: [
        { key: 'costOfRevenue', label: 'COGS', min: 1000, max: 1000000, step: 1000, default: 20000 },
        { key: 'averageInventory', label: 'Inventory (or average)', min: 1000, max: 500000, step: 1000, default: 10000 },
    ],
    calculate: (inputs) => inventoryTurnover(inputs.costOfRevenue, inputs.averageInventory),
    evaluateInsight: evaluate.inventoryTurnover,
  },
  'receivables-turnover': {
    id: 'receivables-turnover', name: 'Receivables Turnover', category: 'Efficiency',
    description: 'How many times a company collects its average accounts receivable per year. Higher = faster collections.',
    history: 'Tracks the effectiveness of a company\'s credit and collection policies. A deteriorating ratio is often an early warning of cash flow problems or overly aggressive revenue recognition.',
    formula: 'Receivables Turnover = Revenue / Trade Receivables',
    inputs: [
      { key: 'revenue', label: 'Total Revenue', min: 1000, max: 1000000, step: 1000, default: 50000, prefix: '$' },
      { key: 'tradeReceivables', label: 'Trade Receivables', min: 100, max: 200000, step: 500, default: 6250, prefix: '$' },
    ],
    calculate: (inputs) => receivablesTurnover(inputs.revenue, inputs.tradeReceivables),
    evaluateInsight: evaluate.receivablesTurnover,
  },
  'days-sales-outstanding': {
    id: 'days-sales-outstanding', name: 'Days Sales Outstanding (DSO)', category: 'Efficiency',
    description: 'Average number of days to collect payment after a sale. Lower DSO means faster cash conversion.',
    history: 'A key working capital metric tracked by CFOs and credit analysts. A rising DSO trend often precedes write-offs and signals that customers are struggling to pay.',
    formula: 'DSO = (Trade Receivables / Revenue) × 365   (= 365 / receivables turnover)',
    inputs: [
      { key: 'revenue', label: 'Total Revenue', min: 1000, max: 1000000, step: 1000, default: 50000, prefix: '$' },
      { key: 'tradeReceivables', label: 'Trade Receivables', min: 100, max: 200000, step: 500, default: 6250, prefix: '$' },
    ],
    calculate: (inputs) => daysSalesOutstanding(inputs.revenue, inputs.tradeReceivables),
    evaluateInsight: evaluate.daysSalesOutstanding,
  },

  // --- QUALITY ---
  'payout-ratio': {
    id: 'payout-ratio', name: 'Payout Ratio', category: 'Quality',
    description: 'Fraction of earnings distributed as dividends. Signals dividend sustainability and capital allocation discipline.',
    history: 'A critical input for dividend sustainability analysis. A ratio above 100% means dividends are paid from borrowings or reserves, not earnings — a major red flag for income investors.',
    formula: 'Payout Ratio = Annual Dividend Per Share / EPS',
    inputs: [
      { key: 'annualDividendPerShare', label: 'Annual Dividend Per Share', min: 0, max: 50, step: 0.1, default: 2, prefix: '$' },
      { key: 'eps', label: 'Earnings Per Share (EPS)', min: 0.01, max: 500, step: 0.1, default: 5, prefix: '$' },
    ],
    calculate: (inputs) => payoutRatio(inputs.annualDividendPerShare, inputs.eps),
    evaluateInsight: evaluate.payoutRatio,
  },
  'cash-conversion-ratio': {
    id: 'cash-conversion-ratio', name: 'Cash Conversion Ratio (CCR)', category: 'Quality',
    description: 'Ratio of operating cash flow to net income. Values > 1 indicate high earnings quality backed by real cash.',
    history: 'Used by forensic accountants and short sellers to detect earnings manipulation. Companies with consistently low CCR (income >> cash flow) often face eventual earnings restatements.',
    formula: 'CCR = Operating Cash Flow / Net Income   (null when net income ≤ 0)',
    benchmark: '> 1.0 = cash-backed earnings (strong quality) · 0.8–1.0 = acceptable · < 0.8 warrants scrutiny. A consistently low CCR is an early forensic accounting warning sign.',
    inputs: [
      { key: 'operatingCashFlow', label: 'Operating Cash Flow', min: -50000, max: 500000, step: 1000, default: 7000, prefix: '$' },
      { key: 'netIncome', label: 'Net Income', min: -50000, max: 500000, step: 1000, default: 5000, prefix: '$' },
    ],
    calculate: (inputs) => cashConversionRatio(inputs.operatingCashFlow, inputs.netIncome),
    evaluateInsight: evaluate.cashConversionRatio,
  },

  // --- VALUATION (new) ---
  'price-to-cash-flow': {
    id: 'price-to-cash-flow', name: 'Price-to-Cash-Flow (P/CF)', category: 'Valuation',
    description: 'Compares a company\'s market cap to its operating cash flow — harder to manipulate than earnings.',
    history: 'Preferred over P/E by analysts who believe cash flow is a more reliable indicator of value than accounting earnings, which can be adjusted by management.',
    formula: 'P/CF = Market Cap / Operating Cash Flow',
    inputs: [
      { key: 'marketCap', label: 'Market Cap', min: 1000, max: 5000000, step: 1000, default: 150000, prefix: '$' },
      { key: 'operatingCashFlow', label: 'Operating Cash Flow', min: -50000, max: 500000, step: 1000, default: 7000, prefix: '$' },
    ],
    calculate: (inputs) => priceToCashFlow(inputs.marketCap, inputs.operatingCashFlow),
    evaluateInsight: evaluate.priceToCashFlow,
  },
  'earnings-yield': {
    id: 'earnings-yield', name: 'Earnings Yield', category: 'Valuation',
    description: 'The inverse of P/E ratio — shows EPS as a percentage of share price. Useful for comparing stocks to bonds.',
    history: 'The earnings yield can be compared with bond yields to judge the relative attractiveness of equities. Joel Greenblatt\'s "Magic Formula" uses a related version, EBIT / Enterprise Value; this function uses the simpler EPS / Price.',
    formula: 'Earnings Yield = EPS / Price',
    inputs: [
      { key: 'eps', label: 'Earnings Per Share', min: -100, max: 500, step: 0.1, default: 5, prefix: '$' },
      { key: 'price', label: 'Share Price', min: 1, max: 10000, step: 1, default: 150, prefix: '$' },
    ],
    calculate: (inputs) => earningsYield(inputs.eps, inputs.price),
    evaluateInsight: evaluate.earningsYield,
  },
  'ev-revenue': {
    id: 'ev-revenue', name: 'EV / Revenue', category: 'Valuation',
    description: 'Enterprise value relative to total revenue — a capital-structure-neutral version of P/S.',
    history: 'Used heavily for early-stage or unprofitable companies where EBITDA is negative but revenue is growing rapidly. Common in SaaS and tech sector analysis.',
    formula: 'EV/Revenue = Enterprise Value / Total Revenue',
    inputs: [
      { key: 'enterpriseValue', label: 'Enterprise Value', min: 1000, max: 5000000, step: 1000, default: 165000, prefix: '$' },
      { key: 'totalRevenue', label: 'Total Revenue', min: 1000, max: 1000000, step: 1000, default: 50000, prefix: '$' },
    ],
    calculate: (inputs) => evRevenue(inputs.enterpriseValue, inputs.totalRevenue),
    evaluateInsight: evaluate.evRevenue,
  },
  'ev-fcf': {
    id: 'ev-fcf', name: 'EV / Free Cash Flow', category: 'Valuation',
    description: 'Enterprise value divided by free cash flow — shows how expensive a company is relative to cash it actually generates.',
    history: 'Preferred by free-cash-flow-focused investors like Bill Ackman and Terry Smith, who view FCF as the purest measure of corporate value creation.',
    formula: 'EV/FCF = Enterprise Value / Free Cash Flow',
    inputs: [
      { key: 'enterpriseValue', label: 'Enterprise Value', min: 1000, max: 5000000, step: 1000, default: 165000, prefix: '$' },
      { key: 'freeCashFlow', label: 'Free Cash Flow', min: -50000, max: 500000, step: 1000, default: 3000, prefix: '$' },
    ],
    calculate: (inputs) => evFcf(inputs.enterpriseValue, inputs.freeCashFlow),
    evaluateInsight: evaluate.evFcf,
  },

  // --- SOLVENCY ---
  'net-debt': {
    id: 'net-debt', name: 'Net Debt', category: 'Solvency',
    description: 'Total debt minus cash and equivalents. Negative means the company is in a net cash position.',
    history: 'Used by credit analysts and fixed-income investors as the true measure of financial obligation, since cash on hand offsets gross debt immediately if needed.',
    formula: 'Net Debt = Total Debt − Cash & Equivalents',
    inputs: [
      { key: 'totalDebt', label: 'Total Debt', min: 0, max: 500000, step: 1000, default: 20000, prefix: '$' },
      { key: 'cash', label: 'Cash & Equivalents', min: 0, max: 500000, step: 1000, default: 5000, prefix: '$' },
    ],
    calculate: (inputs) => netDebt(inputs.totalDebt, inputs.cash),
    evaluateInsight: (val) => evaluate.netDebt(val),
  },
  'net-cash': {
    id: 'net-cash', name: 'Net Cash', category: 'Solvency',
    description: 'Cash and equivalents in excess of total debt. Zero when debt is greater than or equal to cash.',
    history: 'Value investors look for net cash because it gives a company room to invest, buy back shares or survive a downturn without new financing.',
    formula: 'Net Cash = max(Cash − Total Debt, 0)',
    inputs: [
      { key: 'totalDebt', label: 'Total Debt', min: 0, max: 500000, step: 1000, default: 10000, prefix: '$' },
      { key: 'cash', label: 'Cash & Equivalents', min: 0, max: 500000, step: 1000, default: 30000, prefix: '$' },
    ],
    calculate: (inputs) => netCash(inputs.totalDebt, inputs.cash),
    evaluateInsight: (val) => ({ value: val, status: val > 0 ? 'Good' : 'Neutral', insight: val > 0 ? 'Cash exceeds debt — the company could repay all borrowings from cash today.' : 'No net cash — debt is greater than or equal to cash.' }),
  },
  'net-debt-to-ebitda': {
    id: 'net-debt-to-ebitda', name: 'Net Debt / EBITDA', category: 'Solvency',
    description: 'Shows how many years of EBITDA it would take to repay all net debt — the primary leverage metric used by lenders.',
    history: 'The standard leverage covenant in leveraged buyouts and corporate credit agreements. Ratios above 4× typically trigger credit downgrades or covenant breaches.',
    formula: 'Net Debt / EBITDA = (Total Debt − Cash) / EBITDA',
    benchmark: '< 1.5× = low leverage (Good) · 1.5–3× = moderate · > 3× = high. Lender covenants are often set around 3–4×. Only defined for positive EBITDA: with negative EBITDA the ratio is null, and net debt plus negative EBITDA is rated Bad — never "net cash".',
    inputs: [
      { key: 'totalDebt', label: 'Total Debt', min: 0, max: 500000, step: 1000, default: 20000, prefix: '$' },
      { key: 'cash', label: 'Cash & Equivalents', min: 0, max: 500000, step: 1000, default: 5000, prefix: '$' },
      { key: 'ebitda', label: 'EBITDA', min: -50000, max: 500000, step: 1000, default: 10000, prefix: '$' },
    ],
    calculate: (inputs) => netDebtToEbitda(inputs.totalDebt, inputs.cash, inputs.ebitda),
    evaluateInsight: (val, inputs) => evaluate.netDebtToEbitda(val, { netDebt: netDebt(inputs.totalDebt, inputs.cash), ebitda: inputs.ebitda }),
  },
  'debt-to-assets': {
    id: 'debt-to-assets', name: 'Debt-to-Assets', category: 'Solvency',
    description: 'Percentage of company assets financed by debt. A higher ratio signals greater financial risk.',
    history: 'One of the oldest solvency ratios used in commercial banking to assess whether total assets provide sufficient collateral for outstanding debt obligations.',
    formula: 'Debt-to-Assets = Total Debt / Total Assets',
    inputs: [
      { key: 'totalDebt', label: 'Total Debt', min: 0, max: 500000, step: 1000, default: 20000, prefix: '$' },
      { key: 'totalAssets', label: 'Total Assets', min: 1000, max: 500000, step: 1000, default: 100000, prefix: '$' },
    ],
    calculate: (inputs) => debtToAssets(inputs.totalDebt, inputs.totalAssets),
    evaluateInsight: evaluate.debtToAssets,
  },

  // --- RISK ---
  'z-score': {
    id: 'z-score', name: 'Altman Z-Score', category: 'Risk',
    description: 'Estimates the risk of financial distress within two years for publicly traded manufacturing companies.',
    history: 'Developed by Edward Altman in 1968 on US public manufacturers. In the original sample it classified about 72% of bankruptcies correctly two years before the event. For service, technology, retail and private companies use the Z\'\'-Score instead.',
    formula: 'Z = 1.2·WC/TA + 1.4·RE/TA + 3.3·EBIT/TA + 0.6·MarketCap/TL + 1.0·Sales/TA',
    benchmark: 'Z > 2.99 = Safe Zone · 1.81–2.99 = Grey Zone · Z < 1.81 = Distress Zone. Original model for public manufacturers only; not meaningful for banks or insurers.',
    inputs: [
        { key: 'workingCapital', label: 'Working Capital', min: -50000, max: 100000, step: 1000, default: 15000 },
        { key: 'retainedEarnings', label: 'Retained Earnings', min: -50000, max: 100000, step: 1000, default: 20000 },
        { key: 'ebit', label: 'EBIT', min: -50000, max: 100000, step: 1000, default: 7500 },
        { key: 'marketCap', label: 'Market Cap', min: 1000, max: 500000, step: 1000, default: 150000 },
        { key: 'totalRevenue', label: 'Total Revenue', min: 1000, max: 500000, step: 1000, default: 50000 },
        { key: 'totalAssets', label: 'Total Assets', min: 1000, max: 500000, step: 1000, default: 100000 },
        { key: 'totalLiabilities', label: 'Total Liabilities', min: 1000, max: 500000, step: 1000, default: 60000 }
    ],
    calculate: (inputs) => altmanZScore(inputs.workingCapital, inputs.retainedEarnings, inputs.ebit, inputs.marketCap, inputs.totalRevenue, inputs.totalAssets, inputs.totalLiabilities),
    evaluateInsight: evaluate.altmanZScore
  },
  'z-score-double-prime': {
    id: 'z-score-double-prime', name: 'Altman Z\'\'-Score (non-manufacturers)', category: 'Risk',
    description: 'A version of the Altman Z-Score for non-manufacturing, service and private companies. It drops the sales-turnover term and uses book equity instead of market value.',
    history: 'Published by Edward Altman in 1995 because the original model\'s sales/assets term penalised asset-light businesses and needed a market price. This is the version without the +3.25 constant used for emerging-market bonds.',
    formula: "Z'' = 6.56·WC/TA + 3.26·RE/TA + 6.72·EBIT/TA + 1.05·BookEquity/TL",
    benchmark: "Z'' > 2.6 = Safe Zone · 1.1–2.6 = Grey Zone · Z'' < 1.1 = Distress Zone. Not meaningful for banks or insurers.",
    inputs: [
        { key: 'workingCapital', label: 'Working Capital', min: -50000, max: 100000, step: 1000, default: 15000 },
        { key: 'retainedEarnings', label: 'Retained Earnings', min: -50000, max: 100000, step: 1000, default: 20000 },
        { key: 'ebit', label: 'EBIT', min: -50000, max: 100000, step: 1000, default: 7500 },
        { key: 'bookEquity', label: 'Book Equity', min: -50000, max: 500000, step: 1000, default: 40000 },
        { key: 'totalAssets', label: 'Total Assets', min: 1000, max: 500000, step: 1000, default: 100000 },
        { key: 'totalLiabilities', label: 'Total Liabilities', min: 0, max: 500000, step: 1000, default: 60000 }
    ],
    calculate: (inputs) => altmanZScoreDoublePrime(inputs.workingCapital, inputs.retainedEarnings, inputs.ebit, inputs.bookEquity, inputs.totalAssets, inputs.totalLiabilities),
    evaluateInsight: evaluate.altmanZScoreDoublePrime
  },
  'sharpe': {
    id: 'sharpe', name: 'Sharpe Ratio', category: 'Risk',
    description: 'Helps investors understand the return of an investment compared to its risk.',
    history: 'Created by Nobel laureate William F. Sharpe in 1966. It adjusts a portfolio\'s performance for the excess risk that was taken by the investor.',
    formula: 'Sharpe = (Rx - Rf) / StdDev(Rx)',
    benchmark: '≥ 2.0 = excellent · 1.0–2.0 = good · 0.5–1.0 = acceptable · < 0.5 = poor. Thresholds assume annualised return, risk-free rate and volatility. To compute from a series of periodic returns, use sharpeFromReturns().',
    inputs: [
        { key: 'returnVal', label: 'Portfolio Return', min: -0.5, max: 1.0, step: 0.01, default: 0.12 },
        { key: 'riskFree', label: 'Risk-Free Rate', min: 0, max: 0.2, step: 0.01, default: 0.04 },
        { key: 'stdDev', label: 'Std Deviation (Risk)', min: 0.01, max: 1.0, step: 0.01, default: 0.15 },
    ],
    calculate: (inputs) => sharpe(inputs.returnVal, inputs.riskFree, inputs.stdDev),
    evaluateInsight: evaluate.sharpe,
  },
  'piotroski': {
    id: 'piotroski', name: 'Piotroski F-Score', category: 'Risk',
    description: 'A 9-point scorecard separating fundamentally strong companies from deteriorating ones across profitability, leverage, and efficiency signals.',
    history: 'Developed by accounting professor Joseph Piotroski in 2000. His original paper showed that buying high-score stocks and shorting low-score stocks generated 23% annual returns over 20 years.',
    formula: 'F1 ROA>0 | F2 CFO>0 | F3 ROA↑ | F4 CFO>ROA | F5 Leverage↓ | F6 Liquidity↑ | F7 No Dilution | F8 Gross Margin↑ | F9 Asset Turnover↑',
    benchmark: 'With all 9 signals: 7–9 = strong · 3–6 = mixed · 0–2 = weak. Piotroski\'s paper bought 8–9 and shorted 0–1. Six signals need prior-year data; with fewer signals the library rates the share of available signals met and says the score is partial. This playground uses 4 signals (F1–F4).',
    inputs: [
      { key: 'netIncome', label: 'Net Income', min: -50000, max: 100000, step: 1000, default: 5000, prefix: '$' },
      { key: 'totalAssets', label: 'Total Assets', min: 1000, max: 500000, step: 1000, default: 100000, prefix: '$' },
      { key: 'operatingCashFlow', label: 'Operating Cash Flow', min: -50000, max: 100000, step: 1000, default: 7000, prefix: '$' },
      { key: 'priorNetIncome', label: 'Prior-Year Net Income', min: -50000, max: 100000, step: 1000, default: 4000, prefix: '$' },
      { key: 'priorTotalAssets', label: 'Prior-Year Total Assets', min: 1000, max: 500000, step: 1000, default: 100000, prefix: '$' },
    ],
    calculate: (inputs) => piotroski({
      netIncome: inputs.netIncome, totalAssets: inputs.totalAssets, operatingCashFlow: inputs.operatingCashFlow,
      priorNetIncome: inputs.priorNetIncome, priorTotalAssets: inputs.priorTotalAssets,
    }).score,
    evaluateInsight: (val, inputs) => evaluate.piotroski(val, piotroski({
      netIncome: inputs.netIncome, totalAssets: inputs.totalAssets, operatingCashFlow: inputs.operatingCashFlow,
      priorNetIncome: inputs.priorNetIncome, priorTotalAssets: inputs.priorTotalAssets,
    }).maxScore),
  },
  'target-upside': {
    id: 'target-upside', name: 'Target Upside', category: 'Risk',
    description: 'Calculates the potential upside (or downside) percentage to reach an analyst target price.',
    history: 'A foundational calculation used constantly in equity research reports to instantly summarize a stock\'s opportunity.',
    formula: '(Target Price - Current Price) / Current Price',
    inputs: [
        { key: 'currentPrice', label: 'Current Price', min: 1, max: 10000, step: 1, default: 150, prefix: '$' },
        { key: 'targetPrice', label: 'Analyst Target Price', min: 1, max: 10000, step: 1, default: 180, prefix: '$' },
    ],
    calculate: (inputs) => targetUpside(inputs.currentPrice, inputs.targetPrice),
    evaluateInsight: evaluate.targetUpside
  },

  // --- EFFICIENCY (new) ---
  'payable-days': {
    id: 'payable-days', name: 'Payable Days (DPO)', category: 'Efficiency',
    description: 'Average number of days a company takes to pay its suppliers. High DPO can indicate strong bargaining power; excessively high values may signal strained supplier relationships.',
    history: 'Days Payable Outstanding is a key component of the Cash Conversion Cycle. Together with DSO and DIO, it reveals the full cash flow timing of a business.',
    formula: 'DPO = (Trade Payables / COGS) × 365',
    benchmark: '30–60 days is typical for most industries. Retail giants (Walmart, Amazon) often exceed 90 days, using supplier credit as an interest-free source of funding.',
    inputs: [
      { key: 'tradePayables', label: 'Trade Payables', min: 0, max: 500000, step: 1000, default: 15000, prefix: '$' },
      { key: 'cogs', label: 'Cost of Goods Sold (COGS)', min: 1000, max: 1000000, step: 1000, default: 120000, prefix: '$' },
    ],
    calculate: (inputs) => payableDays(inputs.tradePayables, inputs.cogs),
    evaluateInsight: (val) => ({ value: val, status: 'Neutral', insight: 'Higher DPO means the company retains cash longer before paying suppliers. Compare within the same industry.' }),
  },
  'working-capital-days': {
    id: 'working-capital-days', name: 'Working Capital Days', category: 'Efficiency',
    description: 'Measures how many days of revenue are tied up in net working capital. Lower is better — capital locked in operations generates no returns.',
    history: 'A composite measure of operating cycle efficiency used by CFOs and working capital analysts to benchmark against peers and track improvement over quarters.',
    formula: 'WC Days = (Working Capital / Revenue) × 365',
    inputs: [
      { key: 'workingCapital', label: 'Working Capital (CA − CL)', min: -50000, max: 200000, step: 1000, default: 20000, prefix: '$' },
      { key: 'revenue', label: 'Total Revenue', min: 1000, max: 1000000, step: 1000, default: 200000, prefix: '$' },
    ],
    calculate: (inputs) => workingCapitalDays(inputs.workingCapital, inputs.revenue),
    evaluateInsight: (val) => ({ value: val, status: val !== null && val < 30 ? 'Good' : 'Neutral', insight: 'Lower working capital days = faster conversion of operations into cash. Negative values mean suppliers effectively finance operations.' }),
  },
  'cash-conversion-cycle': {
    id: 'cash-conversion-cycle', name: 'Cash Conversion Cycle (CCC)', category: 'Efficiency',
    description: 'The number of days it takes to convert investments in inventory and other resources into cash flows from sales.',
    history: 'The CCC is the definitive integrated efficiency metric, combining receivables, inventory, and payables management into a single cash timing view. Negative CCC (like Amazon and Zara) means the business collects cash before paying suppliers — a massive competitive advantage.',
    formula: 'CCC = Debtor Days + Inventory Days − Payable Days',
    benchmark: 'Negative CCC = exceptional (collect before you pay). 0–30 days = very efficient. 30–60 days = average. > 60 days = capital-intensive or inefficient. Most retailers and e-commerce businesses aim for negative CCC.',
    inputs: [
      { key: 'debtorDays', label: 'Debtor Days (DSO)', min: 0, max: 180, step: 1, default: 45 },
      { key: 'inventoryDays', label: 'Inventory Days (DIO)', min: 0, max: 365, step: 1, default: 60 },
      { key: 'payableDays', label: 'Payable Days (DPO)', min: 0, max: 180, step: 1, default: 30 },
    ],
    calculate: (inputs) => cashConversionCycle(inputs.debtorDays, inputs.inventoryDays, inputs.payableDays),
    evaluateInsight: (val) => ({
      value: val,
      status: val < 0 ? 'Good' : val <= 45 ? 'Neutral' : 'Bad',
      insight: val < 0
        ? 'Negative CCC — suppliers are funding operations. A strong structural advantage.'
        : `${val} days of working capital tied up in operations. Lower is better.`,
    }),
  },

  // --- VALUATION (new) ---
  'market-cap-to-debt-cap': {
    id: 'market-cap-to-debt-cap', name: 'Market Cap to Total Capital', category: 'Valuation',
    description: 'The proportion of total capital (equity + debt) represented by market cap. A higher ratio means the company is predominantly equity-financed — lower financial risk.',
    history: 'Also known as the equity-to-total-capital ratio, this metric appears in Modigliani-Miller capital structure theory and is widely used in credit analysis to assess leverage.',
    formula: 'MC / (MC + Total Debt)',
    benchmark: '> 0.7 = predominantly equity-financed (low leverage) · 0.4–0.7 = balanced capital structure · < 0.4 = heavily debt-financed (higher financial risk).',
    inputs: [
      { key: 'marketCap', label: 'Market Cap', min: 1000, max: 5000000, step: 1000, default: 150000, prefix: '$' },
      { key: 'totalDebt', label: 'Total Debt', min: 0, max: 1000000, step: 1000, default: 30000, prefix: '$' },
    ],
    calculate: (inputs) => marketCapToDebtCap(inputs.marketCap, inputs.totalDebt),
    evaluateInsight: (val) => ({
      value: val,
      status: val !== null && val > 0.7 ? 'Good' : val !== null && val >= 0.4 ? 'Neutral' : 'Bad',
      insight: val !== null
        ? `${(val * 100).toFixed(1)}% equity-financed. ${val > 0.7 ? 'Low leverage.' : val >= 0.4 ? 'Balanced capital structure.' : 'High debt in capital structure.'}`
        : 'N/A',
    }),
  },

  // --- INTRINSIC ---
  'ncvps': {
    id: 'ncvps', name: 'Net Current Value Per Share (NCVPS)', category: 'Valuation',
    description: 'A conservative liquidation-based valuation — net of all liabilities from current assets, divided by shares. If NCVPS > market price, the stock trades below liquidation value.',
    history: 'Inspired by Benjamin Graham\'s "net-net" criterion: buy stocks trading below net current asset value (NCAV). Graham considered this the most reliable margin of safety. Warren Buffett used this extensively in the 1950s.',
    formula: '(Current Assets − Total Liabilities) / Shares Outstanding',
    benchmark: 'If NCVPS > Market Price, the stock trades below Ben Graham\'s net-net threshold — historically a deep value signal. These opportunities are rare in large caps but occasionally appear in small/micro caps.',
    inputs: [
      { key: 'currentAssets', label: 'Current Assets', min: 0, max: 500000, step: 1000, default: 80000, prefix: '$' },
      { key: 'totalLiabilities', label: 'Total Liabilities', min: 0, max: 500000, step: 1000, default: 50000, prefix: '$' },
      { key: 'sharesOutstanding', label: 'Shares Outstanding (same unit as the amounts)', min: 1, max: 10000, step: 10, default: 1000 },
      { key: 'price', label: 'Share Price', min: 1, max: 200, step: 1, default: 25, prefix: '$' },
    ],
    calculate: (inputs) => computeNCVPS(inputs.currentAssets, inputs.totalLiabilities, inputs.sharesOutstanding),
    evaluateInsight: (val, inputs) => ({
      value: val,
      status: val === null || val <= 0 ? 'Bad' : val > inputs.price ? 'Good' : 'Neutral',
      insight: val === null || val <= 0
        ? 'Liabilities exceed current assets — no net current value.'
        : val > inputs.price
          ? 'Trades below net current value — Graham\'s "net-net" condition. Often seen in distressed or declining businesses; check why.'
          : 'Positive net current value, but the price is above it — not a net-net.',
    }),
  },
  'intrinsic-value': {
    id: 'intrinsic-value', name: 'Intrinsic Value Estimate', category: 'Valuation',
    description: 'A per-share value from projected earnings: grow EPS for a number of years, apply an exit P/E, discount back to today and subtract a margin of safety. A quick screen, not a full DCF.',
    history: 'Based on discounting future earnings, the approach popularised by Benjamin Graham and Warren Buffett. The margin of safety — Graham\'s key idea — lowers the value to protect against forecasting error.',
    formula: 'IV = EPS × (1+g)ⁿ × terminal P/E ÷ (1+r)ⁿ × (1 − margin)   defaults: n = 5, P/E 15, r = 10 %',
    benchmark: 'The result already includes the margin of safety, so a market price below it suggests undervaluation even after that cushion. Very sensitive to growth and exit P/E — stress-test with pessimistic inputs. Example: EPS 10, g 15 %, margin 25 % → 140.50.',
    inputs: [
      { key: 'eps', label: 'EPS (TTM)', min: 0.01, max: 100, step: 0.1, default: 10, prefix: '$' },
      { key: 'growthRate', label: 'Expected EPS Growth (decimal, 5 yrs)', min: -0.2, max: 0.4, step: 0.01, default: 0.15 },
      { key: 'terminalPE', label: 'Exit (Terminal) P/E', min: 5, max: 40, step: 1, default: 15 },
      { key: 'discountRate', label: 'Discount Rate (required return)', min: 0.04, max: 0.2, step: 0.005, default: 0.10 },
      { key: 'safetyMargin', label: 'Margin of Safety', min: 0, max: 0.5, step: 0.05, default: 0.25 },
      { key: 'price', label: 'Current Share Price', min: 1, max: 500, step: 1, default: 120, prefix: '$' },
    ],
    calculate: (inputs) => computeIntrinsicValue(inputs.eps, inputs.growthRate, inputs.safetyMargin, { terminalPE: inputs.terminalPE, discountRate: inputs.discountRate }),
    evaluateInsight: (val, inputs) => ({
      value: val,
      status: val === null ? 'N/A' : inputs.price <= val ? 'Good' : 'Bad',
      insight: val === null
        ? 'Not computable (EPS must be positive).'
        : inputs.price <= val
          ? `Price ${inputs.price} is below the intrinsic value of ${val.toFixed(2)} (after the margin of safety).`
          : `Price ${inputs.price} is above the intrinsic value of ${val.toFixed(2)}.`,
    }),
  },
  'g-factor': {
    id: 'g-factor', name: 'G-Factor (Composite Score)', category: 'Risk',
    description: 'Weighted composite of Quality (40%), Growth (35%), and Momentum (25%) scores — each 0–100. The G-Factor summarises a stock\'s overall quantitative attractiveness.',
    history: 'Based on multi-factor quantitative equity models. Quality, growth, and momentum factors have independently been shown to deliver excess risk-adjusted returns in academic literature (Fama-French, Asness et al.).',
    formula: 'G = Quality×0.40 + Growth×0.35 + Momentum×0.25',
    benchmark: '> 70 = strong composite fundamentals · 40–70 = average · < 40 = weak. Use with computeQualityScore, computeGrowthScore, and computeMomentumScore from this library.',
    inputs: [
      { key: 'qualityScore', label: 'Quality Score (0–100)', min: 0, max: 100, step: 1, default: 70 },
      { key: 'growthScore', label: 'Growth Score (0–100)', min: 0, max: 100, step: 1, default: 65 },
      { key: 'momentumScore', label: 'Momentum Score (0–100)', min: 0, max: 100, step: 1, default: 55 },
    ],
    calculate: (inputs) => computeGFactor(inputs.qualityScore, inputs.growthScore, inputs.momentumScore),
    evaluateInsight: (val) => ({
      value: val,
      status: val > 70 ? 'Good' : val > 40 ? 'Neutral' : 'Bad',
      insight: val > 70 ? 'Strong composite fundamentals across quality, growth, and momentum.' : val > 40 ? 'Average composite score — mixed signals.' : 'Weak across quality, growth, and/or momentum factors.',
    }),
  },
  'cagr': {
    id: 'cagr', name: 'CAGR', category: 'Growth',
    description: 'Compound Annual Growth Rate — the geometric mean annual growth rate of an investment over a multi-year period.',
    history: 'CAGR is the standard for comparing investment or business performance across different time horizons. It eliminates the distortion of volatility in year-by-year returns and expresses performance as a single smooth annual rate.',
    formula: '(Ending Value / Beginning Value)^(1/n) − 1',
    benchmark: 'For revenue/earnings: > 20% is exceptional · 10–20% is strong · < 10% is modest. Compare against sector growth rates and index returns for context.',
    inputs: [
      { key: 'beginningValue', label: 'Beginning Value', min: 1, max: 1000000, step: 100, default: 1000, prefix: '$' },
      { key: 'endingValue', label: 'Ending Value', min: 1, max: 1000000, step: 100, default: 2000, prefix: '$' },
      { key: 'periods', label: 'Number of Years', min: 1, max: 30, step: 1, default: 5 },
    ],
    calculate: (inputs) => cagr(inputs.beginningValue, inputs.endingValue, inputs.periods),
    evaluateInsight: (val) => ({
      value: val,
      status: val !== null && val > 0.2 ? 'Good' : val !== null && val > 0.08 ? 'Neutral' : 'Bad',
      insight: val !== null ? `${(val * 100).toFixed(1)}% annual growth rate compounded over the period.` : 'N/A',
    }),
  },

  // --- GROWTH (new) ---
  'median-growth': {
    id: 'median-growth', name: 'Median Growth Rate', category: 'Growth',
    description: 'The median of all year-over-year growth rates in a series. Less distorted than an average by unusually high or low years; years whose previous value is 0 are skipped.',
    history: 'Preferred by sell-side analysts as a sanity-check alongside CAGR. A company with lumpy, one-off revenue spikes will show a high CAGR but a modest median growth — the median reveals the typical annual pace more honestly.',
    formula: 'Median of [YoY growth rates] — sorts all (v[i] − v[i-1]) / |v[i-1]| values and returns the middle value',
    benchmark: '> 15% = strong typical growth · 5–15% = steady compounder · < 5% = slow growth. Compare against CAGR: if median << CAGR, growth is driven by outlier years.',
    inputs: [
      { key: 'v1', label: 'Year 1 Value', min: 1, max: 1000000, step: 100, default: 800, prefix: '$' },
      { key: 'v2', label: 'Year 2 Value', min: 1, max: 1000000, step: 100, default: 900, prefix: '$' },
      { key: 'v3', label: 'Year 3 Value', min: 1, max: 1000000, step: 100, default: 1100, prefix: '$' },
      { key: 'v4', label: 'Year 4 Value', min: 1, max: 1000000, step: 100, default: 1050, prefix: '$' },
      { key: 'v5', label: 'Year 5 Value', min: 1, max: 1000000, step: 100, default: 1300, prefix: '$' },
    ],
    calculate: (inputs) => medianGrowth([inputs.v1, inputs.v2, inputs.v3, inputs.v4, inputs.v5]),
    evaluateInsight: (val) => ({
      value: val,
      status: val !== null && val > 0.15 ? 'Good' : val !== null && val > 0.05 ? 'Neutral' : 'Bad',
      insight: val !== null ? `Typical annual growth: ${(val * 100).toFixed(1)}%. The median is less affected by outlier years than the mean.` : 'N/A',
    }),
  },

  // --- TTM (new module) ---
  'ttm-sum': {
    id: 'ttm-sum', name: 'TTM Sum (computeTTM)', category: 'TTM',
    description: 'Trailing Twelve Months sum — adds the last 4 quarterly values to produce an annualised figure without waiting for a full fiscal year end.',
    history: 'TTM became standard in equity research to allow apples-to-apples comparisons between companies with different fiscal year-ends. Banks, analysts, and screeners universally use TTM revenue and earnings multiples.',
    formula: 'TTM = Q(n) + Q(n-1) + Q(n-2) + Q(n-3)',
    benchmark: 'No single benchmark — context-dependent. Use TTM EPS with P/E, TTM Revenue with P/S, etc. The value replaces annual figures in any valuation metric for more timely analysis.',
    inputs: [
      { key: 'q1', label: 'Q1 (oldest)', min: -100000, max: 1000000, step: 100, default: 2200 },
      { key: 'q2', label: 'Q2', min: -100000, max: 1000000, step: 100, default: 2400 },
      { key: 'q3', label: 'Q3', min: -100000, max: 1000000, step: 100, default: 2600 },
      { key: 'q4', label: 'Q4 (most recent)', min: -100000, max: 1000000, step: 100, default: 2800 },
    ],
    calculate: (inputs) => computeTTM([inputs.q1, inputs.q2, inputs.q3, inputs.q4]),
    evaluateInsight: (val) => ({ value: val, status: 'Neutral', insight: 'TTM total across 4 quarters. Plug into valuation ratios for real-time fundamental analysis.' }),
  },
  'ttm-avg': {
    id: 'ttm-avg', name: 'TTM Average (computeTTMAvg)', category: 'TTM',
    description: 'Trailing Twelve Months average — returns the mean of the last 4 quarterly values. Useful for metrics like average quarterly margin or average inventory.',
    history: 'Used by financial modellers to smooth seasonal volatility. Rather than looking at a single quarter in isolation, the TTM average gives the normalised quarterly run-rate for the past year.',
    formula: 'TTM Avg = (Q(n) + Q(n-1) + Q(n-2) + Q(n-3)) / 4',
    inputs: [
      { key: 'q1', label: 'Q1 (oldest)', min: -100000, max: 1000000, step: 100, default: 2200 },
      { key: 'q2', label: 'Q2', min: -100000, max: 1000000, step: 100, default: 2400 },
      { key: 'q3', label: 'Q3', min: -100000, max: 1000000, step: 100, default: 2600 },
      { key: 'q4', label: 'Q4 (most recent)', min: -100000, max: 1000000, step: 100, default: 2800 },
    ],
    calculate: (inputs) => computeTTMAvg([inputs.q1, inputs.q2, inputs.q3, inputs.q4]),
    evaluateInsight: (val) => ({ value: val, status: 'Neutral', insight: 'Average quarterly run-rate over trailing twelve months.' }),
  },

  // --- HISTORICAL (new module) ---
  'n-year-avg': {
    id: 'n-year-avg', name: 'N-Year Average (computeNYearAverage)', category: 'Historical',
    description: 'Rolling N-year average of quarterly data. Returns the mean of the last (N × 4) quarters — useful for 3-year or 5-year average ROE, margins, or growth rates.',
    history: 'Long-window averaging is standard in quality-factor models. Warren Buffett famously looks at 10-year average ROE rather than a single year to separate structural profitability from cyclical spikes.',
    formula: 'avg(last N×4 quarterly values)',
    inputs: [
      { key: 'q1', label: 'Q1', min: -100000, max: 1000000, step: 100, default: 2000 },
      { key: 'q2', label: 'Q2', min: -100000, max: 1000000, step: 100, default: 2200 },
      { key: 'q3', label: 'Q3', min: -100000, max: 1000000, step: 100, default: 2400 },
      { key: 'q4', label: 'Q4', min: -100000, max: 1000000, step: 100, default: 2600 },
      { key: 'q5', label: 'Q5', min: -100000, max: 1000000, step: 100, default: 2800 },
      { key: 'q6', label: 'Q6', min: -100000, max: 1000000, step: 100, default: 3000 },
      { key: 'q7', label: 'Q7', min: -100000, max: 1000000, step: 100, default: 3200 },
      { key: 'q8', label: 'Q8 (most recent)', min: -100000, max: 1000000, step: 100, default: 3400 },
      { key: 'years', label: 'Years to average', min: 1, max: 5, step: 1, default: 2 },
    ],
    calculate: (inputs) => computeNYearAverage([inputs.q1, inputs.q2, inputs.q3, inputs.q4, inputs.q5, inputs.q6, inputs.q7, inputs.q8], inputs.years),
    evaluateInsight: (val) => ({ value: val, status: 'Neutral', insight: 'Rolling N-year average — smooths seasonality and one-off events.' }),
  },
  'n-year-sum': {
    id: 'n-year-sum', name: 'N-Year Sum (computeNYearSum)', category: 'Historical',
    description: 'Sum of the last N×4 quarterly values. Use to compute total FCF, total capex, or total dividends paid over a rolling multi-year window.',
    history: 'N-year cumulative FCF is used by value investors to check if a business has actually generated real cash across a whole business cycle, not just in a single favourable year.',
    formula: 'sum(last N×4 quarterly values)',
    inputs: [
      { key: 'q1', label: 'Q1', min: -100000, max: 1000000, step: 100, default: 2000 },
      { key: 'q2', label: 'Q2', min: -100000, max: 1000000, step: 100, default: 2200 },
      { key: 'q3', label: 'Q3', min: -100000, max: 1000000, step: 100, default: 2400 },
      { key: 'q4', label: 'Q4', min: -100000, max: 1000000, step: 100, default: 2600 },
      { key: 'q5', label: 'Q5', min: -100000, max: 1000000, step: 100, default: 2800 },
      { key: 'q6', label: 'Q6', min: -100000, max: 1000000, step: 100, default: 3000 },
      { key: 'q7', label: 'Q7', min: -100000, max: 1000000, step: 100, default: 3200 },
      { key: 'q8', label: 'Q8 (most recent)', min: -100000, max: 1000000, step: 100, default: 3400 },
      { key: 'years', label: 'Years to sum', min: 1, max: 5, step: 1, default: 2 },
    ],
    calculate: (inputs) => computeNYearSum([inputs.q1, inputs.q2, inputs.q3, inputs.q4, inputs.q5, inputs.q6, inputs.q7, inputs.q8], inputs.years),
    evaluateInsight: (val) => ({ value: val, status: 'Neutral', insight: 'Rolling N-year total. Compare against capex or dividends paid for FCF yield analysis.' }),
  },
  'historical-point': {
    id: 'historical-point', name: 'Historical Point Lookup (computeHistoricalPoint)', category: 'Historical',
    description: 'Returns the value at exactly N quarters back from the most recent quarter. Used to fetch same-quarter-prior-year data for YoY comparisons.',
    history: 'Useful for year-over-year comparisons with proper quarterly alignment (Q3 this year vs Q3 last year), which removes seasonality that a quarter-over-quarter comparison would show.',
    formula: 'values[length - 1 - quartersBack]',
    inputs: [
      { key: 'q1', label: 'Q1 (oldest)', min: -100000, max: 1000000, step: 100, default: 2000 },
      { key: 'q2', label: 'Q2', min: -100000, max: 1000000, step: 100, default: 2200 },
      { key: 'q3', label: 'Q3', min: -100000, max: 1000000, step: 100, default: 2400 },
      { key: 'q4', label: 'Q4', min: -100000, max: 1000000, step: 100, default: 2600 },
      { key: 'q5', label: 'Q5 (most recent)', min: -100000, max: 1000000, step: 100, default: 2800 },
      { key: 'quartersBack', label: 'Quarters back (0 = most recent)', min: 0, max: 4, step: 1, default: 4 },
    ],
    calculate: (inputs) => computeHistoricalPoint([inputs.q1, inputs.q2, inputs.q3, inputs.q4, inputs.q5], inputs.quartersBack),
    evaluateInsight: (val) => ({ value: val, status: 'Neutral', insight: 'Value at the specified quarter in the past. Use quartersBack=4 for same quarter last year.' }),
  },

  // --- SCORING (new module) ---
  'quality-score': {
    id: 'quality-score', name: 'Quality Score (computeQualityScore)', category: 'Scoring',
    description: 'Composite quality score (0–100) from the Piotroski F-Score, ROE versus the sector, margin trend and two optional ownership signals: insider/promoter shares pledged and insider/promoter holding stability.',
    history: 'Quality factors have historically earned excess returns independent of value or momentum (Asness, Frazzini & Pedersen, "Quality Minus Junk", 2019). The weights here are this library\'s heuristics. The ownership signals matter most in markets such as India, where promoter pledging is disclosed; elsewhere you can leave them out and the other weights are rescaled.',
    formula: 'Piotroski (score/max)×30% + ROE vs Sector×20% + Margins Improving×20% + Insider Pledge-Free×15% + Insider Holding Stable×15%  (omitted signals are dropped and weights rescaled)',
    benchmark: '> 70 = high quality · 40–70 = average · < 40 = weak fundamentals. Use above 60 as a long-side quality filter in a multi-factor strategy.',
    inputs: [
      { key: 'piotroskiScore', label: 'Piotroski F-Score points', min: 0, max: 9, step: 1, default: 7 },
      { key: 'piotroskiMaxScore', label: 'Piotroski max possible (9 with full data)', min: 1, max: 9, step: 1, default: 9 },
      { key: 'roeVsSector', label: 'ROE ÷ Sector Median ROE', min: 0, max: 2, step: 0.05, default: 1.1 },
      { key: 'marginsImproving', label: 'Margins Improving (1=yes, 0=no)', min: 0, max: 1, step: 1, default: 1 },
      { key: 'insiderPledgeFree', label: 'Insider/Promoter Pledge-Free (1=yes, 0=no, −1=not tracked)', min: -1, max: 1, step: 1, default: -1 },
      { key: 'insiderHoldingStable', label: 'Insider/Promoter Holding Stable (1=yes, 0=no, −1=not tracked)', min: -1, max: 1, step: 1, default: -1 },
    ],
    calculate: (inputs) => computeQualityScore({
      piotroskiScore: inputs.piotroskiScore,
      piotroskiMaxScore: inputs.piotroskiMaxScore,
      roeVsSector: inputs.roeVsSector,
      marginsImproving: inputs.marginsImproving === 1,
      insiderPledgeFree: inputs.insiderPledgeFree === -1 ? undefined : inputs.insiderPledgeFree === 1,
      insiderHoldingStable: inputs.insiderHoldingStable === -1 ? undefined : inputs.insiderHoldingStable === 1,
    }),
    evaluateInsight: (val) => ({
      value: val,
      status: val > 70 ? 'Good' : val > 40 ? 'Neutral' : 'Bad',
      insight: val > 70 ? 'High quality across the supplied profitability, efficiency and ownership signals.' : val > 40 ? 'Average quality — mixed signals across quality dimensions.' : 'Weak quality fundamentals. Consider deeper due diligence.',
    }),
  },
  'growth-score': {
    id: 'growth-score', name: 'Growth Score (computeGrowthScore)', category: 'Scoring',
    description: 'Composite growth score (0–100) built from revenue growth vs sector, profit growth rate, EPS growth, CFO positivity, and revenue acceleration signals.',
    history: 'Academic evidence on growth is mixed: classic studies (Fama & French 1992; Lakonishok, Shleifer & Vishny 1994) found that expensive "glamour" stocks underperformed, while profitable, growing companies tend to do well. Use this score to describe a company\'s growth profile, ideally alongside the Value and Quality scores. Weights are this library\'s heuristics.',
    formula: 'RevGrowthVsSector×25% + ProfitGrowth×25% + EPSGrowth×20% + CFO+×15% + RevAccel×15%',
    benchmark: '> 70 = high-growth company · 40–70 = moderate growth · < 40 = stagnating or declining.',
    inputs: [
      { key: 'revenueGrowthVsSector', label: 'Rev Growth vs Sector (ratio)', min: 0, max: 3, step: 0.05, default: 1.3 },
      { key: 'profitGrowthRate', label: 'Profit Growth Rate (decimal)', min: -0.5, max: 1, step: 0.01, default: 0.20 },
      { key: 'epsGrowthRate', label: 'EPS Growth Rate (decimal)', min: -0.5, max: 1, step: 0.01, default: 0.18 },
      { key: 'cfoPositive', label: 'CFO Positive (1=yes, 0=no)', min: 0, max: 1, step: 1, default: 1 },
      { key: 'revenueAccelerating', label: 'Revenue Accelerating (1=yes, 0=no)', min: 0, max: 1, step: 1, default: 1 },
    ],
    calculate: (inputs) => computeGrowthScore({
      revenueGrowthVsSector: inputs.revenueGrowthVsSector,
      profitGrowthRate: inputs.profitGrowthRate,
      epsGrowthRate: inputs.epsGrowthRate,
      cfoPositive: inputs.cfoPositive === 1,
      revenueAccelerating: inputs.revenueAccelerating === 1,
    }),
    evaluateInsight: (val) => ({
      value: val,
      status: val > 70 ? 'Good' : val > 40 ? 'Neutral' : 'Bad',
      insight: val > 70 ? 'Strong growth signals across revenue, earnings, and momentum indicators.' : val > 40 ? 'Moderate growth — some positive signals but not consistently strong.' : 'Weak growth signals. Revenue or earnings may be stagnating.',
    }),
  },
  'value-score': {
    id: 'value-score', name: 'Value Score (computeValueScore)', category: 'Scoring',
    description: 'Composite value score (0–100) using P/E vs 3-year average, P/B vs sector, PEG ratio, and historical P/E percentile — higher scores indicate cheaper valuation.',
    history: 'The value premium (Fama-French 1992) is one of the most replicated findings in finance. This composite avoids single-metric traps (e.g., a low P/E in a structurally declining business) by cross-checking four independent valuation angles.',
    formula: 'PEvs3yrAvg×30% + PBvsSector×25% + PEG×25% + HistoricalPEPct×20%',
    benchmark: '> 65 = attractively valued · 35–65 = fairly valued · < 35 = expensive relative to history and peers.',
    inputs: [
      { key: 'peVs3yrAvg', label: 'Current P/E ÷ 3yr Avg P/E', min: 0, max: 3, step: 0.05, default: 0.8 },
      { key: 'pbVsSector', label: 'Current P/B ÷ Sector Median P/B', min: 0, max: 3, step: 0.05, default: 0.75 },
      { key: 'peg', label: 'PEG Ratio (P/E ÷ growth %)', min: 0, max: 3, step: 0.1, default: 0.9 },
      { key: 'historicalPePercentile', label: 'Historical P/E Percentile (0–100)', min: 0, max: 100, step: 1, default: 30 },
    ],
    calculate: (inputs) => computeValueScore({
      peVs3yrAvg: inputs.peVs3yrAvg,
      pbVsSector: inputs.pbVsSector,
      peg: inputs.peg,
      historicalPePercentile: inputs.historicalPePercentile,
    }),
    evaluateInsight: (val) => ({
      value: val,
      status: val > 65 ? 'Good' : val > 35 ? 'Neutral' : 'Bad',
      insight: val > 65 ? 'Attractively valued vs history and sector peers.' : val > 35 ? 'Fair valuation — neither deeply cheap nor expensive.' : 'Expensive relative to history, sector, and growth rate.',
    }),
  },
  'momentum-score': {
    id: 'momentum-score', name: 'Momentum Score (computeMomentumScore)', category: 'Scoring',
    description: 'Composite momentum score (0–100) combining price vs SMA-200, RSI, ADX trend strength, volume ratio, and 6-month Rate of Change (ROC-125).',
    history: 'Price momentum is one of the most robust factor premiums across markets (Jegadeesh & Titman 1993). This composite combines five signals. Note: the library does not calculate RSI, ADX, moving averages or volume ratios — supply them from your charting or data provider.',
    formula: 'PriceVsSMA200×25% + RSI×20% + ADX×20% + VolumeRatio×20% + ROC125×15%',
    benchmark: '> 70 = strong uptrend with volume confirmation · 40–70 = mixed momentum · < 40 = weak or negative momentum.',
    inputs: [
      { key: 'priceVsSma200', label: 'Price ÷ SMA-200 (e.g. 1.05)', min: 0.5, max: 2, step: 0.01, default: 1.08 },
      { key: 'rsi', label: 'RSI (14-period)', min: 0, max: 100, step: 1, default: 58 },
      { key: 'adx', label: 'ADX (14-period)', min: 0, max: 100, step: 1, default: 28 },
      { key: 'volumeRatio', label: 'Volume Ratio (20d avg / 90d avg)', min: 0, max: 3, step: 0.05, default: 1.2 },
      { key: 'roc125', label: 'ROC-125 (6m return, decimal)', min: -0.5, max: 1, step: 0.01, default: 0.18 },
    ],
    calculate: (inputs) => computeMomentumScore({
      priceVsSma200: inputs.priceVsSma200,
      rsi: inputs.rsi,
      adx: inputs.adx,
      volumeRatio: inputs.volumeRatio,
      roc125: inputs.roc125,
    }),
    evaluateInsight: (val) => ({
      value: val,
      status: val > 70 ? 'Good' : val > 40 ? 'Neutral' : 'Bad',
      insight: val > 70 ? 'Strong momentum confirmed across price, trend, and volume signals.' : val > 40 ? 'Mixed momentum — some signals positive but not uniformly bullish.' : 'Weak or negative momentum across most indicators.',
    }),
  },
};
