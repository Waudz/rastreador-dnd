/* Mantém resumos abertos na navegação da mesma aba. Recarregar fecha os painéis. */
(() => {
 const user=nuvem.usuario()?.id||'publico',chave='paineis-abertos:'+user;
 const tipos=[{id:'sheet',corpo:'sheet-body',fechar:'sh-close',nome:'Ficha'},{id:'spd',corpo:'spd-body',fechar:'spd-close',nome:'Magia ou Habilidade'},{id:'ci-resumo',corpo:'ci-resumo-corpo',fechar:'ci-resumo-fechar',nome:'Resumo do Personagem'}];
 let restaurando=true;
 const limparHTML=html=>{const t=document.createElement('template');t.innerHTML=String(html||'');t.content.querySelectorAll('script,iframe,object,embed,base,meta,link').forEach(e=>e.remove());for(const e of t.content.querySelectorAll('*'))for(const a of [...e.attributes])if(/^on/i.test(a.name)||/^(?:href|src|action)$/i.test(a.name)&&/^\s*javascript:/i.test(a.value))e.removeAttribute(a.name);return t.innerHTML;};
 function guardar(){if(restaurando)return;const abertos=tipos.flatMap(t=>{const el=document.getElementById(t.id),corpo=document.getElementById(t.corpo);return el&&!el.hidden&&corpo?.innerHTML?[{tipo:t.id,html:corpo.innerHTML,scroll:el.scrollTop}]:[];});try{if(abertos.length)sessionStorage.setItem(chave,JSON.stringify(abertos));else sessionStorage.removeItem(chave);}catch(_){} }
 const recarga=performance.getEntriesByType('navigation')[0]?.type==='reload';
 let salvos=[];try{if(recarga)sessionStorage.removeItem(chave);else salvos=JSON.parse(sessionStorage.getItem(chave)||'[]');}catch(_){}
 for(const salvo of salvos){const t=tipos.find(t=>t.id===salvo.tipo);if(!t||!salvo.html||String(salvo.html).includes('Ficha indisponível'))continue;
  let el=document.getElementById(t.id);if(!el){el=document.createElement('aside');el.id=t.id;el.className='painel-global';el.setAttribute('aria-label',t.nome);el.innerHTML='<div class="painel-global-topo"><strong>'+t.nome+'</strong><button type="button" id="'+t.fechar+'">Fechar</button></div><div id="'+t.corpo+'"></div>';let grupo=document.getElementById('paineis-globais');if(!grupo){grupo=document.createElement('div');grupo.id='paineis-globais';document.body.append(grupo);}grupo.append(el);}
  document.getElementById(t.corpo).innerHTML=limparHTML(salvo.html);el.hidden=false;el.scrollTop=Number(salvo.scroll)||0;const dock=el.closest('.dock');if(dock)dock.hidden=false;
 }
 restaurando=false;
 document.addEventListener('click',e=>{const t=tipos.find(t=>e.target.closest('#'+t.fechar));if(t){const el=document.getElementById(t.id);el.hidden=true;const dock=el.closest('.dock');if(dock)dock.hidden=[...dock.children].every(c=>c.hidden);const grupo=el.closest("#paineis-globais");if(grupo)grupo.hidden=[...grupo.children].every(c=>c.hidden);window.reorganizarPaineis?.();guardar();return;}
  if(!window.reorganizarPaineis){const h=e.target.closest('.hab');if(h)h.classList.toggle('open');}
 });
 window.addEventListener('pagehide',guardar);
 const observar=new MutationObserver(guardar);for(const t of tipos){const el=document.getElementById(t.id);if(el)observar.observe(el,{attributes:true,attributeFilter:['hidden'],childList:true,subtree:true,characterData:true});}
})();
