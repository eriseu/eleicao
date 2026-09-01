import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const DEFAULT_AVATAR = 'https://politica.centraleti.com.br/avatar.png';

function sanitizeImage(src: string | null | undefined) {
  if (!src) return DEFAULT_AVATAR;
  const trimmed = src.trim();
  if (!trimmed) return DEFAULT_AVATAR;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://f.centraleti.com.br/f/${trimmed.replace(/^\//, '')}`;
}

export default async function Image({ params, searchParams }: { params?: Promise<{ slug?: string }>; searchParams?: Promise<{ c1?: string; c2?: string; uf?: string }> }) {
  const resolvedParams = params ? await params : undefined;
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const c1Id = resolvedSearch?.c1 || resolvedParams?.slug || '';
  const c2Id = resolvedSearch?.c2 || '';

  if (!c1Id || !c2Id) {
    notFound();
  }

  let first: any = null;
  let second: any = null;

  try {
    const { data: candidates, error } = await supabase
      .from('perfis_candidatos')
      .select('id, nome_completo, nome_urna, foto, foto_path')
      .in('id', [c1Id, c2Id]);

    if (error) {
      console.error('Erro ao buscar candidatos:', error);
    } else if (candidates && candidates.length > 0) {
      const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
      first = byId.get(c1Id) || null;
      second = byId.get(c2Id) || null;
    }
  } catch (err) {
    console.error('Exceção ao buscar candidatos:', err);
  }

  const leftImage = sanitizeImage(first?.foto || first?.foto_path || null);
  const rightImage = sanitizeImage(second?.foto || second?.foto_path || null);
  const leftName = (first?.nome_urna || first?.nome_completo || 'Candidato 1').slice(0, 18);
  const rightName = (second?.nome_urna || second?.nome_completo || 'Candidato 2').slice(0, 18);

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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '92%', zIndex: 1 }}>
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
              }}
            >
              <img src={leftImage} alt={leftName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', maxWidth: 260, lineHeight: 1.2 }}>{leftName}</div>
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
              }}
            >
              <img src={rightImage} alt={rightName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', maxWidth: 260, lineHeight: 1.2 }}>{rightName}</div>
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
            zIndex: 1,
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
