'use client';

export default function CandidateError({ reset }: { reset: () => void }) {
  return <section className="mx-auto max-w-md px-4 py-12 pb-28 text-center text-slate-300">
    <h1 className="text-2xl font-bold">Perfil temporariamente indisponível</h1>
    <p className="my-4">Não foi possível consultar os dados agora.</p>
    <button type="button" onClick={reset} className="rounded-xl bg-emerald-500 px-4 py-3 text-slate-950">Tentar novamente</button>
  </section>;
}
