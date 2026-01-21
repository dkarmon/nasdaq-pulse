// Quick script to refresh TLV stocks and pick up new Hebrew names

import { config } from 'dotenv';
config({ path: '.env.local' });

(async () => {
  const { refreshTlvStocks } = await import('../src/lib/cron/refresh-stocks');

  console.log('='.repeat(60));
  console.log('TLV STOCKS REFRESH STARTED at', new Date().toISOString());
  console.log('='.repeat(60));

  const result = await refreshTlvStocks();

  console.log('\n' + '='.repeat(60));
  console.log('TLV STOCKS REFRESH COMPLETED at', new Date().toISOString());
  console.log('='.repeat(60));
  console.log('\nSUMMARY:');
  console.log(`  Processed: ${result.processed}`);
  console.log(`  Failed: ${result.failed}`);
  console.log(`  Duration: ${result.duration}`);
  console.log(`  Total symbols: ${result.totalSymbols}`);

  if (result.failed > 0) {
    console.log(`\n⚠️  WARNING: ${result.failed} symbols failed to refresh!`);
    console.log(`  Failure rate: ${((result.failed / result.totalSymbols) * 100).toFixed(1)}%`);
    if (result.errors.length > 0) {
      console.log(`\nErrors (first 10):`, result.errors.slice(0, 10).join(', '));
    }
  } else {
    console.log('\n✅ SUCCESS: All TLV stocks refreshed with Hebrew names!');
  }
})().catch(err => {
  console.error('\n❌ FATAL ERROR:', err);
  process.exit(1);
});
