#!/usr/bin/env node
// Fetches fundamentals for the docs "Try it" demo from SEC EDGAR (free, public
// data) and writes one JSON file per ticker to docs/src/data/demo/.
//
// The JSON holds raw reported numbers only; the docs page runs the
// fundamental-analysis package on them in the browser. Share prices are not
// fetched (no free price source allows public display), the visitor types one.
//
// Usage:
//   SEC_CONTACT_EMAIL=you@example.com node scripts/fetch-demo-data.mjs
//   node scripts/fetch-demo-data.mjs --cache <dir>   # read cf_<cik>.json files instead of fetching
//
// SEC fair-access rules: at most 10 requests/second and a User-Agent naming a
// contact. https://www.sec.gov/os/accessing-edgar-data

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/src/data/demo');

// ciks: newest filer first. ExxonMobil moved to a new holding company in 2026,
// so its history lives under the old CIK and recent filings under the new one.
export const COMPANIES = [
  { ticker: 'AAPL', name: 'Apple', sector: 'Technology', ciks: [320193] },
  { ticker: 'MSFT', name: 'Microsoft', sector: 'Technology', ciks: [789019] },
  { ticker: 'NVDA', name: 'NVIDIA', sector: 'Semiconductors', ciks: [1045810] },
  { ticker: 'GOOGL', name: 'Alphabet', sector: 'Communication services', ciks: [1652044] },
  { ticker: 'AMZN', name: 'Amazon', sector: 'Consumer discretionary', ciks: [1018724] },
  { ticker: 'META', name: 'Meta Platforms', sector: 'Communication services', ciks: [1326801] },
  { ticker: 'TSLA', name: 'Tesla', sector: 'Automobiles', ciks: [1318605] },
  { ticker: 'AVGO', name: 'Broadcom', sector: 'Semiconductors', ciks: [1730168] },
  { ticker: 'LLY', name: 'Eli Lilly', sector: 'Pharmaceuticals', ciks: [59478] },
  { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Pharmaceuticals', ciks: [200406] },
  { ticker: 'MRNA', name: 'Moderna', sector: 'Biotechnology', ciks: [1682852] },
  { ticker: 'UNH', name: 'UnitedHealth Group', sector: 'Health care', ciks: [731766] },
  { ticker: 'MA', name: 'Mastercard', sector: 'Financial services', ciks: [1141391] },
  { ticker: 'WMT', name: 'Walmart', sector: 'Consumer staples', ciks: [104169] },
  { ticker: 'COST', name: 'Costco', sector: 'Consumer staples', ciks: [909832] },
  { ticker: 'HD', name: 'Home Depot', sector: 'Consumer discretionary', ciks: [354950] },
  { ticker: 'PG', name: 'Procter & Gamble', sector: 'Consumer staples', ciks: [80424] },
  { ticker: 'KO', name: 'Coca-Cola', sector: 'Consumer staples', ciks: [21344] },
  { ticker: 'XOM', name: 'ExxonMobil', sector: 'Energy', ciks: [2115436, 34088] },
  { ticker: 'NFLX', name: 'Netflix', sector: 'Communication services', ciks: [1065280] },
];

// Companies tag the same line item differently; each field tries these
// us-gaap concepts in order, per period.
const FLOW = {
  revenue: ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet', 'RevenueFromContractWithCustomerIncludingAssessedTax'],
  costOfRevenue: ['CostOfRevenue', 'CostOfGoodsAndServicesSold', 'CostOfGoodsSold'],
  grossProfit: ['GrossProfit'],
  operatingIncome: ['OperatingIncomeLoss'],
  pretaxIncome: ['IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest', 'IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments'],
  incomeTax: ['IncomeTaxExpenseBenefit'],
  // ProfitLoss includes minority interests; used only when NetIncomeLoss is absent.
  netIncome: ['NetIncomeLoss', 'ProfitLoss'],
  interestExpense: ['InterestExpense', 'InterestExpenseNonoperating', 'InterestExpenseDebt', 'InterestAndDebtExpense'],
  depreciation: ['DepreciationDepletionAndAmortization', 'DepreciationAndAmortization', 'DepreciationAmortizationAndAccretionNet'],
  depreciationOnly: ['Depreciation'],
  amortization: ['AmortizationOfIntangibleAssets'],
  operatingCashFlow: ['NetCashProvidedByUsedInOperatingActivities'],
  capex: ['PaymentsToAcquirePropertyPlantAndEquipment', 'PaymentsToAcquireProductiveAssets', 'PaymentsToAcquireOtherPropertyPlantAndEquipment'],
  eps: ['EarningsPerShareDiluted'],
  dividendPerShare: ['CommonStockDividendsPerShareDeclared', 'CommonStockDividendsPerShareCashPaid'],
  dilutedShares: ['WeightedAverageNumberOfDilutedSharesOutstanding'],
};

const INSTANT = {
  totalAssets: ['Assets'],
  totalLiabilities: ['Liabilities'],
  liabilitiesAndEquity: ['LiabilitiesAndStockholdersEquity'],
  equityInclMinority: ['StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'],
  totalEquity: ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'],
  currentAssets: ['AssetsCurrent'],
  currentLiabilities: ['LiabilitiesCurrent'],
  cashAndEquivalents: ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents'],
  longTermDebt: ['LongTermDebtNoncurrent', 'LongTermDebtAndCapitalLeaseObligations'],
  // Total long-term debt including the current portion.
  longTermDebtTotal: ['LongTermDebt'],
  longTermDebtCurrent: ['LongTermDebtCurrent'],
  debtCurrent: ['DebtCurrent', 'LongTermDebtAndCapitalLeaseObligationsCurrent', 'LongTermDebtCurrent'],
  shortTermBorrowings: ['ShortTermBorrowings'],
  commercialPaper: ['CommercialPaper'],
  inventory: ['InventoryNet'],
  tradeReceivables: ['AccountsReceivableNetCurrent', 'ReceivablesNetCurrent'],
  retainedEarnings: ['RetainedEarningsAccumulatedDeficit'],
};

const DAY = 86_400_000;
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);
const isYear = f => f.start && days(f.start, f.end) >= 350 && days(f.start, f.end) <= 380;
const near = (a, b, tol = 10) => Math.abs(days(a, b)) <= tol;

