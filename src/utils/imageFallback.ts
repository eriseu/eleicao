import { Candidato } from '@/types';

/**
 * Limpa o nome da foto removendo o prefixo do arquivo ZIP se presente.
 */
function cleanFotoPath(foto: string): string {
  if (foto.includes('.zip/')) {
    return foto.split('.zip/')[1];
  }
  return foto;
}

/**
 * Extrai a UF do nome do arquivo padrão do TSE. (Ex: "FRJ19000..." -> "RJ")
 */
function extractUfFromFileName(fileName: string): string | null {
  const match = fileName.match(/^F([A-Za-z]{2})/);
  if (match && match[1]) {
    return match[1].toUpperCase();
  }
  return null;
}

/**
 * Gera a fila de URLs percorrendo o histórico de candidaturas da mais recente até a mais antiga.
 */
export function getPhotoUrls(candidato: Candidato): string[] {
  const { nome_completo } = candidato;
  const vpsBase = process.env.NEXT_PUBLIC_VPS_URL || 'https://f.centraleti.com.br/f';

  const urls: string[] = [];

  // Coleta a candidatura principal/última e a lista de candidaturas anteriores
  const historicoGeral = [
    candidato.ultima_candidatura,
    candidato,
    ...((candidato as any).candidaturas || []),
    ...((candidato as any).historico || [])
  ].filter(Boolean);

  // Percorre todo o histórico buscando fotos válidas no VPS
  historicoGeral.forEach((cand: any) => {
    const ano = cand.ano_eleicao || cand.ano;
    const rawUf = (cand.uf || '').toUpperCase();
    const rawFoto = cand.foto;

    if (!rawFoto || rawFoto === 'avatar.png' || rawFoto === 'avatar' || !ano) return;

    // Se já for uma URL absoluta
    if (rawFoto.startsWith('http')) {
      urls.push(rawFoto);
      return;
    }

    const fotoLimpa = cleanFotoPath(rawFoto);
    const ufDoArquivo = extractUfFromFileName(fotoLimpa);
    const ufEfetiva = ufDoArquivo || rawUf;

    if (ufEfetiva) {
      urls.push(`${vpsBase}/${ano}/${ufEfetiva}/${fotoLimpa}`);
    }

    // Se a UF do banco for diferente da UF do arquivo (ex: BR vs RJ), adiciona como fallback secundário
    if (rawUf && rawUf !== ufEfetiva) {
      urls.push(`${vpsBase}/${ano}/${rawUf}/${fotoLimpa}`);
    }
  });

  // Remove URLs duplicadas preservando a ordem (mais recente -> mais antiga)
  const uniqueUrls = Array.from(new Set(urls));

  // Fallback final: Avatar padrão local
  uniqueUrls.push('/avatar.png');

  if (uniqueUrls.length === 1) {
    console.warn(
      `%c[imageFallback] ${nome_completo} não possui foto em nenhum mandato. Usando avatar padrão.`,
      'color: #ff9800;'
    );
  }

  return uniqueUrls;
}
