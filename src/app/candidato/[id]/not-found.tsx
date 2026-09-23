import Link from 'next/link';

export default function CandidateNotFound() {
  return <section className="mx-auto max-w-md px-4 py-12 pb-28 text-center text-slate-300">
    <h1 className="text-2xl font-bold">Candidato não encontrado</h1>
    <p className="my-4">Não encontramos um perfil para este endereço.</p>
    <Link className="text-emerald-400 underline" href="/ranking">Consultar o ranking de candidatos</Link>
  </section>;
}
