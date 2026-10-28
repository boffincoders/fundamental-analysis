import { growthRates, cagr } from "../growth/trendGrowth";
import { grossMargin, operatingMargin, netProfitMargin, fcfMargin } from "../profitability/margins";

export interface FundamentalTimeseriesInput {
  revenue: number[];
  netIncome: number[];
  costOfRevenue?: number[];
  operatingIncome?: number[];
  freeCashFlow?: number[];
  eps?: number[];
}

/**
 * Analyzes chronologically ordered arrays of fundamental data
 * Expects oldest data first, newest data last (e.g., [2021, 2022, 2023])
 *
 * Growth arrays have length N − 1. A period whose previous value is 0 has no
 * defined growth rate and is null (since 1.3.0; it was reported as 0 before).
 * CAGR is only computed for annual data.
 */
export function analyzeFundamentalTrends(
  data: FundamentalTimeseriesInput,
  periodType: "annual" | "quarterly" = "annual"
) {
  // Annual data → year-over-year; quarterly data → quarter-over-quarter (sequential).
  const revenueGrowth = growthRates(data.revenue);
  const netIncomeGrowth = growthRates(data.netIncome);
  const epsGrowth = data.eps ? growthRates(data.eps) : null;
  const fcfGrowth = data.freeCashFlow ? growthRates(data.freeCashFlow) : null;

  // Compile margin arrays
  let grossMargins: (number | null)[] | null = null;
  if (data.costOfRevenue) {
    grossMargins = data.revenue.map((rev, i) =>
      data.costOfRevenue && data.costOfRevenue[i] != null ? grossMargin(rev, data.costOfRevenue[i]) : null
    );
  }

  let operatingMargins: (number | null)[] | null = null;
  if (data.operatingIncome) {
    operatingMargins = data.revenue.map((rev, i) =>
      data.operatingIncome && data.operatingIncome[i] != null ? operatingMargin(data.operatingIncome[i], rev) : null
    );
  }

  let netMargins: (number | null)[] = data.revenue.map((rev, i) =>
    netProfitMargin(data.netIncome[i], rev)
  );

  let fcfMargins: (number | null)[] | null = null;
  if (data.freeCashFlow) {
    fcfMargins = data.revenue.map((rev, i) =>
      data.freeCashFlow && data.freeCashFlow[i] != null ? fcfMargin(data.freeCashFlow[i], rev) : null
    );
  }

  // Calculate CAGR if annual
  const periods = data.revenue.length - 1;
  const revenueCagr =
    periodType === "annual" && periods > 0
      ? cagr(data.revenue[0], data.revenue[data.revenue.length - 1], periods)
      : null;

  const netIncomeCagr =
    periodType === "annual" && periods > 0
      ? cagr(data.netIncome[0], data.netIncome[data.netIncome.length - 1], periods)
      : null;

  return {
    periodType,
    growth: {
      revenueGrowth,
      netIncomeGrowth,
      epsGrowth,
      fcfGrowth,
      revenueCagr,
      netIncomeCagr,
    },
    margins: {
      grossMargins,
      operatingMargins,
      netMargins,
      fcfMargins,
    },
  };
}
