import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  analyzeCompany,
  analyzeFundamentalTrends,
  cagr,
  computeIntrinsicValue,
  evaluate,
  type EvaluatedMetric,
} from 'fundamental-analysis';
import { usePageMeta } from '../seo';
import { DEMO_INDEX, formatDate, formatMoney, loadDemoCompany, toInput, type DemoCompany, type DemoYear } from '../data/demo';
import { buildVerdict, DISCLAIMER, fullPiotroski, type Tone, type Verdict } from '../data/verdict';

type Unit = 'x' | '%' | '$' | '$B' | 'days' | 'score' | 'int';

const STATUS_COLOR: Record<string, string> = { Good: 'var(--green)', Bad: 'var(--red)', Neutral: 'var(--blue)', 'N/A': 'var(--text-4)' };

function formatValue(v: number | null, unit: Unit): string {
  if (v == null || !Number.isFinite(v)) return '—';
  switch (unit) {
    case 'x': return `${v.toFixed(2)}×`;
    case '%': return `${(v * 100).toFixed(1)}%`;
    case '$': return `$${v.toFixed(2)}`;
    case '$B': return formatMoney(v);
    case 'days': return `${Math.round(v)} days`;
    case 'score': return v.toFixed(2);
    case 'int': return String(Math.round(v));
  }
}

// [result key, label, unit, metric page id]
type Row = [string, string, Unit, string];
const SECTIONS: { key: 'valuation' | 'profitability' | 'liquidity' | 'solvency' | 'efficiency' | 'risk' | 'quality'; title: string; rows: Row[] }[] = [
  {
    key: 'valuation', title: 'Valuation', rows: [
      ['pe', 'P/E', 'x', 'pe'], ['pb', 'P/B', 'x', 'pb'], ['ps', 'P/S', 'x', 'ps'], ['peg', 'PEG', 'x', 'peg'],
      ['evEbitda', 'EV/EBITDA', 'x', 'ev-ebitda'], ['evRevenue', 'EV/Revenue', 'x', 'ev-revenue'], ['evFcf', 'EV/FCF', 'x', 'ev-fcf'],
      ['priceToCashFlow', 'Price/Cash flow', 'x', 'price-to-cash-flow'], ['earningsYield', 'Earnings yield', '%', 'earnings-yield'],
      ['dividendYield', 'Dividend yield', '%', 'dividend'], ['grahamNumber', 'Graham number', '$', 'graham'],
    ],
  },
  {
    key: 'profitability', title: 'Profitability', rows: [
      ['roe', 'Return on equity', '%', 'roe'], ['roa', 'Return on assets', '%', 'roa'], ['roic', 'Return on invested capital', '%', 'roic'],
      ['grossMargin', 'Gross margin', '%', 'gross-margin'], ['operatingMargin', 'Operating margin', '%', 'operating-margin'],
      ['netProfitMargin', 'Net margin', '%', 'net-margin'], ['fcfMargin', 'Free-cash-flow margin', '%', 'fcf-margin'],
    ],
  },
  {
    key: 'liquidity', title: 'Liquidity', rows: [
      ['currentRatio', 'Current ratio', 'x', 'current-ratio'], ['quickRatio', 'Quick ratio', 'x', 'quick-ratio'],
    ],
  },
  {
    key: 'solvency', title: 'Debt & solvency', rows: [
      ['netDebt', 'Net debt', '$B', 'net-debt'], ['netDebtToEbitda', 'Net debt / EBITDA', 'x', 'net-debt-to-ebitda'],
      ['debtToEquity', 'Debt / equity', 'x', 'debt-to-equity'], ['debtToAssets', 'Debt / assets', '%', 'debt-to-assets'],
      ['interestCoverage', 'Interest coverage', 'x', 'interest-coverage'],
    ],
  },
  {
    key: 'efficiency', title: 'Efficiency', rows: [
      ['assetTurnover', 'Asset turnover', 'x', 'asset-turnover'], ['inventoryTurnover', 'Inventory turnover', 'x', 'inventory-turnover'],
      ['receivablesTurnover', 'Receivables turnover', 'x', 'receivables-turnover'], ['daysSalesOutstanding', 'Days sales outstanding', 'days', 'days-sales-outstanding'],
    ],
  },
  {
    key: 'risk', title: 'Distress risk', rows: [
      ['altmanZScore', 'Altman Z (original)', 'score', 'z-score'], ['altmanZScoreDoublePrime', "Altman Z''", 'score', 'z-score-double-prime'],
    ],
  },
  {
    key: 'quality', title: 'Earnings quality', rows: [
      ['payoutRatio', 'Payout ratio', '%', 'payout-ratio'], ['cashConversionRatio', 'Cash conversion (OCF / net income)', 'x', 'cash-conversion-ratio'],
    ],
  },
];

