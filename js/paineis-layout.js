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
    "ci-resumo": {minW:480,minH:450,w:480,h:650,title:"Ficha do personagem"},
    "sheet": {minW:440,minH:400,w:440,h:610,title:"Ficha do monstro"},
    "spd": {minW:420,minH:300,w:420,h:540,title:"Magia"},
    "vez-res": {minW:300,minH:250,w:300,h:650,title:"Histórico do combate"}
  };
  const ativo=()=>innerWidth>=1400 && matchMedia("(pointer:fine)").matches;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  let ordem=40;
  const barra=document.createElement("div");barra.id="comp-janelas-minimizadas";barra.setAttribute("aria-label","Janelas minimizadas");
  function salvar(el){try{const r=el.getBoundingClientRect();localStorage.setItem("comp5e-janela-pos-"+el.id,JSON.stringify({x:r.left,y:r.top}));}catch(_){}}
  function restaurar(el,c){
    let data=null;try{data=JSON.parse(localStorage.getItem("comp5e-janela-pos-"+el.id)||"null");}catch(_){}
    const w=Math.min(c.w,innerWidth-24),h=Math.min(c.h,innerHeight-76);
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
    
    const fechar=document.createElement("button");fechar.type="button";fechar.textContent="×";fechar.title="Fechar janela";
    acoes.append(minimo,fechar);cab.append(titulo,acoes);el.prepend(cab);
    
    const ativar=()=>{el.style.zIndex=String(++ordem)};
    el.addEventListener("pointerdown",ativar);
    function mover(e){
      if(!ativo()||e.button!==0)return;
      if(e.target.closest("button,input,select,a"))return;
      e.preventDefault();ativar();
      const r=el.getBoundingClientRect(),sx=e.clientX,sy=e.clientY;
      const move=ev=>{
        const dx=ev.clientX-sx,dy=ev.clientY-sy;
        el.style.left=clamp(r.left+dx,8,innerWidth-r.width-8)+"px";
        el.style.top=clamp(r.top+dy,52,innerHeight-r.height-8)+"px";
      };
      const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);salvar(el)};
      window.addEventListener("pointermove",move);window.addEventListener("pointerup",up,{once:true});
    }
    // Layout em colunas: janelas ancoradas, sem arrastar.
    minimo.addEventListener("click",()=>{
      el.classList.add("comp-minimizada");
      const voltar=document.createElement("button");voltar.type="button";voltar.textContent=c.title;
      voltar.onclick=()=>{el.classList.remove("comp-minimizada");voltar.remove();ativar()};
      barra.append(voltar);
    });
    fechar.addEventListener("click",()=>{if(el.id==="vez-res"){minimo.click()}else{window.PAINEL?.fecharVista?.(el.id)}});
    restaurar(el,c);ativar();
  }

  function organizarConsultas(){
    if(!ativo()){document.body.classList.remove("comp-coluna-esquerda","comp-coluna-direita");return;}
    const h=document.getElementById("vez-res"),m=document.getElementById("spd"),p=document.getElementById("ci-resumo");
    const magia=!!m&&!m.hidden, historico=!!h&&!h.hidden&&!h.classList.contains("comp-minimizada");
    const topo=62,altura=Math.max(200,innerHeight-74),espaco=10;
    const leftOpen=historico||magia;
    const rightOpen=!!p&&!p.hidden;
    document.body.classList.toggle("comp-coluna-esquerda",leftOpen);
    document.body.classList.toggle("comp-coluna-direita",rightOpen);
    const histH=magia?Math.floor(altura*.38):altura;
    if(h&&historico)Object.assign(h.style,{left:"14px",top:topo+"px",width:"300px",height:histH+"px"});
    if(m&&magia)Object.assign(m.style,{left:"14px",top:(historico?topo+histH+espaco:topo)+"px",width:"420px",height:(historico?altura-histH-espaco:altura)+"px"});
    if(p&&!p.hidden)Object.assign(p.style,{left:Math.max(8,innerWidth-496)+"px",top:topo+"px",width:"480px",height:altura+"px"});
  }
  function atualizar(){
    const on=ativo();document.body.classList.toggle("comp-janelas-desktop",on);
    for(const id of Object.keys(configs)){
      const el=document.getElementById(id);if(!el)continue;
      if(on){registrar(el);const c=configs[id];if(el.dataset.janelaPreparada==="1")restaurar(el,c)}else if(el.dataset.janelaPreparada==="1"){el.classList.remove("comp-minimizada");for(const prop of ["left","top","width","height","zIndex"])el.style[prop]="";}
    }
    organizarConsultas();
    window.PAINEIS_LAYOUT?.aplicar();
  }
  document.addEventListener("DOMContentLoaded",()=>{document.body.append(barra);atualizar();
    document.addEventListener("click",e=>{
      const btn=e.target.closest("#ci-resumo-fechar,#sh-close,#spd-close");
      if(!btn||!ativo())return;
      e.preventDefault();e.stopImmediatePropagation();
      const id=btn.id==="ci-resumo-fechar"?"ci-resumo":btn.id==="sh-close"?"sheet":"spd";
      window.PAINEL?.fecharVista?.(id);
    },true);
    const o=new MutationObserver(()=>requestAnimationFrame(organizarConsultas));for(const id of ["spd","ci-resumo","vez-res"]){const el=document.getElementById(id);if(el)o.observe(el,{attributes:true,attributeFilter:["hidden","class"]})}});
  window.addEventListener("resize",atualizar,{passive:true});
  window.COMP_DESKTOP_WINDOWS={ativo,registrar,atualizar};
})();
