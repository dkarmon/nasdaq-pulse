// ABOUTME: Script to refresh specific stocks in Redis with rate limiting.
// ABOUTME: Used to fix discrepancies between table and detail pane data.

import { getGrowthData, getQuote } from '../src/lib/market-data/yahoo';
import { Redis } from '@upstash/redis';
import { config } from 'dotenv';

config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

const STOCKS_TO_REFRESH = ['VSME', 'BVC', 'EVTV', 'VERO', 'ANPA', 'CGTL', 'SMCI', 'NVDA', 'MRVL', 'AVGO'];

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function refreshStocks() {
  console.log('Getting stocks from Redis...');
  const stocksData = await redis.get<string>('stocks');
  if (!stocksData) {
    console.error('No stocks data in Redis');
    return;
  }

  const stocks = typeof stocksData === 'string' ? JSON.parse(stocksData) : stocksData;
  console.log(`Found ${stocks.length} stocks in Redis`);

  for (const symbol of STOCKS_TO_REFRESH) {
    console.log(`\nRefreshing ${symbol}...`);

    try {
      const [quote, growth] = await Promise.all([
        getQuote(symbol),
        getGrowthData(symbol),
      ]);

      if (!quote || !growth) {
        console.error(`  Failed to fetch data for ${symbol}`);
        continue;
      }

      const stockIndex = stocks.findIndex((s: any) => s.symbol === symbol);
      if (stockIndex === -1) {
        console.log(`  ${symbol} not in stocks list, skipping`);
        continue;
      }

      const oldData = stocks[stockIndex];
      stocks[stockIndex] = {
        ...oldData,
        price: quote.price,
        growth1m: growth.growth1m,
        growth6m: growth.growth6m,
        growth12m: growth.growth12m,
        updatedAt: new Date().toISOString(),
      };

      const old1m = oldData.growth1m ? oldData.growth1m.toFixed(1) : 'N/A';
      const old6m = oldData.growth6m ? oldData.growth6m.toFixed(1) : 'N/A';
      const old12m = oldData.growth12m ? oldData.growth12m.toFixed(1) : 'N/A';

      console.log(`  Old: 1m=${old1m}%, 6m=${old6m}%, 12m=${old12m}%`);
      console.log(`  New: 1m=${growth.growth1m.toFixed(1)}%, 6m=${growth.growth6m.toFixed(1)}%, 12m=${growth.growth12m.toFixed(1)}%`);

      // Wait 1.5 seconds between requests to avoid rate limiting
      await sleep(1500);
    } catch (err) {
      console.error(`  Error refreshing ${symbol}:`, err);
    }
  }

  // Save back to Redis
  await redis.set('stocks', JSON.stringify(stocks));
  console.log('\nAll stocks refreshed and saved to Redis!');
}

refreshStocks();
