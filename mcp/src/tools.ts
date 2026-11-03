import {
  pe,
  calculateDCF,
  impliedSharePrice,
  grahamNumber,
  altmanZScore,
  altmanZScoreDoublePrime,
  roe,
  piotroski,
  grossMargin,
  operatingMargin,
  netProfitMargin,
  fcfMargin,
  currentRatio,
  quickRatio,
  debtToEquity,
  interestCoverage,
  analyzeCompany,
} from "../../src/index";
import type { CompanySnapshotInput, EvaluatedMetric } from "../../src/index";

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

const kindOf = (args: Record<string, unknown>, kinds: readonly string[]): string => {
  const k = args.kind;
  if (typeof k !== "string" || !kinds.includes(k)) throw new InputError(`"kind" must be one of ${kinds.map((x) => `"${x}"`).join(", ")}`);
  return k;
};

const PIOTROSKI_PAIRS: [string, string, string][] = [
  ["F3 (ROA improving)", "priorNetIncome", "priorTotalAssets"],
  ["F5 (long-term debt ratio falling)", "longTermDebt", "priorLongTermDebt"],
  ["F6 (current ratio improving)", "currentRatioValue", "priorCurrentRatioValue"],
  ["F7 (no new shares)", "sharesOutstanding", "priorSharesOutstanding"],
  ["F8 (gross margin improving)", "grossMarginValue", "priorGrossMarginValue"],
  ["F9 (asset turnover improving)", "assetTurnoverValue", "priorAssetTurnoverValue"],
];

