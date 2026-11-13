/* Imagens dos itens do inventário.
   Onde ficam: dentro da própria ficha do personagem (`ficha.imagensItens`), como o retrato; viajam e sincronizam junto com a ficha (mesma gravação), sem outro sistema.
   Chave: `ref` do catálogo (poções e itens mágicos iguais compartilham uma única imagem na ficha) ou, sem `ref`, o `uid` do item.
   Valor: imagem reduzida (data:image, 192 px) enviada do aparelho, ou uma URL https (só funciona com internet).
   Biblioteca deste aparelho (localStorage): imagem de item do catálogo escolhida em um personagem aparece como sugestão nos outros personagens do mesmo aparelho, sem copiar para a ficha deles.
   Limite: a ficha tem teto de 300 KB no banco; as imagens usam no máximo ORCAMENTO caracteres. */
(() => {
  "use strict";
  const ORCAMENTO = 150000, MAX_UMA = 22000, MAX_URL = 500, BIB = "dnd5e_item_img_v1", BIB_MAX = 30;
  const ICONE = { equipamento: "bag", consumivel: "flask", magico: "sparkles", pergaminho: "book", outro: "clip" };
  const ehData = (v) => typeof v === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length <= MAX_UMA;
  const ehUrl = (v) => { if (typeof v !== "string" || v.length > MAX_URL || /\s/.test(v)) return false; try { const u = new URL(v); return u.protocol === "https:" && !!u.hostname && !u.username && !u.password; } catch (_) { return false; } };
  const valida = (v) => ehData(v) || ehUrl(v);
  const chave = (it) => (it && (it.ref || it.uid)) || "";
  const mapa = (f) => (f && f.imagensItens && typeof f.imagensItens === "object" && !Array.isArray(f.imagensItens) ? f.imagensItens : null);
  const lerBib = () => { try { const o = JSON.parse(localStorage.getItem(BIB) || "{}"); return o && typeof o === "object" && !Array.isArray(o) ? o : {}; } catch (_) { return {}; } };
  const gravarBib = (o) => { try { localStorage.setItem(BIB, JSON.stringify(o)); } catch (_) { /* sem espaço ou bloqueado: segue sem a biblioteca */ } };
  /* imagem a mostrar: a da ficha; sem ela, a sugestão da biblioteca do aparelho (só itens do catálogo) */
  function obter(f, it) {
    const k = chave(it), m = mapa(f), v = m && k ? m[k] : null;
    if (valida(v)) return { src: v, origem: "ficha" };
    if (it && it.ref) { const b = lerBib()[it.ref]; if (valida(b)) return { src: b, origem: "aparelho" }; }
    return null;
  }
  const usado = (f, exceto) => { const m = mapa(f) || {}; return Object.entries(m).reduce((s, [k, v]) => s + (k === exceto || !ehData(v) ? 0 : v.length), 0); };
  function definir(f, it, valor) {
    const k = chave(it); if (!f || !k) return { ok: false, erro: "Item sem identificação." };
    if (!valida(valor)) return { ok: false, erro: ehData(valor) || /^data:image/.test(String(valor)) ? "A imagem ficou grande demais. Escolha outra ou use uma URL." : "Use uma URL que comece com https:// ou envie um arquivo de imagem." };
    if (ehData(valor) && usado(f, k) + valor.length > ORCAMENTO) return { ok: false, erro: "O limite de imagens desta ficha foi atingido. Remova a imagem de outro item ou use uma URL." };
    f.imagensItens = mapa(f) || {}; f.imagensItens[k] = valor;
    if (it.ref && ehData(valor)) { const b = lerBib(), ks = Object.keys(b); if (!(it.ref in b) && ks.length >= BIB_MAX) delete b[ks[0]]; b[it.ref] = valor; gravarBib(b); }
    return { ok: true };
  }
  function remover(f, it) {
    const k = chave(it), m = mapa(f); if (m && k) delete m[k];
    if (it && it.ref) { const b = lerBib(); if (it.ref in b) { delete b[it.ref]; gravarBib(b); } }   // "Remover" também tira a sugestão deste aparelho
  }
  /* tira da ficha as imagens de itens que não existem mais (itens com a mesma chave continuam usando a imagem) */
  function limpar(f, itens) {
    const m = mapa(f); if (!m) return false; const vivas = new Set((itens || []).map(chave)); let mudou = false;
    for (const k of Object.keys(m)) if (!vivas.has(k) || !valida(m[k])) { delete m[k]; mudou = true; }
    if (!Object.keys(m).length) { delete f.imagensItens; mudou = true; }
    return mudou;
  }
  /* reduz uma imagem (data URL) para uma miniatura quadrada; só no navegador */
  function reduzir(dataUrl, lado = 192, qualidade = 0.72) {
    return new Promise((ok, no) => {
      const im = new Image();
      im.onerror = () => no(new Error("imagem inválida"));
      im.onload = () => { const c = document.createElement("canvas"); c.width = c.height = lado; const x = c.getContext("2d"), s = Math.min(im.width, im.height); x.fillStyle = "#fff"; x.fillRect(0, 0, lado, lado); x.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, lado, lado); ok(c.toDataURL("image/jpeg", qualidade)); };
      im.src = dataUrl;
    });
  }
  window.INV_IMG = { ORCAMENTO, ICONE, chave, valida, ehData, ehUrl, obter, definir, remover, limpar, reduzir, usado };
})();
