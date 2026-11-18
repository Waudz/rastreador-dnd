/* Monstros dos encontros: instâncias independentes guardadas em dados.monstros do encontro ou da sala.
   O bestiário continua sendo a única fonte dos monstros (IndexedDB "mon" da conta + SRD 2014 empacotado); aqui só se LÊ dele, nunca se escreve.
   Cada instância: { uid, origem (chave do bestiário), base (nome original), nome, pv, pvMax, ca, condicoes[], notas }. */
(() => {
  "use strict";
  const sem = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  const CONDICOES = ["Agarrado", "Amedrontado", "Atordoado", "Caído", "Cego", "Contido", "Enfeitiçado", "Envenenado", "Incapacitado", "Inconsciente", "Invisível", "Paralisado", "Surdo"];
  const SITUACOES = ["", "fugiu", "capturado"];
  const MAX_POR_ADICAO = 50, MAX_POR_NO = 200;
  const lista = (no) => (no && no.dados && Array.isArray(no.dados.monstros) ? no.dados.monstros : []);
  const inteiro = (v, min, max, padrao) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : padrao; };

  /* o que se guarda do bestiário: só o necessário para exibir e jogar; o registro original nunca é referenciado por objeto */
  function resumo(m, nomePt) {
    if (!m || !m.key) return null;
    const nd = m.challenge_rating, tipo = m.type && (m.type.name || m.type.key) || "";
    return { key: String(m.key), nome: String(m.name || m.key), nomePt: nomePt || "", ca: inteiro(m.armor_class, 0, 99, 10), pv: inteiro(m.hit_points, 0, 99999, 1), nd: nd === 0.125 ? "1/8" : nd === 0.25 ? "1/4" : nd === 0.5 ? "1/2" : nd == null ? "" : String(nd), tipo, tamanho: m.size && (m.size.name || "") || "", custom: !!m.custom, ini: inteiro(m.initiative_bonus != null ? m.initiative_bonus : Math.floor(((m.ability_scores && m.ability_scores.dexterity != null ? m.ability_scores.dexterity : 10) - 10) / 2), -10, 20, 0) };
  }
  const buscar = (catalogo, termo, limite = 30) => { const t = sem(termo).trim(); if (!t) return []; return catalogo.filter((r) => sem(r.nome).includes(t) || sem(r.nomePt).includes(t)).sort((a, b) => (sem(a.nomePt || a.nome).startsWith(t) ? 0 : 1) - (sem(b.nomePt || b.nome).startsWith(t) ? 0 : 1) || sem(a.nomePt || a.nome).localeCompare(sem(b.nomePt || b.nome))).slice(0, limite); };

  /* numeração automática por origem, em todo o encontro (sala ou encontro): "Goblin", depois "Goblin 1", "Goblin 2"...
     Ao passar de um para vários, o primeiro (se ainda tem o nome original) vira "Goblin 1"; nomes editados à mão não são mexidos. */
  function nomeBase(r) { return r.nomePt || r.nome; }
  function adicionar(todos, registro, quantidade) {
    const q = inteiro(quantidade, 1, MAX_POR_ADICAO, 1), base = nomeBase(registro);
    const mesmos = todos.filter((m) => m.origem === registro.key);
    const usados = new Set(todos.map((m) => sem(m.nome)));
    const renomeados = [];
    if (mesmos.length === 0 && q === 1) { const n = usados.has(sem(base)) ? proximoNome(base, usados) : base; return { novos: [criar(registro, n)], renomeados }; }
    if (mesmos.length === 1 && mesmos[0].nome === base) { renomeados.push({ uid: mesmos[0].uid, nome: base + " 1" }); usados.delete(sem(base)); usados.add(sem(base + " 1")); }
    const novos = []; for (let i = 0; i < q; i++) { const n = proximoNome(base, usados); usados.add(sem(n)); novos.push(criar(registro, n)); }
    return { novos, renomeados };
  }
  function proximoNome(base, usados) { let i = 1; while (usados.has(sem(base + " " + i))) i++; return base + " " + i; }
  function criar(r, nome) { return { uid: uid(), origem: r.key, base: r.nome, nome, pv: r.pv, pvMax: r.pv, ca: r.ca, condicoes: [], notas: "", situacao: "", bonusIni: r.ini || 0 }; }

  /* edição rápida: valida e devolve a cópia alterada, sem mexer no original */
  function editar(m, campos) {
    const n = { ...m, condicoes: Array.isArray(m.condicoes) ? m.condicoes.slice() : [] };
    if ("nome" in campos) { const t = String(campos.nome || "").replace(/\s+/g, " ").trim(); if (!t || t.length > 80) return { erro: "Informe um nome de até 80 caracteres." }; n.nome = t; }
    if ("pvMax" in campos) n.pvMax = inteiro(campos.pvMax, 1, 99999, m.pvMax);
    if ("pv" in campos) n.pv = inteiro(campos.pv, 0, 99999, m.pv);
    if ("ca" in campos) n.ca = inteiro(campos.ca, 0, 99, m.ca);
    if ("condicoes" in campos) n.condicoes = [...new Set((campos.condicoes || []).filter((c) => CONDICOES.includes(c)))];
    if ("loot" in campos) { const l = normalizarLoot(campos.loot); if (temLoot(l)) n.loot = l; else delete n.loot; }
    if ("situacao" in campos) n.situacao = SITUACOES.includes(campos.situacao) ? campos.situacao : "";
    if ("notas" in campos) n.notas = String(campos.notas || "").slice(0, 2000);
    if (n.pv > n.pvMax) n.pv = n.pvMax;
    return { ok: true, monstro: n };
  }
  /* mover instâncias inteiras (mesmo uid, mesmos PV, condições e nome) de uma lista para outra */
  function mover(origem, destino, uids) {
    const s = new Set(uids), movidos = origem.filter((m) => s.has(m.uid));
    if (!movidos.length) return { erro: "Nada selecionado." };
    if (destino.length + movidos.length > MAX_POR_NO) return { erro: "O destino passaria de " + MAX_POR_NO + " monstros." };
    const existentes = new Set(destino.map((m) => m.uid)); if (movidos.some((m) => existentes.has(m.uid))) return { erro: "Algum monstro já está no destino." };
    return { ok: true, origem: origem.filter((m) => !s.has(m.uid)), destino: destino.concat(movidos.map((m) => JSON.parse(JSON.stringify(m)))), movidos };
  }

  /* ---------- leitura do bestiário (somente leitura) ---------- */
  let carregando = null;
  function lerIndexedDB() {
    return new Promise((ok) => {
      try {
        if (!window.indexedDB || !window.acervo) return ok({ mon: [], img: {} });
        const o = indexedDB.open(acervo.banco());
        o.onerror = () => ok({ mon: [], img: {} });
        o.onupgradeneeded = () => { try { o.transaction.abort(); } catch (_) { /* banco inexistente: não criar */ } };
        o.onsuccess = () => {
          const d = o.result; if (!d.objectStoreNames.contains("mon")) { d.close(); return ok({ mon: [], img: {} }); }
          const nomes = d.objectStoreNames.contains("img") ? ["mon", "img"] : ["mon"], tx = d.transaction(nomes), r = tx.objectStore("mon").getAll(), im = nomes.length > 1 ? tx.objectStore("img").getAll() : { result: [] };
          tx.oncomplete = () => { d.close(); ok({ mon: r.result || [], img: Object.fromEntries((im.result || []).filter((x) => x && typeof x.data === "string" && x.data.startsWith("data:image/")).map((x) => [x.key, x.data])) }); };
          tx.onerror = () => { d.close(); ok({ mon: [], img: {} }); };
        };
      } catch (_) { ok({ mon: [], img: {} }); }
    });
  }
  async function carregarBestiario() {
    if (carregando) return carregando;
    carregando = (async () => {
      const [local, pt, srd, pub] = await Promise.all([lerIndexedDB(), fetch("dados/srd-pt.json").then((r) => r.ok ? r.json() : { M: {} }).catch(() => ({ M: {} })), fetch("dados/bestiario/srd-2014.json").then((r) => r.ok ? r.json() : { monsters: [] }).catch(() => ({ monsters: [] })), fetch("fotos/index.json").then((r) => r.ok ? r.json() : []).catch(() => [])]);
      const PUB = new Set(Array.isArray(pub) ? pub : []);
      const porChave = new Map(); for (const m of srd.monsters || []) porChave.set(m.key, m); for (const m of local.mon) if (m && m.key) porChave.set(m.key, m);
      const nomePt = (m) => { const k = String(m.name || "").toLowerCase(), g = window.CATALOGO && CATALOGO.registro && CATALOGO.registro("monstro", m.key); return (g && g.dados && g.dados.nomeCatalogo) || (pt.M && pt.M[k]) || ""; };
      const catalogo = [...porChave.values()].map((m) => resumo(m, nomePt(m))).filter(Boolean);
      /* mesma ordem de escolha do bestiário (js/app.js, av): catálogo da conta, foto própria, foto pública do site, ilustração */
      const foto = (key) => { const m = porChave.get(key), g = window.CATALOGO && CATALOGO.imagem && CATALOGO.imagem("monstro", key); if (g !== undefined) return g || ""; if (local.img[key]) return local.img[key]; if (m && !m.custom && PUB.has(key)) return "fotos/" + String(key).replace(/[^\w.-]/g, "_") + ".jpg"; const il = m && (typeof m.illustration === "string" ? m.illustration : (m.illustration && (m.illustration.url || m.illustration.image))); return il || ""; };
      return { catalogo, porChave: new Map(catalogo.map((r) => [r.key, r])), foto };
    })();
    try { return await carregando; } catch (e) { carregando = null; throw e; }
  }
  /* ---------- loot individual (dentro de cada instância: m.loot) ----------
     loot = { moedas: { pc, pp, po }, moedasColetadas: {…}, moedasDistribuidas: {…}, itens: [{ lid, catId|null, nome, qtd, custom, descoberto, coletado, distribuido }] }
     Itens usam o mesmo catId do catálogo (dados/itens-srd2014.json) que o inventário usa, para a futura entrega pelo fluxo de "Distribuir recompensas" (nenhum sistema paralelo).
     Quantidades: distribuido <= coletado <= qtd; "restante" = qtd - distribuido. Editar PV/condições nunca toca em m.loot (editar() copia o resto da instância). */
  const MOEDAS = ["pc", "pp", "po"], NOMES_MOEDA = { pc: "PC", pp: "PP", po: "PO" };
  const zeroMoedas = () => ({ pc: 0, pp: 0, po: 0 });
  const moedasValidas = (o) => { const r = zeroMoedas(); for (const k of MOEDAS) r[k] = inteiro(o && o[k], 0, 99999999, 0); return r; };
  const lid = () => "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  function lootVazio() { return { moedas: zeroMoedas(), moedasColetadas: zeroMoedas(), moedasDistribuidas: zeroMoedas(), itens: [] }; }
  function normalizarLoot(l) {
    const o = lootVazio(); if (!l || typeof l !== "object") return o;
    o.moedas = moedasValidas(l.moedas);
    for (const k of MOEDAS) { const col = Math.min(o.moedas[k], inteiro(l.moedasColetadas && l.moedasColetadas[k], 0, 99999999, 0)); o.moedasColetadas[k] = col; o.moedasDistribuidas[k] = Math.min(col, inteiro(l.moedasDistribuidas && l.moedasDistribuidas[k], 0, 99999999, 0)); }
    o.itens = (Array.isArray(l.itens) ? l.itens : []).slice(0, 100).map((i) => {
      const nome = String(i && i.nome || "").replace(/\s+/g, " ").trim().slice(0, 120); if (!nome) return null;
      const qtd = inteiro(i.qtd, 1, 9999, 1), coletado = Math.min(qtd, inteiro(i.coletado, 0, 9999, 0));
      return { lid: String(i.lid || lid()), catId: i.catId ? String(i.catId).slice(0, 160) : null, nome, qtd, custom: !!i.custom || !i.catId, descoberto: !!i.descoberto || coletado > 0, coletado, distribuido: Math.min(coletado, inteiro(i.distribuido, 0, 9999, 0)) };
    }).filter(Boolean);
    return o;
  }
  const lootDe = (m) => normalizarLoot(m && m.loot);
  const restante = (i) => i.qtd - i.distribuido;
  const temLoot = (l) => !!l && (l.itens.length > 0 || MOEDAS.some((k) => l.moedas[k] > 0));
  /* adiciona item do catálogo (mesmo catId soma a quantidade) ou personalizado (nome livre) */
  function adicionarItemLoot(loot, { catId, nome, qtd = 1 }) {
    const l = normalizarLoot(loot), q = inteiro(qtd, 1, 9999, 1), n = String(nome || "").replace(/\s+/g, " ").trim().slice(0, 120); if (!n) return { erro: "Informe o nome do item." };
    const ex = catId ? l.itens.find((i) => i.catId === catId) : null;
    if (ex) ex.qtd = Math.min(9999, ex.qtd + q);
    else { if (l.itens.length >= 100) return { erro: "Limite de 100 itens por criatura." }; l.itens.push({ lid: lid(), catId: catId || null, nome: n, qtd: q, custom: !catId, descoberto: false, coletado: 0, distribuido: 0 }); }
    return { ok: true, loot: l };
  }
  const removerItemLoot = (loot, id) => { const l = normalizarLoot(loot); l.itens = l.itens.filter((i) => i.lid !== id); return l; };
  /* registro de acompanhamento de um item: descoberto / coletado / distribuído, inclusive parcial; a quantidade restante é preservada */
  function registrarItem(loot, id, campos) {
    const l = normalizarLoot(loot), i = l.itens.find((x) => x.lid === id); if (!i) return l;
    if ("qtd" in campos) { i.qtd = inteiro(campos.qtd, 1, 9999, i.qtd); i.coletado = Math.min(i.coletado, i.qtd); i.distribuido = Math.min(i.distribuido, i.coletado); }
    if ("descoberto" in campos) i.descoberto = !!campos.descoberto;
    if ("coletado" in campos) { i.coletado = inteiro(campos.coletado, 0, i.qtd, i.coletado); i.distribuido = Math.min(i.distribuido, i.coletado); if (i.coletado > 0) i.descoberto = true; }
    if ("distribuido" in campos) i.distribuido = inteiro(campos.distribuido, 0, i.coletado, i.distribuido);
    return l;
  }
  function registrarMoedas(loot, campos) {
    const l = normalizarLoot(loot);
    if (campos.moedas) l.moedas = moedasValidas({ ...l.moedas, ...campos.moedas });
    for (const k of MOEDAS) { l.moedasColetadas[k] = Math.min(l.moedas[k], campos.moedasColetadas && k in campos.moedasColetadas ? inteiro(campos.moedasColetadas[k], 0, l.moedas[k], 0) : l.moedasColetadas[k]); l.moedasDistribuidas[k] = Math.min(l.moedasColetadas[k], campos.moedasDistribuidas && k in campos.moedasDistribuidas ? inteiro(campos.moedasDistribuidas[k], 0, l.moedasColetadas[k], 0) : l.moedasDistribuidas[k]); }
    return l;
  }
  /* o mesmo loot inicial para várias criaturas: cópia profunda com ids novos e SEM acompanhamento; depois cada uma segue independente (nada fica ligado).
     modo "somar" junta ao que já existe; "substituir" troca o loot atual (quem já tem coleta registrada é preservado se preservarRegistros). */
  function copiarLootInicial(loot) {
    const l = normalizarLoot(loot), o = lootVazio(); o.moedas = { ...l.moedas };
    o.itens = l.itens.map((i) => ({ lid: lid(), catId: i.catId, nome: i.nome, qtd: i.qtd, custom: i.custom, descoberto: false, coletado: 0, distribuido: 0 })); return o;
  }
  function aplicarLootEmVarios(lista, uids, loot, modo = "somar") {
    const s = new Set(uids);
    return lista.map((m) => {
      if (!s.has(m.uid)) return m;
      const novo = copiarLootInicial(loot);
      if (modo === "somar") { const atual = lootDe(m); for (const k of MOEDAS) atual.moedas[k] = Math.min(99999999, atual.moedas[k] + novo.moedas[k]); for (const i of novo.itens) { const r = adicionarItemLoot(atual, i); if (r.ok) Object.assign(atual, r.loot); } return { ...m, loot: atual }; }
      return { ...m, loot: novo };
    });
  }
  /* catálogo de itens para a busca (só leitura dos dados do site; os mesmos ids do inventário) */
  let itensCatalogo = null;
  async function carregarItens() {
    if (itensCatalogo) return itensCatalogo;
    const d = await fetch("dados/itens-srd2014.json").then((r) => (r.ok ? r.json() : { itens: [] })).catch(() => ({ itens: [] }));
    itensCatalogo = (Array.isArray(d.itens) ? d.itens : []).filter((i) => i && i.id && i.nome).map((i) => ({ id: i.id, nome: i.nome, en: i.en || "", categoria: i.categoria || "" }));
    return itensCatalogo;
  }
  const buscarItens = (catalogo, termo, limite = 12) => { const t = sem(termo).trim(); return t ? catalogo.filter((i) => sem(i.nome).includes(t) || sem(i.en).includes(t)).slice(0, limite) : []; };
  window.ENCONTROS_MONSTROS = { MOEDAS, NOMES_MOEDA, lootVazio, normalizarLoot, lootDe, restante, temLoot, adicionarItemLoot, removerItemLoot, registrarItem, registrarMoedas, copiarLootInicial, aplicarLootEmVarios, carregarItens, buscarItens, CONDICOES, MAX_POR_ADICAO, MAX_POR_NO, lista, resumo, buscar, adicionar, editar, mover, carregarBestiario, nomeBase };
})();
