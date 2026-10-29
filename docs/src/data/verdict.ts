// Rule-based verdict for the "Try it" demo: published rules of thumb applied
// mechanically to reported figures. Shared by the page and the build-time
// prerender, so it must not import anything browser- or Vite-specific.
import { altmanZScoreDoublePrime, piotroski, type CompanySnapshotInput, type PiotroskiResult } from 'fundamental-analysis';
import type { DemoYear } from './demo-types';

export const DISCLAIMER =
  'For education and information only. This is not investment, financial, tax or legal advice, and not a recommendation ' +
  'or offer to buy, sell or hold any security. The verdict is generated automatically by applying published rules of thumb ' +
  'from Benjamin Graham, Peter Lynch, Joseph Piotroski and Edward Altman to figures taken from SEC filings. It does not ' +
  'consider the business itself, its management, competition, sector norms, news, future prospects or your personal ' +
  'circumstances, and these rules were written for other times and markets. Figures may be incomplete, out of date or wrong, ' +
  'and past results do not predict future returns. Boffin Coders is not a registered investment adviser or broker-dealer and ' +
  'accepts no liability for decisions made using this page. Do your own research and consider speaking to a licensed ' +
  'financial adviser before investing.';

export type Check = { label: string; pass: boolean | null; detail: string };
export type Tone = 'good' | 'neutral' | 'bad' | 'na';

export interface Lens {
  id: 'graham' | 'lynch' | 'piotroski' | 'altman';
  author: string;
  source: string;
  idea: string;
  checks: Check[];
  summary: string;
  tone: Tone;
}

export interface Verdict {
  health: { label: string; tone: Tone };
  valuation: { label: string; tone: Tone };
  headline: string;
  lenses: Lens[];
}

/** Full 9-signal Piotroski from the last two fiscal years. */
export function fullPiotroski(annual: DemoYear[]): { result: PiotroskiResult; cur: DemoYear; prev?: DemoYear } | null {
  const [prev, cur] = annual.length >= 2 ? annual.slice(-2) : [undefined, annual[annual.length - 1]];
  if (!cur || cur.netIncome == null || !cur.totalAssets || cur.operatingCashFlow == null) return null;
  const u = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? undefined : v);
  const ratio = (a: number | null, b: number | null) => (a != null && b ? a / b : undefined);
  const gm = (r?: DemoYear) => (r && r.revenue && r.costOfRevenue != null ? (r.revenue - r.costOfRevenue) / r.revenue : undefined);
  const result = piotroski({
    netIncome: cur.netIncome,
    totalAssets: cur.totalAssets,
    operatingCashFlow: cur.operatingCashFlow,
    priorNetIncome: u(prev?.netIncome),
    priorTotalAssets: u(prev?.totalAssets),
    longTermDebt: u(cur.longTermDebt),
    priorLongTermDebt: u(prev?.longTermDebt),
    currentRatioValue: ratio(cur.currentAssets, cur.currentLiabilities),
    priorCurrentRatioValue: prev ? ratio(prev.currentAssets, prev.currentLiabilities) : undefined,
    sharesOutstanding: u(cur.dilutedShares),
    priorSharesOutstanding: u(prev?.dilutedShares),
    grossMarginValue: gm(cur),
    priorGrossMarginValue: gm(prev),
    assetTurnoverValue: ratio(cur.revenue, cur.totalAssets),
    priorAssetTurnoverValue: prev ? ratio(prev.revenue, prev.totalAssets) : undefined,
  });
  return { result, cur, prev };
}

const fx = (v: number, d = 2) => v.toFixed(d);
const money = (v: number) => `$${(v / 1e9).toFixed(1)}B`;

function tally(checks: Check[]) {
  const known = checks.filter(c => c.pass !== null);
  return { passed: known.filter(c => c.pass).length, known: known.length };
}

