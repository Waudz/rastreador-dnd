/* Contexto de navegação neste aparelho. Nunca decide permissões nem amplia consultas. */
(() => {
  const legado='ini_campanha'; // chave antiga, global do aparelho; continua sendo escrita para o rastreador e versões antigas
  const campanhasDe=membros=>membros.filter(m=>m.campanha?.id).map(m=>m.campanha);
  const uid=()=>{try{return window.nuvem?.usuario?.()?.id||'';}catch(_){return '';}};
  const chaveDe=u=>u?legado+':'+u:legado;
  function ler(){
    try{
      const u=uid(),propria=u?localStorage.getItem(chaveDe(u)):null;
      return propria!==null?propria:(localStorage.getItem(legado)||'');   // sem registro próprio: usa a antiga, sempre validada contra as campanhas deste usuário
    }catch(_){return '';}
  }
  /* campanha ativa deste usuário: só vale se ele ainda for membro dela */
  function preferida(membros){const id=ler();return campanhasDe(membros).find(c=>c.id===id)||null;}
  function lembrar(id){try{const u=uid();if(u)localStorage.setItem(chaveDe(u),id);localStorage.setItem(legado,id);}catch(_){} }
  function esquecer(id){try{const u=uid();if(u&&localStorage.getItem(chaveDe(u))===id)localStorage.removeItem(chaveDe(u));if(localStorage.getItem(legado)===id)localStorage.removeItem(legado);}catch(_){} }
  /* para onde ir ao abrir o aplicativo: a campanha ativa; sem nenhuma preferência, a única campanha do usuário; senão, a lista */
  function entrada(membros,busca){
    const q=new URLSearchParams(busca||'');
    if(q.get('gerenciar')==='1'||['conta','personagens'].includes(q.get('aba')))return '';
    const lista=campanhasDe(membros),atual=preferida(membros)||(!ler()&&lista.length===1?lista[0]:null);   // preferência inválida: mostra a lista para escolher outra
    return atual?'campanha.html?id='+encodeURIComponent(atual.id):'';
  }
  /* abertura imediata, sem esperar a rede: usa só a preferência local deste usuário; a página da campanha confere o acesso */
  function entradaRapida(busca){
    const q=new URLSearchParams(busca||'');
    if(q.get('gerenciar')==='1'||q.get('acao')||['conta','personagens'].includes(q.get('aba'))||!uid())return '';
    const id=ler();return id?'campanha.html?id='+encodeURIComponent(id):'';
  }
  async function entrarPorCodigo(codigo){
    const cod=String(codigo||'').trim();if(!cod)throw Error('Digite o código de convite.');
    return nuvem.rpc('entrar_na_campanha',{p_codigo:cod});
  }
  async function montarSeletor(atual){
    const box=document.querySelector('#campanha-contexto');if(!box||!nuvem.usuario())return;
    const usuario=nuvem.usuario().id,esc=nuvem.esc,ico=window.ico||(()=>''),url='conta.html?aba=campanhas&gerenciar=1';
    const menu=(icone,nome,corpo)=>'<details class="compact-menu"><summary title="'+nome+'" aria-label="'+nome+'">'+ico(icone)+'</summary><div class="compact-popover">'+corpo+'</div></details>';
    box.hidden=false;box.removeAttribute('aria-hidden');
    box.innerHTML='<nav class="campanha-ferramentas" aria-label="Ações da campanha">'+
      menu('list','Abrir lista de campanhas','<h2>Suas campanhas</h2><div id="camp-lista" class="compact-lista" role="status">Carregando…</div>')+
      (atual.podeGerenciar?menu('share','Compartilhar código de convite','<h2>Convite da campanha</h2><div id="conv" class="bar" hidden></div>'):'')+
      menu('plus','Entrar em campanha','<form id="camp-entrar"><label for="camp-codigo">Código de convite</label><input id="camp-codigo" required autocomplete="off"><button type="submit" class="small primary">Entrar</button><span id="camp-entrar-msg" role="status" class="muted"></span></form>')+
      menu('more','Mais opções','<a href="'+url+'&acao=criar">Criar campanha</a><a href="'+url+'">Gerenciar minhas campanhas</a>'+(atual.podeGerenciar?'<button type="button" class="small" data-camp-grupo>Gerenciar participantes</button>':'')+(atual.podeEditarVisual?'<button type="button" class="small" data-camp-aparencia>Aparência da campanha</button>':''))+'</nav>';
    box.querySelector('#camp-entrar').addEventListener('submit',async e=>{
      e.preventDefault();const botao=e.target.querySelector('button'),msg=box.querySelector('#camp-entrar-msg');botao.disabled=true;
      try{await entrarPorCodigo(box.querySelector('#camp-codigo').value);msg.textContent='Entrada confirmada.';await montarSeletor(atual);}
      catch(err){msg.textContent=err.message;}finally{botao.disabled=false;}
    });
    try{
      const membros=await nuvem.get('membros?select=papel,campanha:campanhas(id,nome)&usuario_id=eq.'+encodeURIComponent(usuario)+'&order=entrou_em.desc');
      if(nuvem.usuario()?.id!==usuario){box.innerHTML='';box.hidden=true;return;}
      const lista=campanhasDe(membros);if(lista.some(c=>c.id===atual.id))lembrar(atual.id);
      box.querySelector('#camp-lista').innerHTML=lista.map(c=>'<a href="campanha.html?id='+encodeURIComponent(c.id)+'" '+(c.id===atual.id?'aria-current="page"':'')+'>'+'<span data-visual-campanha="'+esc(c.id)+'">'+(window.CAMPANHA_VISUAL?window.CAMPANHA_VISUAL.simbolo('',c.nome,true):'')+'</span>'+esc(c.nome)+'</a>').join('')||'<p class="muted">Nenhuma campanha disponível.</p>';
      window.CAMPANHA_IMAGENS?.miniaturas(lista.map(c=>c.id)).then(imagens=>{if(nuvem.usuario()?.id!==usuario)return;for(const c of lista){const a=box.querySelector('[data-visual-campanha="'+c.id+'"]');if(a&&imagens[c.id])a.innerHTML=window.CAMPANHA_VISUAL.simbolo(imagens[c.id],c.nome,true);}}).catch(()=>{});
    }catch(err){const lista=box.querySelector('#camp-lista');if(lista)lista.innerHTML='<p class="err">'+esc(err.message)+'</p><a href="'+url+'">Ver minhas campanhas</a>';}
  }

  window.CAMPANHAS_UI={campanhasDe,preferida,lembrar,esquecer,entrada,entradaRapida,montarSeletor,entrarPorCodigo,ativaId:ler,chaveDe};
})();
