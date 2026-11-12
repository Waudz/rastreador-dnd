/* Apenas filtros e rolagem da seção. Não armazena HTML de leituras nem preferências globais. */
(() => {
 if(new URLSearchParams(location.search).get('modo'))return;
 const ids=['sq','sf-type','sf-lvl','sf-sch','sf-ex','bq','bf','biblioteca-busca','biblioteca-campanha','biblioteca-classe','biblioteca-nivel'];
 const chave='secao:'+String(nuvem.usuario()?.id||'visitante')+':'+location.pathname+':'+(new URLSearchParams(location.search).get('aba')||'');let restaurou=false;
 function guardar(){const campos={};for(const id of ids){const e=document.getElementById(id);if(e)campos[id]=e.value;}try{sessionStorage.setItem(chave,JSON.stringify({campos,scroll:window.scrollY}));}catch(_){} }
 function restaurar(){if(restaurou)return;restaurou=true;let s;try{s=JSON.parse(sessionStorage.getItem(chave)||'null');}catch(_){}if(!s)return;for(const[id,value]of Object.entries(s.campos||{})){const el=document.getElementById(id);if(el&&ids.includes(id)&&typeof value==='string'){el.value=value;el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));}}requestAnimationFrame(()=>window.scrollTo({top:Number(s.scroll)||0,behavior:'instant'}));}
 window.addEventListener('pagehide',guardar);window.ESTADO_SECAO={restaurar,guardar};
})();
