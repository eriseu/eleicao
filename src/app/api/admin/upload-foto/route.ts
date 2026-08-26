import { NextResponse } from 'next/server';

const VPS_API_URL = process.env.NEXT_PUBLIC_VPS_API_URL || 'https://api.centraleti.com.br';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const response = await fetch(`${VPS_API_URL}/api/admin/upload-foto`, {
      method: 'POST',
      body: formData,
    });
    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Nao foi possivel enviar a foto.' }, { status: 502 });
  }
}