// Fields shown in "Numbers used", in statement order.
const INPUT_FIELDS: [string, string, 'money' | 'perShare' | 'shares' | 'rate'][] = [
  ['totalRevenue', 'Revenue', 'money'], ['costOfRevenue', 'Cost of revenue', 'money'], ['operatingIncome', 'Operating income', 'money'],
  ['ebit', 'EBIT', 'money'], ['ebitda', 'EBITDA', 'money'], ['interestExpense', 'Interest expense', 'money'], ['netIncome', 'Net income', 'money'],
  ['taxRate', 'Effective tax rate', 'rate'], ['eps', 'Diluted EPS', 'perShare'], ['annualDividendPerShare', 'Dividends per share', 'perShare'],
  ['operatingCashFlow', 'Operating cash flow', 'money'], ['freeCashFlow', 'Free cash flow (OCF − capex)', 'money'],
  ['totalAssets', 'Total assets', 'money'], ['totalLiabilities', 'Total liabilities', 'money'], ['totalEquity', "Shareholders' equity", 'money'],
  ['currentAssets', 'Current assets', 'money'], ['currentLiabilities', 'Current liabilities', 'money'], ['totalDebt', 'Total debt', 'money'],
  ['cashAndEquivalents', 'Cash & equivalents', 'money'], ['inventory', 'Inventory', 'money'], ['tradeReceivables', 'Receivables', 'money'],
  ['retainedEarnings', 'Retained earnings', 'money'], ['sharesOutstanding', 'Shares outstanding', 'shares'],
];

function formatInput(v: number | null | undefined, kind: 'money' | 'perShare' | 'shares' | 'rate') {
  if (v == null) return '—';
  if (kind === 'money') return formatMoney(v);
  if (kind === 'perShare') return `$${v.toFixed(2)}`;
  if (kind === 'rate') return `${(v * 100).toFixed(1)}%`;
  return `${(v / 1e9).toFixed(3)}B`;
}

/** Historical EPS CAGR as a default growth assumption, clamped to 0–25 %. */
function defaultGrowth(annual: DemoYear[]): number {
  const eps = annual.map(r => r.eps).filter((v): v is number => v != null);
  const g = eps.length >= 3 ? cagr(eps[0], eps[eps.length - 1], eps.length - 1) : null;
  return g == null ? 0.05 : Math.min(Math.max(g, 0), 0.25);
}

const TONE_COLOR: Record<Tone, string> = { good: 'var(--green)', neutral: 'var(--yellow)', bad: 'var(--red)', na: 'var(--text-4)' };

