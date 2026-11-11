/* O menu reflete uma permissão consultada no servidor, nunca parâmetros da URL. */
(() => {
 const esc=nuvem.esc;
 const nav=document.createElement('nav');nav.className='appnav';nav.setAttribute('aria-label','Navegação principal');
 const links=[['conta.html?aba=campanhas','Campanhas'],['iniciativa.html?aba=iniciativa','Iniciativa'],['conta.html?aba=personagens','Personagens'],['iniciativa.html?aba=monstros','Monstros'],['iniciativa.html?aba=magias','Magias'],['conta.html?aba=conta','Minha conta']];
 const rotaAtual=location.pathname.split('/').pop(),abaPedida=new URLSearchParams(location.search).get('aba'),abaAtual=abaPedida==='consulta'?'monstros':abaPedida;   // 'consulta' era o endereço antigo de Monstros e Magias
 const destinoAtual=rotaAtual==='iniciativa.html'?'iniciativa.html?aba='+(['monstros','magias'].includes(abaAtual)?abaAtual:'iniciativa'):'conta.html?aba='+(['personagem.html','criar-personagem.html'].includes(rotaAtual)?'personagens':rotaAtual==='campanha.html'?'campanhas':['conta','personagens'].includes(abaAtual)?abaAtual:'campanhas');
 nav.innerHTML=links.map(([url,n])=>`<a class="btnlike small" href="${url}"${url===destinoAtual?' aria-current="page"':''}>${esc(n)}</a>`).join('');document.body.prepend(nav);
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
