import {
  pe,
  calculateDCF,
  impliedSharePrice,
  grahamNumber,
  altmanZScore,
  altmanZScoreDoublePrime,
  roe,
} from "../../src/index";

/**
 * Every tool answers with the number, the formula that produced it, the inputs it used
 * and the caveats a reader needs before acting on it. Nothing is fetched: the caller
 * brings the figures, so the server needs no network access and no API keys.
 */
export interface ToolResult {
  value: number | null;
  formula: string;
  inputs: Record<string, unknown>;
  caveats: string[];
  [extra: string]: unknown;
}

type JsonSchema = Record<string, unknown>;

export interface ToolDef {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchema;
  run: (args: Record<string, unknown>) => ToolResult;
}

/** Thrown for bad arguments; the server reports it as a tool error the model can read and fix. */
export class InputError extends Error {}

const num = (description: string): JsonSchema => ({ type: "number", description });

const need = (args: Record<string, unknown>, key: string): number => {
  const v = args[key];
  if (typeof v !== "number" || !Number.isFinite(v)) throw new InputError(`"${key}" must be a finite number`);
  return v;
};

const optional = (args: Record<string, unknown>, key: string): number | undefined =>
  args[key] === undefined ? undefined : need(args, key);

const nullNote = (value: number | null, why: string): string[] => (value === null ? [`Returned null: ${why}`] : []);

const zone = (z: number | null, safe: number, distress: number): string | null =>
  z === null ? null : z > safe ? "safe" : z < distress ? "distress" : "grey";

