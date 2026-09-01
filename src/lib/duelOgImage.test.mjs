import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDuelOgImageUrl } from './duelOgImage.ts';

test('gera a URL da imagem de compartilhamento do duelo com os ids dos candidatos', () => {
  const url = buildDuelOgImageUrl('cand-1', 'cand-2', 'SP');

  assert.equal(url, 'https://politica.centraleti.com.br/duelo/opengraph-image?c1=cand-1&c2=cand-2&uf=SP');
});
