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
    if (!candidato) return;
    const listaUrls = getPhotoUrls(candidato);
    setUrls(listaUrls);
    setCurrentIndex(0);
  }, [candidato]);

  const handleError = () => {
    const urlComErro = urls[currentIndex];

    // Loga no console o 404 e qual será a foto substituta
    if (urlComErro && urlComErro !== '/avatar.png') {
      console.warn(`🚨 [404 Foto Candidato] Falha ao carregar: ${urlComErro}`, {
        candidatoId: candidato?.id,
        nome: candidato?.nome || candidato?.nome_urna,
        urlComErro,
        proximaTentativa: urls[currentIndex + 1] || '/avatar.png'
      });
    }

    // Pula para a próxima foto da lista (histórico anterior ou avatar)
    if (currentIndex < urls.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  return (
    <img
      src={urls[currentIndex] || '/avatar.png'}
      alt={alt || "Foto do candidato"}
      className={className}
      onError={handleError}
      referrerPolicy="no-referrer"
      loading="lazy"
    />
  );
}
