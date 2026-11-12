/* Painel "Atacar" da iniciativa: escolher quem ataca, com qual ataque ou magia e contra quem; rolar o ataque contra a CA (ou a salvaguarda do alvo contra a CD),
   rolar o dano e aplicar ao alvo. Regras de 2014: 1 natural em d20 sempre erra e 20 natural sempre acerta (e é crítico); vantagem/desvantagem rolam dois d20;
   no crítico os dados de dano são rolados em dobro e os modificadores não; salvaguarda bem-sucedida pode dar metade do dano.
   Fontes: criaturas do bestiário (acoes), personagens da campanha (ficha.ataques e ficha.magias) ou ataque manual (bônus e expressão, ex.: 1d8+3).
   MODO TREINO: não gasta nada (espaços de magia, recursos). Para jogador e para quem não está numa campanha como mestre é sempre treino; o mestre pode ligar ou desligar.
   Fora do treino (só mestre), conjurar com um personagem da campanha gasta um espaço de magia na ficha dele. O dano aplicado só altera o combate do aparelho. */
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
  /* salvaguarda do alvo contra a CD (sem acerto/falha automáticos, regra de 2014 para salvaguardas): passou se total >= CD */
  function rolarSalvaguarda({ bonus = 0, cd = 10, modo = "normal", rng = aleatorioPadrao } = {}) {
    const dados = [d(20, rng)]; if (modo === "vantagem" || modo === "desvantagem") dados.push(d(20, rng));
    const nat = modo === "vantagem" ? Math.max(...dados) : modo === "desvantagem" ? Math.min(...dados) : dados[0], total = nat + num(bonus);
    return { dados, nat, bonus: num(bonus), total, cd, modo, passou: total >= cd };
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
  const textoD20 = (a) => `${a.nat}${a.dados.length > 1 ? " (" + a.dados.join(", ") + ", " + (a.modo === "vantagem" ? "vantagem" : "desvantagem") + ")" : ""} ${a.bonus >= 0 ? "+" : "-"} ${Math.abs(a.bonus)} = ${a.total}`;
  const ROTULO = { critico: "CRÍTICO! Acertou", "falha-critica": "Falha crítica: errou", acerto: "Acertou", erro: "Errou", "sem-alvo": "Sem alvo (sem CA para comparar)" };

  /* ---------- magias: leitura do texto (catálogo em português) para sugerir ataque/CD/dano; o jogador pode editar o dano sugerido ---------- */
  const ATR_SALVA = { "força": "for", "destreza": "des", "constituição": "con", "constituicao": "con", "inteligência": "int", "inteligencia": "int", "sabedoria": "sab", "carisma": "car" };
  const NOME_ATR = { for: "Força", des: "Destreza", con: "Constituição", int: "Inteligência", sab: "Sabedoria", car: "Carisma" };
  const semAcento = (x) => String(x || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  /* o catálogo escreve o tipo de dano por adjetivo: "dano ígneo" = fogo, "dano gélido" = frio, "dano energético" = energia (força) */
  const TIPO_POR_ADJETIVO = { igneo: "fogo", gelido: "frio", energetico: "energia", acido: "ácido", contundente: "contundente", cortante: "cortante", eletrico: "elétrico", necrotico: "necrótico", perfurante: "perfurante", psiquico: "psíquico", radiante: "radiante", trovejante: "trovejante", venenoso: "venenoso", fogo: "fogo", frio: "frio", veneno: "veneno", forca: "energia" };
  function analisarMagia(m) {
    const bruto = String((m && m.d) || "").replace(/\*+/g, ""), plano = bruto.replace(/(\d+d1)[Oo](?![A-Za-z])/g, "$10");   // o catálogo tem "1d1O" (letra O) no lugar de 1d10
    const salva = plano.match(/salvaguarda de (For[çc]a|Destreza|Constitui[çc][ãa]o|Intelig[êe]ncia|Sabedoria|Carisma)/i);
    const ataque = /ataque (?:m[áa]gico|com magia|de magia)/i.test(plano);
    const causaDano = /dano/i.test(plano);                                         // curas e magias sem dano não sugerem dado
    const dado = causaDano ? plano.match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/) : null;
    const tipoDano = [...plano.matchAll(/dano (?:de |do tipo )?([A-Za-zÀ-ÿ]+)/gi)].map((x) => TIPO_POR_ADJETIVO[semAcento(x[1])]).find(Boolean) || "";
    const circ = causaDano ? plano.match(/C[íi]rculos? Superiores?[\s\S]*?(?:aumenta|aumentam)[^.]*?(\d+)d(\d+)/i) : null;
    return {
      tipo: ataque ? "ataque" : salva ? "salvaguarda" : "livre",
      atributoSalva: salva ? ATR_SALVA[salva[1].toLowerCase()] : null,
      metadeNaSalva: /metade (?:do|desse|dos)/i.test(plano),
      dado: dado ? { n: +dado[1], f: +dado[2], b: dado[3] ? +dado[3] : 0 } : null, tipoDano,
      porCirculo: circ ? { n: +circ[1], f: +circ[2] } : null,
      truqueEscala: Number(m && m.l) === 0 && /5[º°o] n[íi]vel/i.test(plano) && !!dado,
    };
  }
  /* dano sugerido: dado base (truque cresce nos níveis 5, 11 e 17; magia sobe com o espaço usado) -> expressão "8d6" */
  function danoSugerido(m, an, { circulo = null, nivelTotal = 1 } = {}) {
    if (!an.dado) return "";
    let n = an.dado.n;
    if (an.truqueEscala) n *= nivelTotal >= 17 ? 4 : nivelTotal >= 11 ? 3 : nivelTotal >= 5 ? 2 : 1;
    const extra = an.porCirculo && circulo && circulo > Number(m.l) ? (circulo - Number(m.l)) : 0;
    const partes = [`${n}d${an.dado.f}${an.dado.b ? "+" + an.dado.b : ""}`]; if (extra && an.porCirculo) partes.push(`${extra * an.porCirculo.n}d${an.porCirculo.f}`);
    return partes.join("+");
  }
  /* bônus de ataque e CD de magia do conjurador, por classe (2014: 8 + proficiência + modificador; ataque = proficiência + modificador) */
  function estatisticasMagia(f, m, R = window.REGRAS) {
    if (!f || !R) return null;
    const hs = R.conjuracao(f.classes || []).habilidades, cid = m.classeConj || ((m.classes && m.classes[0]) ? m.classes[0].replace(/^./, (c) => c.toUpperCase()) : "");
    const h = hs.find((x) => x.id === cid) || hs[0]; if (!h) return null;
    const nivel = R.nivelTotal(f.classes || []) || 1, pb = R.prof(nivel), mod = R.mod(R.atributoEf(f, h.atr)), extra = R.bonusTemp(f, "cdMagia");
    return { atr: h.atr, classe: h.classe, nivelTotal: nivel, ataque: pb + mod + extra, cd: 8 + pb + mod + extra };
  }
  /* magias que o personagem pode conjurar: truques, preparadas, sempre preparadas, conhecidas de classes que conhecem (Bardo etc.) e concedidas; inativas ficam de fora */
  function conjuraveis(f, MJ = window.MAGIAS_JOGO) {
    return ((f && f.magias) || []).filter((m) => m.ativa !== false && (Number(m.l) === 0 || m.prep || m.semprePreparada || m.fonte === "mestre" || m.fonte === "raca" || m.origem === "Raça" || (MJ && MJ.tipoClasse(m.classeConj || "") === "known")));
  }

  window.ATAQUE_INI = { parseExpressao, rolarAtaque, rolarSalvaguarda, rolarDano, descreverDano, textoAtaque: textoD20, ROTULO, analisarMagia, danoSugerido, estatisticasMagia, conjuraveis, NOME_ATR };

  /* ---------------- interface ---------------- */
  const raiz = typeof document !== "undefined" && document.getElementById("painel-ataque");
  if (!raiz || !window.__ini) return;
  const $ = (s) => raiz.querySelector(s), esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let fontes = [], ultimo = null, gastando = false;
  const lista = () => window.__ini.list();
  const estado = () => window.__ini.__atk || (window.__ini.__atk = {});
  const papel = () => (window.__ini.papel ? window.__ini.papel() : "sem-campanha");
  const treinoTravado = () => papel() !== "mestre";                       // jogador e quem não está numa campanha como mestre: sempre treino
  const emTreino = () => treinoTravado() || !!estado().treino;
  function fontesDe(c) {
    const fx = [];
    if (c && c.key && window.__ini.acoesDe) fx.push(...window.__ini.acoesDe(c.key).map((a) => ({ ...a, tipo: "ataque" })));
    if (c && c.pid && window.__ini.ataquesDe) fx.push(...window.__ini.ataquesDe(c.pid).map((a) => ({ ...a, tipo: "ataque" })));
    if (c && c.pid && window.__ini.fichaDe) {
      const f = window.__ini.fichaDe(c.pid);
      for (const m of conjuraveis(f)) { const an = analisarMagia(m), st = estatisticasMagia(f, m); if (st) fx.push({ tipo: "magia", nome: m.n, m, an, st, f }); }
    }
    return fx;
  }
  const rotuloFonte = (a) => a.tipo === "magia" ? `Magia: ${a.nome} (${Number(a.m.l) ? a.m.l + "º círculo" : "truque"})` : `${a.nome}${a.hit != null ? " (" + (a.hit >= 0 ? "+" : "") + a.hit + ")" : ""}`;
  function circulosDe(a) { const l = Number(a.m.l), out = []; for (let c = Math.max(1, l); c <= 9; c++) out.push(c); return l === 0 ? [] : out; }
  function desenhar() {
    const l = lista(), corpo = $("#atk-corpo");
    if (l.length < 1) { corpo.innerHTML = '<p class="muted">Adicione combatentes para usar os ataques.</p>'; return; }
    const sel = estado(), cur = window.__ini.atual?.();
    if (!l.some((c) => c.id === sel.atacante)) sel.atacante = cur && l.some((c) => c.id === cur) ? cur : l[0].id;
    if (!l.some((c) => c.id === sel.alvo) || (sel.alvo === sel.atacante && l.length > 1)) sel.alvo = (l.find((c) => c.id !== sel.atacante) || l[0]).id;
    const atacante = l.find((c) => c.id === sel.atacante);
    fontes = fontesDe(atacante); if (sel.idx == null || (sel.idx !== "manual" && sel.idx >= fontes.length)) sel.idx = fontes.length ? 0 : "manual";
    const manual = sel.idx === "manual", fonte = manual ? null : fontes[sel.idx], magia = fonte && fonte.tipo === "magia";
    let extra = "";
    if (manual) extra = `<div class="row"><label>Bônus de ataque<input id="atk-bonus" class="num" type="number" step="1" value="${num(sel.bonus, 0)}"></label><label>Dano (ex.: 1d8+3)<input id="atk-dano" maxlength="40" value="${esc(sel.dano || "1d6")}"></label></div>`;
    if (magia) {
      const an = fonte.an, circ = sel.circulo && sel.circulo >= Number(fonte.m.l) ? sel.circulo : (Number(fonte.m.l) || null), circulos = circulosDe(fonte);
      const sugestao = danoSugerido(fonte.m, an, { circulo: circ, nivelTotal: fonte.st.nivelTotal }), valor = sel.danoMagia != null && sel.danoMagiaDe === fonte.m.en + "|" + circ ? sel.danoMagia : sugestao;
      const regra = an.tipo === "ataque" ? `Ataque de magia <b>${fonte.st.ataque >= 0 ? "+" : ""}${fonte.st.ataque}</b>` : an.tipo === "salvaguarda" ? `CD <b>${fonte.st.cd}</b> (salvaguarda de ${NOME_ATR[an.atributoSalva]})${an.metadeNaSalva ? ", metade do dano se passar" : ""}` : "Sem jogada de ataque nem salvaguarda: só o dano sugerido";
      extra = `<div class="row">${circulos.length ? `<label>Espaço de magia<select id="atk-circulo">${circulos.map((c) => `<option value="${c}" ${c === circ ? "selected" : ""}>${c}º círculo</option>`).join("")}</select></label>` : ""}<label>Dano (sugerido pelo texto, edite se precisar)<input id="atk-dano-magia" maxlength="40" value="${esc(valor)}"></label>${an.tipo === "salvaguarda" ? `<label>Bônus de salvaguarda do alvo<input id="atk-salva-bonus" class="num" type="number" step="1" value="${num(sel.salvaBonus, 0)}"></label>` : ""}</div><p class="muted">${regra}. ${an.tipoDano ? "Dano " + esc(an.tipoDano) + ". " : ""}${emTreino() ? "Modo treino: nenhum espaço é gasto." : Number(fonte.m.l) ? "Conjurar gasta um espaço de magia da ficha." : ""}</p>`;
    }
    corpo.innerHTML = `<div class="grade2">
      <label>Quem ataca<select id="atk-atacante">${l.map((c) => `<option value="${esc(c.id)}" ${c.id === sel.atacante ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
      <label>Contra<select id="atk-alvo">${l.map((c) => `<option value="${esc(c.id)}" ${c.id === sel.alvo ? "selected" : ""}>${esc(c.name)} (CA ${num(c.ac)}, PV ${num(c.hp)}/${num(c.maxHp)})</option>`).join("")}</select></label>
      <label>Ataque ou magia<select id="atk-ataque">${fontes.map((a, i) => `<option value="${i}" ${sel.idx === i ? "selected" : ""}>${esc(rotuloFonte(a))}</option>`).join("")}<option value="manual" ${manual ? "selected" : ""}>Manual…</option></select></label>
      <label>Jogada<select id="atk-modo"><option value="normal" ${sel.modo !== "vantagem" && sel.modo !== "desvantagem" ? "selected" : ""}>Normal</option><option value="vantagem" ${sel.modo === "vantagem" ? "selected" : ""}>Com vantagem</option><option value="desvantagem" ${sel.modo === "desvantagem" ? "selected" : ""}>Com desvantagem</option></select></label>
    </div>
    <label class="inline" style="margin:4px 0"><input type="checkbox" id="atk-treino" style="width:auto;height:auto" ${emTreino() ? "checked" : ""} ${treinoTravado() ? "disabled" : ""}> Modo treino: não gasta nada${treinoTravado() ? " (sempre ligado fora da campanha como mestre)" : ""}</label>
    ${extra}
    <div class="row"><button type="button" id="atk-rolar" class="primary">${magia ? "Conjurar e rolar" : "Rolar ataque e dano"}</button>${magia ? "" : '<button type="button" id="atk-so-ataque" class="small">Só o ataque</button>'}<button type="button" id="atk-so-dano" class="small">Só o dano</button><label class="inline"><input type="checkbox" id="atk-metade" style="width:auto;height:auto"> Metade do dano</label></div>
    <div id="atk-res" role="status" aria-live="polite"></div>`;
  }
  function escolhido() {
    const sel = estado(), l = lista(), atacante = l.find((c) => c.id === sel.atacante), alvo = l.find((c) => c.id === sel.alvo), manual = sel.idx === "manual";
    const base = { atacante, alvo, modo: $("#atk-modo")?.value || "normal", metade: !!$("#atk-metade")?.checked };
    if (manual) { const partes = parseExpressao($("#atk-dano")?.value || sel.dano); sel.dano = $("#atk-dano")?.value ?? sel.dano; sel.bonus = num($("#atk-bonus")?.value, num(sel.bonus, 0)); return { ...base, a: { nome: "Ataque manual", tipo: "ataque", hit: sel.bonus, dmg: partes } }; }
    return { ...base, a: fontes[sel.idx] };
  }
  async function gastarEspacoSeNecessario(atacante, a, circulo) {
    if (emTreino() || a.tipo !== "magia" || !Number(a.m.l) || !atacante.pid || !window.__ini.gastarEspaco) return { ok: true, msg: "" };
    return window.__ini.gastarEspaco(atacante.pid, circulo);
  }
  async function rolar(parte) {
    if (gastando) return; gastando = true;
    try {
      const { atacante, alvo, a, modo, metade } = escolhido(), res = $("#atk-res");
      if (!atacante || !alvo || !a) return;
      let atq = null, dano = null, salva = null, linhas = [], partes = a.dmg, critico = false, metadeFinal = metade;
      if (a.tipo === "magia") {
        const sel = estado(), circulo = Number($("#atk-circulo")?.value) || Number(a.m.l) || null, expr = $("#atk-dano-magia")?.value || "";
        sel.circulo = circulo; sel.danoMagia = expr; sel.danoMagiaDe = a.m.en + "|" + circulo; sel.salvaBonus = num($("#atk-salva-bonus")?.value, 0);
        partes = expr.trim() ? parseExpressao(expr) : null;
        if (parte !== "dano") {
          if (expr.trim() && !partes) { res.innerHTML = '<span class="err">Dano inválido. Use algo como 8d6.</span>'; return; }
          const g = await gastarEspacoSeNecessario(atacante, a, circulo);
          if (!g.ok) { res.innerHTML = `<span class="err">${esc(g.msg)}</span>`; return; }
          if (g.msg) linhas.push(`<p class="muted">${esc(g.msg)}</p>`);
        }
        if (parte !== "dano" && a.an.tipo === "ataque") { atq = rolarAtaque({ bonus: a.st.ataque, modo, ca: num(alvo.ac) }); critico = atq.resultado === "critico"; linhas.push(`<p><b>${esc(atacante.name)} conjura ${esc(a.nome)}:</b> ${esc(textoD20(atq))} contra CA ${num(alvo.ac)} → <b>${esc(ROTULO[atq.resultado])}</b></p>`); }
        else if (parte !== "dano" && a.an.tipo === "salvaguarda") {
          salva = rolarSalvaguarda({ bonus: sel.salvaBonus, cd: a.st.cd, modo: "normal" });
          linhas.push(`<p><b>${esc(atacante.name)} conjura ${esc(a.nome)}</b> (CD ${a.st.cd}, ${esc(NOME_ATR[a.an.atributoSalva])}). Salvaguarda de ${esc(alvo.name)}: ${esc(textoD20(salva))} → <b>${salva.passou ? "passou" : "falhou"}</b></p>`);
          if (salva.passou) metadeFinal = a.an.metadeNaSalva ? true : "nada";
        } else if (parte !== "dano") linhas.push(`<p><b>${esc(atacante.name)} conjura ${esc(a.nome)}.</b></p>`);
        const acertou = parte === "dano" || !atq || atq.acertou;
        if (partes && partes.length && acertou && metadeFinal !== "nada") { dano = rolarDano(partes, { critico, metade: metadeFinal === true }); linhas.push(`<p><b>Dano:</b> ${dano.total}${dano.metade ? " (de " + dano.bruto + ")" : ""} <span class="muted">${esc(descreverDano(dano))}${a.an.tipoDano ? " " + esc(a.an.tipoDano) : ""}</span></p>`); }
        else if (partes && partes.length && !acertou) linhas.push('<p class="muted">Errou: sem dano.</p>');
        else if (partes && partes.length && metadeFinal === "nada") linhas.push("<p class=\"muted\">Passou na salvaguarda: sem dano.</p>");
      } else {
        if (parte !== "dano") {
          if (a.hit == null) { res.innerHTML = '<span class="err">Este ataque não tem bônus de acerto; use "Só o dano".</span>'; return; }
          atq = rolarAtaque({ bonus: a.hit, modo, ca: num(alvo.ac) }); critico = atq.resultado === "critico";
          linhas.push(`<p><b>Ataque de ${esc(atacante.name)} (${esc(a.nome)}):</b> ${esc(textoD20(atq))} contra CA ${num(alvo.ac)} → <b>${esc(ROTULO[atq.resultado])}</b></p>`);
        }
        if (parte !== "ataque") {
          if (!partes || !partes.length) { if (!atq) { res.innerHTML = '<span class="err">Dano inválido. Use algo como 1d8+3.</span>'; return; } }
          else if (parte === "dano" || (atq && atq.acertou)) { dano = rolarDano(partes, { critico, metade }); linhas.push(`<p><b>Dano:</b> ${dano.total}${dano.metade ? " (de " + dano.bruto + ")" : ""} <span class="muted">${esc(descreverDano(dano))}</span></p>`); }
          else linhas.push('<p class="muted">Errou: sem dano.</p>');
        }
      }
      ultimo = { dano, alvoId: alvo.id, atacanteId: atacante.id };
      if (dano && dano.total >= 0) linhas.push(`<div class="row"><button type="button" id="atk-aplicar" class="danger">Aplicar ${dano.total} de dano em ${esc(alvo.name)}</button><span class="muted">PV ${num(alvo.hp)} → ${Math.max(0, num(alvo.hp) - dano.total)}</span></div>`);
      res.innerHTML = linhas.join("");
    } finally { gastando = false; }
  }
  raiz.addEventListener("change", (e) => {
    const sel = estado();
    if (e.target.id === "atk-atacante") { sel.atacante = e.target.value; sel.idx = null; sel.circulo = null; desenhar(); }
    else if (e.target.id === "atk-alvo") sel.alvo = e.target.value;
    else if (e.target.id === "atk-ataque") { sel.idx = e.target.value === "manual" ? "manual" : +e.target.value; sel.circulo = null; desenhar(); }
    else if (e.target.id === "atk-modo") sel.modo = e.target.value;
    else if (e.target.id === "atk-circulo") { sel.circulo = +e.target.value; sel.danoMagia = null; desenhar(); }
    else if (e.target.id === "atk-treino") { sel.treino = e.target.checked; desenhar(); }
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