export const tools: ToolDef[] = [
  {
    name: "pe_ratio",
    title: "Price to earnings (P/E)",
    description: "Price to earnings ratio from a share price and earnings per share.",
    inputSchema: {
      type: "object",
      properties: { price: num("Share price"), eps: num("Earnings per share, same period basis as you intend (trailing or forward)") },
      required: ["price", "eps"],
      additionalProperties: false,
    },
    run: (args) => {
      const price = need(args, "price");
      const eps = need(args, "eps");
      const value = pe(price, eps);
      return {
        value,
        formula: "P/E = price / EPS",
        inputs: { price, eps },
        caveats: [
          ...nullNote(value, "EPS is zero, so the ratio is undefined."),
          ...(eps < 0 ? ["EPS is negative: a negative P/E does not rank a company and should not be compared with positive ones."] : []),
          "Compare P/E only within one industry and on one EPS basis (trailing or forward).",
        ],
      };
    },
  },
  {
    name: "dcf_valuation",
    title: "Discounted cash flow (DCF)",
    description:
      "Present value of projected free cash flows plus a Gordon-growth terminal value. Optionally converts enterprise value to an implied share price.",
    inputSchema: {
      type: "object",
      properties: {
        projectedFCF: { type: "array", items: { type: "number" }, minItems: 1, description: "Projected free cash flow for years 1 to N" },
        discountRate: num("Discount rate or WACC as a decimal, e.g. 0.09 for 9%"),
        terminalGrowthRate: num("Perpetual growth after year N as a decimal, e.g. 0.025"),
        totalDebt: num("Optional: total debt, for the implied share price"),
        cash: num("Optional: cash and equivalents, for the implied share price"),
        sharesOutstanding: num("Optional: shares outstanding, for the implied share price"),
      },
      required: ["projectedFCF", "discountRate", "terminalGrowthRate"],
      additionalProperties: false,
    },
    run: (args) => {
      const fcf = args.projectedFCF;
      if (!Array.isArray(fcf) || fcf.length === 0 || !fcf.every((v) => typeof v === "number" && Number.isFinite(v))) {
        throw new InputError('"projectedFCF" must be a non-empty array of finite numbers');
      }
      const r = need(args, "discountRate");
      const g = need(args, "terminalGrowthRate");
      const debt = optional(args, "totalDebt");
      const cash = optional(args, "cash");
      const shares = optional(args, "sharesOutstanding");
      const value = calculateDCF(fcf as number[], r, g);

      let terminalShare: number | null = null;
      if (value !== null && value !== 0) {
        const last = (fcf as number[])[fcf.length - 1];
        const pvTerminal = (last * (1 + g)) / (r - g) / Math.pow(1 + r, fcf.length);
        terminalShare = pvTerminal / value;
      }
      const perShare =
        value !== null && debt !== undefined && cash !== undefined && shares !== undefined
          ? impliedSharePrice(value, debt, cash, shares)
          : null;

      return {
        value,
        impliedSharePrice: perShare,
        terminalValueShare: terminalShare,
        formula:
          "EV = sum(FCF_t / (1 + r)^t) + [FCF_N * (1 + g) / (r - g)] / (1 + r)^N; implied price = (EV - debt + cash) / shares",
        inputs: { projectedFCF: fcf, discountRate: r, terminalGrowthRate: g, totalDebt: debt, cash, sharesOutstanding: shares },
        caveats: [
          ...nullNote(value, "the discount rate must be above the terminal growth rate (and above -1)."),
          "End-of-year discounting; the terminal value grows from the last projected year.",
          ...(terminalShare !== null && terminalShare > 0.6
            ? [`The terminal value is ${Math.round(terminalShare * 100)}% of the total, so the result rests mostly on the growth and discount assumptions.`]
            : []),
          "Use unlevered free cash flow to get enterprise value. The output is only as good as the projections.",
        ],
      };
    },
  },
  {
    name: "graham_number",
    title: "Graham Number",
    description: "Benjamin Graham's ceiling price for a defensive investor, from EPS and book value per share.",
    inputSchema: {
      type: "object",
      properties: {
        eps: num("Earnings per share"),
        bookValuePerShare: num("Book value per share"),
        price: num("Optional: current share price, to compare"),
      },
      required: ["eps", "bookValuePerShare"],
      additionalProperties: false,
    },
    run: (args) => {
      const eps = need(args, "eps");
      const book = need(args, "bookValuePerShare");
      const price = optional(args, "price");
      const value = grahamNumber(eps, book);
      return {
        value,
        priceVsGraham: value !== null && price !== undefined ? price / value : null,
        formula: "Graham Number = sqrt(22.5 * EPS * book value per share)",
        inputs: { eps, bookValuePerShare: book, price },
        caveats: [
          ...nullNote(value, "EPS and book value must both be positive."),
          "22.5 is 15 times earnings by 1.5 times book, Graham's limits for a defensive investor. It ignores growth, so it is strict on growth companies and on asset-light businesses.",
        ],
      };
    },
  },
  {
    name: "altman_z_score",
    title: "Altman Z-Score",
    description:
      "Bankruptcy risk score. The original model (1968) is for US public manufacturers; the Z'' model is for non-manufacturers, private and non-US companies.",
    inputSchema: {
      type: "object",
      properties: {
        model: { type: "string", enum: ["original", "double_prime"], description: "original (public manufacturers) or double_prime (everyone else)" },
        workingCapital: num("Current assets minus current liabilities"),
        retainedEarnings: num("Retained earnings"),
        ebit: num("Earnings before interest and taxes"),
        marketValueEquity: num("Market value of equity (original model)"),
        bookEquity: num("Book value of equity (double_prime model)"),
        sales: num("Revenue (original model)"),
        totalAssets: num("Total assets"),
        totalLiabilities: num("Total liabilities"),
      },
      required: ["model", "workingCapital", "retainedEarnings", "ebit", "totalAssets", "totalLiabilities"],
      additionalProperties: false,
    },
    run: (args) => {
      const model = args.model;
      if (model !== "original" && model !== "double_prime") throw new InputError('"model" must be "original" or "double_prime"');
      const wc = need(args, "workingCapital");
      const re = need(args, "retainedEarnings");
      const ebit = need(args, "ebit");
      const ta = need(args, "totalAssets");
      const tl = need(args, "totalLiabilities");
      const common = [
        "Not meaningful for banks, insurers and other financial companies.",
        ...(tl === 0 ? ["Total liabilities are 0, so the equity to liabilities term is capped at 10."] : []),
      ];
      if (model === "original") {
        const mve = need(args, "marketValueEquity");
        const sales = need(args, "sales");
        const value = altmanZScore(wc, re, ebit, mve, sales, ta, tl);
        return {
          value,
          zone: zone(value, 2.99, 1.81),
          formula: "Z = 1.2A + 1.4B + 3.3C + 0.6D + 1.0E (A = WC/TA, B = RE/TA, C = EBIT/TA, D = MVE/TL, E = sales/TA)",
          inputs: { model, workingCapital: wc, retainedEarnings: re, ebit, marketValueEquity: mve, sales, totalAssets: ta, totalLiabilities: tl },
          caveats: [
            ...nullNote(value, "total assets must be positive and total liabilities not negative."),
            "Zones: above 2.99 safe, 1.81 to 2.99 grey, below 1.81 distress. Fitted on US public manufacturers.",
            ...common,
          ],
        };
      }
      const be = need(args, "bookEquity");
      const value = altmanZScoreDoublePrime(wc, re, ebit, be, ta, tl);
      return {
        value,
        zone: zone(value, 2.6, 1.1),
        formula: "Z'' = 6.56A + 3.26B + 6.72C + 1.05D (A = WC/TA, B = RE/TA, C = EBIT/TA, D = book equity/TL)",
        inputs: { model, workingCapital: wc, retainedEarnings: re, ebit, bookEquity: be, totalAssets: ta, totalLiabilities: tl },
        caveats: [
          ...nullNote(value, "total assets must be positive and total liabilities not negative."),
          "Zones: above 2.6 safe, 1.1 to 2.6 grey, below 1.1 distress.",
          ...common,
        ],
      };
    },
  },
  {
    name: "return_on_equity",
    title: "Return on equity (ROE)",
    description: "Net income as a share of shareholders' equity.",
    inputSchema: {
      type: "object",
      properties: { netIncome: num("Net income for the period"), equity: num("Shareholders' equity (average of the period if you have it)") },
      required: ["netIncome", "equity"],
      additionalProperties: false,
    },
    run: (args) => {
      const netIncome = need(args, "netIncome");
      const equity = need(args, "equity");
      const value = roe(netIncome, equity);
      return {
        value,
        formula: "ROE = net income / equity",
        inputs: { netIncome, equity },
        caveats: [
          ...nullNote(value, "equity is zero or negative, where a loss would show as a positive ROE."),
          "High debt raises ROE without better operations: read it beside debt to equity.",
        ],
      };
    },
  },
];
