import { describe, it, expect } from "vitest";
import {
  computeTTM,
  computeTTMAvg,
  computeNYearSum,
  computeNYearAverage,
  computeHistoricalPoint,
  cagr,
  computeIntrinsicValue,
  calculateDCF,
  grahamNumber,
  analyzeSolvency,
} from "../index";

// 1.3.2: functions typed `number | null` return null instead of NaN or
// ±Infinity when a value is missing or the result is not finite.

describe("missing or non-finite quarters return null", () => {
  it("computeTTM", () => {
    expect(computeTTM([1, 2, undefined as unknown as number, 4])).toBeNull();
    expect(computeTTM([1, 2, NaN, 4])).toBeNull();
    expect(computeTTM([1, 2, Infinity, 4])).toBeNull();
    // A missing value outside the last four quarters doesn't matter.
    expect(computeTTM([NaN, 1, 2, 3, 4])).toBe(10);
  });

  it("computeTTMAvg", () => {
    expect(computeTTMAvg([1, NaN])).toBeNull();
    expect(computeTTMAvg([1, 2])).toBe(1.5);
  });

  it("computeNYearSum and computeNYearAverage", () => {
    expect(computeNYearSum([1, 2, NaN, 4], 1)).toBeNull();
    expect(computeNYearAverage([1, undefined as unknown as number], 1)).toBeNull();
    expect(computeNYearSum([1, 2, 3, 4], 1)).toBe(10);
    expect(computeNYearAverage([2, 4], 1)).toBe(3);
  });

  it("computeHistoricalPoint", () => {
    expect(computeHistoricalPoint([1, NaN, 3], 1)).toBeNull();
    expect(computeHistoricalPoint([1, 2, 3], 1)).toBe(2);
  });

  it("sums that overflow return null", () => {
    expect(computeTTM([1e308, 1e308, 1e308, 1e308])).toBeNull();
  });
});

describe("results too large to represent return null", () => {
  it("cagr", () => {
    expect(cagr(1e-300, 1e300, 0.001)).toBeNull();
    expect(cagr(100, 125, 2)).toBeCloseTo(0.1180, 4);
  });

  it("computeIntrinsicValue", () => {
    expect(computeIntrinsicValue(0.15, 1e300, 0)).toBeNull();
    expect(computeIntrinsicValue(10, 0.15, 0.25)).toBeCloseTo(140.5006, 3);
  });

  it("calculateDCF", () => {
    expect(calculateDCF([1e308, 1e308], 0.1, 0.03)).toBeNull();
    expect(calculateDCF([100, 110, 120, 130, 140], 0.1, 0.03)).toBeCloseTo(1726.79, 2);
  });

  it("grahamNumber", () => {
    expect(grahamNumber(1e300, 1e300)).toBeNull();
    expect(grahamNumber(5, 20)).toBeCloseTo(47.434, 3);
  });
});

describe("analyzeSolvency never returns a non-finite net debt or net cash", () => {
  it.each([
    [NaN, 5],
    [1e308, -1e308],
    [Infinity, 5],
  ])("totalDebt %s, cash %s", (totalDebt, cashAndEquivalents) => {
    const r = analyzeSolvency({ totalDebt, cashAndEquivalents });
    for (const v of [r.netDebt, r.netCash]) {
      expect(v === null || Number.isFinite(v)).toBe(true);
    }
  });
});
