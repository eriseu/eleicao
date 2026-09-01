import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL ausente' }, { status: 400 });
    }

    const base = 'https://tinyurl.com/api-create.php?url=' + encodeURIComponent(url);
    const response = await fetch(base, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'tinyurl failed' }, { status: 502 });
    }

    const shortUrl = await response.text();
    if (!shortUrl || !/^https?:\/\//i.test(shortUrl.trim())) {
      return NextResponse.json({ error: 'shortener retorno inválido' }, { status: 502 });
    }

    return NextResponse.json({ url: shortUrl.trim() });
  } catch (error: any) {
    console.error('Erro ao encurtar URL:', error);
    return NextResponse.json({ error: 'Falha ao encurtar URL' }, { status: 500 });
  }
}
