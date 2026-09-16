// Run without a Next build: node --max-old-space-size=256 --test tests/og-metadata.test.mjs
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { transpileModule, ModuleKind, JsxEmit } from 'typescript';
import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NEXT_PUBLIC_SITE_URL = 'https://politica.centraleti.com.br';
const empty = 'export default function Component() { return null; }';
const mocks = {
  'react/jsx-runtime': 'export const jsx = () => null; export const jsxs = jsx; export const Fragment = null;',
  'react': 'export const cache = fn => fn; export const Suspense = () => null;',
  '@/lib/supabaseClient': `export const supabase = { from() { return { select() { return this }, eq() { return this }, async in(column, ids) { return {data: ids.map(id => ({id, nome_completo: id}))} }, async maybeSingle() { return {data: {id: 'test-id', nome_completo: 'Candidato Teste'}} } } } };`,
  '@/lib/vpsClient': `export async function fetchCandidaturasFromVPS() { return [{perfil_id: 'test-id', nome_urna: 'Teste', ano_eleicao: 2024, uf: 'MT', municipio: 'Cuiabá'}] }`,
  '@/components/layout/BottomNav': empty,
  'next/script': empty,
  'next/navigation': `export function redirect(url) { throw new Error(url) } export function notFound() { throw new Error('404') }`,
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './supabaseClient') specifier = '@/lib/supabaseClient';
    if (specifier === './vpsClient') specifier = '@/lib/vpsClient';
    if (mocks[specifier] || specifier.endsWith('Client') || specifier.endsWith('.css')) {
      return { url: 'data:text/javascript,' + encodeURIComponent(mocks[specifier] || empty), shortCircuit: true };
    }
    if (specifier.startsWith('@/')) specifier = pathToFileURL(resolve('src', specifier.slice(2))).href;
    if ((specifier.startsWith('.') || specifier.startsWith('file:')) && context.parentURL?.startsWith('file:')) {
      const url = new URL(specifier, context.parentURL);
      for (const extension of ['', '.ts', '.tsx']) {
        const filename = fileURLToPath(url) + extension;
        if (existsSync(filename)) return nextResolve(pathToFileURL(filename).href, context);
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (/\.tsx?$/.test(url)) {
      const source = transpileModule(readFileSync(new URL(url), 'utf8'), {
        compilerOptions: { module: ModuleKind.ESNext, jsx: JsxEmit.ReactJSX },
      }).outputText;
      return { format: 'module', source, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

const { generateMetadata: ranking } = await import('../src/app/ranking/page.tsx');
const { generateMetadata: candidate } = await import('../src/app/candidato/[id]/layout.tsx');
const { generateMetadata: duel } = await import('../src/app/duelo/page.tsx');
const { generateMetadata: root } = await import('../src/app/layout.tsx');
const { generateMetadata: short } = await import('../src/app/s/[slug]/page.tsx');

function image(metadata) {
  assert.equal(metadata.twitter.card, 'summary_large_image');
  assert.equal(metadata.openGraph.images[0].url, metadata.twitter.images[0]);
  return new URL(metadata.openGraph.images[0].url);
}
test('raiz usa imagem padrão pública', async () => {
  assert.equal(image(await root()).pathname, '/api/og');
});
test('perfil referencia a imagem do candidato', async () => {
  const meta = await candidate({ params: Promise.resolve({ id: 'test-id' }) });
  assert.equal(image(meta).searchParams.get('candidato'), 'test-id');
});
test('duelo preserva os dois candidatos e usa uma rota existente', async () => {
  const url = image(await duel({ searchParams: Promise.resolve({ c1: 'one', c2: 'two', uf: 'MT' }) }));
  assert.equal(url.pathname, '/api/og');
  assert.equal(url.searchParams.get('c1'), 'one');
  assert.equal(url.searchParams.get('c2'), 'two');
});
test('ranking inclui estado e município na imagem e na URL canônica', async () => {
  const meta = await ranking({ searchParams: Promise.resolve({ uf: 'MT', municipio: 'Cuiabá' }) });
  const url = image(meta);
  assert.equal(url.searchParams.get('tipo'), 'ranking');
  assert.equal(url.searchParams.get('uf'), 'MT');
  assert.equal(url.searchParams.get('municipio'), 'Cuiabá');
  assert.equal(new URL(meta.alternates.canonical).searchParams.get('municipio'), 'Cuiabá');
});
test('ranking nacional também tem imagem', async () => {
  assert.equal(image(await ranking({ searchParams: Promise.resolve({}) })).searchParams.get('uf'), 'BR');
});
test('link curto de ranking tem a mesma imagem do destino', async () => {
  const target = '/ranking?uf=MT&municipio=Cuiab%C3%A1';
  const meta = await short({ params: Promise.resolve({ slug: Buffer.from(target).toString('base64url') }) });
  assert.equal(image(meta).searchParams.get('municipio'), 'Cuiabá');
});

test('link curto de duelo usa a rota OG com os dois candidatos', async () => {
  const target = '/duelo?c1=one&c2=two&uf=MT';
  const meta = await short({ params: Promise.resolve({ slug: Buffer.from(target).toString('base64url') }) });
  const url = image(meta);
  assert.equal(url.pathname, '/api/og');
  assert.equal(url.searchParams.get('c1'), 'one');
  assert.equal(url.searchParams.get('c2'), 'two');
});
