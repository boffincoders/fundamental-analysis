import { useState } from 'react';
import { Link } from 'react-router-dom';
import { analyzeCompany } from 'finance-calculator-pro';
import { CATEGORIES } from '../data/navigation';
import { usePageMeta } from '../seo';

const STATUS_COLORS: Record<string, string> = {
  Good:    'var(--green)',
  Bad:     'var(--red)',
  Neutral: 'var(--blue)',
};

const STATUS_BG: Record<string, string> = {
  Good:    '#f0fdf4',
  Bad:     '#fef2f2',
  Neutral: 'var(--blue-bg)',
};

function MetricCard({ title, data, metricId }: { title: string; data: any; metricId?: string }) {
  if (!data || data.value === null || data.value === undefined || (typeof data.value === 'number' && isNaN(data.value))) {
    return (
      <div className="rounded-xl p-5 flex flex-col" style={{ border: '1px dashed var(--border)', background: 'var(--bg-subtle)' }}>
        <div className="text-[12px] font-medium mb-3" style={{ color: 'var(--text-3)' }}>{title}</div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold" style={{ color: 'var(--text-4)' }}>—</span>
        </div>
        <p className="text-[11px] mt-2 m-0" style={{ color: 'var(--text-4)' }}>{data?.insight ?? 'Missing required input'}</p>
        {metricId && (
          <Link
            to={`/metrics/${metricId}`}
            className="mt-3 text-[11px] no-underline"
            style={{ color: 'var(--blue)' }}
          >
            See formula →
          </Link>
        )}
      </div>
    );
  }

  const color = STATUS_COLORS[data.status] ?? 'var(--text-3)';
  const bg    = STATUS_BG[data.status]    ?? 'var(--bg-muted)';

  return (
    <div
      className="rounded-xl p-5 flex flex-col"
      style={{ border: '1px solid var(--border)', borderTop: `3px solid ${color}`, background: 'var(--bg)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-[12px] font-medium" style={{ color: 'var(--text-3)' }}>{title}</div>
        {metricId && (
          <Link to={`/metrics/${metricId}`} className="text-[10px] no-underline shrink-0" style={{ color: 'var(--text-4)' }}>
            Explore →
          </Link>
        )}
      </div>
      <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>
        {typeof data.value === 'number' ? data.value.toFixed(2) : data.value}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: bg, color }}
        >
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: color }} />
          {data.status}
        </span>
      </div>
      {data.insight && (
        <p className="mt-2 text-[12px] leading-snug" style={{ color: 'var(--text-3)' }}>{data.insight}</p>
      )}
    </div>
  );
}

const SNAPSHOT_FIELDS: { key: string; label: string }[] = [
  { key: 'price',                      label: 'Share Price' },
  { key: 'eps',                        label: 'EPS' },
  { key: 'bookValuePerShare',          label: 'Book Value / Share' },
  { key: 'revenuePerShare',            label: 'Revenue / Share' },
  { key: 'expectedEarningsGrowthRate', label: 'Expected EPS Growth (0.15 = 15%)' },
  { key: 'marketCap',                  label: 'Market Cap' },
  { key: 'totalRevenue',               label: 'Total Revenue' },
  { key: 'ebitda',                     label: 'EBITDA' },
  { key: 'ebit',                       label: 'EBIT' },
  { key: 'interestExpense',            label: 'Interest Expense' },
  { key: 'netIncome',                  label: 'Net Income' },
  { key: 'operatingCashFlow',          label: 'Operating Cash Flow' },
  { key: 'totalAssets',                label: 'Total Assets' },
  { key: 'totalLiabilities',           label: 'Total Liabilities' },
  { key: 'totalEquity',                label: 'Total Equity' },
  { key: 'currentAssets',              label: 'Current Assets' },
  { key: 'currentLiabilities',         label: 'Current Liabilities' },
  { key: 'totalDebt',                  label: 'Total Debt' },
  { key: 'cashAndEquivalents',         label: 'Cash & Equivalents' },
  { key: 'retainedEarnings',           label: 'Retained Earnings' },
];

