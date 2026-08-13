import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';


const html = await fs.readFile(new URL('../index.html', import.meta.url), 'utf8');


test('Catmoji uses the canonical Instagram handle', () => {
  assert.match(html, /instagram:\s*'https:\/\/instagram\.com\/hnry\.dev'/);
  assert.match(html, /href="https:\/\/instagram\.com\/hnry\.dev"/);
  assert.match(html, /title="Instagram @hnry\.dev"/);
  assert.match(html, /aria-label="Instagram @hnry\.dev"/);
  assert.doesNotMatch(html, /instagram\.com\/hnrydev|@hnrydev/);
});

