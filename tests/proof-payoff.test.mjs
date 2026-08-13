import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const html = await fs.readFile(new URL('../index.html', import.meta.url), 'utf8');

test('Normal mode exposes one session proof reveal after successful inference', () => {
  assert.match(html, /id="normal-proof"[^>]*aria-live="polite"/);
  assert.match(html, /2\.460 sampel gesture/);
  assert.match(html, /5 emosi/);
  assert.match(html, /function revealNormalProof\(\)/);
  assert.match(html, /normalProofShown\s*=\s*true/);
});

test('Intro and Challenge completion blocks expose work and share actions', () => {
  for (const id of [
    'intro-work-link',
    'intro-share-btn',
    'intro-again',
    'go-replay-btn',
    'go-work-link',
    'go-share-btn',
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /data-work-link/);
  assert.match(html, /Sekarang kamu sudah kenal Henry\./);
  assert.match(html, /Data intro tidak disimpan/);
});

test('work links use a truthful portfolio-or-GitHub destination', () => {
  assert.match(html, /PROFILE\.porto\s*\|\|\s*PROFILE\.github/);
  assert.match(html, /Lihat karya Henry/);
  assert.match(html, /Lihat GitHub Henry/);
});

test('all share buttons reuse the generic Catmoji payload', () => {
  assert.match(html, /\['share-btn','intro-share-btn','go-share-btn'\]/);
  assert.match(html, /addEventListener\('click',\s*shareCatmoji\)/);
  const shareMatch = html.match(/const SHARE_MESSAGE\s*=\s*(['"])([\s\S]*?)\1;/);
  assert.ok(shareMatch, 'SHARE_MESSAGE must remain a single static payload');
  assert.doesNotMatch(shareMatch[2], /intro-nama|intro-univ|intro-prodi|intro-semester|score/i);
  assert.match(shareMatch[2], /https:\/\/catmoji\.vercel\.app\//);
});

test('the primary interaction uses a semantic main landmark', () => {
  assert.match(html, /<main id="main">/);
  assert.match(html, /<\/main>/);
});

test('touch targets and reduced-motion treatment are explicit', () => {
  assert.match(html, /\.mode-btn\s*\{[^}]*min-height:44px/s);
  assert.match(html, /#intro-close\s*\{[^}]*min-height:44px/s);
  assert.match(html, /\.maker-mark a\s*\{[^}]*min-height:44px/s);
  assert.match(html, /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(html, /animation-duration:\.01ms!important/);
});
