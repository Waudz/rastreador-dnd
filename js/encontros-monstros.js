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
  window.ENCONTROS_MONSTROS = { CONDICOES, MAX_POR_ADICAO, MAX_POR_NO, lista, resumo, buscar, adicionar, editar, mover, carregarBestiario, nomeBase };
})();
