import { describe, it, expect } from "vitest";
import { handleLine, handleMessage, PROTOCOL_VERSIONS } from "../protocol";

const call = (name: string, args: Record<string, unknown>) =>
  handleMessage({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }) as any;

describe("protocol", () => {
  it("answers initialize with the client's version when it is supported", () => {
    const r = handleMessage({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } }) as any;
    expect(r.result.protocolVersion).toBe("2025-03-26");
    expect(r.result.capabilities.tools).toBeDefined();
  });

  it("falls back to its newest version for an unknown one", () => {
    const r = handleMessage({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "1999-01-01" } }) as any;
    expect(r.result.protocolVersion).toBe(PROTOCOL_VERSIONS[0]);
  });

  it("sends nothing back for a notification", () => {
    expect(handleMessage({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
  });

  it("lists every tool as read-only", () => {
    const r = handleMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" }) as any;
    expect(r.result.tools.length).toBeGreaterThan(0);
    for (const t of r.result.tools) {
      expect(t.inputSchema.type).toBe("object");
      expect(t.annotations.readOnlyHint).toBe(true);
    }
  });

  it("returns JSON-RPC errors for bad input", () => {
    expect((handleLine("not json") as any).error.code).toBe(-32700);
    expect((handleMessage({ jsonrpc: "2.0", id: 3, method: "nope" }) as any).error.code).toBe(-32601);
    expect(call("no_such_tool", {}).error.code).toBe(-32602);
  });

  it("reports bad arguments as a tool error the model can read", () => {
    const r = call("pe_ratio", { price: "ten", eps: 2 });
    expect(r.result.isError).toBe(true);
    expect(r.result.content[0].text).toContain("price");
  });
});

describe("tools", () => {
  it("every result carries value, formula, inputs and caveats", () => {
    const r = call("pe_ratio", { price: 100, eps: 5 });
    expect(r.result.structuredContent).toMatchObject({ value: 20, formula: expect.any(String), inputs: { price: 100, eps: 5 } });
    expect(Array.isArray(r.result.structuredContent.caveats)).toBe(true);
    expect(JSON.parse(r.result.content[0].text).value).toBe(20);
  });

  it("explains a null P/E", () => {
    const r = call("pe_ratio", { price: 100, eps: 0 }).result.structuredContent;
    expect(r.value).toBeNull();
    expect(r.caveats[0]).toMatch(/^Returned null/);
  });

  it("values a DCF, flags a heavy terminal value and gives a share price", () => {
    const r = call("dcf_valuation", {
      projectedFCF: [100, 110, 120],
      discountRate: 0.1,
      terminalGrowthRate: 0.02,
      totalDebt: 200,
      cash: 50,
      sharesOutstanding: 10,
    }).result.structuredContent;
    const expected = 100 / 1.1 + 110 / 1.1 ** 2 + 120 / 1.1 ** 3 + (120 * 1.02) / 0.08 / 1.1 ** 3;
    expect(r.value).toBeCloseTo(expected, 6);
    expect(r.terminalValueShare).toBeGreaterThan(0.6);
    expect(r.caveats.some((c: string) => c.includes("terminal value is"))).toBe(true);
    expect(r.impliedSharePrice).toBeCloseTo((r.value - 200 + 50) / 10, 6);
  });

  it("returns null when the discount rate is not above growth", () => {
    const r = call("dcf_valuation", { projectedFCF: [100], discountRate: 0.02, terminalGrowthRate: 0.03 }).result.structuredContent;
    expect(r.value).toBeNull();
  });

  it("computes the Graham Number and the price against it", () => {
    const r = call("graham_number", { eps: 4, bookValuePerShare: 25, price: 40 }).result.structuredContent;
    expect(r.value).toBeCloseTo(Math.sqrt(22.5 * 4 * 25), 6);
    expect(r.priceVsGraham).toBeCloseTo(40 / r.value, 6);
  });

  it("scores Altman Z and Z'' with zones", () => {
    const base = { workingCapital: 200, retainedEarnings: 300, ebit: 150, totalAssets: 1000, totalLiabilities: 400 };
    const z = call("altman_z_score", { ...base, model: "original", marketValueEquity: 1200, sales: 1100 }).result.structuredContent;
    expect(z.value).toBeCloseTo(1.2 * 0.2 + 1.4 * 0.3 + 3.3 * 0.15 + 0.6 * 3 + 1.1, 6);
    expect(z.zone).toBe("safe");
    const z2 = call("altman_z_score", { ...base, model: "double_prime", bookEquity: 600 }).result.structuredContent;
    expect(z2.value).toBeCloseTo(6.56 * 0.2 + 3.26 * 0.3 + 6.72 * 0.15 + 1.05 * 1.5, 6);
    expect(z2.zone).toBe("safe");
    expect(call("altman_z_score", { ...base, model: "original" }).result.isError).toBe(true);
  });

  it("returns null ROE for negative equity", () => {
    expect(call("return_on_equity", { netIncome: 50, equity: 250 }).result.structuredContent.value).toBeCloseTo(0.2, 6);
    expect(call("return_on_equity", { netIncome: -50, equity: -250 }).result.structuredContent.value).toBeNull();
  });
});
