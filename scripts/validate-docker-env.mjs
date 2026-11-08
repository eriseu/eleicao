// Fail without printing keys if Compose passes server credentials to the browser.
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !key) {
  throw new Error('Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nos build.args.');
}
let role;
try {
  role = JSON.parse(Buffer.from(key.split('.')[1] || '', 'base64url').toString()).role;
} catch {
  // Supabase publishable keys are not JWTs.
}
if (role === 'service_role' || key.startsWith('sb_secret_')) {
  throw new Error('Use a chave anon/publishable em NEXT_PUBLIC_SUPABASE_ANON_KEY, nunca service_role/secret.');
}
const api = new URL(process.env.NEXT_PUBLIC_VPS_API_URL || '');
if (api.protocol !== 'https:' || api.hostname === 'api-candidaturas') {
  throw new Error('NEXT_PUBLIC_VPS_API_URL deve ser uma URL HTTPS acessível pelo navegador.');
}
