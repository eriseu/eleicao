import { NextResponse } from 'next/server';

const VPS_API_URL = process.env.NEXT_PUBLIC_VPS_API_URL || 'https://api.centraleti.com.br';

export async function GET() {
  try {
    const response = await fetch(`${VPS_API_URL}/api/admin/fotos-faltantes`, {
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
