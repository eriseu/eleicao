import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uf = searchParams.get('uf') || 'BR';
  const municipio = searchParams.get('municipio');

  try {
    const vpsApiUrl = process.env.NEXT_PUBLIC_VPS_API_URL;
    if (!vpsApiUrl) {
      return NextResponse.json({ error: 'VPS URL não configurada' }, { status: 500 });
    }

    const vpsUrl = new URL(`${vpsApiUrl}/api/candidatos-filtrados`);
    vpsUrl.searchParams.append('uf', uf);
    
    // Repassa os cargos exigidos pela API do FastAPI no VPS
    const cargosPadrao = ['PRESIDENTE', 'GOVERNADOR', 'SENADOR', 'DEPUTADO FEDERAL', 'DEPUTADO ESTADUAL', 'PREFEITO', 'VEREADOR'];
    cargosPadrao.forEach(cargo => {
      vpsUrl.searchParams.append('cargos', cargo);
    });

    if (municipio) {
      vpsUrl.searchParams.append('municipio', municipio);
    }

    const response = await fetch(vpsUrl.toString(), {
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Erro no servidor VPS' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro na API interna de proxy:', error);
    return NextResponse.json({ error: 'Falha de comunicação com o VPS' }, { status: 500 });
  }
}
