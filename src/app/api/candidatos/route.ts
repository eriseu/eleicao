import { NextResponse } from 'next/server';
import { normalizeUf } from '@/lib/candidateFilters';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const uf = normalizeUf(params.get('uf')) || 'BR';
  const municipio = (params.get('municipio') || '').trim();

  try {
    const baseUrl = process.env.NEXT_PUBLIC_R2_URL || 'https://fotos.centraleti.com.br';
    const filename = municipio ? `${uf}_${municipio}.json` : `${uf}.json`;
    
    const res = await fetch(`${baseUrl}/candidatos/${filename}`, {
      next: { revalidate: 3600 }
    });

    if (!res.ok) {
      // Tenta carregar o BR.json padrão se a cidade/UF específica não for encontrada
      const brRes = await fetch(`${baseUrl}/candidatos/BR.json`);
      if (brRes.ok) {
        const brData = await brRes.json();
        return NextResponse.json(brData);
      }
      return NextResponse.json([]);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro na rota api/candidatos:', error);
    return NextResponse.json([], { status: 200 });
  }
}
