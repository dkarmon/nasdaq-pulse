// ABOUTME: One-shot script to inject pinned NASDAQ stocks into Redis immediately.
// ABOUTME: Adds stocks that the nightly cron missed (e.g. newly re-listed symbols).
// ABOUTME: Run with: npx tsx scripts/inject-pinned-stocks.ts
//
// Unlike refresh-stocks-batch.ts this script ADDS stocks that don't yet exist in Redis
// rather than skipping them.

import { config } from 'dotenv';
config({ path: '.env.local' });

import { getQuoteAndGrowth } from '../src/lib/market-data/yahoo';
import { getStocks, saveStocks } from '../src/lib/market-data/storage';
import { PINNED_NASDAQ_SYMBOLS } from '../src/lib/market-data/symbols';
import type { Stock } from '../src/lib/market-data/types';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function injectPinnedStocks() {
  console.log('='.repeat(60));
  console.log('INJECT PINNED STOCKS started at', new Date().toISOString());
  console.log('Symbols:', PINNED_NASDAQ_SYMBOLS.join(', '));
  console.log('='.repeat(60));

  const existing = await getStocks('nasdaq');
  const stocksMap = new Map<string, Stock>(existing.map(s => [s.symbol, s]));
  console.log(`Loaded ${existing.length} existing stocks from Redis`);

  let added = 0;
  let updated = 0;
  let failed = 0;

  for (const symbol of PINNED_NASDAQ_SYMBOLS) {
    console.log(`\nFetching ${symbol}...`);
    try {
      const data = await getQuoteAndGrowth(symbol);

      if (!data) {
        console.error(`  FAILED: no data returned from Yahoo Finance`);
        failed++;
        continue;
      }

      const isNew = !stocksMap.has(symbol);
      const stock: Stock = {
        symbol,
        name: data.quote.name,
        exchange: 'nasdaq',
        price: data.quote.price,
        currency: 'USD',
        marketCap: 0,
        growth1d: data.growth.growth1d,
        growth5d: data.growth.growth5d,
        growth1m: data.growth.growth1m,
        growth3m: data.growth.growth3m,
        growth6m: data.growth.growth6m,
        growth12m: data.growth.growth12m,
        updatedAt: new Date().toISOString(),
        hasSplitWarning: data.hasSplitWarning || undefined,
      };

      stocksMap.set(symbol, stock);

      console.log(`  ${isNew ? 'ADDED' : 'UPDATED'}: price=${stock.price}, 1m=${stock.growth1m?.toFixed(1)}%, 6m=${stock.growth6m?.toFixed(1)}%, 12m=${stock.growth12m?.toFixed(1)}%`);
      isNew ? added++ : updated++;
    } catch (err) {
      console.error(`  ERROR:`, err);
      failed++;
    }

    await sleep(500);
  }

  if (failed < PINNED_NASDAQ_SYMBOLS.length) {
    const allStocks = Array.from(stocksMap.values());
    allStocks.sort((a, b) => (b.growth1m ?? 0) - (a.growth1m ?? 0));
    await saveStocks(allStocks, 'nasdaq');
    console.log(`\nSaved ${allStocks.length} total stocks to Redis`);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`DONE: ${added} added, ${updated} updated, ${failed} failed`);
  console.log('='.repeat(60));
}

injectPinnedStocks().catch(err => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
