// Build-time SEO for the GitHub Pages SPA.
// GitHub Pages has no SPA fallback, so deep links such as /metrics/pe would 404.
// After the build this plugin writes a real index.html for every route (with
// its own title, description, canonical URL and a short static summary for
// crawlers that do not run JavaScript), plus sitemap.xml. A project page cannot
// serve robots.txt (it must live at the domain root), so submit the sitemap
// in Google Search Console instead.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { analyzeCompany } from 'fundamental-analysis';
import { metricsData } from './src/data/metrics';
import { buildVerdict, DISCLAIMER } from './src/data/verdict';
import { metricDescription, metricH1, metricTitle } from './src/data/metricSeo';
import { FAQ } from './src/data/faq';
import { CATEGORIES } from './src/data/navigation';

const SITE_URL = 'https://boffincoders.github.io/fundamental-analysis';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface Page { route: string; title: string; description: string; body: string }

function pages(): Page[] {
  const list: Page[] = [
    {
      route: 'api-docs/',
      title: 'API reference & guide — fundamental-analysis (TypeScript financial ratios)',
      description: 'Install and use fundamental-analysis: analyzeCompany, categorical analyzers, batch screening, growth trends, input conventions and every ratio function with verified examples.',
      body: '<h1>fundamental-analysis API reference</h1><p>Installation, analyzeCompany(), categorical analyzers, analyzeBatch(), analyzeFundamentalTrends(), input conventions and individual ratio functions for JavaScript and TypeScript.</p>',
    },
  ];
  for (const m of Object.values(metricsData)) {
    const description = metricDescription(m);
    list.push({
      route: `metrics/${m.id}/`,
      title: metricTitle(m),
      description,
      body: `<h1>${escapeHtml(metricH1(m))}</h1><p>${escapeHtml(m.description)}</p><p><strong>Formula:</strong> ${escapeHtml(m.formula)}</p>${m.benchmark ? `<p><strong>How to read it:</strong> ${escapeHtml(m.benchmark)}</p>` : ''}<p>${escapeHtml(m.history)}</p>`,
    });
  }
  list.push(...tryPages());
  return list;
}

const money = (v: number | null | undefined) =>
  v == null ? 'n/a' : `${v < 0 ? '−' : ''}${Math.abs(v) >= 1e12 ? `$${(Math.abs(v) / 1e12).toFixed(2)} trillion` : `$${(Math.abs(v) / 1e9).toFixed(1)} billion`}`;
const pct = (v: number | null | undefined) => (v == null ? 'n/a' : `${(v * 100).toFixed(1)}%`);
const num = (v: number | null | undefined) => (v == null ? 'n/a' : v.toFixed(2));

// "Try it" pages: one per demo company, with a static summary computed by the
// package at build time so each page has its own crawlable content.
function tryPages(): Page[] {
  const dir = fileURLToPath(new URL('./src/data/demo', import.meta.url));
  const index: { ticker: string; name: string }[] = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
  const list: Page[] = [{
    route: 'try/',
    title: 'Stock fundamental analysis of 20 US companies, live | fundamental-analysis',
    description: `Pick Apple, Microsoft, NVIDIA or ${index.length - 3} other US companies and see the open-source fundamental-analysis package compute valuation, profitability, debt and distress-risk metrics from their latest SEC filings, live in your browser.`,
    body: `<h1>Stock fundamental analysis on real companies</h1><ul>${index.map(c => `<li><a href="${SITE_URL}/try/${c.ticker}/">${escapeHtml(c.name)} (${c.ticker})</a></li>`).join('')}</ul>`,
  }];
  for (const { ticker, name } of index) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, `${ticker}.json`), 'utf8'));
    const input = Object.fromEntries(Object.entries(d.snapshot).filter(([, v]) => v != null));
    const a = analyzeCompany(input);
    const v = buildVerdict(input, d.annual, null, null);
    const lens = (id: string) => v.lenses.find(l => l.id === id)?.summary ?? 'n/a';
    const period = `${d.asOf.basis === 'TTM' ? 'the twelve months' : 'the fiscal year'} to ${d.asOf.periodEnd}`;
    list.push({
      route: `try/${ticker}/`,
      title: `${name} (${ticker}) fundamental analysis: P/E, ROE, Altman Z, Piotroski | fundamental-analysis`,
      description: `Free fundamental analysis of ${name} (${ticker}) from its latest SEC filing: valuation, profitability, debt, liquidity, Altman Z-score, Piotroski F-score and growth, computed live with the open-source fundamental-analysis package.`,
      body: `<h1>${escapeHtml(name)} (${ticker}) fundamental analysis</h1>`
        + `<p>For ${period}, ${escapeHtml(name)} reported revenue of ${money(d.snapshot.totalRevenue)} and net income of ${money(d.snapshot.netIncome)} `
        + `(net margin ${pct(a.profitability.netProfitMargin)}), diluted EPS of ${d.snapshot.eps == null ? 'n/a' : `$${d.snapshot.eps}`} and free cash flow of ${money(d.snapshot.freeCashFlow)}.</p>`
        + `<p>Return on equity ${pct(a.profitability.roe)}, operating margin ${pct(a.profitability.operatingMargin)}, current ratio ${num(a.liquidity.currentRatio)}, `
        + `debt to equity ${num(a.liquidity.debtToEquity)}, Altman Z'' ${num(a.risk.altmanZScoreDoublePrime)}.</p>`
        + `<p>Rule-based verdict (not advice): ${escapeHtml(v.health.label)}. Piotroski: ${escapeHtml(lens('piotroski'))}. Altman Z'': ${escapeHtml(lens('altman'))}. Graham defensive tests: ${escapeHtml(lens('graham'))}.</p>`
        + `<p>Source: ${d.asOf.form ?? 'SEC filing'} filed ${d.asOf.filed}. Enter a share price on the page for P/E, PEG, EV/EBITDA, intrinsic value and the price half of the verdict.</p>`
        + `<p><small>${escapeHtml(DISCLAIMER)}</small></p>`,
    });
  }
  return list;
}

