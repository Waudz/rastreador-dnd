/* Um host e um renderer de magia para todas as origens; a ficha mantém seu próprio DOM. */
(() => {
 const modo=new URLSearchParams(location.search).get('modo');if(['painel','leitura'].includes(modo)&&window.parent!==window)return;
 const esc=nuvem.esc,$=s=>document.querySelector(s);let catalogo=null,idAtual='',salvando=false,foco=null;
 let dock=$('#dock-r');if(!dock){dock=document.createElement('div');dock.id='dock-r';dock.className='dock';dock.hidden=true;document.querySelector('main').append(dock);}
 if(!$('#ci-resumo'))dock.insertAdjacentHTML('beforeend','<aside id="ci-resumo" class="ci-resumo" aria-label="Ficha do personagem" hidden><div class="ci-resumo-topo"><span>Personagem</span><button type="button" id="ci-resumo-fechar">Voltar</button></div><div id="ci-resumo-corpo"></div></aside>');
 if(!$('#spd'))dock.insertAdjacentHTML('beforeend','<aside id="spd" class="drawer" aria-label="Magia" hidden><div class="sh-top"><button type="button" id="spd-voltar">Voltar</button><span>Magia</span><button type="button" id="spd-close">Fechar</button></div><div id="spd-body"></div></aside>');
 function personagem(id,nome='Personagem',grupo=''){
  if(salvando&&idAtual.split('|')[0]!==id){window.FEEDBACK?.mostrar('Aguarde a ficha terminar de salvar.');return false;}
  foco=document.activeElement;
  if(idAtual!==id+'|'+grupo||!$('#ci-ficha-frame')){$('#ci-resumo-corpo').innerHTML='<iframe id="ci-ficha-frame" data-personagem="'+esc(id)+'" title="Ficha de '+esc(nome)+'" src="personagem.html?id='+encodeURIComponent(id)+'&modo=leitura'+(grupo?'&grupo='+encodeURIComponent(grupo):'')+'"></iframe>';idAtual=id+'|'+grupo;}
  window.PAINEL.mostrar('ci-resumo');$('#ci-resumo-fechar')?.focus();return true;
 }
 async function magia(dados){
  try{let m=typeof dados==='string'?null:dados;
   if(!m){if(!catalogo)catalogo=fetch('dados/magias.json').then(r=>{if(!r.ok)throw Error('Catálogo indisponível.');return r.json();});m=(await catalogo).find(m=>[m.en,m.n].some(n=>n?.toLowerCase()===String(dados).toLowerCase()));}
   if(!m)throw Error('Magia não encontrada.');
   const view=m.meta?m:{nome:m.n||m.nome||m.en,original:m.en||'',meta:[['Círculo',m.l?m.l+'º círculo':'Truque'],...MAGIAS_UI.camposCabecalho(m.cab),['Ritual',m.ritual?'Sim':'']],descricao:m.d||m.desc||'',materiais:m.materiais||'',concentracao:!!m.conc};
   $('#spd-body').innerHTML=MAGIAS_UI.detalhes(view);window.PAINEL.empilhar('spd');
  }catch(e){window.FEEDBACK?.mostrar(e.message,{erro:true});}
 }
 document.addEventListener('click',e=>{
  const a=e.target.closest('a[href]');if(a&&!a.target&&/^(?:\.\/)?personagem\.html\?/.test(a.getAttribute('href')||'')){e.preventDefault();const url=new URL(a.href,location.href),id=url.searchParams.get('id');if(id)personagem(id,a.textContent.trim(),url.searchParams.get('grupo')||'');return;}
  if(e.target.closest('#ci-resumo-fechar')){e.preventDefault();e.stopImmediatePropagation();window.PAINEL.voltar();foco?.focus();}
  if(e.target.closest('#spd-voltar')){e.preventDefault();e.stopImmediatePropagation();window.PAINEL.voltar();}
  if(e.target.closest('#spd-close')){e.preventDefault();e.stopImmediatePropagation();window.PAINEL.fechar();}
  if(e.target.closest('#voltar')&&location.pathname.endsWith('personagem.html')&&window.parent===window){e.preventDefault();if(document.referrer&&new URL(document.referrer).origin===location.origin)history.back();else location.href=e.target.closest('a').href;}
 },true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&window.PAINEL.visivel()&&!document.querySelector('details.compact-menu[open],details.ficha-menu[open]')){e.preventDefault();e.stopImmediatePropagation();window.PAINEL.voltar();}},true);
 window.addEventListener('message',e=>{const f=$('#ci-ficha-frame');if(e.origin!==location.origin||!f?.contentWindow||e.source!==f.contentWindow||e.data?.id!==f.dataset.personagem)return;if(e.data.tipo==='ficha-magia')magia(e.data.magia||e.data.en);if(e.data.tipo==='ficha-fechar')window.PAINEL.voltar();if(e.data.tipo==='ficha-salvando')salvando=true;if(e.data.tipo==='ficha-salva'){salvando=false;document.dispatchEvent(new CustomEvent('personagem:atualizado',{detail:{id:e.data.id}}));}});
 window.addEventListener('beforeunload',e=>{if(salvando){e.preventDefault();e.returnValue='';}});
 window.addEventListener('pagehide',()=>{window.PAINEL.encerrar?.();document.body.classList.remove('leitura-mobile');});
 window.LEITOR_FICHAS={personagem,magia};
})();
