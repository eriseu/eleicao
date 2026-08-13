import { Candidato } from '@/types';

/**
 * Limpa o nome da foto removendo o prefixo do arquivo ZIP se presente.
 * Exemplo: "foto_cand2026_ES_div.zip/FES80002531645_div.jpg" -> "FES80002531645_div.jpg"
 */
function cleanFotoPath(foto: string): string {
  if (foto.includes('.zip/')) {
    return foto.split('.zip/')[1];
  }
  return foto;
}

/**
 * Gera a fila de URLs para a foto do candidato utilizando a estrutura do VPS.
 */
export function getPhotoUrls(candidato: Candidato): string[] {
  const { nome_completo, ultima_candidatura } = candidato;
  const vpsBase = process.env.NEXT_PUBLIC_VPS_URL;

  const urls: string[] = [];

  // Dados da candidatura (no objeto filho ou achatado)
  const candidatura = ultima_candidatura || (candidato as any);
  
  const ano = candidatura.ano_eleicao || (candidato as any).ano;
  const uf = candidatura.uf || (candidato as any).uf;
  const rawFoto = candidatura.foto || (candidato as any).foto;

  // Se houver URL base da VPS, ano, UF e o campo foto preenchido
  if (vpsBase && rawFoto && ano && uf) {
    const fotoLimpa = cleanFotoPath(rawFoto);
    const ufUpper = uf.toUpperCase();

    // Composição no formato: {vpsBase}/{ano}/{UF}/{nome_da_foto.jpg}
    urls.push(`${vpsBase}/${ano}/${ufUpper}/${fotoLimpa}`);
  } else {
    console.warn(
      `%c[imageFallback] ${nome_completo} não possui dados completos (VPS/Foto/Ano/UF). Usando avatar padrão.`,
      'color: #ff9800;'
    );
  }

  // Fallback final: Avatar padrão local
  urls.push('/avatar.png');

  return urls;
}
