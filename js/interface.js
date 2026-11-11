/* Acabamento de apresentação: rótulos e estados já emitidos pelo aplicativo. */
(() => {
  function rotular(raiz){
    if(!raiz.querySelectorAll)return;
    raiz.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(el=>{
      if(!el.getAttribute('aria-label')&&!el.getAttribute('aria-labelledby')&&!el.labels?.length&&el.getAttribute('placeholder'))el.setAttribute('aria-label',el.getAttribute('placeholder'));
    });
  }
  function estado(el){
    const texto=el.textContent||'';
    const erro=!!el.querySelector('.err')||/não salvou/i.test(texto);
    const salvando=/^salvando/i.test(texto);
    el.dataset.estado=erro?'erro':salvando?'salvando':texto?'salvo':'vazio';
    el.setAttribute('aria-busy',String(salvando));
    el.setAttribute('role','status');el.setAttribute('aria-live','polite');
  }
  rotular(document);
  document.querySelectorAll('[id^="msg-"]').forEach(el=>{el.setAttribute('role','status');el.setAttribute('aria-live','polite');});
  const saida=document.querySelector('#estado');
  if(saida){estado(saida);new MutationObserver(()=>estado(saida)).observe(saida,{childList:true,subtree:true,characterData:true});}
  new MutationObserver(mudancas=>{
    for(const m of mudancas)for(const no of m.addedNodes)if(no.nodeType===1)rotular(no.parentElement||no);
  }).observe(document.body,{childList:true,subtree:true});
})();
