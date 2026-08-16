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

export function getPhotoUrls(candidato: any): string[] {
  if (!candidato) return ['/avatar.png'];

  const candUfGeral = candidato.uf || '';
  let listaCandidaturas: any[] = [];

  // Extrai o histórico completo e ordena do ano mais recente ao mais antigo
  if (Array.isArray(candidato.candidaturas) && candidato.candidaturas.length > 0) {
    listaCandidaturas = [...candidato.candidaturas].sort(
      (a: any, b: any) => (b.ano_eleicao || b.ano || 0) - (a.ano_eleicao || a.ano || 0)
    );
  } else if (candidato.ultima_candidatura) {
    listaCandidaturas = [candidato.ultima_candidatura];
  } else {
    listaCandidaturas = [candidato];
  }

  const urlsSet = new Set<string>();

  // Adiciona a foto de cada eleição na lista de tentativas
  for (const cand of listaCandidaturas) {
    const url = buildUrlFromCand(cand, candUfGeral);
    if (url) {
      urlsSet.add(url);
    }
  }

  const urlsFinal = Array.from(urlsSet);
  urlsFinal.push('/avatar.png');

  return urlsFinal;
}
