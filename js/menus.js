/* Popover na camada superior: não herda recortes ou empilhamentos da campanha. */
(() => {
 const menus=new Map();
 function fechar(d){d.open=false;const p=menus.get(d);if(p?.hidePopover&&p.matches(':popover-open'))p.hidePopover();}
 function posicionar(d,p){const r=d.querySelector('summary').getBoundingClientRect(),w=Math.min(320,innerWidth-24);p.style.width=w+'px';p.style.left=Math.max(12,Math.min(innerWidth-w-12,r.right-w))+'px';p.style.top=Math.min(r.bottom+6,innerHeight-100)+'px';p.style.maxHeight=Math.max(80,innerHeight-r.bottom-90)+'px';}
 document.addEventListener('toggle',e=>{
  const d=e.target;if(!d.matches?.('details.compact-menu'))return;
  const p=d.querySelector('.compact-popover');if(!p)return;
  if(!menus.has(d)){menus.set(d,p);p.setAttribute('popover','manual');}
  if(d.open){for(const outro of menus.keys())if(outro!==d)fechar(outro);posicionar(d,p);if(p.showPopover&&!p.matches(':popover-open'))p.showPopover();}
  else if(p.hidePopover&&p.matches(':popover-open'))p.hidePopover();
 },true);
 document.addEventListener('click',e=>{
  for(const [d,p]of menus){if(!d.open)continue;
   if(!d.contains(e.target)&&!p.contains(e.target)){fechar(d);continue;}
   if(e.target.closest('a,button')&&p.contains(e.target))fechar(d);
  }
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape')for(const d of menus.keys())if(d.open){fechar(d);d.querySelector('summary').focus();}});
 window.addEventListener('resize',()=>{for(const[d,p]of menus)if(d.open)posicionar(d,p);});
 window.addEventListener('scroll',()=>{for(const[d,p]of menus)if(d.open)posicionar(d,p);},true);
})();
