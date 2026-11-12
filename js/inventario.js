/* Inventário de D&D 5e: itens com identificador único, origem e histórico de movimentações.
   Feito para servir, no futuro, a personagens, NPCs, monstros, lojas, baús e coleções de saque: tudo opera sobre um CONTÊINER
   { dono: {tipo, id}, itens: [...], movimentos: [...] }. O personagem usa P.inventario como `itens` e ficha.movimentos como `movimentos`
   (ver `conteinerDe`). Não há interface de lojas ou baús; só a estrutura e as operações puras.
   Formato do item: { uid, ref, nome, qtd, peso, preco, tipo, equipado, origem:{tipo,id?,nota?}, propriedades:{...}, magiaVinculada:{en,n,l}|null, desc }.
   Propriedades usadas hoje: raridade, sintonia:{requer,sintonizado}, cargas:{atual,max,recarga}. Outras chaves são aceitas e preservadas. */
(() => {
  "use strict";
  const TIPOS = { equipamento: "Equipamento", consumivel: "Consumível", magico: "Item mágico", pergaminho: "Pergaminho de magia", outro: "Outro" };
  const LIMITE_SINTONIA = 3;                    // 2014: no máximo 3 itens mágicos sintonizados ao mesmo tempo
  const LIMITE_LOG = 200;
  const agora = () => new Date().toISOString();
  const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const copia = (o) => JSON.parse(JSON.stringify(o));
  const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? "it_" + crypto.randomUUID() : "it_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  const hash = (s) => { let h = 5381; for (const c of String(s)) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return h.toString(36); };

  function novoItem(d = {}) {
    const tipo = TIPOS[d.tipo] ? d.tipo : "equipamento";
    return {
      uid: d.uid || uid(), ref: d.ref || null, nome: String(d.nome || "").slice(0, 120), qtd: Math.max(0, num(d.qtd, 1)), peso: Math.max(0, num(d.peso, 0)),
      preco: d.preco == null ? null : num(d.preco, 0), tipo, equipado: !!d.equipado,
      origem: d.origem && d.origem.tipo ? { ...d.origem } : { tipo: "jogo" },
      propriedades: d.propriedades && typeof d.propriedades === "object" ? copia(d.propriedades) : {},
      magiaVinculada: d.magiaVinculada ? { en: d.magiaVinculada.en, n: d.magiaVinculada.n, l: Number(d.magiaVinculada.l) } : null,
      desc: String(d.desc || "").slice(0, 1500),
    };
  }
  /* Completa itens antigos (sem uid, tipo, origem). Os identificadores dos itens antigos são determinísticos (não mudam a cada carregamento)
     e passam a valer de verdade na próxima gravação. Devolve true se algo mudou. */
  function normalizar(itens, prefixo = "ant") {
    let mudou = false;
    (itens || []).forEach((it, i) => {
      if (!it || typeof it !== "object") return;
      if (!it.uid) { it.uid = `${prefixo}_${i}_${hash(it.nome)}`; mudou = true; }
      if (!TIPOS[it.tipo]) { it.tipo = "equipamento"; mudou = true; }
      if (!it.origem || !it.origem.tipo) { it.origem = { tipo: "inicial" }; mudou = true; }
      if (!it.propriedades || typeof it.propriedades !== "object") { it.propriedades = {}; mudou = true; }
      if (it.magiaVinculada === undefined) { it.magiaVinculada = null; mudou = true; }
      if (it.ref === undefined) { it.ref = null; mudou = true; }
      it.qtd = Math.max(0, num(it.qtd, 1)); it.peso = Math.max(0, num(it.peso, 0));
    });
    return mudou;
  }
  /* Contêiner de um personagem (o mesmo formato serve a NPC, monstro, loja, baú ou saque). */
  function conteinerDe(P) {
    P.inventario = Array.isArray(P.inventario) ? P.inventario : [];
    P.ficha = P.ficha || {}; P.ficha.movimentos = Array.isArray(P.ficha.movimentos) ? P.ficha.movimentos : [];
    return { dono: { tipo: "personagem", id: P.id || null }, itens: P.inventario, movimentos: P.ficha.movimentos };
  }
  function registrar(c, ev) {
    c.movimentos.push({ id: "mv_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), quando: agora(), ...ev });
    if (c.movimentos.length > LIMITE_LOG) c.movimentos.splice(0, c.movimentos.length - LIMITE_LOG);
  }
  const mesmaPilha = (a, b) => a.ref && b.ref ? a.ref === b.ref && a.tipo === b.tipo && JSON.stringify(a.propriedades) === JSON.stringify(b.propriedades) && !a.magiaVinculada && !b.magiaVinculada
    : !!(a.magiaVinculada && b.magiaVinculada && a.magiaVinculada.en === b.magiaVinculada.en && a.tipo === b.tipo);
  const acha = (c, id) => c.itens.find((i) => i.uid === id);

  /* Entra no contêiner. Itens idênticos do catálogo (e pergaminhos da mesma magia) somam na mesma pilha. */
  function adicionar(c, dados, meta = {}) {
    const item = dados && dados.uid && dados.origem ? dados : novoItem(dados);
    const pilha = c.itens.find((x) => mesmaPilha(x, item));
    let alvo = item;
    if (pilha) { pilha.qtd += item.qtd; alvo = pilha; } else c.itens.push(item);
    registrar(c, { tipo: meta.tipo || "entrada", uid: alvo.uid, nome: item.nome, qtd: item.qtd, origem: meta.origem || item.origem, de: meta.de || null, nota: meta.nota || "" });
    return alvo;
  }
  /* Sai do contêiner (descarte, venda, uso, transferência). Devolve o que saiu (com a quantidade retirada). */
  function retirar(c, id, qtd, meta = {}) {
    const it = acha(c, id); if (!it) throw new Error("Item não encontrado.");
    const n = qtd == null ? it.qtd : Math.floor(num(qtd, 0));
    if (!(n >= 1) || n > it.qtd) throw new Error("Quantidade inválida: há " + it.qtd + ".");
    let saiu;
    if (n === it.qtd) { c.itens.splice(c.itens.indexOf(it), 1); saiu = it; }
    else { it.qtd -= n; saiu = { ...copia(it), uid: uid(), qtd: n, origemUid: it.uid }; }
    registrar(c, { tipo: meta.tipo || "saida", uid: it.uid, nome: it.nome, qtd: n, para: meta.para || null, nota: meta.nota || "", ...(meta.extra || {}) });
    return saiu;
  }
  /* Consome unidades (poção, pergaminho usado ou destruído). */
  const consumir = (c, id, qtd = 1, nota = "", tipo = "uso") => retirar(c, id, qtd, { tipo, nota });
  /* Passa de um contêiner a outro, sem duplicar nem perder item. Antes de mexer em qualquer um, confere tudo. */
  function transferir(origem, destino, id, qtd, meta = {}) {
    const it = acha(origem, id); if (!it) throw new Error("Item não encontrado.");
    const n = qtd == null ? it.qtd : Math.floor(num(qtd, 0));
    if (!(n >= 1) || n > it.qtd) throw new Error("Quantidade inválida: há " + it.qtd + ".");
    const saiu = retirar(origem, id, n, { tipo: "transferencia-saida", para: destino.dono, nota: meta.nota });
    const entrou = { ...saiu, origem: { tipo: meta.origem || "transferencia", id: origem.dono && origem.dono.id, nota: meta.nota || "" } };
    return adicionar(destino, entrou, { tipo: "transferencia-entrada", de: origem.dono, nota: meta.nota });
  }
  function criarPergaminho(magia, meta = {}) {
    if (!magia || !(Number(magia.l) >= 0)) throw new Error("Escolha a magia do pergaminho.");
    return novoItem({ nome: "Pergaminho de Magia: " + magia.n, qtd: meta.qtd || 1, peso: 0, tipo: "pergaminho", origem: meta.origem || { tipo: "jogo" }, propriedades: { circulo: Number(magia.l) }, magiaVinculada: { en: magia.en || magia.n, n: magia.n, l: Number(magia.l) } });
  }
  const sintonizados = (itens) => (itens || []).filter((i) => i.propriedades && i.propriedades.sintonia && i.propriedades.sintonia.sintonizado).length;
  function sintonizar(c, id, ligar) {
    const it = acha(c, id); if (!it) throw new Error("Item não encontrado.");
    const s = it.propriedades.sintonia; if (!s || !s.requer) throw new Error("Este item não exige sintonia.");
    if (ligar && !s.sintonizado && sintonizados(c.itens) >= LIMITE_SINTONIA) throw new Error("Você já está sintonizado com " + LIMITE_SINTONIA + " itens. Encerre uma sintonia antes.");
    s.sintonizado = !!ligar; return it;
  }
  function usarCarga(c, id, n = 1) {
    const it = acha(c, id), g = it && it.propriedades.cargas; if (!g) throw new Error("Este item não tem cargas.");
    if (g.atual < n) throw new Error("Cargas insuficientes."); g.atual -= n;
    registrar(c, { tipo: "carga", uid: id, nome: it.nome, qtd: n, nota: "" }); return g;
  }
  const pesoTotal = (itens) => (itens || []).reduce((s, i) => s + num(i.qtd, 0) * num(i.peso, 0), 0);
  const ROTULO_MOV = { entrada: "Entrada", saida: "Saída", uso: "Uso", descarte: "Descarte", carga: "Carga usada", copia: "Pergaminho copiado", "transferencia-entrada": "Recebido", "transferencia-saida": "Entregue", compra: "Compra", venda: "Venda", saque: "Saque" };

  window.INVENTARIO = { TIPOS, LIMITE_SINTONIA, novoItem, normalizar, conteinerDe, adicionar, retirar, consumir, transferir, criarPergaminho, sintonizar, sintonizados, usarCarga, pesoTotal, registrar, ROTULO_MOV };
})();