function factsFor(companyFacts, ns, tag) {
  const out = [];
  for (const cf of companyFacts) {
    const units = cf.facts[ns]?.[tag]?.units;
    if (!units) continue;
    for (const arr of Object.values(units)) for (const f of arr) out.push({ ...f, tag, cik: cf.cik });
  }
  return out;
}

/** Latest-filed value per (start, end) — later filings restate earlier ones. */
function dedupe(facts) {
  const best = new Map();
  for (const f of facts) {
    const key = `${f.start ?? ''}|${f.end}`;
    const cur = best.get(key);
    if (!cur || f.filed > cur.filed) best.set(key, f);
  }
  return [...best.values()];
}

function chainFacts(companyFacts, tags) {
  // Per period, the first tag in the chain that reports it wins.
  const byKey = new Map();
  for (const tag of tags) {
    for (const f of dedupe(factsFor(companyFacts, 'us-gaap', tag))) {
      const key = `${f.start ?? ''}|${f.end}`;
      if (!byKey.has(key)) byKey.set(key, f);
    }
  }
  return [...byKey.values()];
}

/** Fiscal-year values keyed by fiscal year end date. */
function annualFlows(facts) {
  const m = new Map();
  for (const f of facts.filter(isYear)) {
    const cur = m.get(f.end);
    if (!cur || f.filed > cur.filed) m.set(f.end, f);
  }
  return m;
}

/**
 * Trailing twelve months: last fiscal year + current year-to-date − prior
 * year-to-date. Falls back to the last fiscal year when quarters are missing.
 */
