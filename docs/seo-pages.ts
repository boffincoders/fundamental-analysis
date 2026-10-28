// Build-time SEO for the GitHub Pages SPA.
// GitHub Pages has no SPA fallback, so deep links such as /metrics/pe would 404.
// After the build this plugin writes a real index.html for every route (with
// its own title, description, canonical URL and a short static summary for
// crawlers that do not run JavaScript), plus sitemap.xml. A project page cannot
// serve robots.txt (it must live at the domain root), so submit the sitemap
// in Google Search Console instead.
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { metricsData } from './src/data/metrics';

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
