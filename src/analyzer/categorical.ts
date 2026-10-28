import { CompanySnapshotInput } from "./types";
import { pe } from "../valuation/pe";
import { pb } from "../valuation/pb";
import { ps } from "../valuation/ps";
import { peg } from "../valuation/peg";
import { evEbitda, calculateEnterpriseValue } from "../valuation/evEbitda";
import { dividendYield } from "../valuation/dividendYield";
import { grahamNumber } from "../intrinsic/graham";
import { priceToCashFlow } from "../valuation/priceToCashFlow";
import { earningsYield } from "../valuation/earningsYield";
import { evRevenue } from "../valuation/evRevenue";
import { evFcf } from "../valuation/evFcf";
import { roa } from "../profitability/roa";
import { roe } from "../profitability/roe";
import { roic } from "../profitability/roic";
import { grossMargin, operatingMargin, netProfitMargin, fcfMargin } from "../profitability/margins";
import { currentRatio } from "../liquidity/currentRatio";
import { quickRatio } from "../liquidity/quickRatio";
import { debtToEquity } from "../liquidity/debtToEquity";
import { interestCoverage } from "../liquidity/interestCoverage";
import { assetTurnover } from "../efficiency/assetTurnover";
import { inventoryTurnover } from "../efficiency/inventoryTurnover";
import { receivablesTurnover, daysSalesOutstanding } from "../efficiency/receivablesTurnover";
import { sharpe } from "../risk/sharpe";
import { altmanZScore, altmanZScoreDoublePrime } from "../risk/altmanZScore";
import { piotroski } from "../risk/piotroski";
import { netDebt, netCash, netDebtToEbitda, debtToAssets } from "../solvency/netDebt";
import { payoutRatio } from "../quality/payoutRatio";
import { cashConversionRatio } from "../quality/cashConversionRatio";
import { targetUpside } from "../insights/targetUpside";
import { safeDivide } from "../core/safeDivide";
import { evaluate, EvaluatedMetric } from "../evaluator/evaluate";

// Conventions used below:
// - `x != null` is used wherever zero is a legitimate value (net income, costs,
//   cash flow, EBIT, dividends...). A plain truthiness check is used only for
//   denominators, where zero would make the ratio undefined anyway.
// - Missing inputs give null outputs; nothing is silently replaced by 0, except
//   that total debt and cash default to 0 for EV / net debt when the other one
//   is supplied (documented on CompanySnapshotInput).

const isPositive = (v: number | undefined): v is number => v != null && v > 0;

// ── Valuation ─────────────────────────────────────────────────────────────────

export function analyzeValuation(data: CompanySnapshotInput, withInsights = false) {
  const price      = isPositive(data.price) ? data.price : null;
  const marketCap  = isPositive(data.marketCap) ? data.marketCap : null;
  const ev         = marketCap !== null
    ? calculateEnterpriseValue(marketCap, data.totalDebt ?? 0, data.cashAndEquivalents ?? 0)
    : null;
  const peValue    = price !== null && data.eps != null ? pe(price, data.eps) : null;

  const raw = {
    pe:              peValue,
    pb:              price !== null && data.bookValuePerShare != null ? pb(price, data.bookValuePerShare) : null,
    ps:              price !== null && data.revenuePerShare != null ? ps(price, data.revenuePerShare) : null,
    // expectedEarningsGrowthRate is a decimal (0.15 = 15 %); peg() converts it to a percentage.
    peg:             peValue !== null && data.expectedEarningsGrowthRate != null ? peg(peValue, data.expectedEarningsGrowthRate) : null,
    evEbitda:        ev !== null && data.ebitda != null ? evEbitda(ev, data.ebitda) : null,
    dividendYield:   price !== null && data.annualDividendPerShare != null ? dividendYield(data.annualDividendPerShare, price) : null,
    grahamNumber:    data.eps != null && data.bookValuePerShare != null ? grahamNumber(data.eps, data.bookValuePerShare) : null,
    priceToCashFlow: marketCap !== null && data.operatingCashFlow != null ? priceToCashFlow(marketCap, data.operatingCashFlow) : null,
    earningsYield:   price !== null && data.eps != null ? earningsYield(data.eps, price) : null,
    evRevenue:       ev !== null && data.totalRevenue != null ? evRevenue(ev, data.totalRevenue) : null,
    evFcf:           ev !== null && data.freeCashFlow != null ? evFcf(ev, data.freeCashFlow) : null,
  };

  if (!withInsights) return raw;

  return {
    pe:              evaluate.pe(raw.pe),
    pb:              evaluate.pb(raw.pb),
    ps:              evaluate.ps(raw.ps),
    peg:             evaluate.peg(raw.peg),
    evEbitda:        evaluate.evEbitda(raw.evEbitda),
    dividendYield:   evaluate.dividendYield(raw.dividendYield),
    grahamNumber:    evaluate.grahamNumber(raw.grahamNumber, price ?? 0),
    priceToCashFlow: evaluate.priceToCashFlow(raw.priceToCashFlow),
    earningsYield:   evaluate.earningsYield(raw.earningsYield),
    evRevenue:       evaluate.evRevenue(raw.evRevenue),
    evFcf:           evaluate.evFcf(raw.evFcf),
  };
}