/**
 * Benjamin Graham's seven tests for the defensive investor (The Intelligent
 * Investor, 1973 edition, ch. 14), adapted to five years of data and today's
 * dollars where noted.
 */
function grahamLens(s: CompanySnapshotInput, annual: DemoYear[], price: number | null): Lens {
  const years = annual.filter(r => r.netIncome != null);
  const eps = annual.map(r => r.eps).filter((v): v is number => v != null);
  const wc = s.currentAssets != null && s.currentLiabilities != null ? s.currentAssets - s.currentLiabilities : null;
  const pe = price && s.eps && s.eps > 0 ? price / s.eps : null;
  const pb = price && s.bookValuePerShare && s.bookValuePerShare > 0 ? price / s.bookValuePerShare : null;
  const divYears = annual.filter(r => r.dividendPerShare != null && r.dividendPerShare > 0).length;

  const checks: Check[] = [
    {
      label: 'Adequate size',
      pass: s.totalRevenue != null ? s.totalRevenue >= 2e9 : null,
      detail: `Revenue ${s.totalRevenue != null ? money(s.totalRevenue) : 'n/a'} (Graham's $100M of 1972, taken here as $2B today)`,
    },
    {
      label: 'Current ratio at least 2',
      pass: s.currentAssets != null && s.currentLiabilities ? s.currentAssets / s.currentLiabilities >= 2 : null,
      detail: s.currentAssets != null && s.currentLiabilities ? `Current ratio ${fx(s.currentAssets / s.currentLiabilities)}` : 'Current assets/liabilities not reported',
    },
    {
      label: 'Long-term debt no more than working capital',
      pass: wc != null && s.longTermDebt != null ? s.longTermDebt <= wc : null,
      detail: wc != null && s.longTermDebt != null ? `Long-term debt ${money(s.longTermDebt)} vs working capital ${money(wc)}` : 'Data not reported',
    },
    {
      label: 'Profitable every year',
      pass: years.length ? years.every(r => (r.netIncome as number) > 0) : null,
      detail: `${years.filter(r => (r.netIncome as number) > 0).length} of ${years.length} fiscal years profitable (Graham asked for 10)`,
    },
    {
      label: 'Pays a dividend every year',
      pass: annual.length ? divYears === annual.length : null,
      detail: `Dividends in ${divYears} of ${annual.length} fiscal years (Graham asked for 20)`,
    },
    {
      label: 'EPS up at least a third',
      pass: eps.length >= 3 && eps[0] > 0 ? eps[eps.length - 1] >= eps[0] * (4 / 3) : null,
      detail: eps.length >= 3 ? `EPS $${fx(eps[0])} → $${fx(eps[eps.length - 1])} over ${eps.length - 1} years (Graham: over 10)` : 'Not enough EPS history',
    },
    {
      label: 'P/E no more than 15',
      pass: pe != null ? pe <= 15 : price && s.eps != null && s.eps <= 0 ? false : null,
      detail: pe != null ? `P/E ${fx(pe, 1)}` : price ? 'Losses: no meaningful P/E' : 'Needs a share price',
    },
    {
      label: 'P/B no more than 1.5, or P/E × P/B no more than 22.5',
      pass: pe != null && pb != null ? pb <= 1.5 || pe * pb <= 22.5 : price && pe == null ? false : null,
      detail: pe != null && pb != null ? `P/B ${fx(pb, 1)}, P/E × P/B ${fx(pe * pb, 1)}` : price ? 'Not meaningful (losses or negative book value)' : 'Needs a share price',
    },
  ];
  const { passed, known } = tally(checks);
  return {
    id: 'graham',
    author: 'Benjamin Graham',
    source: 'The Intelligent Investor (1949; revised 1973), chapter 14',
    idea: 'A defensive investor should buy only large, financially strong, consistently profitable dividend payers at a moderate price.',
    checks,
    summary: `${passed} of ${known} tests passed${known < checks.length ? ` (${checks.length - known} need more data or a price)` : ''}`,
    tone: known === 0 ? 'na' : passed === known ? 'good' : passed >= known * 0.6 ? 'neutral' : 'bad',
  };
}

