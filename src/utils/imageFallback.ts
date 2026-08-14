import { Candidato } from '@/types';

function cleanFotoPath(foto: string): string {
  if (!foto) return '';
  const path = foto.includes('.zip/') ? foto.split('.zip/')[1] : foto;
  return path.trim();
}

export function getPhotoUrls(candidato: Candidato): string[] {
  const vpsBase = process.env.NEXT_PUBLIC_VPS_URL || 'https://f.centraleti.com.br/f';
  
  if (!candidato) return ['/avatar.png'];

  // 1. Busca candidatura de MAIOR ANO (mais recente)
  let cand: any = candidato.ultima_candidatura;

  if (!cand && Array.isArray((candidato as any).candidaturas) && (candidato as any).candidaturas.length > 0) {
    const sorted = [...(candidato as any).candidaturas].sort(
      (a: any, b: any) => (b.ano_eleicao || b.ano || 0) - (a.ano_eleicao || a.ano || 0)
    );
    cand = sorted[0];
  }

  // Fallback definitivo garantindo que 'cand' nunca será null/undefined para o TypeScript
  if (!cand) {
    cand = candidato as any;
  }

  const ano = cand.ano_eleicao || cand.ano;
  const rawFoto = cand.foto;
  const rawUf = (cand.uf || '').toUpperCase();
  const nomeCandidato = (candidato as any).nome || cand.nm_candidato || cand.nome_urna || 'Candidato';

  if (!rawFoto || rawFoto === 'avatar.png' || rawFoto === 'avatar' || !ano) {
    return ['/avatar.png'];
  }

  if (rawFoto.startsWith('http')) {
    return [rawFoto, '/avatar.png'];
  }

  const fotoLimpa = cleanFotoPath(rawFoto);
  const upperFoto = fotoLimpa.toUpperCase();

  // 2. Extrai a UF pelo nome do arquivo (ex: FBA..., FBR..., BR...)
  let ufExtraida: string | null = null;
  if (upperFoto.startsWith('FBR') || upperFoto.startsWith('BR')) {
    ufExtraida = 'BR';
  } else if (upperFoto.startsWith('F') && upperFoto.length >= 3) {
    const possivelUf = upperFoto.slice(1, 3);
    if (possivelUf >= 'AA' && possivelUf <= 'ZZ') {
      ufExtraida = possivelUf;
    }
  }

  const ufFinal = ufExtraida || rawUf || 'BR';
  const urls: string[] = [];

  // Tenta a foto oficial (ex: 2018/BA/FBA50000627559_div.jpg)
  urls.push(encodeURI(`${vpsBase}/${ano}/${ufFinal}/${fotoLimpa}`));

  // Se a UF extraída for diferente da UF da candidatura, adiciona como alternativa
  if (rawUf && rawUf !== ufFinal) {
    urls.push(encodeURI(`${vpsBase}/${ano}/${rawUf}/${fotoLimpa}`));
  }

  // Fallback final para imagem padrão local
  urls.push('/avatar.png');

  console.log(`[Fotos Tentativas] ${nomeCandidato} (${ano}) ->`, urls);

  return urls;
}
