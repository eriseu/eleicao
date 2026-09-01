import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildShortLinkUrl,
  decodeShortLinkTarget,
  encodeShortLinkTarget,
} from './shortLink.ts';

test('gera uma URL curta no mesmo domínio e decodifica o destino original', () => {
  const target = '/duelo?uf=BR&c1=768c71b3-386c-406c-bd0d-dfb53f9e8dfa&c2=5f7662b2-c1c1-4e36-9601-52f6244a41ff';
  const shortUrl = buildShortLinkUrl(target, 'https://politica.centraleti.com.br');
  const slug = shortUrl.split('/s/')[1];

  assert.equal(shortUrl.startsWith('https://politica.centraleti.com.br/s/'), true);
  assert.equal(slug.length < target.length, true, 'o slug curto deve ser menor que o destino original em caminho');
  assert.equal(decodeShortLinkTarget(slug), target);
  assert.equal(encodeShortLinkTarget(target), slug);
});