const DEFAULT_SNAPSHOT: Record<string, number> = {
  price: 150, eps: 5, bookValuePerShare: 20, revenuePerShare: 50, expectedEarningsGrowthRate: 0.15,
  marketCap: 150000, totalRevenue: 50000, ebitda: 10000, ebit: 7500, interestExpense: 500,
  netIncome: 5000, operatingCashFlow: 7500,
  totalAssets: 100000, totalLiabilities: 60000, totalEquity: 40000,
  currentAssets: 40000, currentLiabilities: 25000,
  totalDebt: 20000, cashAndEquivalents: 5000, retainedEarnings: 20000,
};

const SECTIONS = [
  {
    title: 'Valuation',
    metrics: [
      { key: 'pe',       label: 'P/E Ratio',  path: 'valuation.pe',       metricId: 'pe' },
      { key: 'peg',      label: 'PEG Ratio',  path: 'valuation.peg',      metricId: 'peg' },
      { key: 'pb',       label: 'P/B Ratio',  path: 'valuation.pb',       metricId: 'pb' },
      { key: 'evEbitda', label: 'EV/EBITDA',  path: 'valuation.evEbitda', metricId: 'ev-ebitda' },
      { key: 'earningsYield', label: 'Earnings Yield', path: 'valuation.earningsYield', metricId: 'earnings-yield' },
      { key: 'grahamNumber',  label: 'Graham Number',  path: 'valuation.grahamNumber',  metricId: 'graham' },
    ],
  },
  {
    title: 'Profitability',
    metrics: [
      { key: 'roa',             label: 'Return on Assets', path: 'profitability.roa',             metricId: 'roa' },
      { key: 'roe',             label: 'Return on Equity', path: 'profitability.roe',             metricId: 'roe' },
      { key: 'netProfitMargin', label: 'Net Margin',       path: 'profitability.netProfitMargin', metricId: 'net-margin' },
    ],
  },
  {
    title: 'Liquidity & leverage',
    metrics: [
      { key: 'currentRatio',     label: 'Current Ratio',     path: 'liquidity.currentRatio',     metricId: 'current-ratio' },
      { key: 'debtToEquity',     label: 'Debt / Equity',     path: 'liquidity.debtToEquity',     metricId: 'debt-to-equity' },
      { key: 'interestCoverage', label: 'Interest Coverage', path: 'liquidity.interestCoverage', metricId: 'interest-coverage' },
      { key: 'netDebtToEbitda',  label: 'Net Debt / EBITDA', path: 'solvency.netDebtToEbitda',   metricId: 'net-debt-to-ebitda' },
      { key: 'debtToAssets',     label: 'Debt / Assets',     path: 'solvency.debtToAssets',      metricId: 'debt-to-assets' },
      { key: 'netCash',          label: 'Net Cash',          path: 'solvency.netCash',           metricId: 'net-cash' },
    ],
  },
  {
    title: 'Distress risk & earnings quality',
    metrics: [
      { key: 'altmanZScore',            label: 'Altman Z (manufacturers)',      path: 'risk.altmanZScore',            metricId: 'z-score' },
      { key: 'altmanZScoreDoublePrime', label: "Altman Z'' (non-manufacturers)", path: 'risk.altmanZScoreDoublePrime', metricId: 'z-score-double-prime' },
      { key: 'piotroski',               label: 'Piotroski F-Score',             path: 'risk.piotroski',               metricId: 'piotroski' },
      { key: 'cashConversionRatio',     label: 'Cash Conversion',               path: 'quality.cashConversionRatio',  metricId: 'cash-conversion-ratio' },
    ],
  },
];

const USE_CASES = [
  { title: 'Stock screeners', text: 'Rank and filter a watchlist on P/E, PEG, ROE, leverage and margins with analyzeBatch().' },
  { title: 'Company snapshot cards', text: 'Show every ratio for one company with a plain-English rating, from a single analyzeCompany() call.' },
  { title: 'Valuation calculators', text: 'DCF, Graham number, intrinsic value with margin of safety, and net-net value per share.' },
  { title: 'Credit & leverage checks', text: 'Net debt / EBITDA, interest coverage and Altman Z / Z\'\' distress scores for non-financial companies.' },
  { title: 'FP&A ratio packs', text: 'DSO, DPO, cash conversion cycle, margins and returns from your own statements — no data vendor needed.' },
  { title: 'Finance education', text: 'Interactive calculators that show the formula, the result and how to read it.' },
];

