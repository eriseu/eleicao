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
      const fotoRef = cand.foto || cand.sq_candidato;

      if (!fotoRef) return;

      const fotoStr = String(fotoRef).trim();

      if (fotoStr.startsWith('http')) {
        fallbackQueue.push(fotoStr);
        return;
      }

      if (fotoStr && fotoStr !== 'avatar.png' && fotoStr !== 'avatar') {
        // Limpa a extensão atual do nome para podermos testar variações de extensão (.jpg, .jpeg, .png)
        const nomeBase = fotoStr.replace(/\.(jpg|jpeg|png)$/i, '');

        const extensoesPossiveis = ['jpg', 'jpeg', 'png'];

        // Se for de 2022 para frente, testa no domínio fotos.centraleti.com.br
        if (ano >= 2022) {
          extensoesPossiveis.forEach(ext => {
            fallbackQueue.push(`https://fotos.centraleti.com.br/fotos/${ano}/${uf}/${nomeBase}.${ext}`);
          });
        }

        // Testa no domínio f.centraleti.com.br/f/
        extensoesPossiveis.forEach(ext => {
          fallbackQueue.push(`https://f.centraleti.com.br/f/${ano}/${uf}/${nomeBase}.${ext}`);
        });

        // Adiciona também o nome exato original que veio do banco caso ele já possua alguma formatação específica
        if (ano >= 2022) {
          fallbackQueue.push(`https://fotos.centraleti.com.br/fotos/${ano}/${uf}/${fotoStr}`);
        }
        fallbackQueue.push(`https://f.centraleti.com.br/f/${ano}/${uf}/${fotoStr}`);
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
