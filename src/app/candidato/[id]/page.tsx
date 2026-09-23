import { notFound, permanentRedirect } from 'next/navigation';
import { getProfileData } from '@/lib/profileData';
import CandidateImage from '@/components/ui/CandidateImage';
import Link from 'next/link';

export const revalidate = 300;

function eValido(valor: unknown): boolean {
  if (valor === null || valor === undefined) return false;
  const str = String(valor).trim().toUpperCase();
  return str !== '' && str !== '#NULO' && str !== '#NULO#' && str !== 'NULO' && str !== '#NE#';
}

function calcularIdade(dataNascimento: string | null | undefined): number | null {
  if (!eValido(dataNascimento)) return null;
  const nascimento = new Date(dataNascimento!);
  if (isNaN(nascimento.getTime())) return null;

  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();

  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  return idade;
}

function formatarGenero(genero: string | null | undefined): string | null {
  if (!eValido(genero)) return null;
  const g = String(genero).trim().toUpperCase();
  if (g === 'M' || g === '2') return 'Masculino';
  if (g === 'F' || g === '4') return 'Feminino';
  return String(genero);
}

export default async function Perfil({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getProfileData(id);
  if (!data) notFound();
  if (id !== data.candidato.id) permanentRedirect(`/candidato/${data.candidato.id}`);
  const { candidato, historico: historicoCandidaturas } = data;
  const candAtual = historicoCandidaturas[0] || candidato;
  const anoReferencia = candAtual?.ano_eleicao || candidato?.ano_eleicao || 'Não informado';
  const idade = calcularIdade(candidato.data_nascimento);
  const nrCandidatoAtual = candAtual.nr_candidato || candidato.nr_candidato;

  const nomeExibicao = eValido(candidato.nome_completo) 
    ? candidato.nome_completo 
    : candidato.nome_urna;

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-28 text-slate-100">
      <div className="bg-slate-900 rounded-3xl border border-white/10 shadow-xl p-5 flex flex-col items-center">
        
        <div className="relative">
          <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-950 shadow-lg">
            <CandidateImage 
              candidato={candidato}
              priority
              alt={nomeExibicao || 'Foto do Candidato'} 
              className="w-full h-full object-cover" 
            />
          </div>
        </div>

        <h1 className="text-lg font-black text-white mt-4 text-center leading-tight">
          {nomeExibicao}
        </h1>

        {eValido(candidato.nome_social) && (
          <p className="text-xs font-medium text-slate-400 mt-1 text-center">
            Nome social: <span className="text-slate-200">{candidato.nome_social}</span>
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            {candAtual.cargo || candidato.cargo} • {candAtual.partido || candidato.partido}
          </span>

          {eValido(nrCandidatoAtual) && (
            <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
              Nº {nrCandidatoAtual}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 w-full mt-5 bg-slate-950/50 border border-white/5 p-3 rounded-2xl">
          <div className="text-center border-r border-white/10 pr-2">
            <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Score ELO</span>
            <span className={`text-xl font-black text-emerald-400 transition-opacity duration-300 `}>
              {candidato.elo_score ?? 1200}
            </span>
          </div>
          <div className="text-center pl-2">
            <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Disputas</span>
            <span className={`text-xl font-black text-slate-200 transition-opacity duration-300 `}>
              {candidato.matches_count ?? 0}
            </span>
          </div>
        </div>

        <div className="w-full mt-5 space-y-2 text-xs">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ficha Técnica</h3>

          {(eValido(candAtual.municipio) || eValido(candAtual.uf) || eValido(candidato.uf)) && (
            <div className="flex justify-between items-center bg-slate-950/30 px-3 py-2 rounded-xl border border-white/5">
              <span className="text-slate-400">Município / UF:</span>
              <span className="font-medium text-white uppercase">
                {eValido(candAtual.municipio) ? `${candAtual.municipio} ` : ''}({candAtual.uf || candidato.uf || 'BR'})
              </span>
            </div>
          )}

          {idade !== null && (
            <div className="flex justify-between items-center bg-slate-950/30 px-3 py-2 rounded-xl border border-white/5">
              <span className="text-slate-400">Idade:</span>
              <span className="font-medium text-white">{idade} anos</span>
            </div>
          )}

          {eValido(candidato.genero) && (
            <div className="flex justify-between items-center bg-slate-950/30 px-3 py-2 rounded-xl border border-white/5">
              <span className="text-slate-400">Gênero:</span>
              <span className="font-medium text-white capitalize">{formatarGenero(candidato.genero)}</span>
            </div>
          )}

          {eValido(candidato.cor_raca) && (
            <div className="flex justify-between items-center bg-slate-950/30 px-3 py-2 rounded-xl border border-white/5">
              <span className="text-slate-400">Cor / Raça:</span>
              <span className="font-medium text-white capitalize">{String(candidato.cor_raca).toLowerCase()}</span>
            </div>
          )}

          {eValido(candAtual.ocupacao) && (
            <div className="flex justify-between items-center bg-slate-950/30 px-3 py-2 rounded-xl border border-white/5">
              <span className="text-slate-400">Ocupação:</span>
              <span className="font-medium text-white capitalize truncate max-w-[200px]">
                {String(candAtual.ocupacao).toLowerCase()}
              </span>
            </div>
          )}

          {eValido(candAtual.grau_instrucao) && (
            <div className="flex justify-between items-center bg-slate-950/30 px-3 py-2 rounded-xl border border-white/5">
              <span className="text-slate-400">Grau de Instrução:</span>
              <span className="font-medium text-white capitalize truncate max-w-[200px]">
                {String(candAtual.grau_instrucao).toLowerCase()}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center bg-slate-950/30 px-3 py-2 rounded-xl border border-white/5">
            <span className="text-slate-400">Última Eleição:</span>
            <span className="font-mono font-bold text-emerald-400">{anoReferencia}</span>
          </div>
        </div>

        <div className="w-full mt-5 border-t border-white/10 pt-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Histórico Eleitoral</h3>

          {historicoCandidaturas.length > 0 ? (
            <div className="space-y-2.5">
              {historicoCandidaturas.map((cand, index) => (
                <div key={index} className="bg-slate-950/60 border border-white/5 rounded-2xl p-3 flex items-center gap-3 text-xs">
                  
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-700 bg-slate-900 flex-shrink-0">
                    <CandidateImage 
                      candidato={{ ...cand, candidaturas: historicoCandidaturas }} 
                      alt={cand.nome_urna || candidato.nome_completo || 'Foto do Candidato'} 
                      className="w-full h-full object-cover" 
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-emerald-400">{cand.ano_eleicao}</span>
                        <span className="font-semibold text-white truncate">
                          • {cand.nome_urna || candidato.nome_urna || '-'}
                        </span>
                      </div>

                      {eValido(cand.situacao_candidatura) && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                          {cand.situacao_candidatura}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                      <span className="truncate">
                        {cand.cargo} ({cand.partido})
                        {eValido(cand.nr_candidato) && (
                          <span className="font-mono text-amber-300 ml-1 font-semibold">
                            - Nº {cand.nr_candidato}
                          </span>
                        )}
                      </span>
                      <span className="uppercase text-[10px] text-slate-500 ml-2 whitespace-nowrap">
                        {eValido(cand.municipio) ? `${cand.municipio} - ` : ''}{cand.uf}
                      </span>
                    </div>

                    {eValido(cand.resultado_turno) && (
                      <p className="text-[10px] text-slate-400 font-medium mt-1 border-t border-white/5 pt-1">
                        Resultado: <span className="text-slate-200 capitalize">{String(cand.resultado_turno).toLowerCase()}</span>
                      </p>
                    )}
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-2">Nenhum histórico encontrado.</p>
          )}
        </div>

      </div>

      <div className="text-center mt-5">
        <Link href="/" className="text-xs text-slate-400 hover:text-white underline transition">
          Voltar para Início
        </Link>
      </div>
    </main>
  );
}
