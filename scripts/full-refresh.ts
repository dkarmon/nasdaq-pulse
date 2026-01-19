// ABOUTME: Full refresh script that runs A-K then L-Z sequentially.
// ABOUTME: Second range starts immediately after first completes.

import { config } from 'dotenv';
config({ path: '.env.local' });

(async () => {
  const { refreshStocksInRange } = await import('../src/lib/cron/refresh-stocks');

  console.log('='.repeat(60));
  console.log('FULL REFRESH STARTED at', new Date().toISOString());
  console.log('='.repeat(60));

  // Run A-K first
  console.log('\n>>> Starting range A-K...\n');
  const resultAK = await refreshStocksInRange('A', 'K');

  console.log('\n>>> Range A-K completed:');
  console.log(`    Processed: ${resultAK.processed}`);
  console.log(`    Failed: ${resultAK.failed}`);
  console.log(`    Duration: ${resultAK.duration}`);

  if (resultAK.failed > 0) {
    console.log(`    Failure rate: ${((resultAK.failed / resultAK.totalSymbols) * 100).toFixed(1)}%`);
  }

  // Run L-Z immediately after
  console.log('\n>>> Starting range L-Z...\n');
  const resultLZ = await refreshStocksInRange('L', 'Z');

  console.log('\n>>> Range L-Z completed:');
  console.log(`    Processed: ${resultLZ.processed}`);
  console.log(`    Failed: ${resultLZ.failed}`);
  console.log(`    Duration: ${resultLZ.duration}`);

  if (resultLZ.failed > 0) {
    console.log(`    Failure rate: ${((resultLZ.failed / resultLZ.totalSymbols) * 100).toFixed(1)}%`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('FULL REFRESH COMPLETED at', new Date().toISOString());
  console.log('='.repeat(60));
  console.log('\nTOTAL SUMMARY:');
  console.log(`  A-K: ${resultAK.processed} ok, ${resultAK.failed} failed (${resultAK.duration})`);
  console.log(`  L-Z: ${resultLZ.processed} ok, ${resultLZ.failed} failed (${resultLZ.duration})`);
  console.log(`  TOTAL: ${resultAK.processed + resultLZ.processed} ok, ${resultAK.failed + resultLZ.failed} failed`);

  const totalFailed = resultAK.failed + resultLZ.failed;
  if (totalFailed > 0) {
    console.log('\n⚠️  WARNING: Some symbols failed to refresh!');
    if (resultAK.errors.length > 0) {
      console.log('\nA-K Errors:', resultAK.errors.slice(0, 10).join(', '));
    }
    if (resultLZ.errors.length > 0) {
      console.log('\nL-Z Errors:', resultLZ.errors.slice(0, 10).join(', '));
    }
  } else {
    console.log('\n✅ SUCCESS: All symbols refreshed without failures!');
  }
})().catch(err => {
  console.error('\n❌ FATAL ERROR:', err);
  process.exit(1);
});
