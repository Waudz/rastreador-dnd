/* Visualizador de imagens do Compêndio: um único componente para qualquer imagem de conteúdo (retratos, monstros, itens, campanhas).
   Uso direto: VISUALIZADOR.abrir({ src, titulo }).  Uso automático: clicar ou tocar numa <img> de conteúdo abre a visualização ampliada.
   Não se aplica a: imagens dentro de botões, links, abas, resumos, campos e rótulos (o clique continua sendo a ação do controle), imagens marcadas
   com data-sem-ampliar (ou dentro de um elemento assim), imagens decorativas (aria-hidden, hidden) e imagens menores que 24 px.
   Zoom: roda do mouse, botões + e −, duplo clique ou duplo toque, pinça; arrastar move. Fecha pelo X, por Esc ou tocando no fundo. */
(() => {
  "use strict";
  if (window.VISUALIZADOR) return;
  const MIN = 1, MAX = 8, SEL_INTERATIVO = "button,a,summary,select,input,textarea,label,[role=button],[role=tab],[role=link],[role=menuitem],[data-sem-ampliar],.crop-ov,.vi-ov,[hidden],[aria-hidden=true]";
  let ov = null, img = null, palco = null, rotulo = null, voltar = null, s = 1, tx = 0, ty = 0, ptrs = new Map(), gesto = null, moveu = false, ultimoToque = 0, antesOverflow = "";
  const ico = (n) => (window.ico ? window.ico(n) : n === "x" ? "×" : n === "plus" ? "+" : "−");

  /* a imagem exibida em "ajustar": cabe na tela; o zoom multiplica esse tamanho */
  function base() { const r0 = palco.getBoundingClientRect(), cs = getComputedStyle(palco), r = { width: r0.width - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0), height: r0.height - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0) }, w = img.naturalWidth || r.width, h = img.naturalHeight || r.height, k = Math.min(r.width / w, r.height / h, Infinity); return { pw: r.width, ph: r.height, w: w * k, h: h * k }; }
  function limitar() {
    const b = base(), mx = Math.max(0, (b.w * s - b.pw) / 2), my = Math.max(0, (b.h * s - b.ph) / 2);
    tx = Math.max(-mx, Math.min(mx, tx)); ty = Math.max(-my, Math.min(my, ty));
  }
  /* mostra a imagem no maior tamanho que cabe na tela (imagens pequenas também são ampliadas até preencher o palco) */
  function dimensionar() { if (!img || !palco) return; const b = base(); if (b.w > 0 && b.h > 0) { img.style.width = b.w + "px"; img.style.height = b.h + "px"; } aplicar(); }
  function aplicar() { limitar(); img.style.transform = `translate(${tx}px,${ty}px) scale(${s})`; ov.classList.toggle("vi-zoom", s > 1.01); const z = ov.querySelector("[data-vi=zoom]"); if (z) z.textContent = Math.round(s * 100) + "%"; }
  function zoomEm(novo, cx, cy) {
    novo = Math.max(MIN, Math.min(MAX, novo)); if (novo === s) return;
    const r = palco.getBoundingClientRect(), px = (cx ?? r.left + r.width / 2) - (r.left + r.width / 2), py = (cy ?? r.top + r.height / 2) - (r.top + r.height / 2), k = novo / s;
    tx = px - (px - tx) * k; ty = py - (py - ty) * k; s = novo; if (s <= 1.001) { s = 1; tx = ty = 0; } aplicar();
  }
  const ajustar = () => { s = 1; tx = ty = 0; aplicar(); };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function fechar() {
    if (!ov) return; document.removeEventListener("keydown", tecla, true); window.removeEventListener("resize", dimensionar);
    ov.remove(); ov = img = palco = null; ptrs.clear(); gesto = null; document.documentElement.style.overflow = antesOverflow;
    const v = voltar; voltar = null; if (v && v.isConnected && typeof v.focus === "function") { try { v.focus({ preventScroll: true }); } catch (_) { /* sem foco */ } }
  }
  function tecla(e) {
    if (!ov) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fechar(); }
    else if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomEm(s * 1.25); }
    else if (e.key === "-") { e.preventDefault(); zoomEm(s / 1.25); }
    else if (e.key === "0") { e.preventDefault(); ajustar(); }
    else if (s > 1 && e.key.startsWith("Arrow")) { e.preventDefault(); const p = 60; if (e.key === "ArrowLeft") tx += p; if (e.key === "ArrowRight") tx -= p; if (e.key === "ArrowUp") ty += p; if (e.key === "ArrowDown") ty -= p; aplicar(); }
    else if (e.key === "Tab") { const f = [...ov.querySelectorAll("button")]; if (!f.length) return; const i = f.indexOf(document.activeElement); e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus(); }
  }
  function abrir(o) {
    const src = o && o.src; if (!src || typeof src !== "string") return;
    fechar(); voltar = (o && o.origem) || document.activeElement; antesOverflow = document.documentElement.style.overflow; document.documentElement.style.overflow = "hidden";
    ov = document.createElement("div"); ov.className = "vi-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Visualizar imagem");
    ov.innerHTML = `<div class="vi-topo"><span class="vi-titulo"></span><button type="button" class="vi-x" data-vi="fechar" aria-label="Fechar" title="Fechar (Esc)">${ico("x")}</button></div>
      <div class="vi-palco"><img class="vi-img" alt="" draggable="false" referrerpolicy="no-referrer"></div>
      <div class="vi-barra" role="group" aria-label="Zoom"><button type="button" data-vi="menos" aria-label="Diminuir">${ico("minus")}</button><button type="button" class="vi-pct" data-vi="zoom" aria-label="Ajustar à tela" title="Ajustar à tela">100%</button><button type="button" data-vi="mais" aria-label="Ampliar">${ico("plus")}</button></div>`;
    palco = ov.querySelector(".vi-palco"); img = ov.querySelector(".vi-img"); rotulo = ov.querySelector(".vi-titulo"); rotulo.textContent = (o && o.titulo) || "";
    img.alt = (o && o.titulo) || "Imagem ampliada"; s = 1; tx = ty = 0; ptrs.clear();
    img.addEventListener("load", dimensionar); img.addEventListener("error", () => { rotulo.textContent = "Não foi possível carregar a imagem."; });
    img.src = src;
    ov.addEventListener("click", (e) => {
      const b = e.target.closest("[data-vi]");
      if (b) { const a = b.dataset.vi; if (a === "fechar") fechar(); else if (a === "mais") zoomEm(s * 1.4); else if (a === "menos") zoomEm(s / 1.4); else if (a === "zoom") ajustar(); return; }
      if (!moveu && (e.target === ov || e.target === palco)) fechar();   // toque no fundo
    });
    palco.addEventListener("wheel", (e) => { e.preventDefault(); zoomEm(s * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY); }, { passive: false });
    palco.addEventListener("pointerdown", (e) => {
      palco.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moveu = false;
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; gesto = { tipo: "pinca", d: dist(a, b), s0: s }; }
      else if (ptrs.size === 1) gesto = { tipo: "arrasta", x: e.clientX, y: e.clientY, tx0: tx, ty0: ty };
    });
    palco.addEventListener("pointermove", (e) => {
      if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (gesto && gesto.tipo === "pinca" && ptrs.size >= 2) { const [a, b] = [...ptrs.values()]; moveu = true; zoomEm(gesto.s0 * dist(a, b) / (gesto.d || 1), (a.x + b.x) / 2, (a.y + b.y) / 2); }
      else if (gesto && gesto.tipo === "arrasta") { const dx = e.clientX - gesto.x, dy = e.clientY - gesto.y; if (Math.abs(dx) + Math.abs(dy) > 4) moveu = true; if (s > 1) { tx = gesto.tx0 + dx; ty = gesto.ty0 + dy; aplicar(); } }
    });
    const solta = (e) => {
      const tinha = ptrs.delete(e.pointerId);
      if (!tinha) return;
      if (ptrs.size === 1) { const [p] = [...ptrs.values()]; gesto = { tipo: "arrasta", x: p.x, y: p.y, tx0: tx, ty0: ty }; }
      else if (!ptrs.size) {
        if (!moveu && e.type === "pointerup" && e.target === img) {                    // toque simples na imagem não fecha; duplo toque alterna o zoom
          const t = Date.now(); if (t - ultimoToque < 320) { ultimoToque = 0; if (s > 1.01) ajustar(); else zoomEm(2.5, e.clientX, e.clientY); } else ultimoToque = t;
        }
        gesto = null; setTimeout(() => { moveu = false; }, 0);
      }
    };
    palco.addEventListener("pointerup", solta); palco.addEventListener("pointercancel", solta);
    palco.addEventListener("dblclick", (e) => { e.preventDefault(); if (s > 1.01) ajustar(); else zoomEm(2.5, e.clientX, e.clientY); });
    document.addEventListener("keydown", tecla, true); window.addEventListener("resize", dimensionar);
    document.body.appendChild(ov); ov.querySelector(".vi-x").focus({ preventScroll: true });
  }

  /* ----- clique automático em imagens de conteúdo ----- */
  function elegivel(el) {
    if (!el || el.tagName !== "IMG" || !el.src || el.closest(SEL_INTERATIVO)) return false;
    const r = el.getBoundingClientRect(); return r.width >= 24 && r.height >= 24;
  }
  let dica = null;
  function esconderDica() { if (dica) dica.hidden = true; }
  function mostrarDica(el) {
    if (!dica) { dica = document.createElement("span"); dica.className = "vi-dica"; dica.setAttribute("aria-hidden", "true"); dica.innerHTML = window.ico ? window.ico("eye") : "+"; document.body.appendChild(dica); }
    const r = el.getBoundingClientRect(); dica.style.left = Math.max(2, r.right - 22) + "px"; dica.style.top = Math.max(2, r.bottom - 22) + "px"; dica.hidden = false;
  }
  document.addEventListener("click", (e) => {
    if (e.button) return;
    const el = e.target; if (!elegivel(el)) return;
    e.preventDefault(); e.stopPropagation(); esconderDica();
    abrir({ src: el.currentSrc || el.src, titulo: el.dataset.titulo || el.alt || "", origem: el });
  }, true);
  document.addEventListener("mouseover", (e) => { const el = e.target; if (el && el.tagName === "IMG" && elegivel(el)) { el.classList.add("ampliavel"); mostrarDica(el); } }, true);
  document.addEventListener("mouseout", (e) => { if (e.target && e.target.tagName === "IMG") esconderDica(); }, true);
  window.addEventListener("scroll", esconderDica, true);
  window.VISUALIZADOR = { abrir, fechar, elegivel };
})();
