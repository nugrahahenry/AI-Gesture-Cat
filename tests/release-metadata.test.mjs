import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';


const serviceWorker = await fs.readFile(
  new URL('../sw.js', import.meta.url),
  'utf8',
);


test('PWA cache identity follows the v1.8.4 patch release', () => {
  assert.match(
    serviceWorker,
    /const CACHE_NAME = 'catmoji-v1\.8\.4';/,
  );
  assert.match(serviceWorker, /'\/index\.html'/);
  assert.match(
    serviceWorker,
    /key\.startsWith\('catmoji-'\) && key !== CACHE_NAME/,
  );
});
