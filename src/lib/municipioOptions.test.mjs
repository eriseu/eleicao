import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMunicipioOptions,
  buildStateOptions,
  normalizeMunicipioOption,
  normalizeText,
} from './municipioOptions.ts';

test('normaliza valores do tipo AC ACRE e ignora o nome do estado', () => {
  assert.equal(normalizeMunicipioOption('AC ACRE', 'AC'), '');
  assert.equal(normalizeMunicipioOption('Rio Branco', 'AC'), 'Rio Branco');
});

test('coloca a sede do estado no topo do combo e remove duplicatas', () => {
  const options = buildMunicipioOptions([
    'AC ACRE',
    'Rio Branco',
    'Cruzeiro do Sul',
    'Rio Branco',
  ], 'AC');

  assert.deepEqual(options.map((option) => option.label), ['Rio Branco (sede)', 'Cruzeiro do Sul']);
});

test('quando o estado é Brasil, o combo mostra os estados', () => {
  const states = buildStateOptions();
  assert.equal(states[0].value, 'AC');
  assert.match(states[0].label, /Acre/);
  assert.ok(states.some((option) => option.value === 'SP'));
});

test('a comparação de município ignora acentos, espaços e caixa', () => {
  assert.equal(normalizeText('São Luís'), 'SAO LUIS');
  assert.equal(normalizeText(' sao   luis  '), 'SAO LUIS');
  assert.equal(normalizeText('São Luís'), normalizeText('sao luis'));
});
