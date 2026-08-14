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
    setUrls(getPhotoUrls(candidato));
    setCurrentIndex(0);
  }, [candidato]);

  const handleError = () => {
    // Se a foto na VPS der 404, pula imediatamente para o próximo da fila (avatar.png)
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
