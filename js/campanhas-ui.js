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
  async function montarSeletor(atual){
    const box=document.querySelector('#campanha-contexto');if(!box||!nuvem.usuario())return;
    box.hidden=false;box.innerHTML='<p role="status" class="muted">Carregando suas campanhas…</p>';
    const uid=nuvem.usuario().id;
    try{
      const membros=await nuvem.get('membros?select=papel,campanha:campanhas(id,nome)&usuario_id=eq.'+encodeURIComponent(uid)+'&order=entrou_em.desc');
      if(nuvem.usuario()?.id!==uid){box.innerHTML='';box.hidden=true;return;}
      const lista=campanhasDe(membros),esc=nuvem.esc;
      if(lista.some(c=>c.id===atual.id))lembrar(atual.id);
      box.innerHTML='<label for="campanha-seletor">Sua campanha<select id="campanha-seletor">'+lista.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===atual.id?'selected':'')+'>'+esc(c.nome)+'</option>').join('')+'</select></label><div class="campanha-contexto-acoes"><a class="btnlike small" href="conta.html?aba=campanhas&gerenciar=1&acao=criar" aria-label="Nova campanha"><span class="rot-curto">Nova campanha</span><span class="rot-longo">Nova campanha</span></a><a class="btnlike small" href="conta.html?aba=campanhas&gerenciar=1&acao=entrar" aria-label="Entrar com código"><span class="rot-curto">Entrar c/ código</span><span class="rot-longo">Entrar com código</span></a><a class="btnlike small subtle" href="conta.html?aba=campanhas&gerenciar=1" aria-label="Todas as campanhas"><span class="rot-curto">Ver campanhas</span><span class="rot-longo">Todas as campanhas</span></a></div>';
      const select=document.querySelector('#campanha-seletor');
      if(!lista.some(c=>c.id===atual.id))select.insertAdjacentHTML('afterbegin','<option selected value="">'+esc(atual.nome)+'</option>');
      select.addEventListener('change',()=>{const c=lista.find(c=>c.id===select.value);if(c){lembrar(c.id);location.href='campanha.html?id='+encodeURIComponent(c.id);}});
    }catch(e){box.innerHTML='<p role="status" class="err">Não foi possível carregar o seletor: '+nuvem.esc(e.message)+'</p><a class="btnlike small" href="conta.html?aba=campanhas&gerenciar=1">Ver minhas campanhas</a>';}
  }
  window.CAMPANHAS_UI={campanhasDe,preferida,lembrar,esquecer,entrada,entradaRapida,montarSeletor,ativaId:ler,chaveDe};
})();
