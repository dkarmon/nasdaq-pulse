// ABOUTME: Top 100 NASDAQ stocks by market cap for the screener.
// ABOUTME: This list is used by the daily refresh job to fetch market data.

export const NASDAQ_SYMBOLS = [
  // Mega caps
  "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "META", "TSLA", "AVGO", "COST",
  // Large tech
  "NFLX", "AMD", "ADBE", "QCOM", "INTC", "CSCO", "TXN", "INTU", "AMAT", "MU",
  "LRCX", "ADI", "KLAC", "SNPS", "CDNS", "MRVL", "FTNT", "PANW", "CRWD", "DDOG",
  // Semiconductors
  "ASML", "ARM", "MCHP", "ON", "NXPI", "SWKS", "MPWR", "SMCI",
  // Software & Cloud
  "CRM", "NOW", "WDAY", "ZS", "TEAM", "SNOW", "MDB", "NET", "OKTA", "SPLK",
  // Internet & Media
  "PYPL", "SQ", "SHOP", "ABNB", "UBER", "LYFT", "PINS", "SNAP", "ROKU", "TTD",
  // Biotech & Healthcare
  "AMGN", "GILD", "VRTX", "REGN", "MRNA", "BIIB", "ILMN", "DXCM", "IDXX", "ISRG",
  // Consumer
  "PEP", "SBUX", "MDLZ", "KHC", "MNST", "KDP", "WBA", "DLTR", "ROST", "ORLY",
  // Communication & Services
  "CMCSA", "TMUS", "CHTR", "WBD", "EA", "TTWO", "ZM", "DOCU",
  // Financial Tech
  "COIN", "HOOD", "SOFI",
  // EV & Clean Energy
  "RIVN", "LCID", "ENPH", "FSLR",
  // Other notable
  "ADP", "MAR", "BKNG", "LULU", "MELI", "PDD", "JD", "BIDU",
] as const;

export type NasdaqSymbol = typeof NASDAQ_SYMBOLS[number];
