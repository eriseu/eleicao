export default function DebugPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">Debug - Diagnóstico do Compartilhamento</h1>

        <div className="bg-slate-900 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Variáveis de Ambiente</h2>
          <ul className="space-y-2 text-sm font-mono">
            <li>
              <span className="text-slate-400">NEXT_PUBLIC_SITE_URL:</span>
              <span className="text-emerald-400 ml-2">{process.env.NEXT_PUBLIC_SITE_URL || '(não definida)'}</span>
            </li>
            <li>
              <span className="text-slate-400">NEXT_PUBLIC_VPS_API_URL:</span>
              <span className="text-emerald-400 ml-2">{process.env.NEXT_PUBLIC_VPS_API_URL || '(não definida)'}</span>
            </li>
            <li>
              <span className="text-slate-400">NEXT_PUBLIC_SUPABASE_URL:</span>
              <span className="text-emerald-400 ml-2">{process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Configurada' : '✗ Não definida'}</span>
            </li>
          </ul>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Como Testar o Compartilhamento</h2>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="text-emerald-400 font-semibold">1.</span>
              <span>Acesse <code className="bg-slate-800 px-2 py-1 rounded">/duelo</code> (sem parâmetros)</span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 font-semibold">2.</span>
              <span>Verifique o console do navegador (F12) para erros</span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 font-semibold">3.</span>
              <span>Selecione 2 candidatos usando o autocomplete</span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 font-semibold">4.</span>
              <span>O botão "Compartilhar Duelo" deve ficar ativo (não desabilitado)</span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 font-semibold">5.</span>
              <span>Clique no botão e veja a mensagem de feedback</span>
            </li>
          </ol>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Checklist de Diagnóstico</h2>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" />
              <span>Console do navegador sem erros</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" />
              <span>Candidatos aparecem no autocomplete</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" />
              <span>Botão "Compartilhar Duelo" fica habilitado</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" />
              <span>Link curto gerado com sucesso</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" />
              <span>URL curta funciona quando acessada</span>
            </label>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Logs Esperados (Console)</h2>
          <pre className="text-xs bg-slate-950 p-4 rounded overflow-x-auto text-emerald-300">
{`[Share] Target: /duelo?uf=BR&c1=<id1>&c2=<id2>
[Share] Short URL: https://politica.centraleti.com.br/s/<slug>
✅ Link curto copiado para compartilhar!`}
          </pre>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/duelo"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-6 rounded-lg"
          >
            Ir para Duelo →
          </a>
        </div>
      </div>
    </div>
  );
}
