import { getVpsApiUrl } from './vpsUrl';

// Only expose the public reads used by the UI. Admin endpoints retain authentication.
export async function proxyVps(request: Request, path: string[]) {
  const endpoint = path.join('/');
  const allowedGet = ['municipios', 'perfis', 'candidatos-filtrados', 'candidatos-completos'];
  const allowed = request.method === 'GET'
    ? allowedGet.includes(endpoint) || (path.length === 2 && path[0] === 'candidaturas' && /^[\w-]+$/.test(path[1]))
    : request.method === 'POST' && endpoint === 'candidaturas';
  if (!allowed) return Response.json({ error: 'Rota não encontrada' }, { status: 404 });

  try {
    const target = new URL(`${getVpsApiUrl()}/${endpoint}`);
    target.search = new URL(request.url).search;
    const response = await fetch(target, {
      method: request.method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: request.method === 'POST' ? await request.text() : undefined,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      return Response.json({ error: 'API de candidaturas indisponível' }, {
        status: response.status >= 500 ? 502 : response.status,
        headers: { 'Cache-Control': 'no-store' },
      });
    }
    return Response.json(await response.json(), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Não foi possível conectar à API de candidaturas' }, {
      status: 502, headers: { 'Cache-Control': 'no-store' },
    });
  }
}
