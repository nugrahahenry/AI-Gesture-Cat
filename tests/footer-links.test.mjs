import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';


const html = await fs.readFile(new URL('../index.html', import.meta.url), 'utf8');


test('Catmoji sends maker and work links to the live portfolio', () => {
  const configScript = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .find((script) => script.includes('const PROFILE ='));
  assert.ok(configScript, 'profile configuration script must exist');

  const workLinks = [
    { href: '', textContent: '', setAttribute(name, value) { this[name] = value; } },
    { href: '', textContent: '', setAttribute(name, value) { this[name] = value; } },
  ];
  const makerLink = { href: '' };
  const document = {
    querySelectorAll(selector) {
      assert.equal(selector, '[data-work-link]');
      return workLinks;
    },
    getElementById(id) {
      assert.equal(id, 'mk-name');
      return makerLink;
    },
  };

  vm.runInNewContext(`${configScript}\nconfigureWorkLinks();`, { document });

  assert.equal(makerLink.href, 'https://hnry.dev');
  for (const link of workLinks) {
    assert.equal(link.href, 'https://hnry.dev');
    assert.equal(link.textContent, 'Lihat karya Henry');
    assert.equal(link['aria-label'], 'Lihat karya Henry');
  }
});


test('Catmoji uses the canonical Instagram handle', () => {
  assert.match(html, /instagram:\s*'https:\/\/instagram\.com\/hnry\.dev'/);
  assert.match(html, /href="https:\/\/instagram\.com\/hnry\.dev"/);
  assert.match(html, /title="Instagram @hnry\.dev"/);
  assert.match(html, /aria-label="Instagram @hnry\.dev"/);
  assert.doesNotMatch(html, /instagram\.com\/hnrydev|@hnrydev/);
});