/** The figures analyze_company takes, in the library's own names (CompanySnapshotInput), each with its schema text. */
const SNAPSHOT_FIELDS: [keyof CompanySnapshotInput, string][] = [
  ["price", "Share price"],
  ["marketCap", "Market capitalisation (price x shares outstanding)"],
  ["eps", "Earnings per share, trailing twelve months or last fiscal year"],
  ["bookValuePerShare", "Book value per share"],
  ["revenuePerShare", "Revenue per share"],
  ["annualDividendPerShare", "Dividends per share over one year"],
  ["analystTargetPrice", "Analyst target price"],
  ["expectedEarningsGrowthRate", "Expected yearly EPS growth as a decimal, e.g. 0.15 (PEG)"],
  ["sharesOutstanding", "Shares outstanding"],
  ["totalRevenue", "Revenue for the period"],
  ["costOfRevenue", "Cost of revenue, as a positive number"],
  ["grossProfit", "Gross profit, used when cost of revenue is not given"],
  ["operatingIncome", "Operating income"],
  ["ebit", "Earnings before interest and taxes"],
  ["ebitda", "EBITDA"],
  ["interestExpense", "Interest expense, as a positive number"],
  ["netIncome", "Net income"],
  ["taxRate", "Effective tax rate as a decimal, e.g. 0.25 (ROIC)"],
  ["operatingCashFlow", "Cash flow from operations"],
  ["freeCashFlow", "Operating cash flow minus capital expenditure"],
  ["totalAssets", "Total assets"],
  ["totalLiabilities", "Total liabilities"],
  ["totalEquity", "Shareholders' equity"],
  ["currentAssets", "Current assets"],
  ["currentLiabilities", "Current liabilities"],
  ["totalDebt", "Short-term plus long-term borrowings"],
  ["longTermDebt", "Long-term debt"],
  ["cashAndEquivalents", "Cash and equivalents"],
  ["inventory", "Inventory"],
  ["tradeReceivables", "Trade receivables"],
  ["workingCapital", "Current assets minus current liabilities; worked out from them when left out"],
  ["retainedEarnings", "Retained earnings"],
  ["returns", "Return for the period as a decimal (Sharpe)"],
  ["riskFree", "Risk-free rate for the same period as a decimal (Sharpe)"],
  ["stdDev", "Standard deviation of returns for the same period (Sharpe)"],
];

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
  {
    name: "piotroski_f_score",
    title: "Piotroski F-Score",
    description:
      "Nine pass or fail accounting signals (profitability, leverage and liquidity, efficiency) added into a 0 to 9 score. Signals that compare two years are scored only when both years are given.",
    inputSchema: {
      type: "object",
      properties: {
        netIncome: num("Net income, current year"),
        totalAssets: num("Total assets, current year"),
        operatingCashFlow: num("Cash flow from operations, current year"),
        priorNetIncome: num("Optional: net income, prior year (F3)"),
        priorTotalAssets: num("Optional: total assets, prior year (F3, F5)"),
        longTermDebt: num("Optional: long-term debt, current year (F5)"),
        priorLongTermDebt: num("Optional: long-term debt, prior year (F5)"),
        currentRatioValue: num("Optional: current ratio, current year (F6)"),
        priorCurrentRatioValue: num("Optional: current ratio, prior year (F6)"),
        sharesOutstanding: num("Optional: shares outstanding, current year (F7)"),
        priorSharesOutstanding: num("Optional: shares outstanding, prior year (F7)"),
        grossMarginValue: num("Optional: gross margin as a decimal, current year (F8)"),
        priorGrossMarginValue: num("Optional: gross margin as a decimal, prior year (F8)"),
        assetTurnoverValue: num("Optional: revenue / total assets, current year (F9)"),
        priorAssetTurnoverValue: num("Optional: revenue / total assets, prior year (F9)"),
      },
      required: ["netIncome", "totalAssets", "operatingCashFlow"],
      additionalProperties: false,
    },
    run: (args) => {
      const netIncome = need(args, "netIncome");
      const totalAssets = need(args, "totalAssets");
      const operatingCashFlow = need(args, "operatingCashFlow");
      if (totalAssets <= 0) throw new InputError('"totalAssets" must be above 0');
      const opt = (k: string) => optional(args, k);
      const inputs = {
        netIncome,
        totalAssets,
        operatingCashFlow,
        priorNetIncome: opt("priorNetIncome"),
        priorTotalAssets: opt("priorTotalAssets"),
        longTermDebt: opt("longTermDebt"),
        priorLongTermDebt: opt("priorLongTermDebt"),
        currentRatioValue: opt("currentRatioValue"),
        priorCurrentRatioValue: opt("priorCurrentRatioValue"),
        sharesOutstanding: opt("sharesOutstanding"),
        priorSharesOutstanding: opt("priorSharesOutstanding"),
        grossMarginValue: opt("grossMarginValue"),
        priorGrossMarginValue: opt("priorGrossMarginValue"),
        assetTurnoverValue: opt("assetTurnoverValue"),
        priorAssetTurnoverValue: opt("priorAssetTurnoverValue"),
      };
      const r = piotroski(inputs);
      const missing = PIOTROSKI_PAIRS.filter(([, a, b]) => args[a] === undefined || args[b] === undefined).map(([label]) => label);
      const rating = r.maxScore < 9 ? null : r.score >= 7 ? "strong" : r.score >= 3 ? "average" : "weak";
      return {
        value: r.score,
        maxScore: r.maxScore,
        rating,
        signals: r.signals,
        formula:
          "F-Score = count of signals met: F1 ROA > 0, F2 CFO > 0, F3 ROA up, F4 CFO / assets > ROA, F5 long-term debt / assets down, F6 current ratio up, F7 shares not up, F8 gross margin up, F9 asset turnover up",
        inputs,
        caveats: [
          ...(missing.length > 0
            ? [`Scored ${r.maxScore} of 9 signals. Not scored, a year is missing: ${missing.join(", ")}. The 0 to 9 bands apply only to a full score.`]
            : ["Bands: 7 to 9 strong, 3 to 6 average, 0 to 2 weak."]),
          "Piotroski built the score to sort value stocks (high book to market). Each signal is pass or fail, so a small change can move the score by a point.",
        ],
      };
    },
  },
  {
    name: "profit_margin",
    title: "Profit margin (gross, operating, net, FCF)",
    description: "One margin as a share of revenue: gross, operating, net or free cash flow.",
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["gross", "operating", "net", "free_cash_flow"], description: "Which margin" },
        revenue: num("Revenue for the period"),
        costOfRevenue: num("Cost of revenue (gross)"),
        operatingIncome: num("Operating income (operating)"),
        netIncome: num("Net income (net)"),
        freeCashFlow: num("Free cash flow (free_cash_flow)"),
      },
      required: ["kind", "revenue"],
      additionalProperties: false,
    },
    run: (args) => {
      const kind = kindOf(args, ["gross", "operating", "net", "free_cash_flow"]);
      const revenue = need(args, "revenue");
      const field = { gross: "costOfRevenue", operating: "operatingIncome", net: "netIncome", free_cash_flow: "freeCashFlow" }[kind]!;
      const amount = need(args, field);
      const value =
        kind === "gross"
          ? grossMargin(revenue, amount)
          : kind === "operating"
            ? operatingMargin(amount, revenue)
            : kind === "net"
              ? netProfitMargin(amount, revenue)
              : fcfMargin(amount, revenue);
      const formula = {
        gross: "Gross margin = (revenue - cost of revenue) / revenue",
        operating: "Operating margin = operating income / revenue",
        net: "Net margin = net income / revenue",
        free_cash_flow: "FCF margin = free cash flow / revenue",
      }[kind]!;
      return {
        value,
        formula,
        inputs: { kind, revenue, [field]: amount },
        caveats: [
          ...nullNote(value, "revenue is zero."),
          "The result is a decimal: 0.25 means 25%.",
          kind === "gross"
            ? "What goes into cost of revenue differs between companies, so compare gross margins within one industry."
            : "Compare margins within one industry and over the same period length.",
          ...(kind === "net" ? ["One-off gains and losses move net income. Read it beside the operating margin."] : []),
        ],
      };
    },
  },
  {
    name: "liquidity_ratio",
    title: "Liquidity ratio (current, quick)",
    description: "Whether short-term assets cover short-term liabilities: the current ratio, or the quick ratio that leaves out inventory.",
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["current", "quick"], description: "current or quick (acid test)" },
        currentAssets: num("Current assets"),
        currentLiabilities: num("Current liabilities"),
        inventory: num("Inventory (quick)"),
      },
      required: ["kind", "currentAssets", "currentLiabilities"],
      additionalProperties: false,
    },
    run: (args) => {
      const kind = kindOf(args, ["current", "quick"]);
      const ca = need(args, "currentAssets");
      const cl = need(args, "currentLiabilities");
      if (kind === "current") {
        const value = currentRatio(ca, cl);
        return {
          value,
          formula: "Current ratio = current assets / current liabilities",
          inputs: { kind, currentAssets: ca, currentLiabilities: cl },
          caveats: [
            ...nullNote(value, "current liabilities are zero."),
            "Below 1, current liabilities are larger than current assets. About 1.2 to 2 is the usual comfortable range, but it differs by industry: retailers that sell stock fast often run lower.",
          ],
        };
      }
      const inventory = need(args, "inventory");
      const value = quickRatio(ca, inventory, cl);
      return {
        value,
        formula: "Quick ratio = (current assets - inventory) / current liabilities",
        inputs: { kind, currentAssets: ca, inventory, currentLiabilities: cl },
        caveats: [
          ...nullNote(value, "current liabilities are zero."),
          "Above 1, liquid assets cover current liabilities without selling stock. This version takes out inventory only. A stricter one counts just cash, short-term investments and receivables.",
        ],
      };
    },
  },
  {
    name: "leverage_ratio",
    title: "Leverage ratio (debt to equity, interest coverage)",
    description: "How much debt a company carries against its equity, or how many times its operating profit covers its interest.",
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["debt_to_equity", "interest_coverage"], description: "Which ratio" },
        totalDebt: num("Total debt (debt_to_equity)"),
        totalEquity: num("Shareholders' equity (debt_to_equity)"),
        ebit: num("EBIT, operating income (interest_coverage)"),
        interestExpense: num("Interest expense, positive or negative as your data reports it (interest_coverage)"),
      },
      required: ["kind"],
      additionalProperties: false,
    },
    run: (args) => {
      const kind = kindOf(args, ["debt_to_equity", "interest_coverage"]);
      if (kind === "debt_to_equity") {
        const debt = need(args, "totalDebt");
        const equity = need(args, "totalEquity");
        const value = debtToEquity(debt, equity);
        return {
          value,
          formula: "Debt to equity = total debt / shareholders' equity",
          inputs: { kind, totalDebt: debt, totalEquity: equity },
          caveats: [
            ...nullNote(value, "equity is zero."),
            ...(equity < 0 ? ["Equity is negative, so the ratio is negative and cannot be ranked against positive ones."] : []),
            "Above about 2 is high for most industries, though capital-heavy businesses such as utilities run higher, and the ratio says little about banks. Use one debt definition (with or without leases) across the companies you compare.",
          ],
        };
      }
      const ebit = need(args, "ebit");
      const interest = need(args, "interestExpense");
      const value = interestCoverage(ebit, interest);
      return {
        value,
        formula: "Interest coverage = EBIT / |interest expense|",
        inputs: { kind, ebit, interestExpense: interest },
        caveats: [
          ...nullNote(value, "interest expense is zero, so there is no interest to cover."),
          "Interest expense is taken as a size, whatever its sign. A negative result means EBIT is negative.",
          "Below 1.5 the company may struggle to pay its interest, above 3 it is well covered. One year's EBIT can fall fast for a cyclical company.",
        ],
      };
    },
  },
  {
    name: "analyze_company",
    title: "Company analysis (every ratio at once)",
    description:
      "Every ratio the figures allow, in one call: valuation, profitability, liquidity, solvency, efficiency, risk (Altman Z, Z'', Piotroski) and quality. Every figure is optional; a metric whose figures are missing comes back null and is named. With withInsights, each metric also gets a status and a one-line reading.",
    inputSchema: {
      type: "object",
      properties: {
        ...Object.fromEntries(SNAPSHOT_FIELDS.map(([k, d]) => [k, num(d)])),
        withInsights: { type: "boolean", description: "Optional: add a status (Good, Neutral, Bad, N/A) and a one-line reading to each metric" },
      },
      additionalProperties: false,
    },
    run: (args) => {
      const known = new Set<string>([...SNAPSHOT_FIELDS.map(([k]) => k as string), "withInsights"]);
      const unknown = Object.keys(args).filter((k) => !known.has(k));
      if (unknown.length > 0) {
        throw new InputError(`Unknown field: ${unknown.map((k) => `"${k}"`).join(", ")}. Use the names in the input schema, such as "totalRevenue" for revenue.`);
      }
      const withInsights = args.withInsights;
      if (withInsights !== undefined && typeof withInsights !== "boolean") throw new InputError('"withInsights" must be true or false');
      const data: CompanySnapshotInput = {};
      for (const [k] of SNAPSHOT_FIELDS) {
        const v = optional(args, k);
        if (v !== undefined) data[k] = v;
      }
      if (Object.keys(data).length === 0) throw new InputError("Pass at least one figure");

      const analysis = analyzeCompany(data, withInsights === true);
      const computed: string[] = [];
      const notComputed: string[] = [];
      for (const [group, metrics] of Object.entries(analysis)) {
        for (const [name, m] of Object.entries(metrics as Record<string, unknown>)) {
          const v = withInsights === true ? (m as EvaluatedMetric).value : m;
          (v === null || v === undefined ? notComputed : computed).push(`${group}.${name}`);
        }
      }
      const piotroskiScored = !notComputed.includes("risk.piotroski");
      return {
        value: computed.length,
        metricsTotal: computed.length + notComputed.length,
        analysis,
        notComputed,
        formula:
          "value = the number of metrics the figures allowed. Each metric uses its standard formula, the same as the single-metric tools of this server.",
        inputs: { ...data, withInsights: withInsights === true },
        caveats: [
          "Give every amount in one currency and unit. Flow items (revenue, income, cash flow) cover one period, usually the trailing twelve months or the last fiscal year. Rates are decimals: 0.15 means 15%.",
          ...(notComputed.length > 0 ? [`${notComputed.length} metrics came back null because a figure they need was not passed: ${notComputed.join(", ")}.`] : []),
          ...(piotroskiScored
            ? ["The Piotroski score here sees one year, so the signals that compare two years are not scored. For all nine, use piotroski_f_score with the prior year."]
            : []),
          ...(withInsights === true
            ? ["Each status is a generic rule of thumb that ignores the sector: a P/E of 30 is ordinary for software and high for a utility. Compare with sector peers before drawing conclusions."]
            : []),
          "The current ratio, EV/EBITDA and Altman Z are not meaningful for banks and insurers.",
        ],
      };
    },
  },
];
