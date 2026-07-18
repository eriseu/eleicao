// Substitua o conteúdo do seu DueloContainer.tsx por este código temporário:
'use client';

import { useDuelo } from '../hooks/useDuelo';

export function DueloContainer() {
  const { enviarVoto, votando, dueloVotado, novosScores } = useDuelo();

  return (
    <div className="p-6 max-w-md mx-auto">
      <h3 className="text-lg font-bold">Duelo (temporário)</h3>
      <p className="text-sm text-gray-500">Componente temporário usando a API de `useDuelo`.</p>

      <div className="mt-4 flex gap-4">
        <button
          onClick={() => void enviarVoto('opcaoA', 'opcaoB', 1)}
          disabled={votando}
          className="px-4 py-2 bg-white border rounded hover:border-blue-500 transition-all"
        >
          Votar Opção A
        </button>

        <button
          onClick={() => void enviarVoto('opcaoB', 'opcaoA', 2)}
          disabled={votando}
          className="px-4 py-2 bg-white border rounded hover:border-blue-500 transition-all"
        >
          Votar Opção B
        </button>
      </div>

      {dueloVotado !== null && (
        <p className="mt-4 text-sm text-green-600">Você votou na opção {dueloVotado}.</p>
      )}

      {novosScores && (
        <p className="mt-2 text-sm text-slate-700">Scores atualizados: {novosScores.c1} — {novosScores.c2}</p>
      )}
    </div>
  );
}
