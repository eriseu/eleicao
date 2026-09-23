import { NextResponse } from 'next/server';
import { getProfileData } from '@/lib/profileData';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await getProfileData(id);
    if (!data) return NextResponse.json({ error: 'Candidato não encontrado' }, { status: 404 });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
  } catch {
    return NextResponse.json({ error: 'Não foi possível consultar o candidato. Tente novamente.' }, { status: 503 });
  }
}
