/**
 * Content validation gate.
 *
 * Errors fail the build. Warnings are printed loudly and do not - they mark
 * things a human should look at, not things that are definitely wrong.
 *
 * Reads the built output of @wff/content, which is the same entry point the
 * video and social pipelines use, so this exercises the real contract.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRepository } from '@wff/content';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_ROOT = path.join(ROOT, 'content');

const repo = await createRepository({ contentRoot: CONTENT_ROOT, now: new Date() });
const issues = await repo.getIssues();

const errors = issues.filter((i) => i.level === 'error');
const warnings = issues.filter((i) => i.level === 'warning');

const byFile = (list) => {
  const map = new Map();
  for (const issue of list) map.set(issue.file, [...(map.get(issue.file) ?? []), issue]);
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
};

const render = (list, heading) => {
  if (list.length === 0) return;
  console.log(`\n${heading}`);
  for (const [file, group] of byFile(list)) {
    console.log(`  ${file}`);
    for (const issue of group) {
      console.log(`    ${issue.path ? `${issue.path}: ` : ''}${issue.message}`);
    }
  }
};

render(warnings, `WARNINGS (${warnings.length}) - look at these, they do not fail the build`);
render(errors, `ERRORS (${errors.length}) - these fail the build`);

const chains = await repo.listChains();
const items = await repo.listItems();
const additives = await repo.listAdditives();

console.log(
  `\ncontent: ${chains.length} chains, ${items.length} items, ${additives.length} additives, ` +
    `${errors.length} errors, ${warnings.length} warnings`,
);

if (errors.length > 0) {
  console.error('\ncontent: FAILED');
  process.exit(1);
}
