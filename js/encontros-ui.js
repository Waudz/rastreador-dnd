/* Aba Encontros da campanha (só o mestre): árvore de pastas, encontros e salas + detalhes. Regras e dados: js/encontros-dados.js.
   Etapa 1: estrutura, navegação, criar/renomear/mover/ordenar/duplicar/excluir (lixeira), descrição, estados e busca por nome.
   Monstros, elementos, loot, imagens/mapa e a integração com a Iniciativa vêm nas próximas etapas (seções já reservadas na tela). */
(() => {
  "use strict";
  const D = window.ENCONTROS_DADOS, esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ico = (n) => (window.ico ? window.ico(n) : "");
  const perguntar = (m, o) => (typeof CONFIRMAR === "function" ? CONFIRMAR(m, o) : Promise.resolve(confirm(m)));
  const estados = {};                                    // um estado por campanha: sobrevive a redesenhos da página da campanha
  const larga = () => (typeof innerWidth !== "undefined" ? innerWidth : 1200) >= 860;
  const ICONE = { pasta: "folder", encontro: "swords", sala: "door" };

  function estadoDe(campanhaId, nuvem) {
    if (estados[campanhaId]) return estados[campanhaId];
    let ui = {}; try { ui = JSON.parse(localStorage.getItem("compendio:encontros-ui:" + campanhaId) || "{}") || {}; } catch (_) { /* sem preferências */ }
    return (estados[campanhaId] = { campanhaId, nos: [], carregado: false, erro: "", sel: ui.sel || null, abertos: new Set(ui.abertos || []), busca: "", lixeira: false, editando: false, arvoreAberta: false, selMon: new Set(), editMon: null, bestiario: null, locais: 0, repo: D.criarRepositorio(campanhaId, nuvem), msg: "" });
  }
  const guardarUi = (s) => { try { localStorage.setItem("compendio:encontros-ui:" + s.campanhaId, JSON.stringify({ sel: s.sel, abertos: [...s.abertos] })); } catch (_) { /* sem preferências */ } };

  /* ---------- desenho ---------- */
  const rotuloNo = (n) => `<span class="enc-ico" aria-hidden="true">${ico(ICONE[n.tipo])}</span><span class="enc-nome-txt">${esc(n.nome)}</span>`;
  function menuDe(n) {
    const b = (acao, texto, perigo) => `<button type="button" data-enc-acao="${acao}" data-id="${esc(n.id)}"${perigo ? ' class="danger"' : ""}>${texto}</button>`;
    const ordem = b("subir", "Subir") + b("descer", "Descer");
    const itens = n.tipo === "pasta" ? b("nova-pasta", "Nova subpasta") + b("novo-encontro", "Novo encontro aqui") + b("renomear", "Renomear") + b("mover", "Mover para…") + ordem + b("excluir", "Excluir…", true)
      : n.tipo === "encontro" ? (D.modoDe(n) === "salas" ? b("sala", "Adicionar sala") + b("salas", "Adicionar várias salas…") : "") + b("renomear", "Renomear") + b("mover", "Mover para…") + b("duplicar", "Duplicar") + ordem + b("excluir", "Excluir…", true)
      : b("renomear", "Renomear") + ordem + b("excluir", "Excluir…", true);
    return `<details class="inv-mais enc-mais"><summary aria-label="Ações de ${esc(n.nome)}" title="Ações">${ico("more")}</summary><div class="inv-mais-menu">${itens}</div></details>`;
  }
  function linhaArvore(item, nivel, s) {
    const n = item.no, tem = item.filhos.length > 0, aberto = s.abertos.has(n.id), sel = s.sel === n.id;
    const c = n.tipo === "encontro" ? item.filhos.length : D.contar(s.nos, n.id).encontros + (n.tipo === "pasta" ? 0 : 0);
    const selo = n.tipo === "encontro" ? `<span class="enc-selo ${n.dados.concluido ? "ok" : n.dados.estado === "preparado" ? "prep" : ""}" aria-label="${n.dados.concluido ? "Concluído" : D.ESTADOS[n.dados.estado] || ""}" title="${n.dados.concluido ? "Concluído" : D.ESTADOS[n.dados.estado] || ""}">${n.dados.concluido ? "Concluído" : D.ESTADOS[n.dados.estado] || ""}</span>`
      : n.tipo === "sala" ? `<span class="enc-selo ${n.dados.explorada ? "ok" : ""}" title="${n.dados.explorada ? "Explorada" : "Não explorada"}" aria-label="${n.dados.explorada ? "Explorada" : "Não explorada"}">${n.dados.explorada ? "Explorada" : "Não explorada"}</span>` : (c ? `<span class="enc-qtd" title="Encontros dentro desta pasta">${c}</span>` : "");
    return `<li role="none"><div class="enc-linha${sel ? " sel" : ""}" role="treeitem" aria-level="${nivel + 1}" aria-selected="${sel}"${tem ? ` aria-expanded="${aberto}"` : ""} style="--n:${nivel}">
      ${tem ? `<button type="button" class="enc-seta${aberto ? " aberto" : ""}" data-enc-acao="alternar" data-id="${esc(n.id)}" aria-label="${aberto ? "Recolher" : "Expandir"} ${esc(n.nome)}">${ico("chevdown")}</button>` : '<span class="enc-seta vazio"></span>'}
      <button type="button" class="enc-nome" data-enc-acao="selecionar" data-id="${esc(n.id)}" title="${esc(n.nome)}">${rotuloNo(n)}</button>${selo}${menuDe(n)}</div>
      ${tem && aberto ? `<ul role="group">${item.filhos.map((f) => linhaArvore(f, nivel + 1, s)).join("")}</ul>` : ""}</li>`;
  }
  function htmlArvore(s) {
    const termo = s.busca.trim();
    if (termo) {
      const r = D.buscar(s.nos, termo);
      return r.length ? `<ul class="enc-resultados">${r.map((n) => `<li><button type="button" class="enc-resultado" data-enc-acao="selecionar" data-id="${esc(n.id)}">${rotuloNo(n)}<span class="muted enc-caminho">${esc(D.caminho(s.nos, n.id).slice(0, -1).map((x) => x.nome).join(" › "))}</span></button></li>`).join("")}</ul>` : '<p class="muted enc-vazio">Nada encontrado com esse nome.</p>';
    }
    const arv = D.arvore(s.nos);
    return arv.length ? `<ul class="enc-lista" role="tree" aria-label="Pastas, encontros e salas">${arv.map((i) => linhaArvore(i, 0, s)).join("")}</ul>`
      : '<div class="enc-vazio"><p><b>Nenhum encontro ainda.</b></p><p class="muted">Use <b>Novo</b> para criar uma pasta ou um encontro. Salas são opcionais e entram depois, dentro do encontro.</p></div>';
  }
  const secao = (titulo, corpo, aberta = true, extra = "") => `<details class="enc-secao"${aberta ? " open" : ""}><summary>${esc(titulo)}${extra}</summary><div class="enc-secao-corpo">${corpo}</div></details>`;
  const proxEtapa = (t) => secao(t, '<p class="muted">Disponível na próxima etapa.</p>', false);
  /* ---------- monstros (instâncias independentes; o bestiário só é lido) ---------- */
  const M = window.ENCONTROS_MONSTROS, INI = window.ENCONTROS_INI;
  const iniDe = (s, uid) => (INI && s.iniEstado ? INI.combatenteDe(s.iniEstado, uid) : null);
  const encontroDe = (s, n) => (n.tipo === "encontro" ? n : D.porId(s.nos, n.pai_id));
  const todosMonstros = (s, n) => { const enc = encontroDe(s, n); return enc ? [enc, ...D.filhos(s.nos, enc.id)].flatMap((x) => M.lista(x)) : []; };
  function fotoMon(s, key, nome) {
    const src = s.bestiario && s.bestiario.foto(key);
    return src ? `<img class="av enc-mon-foto" src="${esc(src)}" alt="" loading="lazy" data-sem-ampliar>` : `<span class="enc-mon-foto vazio" aria-hidden="true">${ico("paw")}</span>`;
  }
  function lootSelo(m) {
    const l = M.lootDe(m); if (!M.temLoot(l)) return "";
    const rest = l.itens.reduce((a, i) => a + M.restante(i), 0), moedas = M.MOEDAS.some((k) => l.moedas[k] - l.moedasDistribuidas[k] > 0), pendente = rest > 0 || moedas, tit = l.itens.map((i) => i.qtd + "× " + i.nome + (i.distribuido ? " (" + i.distribuido + " distribuído)" : "")).concat(M.MOEDAS.filter((k) => l.moedas[k]).map((k) => l.moedas[k] + " " + M.NOMES_MOEDA[k])).join(", ");
    return `<span class="enc-selo${pendente ? " prep" : " ok"}" title="${esc(tit)}">${pendente ? "Loot" : "Loot distribuído"}</span>`;
  }
  function cartaoMonstro(s, n, m) {
    const r = s.bestiario && s.bestiario.porChave.get(m.origem), sel = s.selMon.has(m.uid), pct = m.pvMax ? Math.max(0, Math.min(100, 100 * m.pv / m.pvMax)) : 0, hpClass = pct <= 25 ? "low" : pct <= 50 ? "mid" : "";
    const selo = lootSelo(m), naIni = iniDe(s, m.uid), cands = INI && !naIni ? INI.candidatos(s.iniEstado || { combatants: [] }).length : 0;
    const rotuloSit = { derrotado: "Derrotado", inconsciente: "Inconsciente", fugiu: "Fugiu", capturado: "Capturado" }[m.situacao] || "";
    const b = (a, txt, cls) => `<button type="button" data-enc-acao="${a}" data-uid="${esc(m.uid)}"${cls ? ` class="${cls}"` : ""}>${txt}</button>`;
    const menu = `<details class="inv-mais enc-mais"><summary aria-label="Ações de ${esc(m.nome)}" title="Ações">${ico("more")}</summary><div class="inv-mais-menu">${b("mon-editar", "Editar…")}${naIni ? b("mon-desvincular", "Soltar da iniciativa") : cands ? b("mon-vincular", "Vincular à iniciativa…") : ""}${b("mon-remover", "Remover…", "danger")}</div></details>`;
    return `<li class="enc-mon combatant${sel ? " sel" : ""}${m.pv <= 0 ? " defeated" : ""}" data-uid="${esc(m.uid)}">
      <input type="checkbox" class="enc-mon-sel" data-enc-mon-sel="${esc(m.uid)}"${sel ? " checked" : ""} aria-label="Selecionar ${esc(m.nome)}">
      <button type="button" class="enc-mon-foto-btn" data-enc-acao="mon-ficha" data-key="${esc(m.origem)}" aria-label="Abrir a ficha de ${esc(m.nome)}" title="Abrir a ficha do bestiário">${fotoMon(s, m.origem, m.nome)}</button>
      <div class="enc-mon-info">
        <div class="enc-mon-linha1"><button type="button" class="enc-mon-nome" data-enc-acao="mon-ficha" data-key="${esc(m.origem)}" title="${esc(m.nome)}">${esc(m.nome)}</button>${menu}</div>
        <span class="muted enc-mon-sub">${esc(r && r.nomePt && r.nomePt !== m.nome ? r.nomePt : m.base)}${r && r.nd ? " · ND " + esc(r.nd) : ""} · CA <b>${m.ca}</b></span>
        <div class="enc-pv-linha"><div class="hp-track" aria-hidden="true"><div class="hp-fill ${hpClass}" style="width:${pct}%"></div></div>
          <span class="enc-pv-ctl" role="group" aria-label="PV de ${esc(m.nome)}"><button type="button" class="small" data-enc-acao="mon-pv" data-uid="${esc(m.uid)}" data-d="-1" aria-label="Tirar 1 PV">−</button><input type="number" class="enc-pv-in" data-enc-pv="${esc(m.uid)}" min="0" max="${m.pvMax}" value="${m.pv}" aria-label="PV atuais de ${esc(m.nome)}"><span class="muted">/${m.pvMax}</span><button type="button" class="small" data-enc-acao="mon-pv" data-uid="${esc(m.uid)}" data-d="1" aria-label="Somar 1 PV">+</button></span></div>
        ${naIni || rotuloSit || selo || (m.condicoes || []).length ? `<span class="enc-conds-vis">${naIni ? '<span class="enc-selo ok" title="Esta criatura está na Iniciativa">Iniciativa</span>' : ""}${rotuloSit ? `<span class="enc-selo">${rotuloSit}</span>` : ""}${selo}${(m.condicoes || []).map((c) => `<span class="enc-selo">${esc(c)}</span>`).join("")}</span>` : ""}
      </div></li>`;
  }
  /* ---------- loot: editor usado na janela do monstro e no "loot inicial" de vários ---------- */
  function editorLoot(caixa, loot, { acompanhar }) {
    let atual = M.normalizarLoot(loot), catalogo = null;
    const num = (v) => Math.max(0, Math.round(Number(v) || 0));
    const ler = () => {
      const l = M.lootVazio();
      for (const k of M.MOEDAS) { l.moedas[k] = num(caixa.querySelector(`[data-moeda="${k}"]`)?.value); l.moedasColetadas[k] = num(caixa.querySelector(`[data-moeda-col="${k}"]`)?.value); l.moedasDistribuidas[k] = num(caixa.querySelector(`[data-moeda-dist="${k}"]`)?.value); }
      l.itens = [...caixa.querySelectorAll(".enc-loot-item")].map((r) => ({ lid: r.dataset.lid, catId: r.dataset.cat || null, nome: r.dataset.nome, custom: r.dataset.custom === "1", qtd: num(r.querySelector("[data-qtd]").value) || 1, descoberto: !!r.querySelector("[data-desc]")?.checked, coletado: num(r.querySelector("[data-col]")?.value), distribuido: num(r.querySelector("[data-dist]")?.value) }));
      return M.normalizarLoot(l);
    };
    const pintar = () => {
      const l = atual;
      caixa.innerHTML = `<div class="enc-loot-moedas"><b>Moedas</b>${M.MOEDAS.map((k) => `<label>${M.NOMES_MOEDA[k]}<input type="number" min="0" data-moeda="${k}" value="${l.moedas[k]}"></label>`).join("")}</div>
        ${acompanhar && M.MOEDAS.some((k) => l.moedas[k] > 0) ? `<div class="enc-loot-moedas muted"><span>Coletadas</span>${M.MOEDAS.map((k) => `<label>${M.NOMES_MOEDA[k]}<input type="number" min="0" data-moeda-col="${k}" value="${l.moedasColetadas[k]}"></label>`).join("")}</div><div class="enc-loot-moedas muted"><span>Distribuídas</span>${M.MOEDAS.map((k) => `<label>${M.NOMES_MOEDA[k]}<input type="number" min="0" data-moeda-dist="${k}" value="${l.moedasDistribuidas[k]}"></label>`).join("")}</div>` : ""}
        <div class="enc-loot-itens">${l.itens.length ? l.itens.map((i) => `<div class="enc-loot-item" data-lid="${esc(i.lid)}" data-cat="${esc(i.catId || "")}" data-nome="${esc(i.nome)}" data-custom="${i.custom ? 1 : 0}"><span class="enc-loot-nome" title="${esc(i.nome)}">${esc(i.nome)}${i.custom ? ' <span class="muted">(personalizado)</span>' : ""}</span>
          <label>Qtd<input type="number" min="1" max="9999" data-qtd value="${i.qtd}"></label>${acompanhar ? `<label class="inline"><input type="checkbox" data-desc${i.descoberto ? " checked" : ""}> Descoberto</label><label>Coletado<input type="number" min="0" data-col value="${i.coletado}"></label><label>Distrib.<input type="number" min="0" data-dist value="${i.distribuido}"></label><span class="muted enc-loot-rest">Resta ${M.restante(i)}</span>` : ""}
          <button type="button" class="small subtle" data-loot-rem="${esc(i.lid)}" aria-label="Remover ${esc(i.nome)}">Remover</button></div>`).join("") : '<p class="muted">Nenhum item.</p>'}</div>
        <div class="enc-loot-add"><label>Item do catálogo<input type="search" data-loot-busca placeholder="Buscar item (ex.: espada, poção)" autocomplete="off"></label><div class="enc-loot-res"></div>
          <div class="enc-loot-custom"><label>Item personalizado<input data-loot-nome maxlength="120" placeholder="Nome"></label><label>Qtd<input type="number" min="1" max="9999" value="1" data-loot-qtd></label><button type="button" class="small" data-loot-add-custom>Adicionar</button></div></div>`;
    };
    caixa.addEventListener("click", async (e) => {
      const rem = e.target.closest("[data-loot-rem]"); if (rem) { atual = M.removerItemLoot(ler(), rem.dataset.lootRem); return pintar(); }
      const addCat = e.target.closest("[data-loot-cat]"); if (addCat) { const r = M.adicionarItemLoot(ler(), { catId: addCat.dataset.lootCat, nome: addCat.dataset.nome, qtd: 1 }); if (r.ok) atual = r.loot; return pintar(); }
      if (e.target.closest("[data-loot-add-custom]")) { const r = M.adicionarItemLoot(ler(), { nome: caixa.querySelector("[data-loot-nome]").value, qtd: caixa.querySelector("[data-loot-qtd]").value }); if (r.ok) { atual = r.loot; pintar(); } else caixa.querySelector("[data-loot-nome]").focus(); }
    });
    caixa.addEventListener("input", async (e) => {
      if (!e.target.matches("[data-loot-busca]")) return; const res = caixa.querySelector(".enc-loot-res");
      try { catalogo = catalogo || (await M.carregarItens()); } catch (_) { res.textContent = "Catálogo indisponível."; return; }
      const r = M.buscarItens(catalogo, e.target.value); res.innerHTML = r.length ? r.map((i) => `<button type="button" class="small" data-loot-cat="${esc(i.id)}" data-nome="${esc(i.nome)}">${esc(i.nome)}</button>`).join("") : (e.target.value.trim() ? '<span class="muted">Nada encontrado.</span>' : "");
    });
    pintar(); return { ler };
  }
  function janelaLootInicial(s, n, uids) {
    const alvo = M.lista(n).filter((m) => uids.includes(m.uid)); if (!alvo.length) return;
    const j = formularioJanela("Loot inicial para " + alvo.length + " criatura(s)", `<p class="muted">Cada criatura recebe a sua própria cópia; depois elas seguem independentes (nada fica ligado).</p><div class="enc-loot"></div>
      <fieldset class="enc-tipo"><legend class="muted">Se já tiverem loot</legend><label class="inline"><input type="radio" name="modo" value="somar" checked> Somar ao existente</label><br><label class="inline"><input type="radio" name="modo" value="substituir"> Substituir o loot (apaga o registro de coleta)</label></fieldset>`, async (v) => {
      const loot = ed.ler(); if (!M.temLoot(loot)) return { erro: "Adicione moedas ou itens." };
      if (v.modo === "substituir" && alvo.some((m) => M.temLoot(M.lootDe(m))) && !(await perguntar("Substituir o loot atual dessas criaturas? O registro do que foi coletado e distribuído também será apagado.", { titulo: "Substituir loot", ok: "Substituir", perigo: true }))) return { erro: "Cancelado." };
      await guardar(s, async () => { await gravarMonstros(s, n, (l) => M.aplicarLootEmVarios(l, uids, loot, v.modo), "Loot inicial aplicado a " + alvo.length + " criatura(s) de “" + n.nome + "”."); }, "Loot aplicado."); return s.erro ? { erro: s.erro } : {};
    }, "larga");
    const ed = editorLoot(j.corpo.querySelector(".enc-loot"), M.lootVazio(), { acompanhar: false });
  }
  /* edição completa em janela padrão (não expande a lista): nome, PV, PV máx., CA, condições, situação e notas */
  function janelaEditarMonstro(s, n, uid) {
    const m = M.lista(n).find((x) => x.uid === uid); if (!m) return;
    const j = formularioJanela("Editar " + m.nome, `<label>Nome<input name="nome" maxlength="80" required value="${esc(m.nome)}"></label>
      <div class="enc-mon-nums"><label>PV<input type="number" name="pv" min="0" max="99999" value="${m.pv}"></label><label>PV máx.<input type="number" name="pvMax" min="1" max="99999" value="${m.pvMax}"></label><label>CA<input type="number" name="ca" min="0" max="99" value="${m.ca}"></label></div>
      <fieldset class="enc-tipo"><legend class="muted">Condições</legend><div class="enc-conds">${M.CONDICOES.map((c) => `<label class="inline"><input type="checkbox" name="cond" value="${esc(c)}"${(m.condicoes || []).includes(c) ? " checked" : ""}> ${esc(c)}</label>`).join("")}</div></fieldset>
      <label>Situação<select name="situacao"><option value="">Ativo</option><option value="fugiu"${m.situacao === "fugiu" ? " selected" : ""}>Fugiu</option><option value="capturado"${m.situacao === "capturado" ? " selected" : ""}>Capturado</option></select></label>
      <label>Notas<textarea name="notas" rows="2" maxlength="2000">${esc(m.notas || "")}</textarea></label>
      <details class="enc-secao" open><summary>Loot desta criatura</summary><div class="enc-secao-corpo enc-loot"></div></details>`, async (v, f) => {
      const r = M.editar(m, { loot: ed.ler(), nome: v.nome, pv: v.pv, pvMax: v.pvMax, ca: v.ca, condicoes: new FormData(f).getAll("cond"), notas: v.notas, situacao: v.situacao }); if (r.erro) return { erro: r.erro };
      await atualizarMonstro(s, n, uid, r.monstro, "Monstro “" + r.monstro.nome + "” atualizado."); return s.erro ? { erro: s.erro } : {};
    }, "larga");
    const ed = editorLoot(j.corpo.querySelector(".enc-loot"), M.lootDe(m), { acompanhar: true });
    return j;
  }
  /* grava uma instância alterada (só ela), preservando a rolagem da página e a seleção; sincroniza com a Iniciativa se estiver ligada */
  async function atualizarMonstro(s, n, uid, novo, hist) {
    const y = window.scrollY; novo.sincEm = Date.now();
    await guardar(s, async () => { await gravarMonstros(s, n, (l) => l.map((x) => (x.uid === uid ? novo : x)), hist); empurrarParaIniciativa(s, novo); }, "Salvo.");
    try { window.scrollTo(0, y); } catch (_) { /* sem rolagem */ }
  }
  function secaoMonstros(s, n) {
    const lista = M.lista(n), enc = encontroDe(s, n), destinos = enc ? [enc, ...D.filhos(s.nos, enc.id)].filter((x) => x.id !== n.id) : [];
    const nSel = lista.filter((m) => s.selMon.has(m.uid)).length;
    const barra = lista.length ? `<div class="enc-mon-barra"><button type="button" class="small subtle" data-enc-acao="mon-todos">${nSel === lista.length ? "Limpar seleção" : "Selecionar todos"}</button>${nSel ? `<span class="muted">${nSel} selecionado(s)</span>${destinos.length ? `<select class="enc-mon-destino" aria-label="Mover os selecionados para">${destinos.map((x) => `<option value="${esc(x.id)}">${x.tipo === "encontro" ? "Encontro (geral): " : "Sala: "}${esc(x.nome)}</option>`).join("")}</select><button type="button" class="small" data-enc-acao="mon-mover-sel">Mover</button>` : ""}<button type="button" class="small danger" data-enc-acao="mon-remover-sel">Remover</button><button type="button" class="small" data-enc-acao="mon-loot">Loot inicial…</button><button type="button" class="small primary" data-enc-acao="mon-enviar">Enviar para a Iniciativa</button>` : ""}</div>` : "";
    const corpo = `<div class="row"><button type="button" class="small primary" data-enc-acao="mon-add" data-id="${esc(n.id)}">+ Adicionar monstros</button></div>${barra}${lista.length ? `<ul class="enc-mons">${lista.map((m) => cartaoMonstro(s, n, m)).join("")}</ul>` : '<p class="muted">Nenhum monstro ainda. Adicione do bestiário; cada exemplar é independente.</p>'}`;
    return secao("Monstros", corpo, true, lista.length ? ` <span class="muted">(${lista.length})</span>` : "");
  }
  function htmlHistorico(n) {
    const h = (n.dados.historico || []).slice().reverse(); if (!h.length) return '<p class="muted">Sem acontecimentos registrados.</p>';
    return `<ul class="enc-hist">${h.slice(0, 60).map((e) => `<li><span class="muted">${esc(new Date(e.quando).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }))}</span> ${esc(e.texto)}</li>`).join("")}</ul>`;
  }
  const migalhas = (s, n) => `<nav class="enc-migalhas" aria-label="Caminho"><ol>${D.caminho(s.nos, n.id).map((x, i, l) => i < l.length - 1 ? `<li><button type="button" class="enc-mig" data-enc-acao="selecionar" data-id="${esc(x.id)}" title="${esc(x.nome)}">${esc(x.nome)}</button><span class="enc-mig-sep" aria-hidden="true">›</span></li>` : `<li><span class="enc-mig-atual" aria-current="page">${esc(x.nome)}</span></li>`).join("")}</ol></nav>`;
  function formEdicao(n) {
    return `<form class="enc-form" data-enc-form="editar" data-id="${esc(n.id)}"><label>Nome<input name="nome" maxlength="120" required value="${esc(n.nome)}"></label>
      <label>Descrição <span class="muted">(use **negrito** e [vermelho]texto[/vermelho]; cores: vermelho, laranja, dourado, verde, azul, roxo, cinza)</span><textarea name="descricao" rows="6" maxlength="20000">${esc(n.dados.descricao || "")}</textarea></label>
      <div class="row"><button type="submit" class="small primary">Salvar</button><button type="button" class="small subtle" data-enc-acao="cancelar-edicao">Cancelar</button></div></form>`;
  }
  function htmlDetalhe(s) {
    if (s.lixeira) return htmlLixeira(s);
    const n = s.sel ? D.porId(s.nos, s.sel) : null;
    if (!n || !D.vivo(n)) return '<div class="enc-vazio"><p class="muted">Selecione uma pasta, um encontro ou uma sala na árvore.</p></div>';
    const topo = `${migalhas(s, n)}<div class="enc-titulo"><h2>${rotuloNo(n)}</h2><span class="badge">${D.TIPOS[n.tipo]}</span>${s.msg ? `<span class="muted enc-status" role="status">${esc(s.msg)}</span>` : ""}</div>`;
    const desc = s.editando ? formEdicao(n) : `<div class="enc-desc">${n.dados.descricao ? D.formatar(n.dados.descricao) : '<span class="muted">Sem descrição.</span>'}</div><div class="row"><button type="button" class="small" data-enc-acao="editar">Editar nome e descrição</button></div>`;
    if (n.tipo === "pasta") {
      const fl = D.filhos(s.nos, n.id);
      return `${topo}${secao("Descrição", desc)}${secao("Conteúdo da pasta", `<div class="row"><button type="button" class="small" data-enc-acao="nova-pasta" data-id="${esc(n.id)}">Nova subpasta</button><button type="button" class="small" data-enc-acao="novo-encontro" data-id="${esc(n.id)}">Novo encontro aqui</button></div>${fl.length ? `<ul class="enc-cartoes">${fl.map((f) => `<li><button type="button" class="enc-cartao" data-enc-acao="selecionar" data-id="${esc(f.id)}">${rotuloNo(f)}</button></li>`).join("")}</ul>` : '<p class="muted">Pasta vazia.</p>'}`)}`;
    }
    if (n.tipo === "encontro") {
      const salas = D.filhos(s.nos, n.id);
      const modo = D.modoDe(n), ctl = `<div class="enc-estados"><label>Tipo de encontro<select data-enc-rapido="modo" data-id="${esc(n.id)}">${Object.entries(D.MODOS).map(([k, t]) => `<option value="${k}"${modo === k ? " selected" : ""}>${t}</option>`).join("")}</select></label><label>Preparação<select data-enc-rapido="estado" data-id="${esc(n.id)}">${Object.entries(D.ESTADOS).map(([k, t]) => `<option value="${k}"${n.dados.estado === k ? " selected" : ""}>${t}</option>`).join("")}</select></label><label class="inline"><input type="checkbox" data-enc-rapido="concluido" data-id="${esc(n.id)}"${n.dados.concluido ? " checked" : ""}> Encontro concluído</label></div>`;
      const listaSalas = salas.length ? `<ul class="enc-cartoes">${salas.map((f) => `<li><button type="button" class="enc-cartao" data-enc-acao="selecionar" data-id="${esc(f.id)}">${rotuloNo(f)}<span class="enc-selo ${f.dados.explorada ? "ok" : ""}">${f.dados.explorada ? "Explorada" : "Não explorada"}</span></button></li>`).join("")}</ul>` : '<p class="muted">Este encontro ainda não tem salas. Elas são opcionais: o conteúdo pode ficar direto no encontro.</p>';
      const blocoSalas = modo === "salas" ? secao("Salas", `<div class="row"><button type="button" class="small" data-enc-acao="sala" data-id="${esc(n.id)}">Adicionar sala</button><button type="button" class="small" data-enc-acao="salas" data-id="${esc(n.id)}">Adicionar várias salas…</button></div>${listaSalas}`, true, salas.length ? ` <span class="muted">(${salas.length})</span>` : "") : "";
      return `${topo}${ctl}${secao("Descrição", desc)}${blocoSalas}${secaoMonstros(s, n)}${proxEtapa("Elementos")}${proxEtapa("Loot")}${secao("Histórico", htmlHistorico(n), false)}`;
    }
    const ctl = `<div class="enc-estados"><label class="inline"><input type="checkbox" data-enc-rapido="explorada" data-id="${esc(n.id)}"${n.dados.explorada ? " checked" : ""}> Sala explorada</label></div>`;
    return `${topo}${ctl}${secao("Descrição", desc)}${secaoMonstros(s, n)}${proxEtapa("Elementos")}${proxEtapa("Loot")}`;
  }
  function htmlLixeira(s) {
    const mortos = s.nos.filter((n) => n.excluido_em && !(n.pai_id && D.porId(s.nos, n.pai_id)?.excluido_em === n.excluido_em)).sort((a, b) => String(b.excluido_em).localeCompare(String(a.excluido_em)));
    return `<div class="enc-titulo"><h2>Lixeira</h2><button type="button" class="small subtle" data-enc-acao="fechar-lixeira">Voltar</button></div>
      ${mortos.length ? `<ul class="enc-cartoes enc-lixo">${mortos.map((n) => { const c = D.contar(s.nos, n.id); return `<li class="enc-cartao"><span>${rotuloNo(n)}<span class="muted"> · ${D.TIPOS[n.tipo]}${n.tipo !== "sala" ? ` · ${c.encontros ? c.encontros + " encontro(s) " : ""}${c.salas ? c.salas + " sala(s)" : ""}` : ""} · excluído em ${esc(new Date(n.excluido_em).toLocaleDateString("pt-BR"))}</span></span><span class="row"><button type="button" class="small" data-enc-acao="restaurar" data-id="${esc(n.id)}">Restaurar</button><button type="button" class="small danger" data-enc-acao="apagar-definitivo" data-id="${esc(n.id)}">Excluir de vez…</button></span></li>`; }).join("")}</ul>` : '<p class="muted">A lixeira está vazia.</p>'}`;
  }
  function desenhar(s) {
    const raiz = s.raiz; if (!raiz) return;
    if (INI) s.iniEstado = INI.lerEstado(localStorage, s.campanhaId);
    const nLix = s.nos.filter((n) => n.excluido_em).length, desk = larga();
    const aviso = s.repo.modo === "local" ? `<div class="enc-aviso" role="status"><b>Salvo só neste aparelho.</b> A tabela de encontros ainda não existe no banco da conta. Aplique a migração <code>supabase/migrations/20261118120000_encontros.sql</code> para guardar na conta (os encontros criados aqui poderão ser levados depois).</div>` : "";
    const envio = s.locais ? `<div class="enc-aviso" role="status"><b>Há ${s.locais} item(ns) guardado(s) só neste aparelho.</b> <button type="button" class="small primary" data-enc-acao="enviar-locais">Enviar para a conta</button></div>` : "";
    raiz.innerHTML = `${aviso}${envio}<div class="enc-erro err" role="alert">${esc(s.erro)}</div>
      <div class="enc-barra"><button type="button" class="small primary" data-enc-acao="novo">+ Novo</button>
        <input type="search" class="enc-busca" placeholder="Buscar por nome…" value="${esc(s.busca)}" aria-label="Buscar pastas, encontros e salas" autocomplete="off">
        <button type="button" class="small subtle" data-enc-acao="lixeira">Lixeira${nLix ? ` (${nLix})` : ""}</button></div>
      <div class="enc-corpo"><details class="enc-arvore panel"${desk || s.arvoreAberta ? " open" : ""}><summary>Navegação</summary>${s.carregado ? htmlArvore(s) : '<p class="muted" role="status">Carregando os encontros…</p>'}</details>
      <section class="enc-detalhe panel" aria-live="polite">${s.carregado ? htmlDetalhe(s) : ""}</section></div>`;
  }

  /* ---------- operações ---------- */
  async function guardar(s, fn, okMsg) {
    s.erro = ""; try { await fn(); if (okMsg) s.msg = okMsg; } catch (e) { s.erro = "Não foi possível salvar: " + (e && e.message ? e.message : "erro desconhecido"); }
    desenhar(s);
  }
  const marcarHist = (n, texto) => { const h = (n.dados.historico = Array.isArray(n.dados.historico) ? n.dados.historico : []); h.push({ quando: D.agora(), texto }); if (h.length > 100) h.splice(0, h.length - 100); };
  async function salvarDados(s, no, mudar, historico) {      // alteração rápida: salva sozinha, com aviso de erro
    const copia = JSON.parse(JSON.stringify(no.dados)); mudar(copia);
    const alvo = no.tipo === "encontro" ? no : (no.tipo === "sala" ? D.porId(s.nos, no.pai_id) : null);
    const paraHist = alvo && historico ? (() => { const d = JSON.parse(JSON.stringify(alvo.dados)); marcarHist({ dados: d }, historico); return d; })() : null;
    await s.repo.atualizar(no.id, { dados: copia }); no.dados = copia;
    if (paraHist) { if (alvo.id === no.id) { alvo.dados.historico = paraHist.historico; await s.repo.atualizar(alvo.id, { dados: alvo.dados }); } else { await s.repo.atualizar(alvo.id, { dados: paraHist }); alvo.dados = paraHist; } }
  }
  function formularioJanela(titulo, html, aoEnviar, largura = "pequena") {
    const j = window.COMP_JANELA.abrir({ titulo, conteudo: `<form class="enc-form">${html}<p class="err enc-form-erro" role="alert"></p><div class="row"><button type="submit" class="small primary">Salvar</button><button type="button" class="small subtle" data-fechar>Cancelar</button></div></form>`, largura });
    const f = j.corpo.querySelector("form"), er = j.corpo.querySelector(".enc-form-erro");
    j.corpo.querySelector("[data-fechar]").addEventListener("click", j.fechar);
    f.addEventListener("submit", async (e) => { e.preventDefault(); const r = await aoEnviar(Object.fromEntries(new FormData(f).entries()), f); if (r && r.erro) { er.textContent = r.erro; return; } j.fechar(); });
    return j;
  }
  const opcoesPasta = (s, selecionada) => [{ id: null, rotulo: "Raiz (sem pasta)" }].concat((function lista(pai, pref) { return D.filhos(s.nos, pai).filter((f) => f.tipo === "pasta").flatMap((f) => [{ id: f.id, rotulo: pref + f.nome }, ...lista(f.id, pref + f.nome + " › ")]); })(null, "")).map((o) => `<option value="${esc(o.id || "")}"${(o.id || "") === (selecionada || "") ? " selected" : ""}>${esc(o.rotulo)}</option>`).join("");
  async function criar(s, tipo, nome, paiId, extra) {
    const r = D.novoNo(s.nos, { tipo, nome, paiId, campanhaId: s.campanhaId, modo: extra && extra.modo }); if (r.erro) return r;
    await s.repo.inserir([r.no]); s.nos.push(r.no); if (paiId) s.abertos.add(paiId); s.sel = r.no.id; s.lixeira = false; s.busca = ""; s.editando = false; s.msg = D.TIPOS[tipo] + " criado(a)."; guardarUi(s);
    if (tipo === "sala") { const enc = D.porId(s.nos, paiId); if (enc) await salvarDados(s, r.no, () => {}, "Sala “" + r.no.nome + "” adicionada."); }
    return {};
  }
  function janelaNovo(s, tipoInicial, paiInicial) {
    const j = formularioJanela("Novo", `<fieldset class="enc-tipo"><legend class="muted">O que criar</legend><label class="inline"><input type="radio" name="tipo" value="pasta"${tipoInicial === "pasta" ? " checked" : ""}> Pasta</label> <label class="inline"><input type="radio" name="tipo" value="encontro"${tipoInicial === "encontro" ? " checked" : ""}> Encontro</label></fieldset>
      <fieldset class="enc-tipo" data-enc-modo><legend class="muted">Tipo de encontro</legend><label class="inline"><input type="radio" name="modo" value="aleatorio" checked> Aleatório <span class="muted">(combate rápido, sem salas)</span></label><br><label class="inline"><input type="radio" name="modo" value="salas"> Com salas <span class="muted">(igreja, masmorra, castelo…)</span></label></fieldset>
      <label>Nome<input name="nome" maxlength="120" required autocomplete="off"></label><label>Criar em<select name="pai">${opcoesPasta(s, paiInicial)}</select></label>`,
      async (v) => { let r; await guardar(s, async () => { r = await criar(s, v.tipo, v.nome, v.pai || null, { modo: v.modo }); if (r.erro) throw new Error(r.erro); }); return r && r.erro ? { erro: s.erro } : {}; });
    const campo = j.corpo.querySelector("[data-enc-modo]"), alternar = () => { campo.hidden = !j.corpo.querySelector('[name=tipo][value=encontro]').checked; };
    j.corpo.querySelectorAll("[name=tipo]").forEach((r) => r.addEventListener("change", alternar)); alternar();
  }
  function janelaSalas(s, enc, varias) {
    formularioJanela(varias ? "Adicionar várias salas" : "Adicionar sala", varias ? `<label>Nomes das salas <span class="muted">(uma por linha)</span><textarea name="nomes" rows="6" required placeholder="Portão da Igreja&#10;Nave Principal&#10;Sacristia"></textarea></label>` : `<label>Nome da sala<input name="nome" maxlength="120" required autocomplete="off"></label>`,
      async (v) => { const nomes = varias ? D.nomesEmLote(v.nomes) : [D.nomeValido(v.nome)].filter(Boolean); if (!nomes.length) return { erro: "Informe pelo menos um nome." };
        await guardar(s, async () => { const novos = []; for (const nome of nomes) { const r = D.novoNo(s.nos.concat(novos), { tipo: "sala", nome, paiId: enc.id, campanhaId: s.campanhaId }); if (r.erro) throw new Error(r.erro); novos.push(r.no); }
          await s.repo.inserir(novos); s.nos.push(...novos); s.abertos.add(enc.id); s.sel = novos[novos.length - 1].id; s.editando = false; s.lixeira = false; guardarUi(s);
          const dados = JSON.parse(JSON.stringify(enc.dados)); marcarHist({ dados }, novos.length === 1 ? "Sala “" + novos[0].nome + "” adicionada." : novos.length + " salas adicionadas: " + novos.map((n) => n.nome).join(", ") + "."); await s.repo.atualizar(enc.id, { dados }); enc.dados = dados; s.msg = novos.length + " sala(s) criada(s)."; });
        return s.erro ? { erro: s.erro } : {}; });
  }
  async function acao(s, a, id, extra = {}) {
    const n = id ? D.porId(s.nos, id) : null;
    if (a === "alternar") { s.abertos.has(id) ? s.abertos.delete(id) : s.abertos.add(id); guardarUi(s); return desenhar(s); }
    if (a === "selecionar") { s.sel = id; s.lixeira = false; s.editando = false; s.msg = ""; s.arvoreAberta = false; const pais = D.caminho(s.nos, id).slice(0, -1); pais.forEach((p) => s.abertos.add(p.id)); guardarUi(s); return desenhar(s); }
    if (a === "novo") return janelaNovo(s, "encontro", s.sel && D.porId(s.nos, s.sel)?.tipo === "pasta" ? s.sel : (s.sel && D.porId(s.nos, s.sel)?.tipo === "encontro" ? D.porId(s.nos, s.sel).pai_id : null));
    if (a === "nova-pasta") return janelaNovo(s, "pasta", n ? n.id : null);
    if (a === "novo-encontro") return janelaNovo(s, "encontro", n ? n.id : null);
    if ((a === "sala" || a === "salas") && n && D.modoDe(n) === "aleatorio") return guardar(s, async () => { throw new Error("Encontros aleatórios não têm salas. Mude o tipo do encontro para usar salas."); });
    if (a === "sala" && n) return janelaSalas(s, n, false);
    if (a === "salas" && n) return janelaSalas(s, n, true);
    if (a.startsWith("mon-")) return acaoMonstro(s, a, id, extra);
    if (a === "enviar-locais") return guardar(s, async () => { const q = await s.repo.enviarLocais(); s.nos = await s.repo.listar(); s.locais = 0; s.msg = q + " item(ns) enviado(s) para a conta."; });
    if (a === "lixeira") { s.lixeira = true; return desenhar(s); }
    if (a === "fechar-lixeira") { s.lixeira = false; return desenhar(s); }
    if (a === "editar") { s.editando = true; return desenhar(s); }
    if (a === "cancelar-edicao") { s.editando = false; return desenhar(s); }
    if (!n) return;
    if (a === "renomear") return formularioJanela("Renomear", `<label>Nome<input name="nome" maxlength="120" required value="${esc(n.nome)}"></label>`, async (v) => { const nome = D.nomeValido(v.nome); if (!nome) return { erro: "Informe um nome." }; await guardar(s, async () => { const antigo = n.nome; await s.repo.atualizar(n.id, { nome }); n.nome = nome; const alvo = n.tipo === "encontro" ? n : null; if (alvo) await salvarDados(s, n, () => {}, "Renomeado de “" + antigo + "”."); s.msg = "Renomeado."; }); return s.erro ? { erro: s.erro } : {}; });
    if (a === "mover") {
      const ops = D.destinos(s.nos, n.id); if (ops.length <= 1 && !n.pai_id) return guardar(s, async () => { throw new Error("Não há outra pasta de destino."); });
      return formularioJanela("Mover para", `<label>Destino<select name="pai">${ops.map((o) => `<option value="${esc(o.id || "")}"${(o.id || "") === (n.pai_id || "") ? " selected" : ""}>${esc(o.rotulo)}</option>`).join("")}</select></label>`, async (v) => { const r = D.mover(s.nos, n.id, v.pai || null); if (!r.ok) return { erro: r.erro }; await guardar(s, async () => { await s.repo.atualizar(n.id, r.campos); Object.assign(n, r.campos); if (r.campos.pai_id) s.abertos.add(r.campos.pai_id); s.msg = "Movido."; guardarUi(s); }); return s.erro ? { erro: s.erro } : {}; });
    }
    if (a === "subir" || a === "descer") { const up = D.reordenar(s.nos, n.id, a === "subir" ? -1 : 1); if (!up) return; return guardar(s, async () => { for (const u of up) { await s.repo.atualizar(u.id, { ordem: u.ordem }); D.porId(s.nos, u.id).ordem = u.ordem; } }); }
    if (a === "duplicar") { const r = D.duplicar(s.nos, n.id); if (r.erro) return guardar(s, async () => { throw new Error(r.erro); }); return guardar(s, async () => { await s.repo.inserir(r.novos); for (const u of r.reordenar) { await s.repo.atualizar(u.id, { ordem: u.ordem }); D.porId(s.nos, u.id).ordem = u.ordem; } s.nos.push(...r.novos); s.sel = r.novos[0].id; if (r.novos[0].pai_id) s.abertos.add(r.novos[0].pai_id); s.msg = "Encontro duplicado."; guardarUi(s); }); }
    if (a === "excluir") {
      const c = D.contar(s.nos, n.id), resumo = n.tipo === "sala" ? "" : ` Vão junto ${c.pastas ? c.pastas + " pasta(s), " : ""}${c.encontros} encontro(s) e ${c.salas} sala(s).`;
      if (!(await perguntar(`Mover “${n.nome}” para a lixeira?${resumo} Dá para restaurar depois.`, { titulo: "Excluir", ok: "Mover para a lixeira", perigo: true }))) return;
      return guardar(s, async () => { const quando = D.agora(), ids = D.idsDoGrupo(s.nos, n.id); for (const x of ids) { await s.repo.atualizar(x, { excluido_em: quando }); D.porId(s.nos, x).excluido_em = quando; } if (s.sel && ids.includes(s.sel)) s.sel = n.pai_id || null; s.msg = "Movido para a lixeira."; guardarUi(s); });
    }
    if (a === "restaurar") { const r = D.restaurar(s.nos, n.id); if (r.erro) return guardar(s, async () => { throw new Error(r.erro); }); return guardar(s, async () => { for (const x of r.ids) await s.repo.atualizar(x, { excluido_em: null, ...(x === n.id ? r.campos : {}) }); for (const x of r.ids) { const m = D.porId(s.nos, x); m.excluido_em = null; if (x === n.id) Object.assign(m, r.campos); } s.sel = n.id; s.lixeira = false; s.msg = "Restaurado."; guardarUi(s); }); }
    if (a === "apagar-definitivo") {
      if (!(await perguntar(`Excluir “${n.nome}” de vez, com tudo que há dentro? Isso não pode ser desfeito.`, { titulo: "Excluir de vez", ok: "Excluir de vez", perigo: true }))) return;
      return guardar(s, async () => { const ids = D.idsDoGrupo(s.nos, n.id); await s.repo.apagar([n.id]); s.nos = s.nos.filter((x) => !ids.includes(x.id)); s.msg = "Excluído de vez."; });
    }
  }

  /* ---------- tipo do encontro e monstros: operações ---------- */
  const gravarMonstros = (s, n, fn, hist) => salvarDados(s, n, (d) => { d.monstros = fn(Array.isArray(d.monstros) ? d.monstros : []); }, hist);
  const nosDoEncontro = (s, n) => { const enc = encontroDe(s, n); return enc ? [enc, ...D.filhos(s.nos, enc.id)] : [n]; };
  const nomeBaseReg = (r) => r.nomePt || r.nome;
  async function mudarModo(s, n, novo) {
    if (novo === D.modoDe(n)) return;
    if (novo === "salas") return guardar(s, () => salvarDados(s, n, (d) => { d.modo = "salas"; }, "Convertido para encontro com salas."), "Tipo alterado.");
    const salas = D.filhos(s.nos, n.id);
    if (!salas.length) return guardar(s, () => salvarDados(s, n, (d) => { d.modo = "aleatorio"; }, "Convertido para encontro aleatório."), "Tipo alterado.");
    const plano = D.planoParaAleatorio(s.nos, n.id);
    const ok = await perguntar(`Converter para encontro aleatório? Ele não tem salas, então ${plano.resumo.salas} sala(s) (${salas.map((x) => x.nome).join(", ")}) vão para a lixeira. Os ${plano.resumo.monstros} monstro(s) das salas passam para o encontro, com PV e condições preservados, e ${plano.resumo.descricoes} descrição(ões) de sala são copiadas para a descrição do encontro. Dá para restaurar as salas pela lixeira.`, { titulo: "Converter encontro", ok: "Converter" });
    if (!ok) return desenhar(s);
    return guardar(s, async () => {
      const antigos = JSON.parse(JSON.stringify(n.dados)), quando = D.agora();
      await s.repo.atualizar(n.id, { dados: plano.dados });
      try { for (const id of plano.salas) await s.repo.atualizar(id, { excluido_em: quando }); }
      catch (e) { await s.repo.atualizar(n.id, { dados: antigos }).catch(() => {}); throw e; }
      n.dados = plano.dados; for (const id of plano.salas) D.porId(s.nos, id).excluido_em = quando;
      if (s.sel && plano.salas.includes(s.sel)) s.sel = n.id; s.selMon.clear(); s.msg = "Convertido. O conteúdo das salas veio para o encontro."; guardarUi(s);
    });
  }
  async function moverMonstros(s, orig, dest, uids) {
    const r = M.mover(M.lista(orig), M.lista(dest), uids); if (r.erro) throw new Error(r.erro);
    const antesDest = M.lista(dest).slice();
    await gravarMonstros(s, dest, () => r.destino);
    try { await gravarMonstros(s, orig, () => r.origem, r.movidos.length + " monstro(s) movido(s) de “" + orig.nome + "” para “" + dest.nome + "”."); }
    catch (e) { await gravarMonstros(s, dest, () => antesDest).catch(() => {}); throw e; }
  }
  async function salvarMonstro(s, f) {
    const n = D.porId(s.nos, f.dataset.id), m = n && M.lista(n).find((x) => x.uid === f.dataset.uid); if (!m) return;
    const fd = new FormData(f), r = M.editar(m, { nome: fd.get("nome"), pv: fd.get("pv"), pvMax: fd.get("pvMax"), ca: fd.get("ca"), condicoes: fd.getAll("cond"), notas: fd.get("notas"), situacao: fd.get("situacao") });
    if (r.erro) { s.erro = r.erro; return desenhar(s); }
    const uid = m.uid; r.monstro.sincEm = Date.now(); await guardar(s, async () => { await gravarMonstros(s, n, (l) => l.map((x) => (x.uid === uid ? r.monstro : x)), "Monstro “" + r.monstro.nome + "” atualizado."); s.editMon = null; empurrarParaIniciativa(s, r.monstro); }, "Salvo.");
  }
  async function acaoMonstro(s, a, id, extra) {
    const n = s.sel ? D.porId(s.nos, s.sel) : null; if (!n || (n.tipo !== "encontro" && n.tipo !== "sala")) return;
    const lista = M.lista(n), selecionados = lista.filter((m) => s.selMon.has(m.uid)).map((m) => m.uid);
    if (a === "mon-add") return janelaAddMonstros(s, n);
    if (a === "mon-loot") return janelaLootInicial(s, n, selecionados);
    if (a === "mon-enviar") return janelaEnviarIniciativa(s, n, selecionados);
    if (a === "mon-desvincular") return guardar(s, async () => { const e = INI.lerEstado(localStorage, s.campanhaId); INI.desassociar(e, extra.uid); INI.gravarEstado(localStorage, s.campanhaId, e); INI.limparRecibos(localStorage, s.campanhaId, [extra.uid]); }, "A criatura continua no combate, sem ligação com o encontro.");
    if (a === "mon-vincular") return janelaVincular(s, n, extra.uid);
    if (a === "mon-ficha") { if (window.LEITOR_FICHAS && window.LEITOR_FICHAS.monstro(extra.key)) return; return window.FEEDBACK && window.FEEDBACK.mostrar("A ficha deste monstro não pôde ser aberta aqui. Use o bestiário em Combate e consultas.", { erro: true }); }
    if (a === "mon-editar") return janelaEditarMonstro(s, n, extra.uid);
    if (a === "mon-pv") { const m = lista.find((x) => x.uid === extra.uid); if (!m) return; const r = M.editar(m, { pv: m.pv + Number(extra.d) }); return atualizarMonstro(s, n, m.uid, r.monstro, null); }
    if (a === "mon-todos") { selecionados.length === lista.length ? s.selMon.clear() : lista.forEach((m) => s.selMon.add(m.uid)); return desenhar(s); }
    if (a === "mon-remover" || a === "mon-remover-sel") {
      const uids = a === "mon-remover" ? [extra.uid] : selecionados, nomes = lista.filter((m) => uids.includes(m.uid)).map((m) => m.nome); if (!uids.length) return;
      if (!(await perguntar(uids.length === 1 ? `Remover “${nomes[0]}” deste ${n.tipo === "sala" ? "local" : "encontro"}? O monstro do bestiário não é afetado.` : `Remover ${uids.length} monstros (${nomes.slice(0, 6).join(", ")}${nomes.length > 6 ? "…" : ""})? Os monstros do bestiário não são afetados.`, { titulo: "Remover monstros", ok: "Remover", perigo: true }))) return;
      return guardar(s, async () => { await gravarMonstros(s, n, (l) => l.filter((m) => !uids.includes(m.uid)), nomes.length === 1 ? "Monstro “" + nomes[0] + "” removido." : nomes.length + " monstros removidos de “" + n.nome + "”."); uids.forEach((u) => s.selMon.delete(u)); desvincularTodos(s, uids); }, "Removido.");
    }
    if (a === "mon-mover-sel") {
      const dest = D.porId(s.nos, (s.raiz.querySelector(".enc-mon-destino") || {}).value); if (!dest || !selecionados.length) return;
      return guardar(s, async () => { await moverMonstros(s, n, dest, selecionados); religarNo(s, selecionados, dest.id); selecionados.forEach((u) => s.selMon.delete(u)); }, selecionados.length + " monstro(s) movido(s) para “" + dest.nome + "”.");
    }
  }
  /* ---------- Iniciativa ---------- */
  function empurrarParaIniciativa(s, m) {            // edição no encontro -> combatente já ligado (o encontro manda; a Iniciativa lê ao abrir)
    if (!INI) return; const e = INI.lerEstado(localStorage, s.campanhaId), c = INI.combatenteDe(e, m.uid); if (!c) return;
    INI.escreverNoCombatente(c, m); INI.gravarEstado(localStorage, s.campanhaId, e);
  }
  function desvincularTodos(s, uids) { if (!INI) return; const e = INI.lerEstado(localStorage, s.campanhaId); let mudou = false; for (const u of uids) mudou = INI.desassociar(e, u) || mudou; if (mudou) INI.gravarEstado(localStorage, s.campanhaId, e); }
  function religarNo(s, uids, noId) { if (!INI) return; const e = INI.lerEstado(localStorage, s.campanhaId); let mudou = false; for (const u of uids) { const c = INI.combatenteDe(e, u); if (c) { c.enc.no = noId; mudou = true; } } if (mudou) INI.gravarEstado(localStorage, s.campanhaId, e); }
  /* aplica nas instâncias o que a Iniciativa registrou (PV, condições, situação), inclusive de combates já encerrados */
  async function puxarDaIniciativa(s) {
    if (!INI || !s.carregado) return; const rec = INI.lerRecibos(localStorage, s.campanhaId); if (!Object.keys(rec).length) return;
    const { alteracoes, aplicados } = INI.pendentes(s.nos, rec), porNo = {};
    for (const a of alteracoes) (porNo[a.no] = porNo[a.no] || []).push(a);
    try {
      for (const [noId, lista] of Object.entries(porNo)) { const no = D.porId(s.nos, noId); await salvarDados(s, no, (d) => { d.monstros = (d.monstros || []).map((m) => { const a = lista.find((x) => x.uid === m.uid); return a ? { ...a.m, sincEm: Date.now() } : m; }); }); }
      INI.limparRecibos(localStorage, s.campanhaId, aplicados);
      if (alteracoes.length) { s.msg = "Estado do combate aplicado: " + alteracoes.length + " criatura(s)."; }
    } catch (e) { s.erro = "Não foi possível guardar o estado do combate: " + (e && e.message ? e.message : "erro"); }
    desenhar(s);
  }
  function janelaEnviarIniciativa(s, n, uids) {
    const itens = M.lista(n).filter((m) => uids.includes(m.uid)).map((m) => ({ no: n.id, enc: encontroDe(s, n).id, m })); if (!itens.length) return;
    const grupos = [...new Set(itens.map((i) => i.m.origem))], rep = grupos.length < itens.length;
    const j = formularioJanela("Enviar para a Iniciativa", `<p class="muted">${itens.length} criatura(s) de “${esc(n.nome)}”. Quem já está no combate não é enviado de novo; o combate em andamento não é reiniciado.</p>
      <fieldset class="enc-tipo"><legend class="muted">Iniciativa</legend><label class="inline"><input type="radio" name="modo" value="auto" checked> Rolar automaticamente (d20 + modificador)</label><br><label class="inline"><input type="radio" name="modo" value="manual"> Informar o valor</label><br><label class="inline"><input type="radio" name="modo" value="branco"> Deixar em branco (preencher depois)</label></fieldset>
      ${rep ? '<label class="inline"><input type="checkbox" name="compartilhada" value="1"> Mesma iniciativa para criaturas iguais</label>' : ""}
      <div class="enc-ini-valores" hidden></div>`, async (v) => enviarParaIniciativa(s, n, itens, v, j));
    const caixa = j.corpo.querySelector(".enc-ini-valores"), form = j.corpo.querySelector("form");
    const pintar = () => { const manual = form.querySelector("[name=modo]:checked").value === "manual", comp = !!(form.querySelector("[name=compartilhada]") || {}).checked; caixa.hidden = !manual;
      caixa.innerHTML = manual ? (comp ? grupos.map((g) => `<label>${esc(itens.find((i) => i.m.origem === g).m.base)} (todos)<input type="number" name="v:${esc(g)}" step="1" required></label>`).join("") : itens.map((i) => `<label>${esc(i.m.nome)}<input type="number" name="v:${esc(i.m.uid)}" step="1" required></label>`).join("")) : ""; };
    form.addEventListener("change", pintar); pintar();
  }
  async function enviarParaIniciativa(s, n, itens, v, j) {
    const valores = {}; for (const [k, x] of Object.entries(v)) if (k.startsWith("v:")) valores[k.slice(2)] = x;
    const e = INI.lerEstado(localStorage, s.campanhaId), r = INI.enviar(e, itens, { modo: v.modo, compartilhada: !!v.compartilhada, valores });
    if (r.enviados.length) { try { INI.gravarEstado(localStorage, s.campanhaId, e); } catch (_) { return { erro: "Não foi possível gravar na Iniciativa (armazenamento cheio ou bloqueado)." }; } }
    s.selMon.clear(); s.iniEstado = INI.lerEstado(localStorage, s.campanhaId);
    s.msg = r.enviados.length + " enviada(s) para a Iniciativa" + (r.duplicados.length ? "; " + r.duplicados.length + " já estava(m) no combate" : "") + (r.ignorados.length ? "; " + r.ignorados.length + " fora de combate (fugiu, capturado ou derrotado)" : "") + ".";
    desenhar(s); return {};
  }
  function janelaVincular(s, n, uid) {
    const m = M.lista(n).find((x) => x.uid === uid), cands = INI.candidatos(s.iniEstado); if (!m || !cands.length) return;
    formularioJanela("Vincular a um combatente", `<p class="muted">Liga “${esc(m.nome)}” a uma criatura que já está no combate. Os dados atuais do combate passam para o encontro.</p><label>Combatente<select name="cid">${cands.map((c) => `<option value="${esc(c.id)}">${esc(c.name)} (PV ${c.hp}/${c.maxHp})</option>`).join("")}</select></label>`, async (v) => {
      const e = INI.lerEstado(localStorage, s.campanhaId), r = INI.associar(e, v.cid, n.id, encontroDe(s, n).id, uid); if (r.erro) return { erro: r.erro };
      INI.gravarEstado(localStorage, s.campanhaId, e); const c = INI.combatenteDe(e, uid), novo = { ...INI.lerDoCombatente(c, m), sincEm: Date.now() };
      await guardar(s, () => gravarMonstros(s, n, (l) => l.map((x) => (x.uid === uid ? novo : x)), "Vinculado a “" + c.name + "” na Iniciativa."), "Vinculado."); return s.erro ? { erro: s.erro } : {};
    });
  }
  async function janelaAddMonstros(s, n) {
    const j = window.COMP_JANELA.abrir({ titulo: "Adicionar monstros", largura: "media", conteudo: `<div class="enc-form"><label>Buscar no bestiário<input type="search" class="enc-add-busca" placeholder="Nome do monstro (ex.: goblin)" autocomplete="off"></label><p class="muted enc-add-status" role="status">Carregando o bestiário…</p><div class="enc-add-res"></div><p class="err enc-form-erro" role="alert"></p></div>` });
    const q = j.corpo.querySelector(".enc-add-busca"), res = j.corpo.querySelector(".enc-add-res"), st = j.corpo.querySelector(".enc-add-status"), er = j.corpo.querySelector(".enc-form-erro");
    try { s.bestiario = s.bestiario || (await M.carregarBestiario()); } catch (e) { st.textContent = "Não foi possível ler o bestiário."; return; }
    st.textContent = s.bestiario.catalogo.length + " monstros no bestiário. Digite para buscar."; q.focus();
    const pintar = () => { const r = M.buscar(s.bestiario.catalogo, q.value); res.innerHTML = r.length ? r.map((x) => `<div class="enc-add-linha">${fotoMon(s, x.key)}<span class="enc-add-nome"><b>${esc(x.nomePt || x.nome)}</b>${x.nomePt ? ` <span class="muted">(${esc(x.nome)})</span>` : ""}<span class="muted"> · ND ${esc(x.nd || "?")} · CA ${x.ca} · PV ${x.pv}${x.tipo ? " · " + esc(x.tipo) : ""}</span></span><input type="number" class="enc-add-qtd" min="1" max="${M.MAX_POR_ADICAO}" value="1" aria-label="Quantidade de ${esc(x.nomePt || x.nome)}"><button type="button" class="small primary" data-add="${esc(x.key)}">Adicionar</button></div>`).join("") : (q.value.trim() ? '<p class="muted">Nada encontrado.</p>' : ""); };
    q.addEventListener("input", pintar);
    res.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-add]"); if (!b) return; const reg = s.bestiario.porChave.get(b.dataset.add), qtd = b.closest(".enc-add-linha").querySelector(".enc-add-qtd").value; if (!reg) return;
      const plano = M.adicionar(todosMonstros(s, n), reg, qtd);
      if (M.lista(n).length + plano.novos.length > M.MAX_POR_NO) { er.textContent = "Limite de " + M.MAX_POR_NO + " monstros por encontro ou sala."; return; }
      b.disabled = true;
      await guardar(s, async () => {
        for (const no of nosDoEncontro(s, n)) { const rn = plano.renomeados.filter((r) => M.lista(no).some((m) => m.uid === r.uid)); if (rn.length) await gravarMonstros(s, no, (l) => l.map((m) => { const r = rn.find((x) => x.uid === m.uid); return r ? { ...m, nome: r.nome } : m; })); }
        await gravarMonstros(s, n, (l) => l.concat(plano.novos), plano.novos.length === 1 ? "Monstro “" + plano.novos[0].nome + "” adicionado a “" + n.nome + "”." : plano.novos.length + " × " + nomeBaseReg(reg) + " adicionados a “" + n.nome + "”.");
      }, plano.novos.length + " monstro(s) adicionado(s).");
      if (s.erro) { er.textContent = s.erro; b.disabled = false; } else j.fechar();
    });
  }

  /* ---------- montagem ---------- */
  async function montar(raiz, { campanhaId, nuvem = window.nuvem }) {
    const s = estadoDe(campanhaId, nuvem); s.raiz = raiz; raiz.classList.add("enc"); desenhar(s);
    if (!raiz.__encLigado) {
      raiz.__encLigado = true;
      raiz.addEventListener("click", (e) => { const b = e.target.closest("[data-enc-acao]"); if (!b) return; const det = b.closest("details.enc-mais"); if (det) det.removeAttribute("open"); const st = estados[campanhaId]; if (st) acao(st, b.dataset.encAcao, b.dataset.id || null, b.dataset); });
      raiz.addEventListener("input", (e) => { if (!e.target.classList.contains("enc-busca")) return; const st = estados[campanhaId]; st.busca = e.target.value; const pos = e.target.selectionStart; desenhar(st); const nova = st.raiz.querySelector(".enc-busca"); if (nova) { nova.focus(); try { nova.setSelectionRange(pos, pos); } catch (_) { /* sem seleção */ } } });
      raiz.addEventListener("change", (e) => { const sm = e.target.dataset && e.target.dataset.encMonSel; if (sm) { const st = estados[campanhaId]; e.target.checked ? st.selMon.add(sm) : st.selMon.delete(sm); return desenhar(st); }
        if (e.target.dataset && e.target.dataset.encPv) { const st = estados[campanhaId], n = D.porId(st.nos, st.sel), m = n && M.lista(n).find((x) => x.uid === e.target.dataset.encPv); if (!m) return; const r2 = M.editar(m, { pv: e.target.value }); return atualizarMonstro(st, n, m.uid, r2.monstro, null); }
        const r = e.target.dataset && e.target.dataset.encRapido; if (!r) return; const st = estados[campanhaId], n = D.porId(st.nos, e.target.dataset.id); if (!n) return;
        if (r === "modo") return mudarModo(st, n, e.target.value);
        if (r === "estado") guardar(st, () => salvarDados(st, n, (d) => { d.estado = e.target.value; }, "Preparação: " + D.ESTADOS[e.target.value] + "."), "Salvo.");
        else if (r === "concluido") guardar(st, () => salvarDados(st, n, (d) => { d.concluido = e.target.checked; }, e.target.checked ? "Encontro marcado como concluído." : "Encontro reaberto."), "Salvo.");
        else if (r === "explorada") guardar(st, () => salvarDados(st, n, (d) => { d.explorada = e.target.checked; }, "Sala “" + n.nome + (e.target.checked ? "” marcada como explorada." : "” marcada como não explorada.")), "Salvo."); });
      raiz.addEventListener("submit", (e) => { const fm = e.target.closest("form[data-enc-form=monstro]"); if (fm) { e.preventDefault(); return salvarMonstro(estados[campanhaId], fm); }
      const f = e.target.closest("form[data-enc-form]"); if (!f) return; e.preventDefault(); const st = estados[campanhaId], n = D.porId(st.nos, f.dataset.id), fd = new FormData(f), nome = D.nomeValido(fd.get("nome")); if (!n) return; if (!nome) { st.erro = "Informe um nome."; return desenhar(st); }
        guardar(st, async () => { const antigo = n.nome, descricao = String(fd.get("descricao") || "").slice(0, 20000); const dados = JSON.parse(JSON.stringify(n.dados)); dados.descricao = descricao; if (n.tipo === "encontro" && antigo !== nome) marcarHist({ dados }, "Renomeado de “" + antigo + "”."); await st.repo.atualizar(n.id, { nome, dados }); n.nome = nome; n.dados = dados; st.editando = false; }, "Salvo."); });
      const voltou = () => { const st = estados[campanhaId]; if (st && st.raiz && st.raiz.isConnected && !document.hidden) puxarDaIniciativa(st); };
      document.addEventListener("visibilitychange", voltou); window.addEventListener("focus", voltou); window.addEventListener("storage", (e) => { if (e.key && e.key.startsWith("compendio:encontros-sync:")) voltou(); });
      document.addEventListener("click", (e) => { document.querySelectorAll("details.enc-mais[open]").forEach((d) => { if (!d.contains(e.target)) d.removeAttribute("open"); }); });
    }
    if (!s.carregado) {
      try { s.nos = await s.repo.listar(); s.carregado = true; s.erro = ""; if (s.sel && !D.porId(s.nos, s.sel)) s.sel = null; }
      catch (e) { s.erro = "Não foi possível carregar os encontros: " + (e && e.message ? e.message : "erro desconhecido"); }
      if (s.repo.modo === "nuvem") { try { s.locais = s.repo.locais().length; } catch (_) { s.locais = 0; } }
      if (s.raiz) desenhar(s);
      puxarDaIniciativa(s);
    }
    if (!s.bestiario && M) M.carregarBestiario().then((b) => { s.bestiario = b; if (s.raiz) desenhar(s); }).catch(() => { /* a busca avisa se o bestiário não abrir */ });
  }
  window.ENCONTROS_UI = { montar, desenhar: (c) => estados[c] && desenhar(estados[c]), estados };
})();
