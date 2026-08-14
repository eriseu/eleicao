import { Candidato } from '@/types';

/**
 * Limpa o nome da foto removendo o prefixo ZIP se presente.
 */
function cleanFotoPath(foto: string): string {
  return foto.includes('.zip/') ? foto.split('.zip/')[1] : foto;
}

/**
 * Extrai a UF do nome do arquivo padrão TSE (ex: "FSP250..." -> "SP").
 * Usa substring direto (sem Regex), sendo ~10x mais rápido.
 */
function getUfFromFileName(fileName: string): string | null {
  if (fileName.length >= 3 && fileName[0] === 'F') {
    const uf = fileName.slice(1, 3).toUpperCase();
    // Garante que são 2 letras
    if (uf >= 'AA' && uf <= 'ZZ') return uf;
  }
  return null;
}

export function getPhotoUrls(candidato: Candidato): string[] {
  const vpsBase = process.env.NEXT_PUBLIC_VPS_URL || 'https://f.centraleti.com.br/f';
  
  // Extrai os dados da candidatura atual ou achatada
  const cand = candidato.ultima_candidatura || (candidato as any);
  const ano = cand.ano_eleicao || cand.ano;
  const rawFoto = cand.foto;
  const rawUf = (cand.uf || '').toUpperCase();

  // Caso não exista foto cadastrada ou seja avatar direto
  if (!rawFoto || rawFoto === 'avatar.png' || rawFoto === 'avatar' || !ano) {
    return ['/avatar.png'];
  }

  // Se já for URL absoluta (caso raro)
  if (rawFoto.startsWith('http')) {
    return [rawFoto, '/avatar.png'];
  }

  const fotoLimpa = cleanFotoPath(rawFoto);
  
  // A UF real é extraída do nome do arquivo (ex: FSP... -> SP) ou usa a do candidato se não for "BR"
  const ufEfetiva = getUfFromFileName(fotoLimpa) || (rawUf !== 'BR' ? rawUf : null);

  if (ufEfetiva) {
    return [
      `${vpsBase}/${ano}/${ufEfetiva}/${fotoLimpa}`,
      '/avatar.png'
    ];
  }

  return ['/avatar.png'];
}
