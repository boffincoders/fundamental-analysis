#!/usr/bin/env node
// Builds the SVG diagrams used on the docs site into docs/public/diagrams/.
//
//   npm run build && npm run diagrams
//
// Every number shown is computed by the built package (dist/) at build time,
// using Apple's figures from the "Try it" demo data, so a diagram changes
// when the library's output does.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outDir = path.join(root, 'docs/public/diagrams');
const distEntry = path.join(root, 'dist/index.js');
if (!fs.existsSync(distEntry)) throw new Error('dist/index.js is missing. Run `npm run build` first.');
const fa = createRequire(import.meta.url)(distEntry);

// Boffin Coders brand: gold accent on near-black (boffincoders.com).
const C = {
  bg: '#0d0d0d',
  panel: '#1a1a1a',
  panelHi: '#222222',
  border: '#2a2a2a',
  text: '#ffffff',
  muted: '#a3a3a3',
  gold: '#d4a012',
  blue: '#6ea8fe',
  orange: '#fb923c',
  purple: '#c49bff',
  green: '#4ade80',
  red: '#f87171',
};
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

// Brand logo embedded as a data URI so each SVG stands alone (in a README too).
const LOGO = `data:image/png;base64,${fs.readFileSync(path.join(root, 'docs/public/brand/bc-gold-48.png')).toString('base64')}`;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Keeps runs of spaces in SVG text without relying on xml:space.
const pre = s => esc(s).replace(/ /g, ' ');
const pct = (t, total) => ((t / total) * 100).toFixed(3);
const fx = (v, d = 2) => (v == null ? 'null' : Number(v).toFixed(d));

