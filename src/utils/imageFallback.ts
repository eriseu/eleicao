import { Candidato } from '@/types';

function cleanFotoPath(foto: string): string {
  return foto.includes('.zip/') ? foto.split('.zip/')[1] : foto;
}

function getUfFromFileName(fileName: string): string | null {
  if (fileName.length >= 3 && fileName[0] === 'F') {
    const uf = fileName.slice(1, 3).toUpperCase();
    if (uf >= 'AA' && uf <= 'ZZ') return uf;
  }
  return null;
}

export function getPhotoUrls(candidato: Candidato): string[] {
  const vpsBase = process.env.NEXT_PUBLIC_VPS_URL || 'https://f.centraleti.com.br/f';
  
  const cand = candidato.ultima_candidatura || (candidato as any);
  const ano = cand.ano_eleicao || cand.ano;
  const rawFoto = cand.foto;
  const rawUf = (cand.uf || '').toUpperCase();

  // 🔍 LOG PARA INSPECIONAR OS DADOS BRUTOS
  console.log('--- Debug Foto Candidato ---', {
    nome: candidato.nome,
    rawFoto,
    ano,
    rawUf,
    vpsBase
  });

  if (!rawFoto || rawFoto === 'avatar.png' || rawFoto === 'avatar' || !ano) {
    console.log(`[Foto Fallback - Sem Foto/Ano] ${candidato.nome} -> /avatar.png`);
    return ['/avatar.png'];
  }

  if (rawFoto.startsWith('http')) {
    return [rawFoto, '/avatar.png'];
  }

  const fotoLimpa = cleanFotoPath(rawFoto);
  const ufEfetiva = getUfFromFileName(fotoLimpa) || (rawUf !== 'BR' ? rawUf : null);

  if (ufEfetiva) {
    const urlMontada = `${vpsBase}/${ano}/${ufEfetiva}/${fotoLimpa}`;
    
    // 🔍 LOG DA URL FINAL GERADA
    console.log(`[Foto Gerada] ${candidato.nome} -> ${urlMontada}`);

    return [
      urlMontada,
      '/avatar.png'
    ];
  }

  console.log(`[Foto Fallback - Sem UF] ${candidato.nome} -> /avatar.png (ufEfetiva era null)`);
  return ['/avatar.png'];
}
