/* Criação de fichas no padrão do Livro dos Monstros (2014): tudo é opcional (só o nome é obrigatório).
   Este arquivo guarda as regras de montagem da ficha (campos extras, defesas, sentidos, ações em linhas) e a leitura do formulário;
   o salvamento, a foto e a lista continuam em js/app.js. Os campos seguem o mesmo modelo das criaturas do catálogo para a ficha,
   o painel Atacar e as defesas por tipo de dano funcionarem igual. */
(() => {
  "use strict";
  const ATRIBUTOS = [["strength", "FOR"], ["dexterity", "DES"], ["constitution", "CON"], ["intelligence", "INT"], ["wisdom", "SAB"], ["charisma", "CAR"]];
  const PERICIAS = [["acrobatics", "Acrobacia"], ["animal_handling", "Lidar com Animais"], ["arcana", "Arcanismo"], ["athletics", "Atletismo"], ["deception", "Enganação"], ["history", "História"], ["insight", "Intuição"], ["intimidation", "Intimidação"], ["investigation", "Investigação"], ["medicine", "Medicina"], ["nature", "Natureza"], ["perception", "Percepção"], ["performance", "Atuação"], ["persuasion", "Persuasão"], ["religion", "Religião"], ["sleight_of_hand", "Prestidigitação"], ["stealth", "Furtividade"], ["survival", "Sobrevivência"]];
  const DANOS = [["slashing", "Cortante"], ["piercing", "Perfurante"], ["bludgeoning", "Contundente"], ["fire", "Ígneo (fogo)"], ["cold", "Gélido (frio)"], ["acid", "Ácido"], ["lightning", "Elétrico"], ["thunder", "Trovejante"], ["necrotic", "Necrótico"], ["psychic", "Psíquico"], ["radiant", "Radiante"], ["poison", "Venenoso"], ["force", "De energia"]];
  const CONDICOES = [["blinded", "Cego"], ["charmed", "Enfeitiçado"], ["deafened", "Surdo"], ["exhaustion", "Exaustão"], ["frightened", "Amedrontado"], ["grappled", "Agarrado"], ["incapacitated", "Incapacitado"], ["invisible", "Invisível"], ["paralyzed", "Paralisado"], ["petrified", "Petrificado"], ["poisoned", "Envenenado"], ["prone", "Caído"], ["restrained", "Contido"], ["stunned", "Atordoado"], ["unconscious", "Inconsciente"]];
  const ALINHAMENTOS = [["", "Não informado"], ["unaligned", "Sem tendência"], ["any alignment", "Qualquer tendência"], ["lawful good", "Leal e bom"], ["neutral good", "Neutro e bom"], ["chaotic good", "Caótico e bom"], ["lawful neutral", "Leal e neutro"], ["neutral", "Neutro"], ["chaotic neutral", "Caótico e neutro"], ["lawful evil", "Leal e mau"], ["neutral evil", "Neutro e mau"], ["chaotic evil", "Caótico e mau"]];
  const ACOES = [["bonus", "BONUS_ACTION", "Ações bônus"], ["reacao", "REACTION", "Reações"], ["lendaria", "LEGENDARY_ACTION", "Ações lendárias"], ["covil", "LAIR_ACTION", "Ações de covil"]];
  const XP = { 0: 10, 0.125: 25, 0.25: 50, 0.5: 100, 1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800, 6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900, 11: 7200, 12: 8400, 13: 10000, 14: 11500, 15: 13000, 16: 15000, 17: 18000, 18: 20000, 19: 22000, 20: 25000, 21: 33000, 22: 41000, 23: 50000, 24: 62000, 25: 75000, 26: 90000, 27: 105000, 28: 120000, 29: 135000, 30: 155000 };
  const bonusProficiencia = (nd) => { const n = Number(nd) || 0; return n < 5 ? 2 : n < 9 ? 3 : n < 13 ? 4 : n < 17 ? 5 : n < 21 ? 6 : n < 25 ? 7 : n < 29 ? 8 : 9; };
  const xpDoND = (nd) => XP[Number(nd)] ?? null;
  /* "1/4", "1/2", "0,25", "3" -> número */
  const lerND = (txt) => { const s = String(txt ?? "").trim().replace(",", "."); if (!s) return NaN; const f = s.match(/^(\d+)\s*\/\s*(\d+)$/); return f ? Number(f[1]) / Number(f[2]) : Number(s); };
  const numOuNulo = (v) => { const s = String(v ?? "").trim().replace(",", "."); if (s === "") return null; const n = Number(s); return Number.isFinite(n) ? n : null; };
  const mod = (n) => Math.floor((Number(n) - 10) / 2);
  const semAcento = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  /* tipos de dano escritos em português ou inglês -> chave em inglês (a que o painel Atacar entende) */
  const TIPO_EN = { cortante: "slashing", perfurante: "piercing", contundente: "bludgeoning", fogo: "fire", igneo: "fire", frio: "cold", gelido: "cold", acido: "acid", eletrico: "lightning", relampago: "lightning", trovejante: "thunder", trovao: "thunder", necrotico: "necrotic", psiquico: "psychic", radiante: "radiant", venenoso: "poison", veneno: "poison", energia: "force", forca: "force" };
  const tipoEn = (t) => { const s = semAcento(t).replace(/[^a-z]/g, ""); return TIPO_EN[s] || (DANOS.some((d) => d[0] === s) ? s : ""); };
  const ATR_CD = { for: "strength", str: "strength", des: "dexterity", dex: "dexterity", con: "constitution", int: "intelligence", sab: "wisdom", wis: "wisdom", car: "charisma", cha: "charisma" };

  /* ---------- ações em linhas ----------
     Nome | descrição                                        (texto)
     Nome | +4 | 1d6+2 | cortante | descrição                (ataque, formato antigo)
     Nome | +14 | 2d10+8 perfurante + 2d6 ígneo | descrição  (vários dados de dano)
     Nome | CD 12 CON | 3d6 necrótico | descrição            (salvaguarda do alvo, com dano)
     No nome de uma ação lendária: "(Custa 2 Ações)" define o custo. */
  function parteDano(texto) {
    const out = []; const re = /(\d+)\s*d\s*(\d+)(?:\s*([+-])\s*(\d+))?(?:\s+([A-Za-zÀ-ÿ]+(?: de [A-Za-zÀ-ÿ]+)?))?/g; let m;
    while ((m = re.exec(texto))) { const tipo = m[5] && tipoEn(m[5]) ? m[5] : ""; out.push({ n: +m[1], f: +m[2], b: m[3] ? (m[3] === "-" ? -1 : 1) * +m[4] : 0, t: tipo }); if (!tipo && m[5]) re.lastIndex = m.index + m[0].length - m[5].length; }
    return out;
  }
  function parseAcao(linha, tipo = "ACTION") {
    const p = String(linha).split("|").map((s) => s.trim()), a = { name: p[0], action_type: tipo, attacks: [] };
    const custo = a.name.match(/\(\s*(?:custa|costs?)\s*(\d+)\s*a[cç][oõ]es?\b[^)]*\)/i) || a.name.match(/\(\s*costs?\s*(\d+)\s*actions?\s*\)/i);
    const recarga = a.name.match(/\(\s*(?:recarga|recharge)\s*(\d)(?:\s*[-–—]\s*(\d))?\s*\)/i), porDia = a.name.match(/\(\s*(\d+)\s*\/\s*(?:dia|day)\s*\)/i);
    if (recarga) a.usage_limits = { type: "RECHARGE_ON_ROLL", param: +recarga[1] }; else if (porDia) a.usage_limits = { type: "PER_DAY", param: +porDia[1] };   // mesmo formato do catálogo: a ficha mostra "(Recarga 5–6)" a partir disto
    a.name = a.name.replace(/\s*\(\s*(?:recarga|recharge)[^)]*\)/i, "").replace(/\s*\(\s*\d+\s*\/\s*(?:dia|day)\s*\)/i, "").replace(/\s*\(\s*(?:custa|costs?)\s*\d+[^)]*\)/i, "").trim();
    if (tipo === "LEGENDARY_ACTION") a.legendary_action_cost = custo ? +custo[1] : 1;
    if (p.length < 3) { a.desc = p[1] || ""; return a; }
    const cd = p[1].match(/^CD\s*(\d+)\s*([A-Za-zÀ-ÿ]+)?/i), acerto = cd ? null : (p[1].match(/^[+-]?\d+$/) ? parseInt(p[1]) : null);
    let partes = parteDano(p[2] || ""), tipoLegado = "", descricao = p[3] || "";
    if (partes.length && !partes.some((x) => x.t) && p[3] && tipoEn(p[3])) { tipoLegado = p[3]; descricao = p[4] || ""; partes[0].t = p[3]; }   // formato antigo: o tipo vem na coluna seguinte
    const bruto = tipoLegado ? `${p[2]} ${tipoLegado}` : p[2];
    const ataque = { name: a.name + " (ataque)", attack_type: cd ? "SAVE" : "WEAPON", to_hit_mod: acerto, damage_die_count: partes[0] ? partes[0].n : 0, damage_die_type: partes[0] ? "D" + partes[0].f : "D0", damage_bonus: partes[0] ? partes[0].b : 0, damage_type: partes[0] && partes[0].t ? { name: partes[0].t } : null };
    if (partes[1]) { ataque.extra_damage_die_count = partes[1].n; ataque.extra_damage_die_type = "D" + partes[1].f; ataque.extra_damage_bonus = partes[1].b; ataque.extra_damage_type = partes[1].t ? { name: partes[1].t } : null; }
    if (partes.length > 2) ataque.more_damage = partes.slice(2);
    a.attacks = [ataque];
    if (cd) a.save = { dc: +cd[1], ability: ATR_CD[semAcento(cd[2] || "").slice(0, 3)] || "" };
    const resumo = cd ? `Salvaguarda CD ${cd[1]}${cd[2] ? " " + cd[2].toUpperCase() : ""}.` : acerto != null ? `Ataque: ${acerto >= 0 ? "+" : ""}${acerto} para acertar.` : "";
    const jaDescrito = /\d+\s*\(\s*\d+d\d+/.test(descricao) || /\b(?:Acerto|Hit)\s*:/i.test(descricao);     // texto original do livro já traz os números: não repete o resumo
    a.desc = (jaDescrito ? descricao : `${resumo} Dano: ${bruto}. ${descricao}`).replace(/^\s+/, "").replace(/\s*¶\s*/g, "\n").trim();
    return a;
  }

  /* ---------- defesas em texto no padrão do catálogo (inglês, traduzido na exibição) ---------- */
  const nomeEn = (k) => k.charAt(0).toUpperCase() + k.slice(1);
  function listaDefesa(chaves, naoMagico, base) {
    const ks = (chaves || []).filter(Boolean); if (!ks.length) return { lista: [], texto: "" };
    const fisicos = ["bludgeoning", "piercing", "slashing"].filter((k) => ks.includes(k)), outros = ks.filter((k) => !fisicos.includes(k));
    let texto;
    if (naoMagico && fisicos.length) {
      const f = fisicos.length === 1 ? fisicos[0] : fisicos.slice(0, -1).join(", ") + (fisicos.length > 2 ? "," : "") + " and " + fisicos[fisicos.length - 1];
      texto = (outros.length ? outros.join(", ") + "; " : "") + f + " from nonmagical attacks";
    } else texto = ks.join(", ") + (naoMagico ? " from nonmagical attacks" : "");
    return { lista: ks.map((k) => ({ name: nomeEn(k), key: k })), texto };
  }

  /* ---------- extras do formulário -> campos da ficha ---------- */
  function linhas(t) { return String(t || "").split("\n").map((s) => s.trim()).filter(Boolean); }
  function aplicarExtras(m, ex) {
    ex = ex || {};
    const nd = m.cat === "monster" || !m.cat ? Number(m.challenge_rating) || 0 : null;
    if (ex.alinhamento) m.alignment = ex.alinhamento;
    if (ex.armadura) m.armor_detail = ex.armadura;
    const sp = { ...(m.speed || {}) }; for (const [k, v] of Object.entries(ex.deslocamentos || {})) if (Number(v) > 0) sp[k] = Number(v); m.speed = sp;
    if (nd != null) { const pb = numOuNulo(ex.prof); m.proficiency_bonus = pb != null ? pb : bonusProficiencia(nd); const xp = numOuNulo(ex.xp); m.experience_points = xp != null ? xp : xpDoND(nd); }
    const sv = {}; for (const [k, v] of Object.entries(ex.salvaguardas || {})) { const n = numOuNulo(v); if (n != null) sv[k] = n; } m.saving_throws = sv;
    const sk = {}; for (const [k, v] of Object.entries(ex.pericias || {})) { const n = numOuNulo(v); if (n != null) sk[k] = n; } m.skill_bonuses = sk;
    const r = listaDefesa(ex.resistencias, ex.naoMagico && ex.naoMagico.res), i = listaDefesa(ex.imunidades, ex.naoMagico && ex.naoMagico.imu), v = listaDefesa(ex.vulnerabilidades, ex.naoMagico && ex.naoMagico.vul);
    const c = (ex.condicoes || []).filter(Boolean);
    m.resistances_and_immunities = { damage_resistances: r.lista, damage_resistances_display: r.texto, damage_immunities: i.lista, damage_immunities_display: i.texto, damage_vulnerabilities: v.lista, damage_vulnerabilities_display: v.texto, condition_immunities: c.map((k) => ({ name: nomeEn(k), key: k })), condition_immunities_display: c.join(", ") };
    const s = ex.sentidos || {}; for (const [campo, chave] of [["darkvision", "darkvision_range"], ["blindsight", "blindsight_range"], ["tremorsense", "tremorsense_range"], ["truesight", "truesight_range"]]) { const n = numOuNulo(s[campo]); m[chave] = n && n > 0 ? n : null; }
    const percep = sk.perception != null ? sk.perception : mod((m.ability_scores || {}).wisdom ?? 10), pp = numOuNulo(s.passiva); m.passive_perception = pp != null ? pp : 10 + percep;
    if (String(ex.idiomas || "").trim()) m.languages = { as_string: String(ex.idiomas).trim(), data: [] };
    const raw = { ...(m.raw || {}) }, acoes = [...(m.actions || []).filter((a) => !a.action_type || a.action_type === "ACTION")];
    for (const [id, tipo] of ACOES) { const txt = (ex.acoes || {})[id] || ""; raw[id] = txt; for (const l of linhas(txt)) acoes.push(parseAcao(l, tipo)); }
    m.actions = acoes; m.raw = raw; return m;
  }

  /* ---------- ficha -> extras (para editar) ---------- */
  function extrasDeMonstro(m) {
    m = m || {}; const ex = { acoes: {} }, r = m.resistances_and_immunities || {}, sp = m.speed || {};
    ex.alinhamento = m.alignment && m.alignment !== "—" ? m.alignment : ""; ex.armadura = m.armor_detail || "";
    ex.deslocamentos = {}; for (const k of ["fly", "swim", "climb", "burrow"]) if (sp[k]) ex.deslocamentos[k] = sp[k];
    const nd = Number(m.challenge_rating) || 0; ex.prof = m.proficiency_bonus && m.proficiency_bonus !== bonusProficiencia(nd) ? m.proficiency_bonus : ""; ex.xp = m.experience_points && m.experience_points !== xpDoND(nd) ? m.experience_points : "";
    ex.salvaguardas = { ...(m.saving_throws || {}) }; ex.pericias = { ...(m.skill_bonuses || {}) };
    const chaves = (l) => (l || []).map((x) => x.key).filter(Boolean);
    ex.resistencias = chaves(r.damage_resistances); ex.imunidades = chaves(r.damage_immunities); ex.vulnerabilidades = chaves(r.damage_vulnerabilities); ex.condicoes = chaves(r.condition_immunities);
    ex.naoMagico = { res: /nonmagical/i.test(r.damage_resistances_display || ""), imu: /nonmagical/i.test(r.damage_immunities_display || ""), vul: /nonmagical/i.test(r.damage_vulnerabilities_display || "") };
    ex.sentidos = { darkvision: m.darkvision_range || "", blindsight: m.blindsight_range || "", tremorsense: m.tremorsense_range || "", truesight: m.truesight_range || "" };
    const percep = (m.skill_bonuses || {}).perception != null ? m.skill_bonuses.perception : mod((m.ability_scores || {}).wisdom ?? 10);
    ex.sentidos.passiva = m.passive_perception != null && m.passive_perception !== 10 + percep ? m.passive_perception : "";
    ex.idiomas = (m.languages && m.languages.as_string) || "";
    for (const [id, tipo] of ACOES) ex.acoes[id] = (m.raw && m.raw[id] != null) ? m.raw[id] : (m.actions || []).filter((a) => a.action_type === tipo).map((a) => `${a.name} | ${a.desc || ""}`).join("\n");
    return ex;
  }

  /* ---------- formulário (campos extras, todos opcionais) ---------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  function htmlExtras() {
    const caixas = (pref, lista) => `<div class="cm-caixas">${lista.map(([k, n]) => `<label class="inline"><input type="checkbox" id="${pref}-${k}"> ${esc(n)}</label>`).join("")}</div>`;
    const num = (id, rot, ph = "") => `<div><label for="${id}">${esc(rot)}</label><input id="${id}" type="number" step="1" placeholder="${esc(ph)}"></div>`;
    return `<details class="cm-livro" id="cm-livro"><summary>Mais detalhes do livro (tudo opcional)</summary>
      <p class="muted">Preencha só o que quiser: os campos em branco não aparecem na ficha. Salvar só com o nome já funciona.</p>
      <h4>Tendência e armadura</h4><div class="cmg">
        <div style="grid-column:span 2"><label for="cm-al">Tendência</label><select id="cm-al">${ALINHAMENTOS.map(([v, n]) => `<option value="${esc(v)}">${esc(n)}</option>`).join("")}</select></div>
        <div style="grid-column:span 2"><label for="cm-arm">Tipo de armadura (ex.: armadura natural)</label><input id="cm-arm" maxlength="60"></div>
        ${num("cm-prof", "Bônus de proficiência", "automático")}${num("cm-xp", "XP", "automático pelo ND")}</div>
      <h4>Deslocamentos extras (pés)</h4><div class="cmg">${num("cm-sp-fly", "Voo")}${num("cm-sp-swim", "Natação")}${num("cm-sp-climb", "Escalada")}${num("cm-sp-burrow", "Escavação")}</div>
      <h4>Salvaguardas (bônus total; em branco = sem proficiência)</h4><div class="cmg">${ATRIBUTOS.map(([k, n]) => num("sv-" + k, n)).join("")}</div>
      <details class="cm-sub"><summary>Perícias (bônus total; em branco = não listada)</summary><div class="cmg">${PERICIAS.map(([k, n]) => num("sk-" + k, n)).join("")}</div></details>
      <h4>Resistências a dano</h4>${caixas("df-res", DANOS)}<label class="inline"><input type="checkbox" id="nm-res"> somente de ataques não mágicos</label>
      <h4>Imunidades a dano</h4>${caixas("df-imu", DANOS)}<label class="inline"><input type="checkbox" id="nm-imu"> somente de ataques não mágicos</label>
      <h4>Vulnerabilidades a dano</h4>${caixas("df-vul", DANOS)}<label class="inline"><input type="checkbox" id="nm-vul"> somente de ataques não mágicos</label>
      <h4>Imunidades a condições</h4>${caixas("df-con", CONDICOES)}
      <h4>Sentidos (pés) e idiomas</h4><div class="cmg">${num("sn-darkvision", "Visão no escuro")}${num("sn-blindsight", "Percepção às cegas")}${num("sn-tremorsense", "Sentido sísmico")}${num("sn-truesight", "Visão verdadeira")}${num("sn-passiva", "Percepção passiva", "automática")}
        <div style="grid-column:span 2"><label for="cm-lang">Idiomas</label><input id="cm-lang" maxlength="160" placeholder="ex.: Comum, Subterrâneo"></div></div>
      <h4>Outros tipos de ação (uma por linha, mesmo formato das Ações)</h4>
      ${ACOES.map(([id, , rot]) => `<label for="ac-${id}">${esc(rot)}</label><textarea id="ac-${id}" rows="3" ${id === "lendaria" ? 'placeholder="Ataque de Cauda (Custa 2 Ações) | descrição"' : ""}></textarea>`).join("")}
      <p class="muted">Formatos de ação: <code>Nome | descrição</code>; ataque: <code>Nome | +4 | 1d6+2 | cortante | descrição</code>; vários danos: <code>Nome | +14 | 2d10+8 perfurante + 2d6 ígneo | descrição</code>; salvaguarda: <code>Nome | CD 12 CON | 3d6 necrótico | descrição</code>.</p>
    </details>`;
  }
  const $ = (id) => document.getElementById(id);
  const marcados = (pref, lista) => lista.filter(([k]) => $(pref + "-" + k) && $(pref + "-" + k).checked).map(([k]) => k);
  function lerExtras() {
    const v = (id) => ($(id) ? $(id).value : "");
    const pares = (pref, lista) => Object.fromEntries(lista.map(([k]) => [k, v(pref + "-" + k)]));
    return { alinhamento: v("cm-al"), armadura: v("cm-arm").trim(), prof: v("cm-prof"), xp: v("cm-xp"), idiomas: v("cm-lang"),
      deslocamentos: { fly: v("cm-sp-fly"), swim: v("cm-sp-swim"), climb: v("cm-sp-climb"), burrow: v("cm-sp-burrow") },
      salvaguardas: pares("sv", ATRIBUTOS), pericias: pares("sk", PERICIAS),
      resistencias: marcados("df-res", DANOS), imunidades: marcados("df-imu", DANOS), vulnerabilidades: marcados("df-vul", DANOS), condicoes: marcados("df-con", CONDICOES),
      naoMagico: { res: !!($("nm-res") && $("nm-res").checked), imu: !!($("nm-imu") && $("nm-imu").checked), vul: !!($("nm-vul") && $("nm-vul").checked) },
      sentidos: { darkvision: v("sn-darkvision"), blindsight: v("sn-blindsight"), tremorsense: v("sn-tremorsense"), truesight: v("sn-truesight"), passiva: v("sn-passiva") },
      acoes: Object.fromEntries(ACOES.map(([id]) => [id, v("ac-" + id)])) };
  }
  function preencherExtras(ex) {
    ex = ex || {}; const set = (id, val) => { if ($(id)) $(id).value = val ?? ""; }, marca = (pref, lista, ks) => lista.forEach(([k]) => { if ($(pref + "-" + k)) $(pref + "-" + k).checked = (ks || []).includes(k); });
    if (ex.alinhamento && $("cm-al") && ![...$("cm-al").options].some((o) => o.value === ex.alinhamento)) { const op = document.createElement("option"); op.value = ex.alinhamento; op.textContent = ex.alinhamento; $("cm-al").appendChild(op); }   // tendência fora da lista: mantém o texto como veio
    set("cm-al", ex.alinhamento || ""); set("cm-arm", ex.armadura); set("cm-prof", ex.prof); set("cm-xp", ex.xp); set("cm-lang", ex.idiomas);
    for (const k of ["fly", "swim", "climb", "burrow"]) set("cm-sp-" + k, (ex.deslocamentos || {})[k]);
    ATRIBUTOS.forEach(([k]) => set("sv-" + k, (ex.salvaguardas || {})[k])); PERICIAS.forEach(([k]) => set("sk-" + k, (ex.pericias || {})[k]));
    marca("df-res", DANOS, ex.resistencias); marca("df-imu", DANOS, ex.imunidades); marca("df-vul", DANOS, ex.vulnerabilidades); marca("df-con", CONDICOES, ex.condicoes);
    for (const [id, k] of [["nm-res", "res"], ["nm-imu", "imu"], ["nm-vul", "vul"]]) if ($(id)) $(id).checked = !!(ex.naoMagico || {})[k];
    for (const k of ["darkvision", "blindsight", "tremorsense", "truesight", "passiva"]) set("sn-" + k, (ex.sentidos || {})[k]);
    ACOES.forEach(([id]) => set("ac-" + id, (ex.acoes || {})[id]));
    const algum = ex.alinhamento || ex.armadura || Object.keys(ex.deslocamentos || {}).length || Object.keys(ex.salvaguardas || {}).length || Object.keys(ex.pericias || {}).length || (ex.resistencias || []).length || (ex.imunidades || []).length || (ex.vulnerabilidades || []).length || (ex.condicoes || []).length || (ex.sentidos && (ex.sentidos.darkvision || ex.sentidos.blindsight || ex.sentidos.tremorsense || ex.sentidos.truesight)) || ex.idiomas || Object.values(ex.acoes || {}).some(Boolean);
    if ($("cm-livro")) $("cm-livro").open = !!algum;     // ao editar uma ficha que já tem esses dados, a seção abre sozinha
  }
  const limparExtras = () => preencherExtras({});
  function montarFormulario() { const alvo = $("cm-livro-ui"); if (alvo && !alvo.dataset.pronto) { alvo.innerHTML = htmlExtras(); alvo.dataset.pronto = "1"; } }

  window.FICHA_CRIACAO = { ATRIBUTOS, PERICIAS, DANOS, CONDICOES, ALINHAMENTOS, ACOES, bonusProficiencia, xpDoND, lerND, numOuNulo, tipoEn, parteDano, parseAcao, listaDefesa, aplicarExtras, extrasDeMonstro, htmlExtras, montarFormulario, lerExtras, preencherExtras, limparExtras };
})();
