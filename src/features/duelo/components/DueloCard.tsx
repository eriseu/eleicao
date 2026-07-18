// src/features/duelo/components/DueloCard.tsx
interface DueloCardProps {
  nome: string;
  partido: string;
  cargo: string;
  fotoUrl: string;
  novoElo?: number;
  foiSelecionado?: boolean;
  algumVotado?: boolean;
  aoVotar: () => void;
}

export function DueloCard({
  nome,
  partido,
  cargo,
  fotoUrl,
  novoElo,
  foiSelecionado,
  algumVotado,
  aoVotar
}: DueloCardProps) {
  return (
    <div 
      onClick={aoVotar}
      className={`flex flex-col items-center p-6 bg-white dark:bg-zinc-800 rounded-2xl border-2 transition-all cursor-pointer
        ${foiSelecionado ? 'border-emerald-500 scale-102' : 'border-gray-200 dark:border-zinc-700'}
        ${algumVotado && !foiSelecionado ? 'opacity-50' : 'hover:border-blue-500'}
      `}
    >
      <img src={fotoUrl} alt={nome} className="w-40 h-40 rounded-full object-cover mb-4" />
      <h3 className="text-xl font-bold">{nome}</h3>
      <p className="text-sm text-gray-500">{cargo} • {partido}</p>

      {/* Mostra o resultado do cálculo Elo que veio do banco */}
      {novoElo && (
        <span className="mt-4 text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">
          Novo Elo: {novoElo} pts
        </span>
      )}
    </div>
  );
}
