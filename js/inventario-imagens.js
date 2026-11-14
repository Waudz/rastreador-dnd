/* Imagens dos itens do inventário.
   Onde ficam: dentro da própria ficha do personagem (`ficha.imagensItens`), como o retrato; viajam e sincronizam junto com a ficha (mesma gravação), sem outro sistema.
   Chave: `ref` do catálogo (poções e itens mágicos iguais compartilham uma única imagem na ficha) ou, sem `ref`, o `uid` do item.
   Valor: imagem reduzida (data:image, 192 px) enviada do aparelho, ou uma URL https (só funciona com internet).
   Biblioteca deste aparelho (localStorage): imagem de item do catálogo escolhida em um personagem aparece como sugestão nos outros personagens do mesmo aparelho, sem copiar para a ficha deles.
   Limite: a ficha tem teto de 300 KB no banco; as imagens usam no máximo ORCAMENTO caracteres. */
(() => {
  "use strict";
  const ORCAMENTO = 150000, MAX_UMA = 22000, MAX_URL = 500, BIB = "dnd5e_item_img_v1", BIB_MAX = 60;
  const ICONE = { equipamento: "bag", consumivel: "flask", magico: "sparkles", pergaminho: "book", outro: "clip" };
  const ehData = (v) => typeof v === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length <= MAX_UMA;
  const ehUrl = (v) => { if (typeof v !== "string" || v.length > MAX_URL || /\s/.test(v)) return false; try { const u = new URL(v); return u.protocol === "https:" && !!u.hostname && !u.username && !u.password; } catch (_) { return false; } };
  const valida = (v) => ehData(v) || ehUrl(v);
  const chave = (it) => (it && (it.ref || it.uid)) || "";
  const mapa = (f) => (f && f.imagensItens && typeof f.imagensItens === "object" && !Array.isArray(f.imagensItens) ? f.imagensItens : null);
  const lerBib = () => { try { const o = JSON.parse(localStorage.getItem(BIB) || "{}"); return o && typeof o === "object" && !Array.isArray(o) ? o : {}; } catch (_) { return {}; } };
  const gravarBib = (o) => { try { localStorage.setItem(BIB, JSON.stringify(o)); } catch (_) { /* sem espaço ou bloqueado: segue sem a biblioteca */ } };
  /* imagem a mostrar: a da ficha; sem ela, a sugestão da biblioteca do aparelho (só itens do catálogo) */
  const refCatalogo=it=>window.CAT_ITENS?.doInventario?.(it)?.id||it?.catId||it?.ref||'';
  function obter(f, it) {
    const propria=mapa(f)?.[chave(it)];if(valida(propria))return {src:propria,origem:'ficha'};
    const global=window.CATALOGO?.imagem('item',refCatalogo(it));if(global!==undefined)return global?{src:global,origem:'catalogo'}:null;
    const k = chave(it), m = mapa(f), v = m && k ? m[k] : null;
    if (valida(v)) return { src: v, origem: "ficha" };
    const rl = it && (it.catId || it.ref); if (rl&&window.CATALOGO?.imagem('item',rl)===undefined) { const b = lerBib()[rl]; if (valida(b)) return { src: b, origem: "aparelho" }; }
    return null;
  }
  const usado = (f, exceto) => { const m = mapa(f) || {}; return Object.entries(m).reduce((s, [k, v]) => s + (k === exceto || !ehData(v) ? 0 : v.length), 0); };
  function definir(f, it, valor) {
    const k = chave(it); if (!f || !k) return { ok: false, erro: "Item sem identificação." };
    if (!valida(valor)) return { ok: false, erro: ehData(valor) || /^data:image/.test(String(valor)) ? "A imagem ficou grande demais. Escolha outra ou use uma URL." : "Use uma URL que comece com https:// ou envie um arquivo de imagem." };
    if (ehData(valor) && usado(f, k) + valor.length > ORCAMENTO) return { ok: false, erro: "O limite de imagens desta ficha foi atingido. Remova a imagem de outro item ou use uma URL." };
    f.imagensItens = mapa(f) || {}; f.imagensItens[k] = valor;
    const rl = it.catId || it.ref; if (rl && ehData(valor)&&!window.CATALOGO) { const b = lerBib(), ks = Object.keys(b); if (!(rl in b) && ks.length >= BIB_MAX) delete b[ks[0]]; b[rl] = valor; gravarBib(b); }
    return { ok: true };
  }
  function remover(f, it) {
    const k = chave(it), m = mapa(f); if (m && k) delete m[k];
    const rl = it && (it.catId || it.ref); if (rl) { const b = lerBib(); if (rl in b) { delete b[rl]; gravarBib(b); } }   // "Remover" também tira a sugestão deste aparelho
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
  /* biblioteca deste aparelho, por referência do catálogo: a aba Itens guarda aqui a imagem de um item e todos os personagens do aparelho a veem como sugestão */
  const biblioteca = {
    obter: (ref) => { const global=window.CATALOGO?.imagem('item',ref);if(global!==undefined)return global;const b = lerBib()[ref]; return valida(b) ? b : null; },
    definir(ref, v) { if (!ref) return { ok: false, erro: "Item sem identificação." }; if (!valida(v)) return { ok: false, erro: ehData(v) || /^data:image/.test(String(v)) ? "A imagem ficou grande demais." : "Use uma URL https:// ou um arquivo de imagem." }; const b = lerBib(), ks = Object.keys(b); if (!(ref in b) && ks.length >= BIB_MAX) delete b[ks[0]]; b[ref] = v; gravarBib(b); return { ok: true }; },
    remover(ref) { const b = lerBib(); if (ref in b) { delete b[ref]; gravarBib(b); } },
  };
  window.INV_IMG = { refCatalogo, biblioteca, ORCAMENTO, ICONE, chave, valida, ehData, ehUrl, obter, definir, remover, limpar, reduzir, usado };
})();
