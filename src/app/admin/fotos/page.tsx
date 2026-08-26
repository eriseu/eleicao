// app/admin/fotos/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function PainelFotosFaltantes() {
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/fotos-faltantes', { cache: 'no-store' });
      const data = await res.json();
      setLista(data.candidatos || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void carregarDados();
  }, []);

  const handleUpload = async (cand: any, file: File) => {
    const formData = new FormData();
    formData.append('imagem', file);
    formData.append('candidatura_id', cand.candidatura_id);
    formData.append('ano', cand.ano);
    formData.append('uf', cand.uf);
    formData.append('nome_foto', cand.foto_sugerida);

    const res = await fetch('/api/admin/upload-foto', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      setLista((prev) => prev.filter((item) => item.candidatura_id !== cand.candidatura_id));
    } else {
      alert('Falha ao enviar imagem.');
    }
  };

  if (loading) return <p className="p-6 text-white">Carregando fotos faltantes...</p>;

  return (
    <div className="p-6 bg-slate-950 text-slate-100 min-h-screen space-y-4">
      <h1 className="text-xl font-bold">Candidatos sem Foto ({lista.length})</h1>
      {lista.map((item) => (
        <div key={item.candidatura_id} className="p-4 bg-slate-900 rounded-xl border border-white/10 flex justify-between items-center">
          <div className="space-y-1 text-sm">
            <p className="font-bold text-emerald-400">{item.nome_completo} <span className="text-slate-400">({item.nome_urna})</span></p>
            <p className="text-xs text-slate-300">
              <b>CPF:</b> {item.cpf || 'N/A'} | <b>Título:</b> {item.titulo_eleitoral || 'N/A'} | <b>SQ TSE:</b> {item.sq_candidato || 'N/A'}
            </p>
            <p className="text-xs text-slate-400">
              <b>Cargo:</b> {item.cargo} | <b>Partido:</b> {item.partido} | <b>UF/Município:</b> {item.uf} - {item.municipio || 'Estadual/Nacional'} | <b>Ano:</b> {item.ano}
            </p>
            <p className="text-[11px] font-mono text-slate-500">Destino: {item.caminho_vps}</p>
          </div>

          <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg text-xs">
            Subir Foto
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) void handleUpload(item, e.target.files[0]);
              }}
            />
          </label>
        </div>
      ))}
    </div>
  );
}
