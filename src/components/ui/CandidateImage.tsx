import { useState, useEffect } from 'react';

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

    const fallbackQueue: string[] = [];

    // Coleta o objeto principal, última candidatura e o array de histórico injetado
    const historicoGeral = [
      candidato,
      candidato.ultima_candidatura,
      ...(candidato.candidaturas || []),
      ...(candidato.historico || [])
    ].filter(Boolean);

    // Itera por cada ano/candidatura encontrada no histórico
    historicoGeral.forEach((cand: any) => {
      const ano = cand.ano_eleicao || 2026;
      const uf = cand.uf || candidato.uf || 'BR';
      const sq = cand.sq_candidato || cand.foto;

      if (!sq) return;

      if (typeof sq === 'string' && sq.startsWith('http')) {
        fallbackQueue.push(sq);
        return;
      }

      let sqLimpo = String(sq).replace(/\.(jpg|jpeg|png)$/i, '').replace(/_div$/i, '');
      if (sqLimpo.startsWith('F') && sqLimpo.length > 3) {
        sqLimpo = sqLimpo.substring(3);
      }

      if (sqLimpo.length > 2 && sqLimpo !== 'avatar') {
        // Adiciona as tentativas para este ano específico
        fallbackQueue.push(`https://fotos.centraleti.com.br/fotos/${ano}/${uf}/F${uf}${sqLimpo}_div.jpg`);
        fallbackQueue.push(`https://fotos.centraleti.com.br/fotos/${ano}/${uf}/F${uf}${sqLimpo}_div.jpeg`);
        fallbackQueue.push(`https://f.centraleti.com.br/f/${ano}/${uf}/F${uf}${sqLimpo}_div.jpg`);
      }
    });

    const uniqueQueue = Array.from(new Set(fallbackQueue));
    uniqueQueue.push('/avatar.png'); // Fallback final

    setUrls(uniqueQueue);
    setCurrentIndex(0);
  }, [candidato]);

  useEffect(() => {
    if (urls.length > 0 && urls[currentIndex]) {
      console.log(`🖼️ Tentando carregar imagem do candidato [${candidato?.nome_completo || candidato?.nome_urna}]:`, urls[currentIndex]);
    }
  }, [urls, currentIndex, candidato]);

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
