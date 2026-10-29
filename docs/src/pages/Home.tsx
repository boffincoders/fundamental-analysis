import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyzeCompany, type EvaluatedMetric } from 'fundamental-analysis';
import { CATEGORIES } from '../data/navigation';
import { metricsData } from '../data/metrics';
import { DEMO_INDEX } from '../data/demo';
import { DarkCode } from '../components/CodeBlock';
import { usePageMeta } from '../seo';

const METRIC_COUNT = CATEGORIES.reduce((n, c) => n + c.items.length, 0);
// "P/E = Price / EPS" → "Price / EPS": the name is already shown next to it.
const formulaRhs = (f: string) => (f.includes(' = ') ? f.slice(f.indexOf(' = ') + 3) : f);
// boffincoders.com links from the home page, tagged so visits can be traced.
const bc = (path: string) => `https://boffincoders.com${path}?utm_source=docs&utm_medium=home&utm_campaign=fundamental-analysis`;
const diagram = (name: string) => `${import.meta.env.BASE_URL}diagrams/${name}`;

const STATUS_COLORS: Record<string, string> = {
  Good:    'var(--green)',
  Bad:     'var(--red)',
  Neutral: 'var(--neutral)',
};

const STATUS_BG: Record<string, string> = {
  Good:    'color-mix(in srgb, var(--green) 12%, transparent)',
  Bad:     'color-mix(in srgb, var(--red) 12%, transparent)',
  Neutral: 'var(--neutral-bg)',
};

