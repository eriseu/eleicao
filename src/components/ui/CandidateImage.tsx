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

    const queue = getPhotoUrls(candidato);
    setUrls(queue);
    setCurrentIndex(0);
  }, [candidato]);

  const handleError = () => {
    if (currentIndex < urls.length - 1) {
      console.warn(`❌ Falha no link VPS: ${urls[currentIndex]}. Mudando para o próximo fallback...`);
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
      referrerPolicy="no-referrer" // 👈 Evita o envio de Referer e contorna o bloqueio de CORS do navegador em tags <img>
    />
  );
}
