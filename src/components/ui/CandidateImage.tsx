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

    let extensoes: string[] = [];
    if (ano === 2006 || ano === 2008) {
      extensoes = ['png'];
    } else if (ano >= 2010 && ano <= 2014) {
      extensoes = ['jpg'];
    } else {
      extensoes = ['jpg', 'jpeg', 'png'];
    }

    const fallbackQueue: string[] = [];
      
      let sqLimpo = String(sq).replace(/\.(jpg|jpeg|png)$/i, '').replace(/_div$/i, '');
      if (sqLimpo.startsWith('F') && sqLimpo.length > 3) {
        sqLimpo = sqLimpo.substring(3);
      }
      

      if (sqLimpo.length > 2 && sqLimpo !== 'avatar') {
      // 1. Anos mais recentes (geralmente 2022, 2024, 2026) que usam a estrutura em fotos.centraleti.com.br
      if (ano >= 2022) {
        fallbackQueue.push(`https://fotos.centraleti.com.br/fotos/${ano}/${uf}/F${uf}${sqLimpo}_div.jpg`);
        fallbackQueue.push(`https://fotos.centraleti.com.br/fotos/${ano}/${uf}/F${uf}${sqLimpo}_div.jpeg`);
      }

      // 2. Anos anteriores (como 2012, 2014, etc.) que utilizam o domínio f.centraleti.com.br/f/... com a letra F
      extensoes.forEach(ext => {
        fallbackQueue.push(`https://f.centraleti.com.br/f/${ano}/${uf}/${uf}${sqLimpo}_div.${ext}`);
      });

      // 3. Formato alternativo sem a letra F (caso existam registros que omitam o prefixo no diretório)
      extensoes.forEach(ext => {
        fallbackQueue.push(`https://f.centraleti.com.br/f/${ano}/${uf}/${uf}${sqLimpo}_div.${ext}`);
      });
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
