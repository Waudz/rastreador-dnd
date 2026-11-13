/* Feedback temporário compartilhado, sem substituir erros que exigem ação. */
(() => {let timer;window.FEEDBACK={mostrar(texto,{erro=false,acao=null}={}){let el=document.getElementById('feedback-app');if(!el){el=document.createElement('div');el.id='feedback-app';el.className='app-feedback';el.setAttribute('role','status');el.setAttribute('aria-live','polite');document.body.append(el);}el.textContent=texto;if(acao){const b=document.createElement('button');b.type='button';b.className='small';b.textContent=acao.rotulo;b.addEventListener('click',()=>{el.hidden=true;acao.fn();});el.append(' ',b);}el.hidden=false;el.classList.toggle('err',erro);clearTimeout(timer);if(!erro)timer=setTimeout(()=>el.hidden=true,acao?7000:3500);}};})();
/* Confirmação no estilo do site (substitui window.confirm): CONFIRMAR(mensagem, {titulo, ok, cancelar, perigo}) devolve uma Promise<boolean>.
   Esc e clique fora cancelam; o foco vai para Cancelar nas ações perigosas e para o botão principal nas demais; Tab fica dentro da caixa. */
(() => {
  window.CONFIRMAR = (mensagem, { titulo = "Confirmar", ok = "Confirmar", cancelar = "Cancelar", perigo = false } = {}) => new Promise((resolve) => {
    const anterior = document.activeElement, id = "dlg" + Math.random().toString(36).slice(2, 7);
    const fundo = document.createElement("div"); fundo.className = "dialogo-fundo";
    const caixa = document.createElement("div"); caixa.className = "dialogo"; caixa.setAttribute("role", "alertdialog"); caixa.setAttribute("aria-modal", "true"); caixa.setAttribute("aria-labelledby", id + "t"); caixa.setAttribute("aria-describedby", id + "m");
    const h = document.createElement("h2"); h.id = id + "t"; h.textContent = titulo;
    const p = document.createElement("p"); p.id = id + "m"; p.textContent = mensagem;
    const acoes = document.createElement("div"); acoes.className = "dialogo-acoes";
    const bc = document.createElement("button"); bc.type = "button"; bc.className = "dialogo-cancelar"; bc.textContent = cancelar;
    const bo = document.createElement("button"); bo.type = "button"; bo.className = "dialogo-ok " + (perigo ? "danger" : "primary"); bo.textContent = ok;
    acoes.append(bc, bo); caixa.append(h, p, acoes); fundo.append(caixa); document.body.append(fundo);
    const fim = (v) => { document.removeEventListener("keydown", tecla, true); fundo.remove(); if (anterior && anterior.focus) try { anterior.focus(); } catch (e) {} resolve(v); };
    const tecla = (e) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fim(false); }
      else if (e.key === "Tab") { e.preventDefault(); (document.activeElement === bc ? bo : bc).focus(); }
    };
    document.addEventListener("keydown", tecla, true);
    bc.addEventListener("click", () => fim(false)); bo.addEventListener("click", () => fim(true));
    fundo.addEventListener("click", (e) => { if (e.target === fundo) fim(false); });
    (perigo ? bc : bo).focus();
  });
})();
