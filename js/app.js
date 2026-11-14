  (async () => {
    const perguntar = (m, o) => (typeof CONFIRMAR === "function" ? CONFIRMAR(m, o) : Promise.resolve(confirm(m)));
    const contaInicial=window.nuvem&&nuvem.usuario()?.id;
    if(window.nuvem)nuvem.aoMudar(u=>{if(u?.id!==contaInicial)location.reload();});
    const $ = (s) => document.querySelector(s);
    let D;
    try { D = await fetch("dados/srd-pt.json").then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }); }
    catch (e) { if (window.ESQ) window.ESQ.erro($("#blist"), "Não consegui carregar o catálogo 2014.", () => location.reload(), " Seus dados locais continuam intactos."); else $("#blist").textContent="Não consegui carregar o catálogo 2014. Recarregue quando houver conexão."; throw e; }
    /* fotos públicas dos monstros da API (pasta fotos/ do site); as criações próprias nunca entram aqui */
    let PUB = new Set();
    try { const r = await fetch("fotos/index.json", { cache: "no-cache" }); if (r.ok) PUB = new Set(await r.json()); } catch (_) {}
    let CF = [];
    try { const r = await fetch("dados/habilidades.json"); if (r.ok) CF = (await r.json()).filter(EDICOES.permitida); } catch (_) {}
    let CFT = {};
    try { const r = await fetch("dados/habilidades-pt.json"); if (r.ok) CFT = await r.json(); } catch (_) {}
    const pubName = (k) => "fotos/" + String(k).replace(/[^\w.-]/g, "_") + ".jpg";
    const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const mod = (n) => (n >= 0 ? "+" : "") + n, FR = { 0.125: "1/8", 0.25: "1/4", 0.5: "1/2" }, cr = (v) => FR[v] || v;
    const nz = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const fm = (n) => (n * 0.3).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " m";
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const rx = (k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const SZ = { Tiny: "Miúdo", Small: "Pequeno", Medium: "Médio", Large: "Grande", Huge: "Enorme", Gargantuan: "Imenso" };
    const TP = { Aberration: "Aberração", Beast: "Fera", Celestial: "Celestial", Construct: "Constructo", Dragon: "Dragão", Elemental: "Elemental", Fey: "Feérico", Fiend: "Diabo", Giant: "Gigante", Humanoid: "Humanoide", Monstrosity: "Monstruosidade", Ooze: "Gosma", Plant: "Planta", Undead: "Morto-vivo" };
    const SK = { acrobatics: "Acrobacia", animal_handling: "Lidar com Animais", arcana: "Arcanismo", athletics: "Atletismo", deception: "Enganação", history: "História", insight: "Intuição", intimidation: "Intimidação", investigation: "Investigação", medicine: "Medicina", nature: "Natureza", perception: "Percepção", performance: "Atuação", persuasion: "Persuasão", religion: "Religião", sleight_of_hand: "Prestidigitação", stealth: "Furtividade", survival: "Sobrevivência" };
    const SCH = { Abjuration: "Abjuração", Conjuration: "Conjuração", Divination: "Adivinhação", Enchantment: "Encantamento", Evocation: "Evocação", Illusion: "Ilusão", Necromancy: "Necromancia", Transmutation: "Transmutação" };
    const SPD = { walk: "caminhada", burrow: "escavação", climb: "escalada", fly: "voo", swim: "natação", hover: "planar" };
    const ABIL = [["strength", "FOR"], ["dexterity", "DES"], ["constitution", "CON"], ["intelligence", "INT"], ["wisdom", "SAB"], ["charisma", "CAR"]];
    const GRP = { ACTION: "Ações", BONUS_ACTION: "Ações bônus", REACTION: "Reações", LEGENDARY_ACTION: "Ações lendárias", LAIR_ACTION: "Ações de covil" };
    const W = { acid: "ácido", bludgeoning: "contundente", cold: "frio", fire: "fogo", force: "energético", lightning: "elétrico", necrotic: "necrótico", piercing: "perfurante", poison: "venenoso", psychic: "psíquico", radiant: "radiante", slashing: "cortante", thunder: "trovejante",
      blinded: "cego", charmed: "enfeitiçado", deafened: "surdo", exhaustion: "exaustão", frightened: "amedrontado", grappled: "agarrado", incapacitated: "incapacitado", invisible: "invisível", paralyzed: "paralisado", petrified: "petrificado", poisoned: "envenenado", prone: "caído", restrained: "contido", stunned: "atordoado", unconscious: "inconsciente",
      "from nonmagical attacks": "de ataques não mágicos", "from nonmagical weapons": "de armas não mágicas", "nonmagical attacks": "ataques não mágicos", "that aren't silvered": "que não sejam de prata", "that aren't adamantine": "que não sejam de adamante", nonmagical: "não mágicos", and: "e", or: "ou", from: "de",
      common: "Comum", abyssal: "Abissal", aquan: "Aquan", auran: "Auran", celestial: "Celestial", draconic: "Dracônico", "deep speech": "Dialeto Obscuro", druidic: "Druídico", dwarvish: "Anão", elvish: "Élfico", giant: "Gigante", gnomish: "Gnômico", goblin: "Goblin", gnoll: "Gnoll", halfling: "Pequenino", ignan: "Ignan", infernal: "Infernal", orc: "Orc", primordial: "Primordial", sylvan: "Silvestre", terran: "Terran", undercommon: "Subcomum", "thieves' cant": "Gíria dos Ladrões", telepathy: "telepatia", understands: "entende", "but can't speak": "mas não pode falar",
      "natural armor": "armadura natural", "leather armor": "armadura de couro", "studded leather": "couro batido", "studded leather armor": "armadura de couro batido", "chain mail": "cota de malha", "chain shirt": "camisa de cota de malha", "scale mail": "brunea", breastplate: "peitoral", "half plate": "meia-armadura", "plate armor": "armadura de placas", plate: "armadura de placas", "hide armor": "armadura de peles", "padded armor": "armadura acolchoada", "ring mail": "cota de anéis", "splint armor": "cota de talas", shield: "escudo", "mage armor": "armadura arcana",
      instantaneous: "instantânea", "up to": "até", minutes: "minutos", minute: "minuto", hours: "horas", hour: "hora", rounds: "rodadas", round: "rodada", days: "dias", day: "dia", "until dispelled": "até ser dissipada", "until dispelled or triggered": "até ser dissipada ou ativada", special: "especial", bonus_action: "ação bônus", "bonus action": "ação bônus", action: "ação", reaction: "reação", self: "pessoal", touch: "toque", sight: "visão", unlimited: "ilimitado",
      recharge: "Recarga", costs: "Custa", actions: "Ações", "recharges after a short or long rest": "Recarrega após descanso curto ou longo" };

    Object.assign(W, { "in lair": "no covil", lair: "covil", "the languages it knew in life": "os idiomas que conhecia em vida", "but can't speak it": "mas não pode falar", "languages": "idiomas", "any": "qualquer", "one": "um", "two": "dois", "three": "três", "four": "quatro", "of its choice": "à sua escolha" });
    const mk = (dict) => { const re = new RegExp("(?<![\\p{L}_])(" + Object.keys(dict).sort((a, b) => b.length - a.length).map(rx).join("|") + ")(?![\\p{L}_])", "giu"); return (s) => String(s ?? "").replace(re, (x) => dict[x.toLowerCase()] ?? x); };
    const trW = mk(W);
    const tr = (s) => trW(s).replace(/(\d+(?:\.\d+)?)\s*(?:ft\.?|feet)/gi, (_, n) => fm(+n)).replace(/, (e|ou) /g, " $1 ");
    const trAL = mk({ unaligned: "sem tendência", "any alignment": "qualquer tendência", "any non-good alignment": "qualquer tendência não boa", "any non-lawful alignment": "qualquer tendência não leal", "any chaotic alignment": "qualquer tendência caótica", "any evil alignment": "qualquer tendência má", "non-good": "não bom", "non-lawful": "não leal", typically: "geralmente", usually: "geralmente", or: "ou", and: "e", lawful: "leal", chaotic: "caótico", neutral: "neutro", good: "bom", evil: "mau", alignment: "tendência" });
    const AL = (s) => { s = String(s || "").toLowerCase().trim(); if (!s || s === "—") return s || ""; return cap(trAL(s.replace(/\b(lawful|chaotic|neutral) (good|evil|neutral)\b/g, "$1 e $2"))); };
    const X = { bite: "Mordida", claw: "Garra", claws: "Garras", tail: "Cauda", slam: "Pancada", sting: "Ferrão", gore: "Chifrada", hooves: "Cascos", tentacle: "Tentáculo", tentacles: "Tentáculos", fist: "Punho", "unarmed strike": "Ataque Desarmado", longsword: "Espada Longa", shortsword: "Espada Curta", scimitar: "Cimitarra", shortbow: "Arco Curto", longbow: "Arco Longo", dagger: "Adaga", greataxe: "Machado Grande", greatsword: "Montante", spear: "Lança", javelin: "Azagaia", mace: "Maça", quarterstaff: "Bastão", club: "Clava", greatclub: "Clava Grande", rapier: "Rapieira", handaxe: "Machadinha", morningstar: "Maça Estrela", warhammer: "Martelo de Guerra", battleaxe: "Machado de Batalha", halberd: "Alabarda", trident: "Tridente", net: "Rede", sling: "Funda", whip: "Chicote", "light crossbow": "Besta Leve", "heavy crossbow": "Besta Pesada", "hand crossbow": "Besta de Mão", pike: "Pique", glaive: "Glaive", maul: "Malho", flail: "Mangual", spellcasting: "Conjuração", multiattack: "Ataque Múltiplo" };

    const fname = (n) => String(n).replace(/\s*\(.*\)\s*$/, "").trim().toLowerCase();
    const nm = (n) => { const m = String(n).match(/^(.*?)(\s*\(.*\))?$/), b = m[1].trim(), l = b.toLowerCase(); return (D.F[l]?.n || X[l] || b) + (m[2] ? " " + tr(m[2].trim()) : ""); };
    const nmA = (a) => { let n = nm(a.name); const u = a.usage_limits;
      if (u?.type === "RECHARGE_ON_ROLL" && !/recharge/i.test(a.name)) n += ` (Recarga ${u.param}–6)`;
      else if (u && /DAY/i.test(u.type || "") && u.param && !/\/day/i.test(a.name)) n += ` (${u.param}/dia)`;
      if (a.action_type === "LEGENDARY_ACTION" && a.legendary_action_cost > 1) n += ` (Custa ${a.legendary_action_cost} ações)`;
      return n; };
    const AB = { strength: "Força", dexterity: "Destreza", constitution: "Constituição", intelligence: "Inteligência", wisdom: "Sabedoria", charisma: "Carisma" };
    const CLS = { wizard: "mago", cleric: "clérigo", druid: "druida", bard: "bardo", sorcerer: "feiticeiro", warlock: "bruxo", paladin: "paladino", ranger: "patrulheiro" };
    const TG = { "one target": "um alvo", "one creature": "uma criatura", "one creature or object": "uma criatura ou objeto", "each target": "cada alvo", "one tail target": "um alvo" };
    const distM = (x) => x.split("/").map((n) => (+n * 0.3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })).join("/") + " m";
    const SHP = { cone: "cone", line: "linha", sphere: "esfera", cube: "cubo", emanation: "emanação", cylinder: "cilindro", radius: "raio" };

    /* assinatura numérica: só aceitamos tradução pronta se dados/CD/PV batem com o original */
    const sig = (s) => (String(s).match(/\d+d\d+(?:\s*[+-]\s*\d+)?|(?:DC|CD)\s*\d+|\d+(?=\s*(?:hit points?|pontos? de vida))/gi) || []).map((x) => x.replace(/\s+/g, "").replace(/^(dc|cd)/i, "dc").toLowerCase()).sort().join("|");

    /* ataques e salvaguardas: traduz as partes de fórmula */
    function trAtk(d) {
      let s = d, ok = false; const kd = { melee: "Corpo a Corpo", ranged: "à Distância", "melee or ranged": "Corpo a Corpo ou à Distância" };
      s = s.replace(/^(Melee or Ranged|Melee|Ranged) (Weapon|Spell) Attack:\s*([+-]\d+) to hit,\s*(?:reach|range)\s*([\d/]+)\s*(?:ft\.?|feet)?(?:,\s*([^.]*))?\.\s*(?:Hit:\s*)?/i, (_, k, w, h, dist, tg) => { ok = true; return `Ataque ${kd[k.toLowerCase()]} com ${/weapon/i.test(w) ? "Arma" : "Magia"}: ${h} para atingir, alcance ${distM(dist)}${tg ? ", " + (TG[tg.toLowerCase()] || tg) : ""}. Acerto: `; });
      s = s.replace(/^(Melee or Ranged|Melee|Ranged) Attack Roll:\s*([+-]\d+),\s*(?:reach|range)\s*([\d/]+)\s*(?:ft\.?|feet)\.?\s*/i, (_, k, h, dist) => { ok = true; return `Ataque ${kd[k.toLowerCase()]}: ${h} para atingir, alcance ${distM(dist)}. Acerto: `; });
      s = s.replace(/(\d+)\s*\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)\s*([A-Za-z]+)\s+damage/gi, (_, a, b, t) => { ok = true; return `${a} (${b.replace(/\s+/g, " ")}) de dano ${/^(fire|cold)$/i.test(t) ? "de " : ""}${trW(t.toLowerCase())}`; });
      s = s.replace(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw:\s*DC\s*(\d+)/gi, (_, a, n) => { ok = true; return `Salvaguarda de ${AB[a.toLowerCase()]}: CD ${n}`; });
      s = s.replace(/\bFailure:\s*/g, "Falha: ").replace(/\bSuccess:\s*/g, "Sucesso: ").replace(/\bHalf damage\b/gi, "metade do dano").replace(/\bplus (\d)/g, "mais $1").replace(/\b[Ee]ach creature in an? /g, (x) => (x[0] === "E" ? "Cada" : "cada") + " criatura em ");
      s = s.replace(/(\d+)-foot[- ](Cone|Line|Sphere|Cube|Emanation|Cylinder|Radius)/gi, (_, n, sh) => `${SHP[sh.toLowerCase()]} de ${fm(+n)}`);
      return ok ? s.replace(/(\d+(?:\.\d+)?)\s*(?:ft\.?|feet)/gi, (_, n) => fm(+n)) : null;
    }
    /* conjuração: traduz a estrutura e transforma os nomes das magias em links */
    function trSpell(s) {
      let hit = false;
      const names = (items) => items.split(/,\s*/).map((x) => { const b = x.replace(/\s*\(.*\)$/, "").trim(), e = D.S[b.toLowerCase()], extra = tr(x.slice(b.length)); if (e) hit = true; return e ? { h: `<a class="splink" data-spopen="${esc(b.toLowerCase())}">${esc(e[0].toLowerCase())}</a>${esc(extra)}`, p: e[0].toLowerCase() + extra } : { h: esc(x), p: x }; });
      const out = s.split(/\n+/).map((ln) => {
        let m; ln = ln.replace(/^[-•]\s*/, "");
        const list = (label, items) => { const r = names(items); return { h: label + r.map((x) => x.h).join(", "), p: label + r.map((x) => x.p).join(", ") }; };
        if ((m = ln.match(/^Cantrips \(at will\):\s*(.*)$/i))) return list("Truques (à vontade): ", m[1]);
        if ((m = ln.match(/^(\d+)(?:st|nd|rd|th) level \((\d+) slots?\):\s*(.*)$/i))) return list(`${m[1]}º círculo (${m[2]} espaço${+m[2] > 1 ? "s" : ""}): `, m[3]);
        if ((m = ln.match(/^At will:\s*(.*)$/i))) return list("À vontade: ", m[1]);
        if ((m = ln.match(/^(\d+)\/day( each)?:\s*(.*)$/i))) return list(`${m[1]}/dia${m[2] ? " cada" : ""}: `, m[3]);
        if ((m = ln.match(/casts one of the following spells(?:, requiring no (\w+) components)?(?: and)? using (\w+) as the spellcasting ability \(spell save DC (\d+)(?:, ([+-]\d+) to hit with spell attacks)?\):?/i))) { hit = true; const t = `A criatura conjura uma das magias a seguir${m[1] ? ", sem precisar de componentes " + (m[1].toLowerCase() === "material" ? "materiais" : m[1].toLowerCase()) : ""}, usando ${AB[m[2].toLowerCase()] || m[2]} como atributo de conjuração (CD de resistência de magia ${m[3]}${m[4] ? `, ${m[4]} para atingir com ataques de magia` : ""}):`; return { h: esc(t), p: t }; }
        if ((m = ln.match(/(\d+)(?:st|nd|rd|th)-level spellcaster\. (?:Its|His|Her|Their) spellcasting ability is (\w+) \(spell save DC (\d+)(?:, ([+-]\d+) to hit with spell attacks)?\)\.\s*[^.]{2,40}? (?:has|have) the following (\w+) spells prepared:?/i))) { hit = true; const t = `A criatura é um conjurador de ${m[1]}º nível. Seu atributo de conjuração é ${AB[m[2].toLowerCase()] || m[2]} (CD de resistência de magia ${m[3]}${m[4] ? `, ${m[4]} para atingir com ataques de magia` : ""}). Possui as seguintes magias de ${CLS[m[5].toLowerCase()] || m[5]} preparadas:`; return { h: esc(t), p: t }; }
        if ((m = ln.match(/innate spellcasting ability is (\w+) \(spell save DC (\d+)(?:, ([+-]\d+) to hit with spell attacks)?\)\.\s*[^.]{2,40}? can innately cast the following spells(, requiring no material components)?:?/i))) { hit = true; const t = `Seu atributo de conjuração inata é ${AB[m[1].toLowerCase()] || m[1]} (CD de resistência de magia ${m[2]}${m[3] ? `, ${m[3]} para atingir com ataques de magia` : ""}). Pode conjurar inatamente as seguintes magias${m[4] ? ", sem precisar de componentes materiais" : ""}:`; return { h: esc(t), p: t }; }
        return { h: esc(ln), p: ln };
      });
      return hit ? { html: out.map((x) => x.h).join("\n"), plain: out.map((x) => x.p).join("\n") } : null;
    }
    const BLOCK = new Set(["multiattack", "spellcasting", "innate spellcasting", "actions", "legendary actions", "reactions", "bonus actions", "variant"]);
    const tokRe = { en: /(\d+)\s*\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)|\b(\d+d\d+(?:\s*[+-]\s*\d+)?)|DC\s*(\d+)|(\d+)[-\s]?(?:foot|feet|ft\.?)|(\d+)(?=\s*hit points?)/gi, pt: /(\d+)\s*\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)|\b(\d+d\d+(?:\s*[+-]\s*\d+)?)|CD\s*(\d+)|(\d+(?:,\s?\d+)?)\s*metros?|(\d+)(?=\s*pontos? de vida)/gi };
    const mtxt = (ft) => { const v = ft * 0.3; return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + (v <= 1.5 ? " metro" : " metros"); };
    function enToks(t) { const r = []; for (const x of t.matchAll(tokRe.en)) r.push(x[1] ? ["D", `${x[1]} (${x[2].replace(/\s+/g, " ")})`] : x[3] ? ["d", x[3].replace(/\s+/g, " ")] : x[4] ? ["c", x[4]] : x[5] ? ["m", mtxt(+x[5])] : ["h", x[6]]); return r; }
    function skeleton(c) { const types = []; const sk = c.replace(tokRe.pt, (m0, a, b, d, cd, mt, h) => { const ty = a ? "D" : d ? "d" : cd ? "c" : mt ? "m" : "h"; types.push(ty); return cd ? `CD \u0001${types.length - 1}\u0001` : mt ? `\u0001${types.length - 1}\u0001` : h ? `\u0001${types.length - 1}\u0001` : `\u0001${types.length - 1}\u0001`; }); return { sk, types }; }
    function fillSkel(c, orig) {
      const { sk, types } = skeleton(c), en = enToks(orig);
      if (!types.length && !en.length) return c;
      if (types.join("") !== en.map((x) => x[0]).sort(() => 0).join("") && [...types].sort().join("") !== en.map((x) => x[0]).sort().join("")) return null;
      const pool = {}; en.forEach(([ty, v]) => (pool[ty] ??= []).push(v));
      return sk.replace(/\u0001(\d+)\u0001/g, (_, k) => pool[types[+k]].shift());
    }
    function descInfo(name, desc, mon) {
      const orig = String(desc || "").replace(/\*+/g, ""), mn = pt(mon) || mon.name, tp = (TP[mon.type?.name] || "criatura").toLowerCase();
      if (/spellcasting/i.test(name)) { const h = trSpell(orig); if (h) return { ...h, orig, tr: true }; }
      let t = null;
      const f = D.F[fname(name)];
      if (f && !BLOCK.has(fname(name))) {
        for (const c of f.c) { const r = fillSkel(c, orig); if (r) { const v = r.replace(/\{creatures?\}|\{criatura\}/g, mn).replace(/\{type\}/g, tp); if (v.length / orig.length > 0.75 && v.length / orig.length < 1.7) { t = v; break; } } }
      }
      if (!t) t = trAtk(orig);
      return t ? { html: esc(t), plain: t, orig, tr: true } : { html: esc(orig), plain: orig, orig, tr: false };
    }
    /* rolagens: valores lidos do texto da ação (acerto e dano por arma) */
    function rollInfo(a) {
      const d = String(a.desc || "").replace(/\*+/g, ""), h = d.match(/Attack(?: Roll)?:\s*([+-]\d+)/i) || d.match(/([+-]\d+) to hit/i);
      const dmg = [...d.matchAll(/(\d+)\s*\((\d+)d(\d+)(?:\s*([+-])\s*(\d+))?\)\s*([A-Za-z]+)?\s*damage/gi)].map((x) => ({ n: +x[2], f: +x[3], b: x[5] ? (x[4] === "-" ? -1 : 1) * +x[5] : 0, t: x[6] || "" }));
      let hit = h ? +h[1] : null; const at = (a.attacks || [])[0];
      const doTexto = dmg.length;
      if (at) { if (hit == null && at.to_hit_mod != null) hit = at.to_hit_mod; if (!dmg.length && at.damage_die_count) dmg.push({ n: at.damage_die_count, f: +String(at.damage_die_type).slice(1), b: at.damage_bonus || 0, t: at.damage_type?.name || at.extra_damage_type?.name || "" }); }
      if (at && !doTexto && dmg.length) {                                           // dano estruturado (ficha própria): segundo e demais tipos de dano
        if (at.extra_damage_die_count) dmg.push({ n: at.extra_damage_die_count, f: +String(at.extra_damage_die_type).slice(1), b: at.extra_damage_bonus || 0, t: at.extra_damage_type?.name || "" });
        if (Array.isArray(at.more_damage)) for (const x of at.more_damage) dmg.push({ n: x.n, f: x.f, b: x.b || 0, t: x.t || "" });
      }
      return hit == null && !dmg.length ? null : { hit, dmg };
    }
    const dstr = (x) => `${x.n}d${x.f}${x.b ? ` ${x.b > 0 ? "+" : "-"} ${Math.abs(x.b)}` : ""}${x.t ? " " + trW(x.t.toLowerCase()) : ""}`;
    const rollLine = (r) => [r.hit != null ? `Acerto ${mod(r.hit)}` : "", r.dmg.length ? `Dano ${r.dmg.map(dstr).join(" + ")} (média ${r.dmg.reduce((s, x) => s + Math.floor(x.n * (x.f + 1) / 2) + x.b, 0)})` : ""].filter(Boolean).join(" · ");
    function doRoll(r) {
      const parts = []; let d20;
      if (r.hit != null) { d20 = 1 + Math.floor(Math.random() * 20); parts.push(`Acerto: <b>${d20 + r.hit}</b> (d20 ${d20} ${mod(r.hit)})${d20 === 20 ? " — crítico!" : d20 === 1 ? " — falha crítica" : ""}`); }
      if (r.dmg.length) { let tot = 0; const det = r.dmg.map((x) => { let s = 0; for (let i = 0; i < x.n; i++) s += 1 + Math.floor(Math.random() * x.f); tot += s + x.b; return `${s + x.b} ${x.t ? trW(x.t.toLowerCase()) : ""}`.trim(); }); parts.push(`Dano: <b>${tot}</b> (${det.join(" + ")})`); }
      return parts.join(" · ");
    }

    const CAT = { monster: "Monstro", player: "Personagem", npc: "NPC" };
    const catOf = (m) => m.cat || "monster";
    const CRV = (m) => m.challenge_rating_text ?? cr(m.challenge_rating ?? parseFloat(m.challenge_rating_decimal));
    const lvl = (m) => catOf(m) === "monster" ? "ND " + CRV(m) : "Nível " + (m.level ?? "—");
    const srcOf = (m) => m.document?.display_name || m.document?.key || "?";
    const illu = (m) => typeof m.illustration === "string" ? m.illustration : (m.illustration && (m.illustration.url || m.illustration.image)) || "";
    const av = (m, size = 36) => { const global=m&&window.CATALOGO?.imagem('monstro',m.key);const src = m && (global!==undefined?global:((PH[m.key]) || (!m.custom && PUB.has(m.key) ? pubName(m.key) : "") || illu(m))); const st = `width:${size}px;height:${size}px`; return src ? `<img class="av" style="${st}" src="${esc(src)}" alt="" loading="lazy">` : `<span class="av av0" style="${st};font-size:${Math.round(size * 0.45)}px">${esc(((m && (pt(m) || m.name)) || "?").charAt(0).toUpperCase())}</span>`; };
    const tsz = (m) => { const t = TP[m.type?.name] || m.type?.name || "", z = SZ[m.size?.name] || m.size?.name || ""; return t && z ? `${t} (${z})` : t || z; };

    let TR = {}; try { TR = JSON.parse(localStorage.getItem(acervo.chave("ini_tr")) || "{}"); } catch (_) {}
    const saveTR = () => { try { localStorage.setItem(acervo.chave("ini_tr"), JSON.stringify(TR)); } catch (_) {} };
    const pt = (m) => { const k = m.name.toLowerCase(); return window.CATALOGO?.registro('monstro',m.key)?.dados?.nomeCatalogo ?? TR[k] ?? D.M[k] ?? ""; };

    /* banco local (IndexedDB) */
    let db, ALL = [], SP = [], PH = {}, BY = {}, ABI = new Map(), curSheet = null, phKey = null, formPhoto, shown = 40, showAll = false, editKey = null, editGlobal = false, editVersion = 0, cmSpells = [];
    const rq = (r) => new Promise((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
    const done = (t) => new Promise((ok, no) => { t.oncomplete = ok; t.onerror = () => no(t.error); });
    const put = async (store, arr) => { const t = db.transaction(store, "readwrite"); arr.forEach((x) => t.objectStore(store).put(x)); await done(t); };
    const del = async (store, key) => { const t = db.transaction(store, "readwrite"); t.objectStore(store).delete(key); await done(t); };
    const status = (h) => { $("#dl-status").innerHTML = h; };
    async function reload() {
      ALL = window.CATALOGO?.monstros((await rq(db.transaction("mon").objectStore("mon").getAll())).filter(EDICOES.catalogo2014)) || [];
      SP = (await rq(db.transaction("spl").objectStore("spl").getAll())).filter(EDICOES.catalogo2014);
      PH = Object.fromEntries((await rq(db.transaction("img").objectStore("img").getAll())).map((x) => [x.key, x.data]));
      BY = Object.fromEntries(ALL.map((m) => [m.key, m]));
      ALL.sort((a, b) => a.name.localeCompare(b.name)); SP.sort((a, b) => a.name.localeCompare(b.name));
      $("#spinfo").textContent = "Catálogo D&D 2014 em português.";
      abiIndex(); buildFilter(); renderBestiary(); spSearch(); if (document.activeElement === $("#name")) sugg(); window.__ini.render();
    }
    $('#exportar-criacoes').addEventListener('click',()=>{const mon=ALL.filter(m=>m.custom),spl=SP.filter(m=>m.custom),keys=new Set(mon.map(m=>m.key)),img=Object.entries(PH).filter(([k])=>keys.has(k)).map(([key,data])=>({key,data}));const url=URL.createObjectURL(new Blob([JSON.stringify({v:1,mon,spl,img},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='minhas-criacoes.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
    /* Importar Minhas Criações: lê o JSON gerado por "Exportar" (v1); só entram criações próprias; chaves que já existem são mantidas */
    $('#importar-criacoes').addEventListener('click',()=>$('#importar-arquivo').click());
    $('#importar-arquivo').addEventListener('change',async(e)=>{const f=e.target.files&&e.target.files[0];e.target.value='';const st=$('#dl-status');if(!f)return;
      if(window.nuvem&&nuvem.usuario&&!nuvem.usuario()){st.textContent='Importar criações exige uma conta (gratuita).';return;}
      try{
        if(f.size>20*1024*1024)throw new Error('arquivo grande demais');
        const d=JSON.parse(await f.text());if(!d||d.v!==1||!Array.isArray(d.mon)||(d.spl!=null&&!Array.isArray(d.spl))||(d.img!=null&&!Array.isArray(d.img)))throw new Error('formato');
        const okM=(m)=>m&&typeof m==='object'&&m.custom===true&&typeof m.key==='string'&&/^custom_/.test(m.key)&&typeof m.name==='string'&&m.name.trim();
        const okS=(s)=>s&&typeof s==='object'&&s.custom===true&&typeof s.key==='string'&&/^custom_/.test(s.key);
        const novosM=d.mon.filter(okM).filter(m=>!BY[m.key]),novasS=(d.spl||[]).filter(okS).filter(s=>!SP.some(x=>x.key===s.key));
        const ignM=d.mon.length-novosM.length,ignS=(d.spl||[]).length-novasS.length,keys=new Set(novosM.map(m=>m.key));
        const imgs=(d.img||[]).filter(x=>x&&keys.has(x.key)&&typeof x.data==='string'&&/^data:image\//.test(x.data));
        if(novosM.length)await put('mon',novosM);if(novasS.length)await put('spl',novasS);if(imgs.length)await put('img',imgs);
        await reload();queueSync();
        st.textContent='Importado: '+novosM.length+' ficha'+(novosM.length===1?'':'s')+(novasS.length?' e '+novasS.length+' magia'+(novasS.length===1?'':'s'):'')+(ignM+ignS?'. '+(ignM+ignS)+' ignorada'+(ignM+ignS===1?'':'s')+' (já existiam ou não eram criações próprias).':'.');
      }catch(err){st.textContent='Não foi possível importar: o arquivo precisa ser um "minhas-criacoes.json" exportado por aqui.';}
    });
    /* o campo Nome de “Adicionar combatente” é a busca do bestiário */
    const match = (m, q) => nz(m.name + " " + pt(m) + " " + (m.subtitle || "")).includes(q);
    const sug = $("#sug");
    function sugg() {
      const raw = $("#name").value.trim(), q = nz(raw);
      sug.hidden = q.length < 2; if (q.length < 2) return;
      const r = ALL.filter((m) => match(m, q)).slice(0, 12);
      sug.innerHTML = r.map((m) => `<div data-sug="${esc(m.key)}">${av(m, 22)}${esc(pt(m) || m.name)}${pt(m) ? ` <span class="muted">(${esc(m.name)})</span>` : ""} <span class="muted">· ${CAT[catOf(m)]} · ${lvl(m)} · CA ${m.armor_class} · PV ${m.hit_points} · ${esc(srcOf(m))}</span></div>`).join("");
    }
    $("#name").addEventListener("input", () => { if (window.__ini.pending) { $("#ini-mod").value = 0; limparPrevia(); } window.__ini.pending = ""; sugg(); });
    $("#name").addEventListener("focus", sugg);
    const uniq = (base) => {
      const re = new RegExp("^" + rx(base) + "(?: (\\d+))?$");
      let maior = 0;
      for (const c of window.__ini.list()) { const m = c.name.match(re); if (m) maior = Math.max(maior, m[1] ? +m[1] : 1); }
      return maior ? `${base} ${maior + 1}` : base;
    };
    const iniBonus = (m) => m.initiative_bonus ?? Math.floor(((m.ability_scores?.dexterity ?? 10) - 10) / 2);
    const rollInit = (m) => 1 + Math.floor(Math.random() * 20) + iniBonus(m);
    const sinal = (n) => (n >= 0 ? "+" : "-") + Math.abs(n);
    /* modificador, d20 e resultado ficam na faixa do monstro selecionado; sem monstro (combatente manual), voltam para o formulário */
    function posicionarIni(naFaixa) {
      const ini = document.querySelector("#add-form .add-ini"), p = $("#add-previa"), wrap = document.querySelector("#add-form .add-wrap"); if (!ini || !p || !wrap) return;
      if (naFaixa) { if (ini.parentNode !== p) p.appendChild(ini); } else if (ini.parentNode !== wrap.parentNode) wrap.parentNode.insertBefore(ini, wrap);
    }
    function limparPrevia() { posicionarIni(false); const p = $("#add-previa"); if (p) { p.hidden = true; const d = p.querySelector(".add-previa-dados"); if (d) d.innerHTML = ""; } const c = $("#add-conta"); if (c) c.textContent = ""; }
    function pick(k) {
      const m = ALL.find((x) => x.key === k); if (!m) return;
      $("#name").value = uniq(pt(m) || m.name); $("#kind").value = CAT[catOf(m)];
      $("#ini-mod").value = iniBonus(m); $("#initiative").value = ""; $("#add-conta").textContent = "";   // a iniciativa sai do botão d20 ou do seu dado
      $("#hp").value = $("#maxHp").value = m.hit_points; $("#ac").value = m.armor_class;
      window.__ini.pending = m.key; sug.hidden = true;
      const p = $("#add-previa"); p.hidden = false; posicionarIni(true);
      p.querySelector(".add-previa-dados").innerHTML = `${av(m, 56)}<div class="add-previa-info"><b>${esc(pt(m) || m.name)}</b>${pt(m) ? `<span class="muted">${esc(m.name)}</span>` : ""}<span>CA <b>${m.armor_class}</b></span><span>PV <b>${m.hit_points}</b></span></div>`;
    }
    /* d20 + modificador: usa a rolagem compartilhada (js/rolagens.js) e mostra a conta; o resultado continua editável */
    const sincRolagem = () => { const on = window.__ini.rolagemAuto ? window.__ini.rolagemAuto() : true, b = $("#add-d20"); b.disabled = !on; b.title = on ? "Rolar 1d20 + modificador" : "Rolagem automática desligada: digite a iniciativa"; };
    window.addEventListener("ini:rolagem", sincRolagem); sincRolagem();
    $("#add-d20").addEventListener("click", () => {
      if (window.__ini.rolagemAuto && !window.__ini.rolagemAuto()) { $("#add-conta").textContent = "Rolagem automática desligada: digite a iniciativa."; return; }
      const mod = Math.round(Number($("#ini-mod").value) || 0), r = window.ROLAGENS.rolar("1d20", mod);
      $("#initiative").value = r.total; $("#add-conta").textContent = `d20 ${r.dados[0]} ${sinal(mod).replace("+", "+ ").replace("-", "- ")} = ${r.total}`;
    });
    $("#initiative").addEventListener("input", () => { $("#add-conta").textContent = $("#initiative").value === "" ? "" : "Valor informado por você"; });
    $("#add-form").addEventListener("submit", () => { limparPrevia(); });
    /* ---- Monstros recentes: últimos 15 efetivamente adicionados ao combate (js/recentes.js); clicar usa o mesmo caminho da pesquisa (pick) ---- */
    const REC = window.RECENTES, recBox = $("#recentes"), recBtn = $("#recentes-btn"), chaveRec = () => acervo.chave("ini_recentes");
    function recentesValidos() {
      const lista = REC ? REC.ler(chaveRec()) : []; if (!ALL.length) return lista;                     // catálogo ainda carregando: não descarta nada
      const ok = lista.filter((k) => BY[k]); if (ok.length !== lista.length) REC.gravar(chaveRec(), ok);   // referência a monstro excluído some do histórico sem quebrar nada
      return ok;
    }
    function renderRecentes() {
      if (!recBox) return; const lista = recentesValidos();
      recBox.innerHTML = lista.length
        ? `<div class="rec-cab"><span class="muted">Usados recentemente</span><button type="button" class="small subtle" data-rec-limpar>Limpar recentes</button></div>` + lista.map((k) => { const m = BY[k], nome = pt(m) || m.name; return `<div class="rec-item" data-rec="${esc(k)}" role="button" tabindex="0" aria-label="Usar ${esc(nome)}">${av(m, 22)}<span class="rec-nome">${esc(nome)}</span><span class="muted rec-meta">${CAT[catOf(m)]} · ${lvl(m)}</span><button type="button" class="small subtle rec-x" data-rec-x="${esc(k)}" aria-label="Remover ${esc(nome)} dos recentes" title="Remover dos recentes">${window.ico ? window.ico("x") : "x"}</button></div>`; }).join("")
        : `<p class="muted rec-vazio">Nenhum monstro utilizado recentemente.</p>`;
    }
    function abrirRecentes(abrir) {
      if (!recBox || !recBtn) return; recBox.hidden = !abrir; recBtn.setAttribute("aria-expanded", abrir ? "true" : "false");
      if (abrir) { sug.hidden = true; renderRecentes(); if (recBox.scrollIntoView) recBox.scrollIntoView({ block: "nearest" }); }
    }
    if (recBtn) {
      recBtn.addEventListener("click", () => abrirRecentes(recBox.hidden));
      recBox.addEventListener("click", async (e) => {
        const x = e.target.closest("[data-rec-x]"); if (x) { e.stopPropagation(); REC.remover(chaveRec(), x.dataset.recX); renderRecentes(); return; }   // sem confirmação
        if (e.target.closest("[data-rec-limpar]")) { if (await perguntar("Apagar o histórico de monstros recentes? Os combates, as fichas e os monstros do bestiário não são afetados.", { titulo: "Limpar recentes", ok: "Limpar", perigo: true })) { REC.limpar(chaveRec()); renderRecentes(); } return; }
        const it = e.target.closest("[data-rec]"); if (it) { pick(it.dataset.rec); abrirRecentes(false); const n = $("#name"); if (n && n.focus) n.focus({ preventScroll: true }); }
      });
      recBox.addEventListener("keydown", (e) => { const it = e.target.closest && e.target.closest("[data-rec]"); if (it && e.target === it && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); pick(it.dataset.rec); abrirRecentes(false); } });
      document.addEventListener("click", (e) => { if (!recBox.hidden && !e.target.closest("#recentes, #recentes-btn")) abrirRecentes(false); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !recBox.hidden) { abrirRecentes(false); recBtn.focus(); } });
      $("#name").addEventListener("input", () => { if (!recBox.hidden) abrirRecentes(false); });
    }
    window.addEventListener("ini:adicionado", (e) => { const k = e.detail && e.detail.key; if (!REC || !k || !BY[k]) return; REC.registrar(chaveRec(), k); if (recBox && !recBox.hidden) renderRecentes(); });
    const ABIL_EN = { for: "strength", des: "dexterity", con: "constitution", int: "intelligence", sab: "wisdom", car: "charisma" };
    window.__ini.salvaDe = (key, ab) => { const m = ALL.find((x) => x.key === key), k = ABIL_EN[ab]; if (!m || !k) return null; const v = m.saving_throws?.[k] ?? m.modifiers?.[k]; return Number.isFinite(Number(v)) ? Number(v) : null; };
    window.__ini.defesasDe = (key) => {
      const m = ALL.find((x) => x.key === key); if (!m) return null; const r = m.resistances_and_immunities || {}, ks = (campo) => (r[campo] || []).map((x) => x.key).filter(Boolean);
      return { resistencias: ks("damage_resistances"), imunidades: ks("damage_immunities"), vulnerabilidades: ks("damage_vulnerabilities"), naoMagico: /nonmagical/i.test((r.damage_resistances_display || "") + (r.damage_immunities_display || "")) };
    };
    window.__ini.habilidadesQueda = (c) => {                       // traços de criaturas que mudam a queda a 0 PV (ex.: Fortitude dos Mortos-Vivos)
      const m = c && c.key && ALL.find((x) => x.key === c.key); if (!m) return [];
      return (m.traits || []).some((t) => /Undead Fortitude/i.test(t.name)) ? [{ id: "fortitude-morta-viva", nome: "Fortitude dos Mortos-Vivos", tipo: "salva", cdBase: 5, cdPorDano: true, excecoes: true, usado: 0, limite: null }] : [];
    };
    window.__ini.bonusIniciativaDe = (c) => { const m = c && c.key && ALL.find((x) => x.key === c.key); return m ? iniBonus(m) : undefined; };
    /* salvaguarda exigida pela ação: ficha própria (a.save) ou texto do catálogo ("DC 13 Constitution saving throw") */
    const SV_ATR = { strength: "for", dexterity: "des", constitution: "con", intelligence: "int", wisdom: "sab", charisma: "car" };
    function saveDe(a) {
      if (a.save && a.save.dc && SV_ATR[a.save.ability]) return { cd: +a.save.dc, atr: SV_ATR[a.save.ability] };
      const x = String(a.desc || "").match(/DC\s*(\d+)\s*(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s*saving throw/i);
      return x ? { cd: +x[1], atr: SV_ATR[x[2].toLowerCase()] } : null;
    }
    /* Ataque Múltiplo / Multiattack: "dois ataques com garras" -> a ação Garra vale 2 ataques (só quando o texto diz um número e não separa por "um ... e um ...") */
    const semAc = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const NUM_AT = { two: 2, three: 3, four: 4, dois: 2, duas: 2, tres: 3, quatro: 4 };
    function vezesDe(m, acoes) {
      const mm = (m.actions || []).find((a) => /^(multiattack|ataque multiplo)/.test(semAc(a.name))); if (!mm) return;
      const d = semAc(mm.desc), x = d.match(/\b(two|three|four|dois|duas|tres|quatro)\b[^.]*?\b(attacks?|ataques?)\b/); if (!x || /\b(one|um|uma)\b/.test(d.slice(x.index + x[0].length))) return;
      const cand = acoes.filter((a) => a.hit != null && d.includes(semAc(a._n).slice(0, Math.max(3, semAc(a._n).length - 1))));
      if (cand.length === 1) cand[0].vezes = NUM_AT[x[1]];
    }
    window.__ini.acoesDe = (key) => {
      const m = ALL.find((x) => x.key === key); if (!m) return [];
      const lista = (m.actions || []).map((a) => { const r = rollInfo(a); return r ? { nome: nmA(a), hit: r.hit, dmg: r.dmg.map((x) => ({ ...x, t: x.t ? trW(x.t.toLowerCase()) : "" })), save: saveDe(a), metade: /half as much|half damage|metade/i.test(String(a.desc || "")), vezes: 1, _n: a.name } : null; }).filter(Boolean);
      vezesDe(m, lista); return lista;
    };
    function addMon(m, botao) {
      const nome = uniq(pt(m) || m.name);
      window.__ini.add({ name: nome, kind: CAT[catOf(m)], initiative: rollInit(m), hp: m.hit_points, maxHp: m.hit_points, ac: m.armor_class, key: m.key });
      /* resposta clara de que entrou: aviso, contagem desta criatura no combate e botão que confirma por um instante */
      const qtd = window.__ini.list().filter((c) => c.key === m.key).length;
      window.FEEDBACK?.mostrar(`“${nome}” adicionado à iniciativa.` + (qtd > 1 ? ` Já são ${qtd} desta criatura no combate.` : ""));
      if (botao) { const antes = botao.dataset.rotulo || botao.textContent; botao.dataset.rotulo = antes; botao.textContent = qtd > 1 ? "Adicionado (" + qtd + ")" : "Adicionado"; clearTimeout(botao._t); botao._t = setTimeout(() => { botao.textContent = antes; }, 1500); }
    }
    /* Meu bestiário: só aparece quando você pesquisa, filtra ou pede */
    const hay = (m) => nz([m.name, pt(m), m.subtitle, CAT[catOf(m)], m.size?.name, SZ[m.size?.name], m.type?.name, TP[m.type?.name], srcOf(m)].filter(Boolean).join(" "));
    function buildFilter() {
      const f = $("#bf"), cur = f.value, docs = [...new Set(ALL.filter((m) => !m.custom).map(srcOf))].sort();
      f.innerHTML = '<option value="">Sem filtro</option><option value="custom">Minhas criações</option><option value="monster">Só monstros</option><option value="player">Só personagens</option><option value="npc">Só NPCs</option>' + docs.map((d) => `<option value="doc:${esc(d)}">Coleção: ${esc(d)}</option>`).join("");
      f.value = [...f.options].some((o) => o.value === cur) ? cur : "";
    }
    const inF = (m, f) => !f || (f === "custom" && m.custom) || (["monster", "player", "npc"].includes(f) && catOf(m) === f) || (f.startsWith("doc:") && !m.custom && srcOf(m) === f.slice(4));
    function rowFull(m) {
      const p = pt(m), k = esc(m.key);
      return `<div class="res"><span class="lft">${av(m, 40)}<span><b>${esc(p || m.name)}</b>${p ? ` <span class="muted">(${esc(m.name)})</span>` : ""}${m.subtitle ? ` <span class="muted">— ${esc(m.subtitle)}</span>` : ""}<br><span class="muted">${CAT[catOf(m)]} · ${esc(tsz(m))} · ${lvl(m)} · CA ${m.armor_class} · PV ${m.hit_points} · ${esc(srcOf(m))}</span></span></span>
        <span class="acts"><button class="small" data-view="${k}">Ver</button><button class="small" data-ph="${k}" title="Adicionar ou trocar a foto">${ico("camera")}</button><button class="small primary" data-add="${k}">Adicionar</button>${(m.custom || window.CATALOGO?.admin()) ? `<button class="small" data-edit="${k}">Editar</button>${m.custom ? `<button class="small danger" data-del="${k}">Excluir</button>` : `<button class="small danger" data-global-del="${k}">Excluir do catálogo</button>`}` : ""}</span></div>`;
    }
    function renderGlobalDeleted() {
      let box = document.getElementById('monstros-globais-excluidos');
      if (!box) {
        box = document.createElement('section'); box.id = 'monstros-globais-excluidos';
        box.style.marginTop = '16px';
        $('#blist').insertAdjacentElement('afterend', box);
      }
      if (!window.CATALOGO?.admin()) { box.hidden = true; box.innerHTML = ''; return; }
      const lista = (window.CATALOGO.registros('monstro') || []).filter(r => r.excluido);
      box.hidden = !lista.length;
      box.innerHTML = lista.length ? `<details><summary>Monstros excluídos do catálogo global (${lista.length})</summary><div class="muted" style="margin:8px 0">Restaurar torna o monstro visível novamente para todos os usuários.</div>${lista.map(r => `<div class="res"><span>${esc(r.dados?.name || r.chave)}</span><button type="button" class="small" data-global-restore="${esc(r.chave)}">Restaurar</button></div>`).join('')}</details>` : '';
    }
    function renderBestiary() {
      const q = nz($("#bq").value.trim()), f = $("#bf").value;
      $("#ball").textContent = showAll ? "Ocultar lista" : "Mostrar tudo";
      renderGlobalDeleted();
      if (!q && !f && !showAll) { $("#bcount").textContent = ALL.length ? `${ALL.length} fichas guardadas. Pesquise, escolha um filtro ou use “Mostrar tudo”.` : "Nenhuma ficha guardada ainda."; $("#blist").innerHTML = ""; return; }
      const ws = q.split(/\s+/).filter(Boolean), list = ALL.filter((m) => inF(m, f) && ws.every((w) => hay(m).includes(w)));
      $("#bcount").textContent = `${list.length} fichas`;
      $("#blist").innerHTML = list.slice(0, shown).map(rowFull).join("") + (list.length > shown ? `<button class="small" data-more="1">Mostrar mais (${list.length - shown})</button>` : "") || '<span class="muted">Nada encontrado.</span>';
    }
    $("#bf").onchange = () => { shown = 40; renderBestiary(); };
    $("#bq").addEventListener("input", () => { shown = 40; renderBestiary(); });
    $("#ball").onclick = () => { showAll = !showAll; shown = 40; renderBestiary(); };

    /* abas laterais: ficha (direita) e magia (esquerda, ou empilhada na direita) */
    function layout() { window.PAINEIS_LAYOUT.aplicar(); }
    window.reorganizarPaineis=layout;
    let focoFicha = null;
    /* painel único: window.PAINEL (js/painel-detalhes.js) decide qual vista aparece e como voltar */
    const closeSheet = () => { window.PAINEL.fechar(); $("#tip").style.display = "none"; focoFicha?.focus?.(); };
    const voltarPainel = () => { window.PAINEL.voltar(); $("#tip").style.display = "none"; };
    window.abrirMagiaNoPainel = (id) => openSpell(id);

    /* ficha do monstro */
    const speed = (sp) => sp ? Object.entries(sp).filter(([k, v]) => k !== "unit" && v).map(([k, v]) => k === "walk" ? fm(v) : `${SPD[k] || k} ${fm(v)}`).join(", ") : "—";
    const habD = (n, i, x = "", pre = "") => `<details class="hab item" data-desc="${esc(i.plain)}"><summary><b>${esc(n)}</b></summary>${x||pre?`<div class="hab-acoes">${x}${pre}</div>`:''}<div class="full">${i.html}${i.tr && i.orig && i.orig !== i.plain ? `<div class="orig">Original: ${esc(i.orig)}</div>` : ""}</div></details>`;
    const spRow = (name, key, x = "") => { const d = D.S[String(name).toLowerCase()]; return `<div class="hab" data-spopen="${esc(key || String(name).toLowerCase())}" data-desc="${esc(d ? d[1] : "")}" style="cursor:pointer"><b>${esc(d ? d[0] : name)}</b>${d ? ` <span class="muted">(${esc(d[3] || name)})</span>` : ""}${x}</div>`; };
    const rmBtn = (m, t, ix, cf) => m.custom && cf ? ` <button type="button" class="small subtle" data-cfk="${esc(cf)}" title="Abrir a habilidade no catálogo">Abrir</button>` : "";

    /* remove uma característica, ação ou magia de uma ficha própria */
    function openSheet(k) {
      focoFicha=document.activeElement;
      const m = ALL.find((x) => x.key === k), el = $("#sheet-body"); curSheet = k;
      if (!m) { curSheet=null; return; }
      const r = m.resistances_and_immunities || {}, ln = (l, v) => v ? `<div><b>${l}:</b> ${esc(v)}</div>` : "";
      const saves = Object.entries(m.saving_throws || {}).filter(([a, v]) => m.custom || v !== m.modifiers?.[a]).map(([a, v]) => `${ABIL.find((x) => x[0] === a)?.[1] || a} ${mod(v)}`).join(", ");
      const skills = Object.entries(m.skill_bonuses || {}).map(([a, v]) => `${SK[a] || a} ${mod(v)}`).join(", ");
      const senses = [["darkvision_range", "visão no escuro"], ["blindsight_range", "percepção às cegas"], ["tremorsense_range", "sentido sísmico"], ["truesight_range", "visão verdadeira"]].filter(([a]) => m[a]).map(([a, l]) => `${l} ${fm(m[a])}`).concat("Percepção passiva " + m.passive_perception).join(", ");
      const g = {}; (m.actions || []).forEach((a) => (g[a.action_type || "ACTION"] ??= []).push(a));
      const acts = Object.entries(g).map(([t, arr]) => `<div class="grp">${esc(GRP[t] || t)}</div>` + arr.map((a) => {
        const ri = rollInfo(a);
        return habD(nmA(a), descInfo(a.name, a.desc, m), (ri ? ` <button class="small roll" data-roll="${esc(JSON.stringify(ri))}">${window.ico ? window.ico("d20") : ""}Rolar</button>` : "") + rmBtn(m, "a", m.actions.indexOf(a)), ri ? `<div class="ln muted">${esc(rollLine(ri))}</div><div class="rr"></div>` : "");
      }).join("")).join("");
      const spl = (m.spells || []).map((s, ix) => spRow(s.name, s.key, rmBtn(m, "s", ix))).join("");
      const p = pt(m), cat = catOf(m);
      el.innerHTML = window.FICHA_MONSTRO.renderizar({
        monstro:m,nome:p||m.name,retrato:av(m,64),
        subtitulo:[p?m.name:'',cat!=='monster'||m.custom?CAT[cat]:'',tsz(m),m.alignment&&m.alignment!=='—'?AL(m.alignment):'',m.subtitle||''].filter(Boolean).join(' · '),
        meta:'<p class="ficha-meta"><span class="badge">'+esc(cat==='monster'?'ND '+CRV(m):'Nível '+(m.level??'—'))+'</span><span>'+esc(srcOf(m))+'</span></p>',
        velocidade:speed(m.speed),
        atributos:ABIL.map(([k,n])=>({sigla:n,valor:m.ability_scores?.[k]??'—',modificador:mod(m.modifiers?.[k]??0),rolagem:'<button type="button" class="rolar-atributo" data-sheet-atributo="'+esc(n)+'" data-bonus="'+esc(m.modifiers?.[k]??0)+'" aria-label="Rolar '+esc(n)+'">Rolar d20</button>'})),
        informacoes:ln('Salvaguardas',saves)+ln('Perícias',skills)+ln('Resistências',tr(r.damage_resistances_display))+ln('Imunidades',tr(r.damage_immunities_display))+ln('Vulnerabilidades',tr(r.damage_vulnerabilities_display))+ln('Imunidades a condições',tr(r.condition_immunities_display))+ln('Sentidos',senses)+ln('Idiomas',tr(m.languages?.as_string)),
        tracos:(m.traits||[]).map(t=>habD(nm(t.name),descInfo(t.name,t.desc,m),rmBtn(m,'t',0,t.cf))).join(''),acoes:acts,magias:spl,
        gerenciar:((m.custom||window.CATALOGO?.admin())?'<button class="small primary" data-edit="'+esc(m.key)+'">Editar ficha</button> ':'')+'<button class="small" data-ph="'+esc(m.key)+'">'+(PH[m.key]?'Trocar foto':'Adicionar foto')+'</button>'+(PH[m.key]?'<button class="small subtle" data-phx="'+esc(m.key)+'">'+(m.custom?'Remover foto':'Voltar à foto padrão')+'</button>':'')
      });
      document.dispatchEvent(new Event('ficha:fechar-personagem'));
      window.PAINEL.mostrar("sheet"); $("#sheet").scrollTop = 0; $("#sheet-body").scrollTop = 0; $("#sh-close").focus();
    }

    /* magias: lista no painel, texto na aba lateral */
    const abiIndex = () => { ABI = new Map(); ALL.forEach((m) => { [...(m.traits || []).map((a) => ({ a, k: "Característica", m })), ...(m.actions || []).map((a) => ({ a, k: GRP[a.action_type] || "Ação", m }))].forEach((x) => { const l = fname(x.a.name); if (!ABI.has(l)) ABI.set(l, { name: x.a.name.replace(/\s*\(.*\)\s*$/, ""), items: [] }); ABI.get(l).items.push(x); }); }); };
    const catalog = () => {
      const have = new Set(SP.map((s) => s.name.toLowerCase()));
      return SP.concat(Object.entries(D.S).filter(([k]) => !have.has(k)).map(([k, v]) => ({
        key: "ds:" + k, name: v[3] || k, level: null,
        document: { display_name: "SRD 5.1", key: "srd-2014" }
      })));
    };
    const edOf = (doc) => (/2014/.test(String(doc?.key || "")) ? "2014" : "");
    function spSearch() {
      const q = nz($("#sq").value.trim()), box = $("#spells"), cont = $("#scount"); if (!q) { box.innerHTML = ""; if (cont) cont.textContent = ""; return; }
      const tipo = $("#sf-type").value, src = "2014", lv = $("#sf-lvl").value, sch = $("#sf-sch").value, ex = $("#sf-ex").value;
      const soMagia = tipo === "spell" || !!(lv || sch || ex); // círculo, escola e ritual só existem em magias
      const kOf = (s) => s.key.startsWith("ds:") ? s.key.slice(3) : s.name.toLowerCase();
      const r = (tipo && tipo !== "spell" ? [] : catalog()).filter((s) => !src || edOf(s.document) === src)
        .filter((s) => lv === "" || (s.level != null && String(s.level) === lv))
        .filter((s) => !sch || (SCH[s.school?.name] || "") === sch)
        .filter((s) => !ex || (ex === "ritual" ? !!s.ritual : !!s.concentration))
        .filter((s) => { const k = kOf(s); return nz(s.name + " " + (D.S[k]?.[0] || "")).includes(q); }).slice(0, 30);
      box.innerHTML = r.map((s) => {
        const k = kOf(s), d = D.S[k];
        return window.MAGIAS_UI.resultado({chave:s.key,nome:d?d[0]:s.name,original:s.name,nivel:s.level,escola:SCH[s.school?.name],tempo:s.casting_time?cap(tr(s.casting_time)):undefined,alcance:s.range_text?tr(s.range_text):undefined,ritual:s.ritual,concentracao:s.concentration,fonte:srcOf(s),alias:''});
      }).join("") + (soMagia || (tipo && tipo !== "monster") ? "" : abilityRows(q, src)) + (soMagia || (tipo && tipo !== "class") ? "" : classRows(q, src)) || '<span class="muted">Nada encontrado.</span>';
      if (cont) { const n = box.querySelectorAll(".res").length; cont.textContent = n ? `${n} ${n === 1 ? "resultado" : "resultados"}` : ""; }   // contagem, como "N fichas" no bestiário
    }
    function abilityRows(q, src = "") {
      return [...ABI.entries()].map(([l, v]) => [l, v, src ? v.items.filter((x) => edOf(x.m.document) === src) : v.items]).filter(([l, v, its]) => its.length && nz(v.name + " " + nm(v.name)).includes(q)).slice(0, 15).map(([l, v, its]) => `<div class="res" data-abopen="${esc(l)}"><span><b>${esc(nm(v.name))}</b> <span class="muted">(${esc(v.name)})</span><br><span class="muted">Habilidade de monstro · ${its.length} ${its.length > 1 ? "monstros" : "monstro"}: ${esc(its.slice(0, 3).map((x) => pt(x.m) || x.m.name).join(", "))}${its.length > 3 ? "…" : ""}</span></span></div>`).join("");
    }

    /* habilidades de classe (SRD 5.1, 2014, via Open5e; texto em inglês) */
    const CFCLS = { Barbarian: "Bárbaro", Bard: "Bardo", Cleric: "Clérigo", Druid: "Druida", Fighter: "Guerreiro", Monk: "Monge", Paladin: "Paladino", Ranger: "Patrulheiro", Rogue: "Ladino", Sorcerer: "Feiticeiro", Warlock: "Bruxo", Wizard: "Mago" };
    const cfClass = (f) => { const base = f.u || f.c; return (CFCLS[base] || base) + (f.u ? ` (${f.c})` : ""); };
    const cfLevel = (f) => f.l && f.l.length ? "nível " + (f.l.length > 3 ? f.l[0] + "+" : f.l.join(", ")) : "";
    const cfTitle = (f) => f.po || f.p || f.n;
    const cfKey = (f) => `${f.e}|${f.c}|${f.n}`;
    const cfText = (f) => CFT[cfKey(f)] || f.d;
    const cfBody = (f) => String(cfText(f)).replace(/\r/g, "").replace(/^\s*#{1,6}\s*(.+)$/gm, "$1").replace(/^\s*[*-]\s+/gm, "• ").replace(/[*_]+/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    const encP = (s) => String(s).replace(/\n/g, " ¶ "), decP = (s) => String(s).replace(/\s*¶\s*/g, "\n");
    const cfPlain = (f) => String(cfText(f)).replace(/\r/g, "").replace(/\n\s*[*-]\s+/g, " • ").replace(/\n+/g, " ").replace(/[*_#]+/g, "").replace(/\s+/g, " ").trim();
    const cfFind = (q, max) => { const ws = q.split(/\s+/).filter(Boolean); if (!ws.length) return []; return CF.map((f, i) => [f, i]).filter(([f]) => { const hay = nz(`${f.n} ${f.p} ${CFCLS[f.u || f.c] || ""} ${f.u || f.c} ${f.c}`); return ws.every((w) => hay.includes(w)); }).slice(0, max); };
    const classRows = (q, src = "") => cfFind(q, 400).filter(([f]) => !src || f.e === src).slice(0, 12).map(([f, i]) => `<div class="res" data-cfopen="${i}"><span><b>${esc(cfTitle(f))}</b>${f.p ? ` <span class="muted">(${esc(f.n)})</span>` : ""}<br><span class="muted">${esc(["Habilidade de classe", cfClass(f), cfLevel(f), f.e].filter(Boolean).join(" · "))}</span></span></div>`).join("");

    /* adiciona uma habilidade de classe a uma ficha própria (personagem, NPC ou monstro criado por você) */
    const cfAlvos = (i) => {
      const alvos = ALL.filter((m) => m.custom).sort((x, y) => x.name.localeCompare(y.name));
      return alvos.length
        ? `<div class="sp-meta"><b>Adicionar a uma ficha sua:</b><div class="row" style="margin:6px 0 0"><select id="cf-alvo" style="flex:1 1 150px">${alvos.map((m) => `<option value="${esc(m.key)}">${esc(m.name)}</option>`).join("")}</select><button type="button" class="small primary" data-cfto="${i}">Adicionar à ficha</button></div><div class="muted" id="cf-msg" style="margin-top:4px"></div></div>`
        : '<div class="sp-meta muted">Para adicionar esta habilidade a um personagem, crie antes uma ficha própria em “Criar ficha”.</div>';
    };
    async function cfAdicionar(i) {
      const f = CF[i], m = BY[$("#cf-alvo")?.value], msg = (t) => { const e = $("#cf-msg"); if (e) e.innerHTML = t; };
      if (!f || !m) return;
      const nome = cfTitle(f);
      if ((m.traits || []).some((t) => t.name === nome)) { msg(`${esc(m.name)} já tem “${esc(nome)}”.`); return; }
      const traitsRaw = m.raw?.traits ?? (m.traits || []).map((t) => `${t.name}: ${t.desc}`).join("\n");
      const actsRaw = m.raw?.actions ?? (m.actions || []).map((x) => `${x.name} | ${x.desc}`).join("\n");
      const linha = `${nome}: ${encP(cfBody(f))}`;
      m.traits = [...(m.traits || []), { name: nome, desc: cfBody(f), cf: cfKey(f) }];
      m.raw = { traits: (traitsRaw.trim() ? traitsRaw.replace(/\s+$/, "") + "\n" : "") + linha, actions: actsRaw };
      m.updatedAt = Date.now();
      await put("mon", [m]); await reload(); queueSync();
      msg(`“${esc(nome)}” adicionada a ${esc(m.name)}.`);
      if (curSheet === m.key) openSheet(m.key);
    }
    function openClassFeature(i, origin) {
      const f = CF[i]; if (!f) return;
      $("#spd-body").innerHTML = `<h3>${esc(cfTitle(f))}</h3><div class="muted">${esc(f.n)}</div>
        <div class="sp-meta"><div><b>Classe:</b> ${esc(cfClass(f))}</div>${f.l && f.l.length ? `<div><b>Níveis:</b> ${esc(f.l.join(", "))}</div>` : ""}<div><b>Regras:</b> SRD 5.1 (2014)</div></div>
        ${CFT[cfKey(f)] ? '<div class="sp-note">Tradução própria do SRD (CC-BY-4.0). O original em inglês está no final.</div>' : '<div class="sp-note">Texto original em inglês (SRD); ainda sem tradução.</div>'}
        <div class="sp-body">${esc(String(cfText(f)).replace(/\r/g, ""))}</div>${CFT[cfKey(f)] ? `<div class="orig">Original: ${esc(String(f.d).replace(/\r/g, ""))}</div>` : ""}
        ${cfAlvos(i)}`;
      window.PAINEL.empilhar("spd");
    }
    function openAbility(l, ix = 0, origin) {
      const v = ABI.get(l); if (!v) return; const it = v.items[ix] || v.items[0], info = descInfo(it.a.name, it.a.desc, it.m);
      $("#spd-body").innerHTML = `<h3>${esc(nmA(it.a))}</h3><div class="muted">${esc(it.a.name)}</div>
        <div class="sp-meta"><div><b>Tipo:</b> Habilidade de monstro (${esc(it.k.toLowerCase())})</div><div><b>Exemplo de:</b> ${esc(pt(it.m) || it.m.name)} <button class="small" data-view="${esc(it.m.key)}">Abrir ficha</button></div></div>
        <div class="sp-body">${info.html}</div>${info.tr && info.orig !== info.plain ? `<div class="orig">Original: ${esc(info.orig)}</div>` : ""}
        ${v.items.length > 1 ? `<div class="sp-meta"><b>Também em:</b> ${v.items.map((x, i) => `<a class="splink" data-abix="${i}" data-l="${esc(l)}">${esc(pt(x.m) || x.m.name)}</a>`).join(" · ")}<br><span class="muted">O texto muda conforme o monstro (números e alcances).</span></div>` : ""}`;
      window.PAINEL.empilhar("spd");
    }
    function openSpell(id, origin) {
      const key = String(id), l = key.replace(/^ds:/, "").toLowerCase();
      const rec = SP.find((s) => s.key === key) || SP.filter((s) => s.name.toLowerCase() === l).sort((a, b) => (b.document?.key === "srd-2014") - (a.document?.key === "srd-2014"))[0];
      const d = D.S[rec ? rec.name.toLowerCase() : l]; if (!rec && !d) return;
     
      const meta = rec ? [["Círculo", rec.level ? rec.level + "º círculo" : "Truque"], ["Escola", SCH[rec.school?.name] || rec.school?.name], ["Tempo de conjuração", cap(tr(rec.casting_time || ""))], ["Alcance", tr(rec.range_text || "")], ["Componentes", [rec.verbal && "V", rec.somatic && "S", rec.material && "M"].filter(Boolean).join(", ")], ["Duração", cap(tr(rec.duration || "")) + (rec.concentration ? " (concentração)" : "")], ["Ritual", rec.ritual ? "Sim" : ""], ["Fonte", srcOf(rec)]] : [];
      const mat = d?.[2] || rec?.material_specified || "", en = rec ? (rec.desc || "") + (rec.higher_level ? "\n\n" + rec.higher_level : "") : "";
      const other = d && rec && rec.document?.key !== "srd-2014";
      window.LEITOR_FICHAS.magia({nome:d?d[0]:rec.name,original:rec?rec.name:d[3],meta,descricao:d?d[1]:en,materiais:mat,nota:other?'Texto em português do SRD 5.1 (2014). A versão desta fonte pode ter diferenças; o original está no final.':'',originalTexto:other&&en?en:'',concentracao:!!rec?.concentration});
    }

    /* criar / editar ficha (monstro, personagem ou NPC) */
    $("#cm-type").innerHTML = Object.entries(TP).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
    $("#cm-ab").innerHTML = ABIL.map(([k, l]) => `<div><label>${l}</label><input id="ab-${k}" type="number" value="10"></div>`).join(""); window.FICHA_CRIACAO.montarFormulario();
    $("#cm-cat").onchange = () => { const mo = $("#cm-cat").value === "monster"; $("#cm-crl").textContent = mo ? "ND" : "Nível"; if (!mo) $("#cm-type").value = "Humanoid"; };
    const lines = (id) => $(id).value.split("\n").map((s) => s.trim()).filter(Boolean);
    const spName = (s) => D.S[String(s.name).toLowerCase()]?.[0] || s.name;
    /* características e ações da ficha, uma etiqueta por linha, com ✕ para remover (a mudança só vale quando você salva) */
    const refreshLineChips = () => {
      for (const [ta, box, campo] of [["#cm-traits", "#cm-tchips", "t"], ["#cm-acts", "#cm-achips", "a"]]) {
        const ls = $(ta).value.split("\n").filter((l) => l.trim());
        $(box).innerHTML = ls.map((l, i) => `<span class="chip">${esc(l.split(/[:|]/)[0].trim().slice(0, 40) || "(sem nome)")}<b data-ldel="${campo}:${i}" title="Remover (vale ao salvar)">${ico("x")}</b></span>`).join("");
      }
    };
    const chips = () => { $("#cm-chips").innerHTML = cmSpells.map((s, i) => `<span class="chip">${esc(spName(s))}<b data-chip="${i}" title="Remover">${ico("x")}</b></span>`).join("") || '<span class="muted">Nenhuma magia adicionada.</span>'; };
    const spq = $("#cm-spq"), spsug = $("#cm-spsug");
    spq.addEventListener("input", () => {
      const q = nz(spq.value.trim()), r = q.length < 2 ? [] : catalog().filter((s) => nz(s.name + " " + (D.S[s.name.toLowerCase()]?.[0] || "")).includes(q)).slice(0, 10);
      spsug.hidden = !r.length;
      spsug.innerHTML = r.map((s) => `<div data-spadd="${esc(s.key)}">${esc(spName(s))} <span class="muted">(${esc(s.name)})${s.level == null ? "" : " · " + (s.level ? s.level + "º círculo" : "Truque")} · ${esc(srcOf(s))}</span></div>`).join("");
    });
    spq.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return; e.preventDefault(); const v = spq.value.trim(); if (!v) return;
      const ex = catalog().find((s) => s.name.toLowerCase() === v.toLowerCase() || nz(D.S[s.name.toLowerCase()]?.[0] || "") === nz(v));
      cmSpells.push(ex ? { key: ex.key, name: ex.name } : { key: null, name: v }); spq.value = ""; spsug.hidden = true; chips();
    });

    /* busca de habilidade de classe no campo de características da ficha */
    const cfq = $("#cm-cfq"), cfsug = $("#cm-cfsug");
    setTimeout(() => { $("#cm-traits").addEventListener("input", refreshLineChips); $("#cm-acts").addEventListener("input", refreshLineChips); refreshLineChips(); }, 0);
    cfq.addEventListener("input", () => {
      const r = cfFind(nz(cfq.value.trim()), 10);
      cfsug.hidden = !r.length;
      cfsug.innerHTML = r.map(([f, i]) => `<div data-cfadd="${i}">${esc(cfTitle(f))}${f.p ? ` <span class="muted">(${esc(f.n)})</span>` : ""} <span class="muted">· ${esc([cfClass(f), cfLevel(f), f.e].filter(Boolean).join(" · "))}</span></div>`).join("");
    });
    let cfPend = {};
    function resetForm() {
      cfPend = {}; setTimeout(refreshLineChips, 0); window.FICHA_CRIACAO.limparExtras();
      editKey = null; editGlobal = false; editVersion = 0; cmSpells = []; formPhoto = undefined; chips();
      ["#cm-name", "#cm-sub", "#cm-traits", "#cm-acts"].forEach((s) => ($(s).value = "")); ABIL.forEach(([k]) => ($("#ab-" + k).value = 10));
      $("#cm-save").textContent = "Salvar ficha"; $("#cm-cancel").hidden = true; formPv();
    }
    function editCustom(k) {
      if (visitante()) return;
      const m = ALL.find((x) => x.key === k); if (!m) return;
      if (!m.custom && !window.CATALOGO?.admin()) return;
      resetForm(); editKey = k; editGlobal = !m.custom;
      editVersion = editGlobal ? (window.CATALOGO.registro('monstro', k)?.versao || 0) : 0;
      cmSpells = (m.spells || []).slice(); chips(); formPv();
      $("#cm-cat").value = catOf(m); $("#cm-cat").onchange(); $("#cm-name").value = m.name; $("#cm-sub").value = m.subtitle || "";
      $("#cm-size").value = m.size?.name || "Medium"; $("#cm-type").value = m.type?.name || "Humanoid";
      $("#cm-cr").value = catOf(m) === "monster" ? cr(m.challenge_rating) : (m.level ?? 1); $("#cm-ac").value = m.armor_class; $("#cm-hp").value = m.hit_points;
      $("#cm-hd").value = m.hit_dice || ""; $("#cm-sp").value = m.speed?.walk ?? 30; ABIL.forEach(([a]) => ($("#ab-" + a).value = m.ability_scores?.[a] ?? 10));
      $("#cm-traits").value = m.raw?.traits ?? (m.traits || []).map((t) => `${t.name}: ${t.desc}`).join("\n");
      $("#cm-acts").value = m.raw?.actions ?? (m.actions || []).map((a) => `${a.name} | ${a.desc}`).join("\n");
      window.FICHA_CRIACAO.preencherExtras(window.FICHA_CRIACAO.extrasDeMonstro(m));
      refreshLineChips(); $("#cm-save").textContent = editGlobal ? "Publicar alterações globais" : "Salvar alterações"; $("#cm-cancel").hidden = false; $("#cm-msg").textContent = editGlobal ? "Edição global: as alterações serão vistas por todos os usuários." : "";
      $("#cm").open = true; $("#cm").scrollIntoView({ behavior: "smooth" });
    }
    $("#cm-cancel").onclick = () => { resetForm(); $("#cm-msg").textContent = "Edição cancelada."; };
    /* ---- Importar bloco de estatísticas: a leitura acontece neste aparelho (js/ficha-importar.js); a prévia é revista antes de preencher o formulário, que continua editável ---- */
    let impAtual = null;
    const impPrevia = (v) => {
      const FI = window.FICHA_IMPORTAR, rotulosAcao = { acao: "Ação", bonus: "Ação bônus", reacao: "Reação", lendaria: "Ação lendária", covil: "Ação de covil" };
      const linhas = FI.resumo(v).map(([r, x]) => `<tr><th>${esc(r)}</th><td>${esc(x)}</td></tr>`).join("");
      const textos = [...v.caracteristicas.map((c) => ["Característica", c.nome, c.texto]), ...Object.entries(rotulosAcao).flatMap(([k, rot]) => v.acoes[k].map((l) => { const p = l.split("|"); return [rot, p[0].trim(), p[p.length - 1].trim()]; }))];
      return `<h4>Prévia: revise antes de preencher o formulário</h4><table class="imp-tabela">${linhas}</table>`
        + (v.avisos.length ? `<div class="imp-avisos"><b>Atenção</b><ul>${v.avisos.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></div>` : "")
        + (v.naoReconhecido.length ? `<div class="imp-avisos"><b>Não reconhecido (fica guardado como nota na ficha; você pode apagar)</b><ul>${v.naoReconhecido.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></div>` : "")
        + `<details><summary>Textos originais das habilidades e ações (${textos.length})</summary>${textos.map(([t, n, x]) => `<p><b>${esc(n)}</b> <span class="muted">(${t})</span><br>${esc(x)}</p>`).join("")}</details>`
        + `<div class="row"><button type="button" class="small primary" id="imp-usar">Preencher o formulário</button><button type="button" class="small subtle" id="imp-descartar">Descartar</button></div>`;
    };
    function impUsar(v) {
      const set = (id, val) => { if (val !== null && val !== undefined && val !== "") $(id).value = val; };
      $("#cm-cat").value = "monster"; $("#cm-cat").onchange();
      set("#cm-name", String(v.nome).slice(0, 48)); if (v.tamanho) $("#cm-size").value = v.tamanho; if (v.tipo && [...$("#cm-type").options].some((o) => o.value === v.tipo)) $("#cm-type").value = v.tipo;
      if (v.nd != null) $("#cm-cr").value = cr(v.nd);
      if (v.ca != null) $("#cm-ac").value = v.ca; if (v.pv != null) $("#cm-hp").value = v.pv; set("#cm-hd", v.dados);
      if (v.deslocamentos.walk != null) $("#cm-sp").value = v.deslocamentos.walk;
      for (const [k, n] of Object.entries(v.atributos)) if ($("#ab-" + k)) $("#ab-" + k).value = n;
      const notas = [...(v.naoReconhecido || [])]; if (v.fonte) notas.push("Fonte: " + v.fonte);
      const tracos = v.caracteristicas.map((c) => c.nome + ": " + encP(c.texto)); if (notas.length) tracos.push("Notas da importação: " + encP(notas.join("\n")));
      $("#cm-traits").value = tracos.join("\n"); $("#cm-acts").value = v.acoes.acao.join("\n");
      window.FICHA_CRIACAO.preencherExtras({ alinhamento: v.alinhamento, armadura: v.armadura, deslocamentos: { fly: v.deslocamentos.fly, swim: v.deslocamentos.swim, climb: v.deslocamentos.climb, burrow: v.deslocamentos.burrow }, prof: v.prof ?? "", xp: v.xp ?? "",
        salvaguardas: v.salvaguardas, pericias: v.pericias, resistencias: v.resistencias, imunidades: v.imunidades, vulnerabilidades: v.vulnerabilidades, condicoes: v.condicoes, naoMagico: v.naoMagico, sentidos: v.sentidos, idiomas: v.idiomas,
        acoes: { bonus: v.acoes.bonus.join("\n"), reacao: v.acoes.reacao.join("\n"), lendaria: v.acoes.lendaria.join("\n"), covil: v.acoes.covil.join("\n") } });
      refreshLineChips(); $("#cm-msg").textContent = "Formulário preenchido a partir do texto: revise os campos e salve.";
      $("#cm-name").scrollIntoView?.({ block: "center" });
    }
    $("#imp-ler").onclick = () => {
      const t = $("#imp-texto").value; if (!t.trim()) { $("#cm-msg").textContent = "Cole o texto da ficha primeiro."; return; }
      impAtual = window.FICHA_IMPORTAR.parsear(t); const box = $("#imp-previa"); box.innerHTML = impPrevia(impAtual); box.hidden = false;
    };
    $("#imp-limpar").onclick = () => { $("#imp-texto").value = ""; $("#imp-previa").hidden = true; $("#imp-previa").innerHTML = ""; impAtual = null; };
    $("#imp-previa").addEventListener("click", (e) => { if (e.target.id === "imp-usar" && impAtual) impUsar(impAtual); if (e.target.id === "imp-descartar") { $("#imp-previa").hidden = true; $("#imp-previa").innerHTML = ""; impAtual = null; } });
    const parseAct = (l) => window.FICHA_CRIACAO.parseAcao(l, "ACTION");   // formato e regras em js/ficha-criacao.js
    $("#cm-save").onclick = async () => {
      if (visitante()) { $("#cm-msg").textContent = "Criar e salvar fichas exige uma conta (gratuita)."; return; }
      const name = $("#cm-name").value.trim(); if (!name) { $("#cm-msg").textContent = "Informe o nome."; return; }
      const cat = $("#cm-cat").value, v = window.FICHA_CRIACAO.lerND($("#cm-cr").value) || 0, ab = {}, md = {};
      ABIL.forEach(([k]) => { ab[k] = parseInt($("#ab-" + k).value) || 10; md[k] = Math.floor((ab[k] - 10) / 2); });
      const m = { key: editKey || "custom_" + Date.now().toString(36), custom: true, updatedAt: Date.now(), cat, name, subtitle: $("#cm-sub").value.trim(), document: { display_name: "Personalizado", key: "custom" },
        size: { name: $("#cm-size").value }, type: { name: $("#cm-type").value }, challenge_rating: cat === "monster" ? v : 0, level: cat === "monster" ? null : v, alignment: "—",
        armor_class: parseInt($("#cm-ac").value) || 10, hit_points: parseInt($("#cm-hp").value) || 1, hit_dice: $("#cm-hd").value.trim(),
        speed: { walk: parseInt($("#cm-sp").value) || 0, unit: "feet" }, ability_scores: ab, modifiers: md, saving_throws: {}, skill_bonuses: {},
        initiative_bonus: md.dexterity, passive_perception: 10 + md.wisdom, resistances_and_immunities: {}, spells: cmSpells.slice(),
        raw: { traits: $("#cm-traits").value, actions: $("#cm-acts").value },
        traits: lines("#cm-traits").map((l) => { const i = l.indexOf(":"), t = i < 0 ? { name: l, desc: "" } : { name: l.slice(0, i).trim(), desc: decP(l.slice(i + 1).trim()) }, ref = ((editKey && BY[editKey]?.traits) || []).find((x) => x.name === t.name && x.cf)?.cf || cfPend[t.name]; return ref ? { ...t, cf: ref } : t; }),
        actions: lines("#cm-acts").map(parseAct) };
      window.FICHA_CRIACAO.aplicarExtras(m, window.FICHA_CRIACAO.lerExtras());   // defesas, sentidos, perícias, salvaguardas, tipos de ação (tudo opcional)
      const edited = !!editKey;
      if (editGlobal) {
        if (!window.CATALOGO?.admin()) { $("#cm-msg").textContent = "Somente administradores podem editar fichas globais."; return; }
        const original = BY[editKey];
        if (!original || original.custom) { $("#cm-msg").textContent = "A ficha original não está disponível. Recarregue a página."; return; }
        // O formulário não representa todos os campos SRD; preservar os campos que ele não edita.
        const global = { ...original, ...m, key: original.key, custom: false, document: original.document,
          updatedAt: Date.now(), global: true };
        const opcoes = { versao: editVersion };
        if (formPhoto !== undefined) opcoes.imagem = formPhoto;
        const botao = $("#cm-save"); botao.disabled = true;
        try {
          await CATALOGO.salvar('monstro', original.key, global, opcoes);
          resetForm(); await reload();
          $("#cm-msg").textContent = `“${name}” atualizado no catálogo global.`;
        } catch (e) {
          $("#cm-msg").textContent = "Não foi possível publicar: " + e.message + " Atualize a página antes de tentar novamente se houve conflito.";
        } finally { botao.disabled = false; }
        return;
      }
      await put("mon", [m]);
      if (typeof formPhoto === "string") await put("img", [{ key: m.key, data: formPhoto }]); else if (formPhoto === null) await del("img", m.key);
      resetForm(); await reload(); queueSync();
      $("#cm-msg").textContent = `“${name}” ${edited ? "atualizado" : "salvo"} no bestiário.`;
    };

    /* eventos */
    $("#sq").addEventListener("input", () => { $("#sq-x").hidden = !$("#sq").value; spSearch(); });
    /* filtros: só o tipo fica à vista; o resto abre em "Filtros" e se adapta ao tipo escolhido */
    const syncFilters = () => {
      const tipo = $("#sf-type").value, soMagia = tipo === "" || tipo === "spell"; // círculo, escola e ritual só existem em magias
      for (const id of ["#sf-lvl", "#sf-sch", "#sf-ex"]) { $(id).hidden = !soMagia; if (!soMagia) $(id).value = ""; }
      const n = ["#sf-lvl", "#sf-sch", "#sf-ex"].filter((id) => $(id).value).length;
      $("#sf-more").innerHTML = ico("filter") + "Filtros" + (n ? ` (${n})` : "");
    };
    $("#sf-more").onclick = () => { const aberto = $("#sf-adv").hidden; $("#sf-adv").hidden = !aberto; $("#sf-more").setAttribute("aria-expanded", String(aberto)); };
    ["#sf-type", "#sf-lvl", "#sf-sch", "#sf-ex"].forEach((s) => $(s).addEventListener("change", () => { syncFilters(); spSearch(); }));
    syncFilters();
    $("#sq-x").onclick = () => { $("#sq").value = ""; $("#sq-x").hidden = true; spSearch(); $("#sq").focus(); };
    $("#sh-close").onclick = closeSheet; $("#spd-close").onclick = closeSheet; $("#spd-voltar").onclick = voltarPainel;
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { sug.hidden = true; if (!$("#spd").hidden) voltarPainel(); else if (!$("#sheet").hidden) closeSheet(); } });
    $("#combatants").addEventListener("click", (e) => { if (e.target.closest("button,input,select,.fx-form,.fxchip")) return; const a = e.target.closest(".combatant"); if (a && a.dataset.key) openSheet(a.dataset.key); });
    document.addEventListener("click", async (e) => {
      const t = e.target, d = t.dataset, sg = t.closest("[data-sug]");
      tip.style.display = "none";
      if (!t.closest(".field-name")) sug.hidden = true;
      if (!t.closest("#cm-spq,#cm-spsug")) spsug.hidden = true;
      if (!t.closest("#cm-cfq,#cm-cfsug")) cfsug.hidden = true;
      if (sg) return pick(sg.dataset.sug);
      const ao = t.closest("[data-abopen]"); if (ao) return openAbility(ao.dataset.abopen, 0, "panel");
      const ax = t.closest("[data-abix]"); if (ax) return openAbility(ax.dataset.l, +ax.dataset.abix);
      const fav = t.closest("#blist .av"); if (fav) { const v = fav.closest(".res")?.querySelector("[data-view]"); if (v) return openSheet(v.dataset.view); }
      const pb = t.closest("[data-ph]"); if (pb) return askPhoto(pb.dataset.ph);
      const px = t.closest("[data-phx]"); if (px) { const k = px.dataset.phx; if(!BY[k]?.custom){if(!window.CATALOGO?.admin())return;try{await CATALOGO.salvar('monstro',k,null,{imagem:null});}catch(e){status(esc(e.message));return;}}else{delete PH[k];await del('img',k);touch(k);}renderBestiary();window.__ini.render();return openSheet(k); }
      const ck = t.closest("[data-cfk]"); if (ck) { const ix = CF.findIndex((f) => cfKey(f) === ck.dataset.cfk); if (ix >= 0) openClassFeature(ix, "sheet"); return; }
      const ct = t.closest("[data-cfto]"); if (ct) return cfAdicionar(+ct.dataset.cfto);
      const co = t.closest("[data-cfopen]"); if (co) return openClassFeature(+co.dataset.cfopen, t.closest("#sheet") ? "sheet" : "panel");
      const ca = t.closest("[data-cfadd]");
      if (ca) { const f = CF[+ca.dataset.cfadd]; if (f) { const ta = $("#cm-traits"); ta.value = (ta.value.trim() ? ta.value.replace(/\s+$/, "") + "\n" : "") + `${cfTitle(f)}: ${encP(cfBody(f))}`; cfPend[cfTitle(f)] = cfKey(f); refreshLineChips(); } cfq.value = ""; cfsug.hidden = true; return; }
      const so = t.closest("[data-spopen]"); if (so) return openSpell(so.dataset.spopen, t.closest("#sheet") ? "sheet" : "panel");
      const sa = t.closest("[data-spadd]");
      if (sa) { const s = catalog().find((x) => x.key === sa.dataset.spadd); if (s && !cmSpells.some((c) => c.key === s.key)) cmSpells.push({ key: s.key, name: s.name }); spq.value = ""; spsug.hidden = true; return chips(); }
      const rb = t.closest("[data-roll]"); if (rb) { rb.closest(".hab").querySelector(".rr").innerHTML = doRoll(JSON.parse(rb.dataset.roll)); return; }
      const ld = t.closest("[data-ldel]");
      if (ld) { const [campo, n] = ld.dataset.ldel.split(":"), ta = $(campo === "t" ? "#cm-traits" : "#cm-acts"); let k = -1; const ls = ta.value.split("\n"), pos = ls.findIndex((l) => l.trim() && ++k === +n); if (pos >= 0) ls.splice(pos, 1); ta.value = ls.join("\n"); return refreshLineChips(); }
      const chp = t.closest("[data-chip]"); if (chp) { cmSpells.splice(+chp.dataset.chip, 1); return chips(); }
      if (d.more) { shown += 40; return renderBestiary(); }
      if (d.view && t.closest("#blist,#spd-body")) return openSheet(d.view);
      if (d.edit) { if (innerWidth < 700) closeSheet(); return editCustom(d.edit); }
      if (d.add) { const m = ALL.find((x) => x.key === d.add); if (m) addMon(m, t.closest("[data-add]")); return; }
      if (d.tr) { const m = ALL.find((x) => x.key === d.tr), v = prompt("Nome em português para “" + m.name + "” (vazio remove):", pt(m) || m.name); if (v === null) return; v.trim() ? (TR[m.name.toLowerCase()] = v.trim()) : delete TR[m.name.toLowerCase()]; saveTR();if(!m.custom)try{await CATALOGO.atualizar({registros:ALL,magias:SP,nomes:{[m.name.toLowerCase()]:v.trim()}});}catch(e){status(esc(e.message));}return renderBestiary(); }
      const globalDel = t.closest('[data-global-del]');
      if (globalDel) {
        if (!window.CATALOGO?.admin()) return;
        const key = globalDel.dataset.globalDel, m = BY[key];
        if (!m || m.custom) return;
        if (!(await perguntar(`Excluir “${m.name}” do catálogo global? Ele deixará de aparecer para todos os usuários. Fichas e inventários existentes não serão apagados. Você poderá restaurá-lo depois.`, { titulo: 'Excluir monstro global', ok: 'Excluir', perigo: true }))) return;
        globalDel.disabled = true;
        try { await CATALOGO.salvar('monstro', key, null, { excluido: true }); if (curSheet === key) closeSheet(); if (editKey === key) resetForm(); await reload(); }
        catch (e) { window.FEEDBACK?.mostrar(e.message, { erro: true }); }
        finally { globalDel.disabled = false; }
        return;
      }
      const globalRestore = t.closest('[data-global-restore]');
      if (globalRestore) {
        if (!window.CATALOGO?.admin()) return;
        const key = globalRestore.dataset.globalRestore, r = CATALOGO.registro('monstro', key);
        if (!r?.excluido) return;
        if (!(await perguntar(`Restaurar “${r.dados?.name || key}” para todos os usuários?`, { titulo: 'Restaurar monstro', ok: 'Restaurar' }))) return;
        globalRestore.disabled = true;
        try { await CATALOGO.salvar('monstro', key, null, { excluido: false }); await reload(); }
        catch (e) { window.FEEDBACK?.mostrar(e.message, { erro: true }); }
        finally { globalRestore.disabled = false; }
        return;
      }
      if (d.del) {
        const m = ALL.find((x) => x.key === d.del); if (!m || !m.custom) return;   // monstros padrão do SRD não se excluem
        if (!(await perguntar(m.custom ? `Excluir “${m.name}” definitivamente?` : `Remover “${m.name}” do seu bestiário local? Você pode baixar de novo depois.`, { titulo: "Remover do bestiário", ok: "Remover", perigo: true }))) return;
        await del("mon", d.del); if (m.custom) { await del("img", d.del); TOMB[d.del] = Date.now(); saveTomb(); } if (editKey === d.del) resetForm(); await reload(); return queueSync();
      }
      if (d.delcol) {
        const k = d.delcol, nmc = [...ALL, ...SP].find((x) => !x.custom && (x.document?.key || "?") === k); if (!nmc) return;
        if (!(await perguntar(`Excluir a coleção “${srcOf(nmc)}” (monstros e magias) do seu computador? Você pode baixá-la de novo depois. Suas criações não são afetadas.`, { titulo: "Excluir coleção", ok: "Excluir", perigo: true }))) return;
        for (const [store, arr] of [["mon", ALL], ["spl", SP]]) { const keys = arr.filter((x) => !x.custom && (x.document?.key || "?") === k).map((x) => x.key), tx = db.transaction(store, "readwrite"); keys.forEach((x) => tx.objectStore(store).delete(x)); await done(tx); }
        return reload();
      }
      const hb = t.closest(".hab"); if (hb && !t.closest(".roll")) hb.classList.toggle("open");
    });
    const tip = $("#tip");
    document.addEventListener("mouseover", (e) => { if (matchMedia("(hover: none)").matches) return; const h = e.target.closest(".hab,[data-fxtip]"); if (!h || h.classList.contains("open")) { tip.style.display = "none"; return; } const s = h.dataset.desc || h.dataset.fxtip || ""; tip.textContent = s.length > 260 ? s.slice(0, 260) + "… (clique para ler tudo)" : s; tip.style.display = s ? "block" : "none"; });
    document.addEventListener("mousemove", (e) => { tip.style.left = Math.max(8, Math.min(e.clientX + 14, innerWidth - 340)) + "px"; tip.style.top = e.clientY + 14 + "px"; });
    document.addEventListener("mouseout", (e) => { if (!e.relatedTarget?.closest?.(".hab,[data-fxtip]")) tip.style.display = "none"; });


    window.__ini.avatar = (key, name, size, foto) => (foto && /^data:image\//.test(foto) ? `<img class="av" style="width:${size}px;height:${size}px" src="${esc(foto)}" alt="">` : av(BY[key] || { name }, size));
    const fileIn = $("#ph-file");
    const toSquare = (file, size) => new Promise((ok, no) => { const url = URL.createObjectURL(file), im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = c.height = size; const q = Math.min(im.width, im.height); c.getContext("2d").drawImage(im, (im.width - q) / 2, (im.height - q) / 2, q, q, 0, 0, size, size); URL.revokeObjectURL(url); ok(c.toDataURL("image/jpeg", 0.85)); }; im.onerror = () => no(new Error("imagem inválida")); im.src = url; });

    /* recorte da foto: zoom, arrastar e prévia do ícone redondo */
    const cropPhoto = (file,global=false) => window.recortarFoto(file,global?1024:192);
    const visitante = () => !(window.nuvem && nuvem.usuario && nuvem.usuario());
    const askPhoto = (k) => { if (visitante()) { alert("Entre na sua conta para adicionar ou trocar fotos."); return; } if(k!=='form'&&!BY[k]?.custom&&!window.CATALOGO?.admin()){alert('Somente administradores alteram as fotos globais.');return;} phKey = k; fileIn.value = ""; fileIn.click(); };
    const formPv = () => { const m = editKey && BY[editKey]; const src = formPhoto === undefined ? (m && (window.CATALOGO?.imagem('monstro', m.key) ?? PH[m.key])) : formPhoto; $("#cm-phv").innerHTML = src ? `<img class="av" style="width:48px;height:48px" src="${esc(src)}" alt="">` : '<span class="muted">sem foto</span>'; };
    fileIn.onchange = async () => {
      const f = fileIn.files[0]; if (!f) return;
      try { const data = await cropPhoto(f,(phKey==='form' ? editGlobal : !BY[phKey]?.custom)); if (!data) return; if (phKey === "form") { formPhoto = data; formPv(); return; } if(BY[phKey]?.custom){PH[phKey]=data;await put('img',[{key:phKey,data}]);await touch(phKey);}else{if(!window.CATALOGO?.admin())throw Error('Somente administradores editam as fotos globais.');await CATALOGO.salvar('monstro',phKey,null,{imagem:data});}renderBestiary(); window.__ini.render(); if (curSheet === phKey) openSheet(phKey); } catch (e) { alert("Não consegui usar essa imagem: " + e.message); }
    };
    $("#cm-ph").onclick = () => askPhoto("form");
    $("#cm-phx").onclick = () => { formPhoto = null; formPv(); };
    chips(); formPv(); layout();
    document.addEventListener("error", (e) => {
      const t = e.target;
      if (!t || t.tagName !== "IMG" || !t.classList.contains("av")) return;
      const s = document.createElement("span");
      s.className = "av av0"; s.style.cssText = t.style.cssText; s.textContent = "?";
      t.replaceWith(s);
    }, true);

    /* Sincronização das criações com a conta autenticada. */

    async function syncConta(){
      if(syncing){syncDeNovo=true;return;}
      syncing=true;syMsg("Sincronizando com sua conta…");
      try{
        const todos=await rq(db.transaction("mon").objectStore("mon").getAll()), fotos=await rq(db.transaction("img").objectStore("img").getAll()), porFoto=Object.fromEntries(fotos.map(i=>[i.key,i.data]));
        const items=Object.fromEntries(todos.filter(m=>m.custom).map(m=>[m.key,{...m,photo:porFoto[m.key]||""}]));
        const d=await acervo.mesclar({v:1,items,deleted:TOMB,tr:TR});
        await acervo.aplicar(d);TOMB=d.deleted||{};Object.assign(TR,d.tr||{}); await reload();
        localStorage.removeItem("ini_sync"); saveTR();syMsg("Sincronizado com sua conta");
      }catch(e){syMsg('<span class="err">'+esc(e.message)+'</span>');}
      finally{syncing=false;if(syncDeNovo){syncDeNovo=false;queueSync();}}
    }
    let TOMB = {}, syncing = false, syncDeNovo = false, syTimer = null;
    try { TOMB = JSON.parse(localStorage.getItem(acervo.chave("ini_tomb")) || "{}"); localStorage.removeItem("ini_sync"); localStorage.removeItem("ini_pub"); localStorage.removeItem("ini_admin"); } catch (_) {}
    const saveTomb = () => { try { localStorage.setItem(acervo.chave("ini_tomb"), JSON.stringify(TOMB)); } catch (_) {} };
    const syMsg = h => {try{localStorage.setItem(acervo.chave("ini_sync_status"),JSON.stringify({mensagem:String(h).replace(/<[^>]*>/g,""),em:Date.now()}));}catch(_){}};
    window.addEventListener("online", () => queueSync());
    const touch = async (k) => { const m=BY[k];if(!m)return;if(m.custom){m.updatedAt=Date.now();await put('mon',[m]);queueSync();} };
    function queueSync() { if (!window.nuvem?.usuario() || !acervo.ativo()) return; clearTimeout(syTimer); syTimer = setTimeout(syncNow, 1500); }
    async function syncNow() { if(window.nuvem?.usuario() && acervo.ativo()) return syncConta(); }
    document.addEventListener("visibilitychange", () => { if (!document.hidden) queueSync(); });

    /* Catálogo 2014 empacotado no próprio site, sem consulta a fontes externas. */
    let PACKS = [], LP = {};
    try { LP = JSON.parse(localStorage.getItem(acervo.chave("ini_packs")) || "{}"); } catch (_) {}
    const saveLP = () => { try { localStorage.setItem(acervo.chave("ini_packs"), JSON.stringify(LP)); } catch (_) {} };
    async function loadPack(p) {
      status(`Carregando ${esc(p.name)}…`);
      const r = await fetch("dados/bestiario/" + encodeURIComponent(p.key) + ".json?v=" + p.v, { cache: "no-cache" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      await put("mon", d.monsters || []); await put("spl", d.spells || []);
      LP[p.key] = p.v; saveLP(); await reload();
      status(`${esc(p.name)}: ${(d.monsters || []).length} monstros e ${(d.spells || []).length} magias carregados.`);
    }
    async function carregarCatalogo() {
      if(!window.nuvem?.usuario())return;
      try {
        const d=(await CATALOGO.carregar(true));
        if(!d)return;
        const mon=(d.mon||[]).filter(m=>!m.custom&&EDICOES.permitida(m)),keys=new Set(mon.map(m=>m.key));
        await put("mon",mon);await put("spl",(d.spl||[]).filter(m=>!m.custom&&EDICOES.permitida(m)));
        await put("img",(d.img||[]).filter(i=>keys.has(i.key)&&(i.data===""||String(i.data||"").startsWith("data:image/"))));
        Object.assign(TR,d.tr||{});saveTR();
        await reload();
      }catch(e){status('<span class="err">Não consegui atualizar o catálogo compartilhado: '+esc(e.message)+'</span>');}
    }
    async function initPacks() {
      try { const r = await fetch("dados/bestiario/index.json", { cache: "no-cache" }); if (r.ok) PACKS = (await r.json()).filter(p=>p.key==="srd-2014"); } catch (_) {}
      for (const p of PACKS) if (LP[p.key] !== p.v) { try { await loadPack(p); } catch (err) { console.error(err); } }
    }


    const o = indexedDB.open(acervo.banco(), 3);
    o.onupgradeneeded = () => { const d = o.result; ["mon", "spl", "img"].forEach((s) => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: "key" }); }); };
    o.onblocked = () => status("Feche as outras abas do aplicativo e recarregue para atualizar o armazenamento.");
    o.onsuccess = () => { db = o.result; db.onversionchange = () => db.close(); reload().then(syncNow).then(initPacks).then(carregarCatalogo).then(()=>window.ESTADO_SECAO?.restaurar()); window.CATALOGO?.iniciar();window.addEventListener('catalogo:atualizado',()=>reload().catch(console.error)); };
    o.onerror = () => status("Este navegador bloqueou o armazenamento local.");
  })();
