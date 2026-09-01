import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildShortLinkUrl,
  decodeShortLinkTarget,
  encodeShortLinkTarget,
} from './shortLink.ts';

test('gera uma URL curta no mesmo domínio e decodifica o destino original', () => {
  const target = '/duelo?uf=SP&c1=123&c2=456';
  const shortUrl = buildShortLinkUrl(target, 'https://politica.centraleti.com.br');

  assert.equal(shortUrl.startsWith('https://politica.centraleti.com.br/s/'), true);
  assert.equal(decodeShortLinkTarget(shortUrl.split('/s/')[1]), target);
  assert.equal(encodeShortLinkTarget(target), shortUrl.split('/s/')[1]);
});
