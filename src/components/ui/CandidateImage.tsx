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

    if (urlComErro && urlComErro !== '/avatar.png') {
      console.warn(`🚨 [404 Foto Candidato] Falha ao carregar: ${urlComErro}`, {
        candidatoId: candidato?.id,
        nome: candidato?.nome || candidato?.nome_urna,
        urlComErro,
        proximaTentativa: urls[currentIndex + 1] || '/avatar.png'
      });
    }

    if (currentIndex < urls.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  return (
    <img
      src={urls[currentIndex] || '/avatar.png'}
      alt={alt || "Foto do candidato"}
      className={className}
      style={{ objectFit: 'cover', objectPosition: 'top center' }}
      onError={handleError}
      referrerPolicy="no-referrer"
      loading="lazy"
    />
  );
}
