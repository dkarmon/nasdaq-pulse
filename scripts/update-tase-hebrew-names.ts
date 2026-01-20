// ABOUTME: Script to fetch Hebrew company names from TASE API and update tase-stocks.json.
// ABOUTME: Run with: npx tsx scripts/update-tase-hebrew-names.ts

import { config } from "dotenv";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { fetchCompaniesWithHebrew, TaseCompany } from "../src/lib/market-data/tase";

config({ path: ".env.local" });

const TASE_STOCKS_PATH = join(__dirname, "../src/lib/market-data/tase-stocks.json");
const SIMILARITY_THRESHOLD = 0.5;

type TaseStock = {
  symbol: string;
  name: string;
  nameHebrew?: string;
  currency: string;
};

/**
 * Normalize string for comparison.
 */
function normalize(s: string): string {
  return s
    .toUpperCase()
    .replace(/[.'",]/g, "")
    .replace(/\bLTD\b/g, "")
    .replace(/\bBM\b/g, "")
    .replace(/\bINC\b/g, "")
    .trim();
}

/**
 * Calculate similarity ratio between two strings (0-1).
 * Uses longest common subsequence approach.
 */
function similarity(a: string, b: string): number {
  const s1 = normalize(a);
  const s2 = normalize(b);

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Simple LCS-based similarity
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  const longerLength = longer.length;
  if (longerLength === 0) return 1;

  return (longerLength - editDistance(longer, shorter)) / longerLength;
}

/**
 * Calculate edit distance between two strings.
 */
function editDistance(s1: string, s2: string): number {
  const costs: number[] = [];

  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) {
      costs[s2.length] = lastValue;
    }
  }

  return costs[s2.length];
}

/**
 * Find the best matching TASE company for a stock.
 */
function findBestMatch(
  stockName: string,
  companies: Map<number, { en: TaseCompany; he: TaseCompany }>
): { match: { en: TaseCompany; he: TaseCompany } | null; score: number } {
  let bestMatch: { en: TaseCompany; he: TaseCompany } | null = null;
  let bestScore = 0;

  for (const company of companies.values()) {
    // Try matching against full name
    let score = similarity(stockName, company.en.companyFullName);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = company;
    }

    // Try matching against short name
    score = similarity(stockName, company.en.companyName);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = company;
    }
  }

  return { match: bestMatch, score: bestScore };
}

async function main() {
  const apiKey = process.env.TASE_API_KEY;
  if (!apiKey) {
    console.error("TASE_API_KEY not found in environment");
    process.exit(1);
  }

  console.log("Fetching companies from TASE API...");
  const companies = await fetchCompaniesWithHebrew(apiKey);
  console.log(`Fetched ${companies.size} companies from TASE`);

  console.log("Loading current tase-stocks.json...");
  const stocks: TaseStock[] = JSON.parse(readFileSync(TASE_STOCKS_PATH, "utf-8"));
  console.log(`Loaded ${stocks.length} stocks`);

  let matched = 0;
  let unmatched = 0;
  const unmatchedStocks: { symbol: string; name: string; bestScore: number }[] = [];

  for (const stock of stocks) {
    const { match, score } = findBestMatch(stock.name, companies);

    if (match && score >= SIMILARITY_THRESHOLD) {
      stock.nameHebrew = match.he.companyName;
      matched++;
    } else {
      unmatched++;
      unmatchedStocks.push({ symbol: stock.symbol, name: stock.name, bestScore: score });
    }
  }

  console.log(`\nMatched: ${matched} / ${stocks.length}`);
  console.log(`Unmatched: ${unmatched}`);

  if (unmatchedStocks.length > 0) {
    console.log("\nUnmatched stocks (top 10 by best score):");
    unmatchedStocks
      .sort((a, b) => b.bestScore - a.bestScore)
      .slice(0, 10)
      .forEach((s) => {
        console.log(`  ${s.symbol.padEnd(8)} | ${s.name.substring(0, 35).padEnd(35)} | ${s.bestScore.toFixed(2)}`);
      });
  }

  // Verify known stocks
  console.log("\nVerification - known stocks:");
  for (const symbol of ["LUMI", "TEVA", "POLI", "NICE", "ICL", "BEZQ"]) {
    const stock = stocks.find((s) => s.symbol === symbol);
    if (stock?.nameHebrew) {
      console.log(`  ${symbol}: ${stock.nameHebrew}`);
    } else {
      console.log(`  ${symbol}: NOT FOUND`);
    }
  }

  console.log("\nWriting updated tase-stocks.json...");
  writeFileSync(TASE_STOCKS_PATH, JSON.stringify(stocks, null, 2) + "\n");
  console.log("Done!");
}

main().catch(console.error);
