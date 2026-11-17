/* Uma política de espaço para fichas de personagens, monstros e consultas. */
(() => {
  /* A ficha fica ao lado da página a partir de 900 px (meia tela num monitor grande); abaixo disso, empilhada. Entre 900 e 1199 px o painel é mais estreito (380 px) e a página encolhe para caber. */
  /* Janela da ficha do personagem: só em tela larga (>= 1200 px) com mouse. No celular e em telas estreitas nada muda (painel empilhado). */
  const larga=()=>innerWidth>=1200&&!!(window.matchMedia&&matchMedia('(pointer:fine)').matches);
  const medir=largura=>({modo:largura>=1200?'lateral':'empilhado',largura:largura>=1200?440:Math.min(440,Math.max(0,largura))});
  function aplicar(){
    const plano=medir(innerWidth),$=s=>document.querySelector(s);
    const direito=$('#dock-r');
    if(direito)direito.hidden=![...direito.children].some(p=>!p.hidden);
    const ficha=$('#ci-resumo'),janela=larga()&&!!ficha&&!ficha.hidden;
    const temDireita=!!direito&&!direito.hidden&&!janela;
    document.body.dataset.fichaJanela=janela?'1':'';
    const fechar=$('#ci-resumo-fechar');if(fechar){const t=janela?'Fechar ×':'Voltar';if(fechar.textContent!==t){fechar.textContent=t;fechar.setAttribute('aria-label',janela?'Fechar a ficha':'Voltar');}}
    document.documentElement.style.setProperty('--dw',plano.largura+'px');
    document.documentElement.style.setProperty('--ficha-painel',plano.largura+'px');
    document.documentElement.style.setProperty('--painel-reserva-direita',plano.modo==='lateral'&&temDireita?plano.largura+'px':'0px');
    document.body.classList.toggle('com-ficha-lateral',temDireita);
    document.body.dataset.painel=temDireita?plano.modo:'';
    window.dispatchEvent?.(new Event('paineis:layout'));      // quem mede a posição da página (ex.: fundo da campanha) refaz a conta depois de abrir ou fechar o painel
  }
  window.PAINEIS_LAYOUT={medir,aplicar};
  window.reorganizarPaineis=aplicar;
  window.addEventListener?.('resize',()=>window.reorganizarPaineis());
})();
