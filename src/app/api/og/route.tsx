import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { getSocialCandidate } from '@/lib/socialCandidate';
import { getPhotoUrls } from '@/utils/imageFallback';
import { getStateNameFromUf } from '@/lib/municipioOptions';

export const runtime = 'nodejs';
const options = { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } };

async function localImage(name: 'avatar.png' | 'politica.centraleti.com.br.png') {
  const data = name === 'avatar.png'
    ? await readFile(path.join(process.cwd(), 'public/avatar.png'))
    : await readFile(path.join(process.cwd(), 'public/politica.centraleti.com.br.png'));
  return `data:image/png;base64,${data.toString('base64')}`;
}

async function candidateImage(id: string) {
  const candidate = await getSocialCandidate(id);
  // Resolve fallbacks before rendering: ImageResponse cannot run an img onError handler.
  for (const url of getPhotoUrls(candidate).filter(url => /^https?:\/\//.test(url)).slice(0, 6)) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (!response.ok) continue;
      const data = await sharp(Buffer.from(await response.arrayBuffer())).resize(360, 360, { fit: 'cover' }).png().toBuffer();
      return { name: candidate?.nome_urna || candidate?.nome_completo || 'Candidato', photo: `data:image/png;base64,${data.toString('base64')}` };
    } catch { /* Try the next election photo. */ }
  }
  return { name: candidate?.nome_urna || candidate?.nome_completo || 'Candidato', photo: await localImage('avatar.png') };
}

export async function GET(request: Request) {
  const { searchParams: params } = new URL(request.url);
  const id = params.get('candidato');
  const c1 = params.get('c1');
  const c2 = params.get('c2');
  if (id || (c1 && c2)) {
    const candidates = await Promise.all((id ? [id] : [c1!, c2!]).map(candidateImage));
    return new ImageResponse(
      <div style={{ display: 'flex', width: '100%', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #020817, #172554)', color: 'white', padding: 40 }}>
        <div style={{ fontSize: 30, marginBottom: 32 }}>DUELO POLÍTICO</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          {candidates.map((candidate, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
              {index === 1 && <div style={{ display: 'flex', margin: '0 24px', fontSize: 64, fontWeight: 700, color: '#fb923c' }}>VS</div>}
              <div style={{ display: 'flex', width: candidates.length === 1 ? 900 : 430, flexDirection: 'column', alignItems: 'center' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={candidate.photo} alt="" width={280} height={280} style={{ borderRadius: 140, objectFit: 'cover', border: '5px solid #38bdf8' }} />
                <div style={{ display: 'flex', fontSize: 34, textAlign: 'center', marginTop: 24 }}>{candidate.name}</div>
              </div>
            </div>
          ))}
        </div>
      </div>, options,
    );
  }
  const background = await localImage('politica.centraleti.com.br.png');
  const uf = (params.get('uf') || 'BR').toUpperCase();
  const municipio = uf === 'BR' ? '' : (params.get('municipio') || '').slice(0, 100);
  return new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', background: '#020817' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={background} alt="" width={1200} height={630} style={{ objectFit: 'cover' }} />
      {params.get('tipo') === 'ranking' && (
        <div style={{ display: 'flex', position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '30px 50px', flexDirection: 'column', background: 'rgba(2,8,23,0.92)', color: 'white' }}>
          <div style={{ fontSize: 26, color: '#38bdf8' }}>RANKING DE CANDIDATOS</div>
          <div style={{ fontSize: 46, marginTop: 8 }}>{getStateNameFromUf(uf)}</div>
          {municipio && <div style={{ fontSize: 38, marginTop: 6 }}>{municipio}</div>}
        </div>
      )}
    </div>, options,
  );
}
