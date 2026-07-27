'use client';

import Script from 'next/script';
import Head from 'next/head';

export default function PlacarEleicaoEmbedPage() {
  const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-R37SS5PQDM';

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
        `}
      </Script>

      {/* Estrutura principal do Widget */}
      <div id="election-widget-container">
        <div className="widget-tabs">
          <button id="tab-duel" className="active">
            Duelo de Candidatos
          </button>
          <button id="tab-ranking">Ranking Regional</button>
        </div>

        {/* Visualização Duelo */}
        <div id="view-duel" className="widget-view active">
          <h2>Duelo de Candidatos</h2>
          <div className="duel-selectors">
            <select
              id="candidate-a"
              onChange={(e) =>
                (window as any).trackWidgetEvent('select_candidate_duel', {
                  candidate_name: e.target.value,
                  position: 'left',
                })
              }
            >
              <option>Selecione o 1º candidato</option>
              {/* Opções de candidatos serão populadas dinamicamente aqui */}
              <option value="Candidato A">Candidato A</option>
              <option value="Candidato B">Candidato B</option>
            </select>
            <select
              id="candidate-b"
              onChange={(e) =>
                (window as any).trackWidgetEvent('select_candidate_duel', {
                  candidate_name: e.target.value,
                  position: 'right',
                })
              }
            >
              <option>Selecione o 2º candidato</option>
              {/* Opções de candidatos serão populadas dinamicamente aqui */}
              <option value="Candidato A">Candidato A</option>
              <option value="Candidato B">Candidato B</option>
            </select>
          </div>
          <div className="duel-results">
            <p>Selecione dois candidatos para comparar.</p>
          </div>
        </div>

        {/* Visualização Ranking */}
        <div id="view-ranking" className="widget-view">
          <h2>Ranking Regional</h2>
          <div className="ranking-filters">
            <select id="filter-state" onChange={(e) => (window as any).trackWidgetEvent('filter_state', { state_name: e.target.value })}>
              <option>Selecione o Estado</option>
              {/* Opções de estados serão populadas dinamicamente aqui */}
              <option value="SP">São Paulo</option>
              <option value="RJ">Rio de Janeiro</option>
            </select>
            <select id="filter-city" onChange={(e) => (window as any).trackWidgetEvent('filter_city', { city_name: e.target.value })}>
              <option>Selecione o Município</option>
              {/* Opções de municípios serão populadas dinamicamente aqui */}
            </select>
          </div>
          <div className="ranking-results">
            <p>Filtre por estado e município para ver o ranking.</p>
          </div>
        </div>
      </div>

      {/* Carrega a lógica de interatividade do widget */}
      <Script src="/js/widget-logic.js" strategy="lazyOnload" />
    </>
  );
}