// ── Profitability ─────────────────────────────────────────────────────────────

export function analyzeProfitability(data: CompanySnapshotInput, withInsights = false) {
  const revenue = data.totalRevenue;

  let gross: number | null = null;
  if (revenue) {
    if (data.costOfRevenue != null) gross = grossMargin(revenue, data.costOfRevenue);
    else if (data.grossProfit != null) gross = safeDivide(data.grossProfit, revenue);
  }

  const raw = {
    roa:             data.netIncome != null && data.totalAssets ? roa(data.netIncome, data.totalAssets) : null,
    roe:             data.netIncome != null && data.totalEquity != null ? roe(data.netIncome, data.totalEquity) : null,
    roic:            data.operatingIncome != null && data.taxRate != null && data.totalEquity != null
                       ? roic(data.operatingIncome, data.taxRate, data.totalDebt ?? 0, data.totalEquity, data.cashAndEquivalents ?? 0)
                       : null,
    grossMargin:     gross,
    operatingMargin: data.operatingIncome != null && revenue ? operatingMargin(data.operatingIncome, revenue) : null,
    netProfitMargin: data.netIncome != null && revenue ? netProfitMargin(data.netIncome, revenue) : null,
    fcfMargin:       data.freeCashFlow != null && revenue ? fcfMargin(data.freeCashFlow, revenue) : null,
  };

  if (!withInsights) return raw;

  return {
    roa:             evaluate.roa(raw.roa),
    roe:             evaluate.roe(raw.roe),
    roic:            evaluate.roic(raw.roic),
    grossMargin:     evaluate.margin(raw.grossMargin, "Gross"),
    operatingMargin: evaluate.margin(raw.operatingMargin, "Operating"),
    netProfitMargin: evaluate.margin(raw.netProfitMargin, "Net Profit"),
    fcfMargin:       evaluate.margin(raw.fcfMargin, "Free Cash Flow"),
  };
}

// ── Liquidity ─────────────────────────────────────────────────────────────────

export function analyzeLiquidity(data: CompanySnapshotInput, withInsights = false) {
  // Current and quick ratios need CURRENT assets and liabilities. Total assets /
  // total liabilities are a different (solvency) measure and are not used here.
  const ca = data.currentAssets;
  const cl = data.currentLiabilities;

  const raw = {
    currentRatio:     ca != null && cl ? currentRatio(ca, cl) : null,
    quickRatio:       ca != null && data.inventory != null && cl ? quickRatio(ca, data.inventory, cl) : null,
    debtToEquity:     data.totalDebt != null && data.totalEquity ? debtToEquity(data.totalDebt, data.totalEquity) : null,
    interestCoverage: data.ebit != null && data.interestExpense ? interestCoverage(data.ebit, data.interestExpense) : null,
  };

  if (!withInsights) return raw;

  return {
    currentRatio:     evaluate.currentRatio(raw.currentRatio),
    quickRatio:       evaluate.quickRatio(raw.quickRatio),
    debtToEquity:     evaluate.debtToEquity(raw.debtToEquity),
    interestCoverage: evaluate.interestCoverage(raw.interestCoverage),
  };
}

