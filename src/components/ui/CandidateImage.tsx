'use client';

import { useState } from 'react';
import { getPhotoUrls } from '@/utils/imageFallback';

interface CandidateImageProps {
  candidato: unknown;
  alt?: string;
  className?: string;
  priority?: boolean;
}

export default function CandidateImage({ candidato, alt, className, priority = false }: CandidateImageProps) {
  const urls = getPhotoUrls(candidato);
  const sourceKey = urls.join('|');
  return <ResolvedImage key={sourceKey} urls={urls} alt={alt} className={className} priority={priority} />;
}

function ResolvedImage({ urls, alt, className, priority }: { urls: string[]; alt?: string; className?: string; priority: boolean }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const handleError = () => {
    if (currentIndex < urls.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  return (
    // Candidate files have multiple historical fallbacks on an external image service.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={urls[currentIndex] || '/avatar.png'}
      alt={alt || "Foto do candidato"}
      className={className}
      style={{ objectFit: 'cover', objectPosition: 'top center' }}
      onError={handleError}
      referrerPolicy="no-referrer"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
    />
  );
}