// ── llms.txt / llms-full.txt (llmstxt.org) and the home FAQPage JSON-LD ────
// Generated from the README, metric data and FAQ so they never drift.

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const readme = () => fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const pkg = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as { version: string; engines?: { node?: string } };

/** The README section under `## <title>`, up to the next `## ` heading. */
function readmeSection(md: string, title: string): string {
  const start = md.indexOf(`\n## ${title}`);
  if (start < 0) return '';
  const body = md.slice(md.indexOf('\n', start + 1) + 1);
  const end = body.search(/\n## /);
  return (end < 0 ? body : body.slice(0, end)).replace(/\n---\s*$/, '').trim();
}

/** README metrics-reference tables → one line of function names per group. */
function metricsList(md: string): string {
  const ref = readmeSection(md, 'Metrics reference');
  const groups: { name: string; fns: string[] }[] = [];
  for (const line of ref.split('\n')) {
    if (line.startsWith('### ')) groups.push({ name: line.slice(4).trim(), fns: [] });
    const m = line.match(/^\| [^|`]+? \| `([a-zA-Z.]+)\(/);
    if (m && groups.length) groups[groups.length - 1].fns.push(`${m[1]}()`);
  }
  return groups.filter(g => g.fns.length).map(g => `- ${g.name}: ${g.fns.join(', ')}`).join('\n');
}

function llmsTxt(tickers: string[]): string {
  const { version, engines } = pkg();
  const md = readme();
  const metricLines = CATEGORIES.map(c => `- ${c.label}: ${c.items.map(i => i.id).join(', ')}`).join('\n');
  const calculators = ['dcf', 'intrinsic-value', 'piotroski', 'z-score', 'graham', 'peg', 'ev-ebitda']
    .map(id => metricsData[id]).filter(Boolean)
    .map(m => `[${metricH1(m).replace(/ \(.*\)/, '')}](${SITE_URL}/metrics/${m.id}/)`).join(', ');
  return `# fundamental-analysis

> Zero-dependency TypeScript/JavaScript library for financial ratio analysis: it turns income-statement, balance-sheet and cash-flow numbers into valuation, profitability, liquidity, leverage, efficiency and distress-risk metrics (P/E, PEG, EV/EBITDA, ROE, ROIC, current ratio, net debt/EBITDA, Altman Z and Z'', Piotroski F-Score, DCF, Graham number, intrinsic value), each with an optional plain-English rating. For developers building screeners, company dashboards, valuation calculators and finance apps. MIT licence, built and maintained by [Boffin Coders](https://boffincoders.com).

## Key facts

- Package: fundamental-analysis ${version} on npm (https://www.npmjs.com/package/fundamental-analysis)
- Install: npm install fundamental-analysis
- Runtime dependencies: none
- Tests: 300+ unit tests (Vitest) with fixed expected values
- Formats: CommonJS and ES modules, with TypeScript type definitions
- Runs on: Node.js ${engines?.node ?? '>=16'}, browsers and edge runtimes
- Licence: MIT
- Renamed from finance-calculator-pro in 1.3.0 (same functions; see the changelog for outputs that changed)
- Conventions: rates are decimals (0.15 = 15 %); amounts in any one currency per snapshot; null means "not meaningful"; ratings are generic, sector-blind rules of thumb and not investment advice
- NaN and Infinity: ratio functions, TTM and history helpers, CAGR, intrinsic value, DCF and all analyzers return null instead (from 1.3.2); the plain-arithmetic helpers netDebt, netCash, calculateEnterpriseValue, cashConversionCycle, computeGFactor and the composite score functions expect valid numbers and pass NaN through
- Source: https://github.com/boffincoders/fundamental-analysis
- Project page: https://boffincoders.com/open-source/fundamental-analysis

## What it is (and is not)

${readmeSection(md, 'What it is (and is not)')}

## Metrics

All are also returned, grouped, by analyzeCompany(data, insights?) and the analyzeValuation / analyzeProfitability / analyzeLiquidity / analyzeSolvency / analyzeEfficiency / analyzeRisk / analyzeQuality analyzers.

${metricsList(md)}

## FAQ

${FAQ.slice(0, 7).map(f => `### ${f.q}\n\n${f.a}`).join('\n\n')}

## Docs

- [Overview and playground](${SITE_URL}/): what the library does, code samples, live calculator
- [Guide and API reference](${SITE_URL}/api-docs/): installation, analyzeCompany, categorical analyzers, batch screening, growth trends, input conventions
- [Stock fundamental analysis of 20 US companies](${SITE_URL}/try/): live analysis from SEC EDGAR filings with a rule-based verdict (not financial advice). One page per company at ${SITE_URL}/try/<TICKER>/ for ${tickers.join(', ')}
- Calculators: ${calculators}
- Metric pages (formula, how to read it, calculator) at ${SITE_URL}/metrics/<id>/:
${metricLines.split('\n').map(l => `  ${l}`).join('\n')}

## Optional

- [llms-full.txt](${SITE_URL}/llms-full.txt): the README and every metric page as plain text
- [Changelog](https://github.com/boffincoders/fundamental-analysis/blob/master/CHANGELOG.md)
- More open source by Boffin Coders: [ts-netstorageapi-akamai](https://boffincoders.github.io/akamai-netstorageapi-typescript/), [durable_queue](https://boffincoders.github.io/durable_queue/), [all Boffin Coders open source](https://boffincoders.github.io/)
`;
}

function llmsFullTxt(): string {
  const metrics = Object.values(metricsData).map(m =>
    `## ${metricH1(m)}\n\nURL: ${SITE_URL}/metrics/${m.id}/\nCategory: ${m.category}\n\n${m.description}\n\nFormula: ${m.formula}\n${m.benchmark ? `\nHow to read it: ${m.benchmark}\n` : ''}\nBackground: ${m.history}`).join('\n\n');
  return `# fundamental-analysis: full documentation (plain text)

Source: ${SITE_URL}/ · Maintained by Boffin Coders (https://boffincoders.com)

---

${readme()}

---

# Metric pages

${metrics}
`;
}

function faqJsonLd(): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

function render(template: string, page: Page): string {
  const url = `${SITE_URL}/${page.route}`;
  const t = escapeHtml(page.title);
  const d = escapeHtml(page.description);
  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    // Static summary inside #root; React replaces it on mount.
    .replace('<div id="root"></div>', `<div id="root">${page.body}</div>`);
}

export function seoPages(): Plugin {
  let outDir = 'dist';
  return {
    name: 'seo-pages',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const template = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
      const all = pages();
      for (const page of all) {
        const dir = path.join(outDir, page.route);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'index.html'), render(template, page));
      }
      // Unknown paths: serve the app shell so client-side routing can redirect.
      fs.copyFileSync(path.join(outDir, 'index.html'), path.join(outDir, '404.html'));

      // FAQPage structured data on the home page only (it matches the FAQ shown there).
      fs.writeFileSync(path.join(outDir, 'index.html'), template.replace('</head>', `    ${faqJsonLd()}\n  </head>`));

      const tickers = all.filter(p => /^try\/[A-Z]+\/$/.test(p.route)).map(p => p.route.split('/')[1]);
      fs.writeFileSync(path.join(outDir, 'llms.txt'), llmsTxt(tickers));
      fs.writeFileSync(path.join(outDir, 'llms-full.txt'), llmsFullTxt());

      const today = new Date().toISOString().slice(0, 10);
      const urls = ['', ...all.map(p => p.route)]
        .map(r => `  <url><loc>${SITE_URL}/${r}</loc><lastmod>${today}</lastmod></url>`)
        .join('\n');
      fs.writeFileSync(
        path.join(outDir, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      );
    },
  };
}