function svgDoc({ width, height, title, desc, style = '', body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title>
<desc id="d">${esc(desc)}</desc>
<style>
${style}
@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
</style>
${body}
</svg>
`;
}

const frame = (W, H, title, sub) => `<rect width="${W}" height="${H}" rx="14" fill="${C.bg}"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="none" stroke="${C.border}"/>
<text x="20" y="40" font-family="${SANS}" font-size="20" font-weight="700" fill="${C.text}">${esc(title)}</text>
<text x="20" y="64" font-family="${SANS}" font-size="13.5" fill="${C.muted}">${esc(sub)}</text>
<text x="${W - 46}" y="38" text-anchor="end" font-family="${SANS}" font-size="12" fill="${C.muted}">fundamental-analysis · by Boffin Coders</text>
<image href="${LOGO}" x="${W - 40}" y="20" width="24" height="24"/>`;

const text = (x, y, s, { size = 12.5, color = C.muted, font = SANS, weight = 400, anchor = 'start' } = {}) =>
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}"${weight !== 400 ? ` font-weight="${weight}"` : ''}${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''} fill="${color}">${pre(s)}</text>`;

function card({ x, y, w, h, n, title, lines, color = C.gold, cls = '' }) {
  const badge = n
    ? `<circle cx="${x + 20}" cy="${y + 21}" r="10" fill="${color}"/><text x="${x + 20}" y="${y + 25}" text-anchor="middle" font-family="${SANS}" font-size="12" font-weight="700" fill="${C.bg}">${n}</text>`
    : '';
  const titleX = n ? x + 38 : x + 14;
  const body = lines
    .map((l, i) => text(x + 14, y + 58 + i * 18, l.text ?? l, { size: 11, font: MONO, color: l.color || C.text }))
    .join('');
  return `<g>
<rect${cls ? ` class="${cls}"` : ''} x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${C.panel}" stroke="${C.border}" stroke-width="1.5"/>
${badge}<text x="${titleX}" y="${y + 26}" font-family="${SANS}" font-size="13.5" font-weight="600" fill="${C.text}">${esc(title)}</text>
<line x1="${x + 12}" y1="${y + 38}" x2="${x + w - 12}" y2="${y + 38}" stroke="${C.border}"/>
${body}
</g>`;
}

const arrowHead = `<defs><marker id="head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${C.muted}"/></marker></defs>`;

/** Keyframes that light a card or arrow during the given windows of a loop. */
function highlight(windows, loop, colorFor = () => C.gold) {
  const css = [];
  for (const [cls, spans] of Object.entries(windows)) {
    const on = colorFor(cls);
    const frames = [`0% { stroke: ${C.border}; }`];
    for (const [from, to] of spans) {
      frames.push(
        `${pct(from, loop)}% { stroke: ${C.border}; }`,
        `${pct(from + 0.15, loop)}%, ${pct(to, loop)}% { stroke: ${on}; }`,
        `${pct(Math.min(to + 0.25, loop), loop)}% { stroke: ${C.border}; }`,
      );
    }
    frames.push(`100% { stroke: ${C.border}; }`);
    css.push(`@keyframes ${cls} { ${frames.join(' ')} }`, `.${cls} { animation: ${cls} ${loop}s ease-in-out infinite; }`);
  }
  return css.join('\n');
}

// ---------------------------------------------------------------------------
// Sample company: Apple from the demo data, at an illustrative $250 price
// ---------------------------------------------------------------------------

const apple = JSON.parse(fs.readFileSync(path.join(root, 'docs/src/data/demo/AAPL.json'), 'utf8'));
const PRICE = 250;
const input = Object.fromEntries(Object.entries(apple.snapshot).filter(([, v]) => v != null));
input.price = PRICE;
input.marketCap = PRICE * input.sharesOutstanding;
const result = fa.analyzeCompany(input, true);

// ---------------------------------------------------------------------------
// How it works: one analyzeCompany() call
// ---------------------------------------------------------------------------

function howItWorksSvg() {
  const W = 1000, H = 470;
  const cw = 226, gap = 16, x0 = 16;
  const cx = i => x0 + i * (cw + gap);
  const y1 = 84, h1 = 150, y2 = 290, h2 = 132, loop = 9;

  const style = highlight({
    'k-app': [[0, 1.4], [7.6, 8.6]],
    'a-1': [[1.0, 1.8]],
    'k-guard': [[1.4, 3.0]],
    'a-2': [[2.6, 3.4]],
    'k-calc': [[3.0, 4.6]],
    'a-3': [[4.2, 5.0]],
    'k-rate': [[4.6, 6.2]],
    'a-4': [[5.8, 6.6]],
    'k-out': [[6.2, 7.8]],
    'a-5': [[7.4, 8.2]],
  }, loop);

  const arrow = (cls, d) => `<path class="${cls}" d="${d}" fill="none" stroke="${C.border}" stroke-width="2" marker-end="url(#head)"/>`;
  const mid = y1 + h1 / 2;
  const arrows = [
    arrow('a-1', `M ${cx(0) + cw + 3} ${mid} H ${cx(1) - 5}`),
    arrow('a-2', `M ${cx(1) + cw + 3} ${mid} H ${cx(2) - 5}`),
    arrow('a-3', `M ${cx(2) + cw + 3} ${mid} H ${cx(3) - 5}`),
    arrow('a-4', `M ${cx(3) + cw / 2} ${y1 + h1 + 3} V ${y2 - 6}`),
    arrow('a-5', `M ${cx(1) - 3} ${y2 + h2 / 2} H ${cx(0) + cw / 2} V ${y1 + h1 + 7}`),
  ];

  const pe = result.valuation.pe, roe = result.profitability.roe;
  const cards = [
    card({ x: cx(0), y: y1, w: cw, h: h1, title: 'Your numbers', color: C.blue, cls: 'k-app', lines: [
      { text: 'analyzeCompany({', color: C.blue },
      { text: `  price: ${PRICE}, eps: ${input.eps},`, color: C.text },
      { text: '  netIncome, totalEquity,', color: C.text },
      { text: '  …any fields you have', color: C.muted },
    ] }),
    card({ x: cx(1), y: y1, w: cw, h: h1, n: 1, title: 'Check the inputs', cls: 'k-guard', lines: [
      { text: 'missing field     → null', color: C.text },
      { text: 'divide by zero    → null', color: C.text },
      { text: 'NaN / Infinity    → null', color: C.text },
      { text: 'meaningless ratio → null', color: C.muted },
    ] }),
    card({ x: cx(2), y: y1, w: cw, h: h1, n: 2, title: 'Compute the ratios', cls: 'k-calc', lines: [
      { text: 'pe  = price ÷ eps', color: C.muted },
      { text: `    = ${fx(pe.value)}`, color: C.text },
      { text: 'roe = netIncome ÷ equity', color: C.muted },
      { text: `    = ${fx(roe.value, 3)}`, color: C.text },
    ] }),
    card({ x: cx(3), y: y1, w: cw, h: h1, n: 3, title: 'Rate each one', cls: 'k-rate', lines: [
      { text: `pe  ${fx(pe.value, 1)} → ${pe.status}`, color: pe.status === 'Good' ? C.green : pe.status === 'Bad' ? C.red : C.blue },
      { text: `roe ${fx(roe.value, 2)} → ${roe.status}`, color: roe.status === 'Good' ? C.green : roe.status === 'Bad' ? C.red : C.blue },
      { text: 'generic thresholds,', color: C.muted },
      { text: 'plain-English insight', color: C.muted },
    ] }),
    card({ x: cx(1), y: y2, w: cw * 3 + gap * 2, h: h2, n: 4, title: 'A typed result, grouped into seven categories', cls: 'k-out', lines: [
      { text: 'CompanyAnalysisWithInsights', color: C.purple },
      `{ valuation: { pe: { value: ${fx(pe.value)}, status: "${pe.status}", insight: "${pe.insight.split('.')[0]}." }, … },`,
      `  profitability: { roe: { value: ${fx(roe.value, 3)}, status: "${roe.status}", … } }, liquidity, solvency, … }`,
    ] }),
  ];

  const body = `${arrowHead}
${frame(W, H, 'What happens when you call analyzeCompany()', 'Inputs are checked, ratios computed and each one rated. Anything that cannot be computed honestly comes back as null.')}
${arrows.join('\n')}
${cards.join('\n')}
${text(cx(0) + cw / 2 + 12, y2 + 30, 'returns')}
${text(cx(0) + cw / 2 + 12, y2 + 48, 'the result')}
${text(20, H - 20, `Example: Apple's SEC figures with an illustrative $${PRICE} share price. Pass false (the default) to get plain numbers instead of { value, status, insight }.`)}`;

  return svgDoc({
    width: W, height: H, style, body,
    title: 'What happens when you call analyzeCompany()',
    desc: `Your numbers go into analyzeCompany. Step 1 checks inputs: missing fields, division by zero, NaN and meaningless ratios become null. Step 2 computes ratios, for example P/E ${fx(pe.value)} and ROE ${fx(roe.value, 3)}. Step 3 rates each one against generic thresholds with a plain-English insight. Step 4 returns a typed result grouped into seven categories.`,
  });
}

// ---------------------------------------------------------------------------
// Metric map: what each analyzer returns
// ---------------------------------------------------------------------------

function metricMapSvg() {
  const W = 1000;
  const groups = [
    { title: 'Valuation', fn: 'analyzeValuation', color: C.gold, items: ['P/E · P/B · P/S', 'PEG', 'EV/EBITDA · EV/Revenue', 'EV/FCF · Price/Cash flow', 'Earnings & dividend yield', 'Graham number', 'DCF · intrinsic value'] },
    { title: 'Profitability', fn: 'analyzeProfitability', color: C.green, items: ['ROE · ROA · ROIC', 'Gross margin', 'Operating margin', 'Net margin', 'FCF margin'] },
    { title: 'Liquidity', fn: 'analyzeLiquidity', color: C.blue, items: ['Current ratio', 'Quick ratio', 'Debt / equity', 'Interest coverage'] },
    { title: 'Solvency', fn: 'analyzeSolvency', color: C.blue, items: ['Net debt · net cash', 'Net debt / EBITDA', 'Debt / assets', 'Interest coverage'] },
    { title: 'Efficiency', fn: 'analyzeEfficiency', color: C.purple, items: ['Asset turnover', 'Inventory turnover', 'Receivables turnover', 'DSO · DPO', 'Cash conversion cycle'] },
    { title: 'Risk', fn: 'analyzeRisk', color: C.orange, items: ["Altman Z · Z''", 'Piotroski F-Score', 'Sharpe ratio'] },
    { title: 'Quality', fn: 'analyzeQuality', color: C.orange, items: ['Payout ratio', 'Cash conversion', 'Analyst target upside'] },
    { title: 'Over time', fn: 'analyzeFundamentalTrends', color: C.muted, items: ['YoY / QoQ growth', 'CAGR · median growth', 'TTM · N-year sums', 'Quality / value scores'] },
  ];
  const cols = 4, gap = 14, x0 = 16, top = 84, rowH = 22;
  const colW = (W - 2 * x0 - (cols - 1) * gap) / cols;
  const panelH = 58 + 7 * rowH + 6;
  const H = top + 2 * panelH + gap + 96;

  const panels = groups.map((g, i) => {
    const x = x0 + (i % cols) * (colW + gap);
    const y = top + Math.floor(i / cols) * (panelH + gap);
    return `<rect x="${x}" y="${y}" width="${colW}" height="${panelH}" rx="10" fill="${C.panel}" stroke="${C.border}" stroke-width="1.5"/>
<rect x="${x}" y="${y}" width="${colW}" height="4" rx="2" fill="${g.color}"/>
${text(x + 14, y + 30, g.title, { size: 15, weight: 700, color: g.color })}
${text(x + 14, y + 48, `${g.fn}()`, { size: 11, font: MONO })}
${g.items.map((it, j) => text(x + 14, y + 74 + j * rowH, it, { size: 12.5, color: C.text })).join('\n')}`;
  });

  const by = top + 2 * panelH + gap + 16;
  const code = `<rect x="${x0}" y="${by}" width="${W - 2 * x0}" height="62" rx="10" fill="${C.panelHi}" stroke="${C.border}"/>
${text(x0 + 16, by + 24, 'One call runs all seven snapshot analyzers', { weight: 600 })}
<text x="${x0 + 16}" y="${by + 46}" font-family="${MONO}" font-size="13" fill="${C.text}"><tspan fill="${C.purple}">const</tspan> r = <tspan fill="${C.blue}">analyzeCompany</tspan>(data, <tspan fill="${C.orange}">true</tspan>);  <tspan fill="${C.muted}">// r.valuation.pe, r.risk.piotroski, …  or call any single ratio function directly</tspan></text>`;

  const body = `${frame(W, H, 'Every metric, grouped the way analysts read them', 'Each analyzer returns plain numbers, or { value, status, insight } with insights on. Every metric has its own page.')}
${panels.join('\n')}
${code}`;

  return svgDoc({
    width: W, height: H, body,
    title: 'Every metric, grouped the way analysts read them',
    desc: groups.map(g => `${g.title} (${g.fn}): ${g.items.join(', ')}`).join('. ') + '.',
  });
}

// ---------------------------------------------------------------------------
// Null safety: plain arithmetic vs the package
// ---------------------------------------------------------------------------

function nullSafetySvg() {
  const W = 1000;
  const rows = [
    {
      what: 'EPS is zero',
      naive: '250 / 0', naiveOut: String(250 / 0), naiveNote: 'breaks sorting and averages',
      call: 'pe(250, 0)', out: fa.pe(250, 0),
    },
    {
      what: 'Earnings expected to shrink',
      naive: '30 / (-0.05 * 100)', naiveOut: String(30 / (-0.05 * 100)), naiveNote: 'a negative PEG looks "cheap"',
      call: 'peg(30, -0.05)', out: fa.peg(30, -0.05),
    },
    {
      what: 'Loss on negative equity',
      naive: '-2 / -10', naiveOut: String(-2 / -10), naiveNote: 'reads as a healthy 20% ROE',
      call: 'roe(-2, -10)', out: fa.roe(-2, -10),
    },
    {
      what: 'Net debt, but EBITDA negative',
      naive: '(100 - 10) / -20', naiveOut: String((100 - 10) / -20), naiveNote: 'looks like a net-cash company',
      call: 'netDebtToEbitda(100, 10, -20)', out: fa.netDebtToEbitda(100, 10, -20),
    },
    {
      what: 'Growth typed as 15 for 15%',
      naive: '30 / (15 * 100)', naiveOut: String(30 / (15 * 100)), naiveNote: '100× too small',
      call: 'peg(30, 0.15)', out: fa.peg(30, 0.15), note: 'rates are decimals',
    },
  ];
  const x0 = 16, top = 84, rowH = 62, headH = 40;
  const colA = 230, colB = 350, colC = W - 2 * x0 - colA - colB;
  const H = top + headH + rows.length * rowH + 64;

  const header = `<rect x="${x0}" y="${top}" width="${W - 2 * x0}" height="${headH}" rx="10" fill="${C.panelHi}" stroke="${C.border}"/>
${text(x0 + 16, top + 25, 'Situation', { weight: 600, color: C.text })}
${text(x0 + colA + 16, top + 25, 'Plain arithmetic', { weight: 600, color: C.red })}
${text(x0 + colA + colB + 16, top + 25, 'fundamental-analysis', { weight: 600, color: C.gold })}`;

  const body = rows.map((r, i) => {
    const y = top + headH + i * rowH;
    const out = r.out === null ? 'null' : fx(r.out, 2).replace(/\.00$/, '');
    return `<rect x="${x0}" y="${y + 6}" width="${W - 2 * x0}" height="${rowH - 6}" rx="8" fill="${C.panel}" stroke="${C.border}"/>
${text(x0 + 16, y + 39, r.what, { size: 13.5, color: C.text, weight: 600 })}
${text(x0 + colA + 16, y + 30, `${r.naive}  →  ${r.naiveOut}`, { size: 12.5, font: MONO, color: C.text })}
${text(x0 + colA + 16, y + 50, r.naiveNote, { size: 12, color: C.red })}
${text(x0 + colA + colB + 16, y + 30, `${r.call}  →  ${out}`, { size: 12.5, font: MONO, color: C.text })}
${text(x0 + colA + colB + 16, y + 50, r.note ?? (r.out === null ? 'not meaningful, so null' : ''), { size: 12, color: C.gold })}`;
  }).join('\n');

  const doc = `${frame(W, H, 'Ratios return null, not a misleading number', 'Ratios that cannot be computed honestly return null, so a screener can skip them instead of ranking garbage.')}
${header}
${body}
${text(20, H - 22, 'Check for null before you sort, average or display. With insights on, each null comes with a status of N/A and a reason.')}`;

  return svgDoc({
    width: W, height: H, body: doc,
    title: 'Ratios return null, not a misleading number',
    desc: rows.map(r => `${r.what}: plain arithmetic ${r.naive} gives ${r.naiveOut} (${r.naiveNote}); ${r.call} returns ${r.out === null ? 'null' : r.out}.`).join(' '),
  });
}

// ---------------------------------------------------------------------------
// Verdict: how the Try pages combine four rule sets
// ---------------------------------------------------------------------------

function verdictSvg() {
  const W = 1000, H = 450;
  const x0 = 16, top = 84, cw = 222, ch = 112, gap = 34;
  const colX = i => x0 + i * (cw + gap);
  const lens = (i, row, title, source, lines, color) => card({
    x: colX(i), y: top + row * (ch + gap), w: cw, h: ch, title, color,
    lines: [{ text: source, color: C.muted }, ...lines],
  });
  const lenses = [
    lens(0, 0, 'Piotroski F-Score', '2000 paper', [{ text: '9 yes/no signals', color: C.text }, { text: '7–9 strong · 0–2 weak', color: C.text }]),
    lens(1, 0, "Altman Z''", '1968 / 1995', [{ text: 'distress-risk score', color: C.text }, { text: '>2.6 safe · <1.1 distress', color: C.text }]),
    lens(0, 1, 'Graham price tests', 'Intelligent Investor', [{ text: 'P/E ≤ 15 and', color: C.text }, { text: 'P/B ≤ 1.5 or P/E×P/B ≤ 22.5', color: C.text }]),
    lens(1, 1, 'Lynch PEG rule', 'One Up on Wall Street', [{ text: 'PEG ≤ 1 within the rule', color: C.text }, { text: 'PEG ≥ 2 well above it', color: C.text }]),
  ];
  const outX = colX(2) + 20, outW = W - x0 - outX;
  const half = (i, title, labels, color) => {
    const y = top + i * (ch + gap);
    return `<rect x="${outX}" y="${y}" width="${outW}" height="${ch}" rx="10" fill="${C.panel}" stroke="${color}" stroke-width="1.5"/>
${text(outX + 16, y + 28, title, { size: 15, weight: 700, color })}
${labels.map((l, j) => text(outX + 16, y + 56 + j * 20, l, { size: 12.5, color: C.text })).join('\n')}`;
  };
  // Each row: two rule sets combine into one half of the verdict.
  const arrows = [0, 1].map(i => {
    const y = top + i * (ch + gap) + ch / 2;
    return `${text(colX(0) + cw + gap / 2, y + 6, '+', { size: 18, weight: 700, color: C.muted, anchor: 'middle' })}
<path d="M ${colX(1) + cw + 3} ${y} H ${outX - 6}" fill="none" stroke="${C.muted}" stroke-width="2" marker-end="url(#head)"/>`;
  });

  const body = `${arrowHead}
${frame(W, H, 'How the rule-based verdict is formed', 'Four published rule sets, applied mechanically to SEC figures. A summary of what the rules say, not a recommendation.')}
${lenses.join('\n')}
${arrows.join('\n')}
${half(0, 'Financial health', ['Both strong → strong', 'Either weak → weak', 'Otherwise → mixed'], C.green)}
${half(1, 'Price vs classic limits', ['Graham passes or PEG ≤ 1 → within', 'PEG ≥ 2 → well above', 'Needs a share price you enter'], C.orange)}
<rect x="${x0}" y="${H - 72}" width="${W - 2 * x0}" height="52" rx="10" fill="${C.panelHi}" stroke="${C.border}"/>
${text(x0 + 16, H - 41, 'Not financial advice. The rules ignore the business, sector norms and your circumstances, and were written for other times and markets.', { size: 12.5, color: C.text })}`;

  return svgDoc({
    width: W, height: H, body,
    title: 'How the rule-based verdict is formed',
    desc: "Piotroski's F-Score and Altman's Z'' combine into financial health: both strong reads strong, either weak reads weak, otherwise mixed. Graham's price tests and Lynch's PEG rule combine into price versus classic limits once a share price is entered. Not financial advice.",
  });
}

// ---------------------------------------------------------------------------

fs.mkdirSync(outDir, { recursive: true });
const files = {
  'how-it-works.svg': howItWorksSvg(),
  'metric-map.svg': metricMapSvg(),
  'null-safety.svg': nullSafetySvg(),
  'verdict.svg': verdictSvg(),
};
for (const [name, svg] of Object.entries(files)) {
  fs.writeFileSync(path.join(outDir, name), svg);
  console.log(`docs/public/diagrams/${name}  ${(Buffer.byteLength(svg) / 1024).toFixed(1)} kB`);
}
