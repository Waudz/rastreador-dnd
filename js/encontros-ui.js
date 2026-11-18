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
    return (estados[campanhaId] = { campanhaId, nos: [], carregado: false, erro: "", sel: ui.sel || null, abertos: new Set(ui.abertos || []), busca: "", lixeira: false, editando: false, arvoreAberta: false, repo: D.criarRepositorio(campanhaId, nuvem), msg: "" });
  }
  const guardarUi = (s) => { try { localStorage.setItem("compendio:encontros-ui:" + s.campanhaId, JSON.stringify({ sel: s.sel, abertos: [...s.abertos] })); } catch (_) { /* sem preferências */ } };

  /* ---------- desenho ---------- */
  const rotuloNo = (n) => `<span class="enc-ico" aria-hidden="true">${ico(ICONE[n.tipo])}</span><span class="enc-nome-txt">${esc(n.nome)}</span>`;
  function menuDe(n) {
    const b = (acao, texto, perigo) => `<button type="button" data-enc-acao="${acao}" data-id="${esc(n.id)}"${perigo ? ' class="danger"' : ""}>${texto}</button>`;
    const ordem = b("subir", "Subir") + b("descer", "Descer");
    const itens = n.tipo === "pasta" ? b("nova-pasta", "Nova subpasta") + b("novo-encontro", "Novo encontro aqui") + b("renomear", "Renomear") + b("mover", "Mover para…") + ordem + b("excluir", "Excluir…", true)
      : n.tipo === "encontro" ? b("sala", "Adicionar sala") + b("salas", "Adicionar várias salas…") + b("renomear", "Renomear") + b("mover", "Mover para…") + b("duplicar", "Duplicar") + ordem + b("excluir", "Excluir…", true)
      : b("renomear", "Renomear") + ordem + b("excluir", "Excluir…", true);
    return `<details class="inv-mais enc-mais"><summary aria-label="Ações de ${esc(n.nome)}" title="Ações">${ico("more")}</summary><div class="inv-mais-menu">${itens}</div></details>`;
  }
  function linhaArvore(item, nivel, s) {
    const n = item.no, tem = item.filhos.length > 0, aberto = s.abertos.has(n.id), sel = s.sel === n.id;
    const c = n.tipo === "encontro" ? item.filhos.length : D.contar(s.nos, n.id).encontros + (n.tipo === "pasta" ? 0 : 0);
    const selo = n.tipo === "encontro" ? `<span class="enc-selo ${n.dados.concluido ? "ok" : n.dados.estado === "preparado" ? "prep" : ""}" title="${n.dados.concluido ? "Concluído" : D.ESTADOS[n.dados.estado] || ""}">${n.dados.concluido ? "Concluído" : D.ESTADOS[n.dados.estado] || ""}</span>`
      : n.tipo === "sala" ? `<span class="enc-selo ${n.dados.explorada ? "ok" : ""}">${n.dados.explorada ? "Explorada" : "Não explorada"}</span>` : (c ? `<span class="enc-qtd" title="Encontros dentro desta pasta">${c}</span>` : "");
    return `<li role="none"><div class="enc-linha${sel ? " sel" : ""}" role="treeitem" aria-level="${nivel + 1}" aria-selected="${sel}"${tem ? ` aria-expanded="${aberto}"` : ""} style="--n:${nivel}">
      ${tem ? `<button type="button" class="enc-seta${aberto ? " aberto" : ""}" data-enc-acao="alternar" data-id="${esc(n.id)}" aria-label="${aberto ? "Recolher" : "Expandir"} ${esc(n.nome)}">${ico("chevdown")}</button>` : '<span class="enc-seta vazio"></span>'}
      <button type="button" class="enc-nome" data-enc-acao="selecionar" data-id="${esc(n.id)}">${rotuloNo(n)}</button>${selo}${menuDe(n)}</div>
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
  function htmlHistorico(n) {
    const h = (n.dados.historico || []).slice().reverse(); if (!h.length) return '<p class="muted">Sem acontecimentos registrados.</p>';
    return `<ul class="enc-hist">${h.slice(0, 60).map((e) => `<li><span class="muted">${esc(new Date(e.quando).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }))}</span> ${esc(e.texto)}</li>`).join("")}</ul>`;
  }
  const migalhas = (s, n) => `<nav class="enc-migalhas" aria-label="Caminho">${D.caminho(s.nos, n.id).map((x, i, l) => i < l.length - 1 ? `<button type="button" class="enc-mig" data-enc-acao="selecionar" data-id="${esc(x.id)}">${esc(x.nome)}</button><span aria-hidden="true">›</span>` : `<span>${esc(x.nome)}</span>`).join("")}</nav>`;
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
      const ctl = `<div class="enc-estados"><label>Preparação<select data-enc-rapido="estado" data-id="${esc(n.id)}">${Object.entries(D.ESTADOS).map(([k, t]) => `<option value="${k}"${n.dados.estado === k ? " selected" : ""}>${t}</option>`).join("")}</select></label><label class="inline"><input type="checkbox" data-enc-rapido="concluido" data-id="${esc(n.id)}"${n.dados.concluido ? " checked" : ""}> Encontro concluído</label></div>`;
      const listaSalas = salas.length ? `<ul class="enc-cartoes">${salas.map((f) => `<li><button type="button" class="enc-cartao" data-enc-acao="selecionar" data-id="${esc(f.id)}">${rotuloNo(f)}<span class="enc-selo ${f.dados.explorada ? "ok" : ""}">${f.dados.explorada ? "Explorada" : "Não explorada"}</span></button></li>`).join("")}</ul>` : '<p class="muted">Este encontro ainda não tem salas. Elas são opcionais: o conteúdo pode ficar direto no encontro.</p>';
      return `${topo}${ctl}${secao("Descrição", desc)}${secao("Salas", `<div class="row"><button type="button" class="small" data-enc-acao="sala" data-id="${esc(n.id)}">Adicionar sala</button><button type="button" class="small" data-enc-acao="salas" data-id="${esc(n.id)}">Adicionar várias salas…</button></div>${listaSalas}`, true, salas.length ? ` <span class="muted">(${salas.length})</span>` : "")}${proxEtapa("Monstros")}${proxEtapa("Elementos")}${proxEtapa("Loot")}${secao("Histórico", htmlHistorico(n), false)}`;
    }
    const ctl = `<div class="enc-estados"><label class="inline"><input type="checkbox" data-enc-rapido="explorada" data-id="${esc(n.id)}"${n.dados.explorada ? " checked" : ""}> Sala explorada</label></div>`;
    return `${topo}${ctl}${secao("Descrição", desc)}${proxEtapa("Monstros")}${proxEtapa("Elementos")}${proxEtapa("Loot")}`;
  }
  function htmlLixeira(s) {
    const mortos = s.nos.filter((n) => n.excluido_em && !(n.pai_id && D.porId(s.nos, n.pai_id)?.excluido_em === n.excluido_em)).sort((a, b) => String(b.excluido_em).localeCompare(String(a.excluido_em)));
    return `<div class="enc-titulo"><h2>Lixeira</h2><button type="button" class="small subtle" data-enc-acao="fechar-lixeira">Voltar</button></div>
      ${mortos.length ? `<ul class="enc-cartoes enc-lixo">${mortos.map((n) => { const c = D.contar(s.nos, n.id); return `<li class="enc-cartao"><span>${rotuloNo(n)}<span class="muted"> · ${D.TIPOS[n.tipo]}${n.tipo !== "sala" ? ` · ${c.encontros ? c.encontros + " encontro(s) " : ""}${c.salas ? c.salas + " sala(s)" : ""}` : ""} · excluído em ${esc(new Date(n.excluido_em).toLocaleDateString("pt-BR"))}</span></span><span class="row"><button type="button" class="small" data-enc-acao="restaurar" data-id="${esc(n.id)}">Restaurar</button><button type="button" class="small danger" data-enc-acao="apagar-definitivo" data-id="${esc(n.id)}">Excluir de vez…</button></span></li>`; }).join("")}</ul>` : '<p class="muted">A lixeira está vazia.</p>'}`;
  }
  function desenhar(s) {
    const raiz = s.raiz; if (!raiz) return;
    const nLix = s.nos.filter((n) => n.excluido_em).length, desk = larga();
    const aviso = s.repo.modo === "local" ? `<div class="enc-aviso" role="status"><b>Salvo só neste aparelho.</b> A tabela de encontros ainda não existe no banco da conta. Aplique a migração <code>supabase/migrations/20261118120000_encontros.sql</code> para guardar na conta (os encontros criados aqui poderão ser levados depois).</div>` : "";
    raiz.innerHTML = `${aviso}<div class="enc-erro err" role="alert">${esc(s.erro)}</div>
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
    f.addEventListener("submit", async (e) => { e.preventDefault(); const r = await aoEnviar(Object.fromEntries(new FormData(f).entries())); if (r && r.erro) { er.textContent = r.erro; return; } j.fechar(); });
    return j;
  }
  const opcoesPasta = (s, selecionada) => [{ id: null, rotulo: "Raiz (sem pasta)" }].concat((function lista(pai, pref) { return D.filhos(s.nos, pai).filter((f) => f.tipo === "pasta").flatMap((f) => [{ id: f.id, rotulo: pref + f.nome }, ...lista(f.id, pref + f.nome + " › ")]); })(null, "")).map((o) => `<option value="${esc(o.id || "")}"${(o.id || "") === (selecionada || "") ? " selected" : ""}>${esc(o.rotulo)}</option>`).join("");
  async function criar(s, tipo, nome, paiId, extra) {
    const r = D.novoNo(s.nos, { tipo, nome, paiId, campanhaId: s.campanhaId }); if (r.erro) return r;
    await s.repo.inserir([r.no]); s.nos.push(r.no); if (paiId) s.abertos.add(paiId); s.sel = r.no.id; s.lixeira = false; s.busca = ""; s.editando = false; s.msg = D.TIPOS[tipo] + " criado(a)."; guardarUi(s);
    if (tipo === "sala") { const enc = D.porId(s.nos, paiId); if (enc) await salvarDados(s, r.no, () => {}, "Sala “" + r.no.nome + "” adicionada."); }
    return {};
  }
  function janelaNovo(s, tipoInicial, paiInicial) {
    formularioJanela("Novo", `<fieldset class="enc-tipo"><legend class="muted">O que criar</legend><label class="inline"><input type="radio" name="tipo" value="pasta"${tipoInicial === "pasta" ? " checked" : ""}> Pasta</label> <label class="inline"><input type="radio" name="tipo" value="encontro"${tipoInicial === "encontro" ? " checked" : ""}> Encontro</label></fieldset>
      <label>Nome<input name="nome" maxlength="120" required autocomplete="off"></label><label>Criar em<select name="pai">${opcoesPasta(s, paiInicial)}</select></label>`,
      async (v) => { let r; await guardar(s, async () => { r = await criar(s, v.tipo, v.nome, v.pai || null); if (r.erro) throw new Error(r.erro); }); return r && r.erro ? { erro: s.erro } : {}; });
  }
  function janelaSalas(s, enc, varias) {
    formularioJanela(varias ? "Adicionar várias salas" : "Adicionar sala", varias ? `<label>Nomes das salas <span class="muted">(uma por linha)</span><textarea name="nomes" rows="6" required placeholder="Portão da Igreja&#10;Nave Principal&#10;Sacristia"></textarea></label>` : `<label>Nome da sala<input name="nome" maxlength="120" required autocomplete="off"></label>`,
      async (v) => { const nomes = varias ? D.nomesEmLote(v.nomes) : [D.nomeValido(v.nome)].filter(Boolean); if (!nomes.length) return { erro: "Informe pelo menos um nome." };
        await guardar(s, async () => { const novos = []; for (const nome of nomes) { const r = D.novoNo(s.nos.concat(novos), { tipo: "sala", nome, paiId: enc.id, campanhaId: s.campanhaId }); if (r.erro) throw new Error(r.erro); novos.push(r.no); }
          await s.repo.inserir(novos); s.nos.push(...novos); s.abertos.add(enc.id); s.sel = novos[novos.length - 1].id; s.editando = false; s.lixeira = false; guardarUi(s);
          const dados = JSON.parse(JSON.stringify(enc.dados)); marcarHist({ dados }, novos.length === 1 ? "Sala “" + novos[0].nome + "” adicionada." : novos.length + " salas adicionadas: " + novos.map((n) => n.nome).join(", ") + "."); await s.repo.atualizar(enc.id, { dados }); enc.dados = dados; s.msg = novos.length + " sala(s) criada(s)."; });
        return s.erro ? { erro: s.erro } : {}; });
  }
  async function acao(s, a, id) {
    const n = id ? D.porId(s.nos, id) : null;
    if (a === "alternar") { s.abertos.has(id) ? s.abertos.delete(id) : s.abertos.add(id); guardarUi(s); return desenhar(s); }
    if (a === "selecionar") { s.sel = id; s.lixeira = false; s.editando = false; s.msg = ""; s.arvoreAberta = false; const pais = D.caminho(s.nos, id).slice(0, -1); pais.forEach((p) => s.abertos.add(p.id)); guardarUi(s); return desenhar(s); }
    if (a === "novo") return janelaNovo(s, "encontro", s.sel && D.porId(s.nos, s.sel)?.tipo === "pasta" ? s.sel : (s.sel && D.porId(s.nos, s.sel)?.tipo === "encontro" ? D.porId(s.nos, s.sel).pai_id : null));
    if (a === "nova-pasta") return janelaNovo(s, "pasta", n ? n.id : null);
    if (a === "novo-encontro") return janelaNovo(s, "encontro", n ? n.id : null);
    if (a === "sala" && n) return janelaSalas(s, n, false);
    if (a === "salas" && n) return janelaSalas(s, n, true);
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

  /* ---------- montagem ---------- */
  async function montar(raiz, { campanhaId, nuvem = window.nuvem }) {
    const s = estadoDe(campanhaId, nuvem); s.raiz = raiz; raiz.classList.add("enc"); desenhar(s);
    if (!raiz.__encLigado) {
      raiz.__encLigado = true;
      raiz.addEventListener("click", (e) => { const b = e.target.closest("[data-enc-acao]"); if (!b) return; const det = b.closest("details.enc-mais"); if (det) det.removeAttribute("open"); const st = estados[campanhaId]; if (st) acao(st, b.dataset.encAcao, b.dataset.id || null); });
      raiz.addEventListener("input", (e) => { if (!e.target.classList.contains("enc-busca")) return; const st = estados[campanhaId]; st.busca = e.target.value; const pos = e.target.selectionStart; desenhar(st); const nova = st.raiz.querySelector(".enc-busca"); if (nova) { nova.focus(); try { nova.setSelectionRange(pos, pos); } catch (_) { /* sem seleção */ } } });
      raiz.addEventListener("change", (e) => { const r = e.target.dataset && e.target.dataset.encRapido; if (!r) return; const st = estados[campanhaId], n = D.porId(st.nos, e.target.dataset.id); if (!n) return;
        if (r === "estado") guardar(st, () => salvarDados(st, n, (d) => { d.estado = e.target.value; }, "Preparação: " + D.ESTADOS[e.target.value] + "."), "Salvo.");
        else if (r === "concluido") guardar(st, () => salvarDados(st, n, (d) => { d.concluido = e.target.checked; }, e.target.checked ? "Encontro marcado como concluído." : "Encontro reaberto."), "Salvo.");
        else if (r === "explorada") guardar(st, () => salvarDados(st, n, (d) => { d.explorada = e.target.checked; }, "Sala “" + n.nome + (e.target.checked ? "” marcada como explorada." : "” marcada como não explorada.")), "Salvo."); });
      raiz.addEventListener("submit", (e) => { const f = e.target.closest("form[data-enc-form]"); if (!f) return; e.preventDefault(); const st = estados[campanhaId], n = D.porId(st.nos, f.dataset.id), fd = new FormData(f), nome = D.nomeValido(fd.get("nome")); if (!n) return; if (!nome) { st.erro = "Informe um nome."; return desenhar(st); }
        guardar(st, async () => { const antigo = n.nome, descricao = String(fd.get("descricao") || "").slice(0, 20000); const dados = JSON.parse(JSON.stringify(n.dados)); dados.descricao = descricao; if (n.tipo === "encontro" && antigo !== nome) marcarHist({ dados }, "Renomeado de “" + antigo + "”."); await st.repo.atualizar(n.id, { nome, dados }); n.nome = nome; n.dados = dados; st.editando = false; }, "Salvo."); });
      document.addEventListener("click", (e) => { document.querySelectorAll("details.enc-mais[open]").forEach((d) => { if (!d.contains(e.target)) d.removeAttribute("open"); }); });
    }
    if (!s.carregado) {
      try { s.nos = await s.repo.listar(); s.carregado = true; s.erro = ""; if (s.sel && !D.porId(s.nos, s.sel)) s.sel = null; }
      catch (e) { s.erro = "Não foi possível carregar os encontros: " + (e && e.message ? e.message : "erro desconhecido"); }
      if (s.raiz === raiz) desenhar(s); else if (s.raiz) desenhar(s);
    }
  }
  window.ENCONTROS_UI = { montar, desenhar: (c) => estados[c] && desenhar(estados[c]), estados };
})();
