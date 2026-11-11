/* Menu secundário da ficha; exclusão permanece no fluxo autorizado existente. */
(() => {const menu=document.querySelector('#ficha-mais');if(!menu)return;
 document.addEventListener('click',e=>{if(!menu.contains(e.target))menu.open=false;});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus();}});
})();
