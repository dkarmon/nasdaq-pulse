// ABOUTME: Sector label localization helpers for market-data display surfaces.
// ABOUTME: Keeps sector values in English for data storage and maps them for Hebrew UI.

const HEBREW_SECTOR_TRANSLATIONS: Record<string, string> = {
  Technology: "טכנולוגיה",
  Communication: "תקשורת",
  "Consumer Goods": "מוצרי צריכה",
  Energy: "אנרגיה",
  Finance: "פיננסים",
  Healthcare: "בריאות",
  Industrials: "תעשייה",
  Materials: "חומרים",
  "Real Estate": "נדל\"ן",
  Automotive: "רכב",
  Utilities: "תשתיות",
};

export function localizeSectorName(sector: string | undefined, locale: string): string | undefined {
  if (!sector) {
    return sector;
  }

  if (locale !== "he") {
    return sector;
  }

  return HEBREW_SECTOR_TRANSLATIONS[sector] ?? sector;
}
