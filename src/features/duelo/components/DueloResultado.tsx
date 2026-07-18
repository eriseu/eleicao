interface DueloResultadoProps {
  votos: Record<string, string>;
  aoReiniciar: () => void;
}

export function DueloResultado({ votos, aoReiniciar }: DueloResultadoProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-zinc-800 rounded-2xl border border-gray-100 dark:border-zinc-700 shadow-sm max-w-md mx-auto text-center">
      <div className="text-4xl mb-4">🎉</div>
      <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Duelo Concluído!</h3>
      <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6">
        Você votou em {Object.keys(votos).length} propostas. Seus dados foram salvos!
      </p>
      
      <button
        onClick={aoReiniciar}
        className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-700 dark:hover:bg-zinc-650 text-gray-800 dark:text-white font-medium rounded-xl transition-colors"
      >
        Jogar Novamente
      </button>
    </div>
  );
}
