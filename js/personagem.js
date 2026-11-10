/* Ficha do personagem: vida, atributos, inventário, dinheiro, habilidades e notas.
   O dono e o mestre da campanha podem editar; o banco de dados garante isso (regras de acesso). */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s), esc = nuvem.esc;
  const id = new URLSearchParams(location.search).get("id");
  let P = null, camp = null, souMestre = false, donoNome = "", pend = null, timer = null, catalogo = null;
  const ATR = [["for", "FOR"], ["des", "DES"], ["con", "CON"], ["int", "INT"], ["sab", "SAB"], ["car", "CAR"]];
  const MOEDAS = [["pc", "PC"], ["pp", "PP"], ["pe", "PE"], ["po", "PO"], ["pl", "PL"]];
  const CLASSES = { Barbarian: "Bárbaro", Bard: "Bardo", Cleric: "Clérigo", Druid: "Druida", Fighter: "Guerreiro", Monk: "Monge", Paladin: "Paladino", Ranger: "Patrulheiro", Rogue: "Ladino", Sorcerer: "Feiticeiro", Warlock: "Bruxo", Wizard: "Mago" };
  const nz = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
  const mod = (v) => Math.floor((num(v, 10) - 10) / 2), fm = (n) => (n >= 0 ? "+" : "") + n;
  const kg = (n) => (Math.round(n * 10) / 10).toLocaleString("pt-BR");
  const F = () => (P.ficha = P.ficha || {});
  const A = () => (F().atributos = F().atributos || {});
  const INV = () => (P.inventario = Array.isArray(P.inventario) ? P.inventario : []);
  const DIN = () => (P.dinheiro = P.dinheiro || { pc: 0, pp: 0, pe: 0, po: 0, pl: 0 });
  const CAR = () => (F().caracteristicas = Array.isArray(F().caracteristicas) ? F().caracteristicas : []);
  const aviso = (t, erro) => { $("#erro").innerHTML = t ? (erro ? `<span class="err">${esc(t)}</span>` : esc(t)) : ""; };

  /* ---------- salvar (agrupa as alterações por 0,6 s) ---------- */
  function agendar(campos) { pend = { ...(pend || {}), ...campos }; $("#estado").textContent = "Salvando…"; clearTimeout(timer); timer = setTimeout(enviar, 600); }
  async function enviar() {
    if (!pend) return;
    const corpo = pend; pend = null;
    try {
      const r = await nuvem.patch(`personagens?id=eq.${encodeURIComponent(id)}`, corpo);
      if (r && r[0]) P.versao = r[0].versao;
      $("#estado").textContent = "Salvo";
    } catch (e) { pend = { ...corpo, ...(pend || {}) }; $("#estado").innerHTML = `<span class="err">Não salvou: ${esc(e.message)}</span>`; }
  }
  window.addEventListener("beforeunload", () => { if (pend) enviar(); });

  /* ---------- carregar ---------- */
  async function carregar() {
    const r = await nuvem.get(`personagens?select=*&id=eq.${encodeURIComponent(id)}`);
    if (!r[0]) throw new Error("Personagem não encontrado ou você não tem acesso.");
    return r[0];
  }
  async function contexto() {
    const [c, m, pf] = await Promise.all([
      nuvem.get(`campanhas?select=id,nome&id=eq.${encodeURIComponent(P.campanha_id)}`),
      nuvem.get(`membros?select=papel&campanha_id=eq.${encodeURIComponent(P.campanha_id)}&usuario_id=eq.${nuvem.usuario().id}`),
      nuvem.get("perfis?select=id,nome")
    ]);
    camp = c[0] || { id: P.campanha_id, nome: "Campanha" };
    souMestre = !!(m[0] && m[0].papel === "mestre");
    const d = pf.find((x) => x.id === P.dono_id); donoNome = d ? d.nome : "";
    $("#voltar").href = souMestre ? `campanha.html?id=${encodeURIComponent(P.campanha_id)}` : "conta.html";
    $("#voltar").textContent = souMestre ? camp.nome : "Voltar";
  }

  /* ---------- desenho ---------- */
  const pctPV = () => (P.pv_max > 0 ? Math.max(0, Math.min(100, (P.pv_atual / P.pv_max) * 100)) : 0);
  const pesoTotal = () => INV().reduce((s, i) => s + num(i.qtd, 0) * num(i.peso, 0), 0);
  const capacidade = () => num(A()["for"], 10) * 7;
  const totalPO = () => { const d = DIN(); return num(d.pc, 0) / 100 + num(d.pp, 0) / 10 + num(d.pe, 0) / 2 + num(d.po, 0) + num(d.pl, 0) * 10; };

  const blocoPV = () => `<div class="row" style="align-items:flex-end;gap:16px">
      <div><div class="big" id="pv-num">${P.pv_atual}<span class="muted" style="font-size:18px"> / ${P.pv_max}</span></div><div class="muted" id="pv-temp-txt">${P.pv_temp ? `+${P.pv_temp} PV temporários` : "&nbsp;"}</div></div>
      <div class="inline"><input class="num" id="qtd" type="number" min="1" value="1" aria-label="Quantidade"><button type="button" class="danger" id="b-dano">Dano</button><button type="button" id="b-cura">Cura</button></div>
    </div>
    <div class="hp-track" style="height:9px;margin:10px 0"><div class="hp-fill ${pctPV() <= 25 ? "low" : pctPV() <= 50 ? "mid" : ""}" id="pv-barra" style="width:${pctPV()}%"></div></div>
    <div class="row" style="margin:0"><div><label>PV máximo</label><input class="num" type="number" min="0" data-col="pv_max" value="${P.pv_max}"></div><div><label>PV temporário</label><input class="num" type="number" min="0" data-col="pv_temp" value="${P.pv_temp}"></div><div><label>CA</label><input class="num" type="number" min="0" data-col="ca" value="${P.ca}"></div></div>`;

  const linhaInv = (it, i) => `<div class="row" style="margin:0 0 6px" data-i="${i}"><input style="flex:1 1 160px" data-inv="nome" value="${esc(it.nome || "")}" placeholder="Item"><input class="num" type="number" min="0" step="1" data-inv="qtd" value="${num(it.qtd, 1)}" aria-label="Quantidade"><input class="num" type="number" min="0" step="0.1" data-inv="peso" value="${num(it.peso, 0)}" aria-label="Peso em kg" title="Peso de cada unidade, em kg"><button type="button" class="small subtle" data-rm-item="${i}" aria-label="Remover item">${window.ico ? window.ico("x") : "x"}</button></div>`;

  const blocoCarga = () => { const c = capacidade(), p = pesoTotal(), pc = Math.min(100, c > 0 ? (p / c) * 100 : 0); return `<div class="hp-top"><span>Carga</span><strong id="carga-txt" ${p > c ? 'class="err"' : ""}>${kg(p)} / ${kg(c)} kg</strong></div><div class="hp-track"><div class="hp-fill ${p > c ? "low" : pc > 66 ? "mid" : ""}" id="carga-barra" style="width:${pc}%"></div></div>`; };

  const blocoAtr = () => `<div class="attrs">${ATR.map(([k, r]) => `<div class="attr"><label>${r}</label><input type="number" min="1" max="30" data-atr="${k}" value="${num(A()[k], 10)}"><div class="mod" id="mod-${k}">${fm(mod(A()[k]))}</div></div>`).join("")}</div>
    <div class="muted" style="margin-top:8px" id="prof-txt"></div>`;

  const itemCar = (c, i) => `<details class="item"><summary>${esc(c.nome)}</summary><div><div class="pre">${esc(c.desc || "")}</div><div class="row" style="margin:8px 0 0"><button type="button" class="small danger" data-rm-car="${i}">Remover</button></div></div></details>`;

  function desenhar() {
    const f = F(), outro = souMestre && P.dono_id !== nuvem.usuario().id;
    $("#ficha").innerHTML = `
      <div class="panel">
        <input id="nome" data-col="nome" value="${esc(P.nome)}" maxlength="80" style="font-family:Georgia,serif;font-size:22px;height:46px;font-weight:700" aria-label="Nome">
        <div class="muted" style="margin:6px 0 10px">${esc(camp.nome)}${donoNome ? " · jogador: " + esc(donoNome) : ""}${outro ? ' · <span class="badge">editando como mestre</span>' : ""}</div>
        <div class="row" style="margin:0">
          <div style="flex:1 1 140px"><label>Classe</label><input data-f="classe" value="${esc(f.classe || "")}" maxlength="40"></div>
          <div style="flex:1 1 140px"><label>Raça</label><input data-f="raca" value="${esc(f.raca || "")}" maxlength="40"></div>
          <div><label>Nível</label><input class="num" type="number" min="1" max="20" data-f="nivel" value="${f.nivel || ""}"></div>
          <div><label>Deslocamento (m)</label><input class="num" type="number" min="0" step="1.5" data-f="deslocamento" value="${f.deslocamento != null ? f.deslocamento : 9}"></div>
        </div>
      </div>
      <div class="panel"><h2 class="panel-title">Vida</h2><div id="bloco-pv">${blocoPV()}</div></div>
      <div class="panel"><h2 class="panel-title">Atributos</h2>${blocoAtr()}</div>
      <div class="panel"><h2 class="panel-title">Inventário</h2>
        <div id="inv">${INV().map(linhaInv).join("")}</div>
        <div class="row"><button type="button" class="small" id="add-item">Adicionar item</button></div>
        <div id="bloco-carga">${blocoCarga()}</div>
        <div class="sub">Dinheiro</div>
        <div class="row" style="margin:0">${MOEDAS.map(([k, r]) => `<div><label>${r}</label><input class="num" type="number" min="0" step="1" data-din="${k}" value="${num(DIN()[k], 0)}"></div>`).join("")}<div><label>Total em PO</label><div style="height:39px;display:flex;align-items:center;font-weight:800;color:var(--gold)" id="total-po">${totalPO().toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</div></div></div>
      </div>
      <div class="panel"><h2 class="panel-title">Habilidades</h2>
        <div id="lista-car">${CAR().length ? CAR().map(itemCar).join("") : '<span class="muted">Nenhuma habilidade ainda.</span>'}</div>
        <div class="sub">Adicionar do catálogo (SRD)</div>
        <input id="cat-q" placeholder="Buscar: fúria, ataque furtivo, rage…" autocomplete="off"><div id="cat-res" style="margin-top:6px"></div>
        <details class="item" style="margin-top:8px"><summary>Criar uma habilidade própria</summary><div>
          <input id="car-nome" maxlength="80" placeholder="Nome" style="margin-bottom:6px"><textarea id="car-desc" rows="4" placeholder="O que ela faz" style="width:100%"></textarea>
          <div class="row" style="margin:6px 0 0"><button type="button" class="small primary" id="add-car">Adicionar</button></div></div></details>
      </div>
      <div class="panel"><h2 class="panel-title">Notas</h2><textarea data-f="notas" rows="6" style="width:100%" placeholder="Anotações do personagem">${esc(f.notas || "")}</textarea></div>`;
    document.title = P.nome + " — Rastreador D&D"; profTxt();
  }
  function profTxt() { const n = num(F().nivel, 0), e = $("#prof-txt"); if (e) e.textContent = n ? `Bônus de proficiência ${fm(2 + Math.floor((Math.max(1, n) - 1) / 4))} · Iniciativa ${fm(mod(A().des))}` : `Iniciativa ${fm(mod(A().des))}`; }
  function atualizarPV() {
    $("#bloco-pv .big").innerHTML = `${P.pv_atual}<span class="muted" style="font-size:18px"> / ${P.pv_max}</span>`;
    $("#pv-temp-txt").innerHTML = P.pv_temp ? `+${P.pv_temp} PV temporários` : "&nbsp;";
    const b = $("#pv-barra"); b.style.width = pctPV() + "%"; b.className = "hp-fill " + (pctPV() <= 25 ? "low" : pctPV() <= 50 ? "mid" : "");
  }
  const atualizarCarga = () => { $("#bloco-carga").innerHTML = blocoCarga(); };

  /* ---------- edições ---------- */
  function mudarPV(dano) {
    const n = Math.max(1, Math.floor(num($("#qtd").value, 1)));
    if (dano) { const abs = Math.min(P.pv_temp || 0, n); P.pv_temp = (P.pv_temp || 0) - abs; P.pv_atual = Math.max(0, P.pv_atual - (n - abs)); }
    else P.pv_atual = Math.min(P.pv_max, P.pv_atual + n);
    atualizarPV(); const pv = $("#bloco-pv").querySelector('[data-col="pv_temp"]'); if (pv) pv.value = P.pv_temp;
    agendar({ pv_atual: P.pv_atual, pv_temp: P.pv_temp });
  }

  document.addEventListener("input", (e) => {
    const t = e.target; if (!P) return;
    if (t.dataset.col) {
      const col = t.dataset.col, v = col === "nome" ? t.value : Math.max(0, Math.floor(num(t.value, 0)));
      if (col === "nome" && !v.trim()) return;
      P[col] = v; if (col === "pv_max") P.pv_atual = Math.min(P.pv_atual, P.pv_max);
      atualizarPV(); agendar(col === "pv_max" ? { pv_max: P.pv_max, pv_atual: P.pv_atual } : { [col]: v }); return;
    }
    if (t.dataset.f) { const k = t.dataset.f; F()[k] = ["nivel", "deslocamento"].includes(k) ? (t.value === "" ? null : num(t.value, 0)) : t.value; if (k === "nivel") profTxt(); agendar({ ficha: P.ficha }); return; }
    if (t.dataset.atr) { const k = t.dataset.atr; A()[k] = num(t.value, 10); $("#mod-" + k).textContent = fm(mod(A()[k])); if (k === "for") atualizarCarga(); profTxt(); agendar({ ficha: P.ficha }); return; }
    if (t.dataset.inv) { const i = +t.closest("[data-i]").dataset.i, k = t.dataset.inv; INV()[i][k] = k === "nome" ? t.value : num(t.value, 0); atualizarCarga(); agendar({ inventario: P.inventario }); return; }
    if (t.dataset.din) { DIN()[t.dataset.din] = Math.max(0, Math.floor(num(t.value, 0))); $("#total-po").textContent = totalPO().toLocaleString("pt-BR", { maximumFractionDigits: 2 }); agendar({ dinheiro: P.dinheiro }); return; }
    if (t.id === "cat-q") return buscarCatalogo(t.value);
  });

  document.addEventListener("click", (e) => {
    const t = e.target, c = (s) => t.closest(s); if (!P) return;
    let b;
    if (c("#b-dano")) return mudarPV(true);
    if (c("#b-cura")) return mudarPV(false);
    if (c("#add-item")) { INV().push({ nome: "", qtd: 1, peso: 0 }); $("#inv").insertAdjacentHTML("beforeend", linhaInv(INV()[INV().length - 1], INV().length - 1)); $("#inv").lastElementChild.querySelector("input").focus(); agendar({ inventario: P.inventario }); return; }
    if ((b = c("[data-rm-item]"))) { INV().splice(+b.dataset.rmItem, 1); $("#inv").innerHTML = INV().map(linhaInv).join(""); atualizarCarga(); agendar({ inventario: P.inventario }); return; }
    if ((b = c("[data-rm-car]"))) { const i = +b.dataset.rmCar; if (!confirm(`Remover “${CAR()[i].nome}” da ficha?`)) return; CAR().splice(i, 1); $("#lista-car").innerHTML = CAR().length ? CAR().map(itemCar).join("") : '<span class="muted">Nenhuma habilidade ainda.</span>'; agendar({ ficha: P.ficha }); return; }
    if (c("#add-car")) { const nome = $("#car-nome").value.trim(); if (!nome) return; adicionarCar({ nome, desc: $("#car-desc").value }); $("#car-nome").value = ""; $("#car-desc").value = ""; return; }
    if ((b = c("[data-cat]"))) { const r = (catalogo || {}).achados[+b.dataset.cat]; if (r) { adicionarCar({ nome: r.titulo, desc: r.desc, cf: r.chave }); $("#cat-q").value = ""; $("#cat-res").innerHTML = ""; } return; }
  });

  function adicionarCar(c) {
    if (CAR().some((x) => x.nome === c.nome)) { aviso(`Você já tem “${c.nome}”.`, true); return; }
    aviso(""); CAR().push(c);
    $("#lista-car").innerHTML = CAR().map(itemCar).join("");
    agendar({ ficha: P.ficha });
  }

  /* ---------- catálogo de habilidades (dados do próprio site) ---------- */
  async function buscarCatalogo(q) {
    const box = $("#cat-res"); q = nz(q.trim());
    if (q.length < 2) { box.innerHTML = ""; return; }
    if (!catalogo) {
      box.innerHTML = '<span class="muted">Carregando catálogo…</span>';
      try {
        const [a, b] = await Promise.all([fetch("dados/habilidades.json").then((r) => r.json()), fetch("dados/habilidades-pt.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}))]);
        catalogo = { itens: a.filter((f) => f.e === "2014"), pt: b, achados: [] };
      } catch (_) { box.innerHTML = '<span class="err">Não consegui carregar o catálogo.</span>'; return; }
    }
    const ws = q.split(/\s+/);
    catalogo.achados = catalogo.itens.filter((f) => { const h = nz(`${f.n} ${f.p} ${CLASSES[f.u || f.c] || ""} ${f.u || f.c}`); return ws.every((w) => h.includes(w)); }).slice(0, 8).map((f) => {
      const chave = `${f.e}|${f.c}|${f.n}`;
      return { titulo: f.p || f.n, sub: `${CLASSES[f.u || f.c] || f.u || f.c}${f.u ? " (" + f.c + ")" : ""}${f.l && f.l.length ? " · nível " + f.l[0] : ""}`, chave, desc: String(catalogo.pt[chave] || f.d).replace(/\r/g, "").replace(/^\s*#{1,6}\s*(.+)$/gm, "$1").replace(/^\s*[*-]\s+/gm, "• ").replace(/[*_]+/g, "").replace(/\n{3,}/g, "\n\n").trim() };
    });
    box.innerHTML = catalogo.achados.length ? catalogo.achados.map((r, i) => `<div class="res" data-cat="${i}" style="cursor:pointer"><span><b>${esc(r.titulo)}</b> <span class="muted">· ${esc(r.sub)}</span></span><span class="small">Adicionar</span></div>`).join("") : '<span class="muted">Nada encontrado.</span>';
  }

  /* ---------- início ---------- */
  (async () => {
    try { await nuvem.retornoDoLink(); } catch (_) {}
    if (!nuvem.usuario() || !id) { location.replace("conta.html"); return; }
    try { P = await carregar(); await contexto(); desenhar(); } catch (e) { aviso(e.message, true); return; }
    nuvem.observar(async () => {
      if (pend) return;
      const a = document.activeElement; if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
      const r = await carregar();
      if (r.versao > P.versao) { P = r; desenhar(); $("#estado").textContent = "Atualizado"; }
    }, 5000);
  })();
})();
