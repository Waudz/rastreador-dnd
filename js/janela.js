/* Janela padrão do Compêndio 5e: acessibilidade, foco, fechamento e rolagem.
   Adotada gradualmente por cada área, preservando os formulários existentes. */
(() => {
  "use strict";
  function abrir({ titulo, conteudo, largura = "media", classe = "", fecharAoFundo = true, aoFechar } = {}) {
    const anterior = document.activeElement;
    const ov = document.createElement("div");
    ov.className = "comp-janela-ov";
    const box = document.createElement("section");
    box.className = "comp-janela comp-janela-" + (["pequena","media","larga"].includes(largura) ? largura : "media") + (classe ? " " + classe : "");
    box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    const tituloEl = document.createElement("h2"); tituloEl.className = "comp-janela-titulo"; tituloEl.textContent = titulo || "Janela";
    tituloEl.id = "comp-janela-titulo-" + Math.random().toString(36).slice(2);
    box.setAttribute("aria-labelledby", tituloEl.id);
    const cab = document.createElement("header"); cab.className = "comp-janela-cab";
    const x = document.createElement("button"); x.type = "button"; x.className = "small subtle"; x.textContent = "Fechar"; x.setAttribute("aria-label", "Fechar janela");
    cab.append(tituloEl, x);
    const corpo = document.createElement("div"); corpo.className = "comp-janela-corpo";
    if (typeof conteudo === "string") corpo.innerHTML = conteudo;
    else if (conteudo instanceof Node) corpo.append(conteudo);
    box.append(cab, corpo); ov.append(box);
    const fechar = () => {
      if (!ov.isConnected) return;
      ov.removeEventListener("keydown", tecla); ov.remove();
      if (typeof aoFechar === "function") aoFechar();
      if (anterior?.isConnected && typeof anterior.focus === "function") anterior.focus({preventScroll:true});
    };
    const tecla = e => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fechar(); return; }
      if (e.key !== "Tab") return;
      const foco = [...box.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el => el.getClientRects().length);
      if (!foco.length) { e.preventDefault(); box.focus(); return; }
      if (e.shiftKey && document.activeElement === foco[0]) { e.preventDefault(); foco[foco.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === foco[foco.length - 1]) { e.preventDefault(); foco[0].focus(); }
    };
    x.addEventListener("click", fechar);
    ov.addEventListener("click", e => { if (e.target === ov && fecharAoFundo) fechar(); });
    ov.addEventListener("keydown", tecla);
    document.body.append(ov);
    (corpo.querySelector('input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled])') || x).focus({preventScroll:true});
    return { ov, box, corpo, fechar };
  }
  window.COMP_JANELA = Object.freeze({ abrir });
})();
