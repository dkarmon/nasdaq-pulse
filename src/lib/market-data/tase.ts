// ABOUTME: TASE API client for fetching company data from Tel Aviv Stock Exchange.
// ABOUTME: Used by update scripts to get Hebrew company names.

const TASE_API_BASE = "https://datawise.tase.co.il/v1";

export type TaseCompany = {
  companyName: string;
  companyFullName: string;
  issuerId: number;
  corporateId: string;
  taseSector: string;
  isDual: boolean;
};

export type TaseCompaniesResponse = {
  companiesList: {
    result: TaseCompany[];
  };
};

/**
 * Fetches all companies from TASE API.
 * Use language parameter to get Hebrew or English names.
 */
export async function fetchCompaniesList(
  apiKey: string,
  language: "en" | "he" = "en"
): Promise<TaseCompany[]> {
  const headers: Record<string, string> = {
    apikey: apiKey,
    "Accept-Language": language === "he" ? "he" : "en-US",
  };

  const response = await fetch(`${TASE_API_BASE}/basic-securities/companies-list`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`TASE API error: ${response.status} ${response.statusText}`);
  }

  const data: TaseCompaniesResponse = await response.json();
  return data.companiesList.result;
}

/**
 * Fetches companies in both English and Hebrew, returns merged data.
 */
export async function fetchCompaniesWithHebrew(
  apiKey: string
): Promise<Map<number, { en: TaseCompany; he: TaseCompany }>> {
  const [companiesEn, companiesHe] = await Promise.all([
    fetchCompaniesList(apiKey, "en"),
    fetchCompaniesList(apiKey, "he"),
  ]);

  const hebrewByIssuer = new Map<number, TaseCompany>();
  for (const company of companiesHe) {
    hebrewByIssuer.set(company.issuerId, company);
  }

  const merged = new Map<number, { en: TaseCompany; he: TaseCompany }>();
  for (const company of companiesEn) {
    const hebrew = hebrewByIssuer.get(company.issuerId);
    if (hebrew) {
      merged.set(company.issuerId, { en: company, he: hebrew });
    }
  }

  return merged;
}
