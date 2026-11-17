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

/* Painéis ancorados: sem arrastar janelas, somente divisórias horizontais. */
(() => {
  "use strict";
  if(typeof document.createElement!=="function"||typeof document.addEventListener!=="function")return;
  const ids=["vez-res","spd","ci-resumo","sheet"];
  const ativo=()=>innerWidth>=1400&&matchMedia("(pointer:fine)").matches;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const numero=(key,padrao)=>{try{return Number(localStorage.getItem(key))||padrao}catch(_){return padrao}};
  let esquerda=clamp(numero("comp5e-coluna-esquerda",300),240,420);
  let direita=clamp(numero("comp5e-coluna-direita",420),320,560);
  const visivel=el=>!!el&&!el.hidden&&!el.classList.contains("comp-historico-fechado");
  function ajustar(){
    const h=document.getElementById("vez-res"),m=document.getElementById("spd");
    const p=document.getElementById("ci-resumo"),mon=document.getElementById("sheet");
    const esq=visivel(h)||visivel(m),dir=visivel(p)||visivel(mon);
    const disponivel=Math.max(0,innerWidth-32-560-(esq?16:0)-(dir?16:0));
    if(esq&&dir&&esquerda+direita>disponivel){
      direita=Math.max(320,Math.min(direita,disponivel-esquerda));
      esquerda=Math.max(240,Math.min(esquerda,disponivel-direita));
    }
    document.body.classList.toggle("comp-coluna-esquerda",ativo()&&esq);
    document.body.classList.toggle("comp-coluna-direita",ativo()&&dir);
    document.body.style.setProperty("--comp-largura-historico",esquerda+"px");
    document.body.style.setProperty("--comp-largura-ficha",direita+"px");
    const topo=70,altura=Math.max(200,innerHeight-86),gap=16;
    const histH=visivel(h)&&visivel(m)?Math.floor(altura*.45):altura;
    if(ativo()){
      if(visivel(h))Object.assign(h.style,{left:"16px",top:topo+"px",width:esquerda+"px",height:histH+"px"});
      if(visivel(m))Object.assign(m.style,{left:"16px",top:(visivel(h)?topo+histH+gap:topo)+"px",width:esquerda+"px",height:(visivel(h)?altura-histH-gap:altura)+"px"});
      for(const el of [p,mon])if(visivel(el))Object.assign(el.style,{left:"auto",right:"16px",top:topo+"px",width:direita+"px",height:altura+"px"});
    }
    document.body.style.setProperty("--comp-magia-topo",(visivel(h)?topo+histH+gap:topo)+"px");
  }
  function salvar(lado){try{localStorage.setItem("comp5e-coluna-"+lado,String(lado==="esquerda"?esquerda:direita))}catch(_){}}
  function registrar(el){
    if(!el||el.dataset.janelaPreparada)return;
    el.dataset.janelaPreparada="1";
    const titulos={"vez-res":"Histórico do combate","spd":"Magia","ci-resumo":"Ficha do personagem","sheet":"Ficha do monstro"};
    const cab=document.createElement("div");cab.className="comp-flutuante-cab";
    const titulo=document.createElement("strong");titulo.textContent=titulos[el.id];
    const fechar=document.createElement("button");fechar.type="button";fechar.textContent="×";fechar.title="Fechar painel";
    cab.append(titulo,fechar);el.prepend(cab);
    fechar.addEventListener("click",()=>{
      if(el.id==="vez-res"){el.classList.add("comp-historico-fechado");const b=document.getElementById("comp-abrir-historico");if(b)b.hidden=false;ajustar();}
      else window.PAINEL?.fecharVista?.(el.id);
    });
    const lado=el.id==="vez-res"||el.id==="spd"?"esquerda":"direita";
    const alca=document.createElement("div");alca.className="comp-divisoria";alca.setAttribute("role","separator");
    alca.setAttribute("aria-orientation","vertical");alca.setAttribute("aria-label","Redimensionar painel "+lado);
    alca.tabIndex=0;el.append(alca);
    const atualizarLargura=n=>{
      if(!ativo())return;
      const outra=lado==="esquerda"?document.body.classList.contains("comp-coluna-direita")?direita+16:0:document.body.classList.contains("comp-coluna-esquerda")?esquerda+16:0;
      const max=Math.max(lado==="esquerda"?240:320,Math.min(lado==="esquerda"?420:560,innerWidth-32-560-16-outra));
      if(lado==="esquerda")esquerda=clamp(n,240,max);else direita=clamp(n,320,max);
      ajustar();
    };
    alca.addEventListener("pointerdown",e=>{
      if(!ativo()||e.button!==0)return;
      e.preventDefault();const start=e.clientX,original=lado==="esquerda"?esquerda:direita;
      alca.setPointerCapture?.(e.pointerId);
      const move=ev=>atualizarLargura(original+(ev.clientX-start)*(lado==="esquerda"?1:-1));
      const up=()=>{alca.removeEventListener("pointermove",move);alca.removeEventListener("pointerup",up);salvar(lado)};
      alca.addEventListener("pointermove",move);alca.addEventListener("pointerup",up,{once:true});
    });
    alca.addEventListener("dblclick",()=>{atualizarLargura(lado==="esquerda"?300:420);salvar(lado)});
    alca.addEventListener("keydown",e=>{if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;e.preventDefault();const dir=e.key==="ArrowRight"?1:-1;atualizarLargura((lado==="esquerda"?esquerda:direita)+dir*(lado==="esquerda"?16:-16));salvar(lado)});
  }
  function atualizar(){
    const on=ativo();document.body.classList.toggle("comp-janelas-desktop",on);
    for(const id of ids){const el=document.getElementById(id);if(!el)continue;
      if(on)registrar(el);
      else if(el.dataset.janelaPreparada){el.classList.remove("comp-historico-fechado");for(const prop of ["left","right","top","width","height","zIndex"])el.style[prop]="";}
    }
    ajustar();window.PAINEIS_LAYOUT?.aplicar();
  }
  document.addEventListener("DOMContentLoaded",()=>{
    const tools=document.getElementById("lista-ferramentas");
    if(tools){const abrir=document.createElement("button");abrir.id="comp-abrir-historico";abrir.type="button";abrir.className="small subtle";abrir.textContent="Abrir histórico";abrir.hidden=true;abrir.addEventListener("click",()=>{document.getElementById("vez-res")?.classList.remove("comp-historico-fechado");abrir.hidden=true;ajustar()});tools.prepend(abrir)}
    document.addEventListener("click",e=>{const btn=e.target.closest?.("#ci-resumo-fechar,#sh-close,#spd-close");if(!btn||!ativo())return;e.preventDefault();e.stopImmediatePropagation();window.PAINEL?.fecharVista?.(btn.id==="ci-resumo-fechar"?"ci-resumo":btn.id==="sh-close"?"sheet":"spd")},true);
    const observer=new MutationObserver(()=>requestAnimationFrame(ajustar));
    for(const id of ids){const el=document.getElementById(id);if(el)observer.observe(el,{attributes:true,attributeFilter:["hidden","class"]})}
    atualizar();
  });
  window.addEventListener("resize",atualizar,{passive:true});
  window.COMP_DESKTOP_WINDOWS={ativo,registrar,atualizar};
})();
