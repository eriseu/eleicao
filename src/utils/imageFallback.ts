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
 * Gera a fila de URLs para a foto do candidato utilizando o VPS.
 */
export function getPhotoUrls(candidato: Candidato): string[] {
  const { nome_completo, ultima_candidatura } = candidato;
  const vpsBase = process.env.NEXT_PUBLIC_VPS_URL;

  const urls: string[] = [];

  // Dados da candidatura (no objeto filho ou achatado)
  const candidatura = ultima_candidatura || (candidato as any);
  const rawFoto = candidatura.foto || (candidato as any).foto;

  // Se houver URL base da VPS e o campo foto preenchido
  if (vpsBase && rawFoto) {
    const fotoLimpa = cleanFotoPath(rawFoto);
    const fotoPath = fotoLimpa.startsWith('/') ? fotoLimpa : `/${fotoLimpa}`;
    urls.push(`${vpsBase}${fotoPath}`);
  } else {
    console.warn(
      `%c[imageFallback] ${nome_completo} não possui foto cadastrada ou NEXT_PUBLIC_VPS_URL não definida. Usando avatar padrão.`,
      'color: #ff9800;'
    );
  }

  // Fallback final: Avatar padrão local
  urls.push('/avatar.png');

  return urls;
}
