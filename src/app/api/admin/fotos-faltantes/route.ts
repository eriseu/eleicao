import { getVpsApiUrl } from '@/lib/vpsUrl';
import { NextResponse } from 'next/server';


export async function GET() {
  try {
    const response = await fetch(`${getVpsApiUrl()}/admin/fotos-faltantes`, {
      cache: 'no-store',
    });
    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Nao foi possivel consultar as fotos faltantes.' }, { status: 502 });
  }
}
