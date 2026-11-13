/* O menu reflete uma permissão consultada no servidor, nunca parâmetros da URL. */
(() => {
 const esc=nuvem.esc;
 const nav=document.createElement('header');nav.className='appheader';const ic=nome=>window.ico?window.ico(nome):'';
 const links=[['conta.html?aba=campanhas','Campanhas','book'],['iniciativa.html?aba=iniciativa','Iniciativa','swords'],['conta.html?aba=personagens','Personagens','users'],['iniciativa.html?aba=monstros','Monstros','skull'],['iniciativa.html?aba=magias','Magias','sparkles'],['itens.html','Itens','bag']];
 const rotaAtual=location.pathname.split('/').pop(),abaPedida=new URLSearchParams(location.search).get('aba'),abaAtual=abaPedida==='consulta'?'monstros':abaPedida;   // 'consulta' era o endereço antigo de Monstros e Magias
 const destinoAtual=rotaAtual==='itens.html'?'itens.html':rotaAtual==='iniciativa.html'?'iniciativa.html?aba='+(['monstros','magias'].includes(abaAtual)?abaAtual:'iniciativa'):'conta.html?aba='+(['personagem.html','criar-personagem.html'].includes(rotaAtual)?'personagens':rotaAtual==='campanha.html'?'campanhas':['conta','personagens'].includes(abaAtual)?abaAtual:'campanhas');
 const contaAtual=destinoAtual==='conta.html?aba=conta',visitante=!nuvem.usuario();
 /* modo visitante: tudo o que não depende de conta funciona; o resto mostra o convite para entrar */
 for(const alvo of [document.documentElement,document.body].filter(Boolean))if(alvo.classList&&alvo.classList.toggle)alvo.classList.toggle('visitante',visitante);
 nav.innerHTML='<a class="appmarca" href="conta.html?aba=campanhas" aria-label="Compêndio 5e" title="Compêndio 5e"><img src="icones/compendio-logo-96.png" width="32" height="32" alt=""><span>Compêndio 5e</span></a><div class="appdireita"><span class="appsino" aria-hidden="true"></span>'+(visitante?'<a class="appentrar" href="'+esc(nuvem.entradaUrl?nuvem.entradaUrl():'entrar.html')+'" title="Entrar ou criar conta (opcional)">Entrar</a>':'<a class="appavatar" href="conta.html?aba=conta" aria-label="Minha conta" title="Minha conta"'+(contaAtual?' aria-current="page"':'')+'>'+ic('user')+'</a>')+'</div><nav class="appnav" aria-label="Navegação principal">'+links.map(([url,nome,icone])=>`<a href="${url}"${url===destinoAtual&&!['licencas.html','entrar.html'].includes(rotaAtual)?' aria-current="page"':''}>${ic(icone)}<span>${esc(nome)}</span></a>`).join('')+'</nav>';
 if(rotaAtual==='personagem.html')document.body.classList.add('ficha-pagina');
 if(window.visualViewport){const medirTeclado=()=>document.body.classList.toggle('teclado-aberto',innerHeight-visualViewport.height>160&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName));visualViewport.addEventListener('resize',medirTeclado);document.addEventListener('focusout',()=>document.body.classList.remove('teclado-aberto'));}
 document.body.prepend(nav);if(document.documentElement&&document.documentElement.classList)document.documentElement.classList.add('cab-pronto');if(window.SPLASH)window.SPLASH.pronto();
 /* atribuição do SRD 5.1 (CC BY 4.0) em todas as páginas; o texto completo está em licencas.html */
 if(document.body.append&&rotaAtual!=='licencas.html'){const rodape=document.createElement('footer');rodape.className='rodape-licenca';rodape.innerHTML='Este site usa material do System Reference Document 5.1 da Wizards of the Coast LLC, licenciado sob a Creative Commons Attribution 4.0 International, traduzido e adaptado. Projeto de fãs, sem vínculo com a Wizards of the Coast. <a href="licencas.html">Licenças e créditos</a>';document.body.append(rodape);}
 /* o cabeçalho é fixo: informa a altura para painéis e rolagens não ficarem por baixo dele */
 const medir=()=>{const h=nav.offsetHeight;if(h){if(document.documentElement&&document.documentElement.style)document.documentElement.style.setProperty('--cab-h',h+'px');try{localStorage.setItem('cab_h_'+(window.innerWidth<760?'m':'d'),String(Math.round(h)));}catch(_){}}};
 medir();window.addEventListener?.('resize',medir);if(window.ResizeObserver&&nav.nodeType===1)new ResizeObserver(medir).observe(nav);
 /* service worker: registrado aqui, uma vez, para todas as páginas (antes só conta e iniciativa registravam, então as outras páginas
    podiam vir do cache HTTP do navegador, até 10 min velho). Avisa quando há versão nova, sem recarregar sozinho. */
 if(typeof navigator!=='undefined'&&navigator.serviceWorker&&/^https?:$/.test(location.protocol)){
  const sw=navigator.serviceWorker,tinhaControle=!!sw.controller;
  sw.register('sw.js',{updateViaCache:'none'}).then(r=>{
   const verificar=()=>r.update().catch(()=>{});
   document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')verificar();});
   setInterval(verificar,30*60*1000);
  }).catch(()=>{});
  let avisado=false;
  sw.addEventListener('controllerchange',()=>{
   if(!tinhaControle||avisado)return;avisado=true;
   const b=document.createElement('div');b.className='nova-versao';b.setAttribute('role','status');
   b.innerHTML='<span>Nova versão disponível.</span><button type="button" class="small">Atualizar</button>';
   b.querySelector('button').onclick=()=>location.reload();document.body.append(b);
  });
 }
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
   const magias=!!s.querySelector('#sq'),monstros=!!s.querySelector('#blist')||s.id==='cm'||s.id==='aviso-visitante'||s.classList.contains('only-admin');
   s.classList.add(magias?'vista-magias':monstros?'vista-monstros':'vista-iniciativa');
  }
 }
 if(pagina==='conta.html'||pagina==='index.html'||pagina===''){
  const atual=['conta','personagens'].includes(aba)?aba:'campanhas';
  document.body.dataset.contaAba=atual;
 }
})();
