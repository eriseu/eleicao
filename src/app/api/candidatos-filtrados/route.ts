import { proxyVps } from '@/lib/vpsProxy';

export async function GET(request: Request) {
  return proxyVps(request, ['candidatos-filtrados']);
}
