/* Navegação de leitura: mantém o DOM e o estado da tela de origem vivos. */
(() => {
  const painel=window.PAINEL;
  if(!painel)return;
  const pequeno=()=>matchMedia('(max-width:759px)').matches;
  const orig={mostrar:painel.mostrar,empilhar:painel.empilhar,voltar:painel.voltar,fechar:painel.fechar};
  let pilha=[],voltando=false,scroll=0;
  function atualizar(){
    const aberta=pequeno()&&!!painel.visivel();
    document.body.classList.toggle('leitura-mobile',aberta);
    const dock=document.getElementById('dock-r');
    if(dock){dock.setAttribute('aria-label','Tela de leitura');if(aberta)dock.scrollTop=0;}
  }
  function registrar(id){
    if(!pequeno()||voltando)return;
    if(!pilha.length)scroll=window.scrollY;
    if(pilha.at(-1)===id)return;
    pilha.push(id);history.pushState({...history.state,compendioLeitura:pilha.length},'');
  }
  for(const metodo of ['mostrar','empilhar'])painel[metodo]=id=>{registrar(id);const r=orig[metodo](id);atualizar();return r;};
  painel.voltar=()=>{if(pequeno()&&pilha.length&&!voltando){history.back();return;}const r=orig.voltar();atualizar();return r;};
  painel.fechar=()=>{if(pequeno()&&pilha.length&&!voltando){history.go(-pilha.length);return;}orig.fechar();atualizar();};
  window.addEventListener('popstate',e=>{
    const nivel=Number(e.state?.compendioLeitura)||0;
    if(nivel>=pilha.length)return;
    voltando=true;
    if(nivel&&painel.temAnterior())orig.voltar();else orig.fechar();
    pilha=pilha.slice(0,nivel);atualizar();voltando=false;
    if(!nivel)window.scrollTo({top:scroll,behavior:'instant'});
  });
  window.addEventListener('resize',atualizar);
  document.addEventListener('click',e=>{if(e.target.closest('[data-leitura-voltar]'))painel.voltar();});
  const topo=document.createElement('div');topo.className='leitura-mobile-topo';topo.hidden=true;
  topo.innerHTML='<button type="button" data-leitura-voltar>Voltar</button><span>Detalhes</span>';
  document.getElementById('dock-r')?.prepend(topo);
})();