// ── Solvency ──────────────────────────────────────────────────────────────────

export function analyzeSolvency(data: CompanySnapshotInput, withInsights = false) {
  const hasDebtData = data.totalDebt != null || data.cashAndEquivalents != null;
  const td   = data.totalDebt ?? 0;
  const cash = data.cashAndEquivalents ?? 0;
  const nd   = hasDebtData ? netDebt(td, cash) : null;

  const raw = {
    netDebt:          nd,
    netCash:          hasDebtData ? netCash(td, cash) : null,
    netDebtToEbitda:  hasDebtData && data.ebitda != null ? netDebtToEbitda(td, cash, data.ebitda) : null,
    debtToAssets:     data.totalDebt != null && data.totalAssets ? debtToAssets(data.totalDebt, data.totalAssets) : null,
    debtToEquity:     data.totalDebt != null && data.totalEquity ? debtToEquity(data.totalDebt, data.totalEquity) : null,
    interestCoverage: data.ebit != null && data.interestExpense ? interestCoverage(data.ebit, data.interestExpense) : null,
  };

  if (!withInsights) return raw;

  return {
    netDebt:          evaluate.netDebt(raw.netDebt),
    netCash:          { value: raw.netCash, status: raw.netCash === null ? "N/A" : raw.netCash > 0 ? "Good" : "Neutral", insight: raw.netCash === null ? "Debt or cash data unavailable." : raw.netCash > 0 ? `Cash exceeds debt by ${raw.netCash.toLocaleString()}.` : "No net cash — debt is greater than or equal to cash." } as EvaluatedMetric,
    netDebtToEbitda:  evaluate.netDebtToEbitda(raw.netDebtToEbitda, { netDebt: nd, ebitda: data.ebitda }),
    debtToAssets:     evaluate.debtToAssets(raw.debtToAssets),
    debtToEquity:     evaluate.debtToEquity(raw.debtToEquity),
    interestCoverage: evaluate.interestCoverage(raw.interestCoverage),
  };
}

// ── Efficiency ────────────────────────────────────────────────────────────────

export function analyzeEfficiency(data: CompanySnapshotInput, withInsights = false) {
  const raw = {
    assetTurnover:        data.totalRevenue != null && data.totalAssets ? assetTurnover(data.totalRevenue, data.totalAssets) : null,
    inventoryTurnover:    data.costOfRevenue != null && data.inventory ? inventoryTurnover(data.costOfRevenue, data.inventory) : null,
    receivablesTurnover:  data.totalRevenue != null && data.tradeReceivables ? receivablesTurnover(data.totalRevenue, data.tradeReceivables) : null,
    daysSalesOutstanding: data.totalRevenue && data.tradeReceivables != null ? daysSalesOutstanding(data.totalRevenue, data.tradeReceivables) : null,
  };

  if (!withInsights) return raw;

  return {
    assetTurnover:        evaluate.assetTurnover(raw.assetTurnover),
    inventoryTurnover:    evaluate.inventoryTurnover(raw.inventoryTurnover),
    receivablesTurnover:  evaluate.receivablesTurnover(raw.receivablesTurnover),
    daysSalesOutstanding: evaluate.daysSalesOutstanding(raw.daysSalesOutstanding),
  };
}

// ── Risk ──────────────────────────────────────────────────────────────────────

