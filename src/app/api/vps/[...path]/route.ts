import { proxyVps } from '@/lib/vpsProxy';

type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: Request, { params }: Context) {
  return proxyVps(request, (await params).path);
}
export async function POST(request: Request, { params }: Context) {
  return proxyVps(request, (await params).path);
}
