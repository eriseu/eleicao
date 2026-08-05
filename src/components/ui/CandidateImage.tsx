import { useState, useEffect } from 'react';
import { getPhotoUrls } from '@/utils/imageFallback';

interface CandidateImageProps {
  candidato: any;
  alt: string;
  className?: string;
}

export default function CandidateImage({ candidato, alt, className }: CandidateImageProps) {
  // 🛡️ Busca no array de candidaturas ou histórico a primeira que realmente possua uma foto válida, 
  // caso contrário, recorre à candidatura ativa / mais recente.
  const listaCandidaturas = candidato.candidaturas || candidato.historico || [];
  
  const candidaturaComFotoValida = listaCandidaturas.find((c: any) => 
    c.foto && c.foto.trim() !== '' && !c.foto.includes('avatar.png')
  );

  const candidatura = 
    candidaturaComFotoValida ||
    candidato.ultima_candidatura || 
    candidato.candidaturas?.find((c: any) => c.ano_eleicao === 2026) || 
    candidato.candidaturas?.[0] ||
    candidato;

  const [urls, setUrls] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Se o objeto já possui uma foto direta válida (ex: injetada pelo ranking ou perfil), colocamos ela no topo da fila
    const fotoDireta = candidato.foto || candidatura?.foto;
    const temFotoValidaDireta = fotoDireta && typeof fotoDireta === 'string' && fotoDireta.trim() !== '' && !fotoDireta.includes('avatar.png');

    if (temFotoValidaDireta) {
      setUrls([fotoDireta, '/avatar.png']);
      setCurrentIndex(0);
      return;
    }

    // Caso contrário, gera a fila padrão de fallbacks usando a candidatura escolhida
    const candidatoFake = {
      nome_completo: candidato.nome_completo || candidato.nome_urna,
      ultima_candidatura: candidatura ? {
        ano_eleicao: candidatura.ano_eleicao,
        uf: candidatura.uf || candidato.ultima_candidatura?.uf,
        sq_candidato: candidatura.sq_candidato || candidatura.foto
      } : null
    };

    const photoList = getPhotoUrls(candidatoFake as any);
    setUrls(photoList);
    setCurrentIndex(0);
  }, [candidato, candidatura]);

  // Imprime no console toda vez que tenta carregar uma nova URL da fila
  useEffect(() => {
    if (urls.length > 0 && urls[currentIndex]) {
      console.log(`🖼️ Tentando carregar imagem do candidato [${candidato.nome_completo || candidato.nome_urna}]:`, urls[currentIndex]);
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
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
}
