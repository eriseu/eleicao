import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { transpileModule, ModuleKind } from 'typescript';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const url = new URL(specifier + '.ts', context.parentURL);
      if (existsSync(url)) return nextResolve(url.href, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.ts')) return { format: 'module', shortCircuit: true,
      source: transpileModule(readFileSync(fileURLToPath(url), 'utf8'), { compilerOptions: { module: ModuleKind.ESNext } }).outputText };
    return nextLoad(url, context);
  },
});
const { proxyVps } = await import('../src/lib/vpsProxy.ts');
const { getVpsApiUrl } = await import('../src/lib/vpsUrl.ts');
process.env.VPS_API_URL = 'http://api-candidaturas:8000';
test('servidor usa a rede Docker; navegador usa o mesmo domínio', () => {
  assert.equal(getVpsApiUrl(), 'http://api-candidaturas:8000/api');
  globalThis.window = {};
  try { assert.equal(getVpsApiUrl(), '/api/vps'); } finally { delete globalThis.window; }
});
test('preserva filtros repetidos e retorna JSON sem cache', async t => {
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(url.origin, 'http://api-candidaturas:8000');
    assert.deepEqual(url.searchParams.getAll('cargos'), ['PRESIDENTE', 'VICE-PRESIDENTE']);
    assert.equal(init.cache, 'no-store');
    return Response.json(['id-1']);
  });
  const result = await proxyVps(new Request('https://site.test/api/vps/candidatos-filtrados?cargos=PRESIDENTE&cargos=VICE-PRESIDENTE'), ['candidatos-filtrados']);
  assert.deepEqual(await result.json(), ['id-1']);
  assert.equal(result.headers.get('Cache-Control'), 'no-store');
});
test('encaminha consulta POST de candidaturas', async t => {
  const body = JSON.stringify({ perfil_id: 'in.(id-1)' });
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    assert.equal(init.body, body);
    assert.equal(init.method, 'POST');
    return Response.json([]);
  });
  assert.equal((await proxyVps(new Request('https://site.test/api/vps/candidaturas', { method:'POST', body }), ['candidaturas'])).status, 200);
});
test('não expõe rotas administrativas nem caminhos arbitrários', async t => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('não deve chamar upstream'); });
  for (const path of [['admin', 'upload-foto'], ['..', 'admin'], ['candidaturas', '..']]) {
    assert.equal((await proxyVps(new Request('https://site.test'), path)).status, 404);
  }
});
test('falha de rede ou resposta HTML produz 502 JSON', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('connection refused'); });
  let response = await proxyVps(new Request('https://site.test'), ['municipios']);
  assert.equal(response.status, 502);
  assert.match(response.headers.get('content-type'), /application\/json/);
  mock.mock.mockImplementation(async () => new Response('bad gateway', {status:502}));
  response = await proxyVps(new Request('https://site.test'), ['municipios']);
  assert.equal(response.status, 502);
});
