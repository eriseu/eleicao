import { Candidato } from '@/types';

/**
 * Gera a fila de URLs para a foto do candidato utilizando o VPS (incluindo histórico se a foto principal falhar).
 */
export function getPhotoUrls(candidato: Candidato): string[] {
  const vpsBase = process.env.NEXT_PUBLIC_VPS_URL || 'https://f.centraleti.com.br/f';
  const urls: string[] = [];

  // Junta candidatura principal e histórico
  const historicoGeral = [
    candidato.ultima_candidatura,
    candidato,
    ...((candidato as any).candidaturas || []),
    ...((candidato as any).historico || [])
  ].filter(Boolean);

  historicoGeral.forEach((cand: any) => {
    const foto = cand.foto;
    if (!foto || foto === 'avatar.png' || foto === 'avatar') return;

    if (foto.startsWith('http')) {
      urls.push(foto);
    } else if (vpsBase) {
      const fotoPath = foto.startsWith('/') ? foto : `/${foto}`;
      urls.push(`${vpsBase}${fotoPath}`);
    }
  });

  // Remove URLs duplicadas
  const uniqueUrls = Array.from(new Set(urls));

  // Fallback final
  uniqueUrls.push('/avatar.png');

  return uniqueUrls;
}
