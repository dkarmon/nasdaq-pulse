import { getGrowthData, getQuote } from '../src/lib/market-data/yahoo';
import { Redis } from '@upstash/redis';
import { config } from 'dotenv';

// Load .env.local
config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

async function refreshVSME() {
  console.log('Fetching fresh data for VSME...');
  
  const [quote, growth] = await Promise.all([
    getQuote('VSME'),
    getGrowthData('VSME'),
  ]);
  
  if (!quote || !growth) {
    console.error('Failed to fetch VSME data');
    return;
  }
  
  console.log('Fresh data:', { quote, growth });
  
  // Get existing stocks from Redis
  const stocksData = await redis.get<string>('stocks');
  if (!stocksData) {
    console.error('No stocks data in Redis');
    return;
  }
  
  const stocks = typeof stocksData === 'string' ? JSON.parse(stocksData) : stocksData;
  
  // Find and update VSME
  const vsmeIndex = stocks.findIndex((s: any) => s.symbol === 'VSME');
  if (vsmeIndex === -1) {
    console.error('VSME not found in stocks');
    return;
  }
  
  stocks[vsmeIndex] = {
    ...stocks[vsmeIndex],
    price: quote.price,
    growth1d: growth.growth1d,
    growth1m: growth.growth1m,
    growth6m: growth.growth6m,
    growth12m: growth.growth12m,
  };
  
  console.log('Updated VSME:', stocks[vsmeIndex]);
  
  // Save back to Redis
  await redis.set('stocks', JSON.stringify(stocks));
  console.log('VSME refreshed successfully!');
}

refreshVSME();
