// /public/js/widget-logic.js

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.widget-tabs button');
  const views = document.querySelectorAll('.widget-view');

  // Função para trocar a visualização ativa
  const switchView = (targetId) => {
    // Esconde todas as visualizações e remove a classe 'active' das abas
    views.forEach(view => {
      view.classList.remove('active');
    });
    tabs.forEach(tab => {
      tab.classList.remove('active');
    });

    // Mostra a visualização alvo e marca a aba como 'active'
    const targetView = document.getElementById(targetId);
    const targetTab = document.querySelector(`button[data-target="${targetId}"]`);

    if (targetView && targetTab) {
      targetView.classList.add('active');
      targetTab.classList.add('active');
    }
  };

  // Adiciona o evento de clique para cada aba
  tabs.forEach(tab => {
    // Adiciona um atributo data-target para facilitar a seleção
    tab.dataset.target = `view-${tab.id.replace('tab-', '')}`;
    tab.addEventListener('click', () => switchView(tab.dataset.target));
  });
});