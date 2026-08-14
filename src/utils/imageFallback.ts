import { Candidato } from '@/types';

function cleanFotoPath(foto: string): string {
  const path = foto.includes('.zip/') ? foto.split('.zip/')[1] : foto;
  return path.trim();
}

export function getPhotoUrls(candidato: Candidato): string[] {
  const vpsBase = process.env.NEXT_PUBLIC_VPS_URL || 'https://f.centraleti.com.br/f';
  
  const cand = candidato.ultima_candidatura || (candidato as any);
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

  // 1. Extrai a UF do nome do arquivo
  let ufExtraida: string | null = null;
  if (upperFoto.startsWith('FBR') || upperFoto.startsWith('BR')) {
    ufExtraida = 'BR';
  } else if (upperFoto.startsWith('F') && upperFoto.length >= 3) {
    const possivelUf = upperFoto.slice(1, 3);
    if (possivelUf >= 'AA' && possivelUf <= 'ZZ') {
      ufExtraida = possivelUf;
    }
  }

  const urls: string[] = [];

  // Tenta com a UF extraída do arquivo
  if (ufExtraida) {
    urls.push(encodeURI(`${vpsBase}/${ano}/${ufExtraida}/${fotoLimpa}`));
  }

  // Tenta com a UF cadastrada no objeto (se for diferente da extraída)
  if (rawUf && rawUf !== ufExtraida) {
    urls.push(encodeURI(`${vpsBase}/${ano}/${rawUf}/${fotoLimpa}`));
  }

  // Se nada funcionou até aqui e ainda não tentou BR, adiciona pasta BR
  if (ufExtraida !== 'BR' && rawUf !== 'BR') {
    urls.push(encodeURI(`${vpsBase}/${ano}/BR/${fotoLimpa}`));
  }

  // Fallback final
  urls.push('/avatar.png');

  console.log(`[Fotos Tentativas] ${nomeCandidato} (${ano}) ->`, urls);

  return urls;
}
