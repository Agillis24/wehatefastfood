/**
 * Shared stub for scripts whose real implementation lands in a later phase.
 * They exit 0 so `npm run check` is honest about what is and is not built yet,
 * and they say which phase owns them so nobody wonders.
 */
export function pending(name, phase, what) {
  console.log(`${name}: not implemented yet - Phase ${phase} builds it`);
  console.log(`  ${what}`);
  process.exit(0);
}
