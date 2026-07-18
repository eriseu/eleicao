interface DueloPlacarProps {
  atual: number;
  total: number;
}

export function DueloPlacar({ atual, total }: DueloPlacarProps) {
  const porcentagem = (atual / total) * 100;

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
        <span>Progresso do Duelo</span>
        <span>{atual} de {total}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
        <div 
          className="bg-emerald-500 h-full transition-all duration-300 ease-out"
          style={{ width: `${porcentagem}%` }}
        />
      </div>
    </div>
  );
}
