import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { transpileModule, ModuleKind } from 'typescript';
import test from 'node:test';
import assert from 'node:assert/strict';

registerHooks({
  resolve(specifier, context, next) {
    const mocks = {
      'server-only': '',
      'react': 'export const cache = fn => fn;',
      'next/server': 'export class NextResponse extends Response {}',
      '@/lib/sitemap': 'export async function getSitemapManifest() { return [{uf:"mt",pages:2},{uf:"br",pages:1}]; }',
    };
    if (specifier in mocks) return { url: 'data:text/javascript,' + encodeURIComponent(mocks[specifier]), shortCircuit: true };
    if (specifier === 'next/server') specifier = 'next/server.js';
    if (specifier.startsWith('@/')) specifier = pathToFileURL(resolve('src', specifier.slice(2))).href;
    if ((specifier.startsWith('.') || specifier.startsWith('file:')) && context.parentURL?.startsWith('file:')) {
      const url = new URL(specifier, context.parentURL);
      for (const extension of ['', '.ts']) {
        const path = fileURLToPath(url) + extension;
        if (existsSync(path)) return next(pathToFileURL(path).href, context);
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith('.ts')) return { format: 'module', source: transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { module: ModuleKind.ESNext } }).outputText, shortCircuit: true };
    return next(url, context);
  },
});
process.env.NEXT_PUBLIC_SITE_URL = 'https://politica.centraleti.com.br';
process.env.NEXT_PUBLIC_SUPABASE_URL = '';
const { getProfileData } = await import('../src/lib/profileData.ts');
const { GET: profileApi } = await import('../src/app/api/candidato/[id]/route.ts');
const { GET: sitemap } = await import('../src/app/sitemap.xml/route.ts');
const { rankingUrl, normalizePage } = await import('../src/lib/candidateFilters.ts');
const id = '022b4aad-88c4-41f9-b722-1d1abd4e21a8';
const originalFetch = globalThis.fetch;
test.after(() => { globalThis.fetch = originalFetch; });

test('a profile returns public data and ordered history, normalizing its canonical ID', async () => {
  globalThis.fetch = async url => Response.json(String(url).includes('perfis-candidatos')
    ? [{ id, nome_completo: 'Candidato Teste', cpf: 'private', titulo_eleitoral: 'private' }]
    : [{ perfil_id: id, nome_urna: 'Nome antigo', ano_eleicao: 2020 }, { perfil_id: id, nome_urna: 'Nome atual', ano_eleicao: 2024 }]);
  const result = await getProfileData(id.toUpperCase());
  assert.equal(result.candidato.id, id);
  assert.equal(result.candidato.nome_urna, 'Nome atual');
  assert.equal(result.historico[0].ano_eleicao, 2024);
  assert.equal('cpf' in result.candidato, false);
  assert.equal('titulo_eleitoral' in result.candidato, false);
});
test('missing profile is 404; source failure is 503, never a redirect or false 404', async () => {
  const context = { params: Promise.resolve({ id }) };
  globalThis.fetch = async url => Response.json(String(url).includes('perfis-candidatos') ? {id} : []);
  assert.equal((await profileApi(new Request('https://example.com'), context)).status, 404);
  globalThis.fetch = async () => new Response('outage', { status: 502 });
  const response = await profileApi(new Request('https://example.com'), context);
  assert.equal(response.status, 503);
  assert.equal(response.headers.has('location'), false);
});
test('invalid ID is rejected before any source request', async () => {
  globalThis.fetch = async () => { throw new Error('Unexpected fetch'); };
  assert.equal(await getProfileData('../admin'), null);
});
test('sitemap index references leaves, never another state index', async () => {
  const xml = await (await sitemap()).text();
  assert.match(xml, /\/sitemap\/mt\/1.xml/);
  assert.match(xml, /\/sitemap\/mt\/2.xml/);
  assert.match(xml, /\/sitemap\/br\/1.xml/);
  assert.doesNotMatch(xml, /\/sitemap\/mt.xml/);
});
test('ranking pagination has stable filter-aware URLs and bounded page numbers', () => {
  const url = new URL(rankingUrl('MT', 'Cuiabá', 2), 'https://example.com');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.get('municipio'), 'Cuiabá');
  assert.equal(normalizePage('2bad'), 1);
  assert.equal(normalizePage('99999999999999999999'), 1);
});
