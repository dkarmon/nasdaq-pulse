// ABOUTME: Exports screener data to Excel format with two sheets.
// ABOUTME: Creates workbook with stock data (Screener) and configuration (Settings).

import * as XLSX from "xlsx";
import type { Stock, Exchange, SortDirection, SortPeriod } from "@/lib/market-data/types";
import type { RecommendationFormulaSummary } from "@/lib/recommendations/types";

export type ExportSettings = {
  exchange: Exchange;
  sortBy: SortPeriod;
  sortDirection: SortDirection;
  limit: number;
  recommendedOnly: boolean;
  formula: RecommendationFormulaSummary | null;
};

type ScreenerRow = {
  "#": number;
  Symbol: string;
  Name: string;
  Price: number;
  "1D%": number | string;
  "5D%": number | string;
  "1M%": number;
  "3M%": number;
  "6M%": number;
  "12M%": number;
  Score: number | string;
};

type SettingsRow = {
  Setting: string;
  Value: string;
};

export function exportToExcel(
  stocks: Stock[],
  rankMap: Map<string, number>,
  settings: ExportSettings
): void {
  const screenerData: ScreenerRow[] = stocks.map((stock) => ({
    "#": rankMap.get(stock.symbol) ?? 0,
    Symbol: stock.symbol,
    Name: stock.exchange === "tlv" && stock.nameHebrew ? stock.nameHebrew : stock.name,
    Price: stock.price,
    "1D%": stock.growth1d ?? "-",
    "5D%": stock.growth5d ?? "-",
    "1M%": stock.growth1m,
    "3M%": stock.growth3m,
    "6M%": stock.growth6m,
    "12M%": stock.growth12m,
    Score: stock.recommendationScore ?? "-",
  }));

  const settingsData: SettingsRow[] = [
    { Setting: "Exchange", Value: settings.exchange.toUpperCase() },
    { Setting: "Sort By", Value: settings.sortBy.toUpperCase() },
    { Setting: "Sort Direction", Value: settings.sortDirection.toUpperCase() },
    { Setting: "Limit", Value: settings.limit.toString() },
    { Setting: "Recommended Only", Value: settings.recommendedOnly ? "Yes" : "No" },
    { Setting: "Formula", Value: settings.formula?.name ?? "None" },
    { Setting: "Exported At", Value: new Date().toISOString() },
  ];

  const workbook = XLSX.utils.book_new();

  const screenerSheet = XLSX.utils.json_to_sheet(screenerData);
  XLSX.utils.book_append_sheet(workbook, screenerSheet, "Screener");

  const settingsSheet = XLSX.utils.json_to_sheet(settingsData);
  XLSX.utils.book_append_sheet(workbook, settingsSheet, "Settings");

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `nasdaq-pulse-${settings.exchange}-${timestamp}.xlsx`;

  XLSX.writeFile(workbook, filename);
}
