import { ImageResponse } from 'next/og';
import { supabase } from '@/lib/supabaseClient';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const DEFAULT_AVATAR = 'https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/www/public/avatars/01.png';

// Converte a imagem remota em base64 com suporte a Timeout seguro
async function fetchImageAsBase64(url: string): Promise<string> {
  if (!url || url === DEFAULT_AVATAR) return DEFAULT_AVATAR;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'force-cache',
    });
    clearTimeout(timeoutId);

    if (!res.ok) return DEFAULT_AVATAR;

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    clearTimeout(timeoutId);
    return DEFAULT_AVATAR;
  }
}

// Busca as candidaturas do candidato diretamente na API da VPS
async function fetchFotoFromVPS(perfilId: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const vpsApiUrl = process.env.NEXT_PUBLIC_VPS_API_URL || 'https://politica.centraleti.com.br';
    const res = await fetch(`${vpsApiUrl}/api/candidaturas?ids=${perfilId}`, {
      signal: controller.signal,
      cache: 'force-cache',
    });
    clearTimeout(timeoutId);

    if (!res.ok) return DEFAULT_AVATAR;

    const candidaturas = await res.json();
    if (!Array.isArray(candidaturas) || candidaturas.length === 0) return DEFAULT_AVATAR;

    // Ordena da mais recente para a mais antiga
    const sorted = candidaturas.sort((a: any, b: any) => Number(b.ano_eleicao || 0) - Number(a.ano_eleicao || 0));

    // Busca foto válida
    const candComFoto = sorted.find((c: any) => {
      const foto = c.foto || c.sq_candidato;
      if (!foto) return false;
      const fotoStr = String(foto).trim();
      return fotoStr !== '' && !fotoStr.includes('avatar.png');
    }) || sorted[0];

    const photoIdentifier = candComFoto?.foto || candComFoto?.sq_candidato;
    if (!photoIdentifier) return DEFAULT_AVATAR;

    const photoStr = String(photoIdentifier).trim();
    if (photoStr.startsWith('http://') || photoStr.startsWith('https://')) {
      return photoStr;
    }

    return `https://f.centraleti.com.br/f/${photoStr.replace(/^\//, '')}`;
  } catch {
    clearTimeout(timeoutId);
    return DEFAULT_AVATAR;
  }
}

export default async function Image({
  searchParams,
}: {
  searchParams?: Promise<{ c1?: string; c2?: string; uf?: string }>;
}) {
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const c1Id = resolvedSearch?.c1 || '';
  const c2Id = resolvedSearch?.c2 || '';

  let firstPerfil: any = null;
  let secondPerfil: any = null;

  if (c1Id && c2Id) {
    try {
      // 1. Busca os dados dos perfis no Supabase
      const { data: candidates } = await supabase
        .from('perfis_candidatos')
        .select('id, nome_completo, nome_urna')
        .in('id', [c1Id, c2Id]);

      if (candidates && candidates.length > 0) {
        const byId = new Map(candidates.map((c) => [c.id, c]));
        firstPerfil = byId.get(c1Id) || null;
        secondPerfil = byId.get(c2Id) || null;
      }
    } catch (err) {
      console.error('Erro na consulta Supabase OG:', err);
    }
  }

  // 2. Busca URLs de foto na VPS em paralelo
  const [leftPhotoUrl, rightPhotoUrl] = await Promise.all([
    c1Id ? fetchFotoFromVPS(c1Id) : Promise.resolve(DEFAULT_AVATAR),
    c2Id ? fetchFotoFromVPS(c2Id) : Promise.resolve(DEFAULT_AVATAR),
  ]);

  // 3. Converte ambas as fotos em base64 em paralelo
  const [leftImage, rightImage] = await Promise.all([
    fetchImageAsBase64(leftPhotoUrl),
    fetchImageAsBase64(rightPhotoUrl),
  ]);

  const leftName = (firstPerfil?.nome_urna || firstPerfil?.nome_completo || 'Candidato 1').slice(0, 18);
  const rightName = (secondPerfil?.nome_urna || secondPerfil?.nome_completo || 'Candidato 2').slice(0, 18);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #020817 0%, #0f172a 55%, #111827 100%)',
          color: '#fff',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at center, rgba(59,130,246,0.35), transparent 45%)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: 110,
            background: 'linear-gradient(180deg, rgba(15,23,42,0.9), rgba(15,23,42,0))',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '92%' }}>
          <div style={{ width: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                width: 230,
                height: 230,
                borderRadius: 28,
                overflow: 'hidden',
                border: '4px solid rgba(255,255,255,0.22)',
                boxShadow: '0 18px 60px rgba(14,165,233,0.2)',
                backgroundColor: '#0f172a',
                display: 'flex',
              }}
            >
              <img
                src={leftImage}
                alt={leftName}
                width={222}
                height={222}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', maxWidth: 260, lineHeight: 1.2 }}>
              {leftName}
            </div>
          </div>

          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
              border: '6px solid rgba(255,255,255,0.18)',
              boxShadow: '0 20px 50px rgba(249,115,22,0.35)',
              fontSize: 72,
              fontWeight: 900,
              color: '#fff',
              letterSpacing: -8,
            }}
          >
            VS
          </div>

          <div style={{ width: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                width: 230,
                height: 230,
                borderRadius: 28,
                overflow: 'hidden',
                border: '4px solid rgba(255,255,255,0.22)',
                boxShadow: '0 18px 60px rgba(168,85,247,0.2)',
                backgroundColor: '#0f172a',
                display: 'flex',
              }}
            >
              <img
                src={rightImage}
                alt={rightName}
                width={222}
                height={222}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', maxWidth: 260, lineHeight: 1.2 }}>
              {rightName}
            </div>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 56,
            right: 56,
            bottom: 38,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontSize: 22,
            color: 'rgba(255,255,255,0.9)',
          }}
        >
          <span>Duelo Político</span>
          <span>Compare suas escolhas</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
