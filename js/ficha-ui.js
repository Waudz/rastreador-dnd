/* Navegação da ficha: mantém a seção ao redesenhar sem alterar os dados. */
(() => {
  let atual = 'principal';
  window.atualizarAbasFicha = () => {
    if (!document.getElementById('rolagem-ficha')) {
      const resultado=document.createElement('output');resultado.id='rolagem-ficha';resultado.setAttribute('role','status');resultado.setAttribute('aria-live','polite');
      document.querySelector('.ficha-abas')?.before(resultado);
    }
    document.querySelectorAll('[data-ficha-aba]').forEach(b => {
      const ativa = b.dataset.fichaAba === atual;
      b.setAttribute('aria-selected', String(ativa));
      b.tabIndex = ativa ? 0 : -1;
    });
    document.querySelectorAll('[data-ficha-secao]').forEach(p => {
      p.hidden = p.dataset.fichaSecao !== atual;
    });
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-ficha-aba]');
    if (!b) return;
    atual = b.dataset.fichaAba;
    window.atualizarAbasFicha();
  });
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && document.body.classList.contains('ficha-embutida')) {
      window.parent.postMessage({tipo:'ficha-fechar',id:new URLSearchParams(location.search).get('id')},location.origin);
    }
    const b = e.target.closest('[data-ficha-aba]');
    if (!b || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const abas = [...document.querySelectorAll('[data-ficha-aba]')];
    const i = abas.indexOf(b);
    const proximo = e.key === 'Home' ? 0 : e.key === 'End' ? abas.length - 1 :
      (i + (e.key === 'ArrowRight' ? 1 : -1) + abas.length) % abas.length;
    abas[proximo].click();
    abas[proximo].focus();
  });
})();
