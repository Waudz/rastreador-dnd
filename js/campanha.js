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

  /* texto dos resumos: [[Título|id]] vira link para outro documento; endereços http(s) viram links */
  const docPorId = (i) => docs.find((x) => x.id === i);
  function renderTexto(txt) {
    let h = esc(txt);
    h = h.replace(/\[\[([^\]|]+)\|([0-9a-f-]{36})\]\]/gi, (_, t, i) => { const d = docPorId(i.toLowerCase()); return d ? `<a class="doclink" href="#" data-doclink="${esc(d.id)}">${t}</a>` : `<span class="muted" title="Documento indisponível">${t}</span>`; });
    h = h.replace(/(https?:\/\/[^\s<]+)/g, (m) => { const fim = (m.match(/[.,;:!?)]+$/) || [""])[0], u = m.slice(0, m.length - fim.length); return `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>${fim}`; });
    return h;
  }
  const idsCitados = (txt) => [...new Set([...String(txt).matchAll(/\[\[[^\]|]+\|([0-9a-f-]{36})\]\]/gi)].map((m) => m[1].toLowerCase()))].filter((i) => docPorId(i));
  const anexosDe = (d) => { const ids = idsCitados(d.conteudo); return ids.length ? `<div class="anexos"><span class="muted">Documentos:</span>${ids.map((i) => `<a class="btnlike small doclink" href="#" data-doclink="${esc(i)}">${esc(docPorId(i).titulo)}</a>`).join("")}</div>` : ""; };

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

  const opcoesLink = (excluir) => { const l = docs.filter((x) => x.id !== excluir); return l.length ? l.map((x) => `<option value="${esc(x.id)}">${esc((x.tipo === "arquivo" ? "Arquivo: " : x.tipo === "nota" ? "Nota: " : "Resumo: ") + (x.titulo || x.arquivo_nome))}</option>`).join("") : '<option value="">(nenhum documento ainda)</option>'; };
  function inserirNoTexto(trecho) { const ta = $("#r-texto"), a = ta.selectionStart == null ? ta.value.length : ta.selectionStart, b = ta.selectionEnd == null ? a : ta.selectionEnd; ta.value = ta.value.slice(0, a) + trecho + ta.value.slice(b); ta.focus(); ta.selectionStart = ta.selectionEnd = a + trecho.length; }
  function formResumo() {
    const d = editandoDoc ? docs.find((x) => x.id === editandoDoc) : null;
    return `<form id="form-resumo" class="panel" style="margin-bottom:12px">
      <div class="row"><input id="r-titulo" maxlength="160" placeholder="Título" style="flex:1 1 220px" value="${esc(d ? d.titulo : "")}" required><input id="r-sessao" class="num" type="number" min="0" placeholder="Sessão" value="${d && d.sessao != null ? d.sessao : ""}"></div>
      <textarea id="r-texto" rows="8" placeholder="Texto do resumo ou da nota" style="width:100%">${esc(d ? d.conteudo : "")}</textarea>
      <div class="row" style="margin:8px 0 0"><select id="r-link" style="flex:1 1 180px" aria-label="Documento para linkar">${opcoesLink(d ? d.id : null)}</select><button type="button" class="small" id="r-inserir">Inserir link</button><button type="button" class="small" id="r-anexar">Anexar arquivo</button><input id="r-anexo" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md" hidden></div>
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
      ? `<div class="row" style="margin:0"><button type="button" class="small primary" data-doclink="${esc(d.id)}">Abrir</button><span class="muted">${esc(d.arquivo_nome || "")} · ${tamanho(d.arquivo_tamanho || 0)}</span></div>`
      : `<div class="pre">${renderTexto(d.conteudo)}</div>${anexosDe(d)}`;
    const ferr = mestre() ? `<div class="row" style="margin:8px 0 0">${d.tipo !== "arquivo" ? `<button type="button" class="small" data-editar-doc="${esc(d.id)}">Editar</button>` : ""}<button type="button" class="small" data-vis="${esc(d.id)}">${d.visivel ? "Ocultar do grupo" : "Mostrar ao grupo"}</button><button type="button" class="small danger" data-apagar-doc="${esc(d.id)}">Excluir</button></div>` : "";
    return `<details class="item" data-doc="${esc(d.id)}"><summary>${esc(titulo)} <span class="muted" style="font-weight:400">· ${d.tipo === "arquivo" ? "Arquivo" : d.tipo === "nota" ? "Nota" : "Resumo"} · ${fmtData(d.criado_em)}</span>${d.visivel ? "" : ' <span class="badge">Oculto</span>'}</summary><div>${corpo}${ferr}</div></details>`;
  }

  /* ordem do diário: mais novos primeiro, mais antigos primeiro ou pelo número da sessão (a escolha fica guardada neste aparelho) */
  let ordem = "novos";
  try { ordem = localStorage.getItem("campanha_ordem") || "novos"; } catch (_) {}
  const tempo = (d) => new Date(d.criado_em).getTime();
  function docsOrdenados() {
    const l = docs.slice();
    if (ordem === "antigos") return l.sort((a, b) => tempo(a) - tempo(b));
    if (ordem === "sessao") return l.sort((a, b) => { const x = a.sessao, y = b.sessao; if (x == null && y == null) return tempo(a) - tempo(b); if (x == null) return 1; if (y == null) return -1; return x - y || tempo(a) - tempo(b); });
    return l.sort((a, b) => tempo(b) - tempo(a));
  }
  function abaDiario() {
    const botoes = mestre() ? '<button type="button" class="small" id="abre-resumo">Novo resumo</button><button type="button" class="small" id="abre-arq">Enviar arquivo</button>' : "";
    const topo = `<div class="bar"><select id="ordem" style="width:auto;height:33px" aria-label="Ordem do diário"><option value="novos"${ordem === "novos" ? " selected" : ""}>Mais novos primeiro</option><option value="antigos"${ordem === "antigos" ? " selected" : ""}>Mais antigos primeiro</option><option value="sessao"${ordem === "sessao" ? " selected" : ""}>Por número da sessão</option></select><span class="grow"></span>${botoes}</div>${mestre() ? `<div id="forms">${editandoDoc ? formResumo() : ""}</div>` : ""}`;
    return topo + (docs.length ? docsOrdenados().map(itemDoc).join("") : '<span class="muted">Nada aqui ainda.</span>');
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

  async function subirArquivo(f, titulo, visivel) {
    if (f.size > 10 * 1048576) throw new Error("O arquivo passa de 10 MB.");
    const seguro = f.name.replace(/[^\w.\-]+/g, "_").slice(-80), caminho = `${id}/${crypto.randomUUID()}-${seguro}`;
    await nuvem.enviarArquivo(caminho, f);
    try { const r = await nuvem.post("documentos", { campanha_id: id, tipo: "arquivo", titulo: titulo || f.name, arquivo_path: caminho, arquivo_nome: f.name, arquivo_tipo: f.type, arquivo_tamanho: f.size, visivel: visivel }); return r[0]; }
    catch (e) { try { await nuvem.apagarArquivos([caminho]); } catch (_) {} throw e; }
  }
  async function enviarArq(ev) {
    ev.preventDefault();
    const f = $("#a-arquivo").files[0]; if (!f) return;
    aviso("Enviando…");
    try { await subirArquivo(f, $("#a-titulo").value.trim(), $("#a-visivel").checked); aviso(""); await recarregar(); } catch (e) { aviso(e.message, true); }
  }
  async function anexarAoResumo(f) {
    aviso("Enviando o anexo…");
    try {
      const r = await subirArquivo(f, "", $("#r-visivel").checked);
      docs.unshift(r); $("#r-link").innerHTML = opcoesLink(editandoDoc); inserirNoTexto(`[[${(r.titulo || r.arquivo_nome).replace(/[\]|]/g, "")}|${r.id}]]`); aviso("");
    } catch (e) { aviso(e.message, true); }
  }

  /* ---------- leitor: abre o documento nesta mesma página ---------- */
  let pilha = [], blobAtual = null;
  const soltarBlob = () => { if (blobAtual) { URL.revokeObjectURL(blobAtual); blobAtual = null; } };
  function fecharLeitor() { $("#leitor").hidden = true; $("#leitor-corpo").innerHTML = ""; soltarBlob(); pilha = []; document.body.style.overflow = ""; }
  async function abrirDoc(idd, voltando) {
    const d = docPorId(idd); if (!d) return;
    if (!voltando) pilha.push(idd);
    soltarBlob(); $("#leitor").hidden = false; document.body.style.overflow = "hidden"; $("#leitor").scrollTop = 0;
    $("#leitor-titulo").textContent = d.tipo === "arquivo" ? (d.titulo || d.arquivo_nome) : d.titulo;
    $("#leitor-voltar").hidden = pilha.length < 2; $("#leitor-baixar").hidden = true;
    const corpo = $("#leitor-corpo");
    if (d.tipo !== "arquivo") { corpo.innerHTML = `<div class="pre">${renderTexto(d.conteudo)}</div>${anexosDe(d)}`; return; }
    corpo.innerHTML = '<span class="muted">Carregando…</span>';
    try {
      const url = await nuvem.urlDoArquivo(d.arquivo_path, 300), resp = await fetch(url);
      if (!resp.ok) throw new Error("Não consegui abrir o arquivo.");
      const blob = await resp.blob(), tipo = d.arquivo_tipo || blob.type || "";
      blobAtual = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: tipo }));
      const bx = $("#leitor-baixar"); bx.href = blobAtual; bx.download = d.arquivo_nome || "arquivo"; bx.hidden = false;
      if (/^image\//.test(tipo)) corpo.innerHTML = `<img src="${blobAtual}" alt="${esc(d.titulo || "")}">`;
      else if (/pdf/.test(tipo)) corpo.innerHTML = `<iframe src="${blobAtual}" title="${esc(d.titulo || "")}"></iframe>`;
      else if (/^text\//.test(tipo)) corpo.innerHTML = `<div class="pre">${renderTexto(await blob.text())}</div>`;
      else corpo.innerHTML = '<span class="muted">Este tipo de arquivo não tem pré-visualização. Use “Baixar”.</span>';
    } catch (e) { corpo.innerHTML = `<span class="err">${esc(e.message)}</span>`; }
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
      if ((b = c("[data-doclink]"))) { e.preventDefault(); return abrirDoc(b.dataset.doclink); }
      if (c("#leitor-fechar")) return fecharLeitor();
      if (c("#leitor-voltar")) { pilha.pop(); return abrirDoc(pilha[pilha.length - 1], true); }
      if (t.id === "leitor") return fecharLeitor();
      if (c("#r-inserir")) { const v = $("#r-link").value, d = docPorId(v); if (d) inserirNoTexto(`[[${(d.titulo || d.arquivo_nome).replace(/[\]|]/g, "")}|${d.id}]]`); return; }
      if (c("#r-anexar")) return $("#r-anexo").click();
      if ((b = c("[data-remover]"))) {
        if (!confirm(`Remover ${nomes[b.dataset.remover] || "este jogador"} da campanha?`)) return;
        await nuvem.apagar(`membros?campanha_id=eq.${encodeURIComponent(id)}&usuario_id=eq.${encodeURIComponent(b.dataset.remover)}`); return recarregar();
      }
      if (c("#copiar-cod")) { const ok = await nuvem.copiar($("#codigo").textContent); $("#copiar-cod").textContent = ok ? "Copiado" : "Selecione e copie"; return; }
      if (c("#novo-cod")) { if (!confirm("Gerar um novo código? O código antigo deixa de valer para novos jogadores.")) return; await nuvem.rpc("novo_codigo_da_campanha", { p_campanha: id }); return mostrarConvite(); }
    } catch (err) { aviso(err.message, true); }
  });

  document.addEventListener("change", (e) => {
    if (e.target.id === "ordem") { ordem = e.target.value; try { localStorage.setItem("campanha_ordem", ordem); } catch (_) {} desenhar(); return; }
 if (e.target.id === "r-anexo" && e.target.files[0]) { const f = e.target.files[0]; e.target.value = ""; anexarAoResumo(f); } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#leitor").hidden) fecharLeitor(); });

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
