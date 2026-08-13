'use client';

import Script from 'next/script';
import Head from 'next/head';
import { useEffect, useState, useCallback, useMemo } from 'react';
import CandidateImage from '@/components/ui/CandidateImage';
import { supabase } from '@/lib/supabaseClient';
import type { Candidato } from '@/types';

export default function PlacarEleicaoEmbedPage() {
  const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-R37SS5PQDM';

  const [allCandidates, setAllCandidates] = useState<Candidato[]>([]);
  const [selectedCandidateA, setSelectedCandidateA] = useState<Candidato | null>(null);
  const [selectedCandidateB, setSelectedCandidateB] = useState<Candidato | null>(null);
  const [selectedUF, setSelectedUF] = useState('BR');
  const [loading, setLoading] = useState(true);
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [selectedMunicipio, setSelectedMunicipio] = useState('');

  const AVAILABLE_UFS = ['BR', 'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

  // Carregar candidatos do R2 e elo_score do Supabase
  const loadCandidatesFromR2 = useCallback(async (uf: string) => {
    try {
      setLoading(true);
      const response = await fetch(`https://fotos.centraleti.com.br/candidatos/${uf}.json`);
      
      if (!response.ok) {
        setAllCandidates([]);
        return;
      }

      const data: any[] = await response.json();
      
      // Extrair IDs para buscar elo_score no Supabase
      const candidatoIds = data.map((item: any) => item.id || item.sq_candidato?.toString() || '').filter(Boolean);
      
      // Buscar elo_score do Supabase
      let eloScoreMap: Record<string, number> = {};
      if (candidatoIds.length > 0) {
        try {
          const { data: perfisData } = await supabase
            .from('perfis_candidatos')
            .select('id, elo_score, matches_count')
            .in('id', candidatoIds);
          
          if (perfisData) {
            perfisData.forEach((perfil: any) => {
              eloScoreMap[perfil.id] = perfil.elo_score || 1200;
            });
          }
        } catch (error) {
          console.error('Erro ao buscar elo_score do Supabase:', error);
        }
      }
      
      // Mapear dados do R2 para tipo Candidato, mesclando com elo_score do Supabase
      const candidatos: Candidato[] = data.map((item: any) => {
        const candidatoId = item.id || item.sq_candidato?.toString() || '';
        return {
          id: candidatoId,
          cpf: item.cpf || '',
          titulo_eleitoral: item.titulo_eleitoral || '',
          nome_completo: item.nome_completo || '',
          elo_score: eloScoreMap[candidatoId] || item.elo_score || 1200,
          matches_count: item.matches_count || 0,
          created_at: item.created_at || new Date().toISOString(),
          nome_urna: item.nome_urna || item.nome_completo || '',
          partido: item.partido || item.sg_partido || 'S/P',
          cargo: item.cargo || '',
          uf: item.uf || uf,
          municipio: item.municipio || '',
          foto: item.foto || item.sq_candidato?.toString() || '',
          ano_eleicao: item.ano_eleicao || new Date().getFullYear(),
        };
      });

      setAllCandidates(candidatos);
      
      // Extrair municípios únicos do JSON
      const uniqueMunicipios = Array.from(
        new Set(
          candidatos
            .map(c => c.municipio?.trim())
            .filter((m: string | undefined | null): m is string => Boolean(m) && m?.toUpperCase() !== uf.toUpperCase())
        )
      ).sort() as string[];
      
      setMunicipios(uniqueMunicipios);
      setSelectedMunicipio('');
    } catch (error) {
      console.error('Erro ao carregar candidatos do R2:', error);
      setAllCandidates([]);
      setMunicipios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Recarregar quando UF mudar
  useEffect(() => {
    loadCandidatesFromR2(selectedUF);
  }, [selectedUF, loadCandidatesFromR2]);

  // Filtrar candidatos por municipio (se selecionado)
  const filteredCandidates = useMemo(() => {
    let filtered = allCandidates;
    
    if (selectedMunicipio) {
      filtered = filtered.filter(c => c.municipio?.toUpperCase() === selectedMunicipio.toUpperCase());
    }

    // Ordenar por elo_score (descendente)
    return filtered.sort((a, b) => (b.elo_score || 1200) - (a.elo_score || 1200));
  }, [allCandidates, selectedMunicipio]);

  // Votar em um candidato
  const votarEmCandidato = async (vencedorId: string, perdedorId: string) => {
    try {
      const response = await fetch('/api/duelo/votar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vencedorId,
          perdedorId,
        }),
      });

      if (response.ok) {
        (window as any).trackWidgetEvent('candidate_vote', {
          winner_id: vencedorId,
          loser_id: perdedorId,
        });
      }
    } catch (error) {
      console.error('Erro ao votar:', error);
    }
  };

  return (
    <>
      {/* O Head garante que a tag link seja injetada no <head> do documento */}
      <Head><link rel="stylesheet" href="/css/widget-styles.css" /></Head>

      {/* Scripts do Google Analytics 4 */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_TRACKING_ID}');

          // Função global para rastrear eventos do widget
          function trackWidgetEvent(eventName, eventParams) {
            console.log('GA Event Fired:', eventName, eventParams);
            gtag('event', eventName, eventParams);
          }
          window.trackWidgetEvent = trackWidgetEvent;
        `}
      </Script>

      {/* Estrutura principal do Widget */}
      <div id="election-widget-container" className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-lg">
        <div className="widget-tabs flex gap-4 mb-6">
          <button id="tab-duel" className="active px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">
            Duelo de Candidatos
          </button>
          <button id="tab-ranking" className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600">
            Ranking Regional
          </button>
        </div>

        {/* Visualização Duelo */}
        <div id="view-duel" className="widget-view active">
          <h2 className="text-2xl font-bold mb-4">Duelo de Candidatos</h2>
          
          <div className="mb-4">
            <label className="block mb-2">Selecione o Estado:</label>
            <select
              value={selectedUF}
              onChange={(e) => setSelectedUF(e.target.value)}
              className="w-full p-2 rounded bg-slate-700 text-white"
            >
              {AVAILABLE_UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf === 'BR' ? 'Brasil' : uf}
                </option>
              ))}
            </select>
          </div>

          {selectedUF !== 'BR' && municipios.length > 0 && (
            <div className="mb-4">
              <label className="block mb-2">Selecione o Município (opcional):</label>
              <select
                value={selectedMunicipio}
                onChange={(e) => setSelectedMunicipio(e.target.value)}
                className="w-full p-2 rounded bg-slate-700 text-white"
              >
                <option value="">Todos os municípios</option>
                {municipios.map((municipio) => (
                  <option key={municipio} value={municipio}>
                    {municipio}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="duel-selectors grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block mb-2">1º Candidato:</label>
              <select
                value={selectedCandidateA?.id || ''}
                onChange={(e) => {
                  const cand = filteredCandidates.find(c => c.id === e.target.value);
                  setSelectedCandidateA(cand || null);
                  if (cand) {
                    (window as any).trackWidgetEvent?.('select_candidate_duel', {
                      candidate_name: cand.nome_completo,
                      position: 'left',
                    });
                  }
                }}
                className="w-full p-2 rounded bg-slate-700 text-white"
              >
                <option value="">Selecione o 1º candidato</option>
                {filteredCandidates.map((cand) => (
                  <option key={cand.id} value={cand.id}>
                    {cand.nome_urna || cand.nome_completo} - {cand.cargo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2">2º Candidato:</label>
              <select
                value={selectedCandidateB?.id || ''}
                onChange={(e) => {
                  const cand = filteredCandidates.find(c => c.id === e.target.value);
                  setSelectedCandidateB(cand || null);
                  if (cand) {
                    (window as any).trackWidgetEvent?.('select_candidate_duel', {
                      candidate_name: cand.nome_completo,
                      position: 'right',
                    });
                  }
                }}
                className="w-full p-2 rounded bg-slate-700 text-white"
              >
                <option value="">Selecione o 2º candidato</option>
                {filteredCandidates.map((cand) => (
                  <option key={cand.id} value={cand.id}>
                    {cand.nome_urna || cand.nome_completo} - {cand.cargo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="duel-results">
            {loading ? (
              <p className="text-center">Carregando candidatos...</p>
            ) : selectedCandidateA && selectedCandidateB ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Candidato A */}
                <div className="text-center">
                  <div className="mb-4 h-64 overflow-hidden rounded-lg bg-slate-700">
                    <CandidateImage
                      candidato={selectedCandidateA}
                      alt={selectedCandidateA.nome_completo}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{selectedCandidateA.nome_urna || selectedCandidateA.nome_completo}</h3>
                  <p className="text-sm mb-2">{selectedCandidateA.cargo}</p>
                  {selectedCandidateA.partido && <p className="text-sm text-slate-300 mb-4">{selectedCandidateA.partido}</p>}
                  <button
                    onClick={() => votarEmCandidato(selectedCandidateA.id, selectedCandidateB.id)}
                    className="w-full px-4 py-2 bg-green-600 rounded hover:bg-green-700 font-bold"
                  >
                    Escolher
                  </button>
                </div>

                {/* Candidato B */}
                <div className="text-center">
                  <div className="mb-4 h-64 overflow-hidden rounded-lg bg-slate-700">
                    <CandidateImage
                      candidato={selectedCandidateB}
                      alt={selectedCandidateB.nome_completo}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{selectedCandidateB.nome_urna || selectedCandidateB.nome_completo}</h3>
                  <p className="text-sm mb-2">{selectedCandidateB.cargo}</p>
                  {selectedCandidateB.partido && <p className="text-sm text-slate-300 mb-4">{selectedCandidateB.partido}</p>}
                  <button
                    onClick={() => votarEmCandidato(selectedCandidateB.id, selectedCandidateA.id)}
                    className="w-full px-4 py-2 bg-green-600 rounded hover:bg-green-700 font-bold"
                  >
                    Escolher
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-center text-slate-400">Selecione dois candidatos para comparar.</p>
            )}
          </div>
        </div>

        {/* Visualização Ranking */}
        <div id="view-ranking" className="widget-view hidden">
          <h2 className="text-2xl font-bold mb-4">Ranking Regional</h2>
          
          <div className="mb-4">
            <label className="block mb-2">Selecione o Estado:</label>
            <select
              value={selectedUF}
              onChange={(e) => setSelectedUF(e.target.value)}
              className="w-full p-2 rounded bg-slate-700 text-white"
            >
              {AVAILABLE_UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf === 'BR' ? 'Brasil' : uf}
                </option>
              ))}
            </select>
          </div>

          <div className="ranking-results">
            {loading ? (
              <p className="text-center">Carregando ranking...</p>
            ) : filteredCandidates.length > 0 ? (
              <div className="space-y-2">
                {filteredCandidates.slice(0, 30).map((cand, idx) => (
                  <div key={cand.id} className="flex items-center gap-4 p-3 bg-slate-700 rounded">
                    <div className="font-bold text-lg text-blue-400 w-8">#{idx + 1}</div>
                    <div className="w-16 h-16 rounded overflow-hidden bg-slate-600">
                      <CandidateImage
                        candidato={cand}
                        alt={cand.nome_completo}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold">{cand.nome_urna || cand.nome_completo}</h4>
                      <p className="text-sm text-slate-300">{cand.cargo}</p>
                      {cand.partido && <p className="text-sm text-slate-400">{cand.partido}</p>}
                      {cand.elo_score && <p className="text-sm text-yellow-400">Elo: {Math.round(cand.elo_score)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400">Nenhum candidato no ranking.</p>
            )}
          </div>
        </div>
      </div>

      {/* Carrega a lógica de interatividade do widget */}
      <Script id="tab-switching" strategy="lazyOnload">
        {`
          document.addEventListener('DOMContentLoaded', () => {
            const tabs = document.querySelectorAll('.widget-tabs button');
            const views = document.querySelectorAll('.widget-view');

            tabs.forEach(tab => {
              tab.addEventListener('click', () => {
                // Remove ativo de todos
                tabs.forEach(t => t.classList.remove('active', 'bg-blue-600'));
                views.forEach(v => v.classList.add('hidden'));

                // Ativa o selecionado
                tab.classList.add('active', 'bg-blue-600');
                const targetId = tab.id === 'tab-duel' ? 'view-duel' : 'view-ranking';
                document.getElementById(targetId)?.classList.remove('hidden');
              });
            });
          });
        `}
      </Script>
    </>
  );
}