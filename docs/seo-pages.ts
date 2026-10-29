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
    const description = `${m.description} Formula: ${m.formula}. Interactive calculator and TypeScript/JavaScript function in fundamental-analysis.`;
    list.push({
      route: `metrics/${m.id}/`,
      title: `${m.name} — formula, calculator & JavaScript example | fundamental-analysis`,
      description,
      body: `<h1>${escapeHtml(m.name)}</h1><p>${escapeHtml(m.description)}</p><p><strong>Formula:</strong> ${escapeHtml(m.formula)}</p>${m.benchmark ? `<p><strong>How to read it:</strong> ${escapeHtml(m.benchmark)}</p>` : ''}<p>${escapeHtml(m.history)}</p>`,
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
    title: 'Try fundamental analysis on real companies | fundamental-analysis',
    description: `Pick Apple, Microsoft, NVIDIA or ${index.length - 3} other US companies and see the open-source fundamental-analysis package compute valuation, profitability, debt and distress-risk metrics from their latest SEC filings, live in your browser.`,
    body: `<h1>Try it on real companies</h1><ul>${index.map(c => `<li><a href="${SITE_URL}/try/${c.ticker}/">${escapeHtml(c.name)} (${c.ticker})</a></li>`).join('')}</ul>`,
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
