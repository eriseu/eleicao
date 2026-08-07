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

    // Coleta o objeto principal, última candidatura e o histórico
    const historicoGeral = [
      candidato,
      candidato.ultima_candidatura,
      ...(candidato.candidaturas || []),
      ...(candidato.historico || [])
    ].filter(Boolean);

    historicoGeral.forEach((cand: any) => {
      const ano = cand.ano_eleicao || candidato.ano_eleicao || 2026;
      const uf = cand.uf || candidato.uf || 'BR';
      const fotoRef = cand.foto || cand.sq_candidato;

      if (!fotoRef) return;

      let fotoStr = String(fotoRef).trim();

      // 1. Se for URL absoluta, usa diretamente
      if (fotoStr.startsWith('http')) {
        fallbackQueue.push(fotoStr);
        return;
      }

      // Descreve e ignora avatares padrão
      if (fotoStr && fotoStr !== 'avatar.png' && fotoStr !== 'avatar') {
        
        // 2. Extrai o nome do arquivo se o campo contiver o caminho do ZIP (ex: "zip_file.zip/FDF123_div.jpg")
        if (fotoStr.includes('/')) {
          fotoStr = fotoStr.split('/').pop() || fotoStr;
        }

        // 3. Obtém o nome base limpo removendo a extensão (.jpg, .jpeg, .png)
        const nomeBase = fotoStr.replace(/\.(jpg|jpeg|png)$/i, '');
        const extensoesPossiveis = ['jpg', 'jpeg', 'png'];

        // A. Primeiro tenta o NOME EXACTO gravado no campo foto
        if (ano >= 2022) {
          fallbackQueue.push(`https://fotos.centraleti.com.br/fotos/${ano}/${uf}/${fotoStr}`);
        }
        fallbackQueue.push(`https://f.centraleti.com.br/f/${ano}/${uf}/${fotoStr}`);

        // B. Tenta o nome base com variações de extensão (.jpg, .jpeg, .png)
        if (ano >= 2022) {
          extensoesPossiveis.forEach(ext => {
            fallbackQueue.push(`https://fotos.centraleti.com.br/fotos/${ano}/${uf}/${nomeBase}.${ext}`);
          });
        }

        extensoesPossiveis.forEach(ext => {
          fallbackQueue.push(`https://f.centraleti.com.br/f/${ano}/${uf}/${nomeBase}.${ext}`);
        });

        // C. Fallback caso o sq_candidato seja diferente do campo foto
        if (cand.sq_candidato && cand.sq_candidato !== fotoStr) {
          const sqBase = String(cand.sq_candidato).trim();
          extensoesPossiveis.forEach(ext => {
            if (ano >= 2022) {
              fallbackQueue.push(`https://fotos.centraleti.com.br/fotos/${ano}/${uf}/${sqBase}.${ext}`);
            }
            fallbackQueue.push(`https://f.centraleti.com.br/f/${ano}/${uf}/${sqBase}.${ext}`);
          });
        }
      }
    });

    // Remove URLs duplicadas e adiciona a imagem genérica ao final do fallback
    const uniqueQueue = Array.from(new Set(fallbackQueue));
    uniqueQueue.push('/avatar.png');

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