/** Adds .shown to .reveal elements as they scroll into view. */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = ref.current?.querySelectorAll('.reveal') ?? [];
    if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('shown')); return; }
    const io = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('shown'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

// ── Code tabs (outputs verified against the built package) ─────────────────

const TABS: { label: string; code: string }[] = [
  {
    label: 'One company',
    code: `import { analyzeCompany } from 'fundamental-analysis';

const result = analyzeCompany({
  price: 150, eps: 5,
  netIncome: 5000, totalEquity: 40000,
  currentAssets: 40000, currentLiabilities: 25000,
}, true);

result.valuation.pe;           // { value: 30,    status: 'Bad', … }
result.profitability.roe;      // { value: 0.125, status: 'Neutral', … }
result.liquidity.currentRatio; // { value: 1.6,   status: 'Good', … }
result.valuation.pb;           // { value: null,  status: 'N/A', … }

// Each also carries a one-line insight, e.g.
// 'Healthy short-term liquidity.' or 'Book value negative or unavailable.'`,
  },
  {
    label: 'Single ratios',
    code: `import { peg, roe, netDebtToEbitda, cagr } from 'fundamental-analysis';

peg(30, 0.15);                  // 2   P/E 30, 15% growth (rates are decimals)
roe(-2, -10);                   // null  negative equity: not meaningful
netDebtToEbitda(500, 100, 200); // 2   (debt − cash) ÷ EBITDA
cagr(100, 125, 2);              // 0.118  11.8% a year over two years`,
  },
  {
    label: 'Screen a list',
    code: `import { analyzeBatch } from 'fundamental-analysis';

const companies = [
  { netIncome: 30, totalEquity: 100 },
  { netIncome: 5,  totalEquity: 100 },
  { netIncome: -3, totalEquity: -10 },
];

const roes = analyzeBatch(companies).map(r => r.profitability.roe);
// [0.3, 0.05, null]  →  filter out nulls, then rank
const strong = roes.filter(v => v != null && v >= 0.15);`,
  },
  {
    label: 'Growth trends',
    code: `import { analyzeFundamentalTrends } from 'fundamental-analysis';

const t = analyzeFundamentalTrends({
  revenue:   [100, 110, 125],
  netIncome: [10, 12, 15],
});

t.growth.revenueGrowth;  // [0.1, 0.136]
t.growth.revenueCagr;    // 0.118
t.margins.netMargins;    // [0.1, 0.109, 0.12]`,
  },
];

function CodeTabs() {
  const [tab, setTab] = useState(0);
  return (
    <div className="text-left">
      <div role="tablist" className="flex gap-1 -mb-px overflow-x-auto">
        {TABS.map((t, i) => (
          <button
            key={t.label}
            role="tab"
            aria-selected={i === tab}
            onClick={() => setTab(i)}
            className="px-3.5 py-2 text-[13px] rounded-t-lg cursor-pointer whitespace-nowrap"
            style={{
              border: '1px solid var(--border)', borderBottom: 0,
              background: i === tab ? 'var(--code-bg)' : 'var(--bg-subtle)',
              color: i === tab ? '#e6edf6' : 'var(--text-3)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <DarkCode code={TABS[tab].code} />
    </div>
  );
}

// ── Content ─────────────────────────────────────────────────────────────────

const COMPARISON: [string, string, string][] = [
  ['Missing input or zero denominator', 'NaN or Infinity, which then spreads through sorts and averages', 'null'],
  ['A ratio that makes no sense (PEG with shrinking earnings, ROE on negative equity, net debt / EBITDA with losses)', 'A plausible-looking number', 'null, with an N/A reason when insights are on'],
  ['Units', 'Is growth 15 or 0.15? Easy to get 100× wrong', 'Rates are always decimals; amounts in any one currency'],
  ['Ratings', 'You write and maintain the thresholds', 'Optional Good / Neutral / Bad and a one-line insight per metric'],
  ['Types', 'Whatever you declare', 'Typed inputs and typed results for every analyzer'],
  ['Examples you can trust', 'Copied from a blog post', 'Every documented output is recomputed from the built package'],
  ['Dependencies', '—', 'None'],
];

const FEATURES = [
  { title: 'One call, seven analyses', text: 'analyzeCompany() returns valuation, profitability, liquidity, solvency, efficiency, risk and quality together.' },
  { title: 'Plain-English ratings', text: 'Optional { value, status, insight } for each metric, with thresholds stated as generic rules of thumb.' },
  { title: 'Honest nulls', text: 'Missing or meaningless inputs return null instead of NaN, Infinity or a misleading number.' },
  { title: 'Trends and history', text: 'Year-over-year and quarter-over-quarter growth, CAGR, median growth, TTM and N-year sums.' },
  { title: 'Scores and screens', text: "Piotroski, Altman Z and Z'', quality, value and growth scores, and analyzeBatch() for watchlists." },
  { title: 'Works anywhere', text: 'Zero dependencies, CommonJS and ESM, Node.js, browsers and edge runtimes, any currency.' },
];

const USE_CASES = [
  { title: 'Stock screeners', text: 'Rank and filter a watchlist on P/E, PEG, ROE, leverage and margins with analyzeBatch().' },
  { title: 'Company snapshot cards', text: 'Show every ratio for one company with a plain-English rating, from a single analyzeCompany() call.' },
  { title: 'Valuation calculators', text: 'DCF, Graham number, intrinsic value with margin of safety, and net-net value per share.' },
  { title: 'Credit & leverage checks', text: "Net debt / EBITDA, interest coverage and Altman Z / Z'' distress scores for non-financial companies." },
  { title: 'FP&A ratio packs', text: 'DSO, DPO, cash conversion cycle, margins and returns from your own statements, no data vendor needed.' },
  { title: 'Finance education', text: 'Interactive calculators that show the formula, the result and how to read it.' },
];

const CONVENTIONS = [
  { title: 'Rates are decimals', text: '0.15 means 15 %, for growth, tax, discount rates and returns.' },
  { title: 'Any currency', text: 'USD, GBP, EUR, INR… in any unit, as long as one snapshot uses the same one throughout.' },
  { title: 'null means "not meaningful"', text: 'Missing input, zero denominator, or a ratio that makes no sense (ROE with negative equity, PEG with negative growth).' },
  { title: 'Ratings are rules of thumb', text: 'Good / Neutral / Bad use fixed generic thresholds. They ignore sector, so compare with peers before concluding anything.' },
];

const FAQ = [
  { q: 'Is fundamental-analysis free?', a: 'Yes. It is open source under the MIT licence and has no runtime dependencies.' },
  { q: 'Does it fetch stock prices or financial statements?', a: 'No. You pass in numbers from any source (your database, a CSV, SEC filings or a market-data API) and it computes the ratios. The demo on this site uses SEC EDGAR filings.' },
  { q: 'Which markets does it work for?', a: 'Any market: US, UK, EU, Canada, Australia, India and others. Ratios are unit-free, so only consistency within one snapshot matters.' },
  { q: 'Can I use it for banks, insurers or REITs?', a: 'Only with care. Current ratio, EV/EBITDA, inventory turnover and Altman Z are not meaningful for financial companies, and REITs are usually valued on FFO rather than earnings.' },
  { q: 'Does it calculate RSI, MACD or other technical indicators?', a: 'No. It focuses on fundamental analysis. The momentum score accepts RSI, ADX and moving-average values that you compute elsewhere.' },
  { q: 'Are the ratings and verdicts investment advice?', a: 'No. They are generic rules of thumb meant as a first-pass screen, not recommendations to buy, sell or hold anything.' },
];

// ── Playground ──────────────────────────────────────────────────────────────

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

const PLAYGROUND: { title: string; metrics: { label: string; path: string; metricId: string }[] }[] = [
  {
    title: 'Valuation',
    metrics: [
      { label: 'P/E Ratio', path: 'valuation.pe', metricId: 'pe' },
      { label: 'PEG Ratio', path: 'valuation.peg', metricId: 'peg' },
      { label: 'P/B Ratio', path: 'valuation.pb', metricId: 'pb' },
      { label: 'EV/EBITDA', path: 'valuation.evEbitda', metricId: 'ev-ebitda' },
      { label: 'Earnings Yield', path: 'valuation.earningsYield', metricId: 'earnings-yield' },
      { label: 'Graham Number', path: 'valuation.grahamNumber', metricId: 'graham' },
    ],
  },
  {
    title: 'Profitability',
    metrics: [
      { label: 'Return on Assets', path: 'profitability.roa', metricId: 'roa' },
      { label: 'Return on Equity', path: 'profitability.roe', metricId: 'roe' },
      { label: 'Net Margin', path: 'profitability.netProfitMargin', metricId: 'net-margin' },
    ],
  },
  {
    title: 'Liquidity & leverage',
    metrics: [
      { label: 'Current Ratio', path: 'liquidity.currentRatio', metricId: 'current-ratio' },
      { label: 'Debt / Equity', path: 'liquidity.debtToEquity', metricId: 'debt-to-equity' },
      { label: 'Interest Coverage', path: 'liquidity.interestCoverage', metricId: 'interest-coverage' },
      { label: 'Net Debt / EBITDA', path: 'solvency.netDebtToEbitda', metricId: 'net-debt-to-ebitda' },
      { label: 'Debt / Assets', path: 'solvency.debtToAssets', metricId: 'debt-to-assets' },
      { label: 'Net Cash', path: 'solvency.netCash', metricId: 'net-cash' },
    ],
  },
  {
    title: 'Distress risk & earnings quality',
    metrics: [
      { label: 'Altman Z (manufacturers)', path: 'risk.altmanZScore', metricId: 'z-score' },
      { label: "Altman Z'' (non-manufacturers)", path: 'risk.altmanZScoreDoublePrime', metricId: 'z-score-double-prime' },
      { label: 'Piotroski F-Score', path: 'risk.piotroski', metricId: 'piotroski' },
      { label: 'Cash Conversion', path: 'quality.cashConversionRatio', metricId: 'cash-conversion-ratio' },
    ],
  },
];

function getMetric(obj: unknown, path: string): EvaluatedMetric | undefined {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj) as EvaluatedMetric | undefined;
}

function MetricCard({ title, data, metricId }: { title: string; data?: EvaluatedMetric; metricId: string }) {
  if (!data || data.value == null || Number.isNaN(data.value)) {
    return (
      <div className="rounded-xl p-4 flex flex-col" style={{ border: '1px dashed var(--border)', background: 'var(--bg-subtle)' }}>
        <div className="text-[12px] font-medium mb-2" style={{ color: 'var(--text-3)' }}>{title}</div>
        <span className="text-2xl font-bold" style={{ color: 'var(--text-4)' }}>—</span>
        <p className="text-[11.5px] mt-2 m-0" style={{ color: 'var(--text-4)' }}>{data?.insight ?? 'Missing required input'}</p>
        <Link to={`/metrics/${metricId}`} className="mt-2 text-[11.5px] no-underline" style={{ color: 'var(--blue)' }}>See formula →</Link>
      </div>
    );
  }
  const color = STATUS_COLORS[data.status] ?? 'var(--text-3)';
  return (
    <div className="rounded-xl p-4 flex flex-col" style={{ border: '1px solid var(--border)', borderTop: `3px solid ${color}`, background: 'var(--bg)' }}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="text-[12px] font-medium" style={{ color: 'var(--text-3)' }}>{title}</div>
        <Link to={`/metrics/${metricId}`} className="text-[11px] no-underline shrink-0" style={{ color: 'var(--text-4)' }}>Explore →</Link>
      </div>
      <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>{data.value.toFixed(2)}</div>
      <span className="mt-2 self-start inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: STATUS_BG[data.status] ?? 'var(--bg-muted)', color }}>
        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: color }} />{data.status}
      </span>
      {data.insight && <p className="mt-2 mb-0 text-[12px] leading-snug" style={{ color: 'var(--text-3)' }}>{data.insight}</p>}
    </div>
  );
}

// ── Building blocks ─────────────────────────────────────────────────────────

function Section({ id, title, lead, children, className = '' }: { id?: string; title: string; lead?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`reveal max-w-[1080px] mx-auto scroll-mt-20 ${className}`}>
      <h2 className="text-center text-[1.55rem] font-bold tracking-tight mt-0 mb-2" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>{title}</h2>
      {lead && <p className="text-center text-[15.5px] max-w-[720px] mx-auto mb-7 leading-relaxed" style={{ color: 'var(--text-3)' }}>{lead}</p>}
      {children}
    </section>
  );
}

function Figure({ name, alt }: { name: string; alt: string }) {
  return (
    <figure className="m-0 mb-6">
      <img src={diagram(name)} alt={alt} loading="lazy" width={1000} className="block w-full h-auto rounded-xl" style={{ boxShadow: 'var(--shadow)' }} />
    </figure>
  );
}

function Button({ to, href, primary, children }: { to?: string; href?: string; primary?: boolean; children: React.ReactNode }) {
  const cls = 'inline-flex items-center h-11 px-4.5 rounded-[10px] text-[14.5px] font-semibold no-underline transition-colors';
  const style = primary
    ? { background: 'var(--accent-fill)', color: 'var(--accent-text)', border: '1px solid var(--accent-fill)', paddingInline: 18 }
    : { background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', paddingInline: 18 };
  const classes = `${cls} ${primary ? 'btn-primary' : 'btn-secondary'}`;
  return to
    ? <Link to={to} className={classes} style={style}>{children}</Link>
    : <a href={href} className={classes} style={style}>{children}</a>;
}

function Install() {
  const [copied, setCopied] = useState(false);
  const cmd = 'npm install fundamental-analysis';
  return (
    <div className="inline-flex items-center gap-3 font-mono text-[13.5px] pl-4 pr-2 py-2 rounded-[10px] max-w-full" style={{ border: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text)' }}>
      <span className="truncate">{cmd}</span>
      <button
        onClick={() => navigator.clipboard?.writeText(cmd).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
        className="text-[12px] px-2.5 py-1 rounded-md cursor-pointer font-sans"
        style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: copied ? 'var(--green)' : 'var(--text-3)' }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function Home() {
  const [snapshot, setSnapshot] = useState<Record<string, number>>(DEFAULT_SNAPSHOT);
  const root = useReveal();
  usePageMeta(
    'fundamental-analysis — Financial ratio calculator & fundamental analysis library for JavaScript and TypeScript',
    'Free, zero-dependency TypeScript library and online calculator for financial ratios: P/E, PEG, EV/EBITDA, ROE, ROIC, current ratio, net debt/EBITDA, Altman Z-Score, Piotroski F-Score, DCF, Graham number and intrinsic value.',
  );

  const analysis = analyzeCompany(snapshot, true);

  return (
    <div ref={root} className="space-y-20 pb-6">
      {/* Hero */}
      <section className="text-center max-w-[980px] mx-auto pt-10">
        <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] mb-4" style={{ color: 'var(--blue)' }}>
          Open source · MIT · Zero dependencies
        </p>
        <h1 className="font-bold mb-4" style={{ color: 'var(--text)', fontSize: 'clamp(2.2rem, 5.5vw, 3.5rem)', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
          Fundamental analysis, <span style={{ color: 'var(--blue)' }}>typed</span>.
        </h1>
        <p className="text-[17.5px] max-w-[700px] mx-auto mb-7 leading-relaxed" style={{ color: 'var(--text-3)' }}>
          A TypeScript library that turns financial-statement numbers into {METRIC_COUNT} valuation, profitability, debt and
          distress-risk metrics, each with an optional plain-English rating. Inputs that can't give an honest answer
          return <code className="font-mono text-[0.9em]">null</code>, never <code className="font-mono text-[0.9em]">NaN</code>.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mb-5">
          <Button to="/try/AAPL" primary>See it on Apple</Button>
          <Button to="/api-docs">Get started</Button>
          <Button href="#playground">Open the playground</Button>
          <Button href="#metrics">Browse metrics</Button>
        </div>
        <Install />
        <div className="flex flex-wrap justify-center gap-2 mt-5 text-[13px]" style={{ color: 'var(--text-4)' }}>
          {['CommonJS and ESM', '0 runtime dependencies', 'TypeScript types included', 'Node.js, browsers and edge'].map(b => (
            <span key={b} className="rounded-full px-3 py-0.5" style={{ border: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>{b}</span>
          ))}
        </div>
        <div className="max-w-[860px] mx-auto mt-10">
          <CodeTabs />
        </div>
      </section>

      <Section title="What happens on every call" lead="One function call, four steps. The numbers in the diagram are real output from the package, run on Apple's SEC figures.">
        <Figure name="how-it-works.svg" alt="Your numbers go into analyzeCompany. Step 1 checks the inputs and turns missing, zero, NaN and meaningless cases into null. Step 2 computes the ratios. Step 3 rates each one. Step 4 returns a typed result grouped into seven categories." />
      </Section>

      <Section title="Why not just write the formulas?" lead="P/E is one division. The hard part is every case where that division gives a confident, wrong answer.">
        <Figure name="null-safety.svg" alt="Five cases where plain arithmetic gives a misleading number and fundamental-analysis returns null or the correct value: zero EPS, shrinking earnings in PEG, negative equity in ROE, negative EBITDA in net debt to EBITDA, and growth typed as 15 instead of 0.15." />
        <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-[14px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                <th className="text-left font-semibold px-4 py-2.5" style={{ color: 'var(--text)' }}></th>
                <th className="text-left font-semibold px-4 py-2.5" style={{ color: 'var(--text)' }}>Hand-written formulas</th>
                <th className="text-left font-semibold px-4 py-2.5" style={{ color: 'var(--text)' }}>fundamental-analysis</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(([what, diy, pkg]) => (
                <tr key={what} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-4 py-2.5 align-top" style={{ color: 'var(--text-2)' }}>{what}</td>
                  <td className="px-4 py-2.5 align-top" style={{ color: 'var(--text-3)' }}>{diy}</td>
                  <td className="px-4 py-2.5 align-top font-medium" style={{ color: 'var(--green)' }}>{pkg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Everything you need">
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {FEATURES.map(f => (
            <div key={f.title} className="rounded-xl p-[18px]" style={{ border: '1px solid var(--border)', background: 'var(--bg)', boxShadow: 'var(--shadow)' }}>
              <h3 className="text-[15.5px] font-semibold mt-0 mb-1.5" style={{ color: 'var(--text)' }}>{f.title}</h3>
              <p className="text-[14px] m-0 leading-relaxed" style={{ color: 'var(--text-3)' }}>{f.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="metrics" title={`${METRIC_COUNT} metrics, each with its own page`} lead="Every page has the formula, how to read the result, where it misleads, and a calculator.">
        <Figure name="metric-map.svg" alt="Metrics grouped by analyzer: valuation, profitability, liquidity, solvency, efficiency, risk, quality, and growth over time." />
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {CATEGORIES.map(cat => (
            <div key={cat.label} className="rounded-xl p-4" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
              <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] mt-0 mb-2" style={{ color: 'var(--blue)' }}>{cat.label}</h3>
              <ul className="m-0 p-0 list-none">
                {cat.items.map(item => (
                  <li key={item.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <Link to={`/metrics/${item.id}`} className="flex items-baseline justify-between gap-3 py-1.5 no-underline group">
                      <span className="text-[14px] group-hover:underline" style={{ color: 'var(--text)' }}>{item.label}</span>
                      {metricsData[item.id]?.formula && (
                        <span className="text-[11.5px] font-mono truncate max-w-[55%] text-right" style={{ color: 'var(--text-4)' }} title={metricsData[item.id].formula}>{formulaRhs(metricsData[item.id].formula)}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title="See it on real companies" lead="Twenty US companies, straight from their SEC filings and refreshed every night. The package runs in your browser; type a share price and the valuation ratios and rule-based verdict update.">
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {DEMO_INDEX.map(c => (
            <Link key={c.ticker} to={`/try/${c.ticker}`} className="no-underline rounded-full px-3 py-1 text-[13px] font-mono font-semibold" style={{ border: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text)' }} title={c.name}>
              {c.ticker}
            </Link>
          ))}
        </div>
        <Figure name="verdict.svg" alt="How the rule-based verdict is formed: Piotroski and Altman combine into financial health; Graham's price tests and Lynch's PEG rule combine into price versus classic limits. Not financial advice." />
        <div className="text-center"><Button to="/try" primary>Open the demo</Button></div>
      </Section>

      <Section id="playground" title="Live playground" lead="Edit any number and every metric recalculates with analyzeCompany(data, true). Clear a field to see how missing inputs return null.">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-1 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
            <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-[12px] font-semibold uppercase tracking-wider m-0" style={{ color: 'var(--text-4)' }}>Company snapshot</h3>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              {SNAPSHOT_FIELDS.map(field => (
                <div key={field.key} className="flex items-center justify-between gap-3">
                  <label htmlFor={`f-${field.key}`} className="text-[12.5px]" style={{ color: 'var(--text-2)' }}>{field.label}</label>
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
              <p className="text-[11.5px] m-0" style={{ color: 'var(--text-4)' }}>
                Amounts in any one currency and unit. Fields map 1:1 to <code className="font-mono">CompanySnapshotInput</code>.
              </p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="px-4 py-3 rounded-[10px] text-[13px]" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderLeft: '4px solid var(--blue)', color: 'var(--text-2)' }}>
              Ratings use generic rules of thumb that ignore sector and market. Compare with sector peers.
            </div>
            {PLAYGROUND.map(section => (
              <div key={section.title}>
                <h3 className="text-[11.5px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-4)' }}>{section.title}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {section.metrics.map(m => <MetricCard key={m.path} title={m.label} data={getMetric(analysis, m.path)} metricId={m.metricId} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="What you can build" lead="Typical applications built on the library.">
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {USE_CASES.map(u => (
            <div key={u.title} className="rounded-xl p-4" style={{ border: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
              <h3 className="text-[15px] font-semibold m-0 mb-1" style={{ color: 'var(--text)' }}>{u.title}</h3>
              <p className="text-[13.5px] m-0 leading-relaxed" style={{ color: 'var(--text-3)' }}>{u.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Before you start" lead="Four rules that prevent most wrong answers.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {CONVENTIONS.map(c => (
            <div key={c.title} className="rounded-[10px] px-4 py-3.5" style={{ border: '1px solid var(--border)', borderLeft: '4px solid var(--blue)', background: 'var(--bg-subtle)' }}>
              <h3 className="text-[15px] font-semibold m-0 mb-1" style={{ color: 'var(--text)' }}>{c.title}</h3>
              <p className="text-[13.5px] m-0 leading-relaxed" style={{ color: 'var(--text-3)' }}>{c.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Frequently asked questions">
        <div className="space-y-2 max-w-3xl mx-auto">
          {FAQ.map(f => (
            <details key={f.q} className="rounded-[10px] px-4 py-3" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
              <summary className="text-[14.5px] font-medium cursor-pointer" style={{ color: 'var(--text)' }}>{f.q}</summary>
              <p className="text-[13.5px] mt-2 mb-0 leading-relaxed" style={{ color: 'var(--text-3)' }}>{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      <section className="reveal text-center max-w-[720px] mx-auto">
        <h2 className="text-[1.35rem] font-bold tracking-tight mt-0 mb-2" style={{ color: 'var(--text)' }}>Built by Boffin Coders</h2>
        <p className="text-[15px] mb-4 leading-relaxed" style={{ color: 'var(--text-3)' }}>
          <a href={bc('/')} target="_blank" rel="noopener" className="font-semibold" style={{ color: 'var(--blue)' }}>Boffin Coders</a>{' '}
          designs and builds websites, web applications and mobile apps, and runs their SEO, for businesses and agencies.
          Need fundamentals in your product, a stock screener or a finance dashboard? See our{' '}
          <a href={bc('/services/web-application-development')} target="_blank" rel="noopener" style={{ color: 'var(--blue)' }}>web application development</a> work.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button href={bc('/contact-us')} primary>Talk to us</Button>
          <Button to="/api-docs">Read the guide</Button>
        </div>
      </section>
    </div>
  );
}
