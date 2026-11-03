'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CandidateImage from '@/components/ui/CandidateImage';
import { AVAILABLE_UFS } from '@/constants/elections';
import { buildMunicipioOptions, getStateNameFromUf } from '@/lib/municipioOptions';
import { rankingUrl } from '@/lib/candidateFilters';
import { VPS_API_PROXY } from '@/lib/vpsClient';
import type { RankingData } from '@/lib/rankingData';

export default function RankingClient({ data, uf, municipio, highlight }: {
  data: RankingData; uf: string; municipio: string; highlight: string;
}) {
  const router = useRouter();
  const [municipios, setMunicipios] = useState<Array<{ value: string; label: string }>>([]);
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    if (uf === 'BR') return;
    const controller = new AbortController();
    fetch(`${VPS_API_PROXY}/municipios?${new URLSearchParams({ uf })}`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Municípios indisponíveis'); return response.json(); })
      .then(items => { if (!controller.signal.aborted) setMunicipios(buildMunicipioOptions(items, uf)); })
      .catch(() => { if (!controller.signal.aborted) setFeedback('Não foi possível carregar os municípios.'); });
    return () => controller.abort();
  }, [uf]);
  useEffect(() => {
    if (highlight) document.getElementById(`ranking-${highlight}`)?.scrollIntoView({ block: 'center' });
  }, [highlight]);
  async function share() {
    const url = new URL(rankingUrl(uf, municipio, data.page), window.location.origin).toString();
    try {
      if (navigator.share) await navigator.share({ title: 'Ranking Duelo Político', url });
      else { await navigator.clipboard.writeText(url); setFeedback('Link copiado!'); }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setFeedback('Não foi possível compartilhar.');
    }
  }
  const scope = [municipio, getStateNameFromUf(uf)].filter(Boolean).join(' · ');
  return <main className="min-h-screen bg-slate-950 pb-28 text-slate-100">
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Ranking</p>
        <h1 className="mt-2 text-3xl font-black">Ranking de candidatos — {scope}</h1>
        <p className="mt-3 text-sm text-slate-400">Classificação pelas escolhas dos participantes nos duelos do site. Não representa pesquisa de intenção de voto.</p>
      </header>
      <section aria-label="Filtros do ranking" className="mb-6 grid gap-3 rounded-3xl border border-white/10 bg-slate-900 p-4 sm:grid-cols-2">
        <label className="text-sm">Estado
          <select value={uf} onChange={event => router.push(rankingUrl(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3">
            {AVAILABLE_UFS.map(value => <option key={value} value={value}>{getStateNameFromUf(value)}</option>)}
          </select>
        </label>
        <label className="text-sm">Município
          <select value={municipio} disabled={uf === 'BR'} onChange={event => router.push(rankingUrl(uf, event.target.value))} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 disabled:opacity-50">
            <option value="">Todos os municípios</option>
            {municipio && !municipios.some(item => item.value === municipio) && <option value={municipio}>{municipio}</option>}
            {municipios.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </section>
      {data.featured && !data.ranking.some(candidate => candidate.id === data.featured?.id) && (
        <aside id={`ranking-${data.featured.id}`} className="mb-4 rounded-3xl border border-emerald-400 bg-emerald-500/10 p-4">
          <p className="text-xs font-bold uppercase text-emerald-300">Candidato em destaque</p>
          <Link className="mt-2 block font-bold underline" href={`/candidato/${data.featured.id}`}>{data.featured.nome_completo}</Link>
          <p className="mt-1 text-sm text-slate-300">{data.featured.elo_score} ELO · {data.featured.matches_count} disputas</p>
        </aside>
      )}
      <section aria-label="Candidatos" className="space-y-3">
        {data.ranking.map((candidate, index) => <Link key={candidate.id} id={`ranking-${candidate.id}`} href={`/candidato/${candidate.id}`}
          className={`flex items-center gap-4 rounded-3xl border p-4 hover:bg-slate-800 ${highlight === candidate.id ? 'border-emerald-400 bg-emerald-500/10' : 'border-white/10 bg-slate-900'}`}>
          <span className="text-sm font-bold text-emerald-300">{(data.page - 1) * 10 + index + 1}º</span>
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-800"><CandidateImage candidato={candidate} alt={candidate.nome_completo} priority={index === 0} className="h-full w-full object-cover" /></div>
          <div className="min-w-0 flex-1"><h2 className="font-bold">{candidate.nome_completo}</h2><p className="text-xs text-slate-400">{candidate.cargo} · {candidate.partido}</p><p className="text-xs text-slate-400">{candidate.municipio} {candidate.uf}</p></div>
          <div className="text-right"><strong className="text-emerald-300">{candidate.elo_score ?? 1200}</strong><span className="block text-xs text-slate-400">ELO</span><span className="block text-xs text-slate-400">{candidate.matches_count ?? 0} disputas</span></div>
        </Link>)}
        {!data.ranking.length && <p className="rounded-2xl bg-slate-900 p-6 text-center text-slate-400">Nenhum candidato encontrado para esse filtro.</p>}
      </section>
      <nav aria-label="Paginação do ranking" className="mt-6 flex items-center justify-between gap-3">
        {data.page > 1 ? <Link className="rounded-xl border border-slate-700 px-4 py-3" href={rankingUrl(uf, municipio, data.page - 1)}>Anterior</Link> : <span className="px-4 text-slate-600">Anterior</span>}
        <span>Página {data.page}</span>
        {data.hasMore ? <Link className="rounded-xl border border-slate-700 px-4 py-3" href={rankingUrl(uf, municipio, data.page + 1)}>Próxima</Link> : <span className="px-4 text-slate-600">Próxima</span>}
      </nav>
      <div className="my-6 text-center"><button type="button" onClick={share} className="rounded-full bg-emerald-500 px-6 py-3 font-bold text-slate-950">Compartilhar ranking</button><p role="status" className="mt-2 text-sm text-slate-400">{feedback}</p></div>
      <nav aria-label="Rankings por estado" className="mt-8 border-t border-white/10 pt-4">
        <h2 className="mb-3 font-semibold">Explore os estados</h2>
        <div className="flex flex-wrap gap-3">{AVAILABLE_UFS.map(value => <Link key={value} href={rankingUrl(value)} prefetch={false} className="text-sm text-emerald-400 underline">{getStateNameFromUf(value)}</Link>)}</div>
      </nav>
    </div>
  </main>;
}
