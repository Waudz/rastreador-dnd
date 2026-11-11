/* O menu reflete uma permissão consultada no servidor, nunca parâmetros da URL. */
(() => {
 const esc=nuvem.esc;
 const nav=document.createElement('nav');nav.className='appnav';nav.setAttribute('aria-label','Navegação principal');
 const links=[['conta.html','Minha conta e campanhas'],['conta.html#personagens','Meus personagens'],['iniciativa.html','Monstros, magias e habilidades'],['iniciativa.html#combate','Iniciativa']];
 nav.innerHTML=links.map(([url,n])=>`<a class="btnlike small" href="${url}">${esc(n)}</a>`).join('');document.body.prepend(nav);
 let admin=false;
 window.ACESSO={admin:()=>admin,pronto:null};
 ACESSO.pronto=(async()=>{
  try{if(nuvem.usuario())admin=(await nuvem.rpc('sou_admin'))===true;}catch(_){admin=false;}
  document.body.classList.toggle('admin',admin);
  if(admin){const a=document.createElement('a');a.className='btnlike small';a.href='admin.html';a.textContent='Administração';nav.append(a);}
  return admin;
 })();
 const contaInicial=nuvem.usuario()?.id; nuvem.aoMudar(u=>{if(u?.id!==contaInicial)location.reload();});
})();
