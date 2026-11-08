import { getVpsApiUrl } from '@/lib/vpsUrl';
import { NextResponse } from 'next/server';


export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const response = await fetch(`${getVpsApiUrl()}/admin/upload-foto`, {
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
