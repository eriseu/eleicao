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
      candidato.ultima_candidatura,
      candidato,
      ...(candidato.candidaturas || []),
      ...(candidato.historico || [])
    ].filter(Boolean);

    historicoGeral.forEach((cand: any) => {
      // ⚠️ IMPORTANTE: Usa estritamente o ano da candidatura real. Não usa fallback de ano futuro!
      const ano = cand.ano_eleicao || candidato.ano_eleicao;
      const uf = cand.uf || candidato.uf || 'BR';
      const fotoRef = cand.foto || cand.sq_candidato;

      if (!fotoRef || !ano) return;

      let fotoStr = String(fotoRef).trim();

      // Se já for URL absoluta (http/https)
      if (fotoStr.startsWith('http')) {
        fallbackQueue.push(fotoStr);
        return;
      }

      // Despreza valores de avatar padrão
      if (fotoStr && fotoStr !== 'avatar.png' && fotoStr !== 'avatar') {
        
        // Remove caminhos do ZIP se existirem (ex: "zip_file.zip/FDF123_div.jpg")
        if (fotoStr.includes('/')) {
          fotoStr = fotoStr.split('/').pop() || fotoStr;
        }

        const nomeBase = fotoStr.replace(/\.(jpg|jpeg|png)$/i, '');
        const extensoesPossiveis = ['jpg', 'jpeg', 'png'];

        // A. Primeiro tenta a CDN com o NOME EXATO no ANO REAL da candidatura
        if (Number(ano) >= 2022) {
          fallbackQueue.push(`https://fotos.centraleti.com.br/fotos/${ano}/${uf}/${fotoStr}`);
        }
        fallbackQueue.push(`https://f.centraleti.com.br/f/${ano}/${uf}/${fotoStr}`);

        // B. Tenta o nome base com as extensões conhecidas no ANO REAL
        if (Number(ano) >= 2022) {
          extensoesPossiveis.forEach(ext => {
            fallbackQueue.push(`https://fotos.centraleti.com.br/fotos/${ano}/${uf}/${nomeBase}.${ext}`);
          });
        }

        extensoesPossiveis.forEach(ext => {
          fallbackQueue.push(`https://f.centraleti.com.br/f/${ano}/${uf}/${nomeBase}.${ext}`);
        });

        // C. Fallback caso precise consultar via sq_candidato
        if (cand.sq_candidato && cand.sq_candidato !== fotoStr) {
          const sqBase = String(cand.sq_candidato).trim();
          extensoesPossiveis.forEach(ext => {
            if (Number(ano) >= 2022) {
              fallbackQueue.push(`https://fotos.centraleti.com.br/fotos/${ano}/${uf}/${sqBase}.${ext}`);
            }
            fallbackQueue.push(`https://f.centraleti.com.br/f/${ano}/${uf}/${sqBase}.${ext}`);
          });
        }
      }
    });

    // Remove URLs duplicadas e define a imagem genérica ao final da fila
    const uniqueQueue = Array.from(new Set(fallbackQueue));
    uniqueQueue.push('/avatar.png');

    setUrls(uniqueQueue);
    setCurrentIndex(0);
  }, [candidato]);

  useEffect(() => {
    if (urls.length > 0 && urls[currentIndex]) {
      console.log(`🖼️ Carregando imagem [${candidato?.nome_completo || candidato?.nome_urna}]:`, urls[currentIndex]);
    }
  }, [urls, currentIndex, candidato]);

  const handleError = () => {
    if (currentIndex < urls.length - 1) {
      console.warn(`❌ Falha no link: ${urls[currentIndex]}. Testando próximo...`);
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
