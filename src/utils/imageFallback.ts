import { Candidato } from '@/types';

/**
 * Limpa o nome da foto removendo o prefixo ZIP se presente.
 */
function cleanFotoPath(foto: string): string {
  return foto.includes('.zip/') ? foto.split('.zip/')[1].trim() : foto.trim();
}

/**
 * Extrai a UF do nome do arquivo padrão TSE (ex: "FSP250..." -> "SP", "BR2800..." -> "BR").
 */
function getUfFromFileName(fileName: string): string | null {
  if (fileName.length >= 3) {
    // Caso seja foto nacional (ex: BR2800...)
    if (fileName.startsWith('BR')) {
      return 'BR';
    }
    // Caso seja foto estadual (ex: FSP..., FRS...)
    if (fileName[0] === 'F') {
      const uf = fileName.slice(1, 3).toUpperCase();
      if (uf >= 'AA' && uf <= 'ZZ') return uf;
    }
  }
  return null;
}

export function getPhotoUrls(candidato: Candidato): string[] {
  const vpsBase = process.env.NEXT_PUBLIC_VPS_URL || 'https://f.centraleti.com.br/f';
  
  const cand = candidato.ultima_candidatura || (candidato as any);
  const ano = cand.ano_eleicao || cand.ano;
  const rawFoto = cand.foto;
  const rawUf = (cand.uf || '').toUpperCase();
  
  const nomeCandidato = (candidato as any).nome || cand.nm_candidato || cand.nome_urna || 'Candidato';

  if (!rawFoto || rawFoto === 'avatar.png' || rawFoto === 'avatar' || !ano) {
    return ['/avatar.png'];
  }

  if (rawFoto.startsWith('http')) {
    return [rawFoto, '/avatar.png'];
  }

  const fotoLimpa = cleanFotoPath(rawFoto);
  
  // Agora detecta tanto 'BR' quanto UFs estaduais via arquivo ou rawUf
  const ufEfetiva = getUfFromFileName(fotoLimpa) || rawUf || 'BR';

  if (ufEfetiva) {
    const rawUrl = `${vpsBase}/${ano}/${ufEfetiva}/${fotoLimpa}`;
    const urlMontada = encodeURI(rawUrl);
    
    console.log(`[Foto Gerada] ${nomeCandidato} -> ${urlMontada}`);

    return [
      urlMontada,
      '/avatar.png'
    ];
  }

  return ['/avatar.png'];
}