const CONVENTIONS = [
  { title: 'Rates are decimals', text: '0.15 means 15 % — for growth, tax, discount rates and returns.' },
  { title: 'Any currency', text: 'USD, GBP, EUR, INR… in any unit, as long as one snapshot uses the same one throughout.' },
  { title: 'null means "not meaningful"', text: 'Missing input, zero denominator, or a ratio that makes no sense (ROE with negative equity, PEG with negative growth).' },
  { title: 'Ratings are rules of thumb', text: 'Good / Neutral / Bad use fixed generic thresholds. They ignore sector — compare with peers before concluding anything.' },
];

const FAQ = [
  { q: 'Is finance-calculator-pro free?', a: 'Yes. It is open source under the MIT licence and has no runtime dependencies.' },
  { q: 'Does it fetch stock prices or financial statements?', a: 'No. You pass in numbers from any source — your database, a CSV, or an API such as yahoo-finance2, Alpha Vantage or Financial Modeling Prep — and it computes the ratios.' },
  { q: 'Which markets does it work for?', a: 'Any market: US, UK, EU, Canada, Australia, India and others. Ratios are unit-free, so only consistency within one snapshot matters.' },
  { q: 'Can I use it for banks, insurers or REITs?', a: 'Only with care. Current ratio, EV/EBITDA, inventory turnover and Altman Z are not meaningful for financial companies, and REITs are usually valued on FFO rather than earnings.' },
  { q: 'Does it calculate RSI, MACD or other technical indicators?', a: 'No. It focuses on fundamental analysis. The momentum score accepts RSI, ADX and moving-average values that you compute elsewhere.' },
  { q: 'Are the Good / Bad ratings investment advice?', a: 'No. They are generic rules of thumb meant as a first-pass screen.' },
];

