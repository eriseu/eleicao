import { useState, useEffect } from 'react';
import { getPhotoUrls } from '@/utils/imageFallback';

interface CandidateImageProps {
  candidato: any;
  alt: string;
  className?: string;
}

export default function CandidateImage({ candidato, alt, className }: CandidateImageProps) {
  // 🛡️ Extração resiliente: Funciona com o objeto tratado/achatado E com o objeto bruto do Supabase
  const candidatura = 
    candidato.ultima_candidatura || 
    candidato.candidaturas?.find((c: any) => c.ano_eleicao === 2024) || 
    candidato.candidaturas?.[0];
  
  // Tenta pegar o nome do arquivo de foto de onde quer que ele esteja guardado
  const fotoArquivo = candidatura?.foto || candidato.foto || candidato.sq_candidato;

  const [urls, setUrls] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Criamos um objeto temporário simulando a estrutura que o getPhotoUrls() exige para ler
    const candidatoFake = {
      nome_completo: candidato.nome_completo || candidato.nome_urna,
      ultima_candidatura: candidatura ? {
        ano_eleicao: candidatura.ano_eleicao,
        uf: candidatura.uf,
        sq_candidato: candidatura.sq_candidato || candidatura.foto
      } : null
    };

    // 🎯 PASSANDO O OBJETO CORRETO (um único argumento)
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

  // Se a fila de URLs falhar totalmente ou estiver vazia, garante a exibição direta do avatar padrão
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