/**
 * Peter Lynch's rule of thumb (One Up on Wall Street, 1989): a fairly priced
 * company's P/E is about equal to its growth rate in percent.
 */
function lynchLens(s: CompanySnapshotInput, price: number | null, growth: number | null): Lens {
  const pe = price && s.eps && s.eps > 0 ? price / s.eps : null;
  const peg = pe != null && growth != null && growth > 0 ? pe / (growth * 100) : null;
  const de = s.totalDebt != null && s.totalEquity && s.totalEquity > 0 ? s.totalDebt / s.totalEquity : null;
  const checks: Check[] = [
    {
      label: 'P/E no higher than the growth rate (PEG ≤ 1)',
      pass: peg != null ? peg <= 1 : null,
      detail: peg != null ? `PEG ${fx(peg)} (P/E ${fx(pe as number, 1)} ÷ growth ${fx((growth as number) * 100, 1)}%)` : !price ? 'Needs a share price' : 'Not meaningful (losses or no growth)',
    },
    {
      // Lynch favoured strong balance sheets; the cut-off of 1 is ours, not his.
      label: 'Strong balance sheet (debt / equity below 1, our cut-off)',
      pass: de != null ? de < 1 : null,
      detail: de != null ? `Debt / equity ${fx(de)}` : 'Not meaningful (negative or missing equity)',
    },
  ];
  const tone: Tone = peg == null ? 'na' : peg <= 1 ? 'good' : peg < 2 ? 'neutral' : 'bad';
  return {
    id: 'lynch',
    author: 'Peter Lynch',
    source: 'One Up on Wall Street (1989)',
    idea: 'A fairly priced stock has a P/E about equal to its earnings growth rate; half that is very attractive, twice that is very unattractive.',
    checks,
    summary: peg == null ? (!price ? 'Enter a price to apply the PEG rule' : 'PEG rule does not apply') : peg <= 0.5 ? 'PEG under 0.5: well within the rule' : peg <= 1 ? 'PEG of 1 or less: within the rule' : peg < 2 ? 'PEG between 1 and 2: above the rule' : 'PEG of 2 or more: well above the rule',
    tone,
  };
}

/** Joseph Piotroski's F-Score (2000): nine yes/no accounting signals. */
function piotroskiLens(annual: DemoYear[]): Lens {
  const p = fullPiotroski(annual);
  const names: Record<string, string> = {
    f1_positiveROA: 'Profitable (positive return on assets)',
    f2_positiveCFO: 'Positive operating cash flow',
    f3_improvingROA: 'Return on assets improved',
    f4_accrualQuality: 'Cash flow exceeds net income',
    f5_fallingLeverage: 'Long-term debt ratio fell',
    f6_improvingLiquidity: 'Current ratio improved',
    f7_noDilution: 'No new shares issued',
    f8_improvingGrossMargin: 'Gross margin improved',
    f9_improvingAssetTurnover: 'Asset turnover improved',
  };
  const checks: Check[] = p
    ? Object.entries(p.result.signals).map(([k, v]) => ({ label: names[k] ?? k, pass: v, detail: v === null ? 'Data not reported' : '' }))
    : [];
  const score = p?.result.score ?? null, max = p?.result.maxScore ?? 0;
  const share = score != null && max ? score / max : null;
  return {
    id: 'piotroski',
    author: 'Joseph Piotroski',
    source: '“Value Investing: The Use of Historical Financial Statement Information to Separate Winners from Losers” (2000)',
    idea: 'Nine simple accounting signals separate improving, financially strong companies (8–9) from weak ones (0–2).',
    checks,
    summary: share == null ? 'Not enough data' : `F-Score ${score} of ${max}${p ? ` (FY${p.cur.fiscalYear}${p.prev ? ` vs FY${p.prev.fiscalYear}` : ''})` : ''}`,
    tone: share == null ? 'na' : share >= 7 / 9 ? 'good' : share >= 3 / 9 ? 'neutral' : 'bad',
  };
}

