/* Uma política de espaço para fichas de personagens, monstros e consultas. */
(() => {
  /* Padrão (celular, toque e telas pequenas): a ficha fica ao lado da página a partir de 1200 px (440 px) e empilhada abaixo disso. */
  const medir=largura=>({modo:largura>=1200?'lateral':'empilhado',largura:largura>=1200?440:Math.min(440,Math.max(0,largura))});
  /* JANELA (computador com mouse, a partir de 900 px, inclusive meia tela): o painel vira uma janela flutuante à direita, com margem, cantos arredondados e X, nunca uma aba colada na borda.
     Largura 840 px (a ficha é um iframe e só usa o layout de computador a partir de ~840 px) ou toda a largura útil em telas menores.
     Só em tela grande (>= 1600 px) a página cede o espaço da janela; abaixo disso a janela flutua por cima e fecha por X ou Esc. */
  const MARGEM=16,LARGURA_JANELA=840,ESPACO_LADO_A_LADO=1600;
  const comMouse=()=>!!(window.matchMedia&&matchMedia('(pointer:fine)').matches);
  function aplicar(){
    const plano=medir(innerWidth),$=s=>document.querySelector(s);
    const direito=$('#dock-r');
    if(direito)direito.hidden=![...direito.children].some(p=>!p.hidden);
    const temDireita=!!direito&&!direito.hidden;
    const janela=temDireita&&comMouse()&&innerWidth>=900,largura=janela?Math.min(LARGURA_JANELA,innerWidth-2*MARGEM):plano.largura;
    const reserva=janela?(innerWidth>=ESPACO_LADO_A_LADO?largura+2*MARGEM:0):(plano.modo==='lateral'&&temDireita?plano.largura:0);
    document.documentElement.style.setProperty('--dw',largura+'px');
    document.documentElement.style.setProperty('--ficha-painel',largura+'px');
    document.documentElement.style.setProperty('--painel-reserva-direita',reserva+'px');
    document.body.dataset.fichaJanela=janela?'1':'';
    document.body.classList.toggle('com-ficha-lateral',temDireita&&reserva>0);
    document.body.dataset.painel=temDireita?(janela?'janela':plano.modo):'';
    window.dispatchEvent?.(new Event('paineis:layout'));      // quem mede a posição da página (ex.: fundo da campanha) refaz a conta depois de abrir ou fechar o painel
  }
  window.PAINEIS_LAYOUT={medir,aplicar};
  window.reorganizarPaineis=aplicar;
  window.addEventListener?.('resize',()=>window.reorganizarPaineis());
})();
