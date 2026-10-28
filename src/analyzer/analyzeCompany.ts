import { CompanySnapshotInput, CompanyAnalysis, CompanyAnalysisWithInsights } from "./types";
import {
  analyzeValuation,
  analyzeProfitability,
  analyzeLiquidity,
  analyzeSolvency,
  analyzeEfficiency,
  analyzeRisk,
  analyzeQuality,
} from "./categorical";

/**
 * Compiles a comprehensive snapshot analysis of a company.
 * Automatically bundles valuation, profitability, liquidity, solvency,
 * efficiency, risk, and quality metrics.
 *
 * @param data Flat object with raw fundamental financial data.
 * @param withInsights Set to true to receive { value, status, insight } per metric.
 */
export function analyzeCompany(data: CompanySnapshotInput, withInsights?: false): CompanyAnalysis;
export function analyzeCompany(data: CompanySnapshotInput, withInsights: true): CompanyAnalysisWithInsights;
export function analyzeCompany(data: CompanySnapshotInput, withInsights?: boolean): CompanyAnalysis | CompanyAnalysisWithInsights;
export function analyzeCompany(data: CompanySnapshotInput, withInsights = false): CompanyAnalysis | CompanyAnalysisWithInsights {
  return {
    valuation:     analyzeValuation(data, withInsights),
    profitability: analyzeProfitability(data, withInsights),
    liquidity:     analyzeLiquidity(data, withInsights),
    solvency:      analyzeSolvency(data, withInsights),
    efficiency:    analyzeEfficiency(data, withInsights),
    risk:          analyzeRisk(data, withInsights),
    quality:       analyzeQuality(data, withInsights),
  } as CompanyAnalysis | CompanyAnalysisWithInsights;
}

/**
 * Runs analyzeCompany across an array of companies.
 * Useful for batch screening.
 */
export function analyzeBatch(companies: CompanySnapshotInput[], withInsights?: false): CompanyAnalysis[];
export function analyzeBatch(companies: CompanySnapshotInput[], withInsights: true): CompanyAnalysisWithInsights[];
export function analyzeBatch(companies: CompanySnapshotInput[], withInsights?: boolean): (CompanyAnalysis | CompanyAnalysisWithInsights)[];
export function analyzeBatch(companies: CompanySnapshotInput[], withInsights = false): (CompanyAnalysis | CompanyAnalysisWithInsights)[] {
  return companies.map((company) => analyzeCompany(company, withInsights));
}
