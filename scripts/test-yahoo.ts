// ABOUTME: Test script to verify Yahoo Finance API works.
// ABOUTME: Run with: npx tsx scripts/test-yahoo.ts

const BASE_URL = "https://query1.finance.yahoo.com";

type YahooChartResult = {
  chart: {
    result: Array<{
      meta: {
        symbol: string;
        regularMarketPrice: number;
        previousClose: number;
        currency: string;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: number[];
          high: number[];
          low: number[];
          close: number[];
          volume: number[];
        }>;
      };
    }>;
    error: null | { code: string; description: string };
  };
};

async function getQuote(symbol: string) {
  const url = `${BASE_URL}/v8/finance/chart/${symbol}?interval=1d&range=1d`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!response.ok) {
    console.error(`HTTP ${response.status} for ${symbol}`);
    return null;
  }

  const data: YahooChartResult = await response.json();

  if (data.chart.error) {
    console.error(`Yahoo error: ${data.chart.error.description}`);
    return null;
  }

  const result = data.chart.result[0];
  return {
    symbol: result.meta.symbol,
    price: result.meta.regularMarketPrice,
    previousClose: result.meta.previousClose,
    currency: result.meta.currency,
  };
}

async function getHistoricalData(symbol: string) {
  // Get 1 year of daily data
  const url = `${BASE_URL}/v8/finance/chart/${symbol}?interval=1d&range=1y`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!response.ok) {
    console.error(`HTTP ${response.status} for ${symbol}`);
    return null;
  }

  const data: YahooChartResult = await response.json();

  if (data.chart.error || !data.chart.result) {
    console.error(`Yahoo error: ${data.chart.error?.description}`);
    return null;
  }

  const result = data.chart.result[0];
  const quotes = result.indicators.quote[0];

  return {
    symbol: result.meta.symbol,
    dataPoints: result.timestamp.length,
    currentPrice: result.meta.regularMarketPrice,
    closePrices: quotes.close.filter(p => p !== null),
  };
}

function calculateGrowth(prices: number[], daysAgo: number): number | null {
  if (prices.length < daysAgo + 1) return null;

  const currentPrice = prices[prices.length - 1];
  const pastPrice = prices[prices.length - 1 - daysAgo];

  if (!pastPrice || pastPrice === 0) return null;

  return ((currentPrice - pastPrice) / pastPrice) * 100;
}

async function main() {
  console.log("Testing Yahoo Finance API...\n");

  // Test 1: Get quote for AAPL
  console.log("1. Testing getQuote('AAPL')...");
  const quote = await getQuote("AAPL");
  if (quote) {
    console.log("   ✓ Quote received:", JSON.stringify(quote, null, 2));
  } else {
    console.log("   ✗ Failed to get quote");
  }

  // Test 2: Get historical data for AAPL
  console.log("\n2. Testing getHistoricalData('AAPL')...");
  const history = await getHistoricalData("AAPL");
  if (history) {
    console.log("   ✓ Historical data received:");
    console.log("     - Data points:", history.dataPoints);
    console.log("     - Current price:", history.currentPrice);
    console.log("     - First close:", history.closePrices[0]);
    console.log("     - Last close:", history.closePrices[history.closePrices.length - 1]);

    // Calculate growth metrics
    const growth1m = calculateGrowth(history.closePrices, 22);
    const growth6m = calculateGrowth(history.closePrices, 126);
    const growth12m = calculateGrowth(history.closePrices, 252);

    console.log("\n   Growth metrics:");
    console.log("     - 1 month:", growth1m?.toFixed(2) + "%");
    console.log("     - 6 months:", growth6m?.toFixed(2) + "%");
    console.log("     - 12 months:", growth12m?.toFixed(2) + "%");
  } else {
    console.log("   ✗ Failed to get historical data");
  }

  // Test 3: Test a few more symbols
  console.log("\n3. Testing multiple symbols...");
  const symbols = ["MSFT", "GOOGL", "NVDA", "TSLA"];
  for (const sym of symbols) {
    const q = await getQuote(sym);
    if (q) {
      console.log(`   ✓ ${sym}: $${q.price}`);
    } else {
      console.log(`   ✗ ${sym}: Failed`);
    }
  }

  console.log("\n--- Test complete ---");
}

main().catch(console.error);
