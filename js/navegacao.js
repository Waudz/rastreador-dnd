/* O menu reflete uma permissão consultada no servidor, nunca parâmetros da URL. */
(() => {
 const esc=nuvem.esc;
 const nav=document.createElement('header');nav.className='appheader';const ic=nome=>window.ico?window.ico(nome):'';
 const links=[['conta.html?aba=campanhas','Campanhas','book'],['iniciativa.html?aba=iniciativa','Iniciativa','swords'],['conta.html?aba=personagens','Personagens','users'],['iniciativa.html?aba=monstros','Monstros','skull'],['iniciativa.html?aba=magias','Magias','sparkles']];
 const rotaAtual=location.pathname.split('/').pop(),abaPedida=new URLSearchParams(location.search).get('aba'),abaAtual=abaPedida==='consulta'?'monstros':abaPedida;   // 'consulta' era o endereço antigo de Monstros e Magias
 const destinoAtual=rotaAtual==='iniciativa.html'?'iniciativa.html?aba='+(['monstros','magias'].includes(abaAtual)?abaAtual:'iniciativa'):'conta.html?aba='+(['personagem.html','criar-personagem.html'].includes(rotaAtual)?'personagens':rotaAtual==='campanha.html'?'campanhas':['conta','personagens'].includes(abaAtual)?abaAtual:'campanhas');
 const contaAtual=destinoAtual==='conta.html?aba=conta';
 nav.innerHTML='<div class="appheader-topo"><a class="appmarca" href="conta.html?aba=campanhas"><img src="icones/favicon-32.png" width="24" height="24" alt=""><span>Rastreador D&amp;D</span></a><span class="grow"></span><span class="appsino" aria-hidden="true"></span><a class="appavatar" href="conta.html?aba=conta" aria-label="Minha conta" title="Minha conta"'+(contaAtual?' aria-current="page"':'')+'>'+ic('user')+'</a></div><nav class="appnav" aria-label="Navegação principal">'+links.map(([url,nome,icone])=>`<a href="${url}"${url===destinoAtual?' aria-current="page"':''}>${ic(icone)}<span>${esc(nome)}</span></a>`).join('')+'</nav>';
 document.body.prepend(nav);
 /* o cabeçalho é fixo: informa a altura para painéis e rolagens não ficarem por baixo dele */
 const medir=()=>{const h=nav.offsetHeight;if(h)document.documentElement.style.setProperty('--cab-h',h+'px');};
 medir();window.addEventListener?.('resize',medir);if(window.ResizeObserver&&nav.nodeType===1)new ResizeObserver(medir).observe(nav);
 let admin=false;
 window.ACESSO={admin:()=>admin,pronto:null};
 ACESSO.pronto=(async()=>{
  try{if(nuvem.usuario())admin=(await nuvem.rpc('sou_admin'))===true;}catch(_){admin=false;}
  document.body.classList.toggle('admin',admin);
  const a=document.querySelector('#opcoes-admin');if(a)a.hidden=!admin;
  return admin;
 })();
 const contaInicial=nuvem.usuario()?.id; nuvem.aoMudar(u=>{if(u?.id!==contaInicial)location.reload();});
 const pagina=location.pathname.split('/').pop(),aba=new URLSearchParams(location.search).get('aba');
 if(pagina==='iniciativa.html'){
  const vista=['monstros','magias'].includes(aba)?aba:aba==='consulta'?'monstros':'iniciativa';document.body.dataset.appView=vista;
  for(const s of document.querySelectorAll('main > section, main > details')){
   const magias=!!s.querySelector('#sq'),monstros=!!s.querySelector('#blist')||s.id==='cm'||s.classList.contains('only-admin');
   s.classList.add(magias?'vista-magias':monstros?'vista-monstros':'vista-iniciativa');
  }
  const h=document.querySelector('h1'),sub=document.querySelector('.subtitle');
  if(vista==='monstros'){h.textContent='Monstros';if(sub)sub.textContent='Consulte e crie fichas de monstros, personagens e NPCs do catálogo de 2014.';}
  if(vista==='magias'){h.textContent='Magias';if(sub)sub.textContent='Consulte magias e habilidades do catálogo de regras de 2014.';}
 }
 if(pagina==='conta.html'||pagina==='index.html'||pagina===''){
  const atual=['conta','personagens'].includes(aba)?aba:'campanhas';
  document.body.dataset.contaAba=atual;const h=document.querySelector('h1');if(h)h.textContent=atual==='conta'?'Minha conta':atual==='personagens'?'Meus personagens':'Campanhas';
 }
})();
