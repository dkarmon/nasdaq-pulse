// ABOUTME: Test script to verify refresh logic works with rate limiting.
// ABOUTME: Tests on a small subset of symbols before running full refresh.

// Load env vars BEFORE any other imports
import { config } from 'dotenv';
config({ path: '.env.local' });

(async () => {
  // Now import modules that depend on env vars
  const { refreshStocksInRange } = await import('../src/lib/cron/refresh-stocks');

  console.log('Testing refresh on range A-A (small test)...\n');

  const result = await refreshStocksInRange('A', 'A');

  console.log('\n=== RESULT ===');
  console.log(JSON.stringify(result, null, 2));

  if (result.failed > 0) {
    console.log(`\nWARNING: ${result.failed} symbols failed out of ${result.totalSymbols}`);
    console.log('Failure rate:', ((result.failed / result.totalSymbols) * 100).toFixed(1) + '%');
  } else {
    console.log('\nSUCCESS: All symbols processed without failures!');
  }
})().catch(console.error);
