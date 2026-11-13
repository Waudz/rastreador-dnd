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

  /* tipos de dano em português (catálogo, bestiário e magias) -> chave do bestiário em inglês, para resistência, imunidade e vulnerabilidade */
  const semAc = (x) => String(x || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const TIPO_EN = { cortante: "slashing", perfurante: "piercing", contundente: "bludgeoning", fogo: "fire", igneo: "fire", frio: "cold", gelido: "cold", acido: "acid", eletrico: "lightning", relampago: "lightning", trovejante: "thunder", necrotico: "necrotic", psiquico: "psychic", radiante: "radiant", venenoso: "poison", veneno: "poison", energetico: "force", energia: "force", forca: "force" };
  const tipoEn = (t) => TIPO_EN[semAc(t)] || "";
  /* Dano: componentes [{n,f,b,t}]. Crítico dobra os dados (não os modificadores). `metade` vale para salvaguarda bem-sucedida ou resistência (arredonda para baixo). */
  /* defesas do alvo (2014): imunidade zera, resistência divide por 2 (arredonda para baixo), vulnerabilidade dobra; cada tipo de dano é tratado à parte, antes de "metade" */
  function rolarDano(partes, { critico = false, metade = false, defesas = null, rng = aleatorioPadrao } = {}) {
    let total = 0; const detalhe = [], ajustes = [], tem = (lista, en) => !!en && (lista || []).includes(en);
    for (const p of partes || []) {
      const qtd = (critico ? 2 : 1) * num(p.n), rolls = []; for (let i = 0; i < qtd; i++) rolls.push(d(num(p.f), rng));
      const original = rolls.reduce((s, x) => s + x, 0) + num(p.b); let sub = original, ajuste = "";
      const en = tipoEn(p.t);
      if (defesas && en) {
        if (tem(defesas.imunidades, en)) { sub = 0; ajuste = "imunidade"; }
        else { if (tem(defesas.resistencias, en)) { sub = Math.floor(sub / 2); ajuste = "resistência"; } if (tem(defesas.vulnerabilidades, en)) { sub *= 2; ajuste = ajuste ? "resistência e vulnerabilidade" : "vulnerabilidade"; } }
        if (ajuste) ajustes.push({ tipo: p.t, de: original, para: sub, ajuste });
      }
      total += sub; detalhe.push({ rolls, b: num(p.b), tipo: p.t || "", sub, ajuste });
    }
    total = Math.max(0, total); const bruto = total; if (metade) total = Math.floor(total / 2);
    return { bruto, total, detalhe, critico: !!critico, metade: !!metade, ajustes };
  }
  /* dano informado à mão (rolagem automática desligada): o total digitado vale como está */
  const danoManual = (total, critico = false) => { const t = Math.max(0, Math.floor(num(total, 0))); return { bruto: t, total: t, detalhe: [{ rolls: [], b: 0, tipo: "", sub: t, ajuste: "" }], critico: !!critico, metade: false, ajustes: [], manual: true }; };
  const rngDe = (valores) => { let i = 0; return () => ((num(valores[i++], 1) - 0.5) / 20); };   // faz d(20) devolver exatamente o número informado
  const descreverDano = (r) => r.detalhe.map((x) => `${x.rolls.length ? "[" + x.rolls.join("+") + "]" : ""}${x.b ? (x.b > 0 && x.rolls.length ? "+" : "") + x.b : ""}${x.tipo ? " " + x.tipo : ""}${x.ajuste ? " (" + x.ajuste + ")" : ""}`.trim()).join(" + ") + (r.critico ? " (crítico: dados em dobro)" : "") + (r.metade ? " (metade)" : "");
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

  window.ATAQUE_INI = { danoManual, rngDe, tipoEn, parseExpressao, rolarAtaque, rolarSalvaguarda, rolarDano, descreverDano, textoAtaque: textoD20, ROTULO, analisarMagia, danoSugerido, estatisticasMagia, conjuraveis, NOME_ATR };

  /* ---------------- interface única: faixa "Vez de ..." (com "Outras opções" para ataque manual, magias e controles avançados) ---------------- */
  const faixa = typeof document !== "undefined" && document.getElementById("acoes-da-vez");
  if (!faixa || !window.__ini) return;
  const $ = (s) => faixa.querySelector(s), esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let fontes = [], gastando = false, seq = 0, blocos = [];   // blocos: resultados recentes (cada um com o próprio Aplicar, para ataques contra alvos diferentes sem dano duplicado)
  const resultados = {};
  const lista = () => window.__ini.list();
  const estado = () => window.__ini.__atk || (window.__ini.__atk = {});
  const papel = () => (window.__ini.papel ? window.__ini.papel() : "sem-campanha");
  const treinoTravado = () => papel() !== "mestre";                       // jogador e quem não está numa campanha como mestre: sempre treino
  const D20 = () => (window.ico ? window.ico("d20") : "");               // ícone do d20 em todos os botões que rolam dados
  const auto = () => (window.__ini.rolagemAuto ? window.__ini.rolagemAuto() : true);
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
  /* quem ataca: a escolha manual (botão Atacar do cartão ou seletor) ou, sem escolha, quem está na vez */
  function atacanteAtual() {
    const l = lista(), sel = estado(), cur = window.__ini.atual?.();
    if (sel.manualAtacante && (sel.manualPara ?? null) === (cur ?? null) && l.some((c) => c.id === sel.atacante)) return l.find((c) => c.id === sel.atacante);
    return l.find((c) => c.id === cur) || null;
  }
  const alvoPadrao = (l, atk) => { const grupo = (c) => (c.kind === "Personagem" ? "p" : "m"); return (l.find((c) => c.id !== atk.id && grupo(c) !== grupo(atk) && num(c.hp) > 0) || l.find((c) => c.id !== atk.id && num(c.hp) > 0) || l.find((c) => c.id !== atk.id) || atk); };

  /* defesas e salvaguardas do alvo, vindas da ficha da criatura (bestiário) ou do personagem (campanha); sem dado conhecido, o jogador informa à mão */
  const defesasBase = (c) => (c && c.pid && window.__ini.defesasPersonagem ? window.__ini.defesasPersonagem(c.pid) : c && c.key && window.__ini.defesasDe ? window.__ini.defesasDe(c.key) : null);
  /* em fúria (2014): resistência a dano contundente, perfurante e cortante */
  const defesasDo = (c) => { const b = defesasBase(c); if (!(c && c.furia)) return b; const x = b || { resistencias: [], imunidades: [], vulnerabilidades: [], naoMagico: false }; return { ...x, resistencias: [...new Set([...(x.resistencias || []), "bludgeoning", "piercing", "slashing"])] }; };
  const salvaDo = (c, ab) => { const v = c && c.pid && window.__ini.salvaPersonagem ? window.__ini.salvaPersonagem(c.pid, ab) : c && c.key && window.__ini.salvaDe ? window.__ini.salvaDe(c.key, ab) : null; return Number.isFinite(v) ? v : null; };
  const defesasTexto = (d) => d ? [["resistência a", d.resistencias], ["imunidade a", d.imunidades], ["vulnerabilidade a", d.vulnerabilidades]].filter(([, l]) => l && l.length).map(([r, l]) => r + " " + l.join(", ")).join("; ") : "";
  function limparResultados() { for (const k of Object.keys(resultados)) delete resultados[k]; blocos = []; const r = $("#vez-res"); if (r) r.innerHTML = ""; }
  function desenharVez() {
    const l = lista(), atk = atacanteAtual();
    if (!atk || l.length < 2) { faixa.hidden = true; $("#vez-topo").innerHTML = ""; $("#vez-avancado").hidden = true; $("#vez-res").innerHTML = ""; return; }
    const sel = estado(), cur = window.__ini.atual?.() ?? null;
    if ((sel.vezDe ?? null) !== cur) { sel.vezDe = cur; sel.manualAtacante = false; sel.idx = null; sel.circulo = null; sel.alvo = null; limparResultados(); $("#vez-manual").hidden = true; $("#vez-manual").innerHTML = ""; manualPend = null; }   // mudou o turno: a faixa acompanha quem está na vez e limpa o resultado anterior
    sel.atacante = atk.id; fontes = fontesDe(atk);
    if (!l.some((c) => c.id === sel.alvo) || sel.alvo === atk.id) sel.alvo = alvoPadrao(l, atk).id;
    faixa.hidden = false;
    $("#vez-topo").innerHTML = `<div class="acoes-vez-cab"><label class="inline"><b>${cur === atk.id ? "Vez de" : "Ataque de"}</b><select id="vez-atacante" aria-label="Quem ataca">${l.map((c) => `<option value="${esc(c.id)}" ${c.id === atk.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label><label class="inline">Alvo<select id="vez-alvo" aria-label="Em quem atacar">${l.filter((c) => c.id !== atk.id).map((c) => `<option value="${esc(c.id)}" ${c.id === sel.alvo ? "selected" : ""}>${esc(c.name)} (CA ${num(c.ac)}, PV ${num(c.hp)}/${num(c.maxHp)})</option>`).join("")}</select></label><label class="inline">Jogada<select id="vez-modo" aria-label="Vantagem ou desvantagem"><option value="normal" ${sel.modo !== "vantagem" && sel.modo !== "desvantagem" ? "selected" : ""}>Normal</option><option value="vantagem" ${sel.modo === "vantagem" ? "selected" : ""}>Vantagem</option><option value="desvantagem" ${sel.modo === "desvantagem" ? "selected" : ""}>Desvantagem</option></select></label><label class="inline vez-vezes">Ataques<input type="number" id="vez-vezes" class="num" min="1" max="8" step="1" value="${Math.max(1, Math.min(8, Math.round(num(sel.vezes, 1))))}" aria-label="Quantas vezes repetir o ataque (multiataque)" title="Repete o ataque escolhido, cada um com seu d20 e dano; o dano total vai num só Aplicar"></label>${treinoTravado() ? "" : `<label class="inline vez-treino"><input type="checkbox" id="vez-treino" ${emTreino() ? "checked" : ""}> Treino: não gasta nada</label>`}</div>
      <div class="row acoes-vez-botoes">${fontes.length ? fontes.map((a, i) => `<button type="button" class="small primary" data-vez="${i}" title="Rola o ataque contra a CA do alvo e o dano">${D20()}${esc(a.tipo === "magia" ? a.nome + " (magia)" : a.nome)}${a.tipo !== "magia" && a.hit != null ? " " + (a.hit >= 0 ? "+" : "") + a.hit : ""}</button>`).join("") : '<span class="muted">Sem ataques cadastrados: use Outras opções para um ataque manual.</span>'}<button type="button" class="small subtle" data-vez-avancado aria-expanded="${sel.avancado ? "true" : "false"}">Outras opções</button></div>`;
    $("#vez-avancado").hidden = !sel.avancado;
    if (sel.avancado) desenharAvancado();
  }
  /* Outras opções: ataque personalizado, magias, só ataque, só dano, metade do dano */
  function desenharAvancado() {
    const sel = estado();
    if (sel.idx == null || (sel.idx !== "manual" && sel.idx >= fontes.length)) sel.idx = fontes.length ? 0 : "manual";
    const manual = sel.idx === "manual", fonte = manual ? null : fontes[sel.idx], magia = fonte && fonte.tipo === "magia";
    let extra = "";
    if (manual) extra = `<div class="row"><label>Bônus de ataque<input id="atk-bonus" class="num" type="number" step="1" value="${num(sel.bonus, 0)}"></label><label>Dano (ex.: 1d8+3)<input id="atk-dano" maxlength="40" value="${esc(sel.dano || "1d6")}"></label></div>`;
    if (magia) {
      const an = fonte.an, circ = sel.circulo && sel.circulo >= Number(fonte.m.l) ? sel.circulo : (Number(fonte.m.l) || null), circulos = circulosDe(fonte);
      const sugestao = danoSugerido(fonte.m, an, { circulo: circ, nivelTotal: fonte.st.nivelTotal }), valor = sel.danoMagia != null && sel.danoMagiaDe === fonte.m.en + "|" + circ ? sel.danoMagia : sugestao;
      const regra = an.tipo === "ataque" ? `Ataque de magia <b>${fonte.st.ataque >= 0 ? "+" : ""}${fonte.st.ataque}</b>` : an.tipo === "salvaguarda" ? `CD <b>${fonte.st.cd}</b> (salvaguarda de ${NOME_ATR[an.atributoSalva]})${an.metadeNaSalva ? ", metade do dano se passar" : ""}` : "Sem jogada de ataque nem salvaguarda: só o dano sugerido";
      extra = `<div class="row">${circulos.length ? `<label>Espaço de magia<select id="atk-circulo">${circulos.map((c) => `<option value="${c}" ${c === circ ? "selected" : ""}>${c}º círculo</option>`).join("")}</select></label>` : ""}<label>Dano (sugerido pelo texto, edite se precisar)<input id="atk-dano-magia" maxlength="40" value="${esc(valor)}"></label>${an.tipo === "salvaguarda" ? `<label>Bônus de salvaguarda do alvo${salvaDo(lista().find((c) => c.id === sel.alvo), an.atributoSalva) !== null && !sel.salvaManual ? " (automático)" : ""}<input id="atk-salva-bonus" class="num" type="number" step="1" value="${sel.salvaManual ? num(sel.salvaBonus, 0) : num(salvaDo(lista().find((c) => c.id === sel.alvo), an.atributoSalva), 0)}"></label>` : ""}</div><p class="muted">${regra}. ${an.tipoDano ? "Dano " + esc(an.tipoDano) + ". " : ""}${treinoTravado() ? "" : emTreino() ? "Modo treino: nenhum espaço é gasto." : Number(fonte.m.l) ? "Conjurar gasta um espaço de magia da ficha." : ""}</p>`;
    }
    $("#vez-avancado-corpo").innerHTML = `<label>Ataque ou magia<select id="atk-ataque">${fontes.map((a, i) => `<option value="${i}" ${sel.idx === i ? "selected" : ""}>${esc(rotuloFonte(a))}</option>`).join("")}<option value="manual" ${manual ? "selected" : ""}>Manual…</option></select></label>${extra}
      <div class="row"><button type="button" id="atk-rolar" class="primary">${D20()}${magia ? "Conjurar e rolar" : "Rolar ataque e dano"}</button>${magia ? "" : `<button type="button" id="atk-so-ataque" class="small">${D20()}Só o ataque</button>`}<button type="button" id="atk-so-dano" class="small">${D20()}Só o dano</button><label class="inline"><input type="checkbox" id="atk-metade" ${sel.metade ? "checked" : ""}> Metade do dano</label></div>`;
  }
  function escolhido(opts = {}) {
    const sel = estado(), l = lista(), atacante = atacanteAtual(), alvo = l.find((c) => c.id === sel.alvo), modo = sel.modo === "vantagem" || sel.modo === "desvantagem" ? sel.modo : "normal";
    const base = { atacante, alvo, modo, metade: opts.rapido ? false : !!$("#atk-metade")?.checked };
    if (opts.rapido) return { ...base, a: fontes[opts.idx] };
    if (sel.idx === "manual") { const partes = parseExpressao($("#atk-dano")?.value || sel.dano); sel.dano = $("#atk-dano")?.value ?? sel.dano; sel.bonus = num($("#atk-bonus")?.value, num(sel.bonus, 0)); return { ...base, a: { nome: "Ataque manual", tipo: "ataque", hit: sel.bonus, dmg: partes } }; }
    return { ...base, a: fontes[sel.idx] };
  }
  /* dano radiante impede a Fortitude dos Mortos-Vivos (2014); o ajuste por defesas já foi feito ao rolar, por isso jaAjustado */
  const temRadiante = (partes, a) => (partes || []).some((x) => tipoEn(x.t) === "radiant") || tipoEn((a && a.an && a.an.tipoDano) || "") === "radiant";
  async function gastarEspacoSeNecessario(atacante, a, circulo) {
    if (emTreino() || a.tipo !== "magia" || !Number(a.m.l) || !atacante.pid || !window.__ini.gastarEspaco) return { ok: true, msg: "" };
    /* passa pelo combatente: em combate de teste o gasto fica só no combate; grava na ficha apenas se o combatente foi marcado para gravar */
    if (window.__ini.usarEspaco) return window.__ini.usarEspaco(atacante.id, circulo);
    return atacante.sync === true ? window.__ini.gastarEspaco(atacante.pid, circulo) : { ok: true, msg: "" };
  }
  /* único caminho de rolagem: ataque rápido (opts.rapido, um clique no botão do ataque) ou pelas Outras opções */
  async function rolar(parte, opts = {}) {
    if (gastando) return; gastando = true;
    try {
      const { atacante, alvo, a, modo, metade } = escolhido(opts), res = $("#vez-res");
      if (!atacante || !alvo || !a) return;
      let atq = null, dano = null, salva = null, linhas = [], partes = a.dmg, critico = false, metadeFinal = metade;
      const man = opts.manual || null, rngK = (k) => (man && man.d20 && man.d20[k] ? rngDe(man.d20[k]) : aleatorioPadrao);
      if (a.tipo === "magia") {
        const sel = estado(), circulo = opts.rapido ? (Number(a.m.l) || null) : (Number($("#atk-circulo")?.value) || Number(a.m.l) || null), expr = opts.rapido ? danoSugerido(a.m, a.an, { circulo, nivelTotal: a.st.nivelTotal }) : ($("#atk-dano-magia")?.value || "");
        if (!opts.rapido) { sel.circulo = circulo; sel.danoMagia = expr; sel.danoMagiaDe = a.m.en + "|" + circulo; if (sel.salvaManual) sel.salvaBonus = num($("#atk-salva-bonus")?.value, 0); }
        partes = expr.trim() ? parseExpressao(expr) : null;
        if (parte !== "dano") {
          if (expr.trim() && !partes) { res.innerHTML = '<span class="err">Dano inválido. Use algo como 8d6.</span>'; return; }
          const g = await gastarEspacoSeNecessario(atacante, a, circulo);
          if (!g.ok) { res.innerHTML = `<span class="err">${esc(g.msg)}</span>`; return; }
          if (g.msg) linhas.push(`<p class="muted">${esc(g.msg)}</p>`);
        }
        if (parte !== "dano" && a.an.tipo === "ataque") { atq = rolarAtaque({ bonus: a.st.ataque, modo, ca: num(alvo.ac), rng: rngK(0) }); critico = atq.resultado === "critico"; linhas.push(`<p><b>${esc(atacante.name)} conjura ${esc(a.nome)}:</b> ${esc(textoD20(atq))} contra CA ${num(alvo.ac)} → <b>${esc(ROTULO[atq.resultado])}</b></p>`); }
        else if (parte !== "dano" && a.an.tipo === "salvaguarda") {
          if (man && Number.isFinite(man.salva)) salva = { dados: [man.salva], nat: man.salva, bonus: 0, total: man.salva, cd: a.st.cd, modo: "normal", passou: man.salva >= a.st.cd };
          else { const autoSalva = salvaDo(alvo, a.an.atributoSalva); salva = rolarSalvaguarda({ bonus: estado().salvaManual ? num(estado().salvaBonus, 0) : (autoSalva ?? 0), cd: a.st.cd, modo: "normal" }); }
          linhas.push(`<p><b>${esc(atacante.name)} conjura ${esc(a.nome)}</b> (CD ${a.st.cd}, ${esc(NOME_ATR[a.an.atributoSalva])}). Salvaguarda de ${esc(alvo.name)}: ${esc(textoD20(salva))} → <b>${salva.passou ? "passou" : "falhou"}</b></p>`);
          if (salva.passou) metadeFinal = a.an.metadeNaSalva ? true : "nada";
        } else if (parte !== "dano") linhas.push(`<p><b>${esc(atacante.name)} conjura ${esc(a.nome)}.</b></p>`);
        const acertou = parte === "dano" || !atq || atq.acertou;
        if (partes && partes.length && acertou && metadeFinal !== "nada") { dano = man && Number.isFinite(man.dano && man.dano[0]) ? danoManual(man.dano[0], critico) : rolarDano(partes, { critico, metade: metadeFinal === true, defesas: defesasDo(alvo) }); linhas.push(`<p><b>Dano:</b> ${dano.total}${dano.metade ? " (de " + dano.bruto + ")" : ""} <span class="muted">${esc(descreverDano(dano))}${a.an.tipoDano ? " " + esc(a.an.tipoDano) : ""}</span></p>`); }
        else if (partes && partes.length && !acertou) linhas.push('<p class="muted">Errou: sem dano.</p>');
        else if (partes && partes.length && metadeFinal === "nada") linhas.push("<p class=\"muted\">Passou na salvaguarda: sem dano.</p>");
      } else {
        const N = Math.max(1, Math.min(8, Math.round(num(estado().vezes, 1)))), defesas = defesasDo(alvo); let somaDano = 0, houveDano = false, ultimoDano = null; const golpes = [];
        for (let k = 1; k <= N; k++) {
          const rot = N > 1 ? ` ${k}/${N}` : "";
          if (parte !== "dano") {
            if (a.hit == null) { res.innerHTML = '<span class="err">Este ataque não tem bônus de acerto; use "Só o dano" em Outras opções.</span>'; return; }
            atq = rolarAtaque({ bonus: a.hit, modo, ca: num(alvo.ac), rng: rngK(k - 1) }); critico = atq.resultado === "critico";
            linhas.push(`<p><b>Ataque${rot} de ${esc(atacante.name)} (${esc(a.nome)}):</b> ${esc(textoD20(atq))} contra CA ${num(alvo.ac)} → <b>${esc(ROTULO[atq.resultado])}</b></p>`);
            if (critico && window.__ini.temTraco && window.__ini.temTraco(atacante, /Ataques Selvagens|Savage Attacks/i)) linhas.push('<p class="muted">Ataques Selvagens: em acerto crítico com arma corpo a corpo, role mais um dado de dano da arma (some ao dano).</p>');
          }
          if (parte !== "ataque") {
            if (!partes || !partes.length) { if (!atq) { res.innerHTML = '<span class="err">Dano inválido. Use algo como 1d8+3.</span>'; return; } }
            else if (parte === "dano" || (atq && atq.acertou)) { ultimoDano = man && Number.isFinite(man.dano && man.dano[k - 1]) ? danoManual(man.dano[k - 1], critico) : rolarDano(partes, { critico, metade, defesas }); somaDano += ultimoDano.total; houveDano = true; golpes.push({ total: ultimoDano.total, critico, radiante: temRadiante(partes, a) }); linhas.push(`<p><b>Dano${rot}:</b> ${ultimoDano.total}${ultimoDano.metade ? " (de " + ultimoDano.bruto + ")" : ""} <span class="muted">${esc(descreverDano(ultimoDano))}</span></p>`); }
            else linhas.push(`<p class="muted">Errou${rot}: sem dano.</p>`);
          }
        }
        if (houveDano) { dano = N > 1 ? { bruto: somaDano, total: somaDano, detalhe: [], critico: false, metade: false, ajustes: [] } : ultimoDano; if (N > 1) linhas.push(`<p><b>Dano total:</b> ${somaDano}</p>`); }
      }
      const dt = defesasTexto(defesasDo(alvo)); if (dano && dt) linhas.push(`<p class="muted">Defesas de ${esc(alvo.name)}: ${esc(dt)}${(defesasDo(alvo) || {}).naoMagico ? " (resistências a ataques não mágicos: confira se a arma é mágica)" : ""}.</p>`);
      const n = ++seq;
      if (dano && dano.total >= 0) resultados[n] = { dano, alvoId: alvo.id, atacanteId: atacante.id, aplicado: false, golpes: typeof golpes !== "undefined" && golpes.length ? golpes : [{ total: dano.total, critico, radiante: temRadiante(partes, a) }] };
      if (dano && dano.total >= 0) linhas.push(`<div class="row"><button type="button" class="danger atk-aplicar" data-aplicar="${n}">Aplicar ${dano.total} de dano em ${esc(alvo.name)}</button><span class="muted">PV ${num(alvo.hp)} → ${Math.max(0, num(alvo.hp) - dano.total)}</span></div>`);
      blocos.unshift(`<div class="res-ataque" data-res="${n}">${linhas.join("")}</div>`); blocos = blocos.slice(0, 5);   // os mais recentes em cima; os anteriores continuam aplicáveis uma vez
      res.innerHTML = blocos.join("");
    } finally { gastando = false; }
  }
  /* Rolagem automática desligada: em vez de rolar, a faixa pede os valores (d20 natural, salvaguarda do alvo, dano) e calcula o resultado com as mesmas regras */
  let manualPend = null;
  function pedirManual(parte, opts = {}) {
    const { atacante, alvo, a, modo } = escolhido(opts), area = $("#vez-manual");
    if (!atacante || !alvo || !a) return;
    const magia = a.tipo === "magia", N = magia ? 1 : Math.max(1, Math.min(8, Math.round(num(estado().vezes, 1))));
    const pedeD20 = parte !== "dano" && (magia ? a.an.tipo === "ataque" : true), pedeSalva = magia && parte !== "dano" && a.an.tipo === "salvaguarda";
    const temDano = parte !== "ataque" && (magia ? !!a.an.dado || !!(estado().danoMagia) : !!(a.dmg && a.dmg.length) || a.hit == null);
    if (pedeD20 && !magia && a.hit == null) { $("#vez-res").innerHTML = '<span class="err">Este ataque não tem bônus de acerto; use "Só o dano" em Outras opções.</span>'; return; }
    manualPend = { parte, opts, N, pedeD20, pedeSalva, temDano, dois: modo !== "normal" };
    const linhas = [];
    for (let k = 1; k <= N; k++) linhas.push(`<div class="row vez-manual-linha">${N > 1 ? `<b>Ataque ${k}/${N}</b>` : ""}${pedeD20 ? `<label>${D20()}d20${manualPend.dois ? " (1º dado)" : ""}<input type="number" class="num" min="1" max="20" step="1" data-man-d20="${k - 1}-0" aria-label="Resultado do d20 do ataque ${k}"></label>${manualPend.dois ? `<label>${D20()}d20 (2º dado)<input type="number" class="num" min="1" max="20" step="1" data-man-d20="${k - 1}-1" aria-label="Segundo d20 do ataque ${k}"></label>` : ""}` : ""}${temDano ? `<label>Dano (total)<input type="number" class="num" min="0" step="1" data-man-dano="${k - 1}" aria-label="Dano total do ataque ${k}"></label>` : ""}</div>`);
    if (pedeSalva) linhas.push(`<div class="row vez-manual-linha"><label>Salvaguarda de ${esc(alvo.name)} (resultado final, CD ${a.st.cd})<input type="number" class="num" step="1" data-man-salva aria-label="Resultado final da salvaguarda do alvo"></label></div>`);
    area.hidden = false;
    area.innerHTML = `<p class="muted"><b>${esc(atacante.name)}</b> → <b>${esc(alvo.name)}</b> (CA ${num(alvo.ac)}): rolagem automática desligada, informe os valores dos seus dados.</p>${linhas.join("")}<div class="row"><button type="button" class="primary" id="man-ok">Confirmar valores</button><button type="button" class="small subtle" id="man-cancelar">Cancelar</button></div><p class="err" id="man-erro" role="alert"></p>`;
  }
  function confirmarManual() {
    if (!manualPend) return; const area = $("#vez-manual"), M = manualPend, lerN = (sel) => { const e = area.querySelector(sel); return e && e.value !== "" ? Number(e.value) : NaN; };
    const d20 = [], dano = []; let salva;
    for (let k = 0; k < M.N; k++) {
      if (M.pedeD20) { const v = [lerN(`[data-man-d20="${k}-0"]`)]; if (M.dois) v.push(lerN(`[data-man-d20="${k}-1"]`)); if (v.some((x) => !Number.isInteger(x) || x < 1 || x > 20)) { $("#man-erro").textContent = "Informe o resultado do d20 (de 1 a 20)."; return; } d20.push(v); }
      if (M.temDano) { const x = lerN(`[data-man-dano="${k}"]`); dano.push(x); if (M.parte === "dano" && !Number.isInteger(x)) { $("#man-erro").textContent = "Informe o dano total (número inteiro)."; return; } if (Number.isFinite(x) && (!Number.isInteger(x) || x < 0)) { $("#man-erro").textContent = "O dano deve ser um número inteiro, 0 ou maior."; return; } }
    }
    if (M.pedeSalva) { salva = lerN("[data-man-salva]"); if (!Number.isInteger(salva)) { $("#man-erro").textContent = "Informe o resultado final da salvaguarda do alvo."; return; } }
    area.hidden = true; area.innerHTML = ""; manualPend = null;
    rolar(M.parte, { ...M.opts, manual: { d20, dano, salva } });
  }
  const dispara = (parte, opts) => (auto() ? rolar(parte, opts) : pedirManual(parte, opts));
  /* cada resultado tem o próprio Aplicar e só vale uma vez; o clique duplo ou um segundo clique não repete o dano */
  function aplicarResultado(n, b) {
    const U = resultados[n]; if (!U || U.aplicado) return; U.aplicado = true;
    for (const g of U.golpes) window.__ini.aplicarDano(U.alvoId, g.total, U.atacanteId, { critico: !!g.critico, jaAjustado: true, tipo: g.radiante ? "radiant" : undefined });   // cada golpe separado: a 0 PV cada um conta (crítico = 2 falhas) e o dano massivo vale por golpe
    const alvo = lista().find((c) => c.id === U.alvoId);
    const nota = `<p><b>Dano aplicado.</b> ${esc(alvo ? alvo.name : "Alvo")}: PV ${alvo ? num(alvo.hp) : "?"}/${alvo ? num(alvo.maxHp) : "?"}.</p>`;
    blocos = blocos.map((h) => (h.includes(`data-res="${n}"`) ? h.replace(/<div class="row"><button type="button" class="danger atk-aplicar"[\s\S]*?<\/div>/, "").replace(/<\/div>$/, nota + "</div>") : h));
    $("#vez-res").innerHTML = blocos.join(""); if (b) b.disabled = true;
  }
  faixa.addEventListener("change", (e) => {
    const sel = estado(), id = e.target.id;
    if (id === "vez-atacante") { sel.atacante = e.target.value; sel.manualAtacante = true; sel.manualPara = window.__ini.atual?.() ?? null; sel.idx = null; sel.circulo = null; limparResultados(); desenharVez(); }
    else if (id === "vez-alvo") { sel.alvo = e.target.value; sel.salvaManual = false; }
    else if (id === "vez-vezes") sel.vezes = Math.max(1, Math.min(8, Math.round(num(e.target.value, 1))));
    else if (id === "atk-salva-bonus") { sel.salvaManual = true; sel.salvaBonus = num(e.target.value, 0); }
    else if (id === "vez-modo") sel.modo = e.target.value;
    else if (id === "vez-treino") { sel.treino = e.target.checked; desenharVez(); }
    else if (id === "atk-ataque") { sel.idx = e.target.value === "manual" ? "manual" : +e.target.value; sel.circulo = null; desenharAvancado(); }
    else if (id === "atk-circulo") { sel.circulo = +e.target.value; sel.danoMagia = null; desenharAvancado(); }
    else if (id === "atk-metade") sel.metade = e.target.checked;
  });
  faixa.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.id === "man-ok") confirmarManual();
    else if (b.id === "man-cancelar") { $("#vez-manual").hidden = true; $("#vez-manual").innerHTML = ""; manualPend = null; }
    else if (b.dataset.vez !== undefined) dispara("tudo", { rapido: true, idx: +b.dataset.vez });
    else if (b.dataset.vezAvancado !== undefined) { const sel = estado(); sel.avancado = !sel.avancado; desenharVez(); }
    else if (b.id === "atk-rolar") dispara("tudo"); else if (b.id === "atk-so-ataque") dispara("ataque"); else if (b.id === "atk-so-dano") dispara("dano");
    else if (b.dataset.aplicar !== undefined) aplicarResultado(+b.dataset.aplicar, b);
  });
  /* botão "Atacar" do cartão do combatente: abre esta mesma interface com ele como atacante */
  window.addEventListener?.("ini:atacar", (e) => {
    const sel = estado(), id = e.detail && e.detail.id; if (!id) return;
    sel.atacante = id; sel.manualAtacante = true; sel.manualPara = window.__ini.atual?.() ?? null; sel.idx = null; sel.circulo = null; limparResultados();
    desenharVez(); faixa.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  });
  window.addEventListener?.("ini:rolagem", () => { $("#vez-manual").hidden = true; $("#vez-manual").innerHTML = ""; manualPend = null; desenharVez(); });
  window.__ini.aoAlterar?.(() => { if (!document.activeElement?.closest?.("#acoes-da-vez")) desenharVez(); });
  desenharVez();
})();