function ttm(facts) {
  const years = annualFlows(facts);
  if (!facts.length) return null;
  const latestEnd = facts.reduce((a, f) => (f.end > a ? f.end : a), '');
  const fy = years.get(latestEnd);
  if (fy) return { value: fy.val, end: latestEnd, basis: 'FY', sources: [fy] };

  // Longest duration ending at latestEnd = fiscal year-to-date.
  const ytd = facts
    .filter(f => f.start && f.end === latestEnd)
    .sort((a, b) => days(b.start, b.end) - days(a.start, a.end))[0];
  const lastFyEnd = [...years.keys()].filter(e => e < latestEnd).sort().pop();
  if (!ytd || !lastFyEnd || !near(lastFyEnd, ytd.start, 7)) {
    if (!lastFyEnd) return null;
    const f = years.get(lastFyEnd);
    return { value: f.val, end: lastFyEnd, basis: 'FY', sources: [f] };
  }
  const len = days(ytd.start, ytd.end);
  const prior = facts.find(f => f.start && near(f.end, new Date(Date.parse(latestEnd) - 365 * DAY).toISOString().slice(0, 10), 10) && Math.abs(days(f.start, f.end) - len) <= 10);
  const fy0 = years.get(lastFyEnd);
  if (!prior) return { value: fy0.val, end: lastFyEnd, basis: 'FY', sources: [fy0] };
  return { value: fy0.val + ytd.val - prior.val, end: latestEnd, basis: 'TTM', sources: [fy0, ytd, prior] };
}

function latestInstant(facts, onOrBefore) {
  const cands = facts.filter(f => !f.start && (!onOrBefore || f.end <= onOrBefore));
  return cands.sort((a, b) => (a.end === b.end ? a.filed.localeCompare(b.filed) : a.end.localeCompare(b.end))).pop() ?? null;
}

function instantAt(facts, end) {
  return facts.filter(f => !f.start && near(f.end, end, 5)).sort((a, b) => a.filed.localeCompare(b.filed)).pop() ?? null;
}

const SPLIT_FACTORS = [2, 3, 4, 5, 8, 10, 15, 20, 25, 40, 50];

/**
 * Older 10-K figures can predate a stock split. Detect jumps in the diluted
 * share count that match a common split ratio and restate earlier EPS and
 * share counts on the post-split basis.
 */
function splitAdjust(rows) {
  for (let i = rows.length - 1; i > 0; i--) {
    const cur = rows[i].dilutedShares, prev = rows[i - 1].dilutedShares;
    if (!cur || !prev) continue;
    const r = cur / prev;
    const k = SPLIT_FACTORS.find(f => Math.abs(r / f - 1) < 0.08);
    if (!k) continue;
    for (let j = i - 1; j >= 0; j--) {
      if (rows[j].dilutedShares) rows[j].dilutedShares *= k;
      if (rows[j].eps != null) rows[j].eps /= k;
      if (rows[j].dividendPerShare != null) rows[j].dividendPerShare /= k;
      rows[j].splitAdjusted = (rows[j].splitAdjusted ?? 1) * k;
    }
  }
  return rows;
}

const round = (v, d = 4) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d);

function filingUrl(f) {
  return `https://www.sec.gov/Archives/edgar/data/${f.cik}/${f.accn.replace(/-/g, '')}/`;
}

