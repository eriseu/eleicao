import { Candidato } from '@/types';

/**
 * Gera a fila de tentativas de URLs para a foto do candidato com base na sua candidatura mais recente.
 */
export function getPhotoUrls(candidato: Candidato): string[] {
  const { nome_completo, ultima_candidatura } = candidato;
  const r2Base = process.env.NEXT_PUBLIC_R2_URL;
  const vpsBase = process.env.NEXT_PUBLIC_VPS_URL;

  const urls: string[] = [];

  // Tenta pegar os dados da candidatura de onde eles estiverem disponíveis (achatado ou no objeto filho)
  const candidatura = ultima_candidatura || (candidato as any).candidaturas?.[0] || (candidato as any);
  
  const ano = candidatura.ano_eleicao || (candidato as any).ano;
  const uf = candidatura.uf;
  const sq_candidato = candidatura.sq_candidato || candidatura.sq_candidaturas || (candidato as any).sq_candidato;

  // Se o candidato realmente não tiver nenhuma candidatura vinculada, cai direto no avatar padrão
  if (!ano || !uf || !sq_candidato) {
    console.warn(
      `%c[imageFallback] ${nome_completo} não possui informações de candidatura completas para buscar imagem. Usando avatar padrão.`,
      'color: #ff9800;'
    );
    urls.push('/avatar.png');
    return urls;
  }

  const ufUpper = uf ? uf.toUpperCase() : '';

  console.log(
    `%c[imageFallback] Gerando fila para: ${nome_completo} (Candidatura ativa: ${ano} | ${ufUpper} | SQ: ${sq_candidato})`,
    'color: #00bcd4; font-weight: bold;'
  );

  // 💡 Ajustado: no VPS o caminho usa `/f/` no lugar de `/fotos/`
  const getSubPath = (ext: string, isVps: boolean): string => {
    const pastaBase = isVps ? '' : 'fotos/'; // Se for R2, usa a subpasta 'fotos/'. No VPS, o endpoint já é o '/f'
    
    if (ano === 2006 || ano === 2008) {
      return `${pastaBase}${ano}/${ufUpper}/F${ufUpper}${sq_candidato}_div.${ext}`;
    }
    if (ano >= 2010 && ano <= 2014) {
      return `${pastaBase}${ano}/${ufUpper}/${ufUpper}${sq_candidato}_div.${ext}`;
    }
    // Padrão para eleições recentes (2020, 2022, 2024, 2026)
    return `${pastaBase}${ano}/${ufUpper}/F${ufUpper}${sq_candidato}_div.${ext}`;
  };

  // Escolha das extensões a testar baseado na época histórica do TSE
  let extensoes: string[] = [];
  if (ano === 2006 || ano === 2008) {
    extensoes = ['png'];
  } else if (ano >= 2010 && ano <= 2014) {
    extensoes = ['jpg'];
  } else {
    extensoes = ['jpg', 'jpeg', 'png'];
  }

  // 1ª Prioridade: Cloudflare R2
  if (r2Base) {
    extensoes.forEach((ext) => {
      urls.push(`${r2Base}/${getSubPath(ext, false)}`);
    });
  }

  // 2ª Prioridade: VPS Física (Ex: https://f.centraleti.com.br/f/2024/MT/...)
  if (vpsBase) {
    extensoes.forEach((ext) => {
      urls.push(`${vpsBase}/${getSubPath(ext, true)}`);
    });
  }

  // 3ª Prioridade: Avatar padrão local
  urls.push('/avatar.png');

  console.log(`%c[imageFallback] Fila de tentativas (${urls.length} links):`, 'color: #8bc34a;', urls);

  return urls;
}