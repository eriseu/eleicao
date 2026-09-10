import { ImageResponse } from 'next/og';
import { supabase } from '@/lib/supabaseClient';
import { getPhotoUrls } from '@/utils/imageFallback';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const c1Id = searchParams.get('c1') || '';
    const c2Id = searchParams.get('c2') || '';
    const ufParam = searchParams.get('uf') || '';

    let c1Data: any = null;
    let c2Data: any = null;

    if (c1Id && c2Id) {
      // Busca dados completos incluindo candidaturas para montar a URL da foto corretamente
      const { data: candidates } = await supabase
        .from('perfis_candidatos')
        .select('id, nome_completo, nome_urna, candidaturas(*)')
        .in('id', [c1Id, c2Id]);

      if (candidates && candidates.length > 0) {
        const byId = new Map(candidates.map((c) => [c.id, c]));
        c1Data = byId.get(c1Id);
        c2Data = byId.get(c2Id);
      }
    }

    // Injeta a UF da URL caso o objeto do banco não tenha
    if (c1Data && ufParam && !c1Data.uf) c1Data.uf = ufParam;
    if (c2Data && ufParam && !c2Data.uf) c2Data.uf = ufParam;

    const name1 = c1Data?.nome_urna || c1Data?.nome_completo || 'Candidato 1';
    const name2 = c2Data?.nome_urna || c2Data?.nome_completo || 'Candidato 2';

    // Obtém a primeira URL da lista de fallback gerada pela utilidade
    const photo1 = c1Data ? getPhotoUrls(c1Data)[0] : '';
    const photo2 = c2Data ? getPhotoUrls(c2Data)[0] : '';

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://politica.centraleti.com.br';
    const avatarFallback = `${baseUrl}/avatar.png`;

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 80px',
            background: 'linear-gradient(135deg, #020817 0%, #0f172a 55%, #111827 100%)',
            color: '#fff',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Candidato 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '350px' }}>
            <img
              src={photo1 && !photo1.endsWith('/avatar.png') ? photo1 : avatarFallback}
              alt={name1}
              style={{
                width: 180,
                height: 180,
                borderRadius: 90,
                objectFit: 'cover',
                border: '4px solid #38bdf8',
                marginBottom: 20,
              }}
            />
            <div style={{ fontSize: 32, fontWeight: 800, textAlign: 'center' }}>{name1}</div>
          </div>

          {/* VS Badge */}
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
              fontSize: 52,
              fontWeight: 900,
            }}
          >
            VS
          </div>

          {/* Candidato 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '350px' }}>
            <img
              src={photo2 && !photo2.endsWith('/avatar.png') ? photo2 : avatarFallback}
              alt={name2}
              style={{
                width: 180,
                height: 180,
                borderRadius: 90,
                objectFit: 'cover',
                border: '4px solid #f43f5e',
                marginBottom: 20,
              }}
            />
            <div style={{ fontSize: 32, fontWeight: 800, textAlign: 'center' }}>{name2}</div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (e) {
    return new Response(`Erro ao gerar OG Image`, { status: 500 });
  }
}