export function analyzeRisk(data: CompanySnapshotInput, withInsights = false) {
  const ca = data.currentAssets;
  const cl = data.currentLiabilities;
  const workingCapital = data.workingCapital ?? (ca != null && cl != null ? ca - cl : undefined);

  // Original Altman Z (public manufacturers) — needs market cap and sales.
  const altman = (
    workingCapital != null &&
    data.retainedEarnings != null &&
    data.ebit != null &&
    data.marketCap != null &&
    data.totalRevenue != null &&
    data.totalAssets != null &&
    data.totalLiabilities != null
  )
    ? altmanZScore(workingCapital, data.retainedEarnings, data.ebit, data.marketCap, data.totalRevenue, data.totalAssets, data.totalLiabilities)
    : null;

  // Altman Z'' (non-manufacturers / private firms) — uses book equity, no sales term.
  const altmanDoublePrime = (
    workingCapital != null &&
    data.retainedEarnings != null &&
    data.ebit != null &&
    data.totalEquity != null &&
    data.totalAssets != null &&
    data.totalLiabilities != null
  )
    ? altmanZScoreDoublePrime(workingCapital, data.retainedEarnings, data.ebit, data.totalEquity, data.totalAssets, data.totalLiabilities)
    : null;

  const sharpeVal = (data.returns != null && data.riskFree != null && data.stdDev != null)
    ? sharpe(data.returns, data.riskFree, data.stdDev)
    : null;

  const revenue = data.totalRevenue;
  const grossMarginValue = revenue
    ? data.costOfRevenue != null ? grossMargin(revenue, data.costOfRevenue)
      : data.grossProfit != null ? safeDivide(data.grossProfit, revenue) : null
    : null;

  // Piotroski — compute only if minimum required fields are present
  const piotroskiResult = (data.netIncome != null && data.totalAssets && data.operatingCashFlow != null)
    ? piotroski({
        netIncome:            data.netIncome,
        totalAssets:          data.totalAssets,
        operatingCashFlow:    data.operatingCashFlow,
        longTermDebt:         data.longTermDebt,
        sharesOutstanding:    data.sharesOutstanding,
        currentRatioValue:    ca != null && cl ? currentRatio(ca, cl) ?? undefined : undefined,
        grossMarginValue:     grossMarginValue ?? undefined,
        assetTurnoverValue:   revenue != null ? assetTurnover(revenue, data.totalAssets) ?? undefined : undefined,
      })
    : null;

  const raw = {
    altmanZScore:            altman,
    altmanZScoreDoublePrime: altmanDoublePrime,
    sharpe:                  sharpeVal,
    piotroski:               piotroskiResult,
  };

  if (!withInsights) return raw;

  return {
    altmanZScore:            evaluate.altmanZScore(raw.altmanZScore),
    altmanZScoreDoublePrime: evaluate.altmanZScoreDoublePrime(raw.altmanZScoreDoublePrime),
    sharpe:                  evaluate.sharpe(raw.sharpe),
    piotroski:               raw.piotroski
      ? evaluate.piotroski(raw.piotroski.score, raw.piotroski.maxScore)
      : evaluate.piotroski(0, 0),
  };
}

// ── Quality ───────────────────────────────────────────────────────────────────

export function analyzeQuality(data: CompanySnapshotInput, withInsights = false) {
  const raw = {
    payoutRatio:         data.annualDividendPerShare != null && data.eps ? payoutRatio(data.annualDividendPerShare, data.eps) : null,
    cashConversionRatio: data.operatingCashFlow != null && data.netIncome ? cashConversionRatio(data.operatingCashFlow, data.netIncome) : null,
    targetUpside:        isPositive(data.price) && data.analystTargetPrice != null ? targetUpside(data.price, data.analystTargetPrice) : null,
  };

  if (!withInsights) return raw;

  return {
    payoutRatio:         evaluate.payoutRatio(raw.payoutRatio),
    cashConversionRatio: evaluate.cashConversionRatio(raw.cashConversionRatio),
    targetUpside:        evaluate.targetUpside(raw.targetUpside),
  };
}
