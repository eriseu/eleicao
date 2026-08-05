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

    // 1. Coleta todas as fontes possíveis de candidaturas (histórico, array ou objeto único)
    const historicoGeral = [
      candidato,
      candidato.ultima_candidatura,
      ...(candidato.candidaturas || []),
      ...(candidato.historico || [])
    ].filter(Boolean);

    // 2. Itera por todas as candidaturas encontradas (do mais recente para o mais antigo se já vier ordenado)
    historicoGeral.forEach((cand: any) => {
      const ano = cand.ano_eleicao || 2026;
      const uf = cand.uf || candidato.uf || 'BR';
      const sq = cand.sq_candidato || cand.foto;

      if (!sq) return;

      // Se a foto já for uma URL externa completa, adiciona no topo
      if (typeof sq === 'string' && sq.startsWith('http')) {
        fallbackQueue.unshift(sq);
        return;
      }

      // Limpeza do Sequencial do Candidato (SQ)
      let sqLimpo = String(sq).replace(/\.(jpg|jpeg|png)$/i, '').replace(/_div$/i, '');
      if (sqLimpo.startsWith('F') && sqLimpo.length > 3) {
        sqLimpo = sqLimpo.substring(3);
      }

      if (sqLimpo.length > 2 && sqLimpo !== 'avatar') {
        // Adiciona as variações de extensões e servidores para este ano
        fallbackQueue.push(`https://fotos.centraleti.com.br/fotos/${ano}/${uf}/F${uf}${sqLimpo}_div.jpg`);
        fallbackQueue.push(`https://fotos.centraleti.com.br/fotos/${ano}/${uf}/F${uf}${sqLimpo}_div.jpeg`);
        fallbackQueue.push(`https://f.centraleti.com.br/f/${ano}/${uf}/F${uf}${sqLimpo}_div.jpg`);
      }
    });

    // Remove duplicatas mantendo a ordem de prioridade
    const uniqueQueue = Array.from(new Set(fallbackQueue));
    
    // Garante que o avatar padrão seja o último recurso absoluto
    uniqueQueue.push('/avatar.png');

    setUrls(uniqueQueue);
    setCurrentIndex(0);
  }, [candidato]);

  // Log para monitorar qual imagem está sendo testada na fila
  useEffect(() => {
    if (urls.length > 0 && urls[currentIndex]) {
      console.log(`🖼️ Tentando carregar imagem do candidato [${candidato?.nome_completo || candidato?.nome_urna || 'Candidato'}]:`, urls[currentIndex]);
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
