/* O menu reflete uma permissão consultada no servidor, nunca parâmetros da URL. */
(() => {
 const esc=nuvem.esc;
 const nav=document.createElement('nav');nav.className='appnav';nav.setAttribute('aria-label','Navegação principal');
 const links=[['iniciativa.html?aba=iniciativa','Iniciativa'],['conta.html?aba=campanhas','Campanhas'],['conta.html?aba=personagens','Personagens'],['iniciativa.html?aba=consulta','Consultas'],['conta.html?aba=conta','Minha conta']];
 nav.innerHTML=links.map(([url,n])=>`<a class="btnlike small" href="${url}">${esc(n)}</a>`).join('');document.body.prepend(nav);
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
  const consulta=aba==='consulta';document.body.dataset.view=consulta?'consulta':'iniciativa';
  for(const s of document.querySelectorAll('main > section, main > details')){
   const bestiario=!!s.querySelector('#blist,#sq')||s.id==='cm',dados=s.classList.contains('only-admin');
   if(bestiario||dados)s.classList.add('vista-consulta');else s.classList.add('vista-iniciativa');
  }
  const h=document.querySelector('h1'),sub=document.querySelector('.subtitle');if(consulta){h.textContent='Monstros, Magias e Habilidades';if(sub)sub.textContent='Consulte o catálogo de regras de 2014.';}
 }
 if(pagina==='conta.html'||pagina==='index.html'||pagina===''){
  const atual=['conta','personagens'].includes(aba)?aba:'campanhas';
  document.body.dataset.contaAba=atual;const h=document.querySelector('h1');if(h)h.textContent=atual==='conta'?'Minha conta':atual==='personagens'?'Meus personagens':'Campanhas';
 }
})();
