// Sidebar / site navigation: metric pages grouped by category.
// Ids must match keys in metrics.ts.
export const CATEGORIES: { label: string; items: { id: string; label: string }[] }[] = [
  {
    label: 'Valuation',
    items: [
      { id: 'pe', label: 'P/E Ratio' },
      { id: 'pb', label: 'P/B Ratio' },
      { id: 'ps', label: 'P/S Ratio' },
      { id: 'peg', label: 'PEG Ratio' },
      { id: 'ev-ebitda', label: 'EV/EBITDA' },
      { id: 'ev-revenue', label: 'EV / Revenue' },
      { id: 'ev-fcf', label: 'EV / Free Cash Flow' },
      { id: 'price-to-cash-flow', label: 'Price-to-Cash-Flow' },
      { id: 'earnings-yield', label: 'Earnings Yield' },
      { id: 'dcf', label: 'Discounted Cash Flow' },
      { id: 'graham', label: 'Graham Number' },
      { id: 'dividend', label: 'Dividend Yield' },
      { id: 'market-cap-to-debt-cap', label: 'Market Cap to Total Capital' },
      { id: 'ncvps', label: 'Net Current Value Per Share' },
      { id: 'intrinsic-value', label: 'Intrinsic Value Estimate' },
    ],
  },
  {
    label: 'Profitability',
    items: [
      { id: 'roa', label: 'ROA' },
      { id: 'roe', label: 'ROE' },
      { id: 'roic', label: 'ROIC' },
      { id: 'gross-margin', label: 'Gross Margin' },
      { id: 'operating-margin', label: 'Operating Margin' },
      { id: 'net-margin', label: 'Net Profit Margin' },
      { id: 'fcf-margin', label: 'FCF Margin' },
    ],
  },
  {
    label: 'Liquidity',
    items: [
      { id: 'current-ratio', label: 'Current Ratio' },
      { id: 'quick-ratio', label: 'Quick Ratio' },
      { id: 'debt-to-equity', label: 'Debt-to-Equity' },
      { id: 'interest-coverage', label: 'Interest Coverage' },
    ],
  },
  {
    label: 'Solvency',
    items: [
      { id: 'net-debt', label: 'Net Debt' },
      { id: 'net-cash', label: 'Net Cash' },
      { id: 'net-debt-to-ebitda', label: 'Net Debt / EBITDA' },
      { id: 'debt-to-assets', label: 'Debt-to-Assets' },
    ],
  },
  {
    label: 'Efficiency',
    items: [
      { id: 'asset-turnover', label: 'Asset Turnover' },
      { id: 'inventory-turnover', label: 'Inventory Turnover' },
      { id: 'receivables-turnover', label: 'Receivables Turnover' },
      { id: 'days-sales-outstanding', label: 'Days Sales Outstanding' },
      { id: 'payable-days', label: 'Payable Days (DPO)' },
      { id: 'working-capital-days', label: 'Working Capital Days' },
      { id: 'cash-conversion-cycle', label: 'Cash Conversion Cycle' },
    ],
  },
  {
    label: 'Quality',
    items: [
      { id: 'payout-ratio', label: 'Payout Ratio' },
      { id: 'cash-conversion-ratio', label: 'Cash Conversion Ratio' },
    ],
  },
  {
    label: 'Risk',
    items: [
      { id: 'z-score', label: 'Altman Z-Score' },
      { id: 'z-score-double-prime', label: "Altman Z''-Score" },
      { id: 'sharpe', label: 'Sharpe Ratio' },
      { id: 'piotroski', label: 'Piotroski F-Score' },
      { id: 'target-upside', label: 'Target Upside' },
      { id: 'g-factor', label: 'G-Factor (Composite)' },
    ],
  },
  {
    label: 'Growth',
    items: [
      { id: 'cagr', label: 'CAGR' },
      { id: 'median-growth', label: 'Median Growth Rate' },
    ],
  },
  {
    label: 'TTM',
    items: [
      { id: 'ttm-sum', label: 'TTM Sum' },
      { id: 'ttm-avg', label: 'TTM Average' },
    ],
  },
  {
    label: 'Historical',
    items: [
      { id: 'n-year-avg', label: 'N-Year Average' },
      { id: 'n-year-sum', label: 'N-Year Sum' },
      { id: 'historical-point', label: 'Historical Point Lookup' },
    ],
  },
  {
    label: 'Scoring',
    items: [
      { id: 'quality-score', label: 'Quality Score' },
      { id: 'growth-score', label: 'Growth Score' },
      { id: 'value-score', label: 'Value Score' },
      { id: 'momentum-score', label: 'Momentum Score' },
    ],
  },
];
