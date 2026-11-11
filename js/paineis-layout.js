/* Uma política de espaço para fichas de personagens, monstros e consultas. */
(() => {
  const medir=largura=>({modo:largura>=1200?'lateral':'empilhado',largura:Math.min(440,Math.max(0,largura))});
  function aplicar(){
    const plano=medir(innerWidth),$=s=>document.querySelector(s);
    const esquerdo=$('#dock-l'),direito=$('#dock-r'),personagem=$('#ci-resumo');
    for(const dock of [esquerdo,direito])if(dock)dock.hidden=![...dock.children].some(p=>!p.hidden);
    const temEsquerda=!!esquerdo&&!esquerdo.hidden,temDireita=(!!direito&&!direito.hidden)||(!!personagem&&!personagem.hidden);
    document.documentElement.style.setProperty('--dw',plano.largura+'px');
    document.documentElement.style.setProperty('--painel-reserva-esquerda',plano.modo==='lateral'&&temEsquerda?plano.largura+'px':'0px');
    document.documentElement.style.setProperty('--painel-reserva-direita',plano.modo==='lateral'&&temDireita?plano.largura+'px':'0px');
    document.body.classList.toggle('com-ficha-lateral',temDireita);
    document.body.classList.toggle('com-ficha-esquerda',temEsquerda);
  }
  window.PAINEIS_LAYOUT={medir,aplicar};
  window.reorganizarPaineis=aplicar;
  window.addEventListener?.('resize',()=>window.reorganizarPaineis());
})();
