import { Candidato } from '@/types';

/**
 * Trata e extrai a foto e o diretório/UF correto direto do campo `foto`.
 */
export function getPhotoUrls(candidato: Candidato): string[] {
  const vpsBase = process.env.NEXT_PUBLIC_VPS_URL || 'https://f.centraleti.com.br/f';
  
  if (!candidato) return ['/avatar.png'];

  // 1. Seleciona a candidatura mais recente (maior ano)
  let cand: any = candidato.ultima_candidatura;

  if (!cand && Array.isArray((candidato as any).candidaturas) && (candidato as any).candidaturas.length > 0) {
    const sorted = [...(candidato as any).candidaturas].sort(
      (a: any, b: any) => (b.ano_eleicao || b.ano || 0) - (a.ano_eleicao || a.ano || 0)
    );
    cand = sorted[0];
  }

  if (!cand) {
    cand = candidato as any;
  }

  const ano = cand.ano_eleicao || cand.ano;
  const rawFoto = cand.foto;
  const candUf = (cand.uf || (candidato as any).uf || '').toUpperCase();
  const nomeCandidato = (candidato as any).nome || cand.nm_candidato || cand.nome_urna || 'Candidato';

  if (!rawFoto || rawFoto === 'avatar.png' || rawFoto === 'avatar' || !ano) {
    return ['/avatar.png'];
  }

  if (rawFoto.startsWith('http')) {
    return [rawFoto, '/avatar.png'];
  }

  let ufPasta: string | null = null;
  let nomeArquivo: string = rawFoto.trim();

  // 2. Se a string contiver o padrão .zip/ (ex: foto_cand2018_BR_div.zip/FBR280000601017_div.jpg)
  if (rawFoto.includes('.zip/')) {
    const parts = rawFoto.split('.zip/');
    const zipName = parts[0]; // ex: "foto_cand2018_BR_div"
    nomeArquivo = parts[1].trim(); // ex: "FBR280000601017_div.jpg"

    // Extrai a UF do próprio nome do zip (ex: foto_cand2018_BR_div -> "BR")
    const matchZipUf = zipName.match(/foto_cand\d+_(.+?)_div/i);
    if (matchZipUf && matchZipUf[1]) {
      ufPasta = matchZipUf[1].toUpperCase();
    }
  }

  // 3. Fallbacks de UF caso não tenha vindo no nome do zip
  if (!ufPasta) {
    const upperFoto = nomeArquivo.toUpperCase();
    if (upperFoto.startsWith('FBR') || upperFoto.startsWith('BR')) {
      ufPasta = 'BR';
    } else if (upperFoto.startsWith('F') && upperFoto.length >= 3) {
      const possivelUf = upperFoto.slice(1, 3);
      if (possivelUf >= 'AA' && possivelUf <= 'ZZ') {
        ufPasta = possivelUf;
      }
    }
  }

  const ufFinal = ufPasta || candUf || 'BR';
  const urls: string[] = [];

  // 4. Monta a URL exata do arquivo no servidor
  urls.push(encodeURI(`${vpsBase}/${ano}/${ufFinal}/${nomeArquivo}`));

  // Se houver divergência entre a UF do zip e a UF da candidatura, adiciona fallback
  if (candUf && candUf !== ufFinal) {
    urls.push(encodeURI(`${vpsBase}/${ano}/${candUf}/${nomeArquivo}`));
  }

  urls.push('/avatar.png');

  console.log(`[Fotos Tentativas] ${nomeCandidato} (${ano}) ->`, urls);

  return urls;
}
