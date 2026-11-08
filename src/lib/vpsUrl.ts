/** Browser requests stay on the site; only the server resolves the Docker hostname. */
export function getVpsApiUrl(): string {
  if (typeof window !== 'undefined') return '/api/vps';
  const base = process.env.VPS_API_URL || process.env.NEXT_PUBLIC_VPS_API_URL || 'https://api.centraleti.com.br';
  return `${base.replace(/\/+$/, '')}/api`;
}
