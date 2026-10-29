// Page title, H1 and meta description for metric pages. Shared by the page
// itself (MetricView) and the build-time prerender (seo-pages.ts), so crawlers
// and visitors see the same wording.
//
// Pages listed in CALCULATOR_PAGES target a "<metric> calculator" search; each
// of them has a working calculator on the page. Search volumes behind the
// choice: boffincoders-web/data/seo/2026-10-29-checks/.
import type { MetricDefinition } from './metrics';

const CALCULATOR_PAGES: Record<string, { h1: string; lead: string }> = {
  dcf: { h1: 'DCF Calculator (Discounted Cash Flow)', lead: 'Free DCF calculator: value a company from its projected free cash flows.' },
  'intrinsic-value': { h1: 'Intrinsic Value Calculator', lead: 'Free intrinsic value calculator with a margin of safety.' },
  piotroski: { h1: 'Piotroski F-Score Calculator', lead: 'Free Piotroski score (F-Score) calculator.' },
  'z-score': { h1: 'Altman Z-Score Calculator', lead: 'Free Altman Z-Score calculator for bankruptcy risk.' },
  graham: { h1: 'Graham Number Calculator', lead: 'Free Graham number calculator.' },
  peg: { h1: 'PEG Ratio Calculator', lead: 'Free PEG ratio calculator.' },
  'ev-ebitda': { h1: 'EV/EBITDA Calculator', lead: 'Free EV/EBITDA calculator.' },
};

export const isCalculatorPage = (id: string) => id in CALCULATOR_PAGES;

export function metricH1(m: Pick<MetricDefinition, 'id' | 'name'>): string {
  return CALCULATOR_PAGES[m.id]?.h1 ?? m.name;
}

export function metricTitle(m: Pick<MetricDefinition, 'id' | 'name'>): string {
  const c = CALCULATOR_PAGES[m.id];
  return c
    ? `${c.h1}: formula & JavaScript example | fundamental-analysis`
    : `${m.name} — formula, calculator & JavaScript example | fundamental-analysis`;
}

export function metricDescription(m: Pick<MetricDefinition, 'id' | 'description' | 'formula'>): string {
  const c = CALCULATOR_PAGES[m.id];
  return c
    ? `${c.lead} ${m.description} Formula: ${m.formula}. Open-source TypeScript/JavaScript function in fundamental-analysis.`
    : `${m.description} Formula: ${m.formula}. Interactive calculator and TypeScript/JavaScript function in fundamental-analysis.`;
}
