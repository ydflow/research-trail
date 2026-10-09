const {test} = require('node:test');
const assert = require('node:assert/strict');
const {mkdtempSync, existsSync} = require('node:fs');
const {tmpdir} = require('node:os');
const {resolve, join} = require('node:path');

test('runtime notice closure includes Markdown parser transitive packages and exact versions', async () => {
  const {collectUiNotices} = await import('../scripts/ui-notices.mjs');
  const destination = mkdtempSync(join(tmpdir(), 'research-trail-ui-notices-'));
  const rows = collectUiNotices(resolve(__dirname, '../apps/desktop/package.json'), destination);
  for (const name of ['react', 'react-dom', 'scheduler', 'klinecharts', 'react-markdown', 'remark-gfm', 'micromark', 'unified']) {
    assert.ok(rows.some(row => row.name === name), `Missing ${name}`);
  }
  assert.equal(rows.find(row => row.name === 'react-markdown').version, '10.1.0');
  assert.equal(new Set(rows.map(row => `${row.name}@${row.version}`)).size, rows.length);
  for (const row of rows) {
    assert.ok(row.license_files.length);
    for (const file of row.license_files) assert.ok(existsSync(join(destination, row.name, row.version, file)));
  }
});
