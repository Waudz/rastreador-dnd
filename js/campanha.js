/* Página da campanha: personagens, diário (resumos e arquivos) e membros */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s), esc = nuvem.esc;
  const id = new URLSearchParams(location.search).get("id");
  let camp = null, papel = "", membros = [], nomes = {}, pers = [], docs = [], aba = "pers", editandoDoc = null;
  const mestre = () => papel === "mestre";
  const meuId = () => nuvem.usuario().id;
  const pct = (a, m) => (m > 0 ? Math.max(0, Math.min(100, (a / m) * 100)) : 0);
  const fmtData = (t) => new Date(t).toLocaleDateString("pt-BR");
  const tamanho = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB");
  const aviso = (t, erro) => { const e = $("#erro"); e.innerHTML = t ? (erro ? `<span class="err">${esc(t)}</span>` : esc(t)) : ""; };

  async function carregar() {
    const [c, m, pf, ps, ds] = await Promise.all([
      nuvem.get(`campanhas?select=id,nome,mestre_id&id=eq.${encodeURIComponent(id)}`),
      nuvem.get(`membros?select=usuario_id,papel&campanha_id=eq.${encodeURIComponent(id)}`),
      nuvem.get("perfis?select=id,nome"),
      nuvem.get(`personagens?select=id,nome,dono_id,pv_atual,pv_max,pv_temp,ca,ficha&campanha_id=eq.${encodeURIComponent(id)}&order=nome`),
      nuvem.get(`documentos?select=id,tipo,titulo,conteudo,sessao,arquivo_path,arquivo_nome,arquivo_tipo,arquivo_tamanho,visivel,criado_em&campanha_id=eq.${encodeURIComponent(id)}&order=criado_em.desc`)
    ]);
    if (!c[0]) throw new Error("Campanha não encontrada ou você não participa dela.");
    camp = c[0]; membros = m; pers = ps; docs = ds;
    nomes = Object.fromEntries(pf.map((x) => [x.id, x.nome || "Jogador"]));
    const eu = m.find((x) => x.usuario_id === meuId()); papel = eu ? eu.papel : "jogador";
  }

  /* ---------- desenho ---------- */
  function cabecalho() {
    $("#titulo").textContent = camp.nome; document.title = camp.nome + " — Rastreador D&D";
    $("#papel").textContent = mestre() ? "Mestre" : "Jogador";
    $("#lnk-combate").hidden = !mestre();
    const abas = [["pers", "Personagens"], ["diario", "Diário"]].concat(mestre() ? [["membros", "Grupo"]] : []);
    $("#abas").hidden = false;
    $("#abas").innerHTML = abas.map(([k, t]) => `<button type="button" data-aba="${k}" class="${aba === k ? "on" : ""}">${t}</button>`).join("");
  }

  const cartaoPers = (p) => {
    const f = p.ficha || {}, sub = [f.classe, f.nivel ? "nível " + f.nivel : ""].filter(Boolean).join(" · "), v = pct(p.pv_atual, p.pv_max);
    return `<div class="card" data-id="${esc(p.id)}">
      <a href="personagem.html?id=${encodeURIComponent(p.id)}" style="color:inherit;text-decoration:none"><b>${esc(p.nome)}</b>
      <div class="meta">${esc(sub)}${sub ? " · " : ""}${esc(nomes[p.dono_id] || "Sem dono")} · CA ${p.ca}</div></a>
      <div class="hpline"><div class="hp-top"><span>PV${p.pv_temp ? ` (+${p.pv_temp} temp.)` : ""}</span><strong>${p.pv_atual} / ${p.pv_max}</strong></div><div class="hp-track"><div class="hp-fill ${v <= 25 ? "low" : v <= 50 ? "mid" : ""}" style="width:${v}%"></div></div></div>
      <div class="inline" style="margin-top:8px"><input class="num" type="number" min="1" value="1" aria-label="Quantidade"><button type="button" class="small danger" data-dano="1">Dano</button><button type="button" class="small" data-cura="1">Cura</button></div>
    </div>`;
  };

  function abaPers() {
    const donos = membros.map((m) => `<option value="${esc(m.usuario_id)}"${m.usuario_id === meuId() ? " selected" : ""}>${esc(nomes[m.usuario_id] || "Jogador")}</option>`).join("");
    return `<div class="bar"><span class="grow"></span><button type="button" class="small" id="abre-novo">Novo personagem</button></div>
      <form id="form-novo" class="row" hidden>
        <input id="n-nome" maxlength="80" placeholder="Nome" style="flex:1 1 200px" required>
        ${mestre() ? `<select id="n-dono" style="flex:0 1 180px" aria-label="Dono">${donos}</select>` : ""}
        <button type="submit" class="primary small">Criar</button>
      </form>
      <div class="cards">${pers.length ? pers.map(cartaoPers).join("") : '<span class="muted">Nenhum personagem aqui ainda.</span>'}</div>`;
  }

  function formResumo() {
    const d = editandoDoc ? docs.find((x) => x.id === editandoDoc) : null;
    return `<form id="form-resumo" class="panel" style="margin-bottom:12px">
      <div class="row"><input id="r-titulo" maxlength="160" placeholder="Título" style="flex:1 1 220px" value="${esc(d ? d.titulo : "")}" required><input id="r-sessao" class="num" type="number" min="0" placeholder="Sessão" value="${d && d.sessao != null ? d.sessao : ""}"></div>
      <textarea id="r-texto" rows="8" placeholder="Texto do resumo ou da nota" style="width:100%">${esc(d ? d.conteudo : "")}</textarea>
      <div class="row" style="margin:8px 0 0"><label class="inline" style="margin:0"><input id="r-visivel" type="checkbox" style="width:auto;height:auto" ${!d || d.visivel ? "checked" : ""}> Visível para o grupo</label><span class="grow"></span><button type="button" class="small subtle" id="r-cancelar">Cancelar</button><button type="submit" class="primary small">Salvar</button></div>
    </form>`;
  }
  const formArquivo = () => `<form id="form-arq" class="panel" style="margin-bottom:12px">
      <div class="row"><input id="a-titulo" maxlength="160" placeholder="Título (opcional)" style="flex:1 1 200px"><input id="a-arquivo" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md" required style="flex:1 1 200px"></div>
      <div class="row" style="margin:8px 0 0"><label class="inline" style="margin:0"><input id="a-visivel" type="checkbox" style="width:auto;height:auto" checked> Visível para o grupo</label><span class="muted">Até 10 MB</span><span class="grow"></span><button type="button" class="small subtle" id="a-cancelar">Cancelar</button><button type="submit" class="primary small">Enviar</button></div>
    </form>`;

  function itemDoc(d) {
    const titulo = d.tipo === "arquivo" ? (d.titulo || d.arquivo_nome) : (d.sessao != null && d.sessao !== "" ? `Sessão ${d.sessao} · ` : "") + d.titulo;
    const corpo = d.tipo === "arquivo"
      ? `<div class="row" style="margin:0"><button type="button" class="small primary" data-abrir="${esc(d.id)}">Abrir</button><span class="muted">${esc(d.arquivo_nome || "")} · ${tamanho(d.arquivo_tamanho || 0)}</span></div>`
      : `<div class="pre">${esc(d.conteudo)}</div>`;
    const ferr = mestre() ? `<div class="row" style="margin:8px 0 0">${d.tipo !== "arquivo" ? `<button type="button" class="small" data-editar-doc="${esc(d.id)}">Editar</button>` : ""}<button type="button" class="small" data-vis="${esc(d.id)}">${d.visivel ? "Ocultar do grupo" : "Mostrar ao grupo"}</button><button type="button" class="small danger" data-apagar-doc="${esc(d.id)}">Excluir</button></div>` : "";
    return `<details class="item"><summary>${esc(titulo)} <span class="muted" style="font-weight:400">· ${d.tipo === "arquivo" ? "Arquivo" : d.tipo === "nota" ? "Nota" : "Resumo"} · ${fmtData(d.criado_em)}</span>${d.visivel ? "" : ' <span class="badge">Oculto</span>'}</summary><div>${corpo}${ferr}</div></details>`;
  }

  function abaDiario() {
    const topo = mestre() ? `<div class="bar"><span class="grow"></span><button type="button" class="small" id="abre-resumo">Novo resumo</button><button type="button" class="small" id="abre-arq">Enviar arquivo</button></div><div id="forms">${editandoDoc ? formResumo() : ""}</div>` : "";
    return topo + (docs.length ? docs.map(itemDoc).join("") : '<span class="muted">Nada aqui ainda.</span>');
  }

  function abaMembros() {
    return membros.map((m) => `<div class="res"><span><b>${esc(nomes[m.usuario_id] || "Jogador")}</b> <span class="badge ${m.papel === "mestre" ? "" : "jog"}">${m.papel === "mestre" ? "Mestre" : "Jogador"}</span></span>${m.papel !== "mestre" ? `<button type="button" class="small danger" data-remover="${esc(m.usuario_id)}">Remover</button>` : ""}</div>`).join("");
  }

  async function desenhar() {
    cabecalho();
    $("#conteudo").innerHTML = aba === "pers" ? abaPers() : aba === "diario" ? abaDiario() : abaMembros();
  }

  async function mostrarConvite() {
    if (!mestre()) return;
    const box = $("#conv"); box.hidden = false;
    try {
      const cod = await nuvem.rpc("codigo_da_campanha", { p_campanha: id });
      box.innerHTML = `<span class="muted">Código de convite</span> <b id="codigo" style="letter-spacing:.12em">${esc(cod)}</b><button type="button" class="small" id="copiar-cod">Copiar</button><button type="button" class="small subtle" id="novo-cod">Trocar código</button>`;
    } catch (e) { box.hidden = true; }
  }

  /* ---------- ações ---------- */
  async function mudarPV(cartao, dano) {
    const p = pers.find((x) => x.id === cartao.dataset.id); if (!p) return;
    const n = Math.max(1, Math.floor(Number(cartao.querySelector(".num").value) || 1));
    let atual = p.pv_atual, temp = p.pv_temp || 0;
    if (dano) { const abs = Math.min(temp, n); temp -= abs; atual = Math.max(0, atual - (n - abs)); } else atual = Math.min(p.pv_max, atual + n);
    p.pv_atual = atual; p.pv_temp = temp; desenhar();
    try { await nuvem.patch(`personagens?id=eq.${encodeURIComponent(p.id)}`, { pv_atual: atual, pv_temp: temp }); aviso(""); }
    catch (e) { aviso(e.message, true); await recarregar(); }
  }

  const assinatura = () => JSON.stringify([pers.map((p) => [p.id, p.nome, p.pv_atual, p.pv_max, p.pv_temp, p.ca]), docs.map((d) => [d.id, d.titulo, d.visivel, d.conteudo.length]), membros.map((m) => m.usuario_id)]);
  async function recarregar() { try { await carregar(); desenhar(); } catch (e) { aviso(e.message, true); } }

  async function salvarResumo(ev) {
    ev.preventDefault();
    const dados = { titulo: $("#r-titulo").value.trim(), conteudo: $("#r-texto").value, sessao: $("#r-sessao").value === "" ? null : Number($("#r-sessao").value), visivel: $("#r-visivel").checked };
    try {
      if (editandoDoc) await nuvem.patch(`documentos?id=eq.${encodeURIComponent(editandoDoc)}`, dados);
      else await nuvem.post("documentos", { campanha_id: id, tipo: "resumo", ...dados });
      editandoDoc = null; await recarregar();
    } catch (e) { aviso(e.message, true); }
  }

  async function enviarArq(ev) {
    ev.preventDefault();
    const f = $("#a-arquivo").files[0]; if (!f) return;
    if (f.size > 10 * 1048576) { aviso("O arquivo passa de 10 MB.", true); return; }
    const seguro = f.name.replace(/[^\w.\-]+/g, "_").slice(-80), caminho = `${id}/${crypto.randomUUID()}-${seguro}`;
    aviso("Enviando…");
    try {
      await nuvem.enviarArquivo(caminho, f);
      try { await nuvem.post("documentos", { campanha_id: id, tipo: "arquivo", titulo: $("#a-titulo").value.trim() || f.name, arquivo_path: caminho, arquivo_nome: f.name, arquivo_tipo: f.type, arquivo_tamanho: f.size, visivel: $("#a-visivel").checked }); }
      catch (e) { try { await nuvem.apagarArquivos([caminho]); } catch (_) {} throw e; }
      aviso(""); await recarregar();
    } catch (e) { aviso(e.message, true); }
  }

  document.addEventListener("click", async (e) => {
    const t = e.target, c = (s) => t.closest(s);
    try {
      let b;
      if ((b = c("[data-aba]"))) { aba = b.dataset.aba; editandoDoc = null; return desenhar(); }
      if ((b = c("[data-dano]"))) return mudarPV(c(".card"), true);
      if ((b = c("[data-cura]"))) return mudarPV(c(".card"), false);
      if (c("#abre-novo")) { const f = $("#form-novo"); f.hidden = !f.hidden; if (!f.hidden) $("#n-nome").focus(); return; }
      if (c("#abre-resumo")) { editandoDoc = null; $("#forms").innerHTML = formResumo(); $("#r-titulo").focus(); return; }
      if (c("#abre-arq")) { $("#forms").innerHTML = formArquivo(); return; }
      if (c("#r-cancelar") || c("#a-cancelar")) { editandoDoc = null; return desenhar(); }
      if ((b = c("[data-editar-doc]"))) { editandoDoc = b.dataset.editarDoc; return desenhar(); }
      if ((b = c("[data-vis]"))) { const d = docs.find((x) => x.id === b.dataset.vis); await nuvem.patch(`documentos?id=eq.${encodeURIComponent(d.id)}`, { visivel: !d.visivel }); return recarregar(); }
      if ((b = c("[data-apagar-doc]"))) {
        const d = docs.find((x) => x.id === b.dataset.apagarDoc);
        if (!confirm(`Excluir “${d.titulo}”?`)) return;
        if (d.arquivo_path) { try { await nuvem.apagarArquivos([d.arquivo_path]); } catch (_) {} }
        await nuvem.apagar(`documentos?id=eq.${encodeURIComponent(d.id)}`); return recarregar();
      }
      if ((b = c("[data-abrir]"))) { const d = docs.find((x) => x.id === b.dataset.abrir); const url = await nuvem.urlDoArquivo(d.arquivo_path, 600); window.open(url, "_blank", "noopener"); return; }
      if ((b = c("[data-remover]"))) {
        if (!confirm(`Remover ${nomes[b.dataset.remover] || "este jogador"} da campanha?`)) return;
        await nuvem.apagar(`membros?campanha_id=eq.${encodeURIComponent(id)}&usuario_id=eq.${encodeURIComponent(b.dataset.remover)}`); return recarregar();
      }
      if (c("#copiar-cod")) { const ok = await nuvem.copiar($("#codigo").textContent); $("#copiar-cod").textContent = ok ? "Copiado" : "Selecione e copie"; return; }
      if (c("#novo-cod")) { if (!confirm("Gerar um novo código? O código antigo deixa de valer para novos jogadores.")) return; await nuvem.rpc("novo_codigo_da_campanha", { p_campanha: id }); return mostrarConvite(); }
    } catch (err) { aviso(err.message, true); }
  });

  document.addEventListener("submit", async (e) => {
    if (e.target.id === "form-resumo") return salvarResumo(e);
    if (e.target.id === "form-arq") return enviarArq(e);
    if (e.target.id === "form-novo") {
      e.preventDefault();
      try {
        const dono = mestre() ? $("#n-dono").value : meuId();
        const r = await nuvem.post("personagens", { campanha_id: id, dono_id: dono, nome: $("#n-nome").value.trim(), pv_max: 10, pv_atual: 10 });
        location.href = `personagem.html?id=${encodeURIComponent(r[0].id)}`;
      } catch (err) { aviso(err.message, true); }
    }
  });

  /* ---------- início ---------- */
  (async () => {
    try { await nuvem.retornoDoLink(); } catch (_) {}
    if (!nuvem.usuario() || !id) { location.replace("conta.html"); return; }
    try { await carregar(); await desenhar(); await mostrarConvite(); } catch (e) { aviso(e.message, true); return; }
    nuvem.observar(async () => {
      const ativo = document.activeElement;
      if (ativo && /INPUT|TEXTAREA|SELECT/.test(ativo.tagName)) return;     // não interrompe quem está digitando
      if (document.querySelector("#forms form")) return;
      const antes = assinatura(); await carregar();
      if (assinatura() !== antes) desenhar();     // só redesenha se algo mudou (não fecha o que o usuário abriu)
    }, 6000);
  })();
})();
