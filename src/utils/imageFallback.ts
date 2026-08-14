import { Candidato } from '@/types';

/**
 * Limpa o nome da foto removendo o prefixo ZIP se presente.
 */
function cleanFotoPath(foto: string): string {
  return foto.includes('.zip/') ? foto.split('.zip/')[1] : foto;
}

/**
 * Extrai a UF do nome do arquivo (ex: "FSP25000..." -> "SP").
 * Muito mais rápido do que Regex quando executado centenas de vezes em listas/rankings.
 */
function extractUfFromFileName(fileName: string): string | null {
  if (fileName.startsWith('F') && fileName.length >= 3) {
    const uf = fileName.substring(1, 3).toUpperCase();
    if (/^[A-Z]{2}$/.test(uf)) return uf;
  }
  return null;
}

export function getPhotoUrls(candidato: Candidato): string[] {
  const vpsBase = process.env.NEXT_PUBLIC_VPS_URL || 'https://f.centraleti.com.br/f';
  const urls: string[] = [];

  // 1. Coleta apenas fontes únicas de candidaturas sem duplicar o objeto principal
  const candsUnicas = new Map<string, any>();

  // Adiciona a última candidatura se existir
  if (candidato.ultima_candidatura) {
    const key = `${candidato.ultima_candidatura.ano_eleicao}_${candidato.ultima_candidatura.foto}`;
    candsUnicas.set(key, candidato.ultima_candidatura);
  }

  // Adiciona as candidaturas do histórico
  const historico = (candidato as any).candidaturas || (candidato as any).historico || [];
  if (Array.isArray(historico)) {
    historico.forEach((c) => {
      if (c && c.foto) {
        const key = `${c.ano_eleicao || c.ano}_${c.foto}`;
        if (!candsUnicas.has(key)) candsUnicas.set(key, c);
      }
    });
  }

  // Se nada foi adicionado ao Map, tenta o objeto raiz
  if (candsUnicas.size === 0 && (candidato as any).foto) {
    candsUnicas.set(`${(candidato as any).ano}_${(candidato as any).foto}`, candidato);
  }

  // 2. Monta as URLs diretas sem variações desnecessárias
  candsUnicas.forEach((cand) => {
    const ano = cand.ano_eleicao || cand.ano;
    const rawFoto = cand.foto;
    const rawUf = (cand.uf || '').toUpperCase();

    if (!rawFoto || rawFoto === 'avatar.png' || rawFoto === 'avatar' || !ano) return;

    if (rawFoto.startsWith('http')) {
      urls.push(rawFoto);
      return;
    }

    const fotoLimpa = cleanFotoPath(rawFoto);
    // UF do próprio arquivo é a regra absoluta
    const ufEfetiva = extractUfFromFileName(fotoLimpa) || (rawUf !== 'BR' ? rawUf : null);

    if (ufEfetiva) {
      urls.push(`${vpsBase}/${ano}/${ufEfetiva}/${fotoLimpa}`);
    }
  });

  // Fallback final
  urls.push('/avatar.png');

  return urls;
}
