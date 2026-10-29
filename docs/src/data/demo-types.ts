// Shapes of the demo JSON written by scripts/fetch-demo-data.mjs. Kept free of
// Vite-only APIs so the build-time prerender can import it too.
import type { CompanySnapshotInput } from 'fundamental-analysis';

export interface DemoSource { tag: string; basis?: string; end?: string; form?: string; filed?: string }

export interface DemoYear {
  fiscalYear: number;
  fiscalYearEnd: string;
  revenue: number | null;
  costOfRevenue: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  eps: number | null;
  dividendPerShare: number | null;
  freeCashFlow: number | null;
  operatingCashFlow: number | null;
  dilutedShares: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  longTermDebt: number | null;
  currentAssets: number | null;
  currentLiabilities: number | null;
  splitAdjusted?: number;
}

export type DemoSnapshot = { [K in keyof CompanySnapshotInput]: number | null };

export interface DemoCompany {
  ticker: string;
  name: string;
  legalName: string;
  sector: string;
  cik: number;
  currency: string;
  asOf: {
    periodEnd: string;
    basis: 'TTM' | 'FY' | null;
    balanceSheetDate: string;
    form: string | null;
    filed: string | null;
    url: string | null;
    lastFiled: string | null;
  };
  snapshot: DemoSnapshot;
  annual: DemoYear[];
  sources: Record<string, DemoSource>;
  missing: string[];
  fetchedAt: string;
}
