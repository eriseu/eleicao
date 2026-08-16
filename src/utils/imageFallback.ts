import { Candidato } from '@/types';

const vpsBase = process.env.NEXT_PUBLIC_VPS_URL || 'https://f.centraleti.com.br/f';

function buildUrlFromCand(cand: any, candUfFallback: string): string | null {
  const rawFoto = cand?.foto || cand;
  if (!rawFoto || rawFoto === 'avatar.png' || rawFoto === 'avatar') return null;
  if (typeof rawFoto === 'string' && rawFoto.startsWith('http')) return rawFoto;

  let anoPasta: string | null = null;
  let ufPasta: string | null = null;
  let nomeArquivo: string = String(rawFoto).trim();

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

export function getPhotoUrls(candidatoInput: any): string[] {
  if (!candidatoInput) return ['/avatar.png'];

  // Identifica se foi passado o candidato completo ou um objeto de candidatura individual
  const candidatoPai = candidatoInput.candidato || candidatoInput;
  
  let todasCandidaturas: any[] = [];

  if (Array.isArray(candidatoInput.candidaturas) && candidatoInput.candidaturas.length > 0) {
    todasCandidaturas = candidatoInput.candidaturas;
  } else if (Array.isArray(candidatoPai.candidaturas) && candidatoPai.candidaturas.length > 0) {
    todasCandidaturas = candidatoPai.candidaturas;
  } else {
    todasCandidaturas = [candidatoInput];
  }

  // Ordena o histórico completo da eleição mais recente para a mais antiga (2018 -> 2006)
  const candidaturasOrdenadas = [...todasCandidaturas].sort(
    (a: any, b: any) => (b.ano_eleicao || b.ano || 0) - (a.ano_eleicao || a.ano || 0)
  );

  const urlsSet = new Set<string>();

  // 1. Tenta primeiro a foto da candidatura específica requisitada
  const urlEspecifica = buildUrlFromCand(candidatoInput, candidatoInput.uf || '');
  if (urlEspecifica) {
    urlsSet.add(urlEspecifica);
  }

  // 2. Adiciona as fotos de outros anos do candidato como fallback (da mais recente para a mais antiga)
  for (const cand of candidaturasOrdenadas) {
    const url = buildUrlFromCand(cand, cand.uf || candidatoPai.uf || '');
    if (url) {
      urlsSet.add(url);
    }
  }

  // 3. Avatar genérico como último recurso
  const urlsFinal = Array.from(urlsSet);
  urlsFinal.push('/avatar.png');

  return urlsFinal;
}
