import { useState, useEffect } from 'react';
import { getPhotoUrls } from '@/utils/imageFallback';

interface CandidateImageProps {
  candidato: any;
  alt: string;
  className?: string;
}

export default function CandidateImage({ candidato, alt, className }: CandidateImageProps) {
  const [urls, setUrls] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // 1. Pega o valor bruto da foto
    const fotoRaw = candidato.foto || candidato.ultima_candidatura?.foto || candidato.sq_candidato;
    
    // Se por acaso já for um link HTTP completo (ex: banco externo), usamos direto
    if (typeof fotoRaw === 'string' && fotoRaw.startsWith('http')) {
      setUrls([fotoRaw, '/avatar.png']);
      setCurrentIndex(0);
      return;
    }

    // 2. Coletar todas as candidaturas disponíveis para montar uma fila super-resiliente
    // Se a foto de 2026 falhar, ele tentará automaticamente o SQ de 2024, 2022, 2018, etc.
    const candidaturasHistorico = candidato.historico || candidato.candidaturas || [];
    const candidaturaPrincipal = candidato.ultima_candidatura || candidato;
    const listaParaVerificar = [candidaturaPrincipal, ...candidaturasHistorico];

    const fallbackQueue: string[] = [];

    listaParaVerificar.forEach((cand: any) => {
      if (!cand) return;
      
      const ano = cand.ano_eleicao || candidato.ano_eleicao || 2026;
      const uf = cand.uf || candidato.uf || 'BR';
      const sq = cand.sq_candidato || cand.foto;
      
      if (!sq || (typeof sq !== 'string' && typeof sq !== 'number')) return;
      
      // Limpa a string caso seja um nome de arquivo (ex: FCE12345_div.jpg -> 12345)
      let sqLimpo = String(sq).replace(/\.(jpg|jpeg|png)$/i, '').replace(/_div$/i, '');
      if (sqLimpo.startsWith('F') && sqLimpo.length > 3) {
        sqLimpo = sqLimpo.substring(3); // Remove o prefixo "F" e a "UF"
      }

      // Se sobrou um SQ numérico válido, gera as URLs para os servidores de foto
      if (sqLimpo.length > 2 && sqLimpo !== 'avatar') {
        fallbackQueue.push(`https://fotos.centraleti.com.br/fotos/${ano}/${uf}/F${uf}${sqLimpo}_div.jpg`);
        fallbackQueue.push(`https://fotos.centraleti.com.br/fotos/${ano}/${uf}/F${uf}${sqLimpo}_div.jpeg`);
        fallbackQueue.push(`https://f.centraleti.com.br/f/${ano}/${uf}/F${uf}${sqLimpo}_div.jpg`);
      }
    });

    // Remove links duplicados (caso o SQ seja o mesmo em anos diferentes)
    const uniqueQueue = Array.from(new Set(fallbackQueue));
    
    // Adiciona o avatar padrão como último recurso
    uniqueQueue.push('/avatar.png');

    setUrls(uniqueQueue);
    setCurrentIndex(0);
  }, [candidato]);

  // Imprime no console a URL exata que está sendo tentada (ajuda no debug)
  useEffect(() => {
    if (urls.length > 0 && urls[currentIndex]) {
      console.log(`🖼️ Tentando carregar imagem do candidato [${candidato.nome_completo || candidato.nome_urna || 'Desconhecido'}]:`, urls[currentIndex]);
    }
  }, [urls, currentIndex, candidato.nome_completo, candidato.nome_urna]);

  const handleError = () => {
    if (currentIndex < urls.length - 1) {
      console.warn(`❌ Falha ao carregar: ${urls[currentIndex]}. Tentando próximo fallback...`);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const srcAtual = urls[currentIndex] || '/avatar.png';

  return (
    <img
      src={srcAtual}
      alt={alt || "Foto do candidato"}
      className={className}
      onError={handleError}
    />
  );
}
