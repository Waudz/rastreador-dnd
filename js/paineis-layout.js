/* Uma política de espaço para fichas de personagens, monstros e consultas. */
(() => {
  /* A ficha fica ao lado da página a partir de 900 px (meia tela num monitor grande); abaixo disso, empilhada. Entre 900 e 1199 px o painel é mais estreito (380 px) e a página encolhe para caber. */
  const medir=largura=>({modo:largura>=1200?'lateral':'empilhado',largura:largura>=1200?440:Math.min(440,Math.max(0,largura))});
  function aplicar(){
    const plano=medir(innerWidth),$=s=>document.querySelector(s);
    const direito=$('#dock-r');
    if(direito)direito.hidden=![...direito.children].some(p=>!p.hidden);
    const temDireita=!!direito&&!direito.hidden;
    document.documentElement.style.setProperty('--dw',plano.largura+'px');
    document.documentElement.style.setProperty('--ficha-painel',plano.largura+'px');
    document.documentElement.style.setProperty('--painel-reserva-direita',window.COMP_DESKTOP_WINDOWS?.ativo() ? '0px' : plano.modo==='lateral'&&temDireita?plano.largura+'px':'0px');
    document.body.classList.toggle('com-ficha-lateral',temDireita);
    document.body.dataset.painel=temDireita?(window.COMP_DESKTOP_WINDOWS?.ativo()?'flutuante':plano.modo):'';
    window.dispatchEvent?.(new Event('paineis:layout'));      // quem mede a posição da página (ex.: fundo da campanha) refaz a conta depois de abrir ou fechar o painel
  }
  window.PAINEIS_LAYOUT={medir,aplicar};
  window.reorganizarPaineis=aplicar;
  window.addEventListener?.('resize',()=>window.reorganizarPaineis());
})();

/* Gerenciador experimental de janelas para o desktop da iniciativa.
   Não move elementos do DOM: preserva eventos, formulários e estado dos painéis. */
(() => {
  "use strict";
  const configs = {
    "ci-resumo": {minW:400,minH:450,w:470,h:650,title:"Ficha do personagem"},
    "sheet": {minW:380,minH:400,w:440,h:610,title:"Ficha do monstro"},
    "spd": {minW:340,minH:300,w:420,h:540,title:"Magia"},
    "vez-res": {minW:280,minH:250,w:340,h:650,title:"Histórico do combate"}
  };
  const ativo=()=>innerWidth>=1400 && matchMedia("(pointer:fine)").matches;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  let ordem=40;
  const barra=document.createElement("div");barra.id="comp-janelas-minimizadas";barra.setAttribute("aria-label","Janelas minimizadas");
  function salvar(el){try{const r=el.getBoundingClientRect();localStorage.setItem("comp5e-janela-"+el.id,JSON.stringify({x:r.left,y:r.top,w:r.width,h:r.height}));}catch(_){}}
  function restaurar(el,c){
    let data=null;try{data=JSON.parse(localStorage.getItem("comp5e-janela-"+el.id)||"null");}catch(_){}
    const w=clamp(data?.w||c.w,c.minW,innerWidth-24),h=clamp(data?.h||c.h,c.minH,innerHeight-76);
    const x=clamp(data?.x??(el.id==="vez-res"?16:innerWidth-w-20),8,innerWidth-w-8);
    const y=clamp(data?.y??(el.id==="vez-res"?62:76),52,innerHeight-h-8);
    Object.assign(el.style,{left:x+"px",top:y+"px",width:w+"px",height:h+"px"});
  }
  function registrar(el){
    if(!el||el.dataset.janelaPreparada)return;
    const c=configs[el.id];if(!c)return;
    el.dataset.janelaPreparada="1";
    const cab=document.createElement("div");cab.className="comp-flutuante-cab";
    const titulo=document.createElement("strong");titulo.textContent=c.title;
    const acoes=document.createElement("span");acoes.className="comp-flutuante-acoes";
    const minimo=document.createElement("button");minimo.type="button";minimo.textContent="—";minimo.title="Minimizar janela";
    const tamanhos=document.createElement("button");tamanhos.type="button";tamanhos.textContent="▣";tamanhos.title="Alternar tamanho";
    const fechar=document.createElement("button");fechar.type="button";fechar.textContent="×";fechar.title="Fechar janela";
    acoes.append(minimo,tamanhos,fechar);cab.append(titulo,acoes);el.prepend(cab);
    const handle=document.createElement("div");handle.className="comp-flutuante-resize";handle.title="Redimensionar janela";el.append(handle);
    const ativar=()=>{el.style.zIndex=String(++ordem)};
    el.addEventListener("pointerdown",ativar);
    function mover(e,resize){
      if(!ativo()||e.button!==0)return;
      if(e.target.closest("button,input,select,a"))return;
      e.preventDefault();ativar();
      const r=el.getBoundingClientRect(),sx=e.clientX,sy=e.clientY;
      const move=ev=>{
        const dx=ev.clientX-sx,dy=ev.clientY-sy;
        if(resize){
          const w=clamp(r.width+dx,c.minW,innerWidth-r.left-8),h=clamp(r.height+dy,c.minH,innerHeight-r.top-8);
          el.style.width=w+"px";el.style.height=h+"px";
        }else{
          el.style.left=clamp(r.left+dx,8,innerWidth-r.width-8)+"px";
          el.style.top=clamp(r.top+dy,52,innerHeight-r.height-8)+"px";
        }
      };
      const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);salvar(el)};
      window.addEventListener("pointermove",move);window.addEventListener("pointerup",up,{once:true});
    }
    cab.addEventListener("pointerdown",e=>mover(e,false));
    handle.addEventListener("pointerdown",e=>mover(e,true));
    minimo.addEventListener("click",()=>{
      el.classList.add("comp-minimizada");
      const voltar=document.createElement("button");voltar.type="button";voltar.textContent=c.title;
      voltar.onclick=()=>{el.classList.remove("comp-minimizada");voltar.remove();ativar()};
      barra.append(voltar);
    });
    let tamanho=1;
    tamanhos.addEventListener("click",()=>{tamanho=(tamanho+1)%3;const f=[.8,1,1.25][tamanho];const w=clamp(Math.round(c.w*f),c.minW,innerWidth-24),h=clamp(Math.round(c.h*f),c.minH,innerHeight-76);el.style.width=w+"px";el.style.height=h+"px";const r=el.getBoundingClientRect();el.style.left=clamp(r.left,8,innerWidth-w-8)+"px";el.style.top=clamp(r.top,52,innerHeight-h-8)+"px";salvar(el)});
    fechar.addEventListener("click",()=>{if(el.id==="vez-res"){el.classList.add("comp-historico-fechado")}else{const btn=el.querySelector("#ci-resumo-fechar,#sh-close,#spd-close");btn?.click()}});
    restaurar(el,c);ativar();
  }
  function atualizar(){
    const on=ativo();document.body.classList.toggle("comp-janelas-desktop",on);
    for(const id of Object.keys(configs)){
      const el=document.getElementById(id);if(!el)continue;
      if(on){registrar(el);const c=configs[id];if(el.dataset.janelaPreparada==="1"){const r=el.getBoundingClientRect();if(r.right>innerWidth||r.bottom>innerHeight)restaurar(el,c)}}
    }
    window.PAINEIS_LAYOUT?.aplicar();
  }
  document.addEventListener("DOMContentLoaded",()=>{document.body.append(barra);atualizar()});
  window.addEventListener("resize",atualizar,{passive:true});
  window.COMP_DESKTOP_WINDOWS={ativo,registrar,atualizar};
})();
