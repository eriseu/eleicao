'use client';

import Script from 'next/script';
import Head from 'next/head';
import { useEffect, useState, useCallback } from 'react';
import CandidateImage from '@/components/ui/CandidateImage';
import type { Candidato } from '@/types';

export default function PlacarEleicaoEmbedPage() {
  const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-R37SS5PQDM';
  const VPS_API_URL = process.env.NEXT_PUBLIC_VPS_API_URL || 'https://vps-api.centraleti.com.br';

  const [candidatesList, setCandidatesList] = useState<Candidato[]>([]);
  const [selectedCandidateA, setSelectedCandidateA] = useState<Candidato | null>(null);
  const [selectedCandidateB, setSelectedCandidateB] = useState<Candidato | null>(null);
  const [rankingList, setRankingList] = useState<Candidato[]>([]);
  const [selectedUF, setSelectedUF] = useState('BR');
  const [loading, setLoading] = useState(true);
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [selectedMunicipio, setSelectedMunicipio] = useState('');

  const AVAILABLE_UFS = ['BR', 'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

  // Carregar candidatos do R2
  const loadCandidates = useCallback(async (uf: string) => {
    try {
      setLoading(true);
      const response = await fetch(`https://fotos.centraleti.com.br/candidatos/${uf}.json`);
      
      if (!response.ok) {
        setCandidatesList([]);
        return;
      }

      const data: Candidato[] = await response.json();
      setCandidatesList(data);

      // Pega o ranking dos candidatos
      const rankingResp = await fetch(`${VPS_API_URL}/api/candidatos-filtrados?uf=${uf}&limit=30`);
      if (rankingResp.ok) {
        const rankingData = await rankingResp.json();
        setRankingList(rankingData || []);
      }
    } catch (error) {
      console.error('Erro ao carregar candidatos:', error);
      setCandidatesList([]);
    } finally {
      setLoading(false);
    }
  }, [VPS_API_URL]);

  // Carregar municípios quando UF mudar
  useEffect(() => {
    if (selectedUF === 'BR') {
      setMunicipios([]);
      setSelectedMunicipio('');
      loadCandidates('BR');
      return;
    }

    const loadMunicipios = async () => {
      try {
        const response = await fetch(`${VPS_API_URL}/api/municipios?uf=${selectedUF}`);
        if (response.ok) {
          const data = await response.json();
          const uniqueMunicipios = Array.from(
            new Set((data || [])
              .map((item: any) => (typeof item === 'string' ? item : item.municipio)?.trim())
              .filter((m: string | null | undefined): m is string => Boolean(m) && m?.toUpperCase() !== selectedUF.toUpperCase()))
          ).sort() as string[];
          setMunicipios(uniqueMunicipios);
        }
      } catch (error) {
        console.error('Erro ao carregar municípios:', error);
      }
    };

    loadMunicipios();
    loadCandidates(selectedUF);
  }, [selectedUF, VPS_API_URL, loadCandidates]);

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

        // Recarregar ranking
        try {
          const rankingResp = await fetch(`${VPS_API_URL}/api/candidatos-filtrados?uf=${selectedUF}&limit=30`);
          if (rankingResp.ok) {
            const rankingData = await rankingResp.json();
            setRankingList(rankingData || []);
          }
        } catch (error) {
          console.error('Erro ao recarregar ranking:', error);
        }
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
                  const cand = candidatesList.find(c => c.id === e.target.value);
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
                {candidatesList.map((cand) => (
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
                  const cand = candidatesList.find(c => c.id === e.target.value);
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
                {candidatesList.map((cand) => (
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
                  <p className="text-sm mb-4">{selectedCandidateA.cargo}</p>
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
                  <p className="text-sm mb-4">{selectedCandidateB.cargo}</p>
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
            ) : rankingList.length > 0 ? (
              <div className="space-y-2">
                {rankingList.map((cand, idx) => (
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