/** Edward Altman's Z'' (1995 revision of the 1968 Z-score) for non-manufacturers. */
function altmanLens(s: CompanySnapshotInput): Lens {
  const wc = s.currentAssets != null && s.currentLiabilities != null ? s.currentAssets - s.currentLiabilities : undefined;
  const z = wc != null && s.totalAssets && s.retainedEarnings != null && s.ebit != null && s.totalEquity != null && s.totalLiabilities != null
    ? altmanZScoreDoublePrime(wc, s.retainedEarnings, s.ebit, s.totalEquity, s.totalAssets, s.totalLiabilities)
    : null;
  return {
    id: 'altman',
    author: 'Edward Altman',
    source: 'Z-score (1968); Z″ version for non-manufacturers (1995)',
    idea: 'A weighted mix of liquidity, retained earnings, operating profit and leverage that flags companies at risk of financial distress.',
    checks: [{
      label: "Z'' above 2.6 (safe zone)",
      pass: z != null ? z > 2.6 : null,
      detail: z != null ? `Z'' ${fx(z)}: ${z > 2.6 ? 'safe' : z >= 1.1 ? 'grey' : 'distress'} zone (grey 1.1–2.6, distress below 1.1)` : 'Data not reported',
    }],
    summary: z == null ? 'Not enough data' : z > 2.6 ? 'Safe zone' : z >= 1.1 ? 'Grey zone' : 'Distress zone',
    tone: z == null ? 'na' : z > 2.6 ? 'good' : z >= 1.1 ? 'neutral' : 'bad',
  };
}

/**
 * Combines the lenses into a two-part verdict: financial health (Piotroski,
 * Altman, Graham's balance-sheet tests) and price (Graham's price tests,
 * Lynch's PEG). Labels describe what the rules say, never what to do.
 */
export function buildVerdict(s: CompanySnapshotInput, annual: DemoYear[], price: number | null, growth: number | null): Verdict {
  const graham = grahamLens(s, annual, price);
  const lynch = lynchLens(s, price, growth);
  const pio = piotroskiLens(annual);
  const altman = altmanLens(s);

  const bad = [pio.tone, altman.tone].filter(t => t === 'bad').length;
  const good = [pio.tone, altman.tone].filter(t => t === 'good').length;
  const health: Verdict['health'] =
    pio.tone === 'na' && altman.tone === 'na' ? { label: 'Not enough data to assess financial health', tone: 'na' }
    : bad > 0 ? { label: 'Weak on the financial-health rules', tone: 'bad' }
    : good === 2 ? { label: 'Strong on the financial-health rules', tone: 'good' }
    : { label: 'Mixed on the financial-health rules', tone: 'neutral' };

  const losses = s.eps != null && s.eps <= 0;
  const [peCheck, pbCheck] = graham.checks.slice(-2);
  const grahamValue = peCheck.pass && pbCheck.pass;
  const valuation: Verdict['valuation'] =
    !price ? { label: 'Enter a share price to apply the price rules', tone: 'na' }
    : losses ? { label: 'Price rules don’t apply while the company is loss-making', tone: 'na' }
    : grahamValue || lynch.tone === 'good' ? { label: 'Within classic value-price limits', tone: 'good' }
    : lynch.tone === 'bad' ? { label: 'Well above classic value-price limits', tone: 'bad' }
    : { label: 'Above classic value-price limits', tone: 'neutral' };

  return {
    health,
    valuation,
    headline: valuation.tone === 'na' && !price ? health.label : `${health.label} · ${valuation.label.charAt(0).toLowerCase()}${valuation.label.slice(1)}`,
    lenses: [graham, lynch, pio, altman],
  };
}
