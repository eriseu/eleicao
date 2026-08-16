import { Candidato } from '@/types';

const vpsBase = process.env.NEXT_PUBLIC_VPS_URL || 'https://f.centraleti.com.br/f';

/**
 * Constrói a URL da imagem no servidor VPS para um objeto de candidatura
 */
function buildUrlFromCand(cand: any, candUfFallback: string): string | null {
  const rawFoto = cand?.foto || cand;
  if (!rawFoto || rawFoto === 'avatar.png' || rawFoto === 'avatar') return null;
  if (typeof rawFoto === 'string' && rawFoto.startsWith('http')) return rawFoto;

  let anoPasta: string | null = null;
  let ufPasta: string | null = null;
  let nomeArquivo: string = String(rawFoto).trim();

  // Extrai ANO e UF caso a string venha no padrão .zip/
  if (nomeArquivo.includes('.zip/')) {
    const parts = nomeArquivo.split('.zip/');
    nomeArquivo = parts[1].trim();
    const matchZip = parts[0].match(/foto_cand(\d{4})_(.+?)_div/i);
    if (matchZip) {
      anoPasta = matchZip[1];
      ufPasta = matchZip[2].toUpperCase();
    }
  }

  const anoFinal = anoPasta || cand?.ano_eleicao || cand?.ano;
  if (!anoFinal) return null;

  if (!ufPasta) {
    const upper = nomeArquivo.toUpperCase();
    if (upper.startsWith('FBR') || upper.startsWith('BR')) {
      ufPasta = 'BR';
    } else if (upper.startsWith('F') && upper.length >= 3) {
      const possivelUf = upper.slice(1, 3);
      if (possivelUf >= 'AA' && possivelUf <= 'ZZ') ufPasta = possivelUf;
    }
  }

  const ufFinal = ufPasta || cand?.uf || candUfFallback || 'BR';
  return encodeURI(`${vpsBase}/${anoFinal}/${ufFinal}/${nomeArquivo}`);
}

/**
 * Gera a lista priorizada de URLs de fotos para a tentativa de carregamento
 */
export function getPhotoUrls(candidatoInput: any): string[] {
  if (!candidatoInput) return ['/avatar.png'];

  const urlsSet = new Set<string>();

  // 1. Tenta a foto direta do objeto recebido
  const urlAtual = buildUrlFromCand(candidatoInput, candidatoInput.uf || '');
  if (urlAtual) {
    urlsSet.add(urlAtual);
  }

  // 2. Procura a lista de candidaturas dentro do próprio objeto ou de um objeto pai (caso tenha sido repassado)
  const listaCandidaturas = 
    candidatoInput.candidaturas || 
    candidatoInput.historico || 
    candidatoInput.candidato_pai?.candidaturas || 
    [];

  if (Array.isArray(listaCandidaturas) && listaCandidaturas.length > 0) {
    // Ordena as candidaturas da mais recente para a mais antiga (ex: 2018 -> 2006)
    const ordenadas = [...listaCandidaturas].sort(
      (a: any, b: any) => (b.ano_eleicao || b.ano || 0) - (a.ano_eleicao || a.ano || 0)
    );

    // Adiciona as URLs de todas as outras candidaturas no conjunto de fallbacks
    for (const cand of ordenadas) {
      const url = buildUrlFromCand(cand, cand.uf || candidatoInput.uf || '');
      if (url) {
        urlsSet.add(url);
      }
    }
  }

  // 3. Fallback final caso nenhuma das tentativas do histórico funcione
  const urlsFinal = Array.from(urlsSet);
  urlsFinal.push('/avatar.png');

  return urlsFinal;
}
