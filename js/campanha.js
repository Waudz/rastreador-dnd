/* Página da campanha: personagens, diário (anotações), documentos e membros */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s), esc = nuvem.esc;
  const id = new URLSearchParams(location.search).get("id");
  let camp = null, papel = "", membros = [], nomes = {}, pers = [], docs = [], aba = "pers", editandoDoc = null, anexosForm = [], formAberto = false;
  const mestre = () => papel === "mestre";
  const meuId = () => nuvem.usuario().id;
  const pct = (a, m) => (m > 0 ? Math.max(0, Math.min(100, (a / m) * 100)) : 0);
  const fmtData = (t) => new Date(t).toLocaleDateString("pt-BR");
  const tamanho = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB");
  const aviso = (t, erro) => { const e = $("#erro"); e.innerHTML = t ? (erro ? `<span class="err">${esc(t)}</span>` : esc(t)) : ""; };

  /* anotações: os documentos anexados ficam numa última linha "@@anexos:id,id" (não aparece no texto);
     [[Título|id]] no meio do texto continua funcionando como link; endereços http(s) viram links */
  const docPorId = (i) => docs.find((x) => x.id === i);
  const MARCA = "\n\n@@anexos:";
  function partes(d) {
    const c = String(d.conteudo || ""), p = c.lastIndexOf(MARCA);
    if (p < 0) return { texto: c, ids: [] };
    return { texto: c.slice(0, p), ids: c.slice(p + MARCA.length).split(",").map((x) => x.trim().toLowerCase()).filter((x) => /^[0-9a-f-]{36}$/.test(x)) };
  }
  const montar = (texto, ids) => texto + (ids.length ? MARCA + ids.join(",") : "");
  function renderTexto(txt) {
    let h = esc(txt);
    h = h.replace(/\[\[([^\]|]+)\|([0-9a-f-]{36})\]\]/gi, (_, t, i) => { const d = docPorId(i.toLowerCase()); return d ? `<a class="doclink" href="#" data-doclink="${esc(d.id)}">${t}</a>` : `<span class="muted" title="Documento indisponível">${t}</span>`; });
    h = h.replace(/(https?:\/\/[^\s<]+)/g, (m) => { const fim = (m.match(/[.,;:!?)]+$/) || [""])[0], u = m.slice(0, m.length - fim.length); return `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>${fim}`; });
    return h;
  }
  const idsDe = (d) => { const p = partes(d), inline = [...p.texto.matchAll(/\[\[[^\]|]+\|([0-9a-f-]{36})\]\]/gi)].map((m) => m[1].toLowerCase()); return [...new Set(p.ids.concat(inline))].filter((i) => docPorId(i)); };
  const nomeDoc = (d) => d.titulo || d.arquivo_nome || "Documento";
  const anexosDe = (d) => { const ids = idsDe(d); return ids.length ? `<div class="anexos"><span class="muted">Documentos:</span>${ids.map((i) => `<a class="btnlike small doclink" href="#" data-doclink="${esc(i)}">${ico("clip")} ${esc(nomeDoc(docPorId(i)))}</a>`).join("")}</div>` : ""; };
  const usadoEm = (arq) => docs.filter((x) => x.tipo !== "arquivo" && idsDe(x).includes(arq.id));

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
    $("#lnk-combate").href = "iniciativa.html?campanha="+encodeURIComponent(id); $("#lnk-combate").hidden = false; $("#lnk-combate").textContent=mestre()?"Combate e consultas":"Consultar monstros e habilidades";
    const abas = [["pers", "Personagens"], ["diario", "Diário"], ["docs", "Documentos"]].concat(mestre() ? [["membros", "Grupo"]] : []);
    $("#abas").hidden = false;
    $("#abas").innerHTML = abas.map(([k, t]) => `<button type="button" data-aba="${k}" class="${aba === k ? "on" : ""}">${t}</button>`).join("");
  }

  const cartaoPers = (p) => {
    const f = p.ficha || {}, sub = [f.classe, f.nivel ? "nível " + f.nivel : ""].filter(Boolean).join(" · "), v = pct(p.pv_atual, p.pv_max);
    return `<div class="card" data-id="${esc(p.id)}">
      <a href="personagem.html?id=${encodeURIComponent(p.id)}" style="color:inherit;text-decoration:none;display:flex;gap:10px;align-items:center">${f.foto && /^data:image\//.test(f.foto) ? `<img class="av" style="width:44px;height:44px" src="${esc(f.foto)}" alt="">` : `<span class="av av0" style="width:44px;height:44px;font-size:20px">${esc((p.nome || "?").charAt(0).toUpperCase())}</span>`}<span><b>${esc(p.nome)}</b>
      <div class="meta">${esc(sub)}${sub ? " · " : ""}${f.npc ? "" : esc(nomes[p.dono_id] || "Sem dono") + " · "}CA ${p.ca}</div></span></a>
      ${mestre()?`<div class="row"><label>Jogador responsável<select data-dono="${esc(p.id)}"><option value="">Sem jogador</option>${membros.map(m=>`<option value="${esc(m.usuario_id)}" ${p.dono_id===m.usuario_id?"selected":""}>${esc(nomes[m.usuario_id]||"Jogador")}</option>`).join("")}</select></label></div>`:""}
      <div class="hpline"><div class="hp-top"><span>PV${p.pv_temp ? ` (+${p.pv_temp} temp.)` : ""}</span><strong>${p.pv_atual} / ${p.pv_max}</strong></div><div class="hp-track"><div class="hp-fill ${v <= 25 ? "low" : v <= 50 ? "mid" : ""}" style="width:${v}%"></div></div></div>
      <div class="inline" style="margin-top:8px">${mestre() ? `<a class="btnlike small" href="iniciativa.html?campanha=${encodeURIComponent(id)}&personagem=${encodeURIComponent(p.id)}">Usar na iniciativa</a>` : ""}<input class="num" type="number" min="1" value="1" aria-label="Quantidade"><button type="button" class="small danger" data-dano="1">Dano</button><button type="button" class="small" data-cura="1">Cura</button></div>
    </div>`;
  };

  function abaPers() {
    const donos = membros.map((m) => `<option value="${esc(m.usuario_id)}"${m.usuario_id === meuId() ? " selected" : ""}>${esc(nomes[m.usuario_id] || "Jogador")}</option>`).join("");
    const jog = pers.filter((p) => !(p.ficha || {}).npc), npcs = pers.filter((p) => (p.ficha || {}).npc);
    return `<div class="bar"><span class="grow"></span><button type="button" class="small" id="recupera-fotos">Recuperar fotos importadas</button><button type="button" class="small" id="abre-imp">Importar do bestiário</button><button type="button" class="small" id="abre-novo">Novo personagem</button></div>
      <form id="form-novo" class="row" hidden>
        <input id="n-nome" maxlength="80" placeholder="Nome" style="flex:1 1 200px" required>
        ${mestre() ? `<select id="n-dono" style="flex:0 1 180px" aria-label="Dono">${donos}</select>` : ""}
        <button type="submit" class="primary small">Criar</button>
      </form>
      <div id="imp"></div>
      <div class="cards">${jog.length ? jog.map(cartaoPers).join("") : '<span class="muted">Nenhum personagem aqui ainda.</span>'}</div>
      ${npcs.length ? `<h2 class="panel-title" style="margin:16px 0 8px">NPCs</h2><div class="cards">${npcs.map(cartaoPers).join("")}</div>` : ""}`;
  }


  document.addEventListener("change", async e=>{
    const t=e.target;if(!t.dataset.dono||!mestre())return;
    t.disabled=true;
    try{await PERSONAGENS_DADOS.atribuirDono(nuvem,t.dataset.dono,t.value||null);await recarregar();await desenhar();aviso("Personagem atribuído ao jogador.");}
    catch(err){aviso(err.message,true);}finally{t.disabled=false;}
  });


  async function recuperarFotos(automatico=false){
    try{
      await acervo.baixar();const lista=await lerCriacoes(), porOrigem=Object.fromEntries(lista.map(m=>[m.key,m]));let n=0;
      for(const p of pers){const f=p.ficha||{}, m=porOrigem[f.origem];if(!m||f.foto)continue;const foto=await reduzir((window.__fotos||{})[m.key]||m.photo);if(!foto)continue;await PERSONAGENS_DADOS.atualizarFoto(nuvem,p.id,foto,automatico);n++;}
      if(n){await recarregar();await desenhar();aviso(n+" foto(s) recuperada(s). Fotos já existentes foram preservadas.");}else if(!automatico)aviso("Nenhuma foto pendente foi encontrada neste aparelho.");
    }catch(e){if(!automatico)aviso(e.message,true);}
  }
  document.addEventListener("click",e=>{if(e.target.closest("#recupera-fotos"))recuperarFotos();});
  /* ---------- importar criações do bestiário deste navegador ---------- */
  function lerCriacoes() {
    return new Promise((ok, falha) => {
      const o = indexedDB.open(acervo.banco(), 3);
      o.onupgradeneeded = () => { const d = o.result; ["mon", "spl", "img"].forEach((s) => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: "key" }); }); };
      o.onerror = () => falha(new Error("Não consegui abrir o bestiário deste navegador."));
      o.onsuccess = () => { const tx = o.result.transaction(["mon", "img"]), r = tx.objectStore("mon").getAll(), im = tx.objectStore("img").getAll(); tx.oncomplete = () => { window.__fotos = Object.fromEntries((im.result || []).filter((x) => x && typeof x.data === "string").map((x) => [x.key, x.data])); ok((r.result || []).filter((m) => m && m.custom)); }; tx.onerror = () => falha(tx.error); };
    });
  }
  function reduzir(src) {
    return new Promise((ok) => {
      if (!src) return ok("");
      const im = new Image();
      im.onerror = () => ok("");
      im.onload = () => { const S = 160, e = Math.min(1, S / Math.min(im.width, im.height)), w = Math.round(im.width * e), h = Math.round(im.height * e), c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(im, 0, 0, w, h); try { ok(c.toDataURL("image/jpeg", 0.75)); } catch (_) { ok(""); } };
      im.src = src;
    });
  }
  const CATROT = { player: "Personagem", npc: "NPC", monster: "Monstro" };
  const fichaDe = (m,npc,foto) => PERSONAGENS_DADOS.fichaDe(m,npc,foto,REGRAS);
  async function painelImportar() {
    const box = $("#imp"); box.innerHTML = '<span class="muted">Lendo o bestiário…</span>';
    let lista;
    try { if(nuvem.usuario())await acervo.baixar(); lista = await lerCriacoes(); } catch (e) { box.innerHTML = `<span class="err">${esc(e.message)}</span>`; return; }
    const ja = new Set(pers.map((p) => (p.ficha || {}).origem).filter(Boolean));
    lista.sort((a, b) => a.name.localeCompare(b.name));
    window.__criacoes = Object.fromEntries(lista.map((m) => [m.key, m]));
    box.innerHTML = `<div class="panel" style="margin-bottom:12px"><div class="bar"><b class="grow">Suas criações neste navegador</b><button type="button" class="small subtle" id="fecha-imp">Fechar</button></div>` +
      (lista.length ? lista.map((m) => `<div class="res" data-k="${esc(m.key)}"><span><b>${esc(m.name)}</b> <span class="badge jog">${CATROT[m.cat] || "Monstro"}</span>${ja.has(m.key) ? ' <span class="muted">· já importado</span>' : ""}${((window.__fotos || {})[m.key] || m.photo) ? "" : ' <span class="muted">· sem foto</span>'}</span><span class="inline">${ja.has(m.key) && ((window.__fotos || {})[m.key] || m.photo) ? `<button type="button" class="small" data-foto="${esc(m.key)}">Atualizar foto</button>` : ""}<select class="imp-dest" aria-label="Importar como"><option value="p"${m.cat === "player" || !mestre() ? " selected" : ""}>Personagem</option>${mestre() ? `<option value="n"${m.cat !== "player" ? " selected" : ""}>NPC</option>` : ""}</select><button type="button" class="small primary" data-imp="${esc(m.key)}">Importar</button></span></div>`).join("") : '<span class="muted">Você não tem criações neste navegador. Crie no bestiário do rastreador.</span>') + "</div>";
  }
  async function atualizarFoto(chave, botao) {
    const foto = await reduzir(((window.__fotos || {})[chave] || window.__criacoes?.[chave]?.photo)), alvos = pers.filter((p) => (p.ficha || {}).origem === chave);
    if (!foto || !alvos.length) { aviso("Não encontrei foto ou personagem importado.", true); return; }
    botao.disabled = true;
    try { for (const p of alvos) await PERSONAGENS_DADOS.atualizarFoto(nuvem,p.id,foto); await recarregar(); await desenhar(); painelImportar(); aviso("Foto atualizada."); }
    catch (e) { botao.disabled = false; aviso(e.message, true); }
  }
  async function importar(chave, botao) {
    const m = (window.__criacoes || {})[chave]; if (!m) return;
    const npc = botao.closest(".res").querySelector(".imp-dest").value === "n";
    botao.disabled = true; botao.textContent = "Importando…";
    try {
      const hp = Math.max(1, m.hit_points || 1), foto = await reduzir((window.__fotos || {})[m.key] || m.photo);
      await nuvem.post("personagens", { campanha_id: id, dono_id: meuId(), nome: String(m.name).slice(0, 80), pv_max: hp, pv_atual: hp, ca: m.armor_class || 10, ficha: fichaDe(m, npc, foto), inventario: [] });
      await recarregar(); aba = "pers"; await desenhar(); painelImportar(); aviso(`“${m.name}” importado como ${npc ? "NPC" : "personagem"}.`);
    } catch (e) { botao.disabled = false; botao.textContent = "Importar"; aviso(e.message, true); }
  }

  const opcoesLink = () => { const l = docs.filter((x) => x.tipo === "arquivo" && !anexosForm.includes(x.id)); return l.length ? l.map((x) => `<option value="${esc(x.id)}">${esc(nomeDoc(x))}</option>`).join("") : '<option value="">(nenhum documento disponível)</option>'; };
  const chipsForm = () => anexosForm.map((i) => { const d = docPorId(i); return d ? `<span class="chip">${ico("clip")} ${esc(nomeDoc(d))}<button type="button" class="chip-x" data-tirar="${esc(i)}" aria-label="Tirar o anexo">${ico("x")}</button></span>` : ""; }).join("");
  function atualizarAnexosForm() { const c = $("#r-chips"), s = $("#r-link"); if (c) c.innerHTML = chipsForm(); if (s) s.innerHTML = opcoesLink(); }
  function formResumo() {
    const d = editandoDoc ? docs.find((x) => x.id === editandoDoc) : null;
    return `<form id="form-resumo" class="panel" style="margin-bottom:12px">
      <div class="row"><input id="r-titulo" maxlength="160" placeholder="Título" style="flex:1 1 220px" value="${esc(d ? d.titulo : "")}" required><input id="r-sessao" class="num" type="number" min="0" placeholder="Sessão" value="${d && d.sessao != null ? d.sessao : ""}"></div>
      <textarea id="r-texto" rows="8" placeholder="Escreva a anotação" style="width:100%">${esc(d ? partes(d).texto : "")}</textarea>
      <div id="r-chips" class="anexos">${chipsForm()}</div>
      <div class="row" style="margin:8px 0 0"><select id="r-link" style="flex:1 1 180px" aria-label="Documento para vincular">${opcoesLink()}</select><button type="button" class="small" id="r-inserir">Vincular documento</button><button type="button" class="small" id="r-anexar">Enviar novo arquivo</button><input id="r-anexo" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md" hidden></div>
      <div class="row" style="margin:8px 0 0"><label class="inline" style="margin:0"><input id="r-visivel" type="checkbox" style="width:auto;height:auto" ${!d || d.visivel ? "checked" : ""}> Visível para o grupo</label><span class="grow"></span><button type="button" class="small subtle" id="r-cancelar">Cancelar</button><button type="submit" class="primary small">Salvar</button></div>
    </form>`;
  }
  const formArquivo = () => `<form id="form-arq" class="panel" style="margin-bottom:12px">
      <div class="row"><input id="a-titulo" maxlength="160" placeholder="Título (opcional)" style="flex:1 1 200px"><input id="a-arquivo" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md" required style="flex:1 1 200px"></div>
      <div class="row" style="margin:8px 0 0"><label class="inline" style="margin:0"><input id="a-visivel" type="checkbox" style="width:auto;height:auto" checked> Visível para o grupo</label><span class="muted">Até 10 MB</span><span class="grow"></span><button type="button" class="small subtle" id="a-cancelar">Cancelar</button><button type="submit" class="primary small">Enviar</button></div>
    </form>`;

  function itemDoc(d) {
    const arq = d.tipo === "arquivo", n = arq ? 0 : idsDe(d).length;
    const titulo = arq ? nomeDoc(d) : (d.sessao != null && d.sessao !== "" ? `Sessão ${d.sessao} · ` : "") + d.titulo;
    const usos = arq ? usadoEm(d) : [];
    const corpo = arq
      ? `<div class="row" style="margin:0"><button type="button" class="small primary" data-doclink="${esc(d.id)}">Abrir</button><span class="muted">${esc(d.arquivo_nome || "")} · ${tamanho(d.arquivo_tamanho || 0)}</span></div>${usos.length ? `<div class="muted" style="margin-top:6px">Usado em: ${usos.map((u) => esc(u.titulo)).join(", ")}</div>` : ""}`
      : `<div class="pre">${renderTexto(partes(d).texto)}</div>${anexosDe(d)}`;
    const ferr = mestre() ? `<div class="row" style="margin:8px 0 0">${!arq ? `<button type="button" class="small" data-editar-doc="${esc(d.id)}">Editar</button>` : ""}<button type="button" class="small" data-vis="${esc(d.id)}">${d.visivel ? "Ocultar do grupo" : "Mostrar ao grupo"}</button><button type="button" class="small danger" data-apagar-doc="${esc(d.id)}">Excluir</button></div>` : "";
    const clipe = n ? ` <span class="clipe" title="${n === 1 ? "1 documento anexado" : n + " documentos anexados"}">${ico("clip")}${n}</span>` : "";
    return `<details class="item" data-doc="${esc(d.id)}"><summary>${esc(titulo)}${clipe} <span class="muted" style="font-weight:400">· ${arq ? "Documento" : "Anotação"} · ${fmtData(d.criado_em)}</span>${d.visivel ? "" : ' <span class="badge">Oculto</span>'}</summary><div>${corpo}${ferr}</div></details>`;
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
    const botoes = mestre() ? '<button type="button" class="small" id="abre-resumo">Nova anotação</button>' : "";
    const lista = docsOrdenados().filter((d) => d.tipo !== "arquivo");
    const topo = `<div class="bar"><select id="ordem" style="width:auto;height:33px" aria-label="Ordem do diário"><option value="novos"${ordem === "novos" ? " selected" : ""}>Mais novas primeiro</option><option value="antigos"${ordem === "antigos" ? " selected" : ""}>Mais antigas primeiro</option><option value="sessao"${ordem === "sessao" ? " selected" : ""}>Por número da sessão</option></select><span class="grow"></span>${botoes}</div>${mestre() ? `<div id="forms">${editandoDoc || formAberto ? formResumo() : ""}</div>` : ""}`;
    return topo + (lista.length ? lista.map(itemDoc).join("") : '<span class="muted">Nenhuma anotação ainda.</span>');
  }
  function abaDocs() {
    const botoes = mestre() ? '<button type="button" class="small" id="abre-arq">Enviar arquivo</button>' : "";
    const lista = docs.filter((d) => d.tipo === "arquivo").sort((a, b) => tempo(b) - tempo(a));
    return `<div class="bar"><span class="muted">Mapas, PDFs e imagens da campanha. Para ligar um a uma anotação, use “Vincular documento” ao editá-la.</span><span class="grow"></span>${botoes}</div>${mestre() ? '<div id="forms"></div>' : ""}` + (lista.length ? lista.map(itemDoc).join("") : '<span class="muted">Nenhum documento ainda.</span>');
  }

  function abaMembros() {
    return membros.map((m) => `<div class="res"><span><b>${esc(nomes[m.usuario_id] || "Jogador")}</b> <span class="badge ${m.papel === "mestre" ? "" : "jog"}">${m.papel === "mestre" ? "Mestre" : "Jogador"}</span></span>${m.papel !== "mestre" ? `<button type="button" class="small danger" data-remover="${esc(m.usuario_id)}">Remover</button>` : ""}</div>`).join("");
  }

  async function desenhar() {
    cabecalho();
    $("#conteudo").innerHTML = aba === "pers" ? abaPers() : aba === "diario" ? abaDiario() : aba === "docs" ? abaDocs() : abaMembros();
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

  const assinatura = () => JSON.stringify([pers.map((p) => [p.id, p.nome, p.pv_atual, p.pv_max, p.pv_temp, p.ca]), docs.map((d) => [d.id, d.tipo, d.titulo, d.visivel, d.conteudo.length]), membros.map((m) => m.usuario_id)]);
  async function recarregar() { try { await carregar(); desenhar(); } catch (e) { aviso(e.message, true); } }

  async function salvarResumo(ev) {
    ev.preventDefault();
    const dados = { titulo: $("#r-titulo").value.trim(), conteudo: montar($("#r-texto").value.replace(/\s+$/, ""), anexosForm), sessao: $("#r-sessao").value === "" ? null : Number($("#r-sessao").value), visivel: $("#r-visivel").checked };
    try {
      if (editandoDoc) await nuvem.patch(`documentos?id=eq.${encodeURIComponent(editandoDoc)}`, dados);
      else await nuvem.post("documentos", { campanha_id: id, tipo: "resumo", ...dados });
      editandoDoc = null; formAberto = false; anexosForm = []; await recarregar();
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
      docs.unshift(r); anexosForm.push(r.id); atualizarAnexosForm(); aviso("");
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
      if ((b = c("[data-aba]"))) { aba = b.dataset.aba; editandoDoc = null; formAberto = false; anexosForm = []; return desenhar(); }
      if ((b = c("[data-dano]"))) return mudarPV(c(".card"), true);
      if ((b = c("[data-cura]"))) return mudarPV(c(".card"), false);
      if (c("#abre-imp")) return painelImportar();
      if (c("#fecha-imp")) { $("#imp").innerHTML = ""; return; }
      if ((b = c("[data-imp]"))) return importar(b.dataset.imp, b);
      if ((b = c("[data-foto]"))) return atualizarFoto(b.dataset.foto, b);
      if (c("#abre-novo")) { const f = $("#form-novo"); f.hidden = !f.hidden; if (!f.hidden) $("#n-nome").focus(); return; }
      if (c("#abre-resumo")) { editandoDoc = null; formAberto = true; anexosForm = []; $("#forms").innerHTML = formResumo(); $("#r-titulo").focus(); return; }
      if (c("#abre-arq")) { $("#forms").innerHTML = formArquivo(); return; }
      if (c("#r-cancelar") || c("#a-cancelar")) { editandoDoc = null; formAberto = false; anexosForm = []; return desenhar(); }
      if ((b = c("[data-editar-doc]"))) { editandoDoc = b.dataset.editarDoc; anexosForm = idsDe(docPorId(editandoDoc)); return desenhar(); }
      if ((b = c("[data-vis]"))) { const d = docs.find((x) => x.id === b.dataset.vis); await nuvem.patch(`documentos?id=eq.${encodeURIComponent(d.id)}`, { visivel: !d.visivel }); return recarregar(); }
      if ((b = c("[data-apagar-doc]"))) {
        const d = docs.find((x) => x.id === b.dataset.apagarDoc);
        if (!confirm(`Excluir “${nomeDoc(d)}”?`)) return;
        if (d.arquivo_path) { try { await nuvem.apagarArquivos([d.arquivo_path]); } catch (_) {} }
        await nuvem.apagar(`documentos?id=eq.${encodeURIComponent(d.id)}`); return recarregar();
      }
      if ((b = c("[data-doclink]"))) { e.preventDefault(); return abrirDoc(b.dataset.doclink); }
      if (c("#leitor-fechar")) return fecharLeitor();
      if (c("#leitor-voltar")) { pilha.pop(); return abrirDoc(pilha[pilha.length - 1], true); }
      if (t.id === "leitor") return fecharLeitor();
      if (c("#r-inserir")) { const v = $("#r-link").value; if (v && docPorId(v) && !anexosForm.includes(v)) { anexosForm.push(v); atualizarAnexosForm(); } return; }
      if ((b = c("[data-tirar]"))) { anexosForm = anexosForm.filter((x) => x !== b.dataset.tirar); atualizarAnexosForm(); return; }
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
    try { await carregar(); await desenhar(); await mostrarConvite(); if(pers.some(p=>(p.ficha||{}).origem&&!(p.ficha||{}).foto))await recuperarFotos(true); } catch (e) { aviso(e.message, true); return; }
    nuvem.observar(async () => {
      const ativo = document.activeElement;
      if (ativo && /INPUT|TEXTAREA|SELECT/.test(ativo.tagName)) return;     // não interrompe quem está digitando
      if (document.querySelector("#forms form") || document.querySelector("#imp .panel")) return;
      const antes = assinatura(); await carregar();
      if (assinatura() !== antes) desenhar();     // só redesenha se algo mudou (não fecha o que o usuário abriu)
    }, 6000);
  })();
})();
