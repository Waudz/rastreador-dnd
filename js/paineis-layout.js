/* Uma política de espaço para fichas de personagens, monstros e consultas. */
(() => {
  /* A ficha fica ao lado da página a partir de 900 px (meia tela num monitor grande); abaixo disso, empilhada. Entre 900 e 1199 px o painel é mais estreito (380 px) e a página encolhe para caber. */
  const medir=largura=>({modo:largura>=900?'lateral':'empilhado',largura:largura>=1200?440:largura>=900?380:Math.min(440,Math.max(0,largura))});
  function aplicar(){
    const plano=medir(innerWidth),$=s=>document.querySelector(s);
    const direito=$('#dock-r');
    if(direito)direito.hidden=![...direito.children].some(p=>!p.hidden);
    const temDireita=!!direito&&!direito.hidden;
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
