import { Candidato } from '@/types';

/**
 * Trata e extrai a foto e o diretório/UF correto direto do campo `foto`.
 */
export function getPhotoUrls(candidato: Candidato): string[] {
  const vpsBase = process.env.NEXT_PUBLIC_VPS_URL || 'https://f.centraleti.com.br/f';
  
  if (!candidato) return ['/avatar.png'];

  // 1. Tenta pegar a candidatura principal ou mais recente
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

  const rawFoto = cand.foto || (candidato as any).foto;
  const candAno = cand.ano_eleicao || cand.ano || (candidato as any).ano_eleicao;
  const candUf = (cand.uf || (candidato as any).uf || '').toUpperCase();
  const nomeCandidato = (candidato as any).nome || cand.nm_candidato || cand.nome_urna || 'Candidato';

  if (!rawFoto || rawFoto === 'avatar.png' || rawFoto === 'avatar') {
    return ['/avatar.png'];
  }

  if (rawFoto.startsWith('http')) {
    return [rawFoto, '/avatar.png'];
  }

  let anoPasta: string | null = null;
  let ufPasta: string | null = null;
  let nomeArquivo: string = rawFoto.trim();

  // 2. Extrai ANO e UF de dentro da string do zip (ex: foto_cand2024_BA_div.zip/FBA50001907550_div.jpg)
  if (rawFoto.includes('.zip/')) {
    const parts = rawFoto.split('.zip/');
    const zipName = parts[0]; // ex: "foto_cand2024_BA_div"
    nomeArquivo = parts[1].trim(); // ex: "FBA50001907550_div.jpg"

    // Extrai o ANO e UF do padrão: foto_cand{ANO}_{UF}_div
    const matchZip = zipName.match(/foto_cand(\d{4})_(.+?)_div/i);
    if (matchZip) {
      anoPasta = matchZip[1];
      ufPasta = matchZip[2].toUpperCase();
    }
  }

  // 3. Fallbacks para o Ano e UF se não vieram descritos no .zip/
  const anoFinal = anoPasta || (candAno ? String(candAno) : null);

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

  if (!anoFinal) {
    return ['/avatar.png'];
  }

  const urls: string[] = [];

  // 4. Monta a URL exata extraída da própria foto (Garante o ano e UF do próprio arquivo!)
  urls.push(encodeURI(`${vpsBase}/${anoFinal}/${ufFinal}/${nomeArquivo}`));

  // Fallback 1: Caso a UF da pasta div divirja da UF da candidatura
  if (candUf && candUf !== ufFinal) {
    urls.push(encodeURI(`${vpsBase}/${anoFinal}/${candUf}/${nomeArquivo}`));
  }

  // Fallback 2: Caso o Ano da candidatura seja diferente do ano extraído do arquivo
  if (candAno && String(candAno) !== anoFinal) {
    urls.push(encodeURI(`${vpsBase}/${candAno}/${ufFinal}/${nomeArquivo}`));
  }

  urls.push('/avatar.png');

  console.log(`[Fotos Tentativas] ${nomeCandidato} (${anoFinal}) ->`, urls);

  return urls;
}
