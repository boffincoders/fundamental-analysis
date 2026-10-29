// Types and helpers for the "Try it" demo. The JSON files in ./demo are written
// by scripts/fetch-demo-data.mjs from SEC EDGAR filings (refreshed nightly).
import type { CompanySnapshotInput } from 'fundamental-analysis';
import demoIndex from './demo/index.json';
import type { DemoCompany, DemoSnapshot } from './demo-types';

export * from './demo-types';

export interface DemoIndexEntry { ticker: string; name: string; sector: string; periodEnd: string; filed: string | null }

export const DEMO_INDEX = demoIndex as DemoIndexEntry[];

const loaders = import.meta.glob<{ default: DemoCompany }>(['./demo/*.json', '!./demo/index.json']);

export async function loadDemoCompany(ticker: string): Promise<DemoCompany | null> {
  const load = loaders[`./demo/${ticker}.json`];
  return load ? (await load()).default : null;
}

/** JSON nulls → omitted fields, as the package expects. */
export function toInput(snapshot: DemoSnapshot): CompanySnapshotInput {
  const out: CompanySnapshotInput = {};
  for (const [k, v] of Object.entries(snapshot)) if (v != null) (out as Record<string, number>)[k] = v;
  return out;
}

export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';

export const formatMoney = (v: number | null | undefined) => {
  if (v == null) return '—';
  const a = Math.abs(v), s = v < 0 ? '−' : '';
  if (a >= 1e12) return `${s}$${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`;
  return `${s}$${a.toFixed(2)}`;
};
