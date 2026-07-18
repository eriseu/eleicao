// Substitua o conteúdo do seu DueloContainer.tsx por este código temporário:
'use client';

import { useDuelo } from '../hooks/useDuelo';

export function DueloContainer() {
  const {
    rodadaAtual,
    rodadaAtualIndex,
    totalRodadas,
    isFinalizado,
    votos,
    votar,
    reiniciar,
  } = useDuelo();

  if (isFinalizado) {
    return (
      <div className="p-8 bg-white rounded-lg shadow text-center max-w-md mx-auto">
        <h3 className="text-xl font-bold">Fim do Duelo!</h3>
        <p className="my-4">Obrigado por votar em {Object.keys(votos).length} propostas.</p>
        <button onClick={reiniciar} className="px-4 py-2 bg-blue-500 text-white rounded">
          Jogar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto p-4">
      <div className="text-center font-bold">
        Rodada {rodadaAtualIndex + 1} de {totalRodadas}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => votar(rodadaAtual.opcaoA.id)}
          className="p-6 bg-white border rounded hover:border-blue-500 transition-all"
        >
          <p className="text-sm text-gray-500 mb-2">Opção A ({rodadaAtual.opcaoA.partido})</p>
          <p>{rodadaAtual.opcaoA.texto}</p>
        </button>

        <button 
          onClick={() => votar(rodadaAtual.opcaoB.id)}
          className="p-6 bg-white border rounded hover:border-blue-500 transition-all"
        >
          <p className="text-sm text-gray-500 mb-2">Opção B ({rodadaAtual.opcaoB.partido})</p>
          <p>{rodadaAtual.opcaoB.texto}</p>
        </button>
      </div>
    </div>
  );
}
