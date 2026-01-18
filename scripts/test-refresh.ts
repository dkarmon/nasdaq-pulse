// ABOUTME: Test script to run the refresh process locally.
// ABOUTME: Run with: npx tsx scripts/test-refresh.ts

import { refreshStocksInRange } from "../src/lib/cron/refresh-stocks";

async function main() {
  console.log("Testing stock refresh with Yahoo Finance...\n");

  // Test with just A-C range (smaller set for quick test)
  console.log("Running refresh for A-C range...\n");

  const result = await refreshStocksInRange("A", "C");

  console.log("\n--- Result ---");
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