export function buildCompany(company, companyFacts) {
  const flows = Object.fromEntries(Object.entries(FLOW).map(([k, tags]) => [k, chainFacts(companyFacts, tags)]));
  const inst = Object.fromEntries(Object.entries(INSTANT).map(([k, tags]) => [k, chainFacts(companyFacts, tags)]));
  const sources = {};

  // ── Snapshot: TTM flows + latest balance sheet ───────────────────────────
  const t = {};
  for (const k of Object.keys(FLOW)) {
    const r = ttm(flows[k]);
    if (r) { t[k] = r; sources[k] = { tag: r.sources[0].tag, basis: r.basis, end: r.end, form: r.sources.at(-1).form, filed: r.sources.at(-1).filed }; }
  }
  const bsDate = latestInstant(inst.totalAssets)?.end;
  const b = {};
  for (const k of Object.keys(INSTANT)) {
    const f = bsDate ? instantAt(inst[k], bsDate) : null;
    if (f) { b[k] = f.val; sources[k] = { tag: f.tag, basis: 'instant', end: f.end, form: f.form, filed: f.filed }; }
  }

  const val = k => t[k]?.value ?? null;
  // Mixing periods would give wrong ratios; only use TTM items ending at the
  // same date as revenue (a tag the company stopped using is left out).
  const revEnd = t.revenue?.end;
  for (const k of Object.keys(t)) {
    if (k !== 'revenue' && revEnd && t[k].end !== revEnd) { delete t[k]; delete sources[k]; }
  }
  if (b.longTermDebt == null && b.longTermDebtTotal != null) {
    b.longTermDebt = b.longTermDebtTotal - (b.longTermDebtCurrent ?? 0);
    sources.longTermDebt = { ...sources.longTermDebtTotal, tag: 'LongTermDebt − LongTermDebtCurrent' };
  }

  const liabilities = b.totalLiabilities ?? (b.liabilitiesAndEquity != null && (b.equityInclMinority ?? b.totalEquity) != null
    ? b.liabilitiesAndEquity - (b.equityInclMinority ?? b.totalEquity) : null);
  if (b.totalLiabilities == null && liabilities != null) sources.totalLiabilities = { tag: 'LiabilitiesAndStockholdersEquity − equity', basis: 'instant', end: bsDate };

  const currentDebt = b.debtCurrent != null
    ? b.debtCurrent + (sources.debtCurrent?.tag === 'DebtCurrent' ? 0 : (b.shortTermBorrowings ?? 0) + (b.commercialPaper ?? 0))
    : (b.shortTermBorrowings ?? 0) + (b.commercialPaper ?? 0);
  const totalDebt = b.longTermDebt != null || currentDebt ? (b.longTermDebt ?? 0) + currentDebt : null;

  const dep = val('depreciation') ?? (val('depreciationOnly') != null ? val('depreciationOnly') + (val('amortization') ?? 0) : null);
  const interest = val('interestExpense') != null ? Math.abs(val('interestExpense')) : null;
  // EBIT: operating income; else pre-tax income + interest; else pre-tax
  // income alone (slightly understates EBIT when interest isn't reported).
  const ebit = val('operatingIncome')
    ?? (val('pretaxIncome') != null ? val('pretaxIncome') + (interest ?? 0) : null);
  sources.ebit = val('operatingIncome') != null ? { ...sources.operatingIncome }
    : val('pretaxIncome') != null ? { ...sources.pretaxIncome, tag: interest != null ? 'pre-tax income + interest expense' : 'pre-tax income (interest not reported)' } : undefined;
  if (!sources.ebit) delete sources.ebit;
  const taxRate = val('pretaxIncome') > 0 && val('incomeTax') != null ? Math.min(Math.max(val('incomeTax') / val('pretaxIncome'), 0), 0.5) : null;

  // Shares: cover-page count when the company reports one total (dual-class
  // companies don't), else the diluted weighted average for the period.
  const deiShares = latestInstant(factsFor(companyFacts, 'dei', 'EntityCommonStockSharesOutstanding'));
  const sharesFromCover = deiShares && bsDate && days(bsDate, deiShares.end) >= -30 && days(bsDate, deiShares.end) <= 200;
  const latestDiluted = flows.dilutedShares.filter(f => f.end === revEnd).sort((a, b) => days(a.start, a.end) - days(b.start, b.end))[0];
  const shares = sharesFromCover ? deiShares.val : latestDiluted?.val ?? null;
  if (shares != null) sources.sharesOutstanding = sharesFromCover
    ? { tag: 'dei:EntityCommonStockSharesOutstanding', basis: 'instant', end: deiShares.end, form: deiShares.form, filed: deiShares.filed }
    : { tag: 'WeightedAverageNumberOfDilutedSharesOutstanding', basis: 'period', end: latestDiluted.end, form: latestDiluted.form, filed: latestDiluted.filed };

  const ocf = val('operatingCashFlow');
  const capex = val('capex');
  const snapshot = {
    eps: round(val('eps')),
    sharesOutstanding: shares,
    bookValuePerShare: b.totalEquity != null && shares ? round(b.totalEquity / shares) : null,
    revenuePerShare: val('revenue') != null && shares ? round(val('revenue') / shares) : null,
    annualDividendPerShare: round(val('dividendPerShare')) ?? 0,
    totalRevenue: val('revenue'),
    costOfRevenue: val('costOfRevenue'),
    grossProfit: val('grossProfit'),
    operatingIncome: val('operatingIncome'),
    ebit,
    ebitda: ebit != null && dep != null ? ebit + dep : null,
    interestExpense: interest,
    netIncome: val('netIncome'),
    taxRate: round(taxRate),
    operatingCashFlow: ocf,
    freeCashFlow: ocf != null && capex != null ? ocf - Math.abs(capex) : null,
    totalAssets: b.totalAssets ?? null,
    totalLiabilities: liabilities,
    totalEquity: b.totalEquity ?? null,
    currentAssets: b.currentAssets ?? null,
    currentLiabilities: b.currentLiabilities ?? null,
    totalDebt,
    longTermDebt: b.longTermDebt ?? null,
    cashAndEquivalents: b.cashAndEquivalents ?? null,
    inventory: b.inventory ?? null,
    tradeReceivables: b.tradeReceivables ?? null,
    retainedEarnings: b.retainedEarnings ?? null,
  };
  // Sources keyed by snapshot field, with a description for derived values.
  const from = (k, tag) => (sources[k] ? { ...sources[k], tag } : undefined);
  const named = {
    totalRevenue: sources.revenue,
    annualDividendPerShare: sources.dividendPerShare ?? { tag: 'none reported, assumed 0' },
    ebitda: snapshot.ebitda != null ? from('depreciation', `EBIT + ${sources.depreciation?.tag ?? 'Depreciation + AmortizationOfIntangibleAssets'}`) ?? from('revenue', 'EBIT + depreciation & amortization') : undefined,
    freeCashFlow: snapshot.freeCashFlow != null ? from('capex', `operating cash flow − ${sources.capex?.tag}`) : undefined,
    taxRate: snapshot.taxRate != null ? from('incomeTax', 'IncomeTaxExpenseBenefit ÷ pre-tax income') : undefined,
    totalDebt: totalDebt != null ? from('longTermDebt', `long-term debt + ${sources.debtCurrent?.tag ?? 'short-term borrowings'}`) ?? { tag: 'current debt', basis: 'instant', end: bsDate } : undefined,
    bookValuePerShare: snapshot.bookValuePerShare != null ? { tag: 'equity ÷ shares outstanding' } : undefined,
    revenuePerShare: snapshot.revenuePerShare != null ? { tag: 'revenue ÷ shares outstanding' } : undefined,
  };
  for (const [k, v] of Object.entries(named)) if (v) sources[k] = v; else delete sources[k];
  for (const k of ['revenue', 'dividendPerShare', 'depreciation', 'depreciationOnly', 'amortization', 'capex', 'incomeTax', 'pretaxIncome', 'dilutedShares', 'liabilitiesAndEquity', 'equityInclMinority', 'debtCurrent', 'shortTermBorrowings', 'commercialPaper', 'longTermDebtTotal', 'longTermDebtCurrent']) delete sources[k];

  // ── Annual history (last 5 fiscal years) for trends and Piotroski ────────
  const annual = Object.fromEntries(Object.keys(FLOW).map(k => [k, annualFlows(flows[k])]));
  const fyEnds = [...annual.revenue.keys()].sort().slice(-5);
  const rows = fyEnds.map(end => {
    const a = k => annual[k].get(end)?.val ?? null;
    const at = k => instantAt(inst[k], end)?.val ?? null;
    const ocfY = a('operatingCashFlow'), capexY = a('capex');
    const liab = at('totalLiabilities') ?? (at('liabilitiesAndEquity') != null && (at('equityInclMinority') ?? at('totalEquity')) != null
      ? at('liabilitiesAndEquity') - (at('equityInclMinority') ?? at('totalEquity')) : null);
    // 52/53-week years can end in the first days of January; label those as
    // the year they mostly cover (J&J's fiscal 2022 ended 1 Jan 2023).
    const endDate = new Date(end);
    const fiscalYear = endDate.getUTCMonth() === 0 && endDate.getUTCDate() <= 7 ? endDate.getUTCFullYear() - 1 : endDate.getUTCFullYear();
    return {
      fiscalYear,
      fiscalYearEnd: end,
      revenue: a('revenue'),
      costOfRevenue: a('costOfRevenue') ?? (a('grossProfit') != null && a('revenue') != null ? a('revenue') - a('grossProfit') : null),
      operatingIncome: a('operatingIncome'),
      netIncome: a('netIncome'),
      eps: a('eps'),
      dividendPerShare: a('dividendPerShare'),
      freeCashFlow: ocfY != null && capexY != null ? ocfY - Math.abs(capexY) : null,
      operatingCashFlow: ocfY,
      dilutedShares: a('dilutedShares'),
      totalAssets: at('totalAssets'),
      totalLiabilities: liab,
      longTermDebt: at('longTermDebt'),
      currentAssets: at('currentAssets'),
      currentLiabilities: at('currentLiabilities'),
    };
  });
  splitAdjust(rows);
  for (const r of rows) for (const k of ['eps', 'dividendPerShare']) r[k] = round(r[k]);

  // Latest filing used for the snapshot (for the "as of" line and link).
  const used = Object.values(sources).filter(s => s.filed);
  const latest = [t.revenue?.sources.at(-1), latestInstant(inst.totalAssets)].filter(Boolean).sort((a, b) => a.filed.localeCompare(b.filed)).pop();

  const missing = Object.entries(snapshot).filter(([, v]) => v == null).map(([k]) => k);
  return {
    ticker: company.ticker,
    name: company.name,
    legalName: companyFacts[0].entityName,
    sector: company.sector,
    cik: companyFacts[0].cik,
    currency: 'USD',
    asOf: {
      periodEnd: revEnd ?? bsDate,
      basis: t.revenue?.basis ?? null,
      balanceSheetDate: bsDate,
      form: latest?.form ?? null,
      filed: latest?.filed ?? null,
      url: latest ? filingUrl(latest) : null,
      lastFiled: used.map(s => s.filed).sort().pop() ?? null,
    },
    snapshot,
    annual: rows,
    sources,
    missing,
    fetchedAt: new Date().toISOString(),
  };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function loadFacts(cik, cacheDir, userAgent) {
  if (cacheDir) return JSON.parse(fs.readFileSync(path.join(cacheDir, `cf_${cik}.json`), 'utf8'));
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${String(cik).padStart(10, '0')}.json`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': userAgent, 'Accept-Encoding': 'gzip, deflate' } });
    if (res.ok) return res.json();
    if (attempt >= 3) throw new Error(`${url}: HTTP ${res.status}`);
    await sleep(2000 * attempt);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const cacheDir = args.includes('--cache') ? args[args.indexOf('--cache') + 1] : null;
  const email = process.env.SEC_CONTACT_EMAIL;
  if (!cacheDir && !email) {
    console.error('Set SEC_CONTACT_EMAIL (SEC requires a contact in the User-Agent).');
    process.exit(1);
  }
  // SEC rejects User-Agents containing a URL; keep it to a name and an email.
  const userAgent = `fundamental-analysis demo ${email ?? ''}`.trim();

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const index = [];
  const failures = [];
  for (const c of COMPANIES) {
    try {
      const facts = [];
      for (const cik of c.ciks) {
        facts.push(await loadFacts(cik, cacheDir, userAgent));
        if (!cacheDir) await sleep(150); // well under 10 requests/second
      }
      const data = buildCompany(c, facts);
      const file = path.join(OUT_DIR, `${c.ticker}.json`);
      // Keep the file unchanged when only fetchedAt would differ, so the
      // nightly job commits only real data changes.
      const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
      if (prev) { const { fetchedAt: _a, ...p } = prev; const { fetchedAt: _b, ...n } = data; if (JSON.stringify(p) === JSON.stringify(n)) data.fetchedAt = prev.fetchedAt; }
      fs.writeFileSync(file, JSON.stringify(data, null, 1) + '\n');
      index.push({ ticker: c.ticker, name: c.name, sector: c.sector, periodEnd: data.asOf.periodEnd, filed: data.asOf.filed });
      console.log(`${c.ticker.padEnd(5)} ${data.asOf.basis ?? '-'} ${data.asOf.periodEnd}  missing: ${data.missing.join(', ') || 'none'}`);
    } catch (e) {
      failures.push(c.ticker);
      console.error(`${c.ticker}: ${e.message}`);
    }
  }
  // Quality gate: a failed run keeps yesterday's files and exits non-zero.
  if (failures.length > 2) {
    console.error(`Too many failures (${failures.join(', ')}); index not updated.`);
    process.exit(1);
  }
  const indexFile = path.join(OUT_DIR, 'index.json');
  const prevIndex = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : [];
  for (const p of prevIndex) if (failures.includes(p.ticker)) index.push(p);
  const order = COMPANIES.map(c => c.ticker);
  index.sort((a, b) => order.indexOf(a.ticker) - order.indexOf(b.ticker));
  fs.writeFileSync(indexFile, JSON.stringify(index, null, 1) + '\n');
  if (failures.length) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