function getPath(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function SectionTitle({ id, children, sub }: { id?: string; children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-5" id={id}>
      <h2 className="text-[1.35rem] font-bold tracking-tight m-0" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>{children}</h2>
      {sub && <p className="text-[14px] mt-1.5 mb-0 max-w-2xl leading-relaxed" style={{ color: 'var(--text-3)' }}>{sub}</p>}
    </div>
  );
}

export default function Home() {
  const [snapshot, setSnapshot] = useState<Record<string, number>>(DEFAULT_SNAPSHOT);
  usePageMeta(
    'finance-calculator-pro — Financial ratio calculator & fundamental analysis library for JavaScript and TypeScript',
    'Free, zero-dependency TypeScript library and online calculator for financial ratios: P/E, PEG, EV/EBITDA, ROE, ROIC, current ratio, net debt/EBITDA, Altman Z-Score, Piotroski F-Score, DCF, Graham number and intrinsic value.',
  );

  const analysis = analyzeCompany(snapshot, true);

  return (
    <div className="space-y-14">
      {/* Hero */}
      <section>
        <h1 className="text-[2.1rem] font-bold tracking-tight mb-3 max-w-3xl" style={{ color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
          Financial ratios and fundamental analysis for JavaScript & TypeScript
        </h1>
        <p className="text-[15px] max-w-2xl leading-relaxed mb-5" style={{ color: 'var(--text-3)' }}>
          <code className="px-1.5 py-0.5 rounded text-[13px] font-mono" style={{ background: 'var(--bg-muted)', color: 'var(--blue)', border: '1px solid var(--border)' }}>finance-calculator-pro</code>{' '}
          turns income-statement, balance-sheet and cash-flow numbers into valuation, profitability, liquidity, leverage,
          efficiency and distress-risk metrics — each with an optional plain-English rating. Zero dependencies, runs in
          Node.js, browsers and edge runtimes, works with any data source.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <code className="px-3 py-2 rounded-lg text-[13px] font-mono" style={{ background: '#0d1117', color: '#4ade80' }}>npm install finance-calculator-pro</code>
          <a href="#playground" className="px-4 py-2 rounded-lg text-[13px] font-medium no-underline" style={{ background: 'var(--blue)', color: '#fff' }}>Try the playground</a>
          <Link to="/api-docs" className="px-4 py-2 rounded-lg text-[13px] font-medium no-underline" style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>API reference</Link>
        </div>
        <p className="text-[12px] mt-4 mb-0" style={{ color: 'var(--text-4)' }}>
          Open source (MIT), maintained by{' '}
          <a href="https://boffincoders.com/?utm_source=docs&utm_medium=hero&utm_campaign=finance-calculator-pro" target="_blank" rel="noopener" style={{ color: 'var(--blue)' }}>Boffin Coders</a>.
        </p>
      </section>

      {/* Use cases */}
      <section>
        <SectionTitle sub="Typical applications built on the library.">What you can build</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {USE_CASES.map(u => (
            <div key={u.title} className="rounded-xl p-4" style={{ border: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
              <h3 className="text-[14px] font-semibold m-0 mb-1" style={{ color: 'var(--text)' }}>{u.title}</h3>
              <p className="text-[13px] m-0 leading-relaxed" style={{ color: 'var(--text-3)' }}>{u.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Playground */}
      <section>
        <SectionTitle id="playground" sub="Edit any number and every metric recalculates in your browser with analyzeCompany(data, true). Clear a field to see how missing inputs return null.">
          Live playground
        </SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Input Panel */}
          <div className="lg:col-span-1 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-[13px] font-semibold uppercase tracking-wider m-0" style={{ color: 'var(--text-4)' }}>
                Company snapshot
              </h3>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              {SNAPSHOT_FIELDS.map(field => (
                <div key={field.key} className="flex items-center justify-between gap-3">
                  <label htmlFor={`f-${field.key}`} className="text-[12px]" style={{ color: 'var(--text-2)' }}>{field.label}</label>
                  <input
                    id={`f-${field.key}`}
                    type="number"
                    value={snapshot[field.key] ?? ''}
                    onChange={e => setSnapshot(prev => {
                      const next = { ...prev };
                      if (e.target.value === '') delete next[field.key];
                      else next[field.key] = Number(e.target.value);
                      return next;
                    })}
                    className="w-24 px-2 py-1.5 text-[12px] font-mono outline-none rounded-md"
                    style={{ color: 'var(--text)', minWidth: 0, border: '1px solid var(--border)', background: 'var(--bg)' }}
                  />
                </div>
              ))}
            </div>
            <div className="px-5 py-3" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="text-[11px] m-0" style={{ color: 'var(--text-4)' }}>
                Amounts in any one currency and unit. Fields map 1:1 to <code className="font-mono">CompanySnapshotInput</code>.
              </p>
            </div>
          </div>

          {/* Output Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-lg text-[13px]"
              style={{ background: 'var(--blue-bg)', border: '1px solid var(--blue-border)', color: 'var(--blue)' }}
            >
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
              Ratings use generic rules of thumb that ignore sector and market. Compare with sector peers.
            </div>

            {SECTIONS.map(section => (
              <div key={section.title}>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-4)' }}>
                  {section.title}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {section.metrics.map(m => (
                    <MetricCard key={m.key} title={m.label} data={getPath(analysis, m.path)} metricId={m.metricId} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Conventions */}
      <section>
        <SectionTitle sub="Four rules that prevent most wrong answers.">Before you start</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CONVENTIONS.map(c => (
            <div key={c.title} className="rounded-xl p-4" style={{ border: '1px solid var(--border)' }}>
              <h3 className="text-[14px] font-semibold m-0 mb-1" style={{ color: 'var(--text)' }}>{c.title}</h3>
              <p className="text-[13px] m-0 leading-relaxed" style={{ color: 'var(--text-3)' }}>{c.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* All metrics */}
      <section>
        <SectionTitle sub="Each page explains the formula, how to read the result, and has its own calculator.">All metrics</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map(cat => (
            <div key={cat.label}>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-4)' }}>{cat.label}</h3>
              <ul className="m-0 p-0 list-none space-y-1">
                {cat.items.map(item => (
                  <li key={item.id}>
                    <Link to={`/metrics/${item.id}`} className="text-[13px] no-underline" style={{ color: 'var(--blue)' }}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section>
        <SectionTitle>Frequently asked questions</SectionTitle>
        <div className="space-y-2 max-w-3xl">
          {FAQ.map(f => (
            <details key={f.q} className="rounded-lg px-4 py-3" style={{ border: '1px solid var(--border)' }}>
              <summary className="text-[14px] font-medium cursor-pointer" style={{ color: 'var(--text)' }}>{f.q}</summary>
              <p className="text-[13px] mt-2 mb-0 leading-relaxed" style={{ color: 'var(--text-3)' }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
