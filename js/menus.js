/* Controlador único: popovers temporários pertencem à tela e têm fechamento síncrono. */
(() => {
 const selector='details.compact-menu,details.ficha-menu',menus=new Map();
 function fechar(d,foco=false){d.open=false;const p=menus.get(d);if(p?.hidePopover&&p.matches(':popover-open'))p.hidePopover();if(foco&&d.isConnected!==false)d.querySelector('summary')?.focus();}
 const todos=()=>{for(const d of document.querySelectorAll(selector))if(d.open)fechar(d);};
 function posicionar(d,p){const r=d.querySelector('summary').getBoundingClientRect(),w=Math.min(340,innerWidth-24);Object.assign(p.style,{width:w+'px',left:Math.max(12,Math.min(innerWidth-w-12,r.right-w))+'px',top:Math.min(r.bottom+6,innerHeight-100)+'px',maxHeight:Math.max(80,innerHeight-r.bottom-90)+'px'});}
 document.addEventListener('toggle',e=>{const d=e.target;if(!d.matches?.(selector))return;const p=d.querySelector('.compact-popover,.ficha-menu-opcoes');if(!p)return;menus.set(d,p);p.setAttribute('popover','manual');if(d.open){for(const outro of document.querySelectorAll(selector))if(outro!==d&&outro.open)fechar(outro);posicionar(d,p);if(p.showPopover&&!p.matches(':popover-open'))p.showPopover();}else if(p.hidePopover&&p.matches(':popover-open'))p.hidePopover();},true);
 document.addEventListener('click',e=>{const dentro=e.target.closest(selector);for(const d of document.querySelectorAll(selector))if(d.open&&d!==dentro)fechar(d);if(e.target.closest('[data-aba],[data-ficha-aba],.appnav a'))todos();if(dentro&&e.target.closest('a,button')&&!e.target.closest('form,[data-camp-form]'))fechar(dentro);},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){const d=[...document.querySelectorAll(selector)].find(d=>d.open);if(d){e.preventDefault();e.stopImmediatePropagation();fechar(d,true);}}},true);
 window.addEventListener('pagehide',todos);
 for(const evento of ['resize','scroll'])window.addEventListener(evento,()=>{for(const[d,p]of menus){if(d.isConnected===false){menus.delete(d);continue;}if(d.open)posicionar(d,p);}},true);
 window.MENUS={fecharTodos:todos};
})();
