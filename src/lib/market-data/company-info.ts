// ABOUTME: Static company information provider with descriptions in English and Hebrew.
// ABOUTME: Returns sector, description, and translated content for supported stocks.

import companyInfoData from "./company-info.json";

export type CompanyInfo = {
  sector?: string;
  industry?: string;
  description?: string;
  descriptionHebrew?: string;
};

type CompanyInfoMap = {
  [symbol: string]: CompanyInfo;
};

const companyInfoMap = companyInfoData as CompanyInfoMap;

export function getCompanyInfo(symbol: string): CompanyInfo | null {
  const info = companyInfoMap[symbol];
  return info || null;
}

export function hasCompanyInfo(symbol: string): boolean {
  return symbol in companyInfoMap;
}

export function getSupportedSymbols(): string[] {
  return Object.keys(companyInfoMap);
}
