/* Painel "Atacar" da iniciativa: escolher quem ataca, com qual ataque e contra quem; rolar o ataque contra a CA, rolar o dano e aplicar ao alvo.
   Regras de 2014: 1 natural em d20 sempre erra e 20 natural sempre acerta (e é crítico); vantagem/desvantagem rolam dois d20; no crítico
   os dados de dano são rolados em dobro e os modificadores não. Fontes dos ataques: criaturas do bestiário (acoes), personagens da campanha
   (ficha.ataques) ou ataque manual (bônus e expressão de dano, ex.: 1d8+3). Funciona para o mestre e para o jogador no próprio aparelho. */
(() => {
  "use strict";
  const aleatorioPadrao = () => (window.crypto && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 : Math.random());
  const d = (faces, rng) => 1 + Math.floor(rng() * faces);
  const num = (v, p = 0) => (Number.isFinite(Number(v)) ? Number(v) : p);

  /* "2d6+3", "1d8", "1d6+1d4+2", "5" -> [{n,f,b,t}] (o fixo soma na primeira componente) ou null se for inválida */
  function parseExpressao(texto) {
    const t = String(texto || "").replace(/\s+/g, "").toLowerCase();
    if (!t || !/^[+-]?(\d+d\d+|\d+)([+-](\d+d\d+|\d+))*$/.test(t)) return null;
    const partes = [], fixo = { v: 0 };
    for (const tok of t.split(/(?=[+-])/)) {
      const m = tok.match(/^([+-]?)(\d+)d(\d+)$/);
      if (m) { if (m[1] === "-") return null; const n = +m[2], f = +m[3]; if (n < 1 || n > 50 || f < 2 || f > 1000) return null; partes.push({ n, f, b: 0, t: "" }); }
      else { const v = tok.startsWith("-") ? -Math.abs(+tok) : Math.abs(+tok.replace("+", "")); fixo.v += v; }
    }
    if (!partes.length) partes.push({ n: 0, f: 0, b: fixo.v, t: "" }); else partes[0].b = fixo.v;
    return partes;
  }

  /* d20 (com vantagem ou desvantagem) + bônus contra a CA do alvo */
  function rolarAtaque({ bonus = 0, modo = "normal", ca = null, rng = aleatorioPadrao } = {}) {
    const dados = [d(20, rng)]; if (modo === "vantagem" || modo === "desvantagem") dados.push(d(20, rng));
    const nat = modo === "vantagem" ? Math.max(...dados) : modo === "desvantagem" ? Math.min(...dados) : dados[0], total = nat + num(bonus);
    const resultado = nat === 20 ? "critico" : nat === 1 ? "falha-critica" : ca == null ? "sem-alvo" : total >= ca ? "acerto" : "erro";
    return { dados, nat, bonus: num(bonus), total, ca, modo, resultado, acertou: resultado === "critico" || resultado === "acerto" };
  }

  /* Dano: componentes [{n,f,b,t}]. Crítico dobra os dados (não os modificadores). `metade` vale para salvaguarda bem-sucedida ou resistência (arredonda para baixo). */
  function rolarDano(partes, { critico = false, metade = false, rng = aleatorioPadrao } = {}) {
    let total = 0; const detalhe = [];
    for (const p of partes || []) {
      const qtd = (critico ? 2 : 1) * num(p.n), rolls = []; for (let i = 0; i < qtd; i++) rolls.push(d(num(p.f), rng));
      const sub = rolls.reduce((s, x) => s + x, 0) + num(p.b); total += sub; detalhe.push({ rolls, b: num(p.b), tipo: p.t || "", sub });
    }
    total = Math.max(0, total); const bruto = total; if (metade) total = Math.floor(total / 2);
    return { bruto, total, detalhe, critico: !!critico, metade: !!metade };
  }
  const descreverDano = (r) => r.detalhe.map((x) => `${x.rolls.length ? "[" + x.rolls.join("+") + "]" : ""}${x.b ? (x.b > 0 && x.rolls.length ? "+" : "") + x.b : ""}${x.tipo ? " " + x.tipo : ""}`.trim()).join(" + ") + (r.critico ? " (crítico: dados em dobro)" : "") + (r.metade ? " (metade)" : "");
  const textoAtaque = (a) => `${a.nat}${a.dados.length > 1 ? " (" + a.dados.join(", ") + ", " + (a.modo === "vantagem" ? "vantagem" : "desvantagem") + ")" : ""} ${a.bonus >= 0 ? "+" : "-"} ${Math.abs(a.bonus)} = ${a.total}`;
  const ROTULO = { critico: "CRÍTICO! Acertou", "falha-critica": "Falha crítica: errou", acerto: "Acertou", erro: "Errou", "sem-alvo": "Sem alvo (sem CA para comparar)" };

  window.ATAQUE_INI = { parseExpressao, rolarAtaque, rolarDano, descreverDano, textoAtaque, ROTULO };

  /* ---------------- interface ---------------- */
  const raiz = typeof document !== "undefined" && document.getElementById("painel-ataque");
  if (!raiz || !window.__ini) return;
  const $ = (s) => raiz.querySelector(s), esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let ataques = [], ultimo = null;                       // ultimo = { atq, dano, alvoId, atacanteId }
  const lista = () => window.__ini.list();
  function fontesDe(c) {
    const fx = [];
    if (c && c.key && window.__ini.acoesDe) fx.push(...window.__ini.acoesDe(c.key));
    if (c && c.pid && window.__ini.ataquesDe) fx.push(...window.__ini.ataquesDe(c.pid));
    return fx;
  }
  function desenhar() {
    const l = lista(), corpo = $("#atk-corpo");
    if (l.length < 1) { corpo.innerHTML = '<p class="muted">Adicione combatentes para usar os ataques.</p>'; return; }
    const sel = window.__ini.__atk || (window.__ini.__atk = {}), cur = window.__ini.atual?.();
    if (!l.some((c) => c.id === sel.atacante)) sel.atacante = cur && l.some((c) => c.id === cur) ? cur : l[0].id;
    if (!l.some((c) => c.id === sel.alvo) || sel.alvo === sel.atacante) sel.alvo = (l.find((c) => c.id !== sel.atacante) || l[0]).id;
    const atacante = l.find((c) => c.id === sel.atacante);
    ataques = fontesDe(atacante); if (sel.idx == null || sel.idx > ataques.length) sel.idx = ataques.length ? 0 : "manual";
    const manual = sel.idx === "manual" || !ataques.length;
    corpo.innerHTML = `<div class="grade2">
      <label>Quem ataca<select id="atk-atacante">${l.map((c) => `<option value="${esc(c.id)}" ${c.id === sel.atacante ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
      <label>Contra<select id="atk-alvo">${l.map((c) => `<option value="${esc(c.id)}" ${c.id === sel.alvo ? "selected" : ""}>${esc(c.name)} (CA ${num(c.ac)}, PV ${num(c.hp)}/${num(c.maxHp)})</option>`).join("")}</select></label>
      <label>Ataque<select id="atk-ataque">${ataques.map((a, i) => `<option value="${i}" ${sel.idx === i ? "selected" : ""}>${esc(a.nome)}${a.hit != null ? " (" + (a.hit >= 0 ? "+" : "") + a.hit + ")" : ""}</option>`).join("")}<option value="manual" ${manual ? "selected" : ""}>Manual…</option></select></label>
      <label>Jogada<select id="atk-modo"><option value="normal" ${sel.modo !== "vantagem" && sel.modo !== "desvantagem" ? "selected" : ""}>Normal</option><option value="vantagem" ${sel.modo === "vantagem" ? "selected" : ""}>Com vantagem</option><option value="desvantagem" ${sel.modo === "desvantagem" ? "selected" : ""}>Com desvantagem</option></select></label>
    </div>
    ${manual ? `<div class="row"><label>Bônus de ataque<input id="atk-bonus" class="num" type="number" step="1" value="${num(sel.bonus, 0)}"></label><label>Dano (ex.: 1d8+3)<input id="atk-dano" maxlength="40" value="${esc(sel.dano || "1d6")}"></label></div>` : ""}
    <div class="row"><button type="button" id="atk-rolar" class="primary">Rolar ataque e dano</button><button type="button" id="atk-so-ataque" class="small">Só o ataque</button><button type="button" id="atk-so-dano" class="small">Só o dano</button><label class="inline"><input type="checkbox" id="atk-metade" style="width:auto;height:auto"> Metade do dano</label></div>
    <div id="atk-res" role="status" aria-live="polite"></div>`;
  }
  const escolhido = () => {
    const sel = window.__ini.__atk, l = lista(), atacante = l.find((c) => c.id === sel.atacante), alvo = l.find((c) => c.id === sel.alvo);
    const manual = sel.idx === "manual" || !ataques.length;
    let a;
    if (manual) { const partes = window.ATAQUE_INI.parseExpressao($("#atk-dano")?.value || sel.dano); a = { nome: "Ataque manual", hit: num($("#atk-bonus")?.value, num(sel.bonus, 0)), dmg: partes }; sel.dano = $("#atk-dano")?.value ?? sel.dano; sel.bonus = a.hit; }
    else a = ataques[sel.idx];
    return { atacante, alvo, a, modo: $("#atk-modo")?.value || "normal", metade: !!$("#atk-metade")?.checked };
  };
  function rolar(parte) {
    const { atacante, alvo, a, modo, metade } = escolhido(), res = $("#atk-res");
    if (!atacante || !alvo || !a) return;
    const A = window.ATAQUE_INI; let atq = null, dano = null, linhas = [];
    if (parte !== "dano") {
      if (a.hit == null) { res.innerHTML = '<span class="err">Este ataque não tem bônus de acerto; use "Só o dano".</span>'; return; }
      atq = A.rolarAtaque({ bonus: a.hit, modo, ca: num(alvo.ac) });
      linhas.push(`<p><b>Ataque de ${esc(atacante.name)} (${esc(a.nome)}):</b> ${esc(A.textoAtaque(atq))} contra CA ${num(alvo.ac)} → <b>${esc(A.ROTULO[atq.resultado])}</b></p>`);
    }
    if (parte !== "ataque") {
      if (!a.dmg || !a.dmg.length) { if (!atq) { res.innerHTML = '<span class="err">Dano inválido. Use algo como 1d8+3.</span>'; return; } }
      else if (parte === "dano" || (atq && atq.acertou)) {
        dano = A.rolarDano(a.dmg, { critico: !!atq && atq.resultado === "critico", metade });
        linhas.push(`<p><b>Dano:</b> ${dano.total}${dano.metade ? " (de " + dano.bruto + ")" : ""} <span class="muted">${esc(A.descreverDano(dano))}</span></p>`);
      } else linhas.push('<p class="muted">Errou: sem dano.</p>');
    }
    ultimo = { atq, dano, alvoId: alvo.id, atacanteId: atacante.id };
    if (dano && dano.total >= 0) linhas.push(`<div class="row"><button type="button" id="atk-aplicar" class="danger">Aplicar ${dano.total} de dano em ${esc(alvo.name)}</button><span class="muted">PV ${num(alvo.hp)} → ${Math.max(0, num(alvo.hp) - dano.total)}</span></div>`);
    res.innerHTML = linhas.join("");
  }
  raiz.addEventListener("change", (e) => {
    const sel = window.__ini.__atk || (window.__ini.__atk = {});
    if (e.target.id === "atk-atacante") { sel.atacante = e.target.value; sel.idx = null; desenhar(); }
    else if (e.target.id === "atk-alvo") sel.alvo = e.target.value;
    else if (e.target.id === "atk-ataque") { sel.idx = e.target.value === "manual" ? "manual" : +e.target.value; desenhar(); }
    else if (e.target.id === "atk-modo") sel.modo = e.target.value;
  });
  raiz.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.id === "atk-rolar") rolar("tudo"); else if (b.id === "atk-so-ataque") rolar("ataque"); else if (b.id === "atk-so-dano") rolar("dano");
    else if (b.id === "atk-aplicar" && ultimo && ultimo.dano) {
      const U = ultimo; ultimo = null;                                   // um clique aplica uma vez só
      window.__ini.aplicarDano(U.alvoId, U.dano.total, U.atacanteId);
      const alvo = lista().find((c) => c.id === U.alvoId);
      $("#atk-res").insertAdjacentHTML("beforeend", `<p><b>Dano aplicado.</b> ${esc(alvo ? alvo.name : "Alvo")}: PV ${alvo ? num(alvo.hp) : "?"}/${alvo ? num(alvo.maxHp) : "?"}.</p>`);
      b.disabled = true;
    }
  });
  window.__ini.aoAlterar?.(() => { if (!raiz.hidden && !document.activeElement?.closest?.("#painel-ataque")) desenhar(); });
  desenhar();
})();
