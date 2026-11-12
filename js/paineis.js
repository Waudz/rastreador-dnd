/* Leituras pertencem à página de origem; não transportar HTML entre seções. */
(() => {try{sessionStorage.removeItem('paineis-abertos:'+(nuvem.usuario()?.id||'publico'));}catch(_){}window.addEventListener('pagehide',()=>window.MENUS?.fecharTodos());})();