function VerdictCard({ verdict, hasPrice }: { verdict: Verdict; hasPrice: boolean }) {
  return (
    <section className="rounded-xl p-5 mb-5" style={{ border: `1px solid ${TONE_COLOR[verdict.health.tone]}`, background: 'var(--bg)' }}>
      <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-4)' }}>Rule-based verdict · not advice</p>
      <h2 className="text-[19px] font-semibold mb-3 leading-snug" style={{ color: 'var(--text)' }}>{verdict.headline}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {[['Financial health', verdict.health], ['Price vs classic limits', verdict.valuation]].map(([title, part]) => {
          const p = part as Verdict['health'];
          return (
            <div key={title as string} className="rounded-lg px-3 py-2" style={{ background: 'var(--bg-subtle)', borderLeft: `3px solid ${TONE_COLOR[p.tone]}` }}>
              <div className="text-[11.5px]" style={{ color: 'var(--text-4)' }}>{title as string}</div>
              <div className="text-[13.5px] font-medium" style={{ color: 'var(--text)' }}>{p.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {verdict.lenses.map(lens => (
          <details key={lens.id} className="rounded-lg px-3 py-2" style={{ border: '1px solid var(--border)' }}>
            <summary className="cursor-pointer list-none">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13.5px] font-semibold" style={{ color: 'var(--text)' }}>{lens.author}</span>
                <span className="text-[12px] font-medium text-right" style={{ color: TONE_COLOR[lens.tone] }}>{lens.summary}</span>
              </div>
              <div className="text-[11.5px] italic" style={{ color: 'var(--text-4)' }}>{lens.source}</div>
            </summary>
            <p className="text-[12.5px] mt-2 mb-2" style={{ color: 'var(--text-3)' }}>{lens.idea}</p>
            <ul className="m-0 p-0 list-none">
              {lens.checks.map(c => (
                <li key={c.label} className="text-[12.5px] py-1 flex gap-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <span className="font-mono w-4 shrink-0" style={{ color: c.pass === null ? 'var(--text-4)' : c.pass ? 'var(--green)' : 'var(--red)' }}>
                    {c.pass === null ? '–' : c.pass ? '✓' : '✗'}
                  </span>
                  <span style={{ color: 'var(--text-2)' }}>
                    {c.label}{c.detail && <span style={{ color: 'var(--text-4)' }}> · {c.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-[12.5px] font-medium" style={{ color: 'var(--blue)' }}>How the verdict is formed</summary>
        <div className="text-[12.5px] leading-relaxed mt-2" style={{ color: 'var(--text-3)' }}>
          <p className="mb-2">The verdict summarises what four published rules of thumb say about these figures. It is not an opinion on the company and not a recommendation.</p>
          <p className="mb-2"><strong>Financial health</strong> combines Piotroski's F-Score and Altman's Z''. If both are in their strong bands (F-Score 7–9 of 9, Z'' above 2.6) it reads <em>strong</em>; if either is in its weak band (F-Score 0–2, Z'' below 1.1) it reads <em>weak</em>; otherwise it reads <em>mixed</em>. Graham's balance-sheet tests are listed alongside for context.</p>
          <p className="mb-2"><strong>Price vs classic limits</strong> needs a share price. It reads <em>within</em> the limits when the company meets both of Graham's price tests or Lynch's PEG is 1 or lower, <em>well above</em> when the PEG is 2 or higher, and <em>above</em> in between. The PEG uses the growth rate in the assumptions box, so changing that assumption changes the result.</p>
          <p className="mb-0">Where the authors asked for ten or twenty years of history, five years of filings are used, and Graham's 1972 size test is restated in today's dollars. Rules written for cautious investors decades ago rarely suit fast-growing companies, so a well-regarded business can still sit <em>well above</em> the classic limits.</p>
        </div>
      </details>

      <p className="text-[11.5px] leading-relaxed mt-4 mb-0 rounded-lg px-3 py-2" style={{ background: 'var(--bg-muted)', color: 'var(--text-3)' }}>
        <strong style={{ color: 'var(--text-2)' }}>Disclaimer:</strong> {DISCLAIMER}
        {!hasPrice && ' The price half of the verdict appears once you enter a share price.'}
      </p>
    </section>
  );
}

function MetricRow({ label, unit, metricId, m }: { label: string; unit: Unit; metricId: string; m: EvaluatedMetric }) {
  return (
    <div className="py-3 grid grid-cols-[1fr_auto] sm:grid-cols-[200px_110px_80px_1fr] gap-x-4 gap-y-1 items-baseline" style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <Link to={`/metrics/${metricId}`} className="text-[13px] font-medium no-underline hover:underline" style={{ color: 'var(--text)' }}>{label}</Link>
      <span className="text-[14px] font-mono font-semibold text-right sm:text-left" style={{ color: 'var(--text)' }}>{formatValue(m.value, unit)}</span>
      <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: STATUS_COLOR[m.status] ?? 'var(--text-3)' }}>{m.status}</span>
      <span className="text-[12.5px] leading-snug col-span-2 sm:col-span-1" style={{ color: 'var(--text-3)' }}>{m.insight}</span>
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl p-5 mb-5" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
      <h2 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--text)' }}>{title}</h2>
      {sub && <p className="text-[12.5px] mb-2" style={{ color: 'var(--text-4)' }}>{sub}</p>}
      {children}
    </section>
  );
}

function TickerGrid({ active }: { active?: string }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 mb-8">
      {DEMO_INDEX.map(c => {
        const on = c.ticker === active;
        return (
          <Link
            key={c.ticker}
            to={`/try/${c.ticker}`}
            className="rounded-lg px-3 py-2 no-underline transition-colors"
            style={{ border: `1px solid ${on ? 'var(--blue)' : 'var(--border)'}`, background: on ? 'var(--blue-bg)' : 'var(--bg-subtle)' }}
          >
            <div className="text-[13px] font-semibold font-mono" style={{ color: on ? 'var(--blue)' : 'var(--text)' }}>{c.ticker}</div>
            <div className="text-[12px] truncate" style={{ color: 'var(--text-3)' }}>{c.name}</div>
          </Link>
        );
      })}
    </div>
  );
}

function CodeSample({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => { navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
        className="absolute top-2 right-2 px-2 py-1 rounded text-[11px] cursor-pointer"
        style={{ background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d' }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre className="shiki m-0" style={{ background: '#0d1117', color: '#c9d1d9' }}><code>{code}</code></pre>
    </div>
  );
}

function NumberField({ label, value, onChange, prefix, suffix, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void; prefix?: string; suffix?: string; placeholder?: string; hint?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text-2)' }}>{label}</span>
      <span className="flex items-center rounded-lg px-3 py-2" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
        {prefix && <span className="text-[14px] mr-1" style={{ color: 'var(--text-4)' }}>{prefix}</span>}
        <input
          type="number" inputMode="decimal" step="any" value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-transparent outline-none text-[15px] font-mono"
          style={{ color: 'var(--text)', border: 'none' }}
        />
        {suffix && <span className="text-[14px] ml-1" style={{ color: 'var(--text-4)' }}>{suffix}</span>}
      </span>
      {hint && <span className="block text-[11.5px] mt-1" style={{ color: 'var(--text-4)' }}>{hint}</span>}
    </label>
  );
}

function CompanyView({ company }: { company: DemoCompany }) {
  const [priceText, setPriceText] = useState('');
  const [growthText, setGrowthText] = useState(() => (defaultGrowth(company.annual) * 100).toFixed(1));

  const price = parseFloat(priceText);
  const hasPrice = Number.isFinite(price) && price > 0;
  const growth = parseFloat(growthText) / 100;
  const shares = company.snapshot.sharesOutstanding;

  const input = useMemo(() => {
    const base = toInput(company.snapshot);
    if (Number.isFinite(growth)) base.expectedEarningsGrowthRate = growth;
    if (hasPrice) {
      base.price = price;
      if (shares) base.marketCap = price * shares;
    }
    return base;
  }, [company, price, hasPrice, growth, shares]);

  const analysis = useMemo(() => analyzeCompany(input, true), [input]);
  const pio = useMemo(() => fullPiotroski(company.annual), [company]);
  const verdict = useMemo(
    () => buildVerdict(toInput(company.snapshot), company.annual, hasPrice ? price : null, Number.isFinite(growth) ? growth : null),
    [company, hasPrice, price, growth],
  );
  const pioEval = pio ? evaluate.piotroski(pio.result.score, pio.result.maxScore) : null;

  const eps = company.snapshot.eps;
  const intrinsic = eps != null && Number.isFinite(growth) ? computeIntrinsicValue(eps, growth, 0.25) : null;
  const intrinsicMetric: EvaluatedMetric = intrinsic == null
    ? { value: null, status: 'N/A', insight: eps != null && eps <= 0 ? 'Not meaningful: earnings per share are negative.' : 'Needs EPS and a growth rate.' }
    : hasPrice
      ? { value: intrinsic, status: price <= intrinsic ? 'Good' : 'Bad', insight: `EPS grown ${(growth * 100).toFixed(1)}% a year for 5 years, valued at 15× earnings, discounted at 10% with a 25% margin of safety. Price is ${price <= intrinsic ? 'below' : 'above'} this estimate.` }
      : { value: intrinsic, status: 'N/A', insight: `EPS grown ${(growth * 100).toFixed(1)}% a year for 5 years, valued at 15× earnings, discounted at 10% with a 25% margin of safety. Enter a price to compare.` };

  const trendRows = company.annual.filter(r => r.revenue != null && r.netIncome != null);
  const trends = trendRows.length >= 2 ? analyzeFundamentalTrends({
    revenue: trendRows.map(r => r.revenue as number),
    netIncome: trendRows.map(r => r.netIncome as number),
  }) : null;

  const marketCap = input.marketCap;
  const codeName = company.ticker.toLowerCase();
  const code = [
    `import { analyzeCompany } from 'fundamental-analysis';`,
    ``,
    `// ${company.name}: ${company.asOf.basis === 'TTM' ? 'trailing twelve months to' : 'fiscal year ended'} ${formatDate(company.asOf.periodEnd)}, USD, from SEC filings`,
    `const ${codeName} = {`,
    ...(hasPrice ? [`  price: ${price},`, ...(marketCap ? [`  marketCap: ${Math.round(marketCap)},`] : [])] : [`  // price: 0,  // add today's share price for valuation ratios`]),
    ...(Number.isFinite(growth) ? [`  expectedEarningsGrowthRate: ${+growth.toFixed(4)},`] : []),
    ...Object.entries(company.snapshot).filter(([, v]) => v != null).map(([k, v]) => `  ${k}: ${v},`),
    `};`,
    ``,
    `const result = analyzeCompany(${codeName}, true);`,
    `console.log(result.profitability.roe);`,
    `// ${JSON.stringify(analysis.profitability.roe)}`,
  ].join('\n');

  const fyNote = company.annual.some(r => r.splitAdjusted) ? ' EPS before a stock split is restated on the current share basis.' : '';

  return (
    <div>
      <h1 className="text-[1.85rem] font-bold tracking-tight mb-1" style={{ color: 'var(--text)', letterSpacing: '-0.03em' }}>
        {company.name} ({company.ticker}) fundamental analysis
      </h1>
      <p className="text-[13.5px] mb-6" style={{ color: 'var(--text-3)' }}>
        {company.sector} · {company.asOf.basis === 'TTM' ? 'Trailing twelve months' : 'Fiscal year'} to {formatDate(company.asOf.periodEnd)} ·
        from {company.asOf.form ?? 'SEC filing'} filed {formatDate(company.asOf.filed)}
        {company.asOf.url && <> · <a href={company.asOf.url} target="_blank" rel="noopener" style={{ color: 'var(--blue)' }}>view filing on SEC.gov ↗</a></>}
      </p>

      <Card title="Your assumptions" sub="We don't show live prices. Type today's share price from any quote site to unlock the valuation ratios.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
          <NumberField label="Share price (USD)" prefix="$" value={priceText} onChange={setPriceText} placeholder="e.g. 200" />
          <NumberField label="Expected EPS growth per year" suffix="%" value={growthText} onChange={setGrowthText}
            hint="Default: past EPS growth (CAGR), capped at 25%. Used for PEG and intrinsic value." />
          <div>
            <span className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text-2)' }}>Market cap</span>
            <span className="block py-2 text-[15px] font-mono" style={{ color: 'var(--text)' }}>{marketCap ? formatMoney(marketCap) : '—'}</span>
            <span className="block text-[11.5px]" style={{ color: 'var(--text-4)' }}>Price × {shares ? `${(shares / 1e9).toFixed(2)}B` : '?'} shares</span>
          </div>
        </div>
      </Card>

      <VerdictCard verdict={verdict} hasPrice={hasPrice} />

      {SECTIONS.map(section => {
        const results = analysis[section.key] as Record<string, EvaluatedMetric>;
        // Without a price the evaluator can't tell why a ratio is missing; say so here.
        const needsPrice = (key: string) => section.key === 'valuation' && !hasPrice && key !== 'grahamNumber';
        return (
          <Card key={section.key} title={section.title} sub={section.key === 'valuation' && !hasPrice ? 'Most valuation ratios need a share price: enter one above.' : undefined}>
            {section.rows.map(([key, label, unit, id]) => results[key] && (
              <MetricRow key={key} label={label} unit={unit} metricId={id}
                m={needsPrice(key) ? { value: null, status: 'N/A', insight: 'Needs a share price: enter one above.' } : results[key]} />
            ))}
            {section.key === 'valuation' && <MetricRow label="Intrinsic value estimate" unit="$" metricId="intrinsic-value" m={intrinsicMetric} />}
            {section.key === 'risk' && pioEval && pio && (
              <>
                <MetricRow label={`Piotroski F-Score (FY${pio.cur.fiscalYear}${pio.prev ? ` vs FY${pio.prev.fiscalYear}` : ''})`} unit="int" metricId="piotroski" m={{ ...pioEval, value: pio.result.score }} />
                <p className="text-[12px] mt-1 mb-0" style={{ color: 'var(--text-4)' }}>
                  {pio.result.score} of {pio.result.maxScore} signals passed:{' '}
                  {Object.entries(pio.result.signals).map(([k, v]) => `${k.slice(0, 2).toUpperCase()} ${v === null ? '–' : v ? '✓' : '✗'}`).join(' · ')}
                </p>
              </>
            )}
          </Card>
        );
      })}

      {trends && (
        <Card title="Growth history" sub={`Annual figures from 10-K filings.${fyNote}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] font-mono" style={{ color: 'var(--text-2)', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--text-4)' }}>
                  <th className="text-left font-medium py-2 pr-4">Fiscal year</th>
                  <th className="text-right font-medium py-2 px-3">Revenue</th>
                  <th className="text-right font-medium py-2 px-3">Growth</th>
                  <th className="text-right font-medium py-2 px-3">Net income</th>
                  <th className="text-right font-medium py-2 px-3">Net margin</th>
                  <th className="text-right font-medium py-2 px-3">Diluted EPS</th>
                  <th className="text-right font-medium py-2 pl-3">Free cash flow</th>
                </tr>
              </thead>
              <tbody>
                {trendRows.map((r, i) => (
                  <tr key={r.fiscalYearEnd} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <td className="py-2 pr-4">FY{r.fiscalYear}</td>
                    <td className="text-right py-2 px-3">{formatMoney(r.revenue)}</td>
                    <td className="text-right py-2 px-3">{i === 0 ? '' : formatValue(trends.growth.revenueGrowth[i - 1], '%')}</td>
                    <td className="text-right py-2 px-3">{formatMoney(r.netIncome)}</td>
                    <td className="text-right py-2 px-3">{formatValue(trends.margins.netMargins[i], '%')}</td>
                    <td className="text-right py-2 px-3">{r.eps == null ? '—' : `$${r.eps.toFixed(2)}`}</td>
                    <td className="text-right py-2 pl-3">{formatMoney(r.freeCashFlow)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12.5px] mt-3 mb-0" style={{ color: 'var(--text-3)' }}>
            Revenue CAGR over {trendRows.length - 1} years: <strong className="font-mono">{formatValue(trends.growth.revenueCagr, '%')}</strong> ·
            Net income CAGR: <strong className="font-mono">{formatValue(trends.growth.netIncomeCagr, '%')}</strong>
            {trends.growth.netIncomeCagr == null && ' (not meaningful when a year is a loss)'}
          </p>
        </Card>
      )}

      <Card title="Numbers used" sub="Exactly what was fed to the package, with the SEC XBRL tag and period each one came from.">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]" style={{ color: 'var(--text-2)', borderCollapse: 'collapse' }}>
            <tbody>
              {INPUT_FIELDS.map(([key, label, kind]) => {
                const v = company.snapshot[key as keyof typeof company.snapshot];
                const s = company.sources[key];
                return (
                  <tr key={key} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <td className="py-1.5 pr-4">{label}</td>
                    <td className="py-1.5 pr-4 text-right font-mono">{formatInput(v, kind)}</td>
                    <td className="py-1.5 font-mono text-[11.5px] break-all" style={{ color: 'var(--text-4)' }}>
                      {v == null ? 'not reported, metrics that need it show N/A' : s ? `${s.tag}${s.basis && s.basis !== 'instant' ? ` · ${s.basis}` : ''}${s.end ? ` · ${s.end}` : ''}` : 'derived'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Run it yourself" sub="Copy this into any Node.js or browser project after npm install fundamental-analysis.">
        <CodeSample code={code} />
      </Card>
    </div>
  );
}

export default function Try() {
  const { ticker: param } = useParams<{ ticker?: string }>();
  const ticker = param?.toUpperCase();
  const entry = DEMO_INDEX.find(c => c.ticker === ticker);
  const [loaded, setLoaded] = useState<DemoCompany | null>(null);
  const company = loaded && loaded.ticker === entry?.ticker ? loaded : null;

  usePageMeta(
    entry
      ? `${entry.name} (${entry.ticker}) fundamental analysis: P/E, ROE, Altman Z, Piotroski | fundamental-analysis`
      : 'Try fundamental analysis on real companies | fundamental-analysis',
    entry
      ? `Free fundamental analysis of ${entry.name} (${entry.ticker}) from its latest SEC filing: valuation, profitability, debt, liquidity, Altman Z-score, Piotroski F-score and growth, computed live with the open-source fundamental-analysis package.`
      : 'Pick Apple, Microsoft, NVIDIA or 17 other US companies and see the open-source fundamental-analysis package compute valuation, profitability, debt and distress-risk metrics from their latest SEC filings, live in your browser.',
  );

  useEffect(() => {
    let live = true;
    if (entry) loadDemoCompany(entry.ticker).then(c => { if (live) setLoaded(c); });
    return () => { live = false; };
  }, [entry]);

  return (
    <div>
      {!entry && (
        <>
          <h1 className="text-[1.85rem] font-bold tracking-tight mb-2" style={{ color: 'var(--text)', letterSpacing: '-0.03em' }}>
            Try it on real companies
          </h1>
          <p className="text-[15px] mb-6 max-w-2xl leading-relaxed" style={{ color: 'var(--text-3)' }}>
            Pick a company. Its numbers come from its latest filings with the US SEC, refreshed every night, and the{' '}
            <code className="font-mono text-[13px]">fundamental-analysis</code> package runs on them right here in your browser.
            Type a share price to see valuation ratios, change the growth assumption, and copy the exact code.
          </p>
        </>
      )}
      {param && !entry && (
        <p className="text-[14px] mb-4" style={{ color: 'var(--red)' }}>“{param}” isn’t in the demo. Pick one of these:</p>
      )}

      {entry && !company && <p className="text-[14px]" style={{ color: 'var(--text-3)' }}>Loading {entry.name}…</p>}
      {entry && company && <CompanyView key={company.ticker} company={company} />}

      <h2 className="text-[15px] font-semibold mt-8 mb-3" style={{ color: 'var(--text)' }}>{entry ? 'Try another company' : 'Companies'}</h2>
      <TickerGrid active={entry?.ticker} />

      <p className="text-[12px] leading-relaxed max-w-3xl" style={{ color: 'var(--text-4)' }}>
        Educational demo, not financial advice. Verdicts and ratings apply published rules of thumb automatically and are not recommendations to buy, sell or hold any security. Ratings use generic thresholds that ignore sector norms
        (a software company and a retailer are judged by the same bands). Data comes from XBRL facts in SEC filings and may
        contain tagging differences; when a company doesn't report a figure, metrics that need it show N/A rather than a guess.
        Want this on your own data? <Link to="/api-docs" style={{ color: 'var(--blue)' }}>Read the API guide</Link> or{' '}
        <a href="https://boffincoders.com/?utm_source=docs&utm_medium=try&utm_campaign=fundamental-analysis" target="_blank" rel="noopener" style={{ color: 'var(--blue)' }}>talk to Boffin Coders</a>.
      </p>
    </div>
  );
}
