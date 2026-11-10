  (async () => {
    const API = "https://api.open5e.com/v2", $ = (s) => document.querySelector(s);
    let D;
    try { D = await fetch("dados/srd-pt.json").then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }); }
    catch (e) { $("#dbinfo").innerHTML = `<span class="err">Não consegui carregar as traduções (${e.message}). Abra o site por um endereço http(s), não direto do arquivo.</span>`; throw e; }
    /* fotos públicas dos monstros da API (pasta fotos/ do site); as criações próprias nunca entram aqui */
    let PUB = new Set();
    try { const r = await fetch("fotos/index.json", { cache: "no-cache" }); if (r.ok) PUB = new Set(await r.json()); } catch (_) {}
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
    /* ===== Tradução pessoal do Livro do Jogador (vem do importador, fica em localStorage e no repositório privado) ===== */
    // nome no PDF (sem acento, minúsculo, sem "de Bigby" etc.) → nome em inglês; tem prioridade sobre a comparação de nomes
    const LDJ_NOMES = Object.fromEntries(("contramagica=Counterspell;controlar a agua=Control Water;protecao contra a morte=Death Ward;riso histerico=Hideous Laughter;ataque certeiro=True Strike;globos de luz=Dancing Lights;consertar=Mending;zombaria viciosa=Vicious Mockery;riso historico=Hideous Laughter;identificacao=Identify;passos longos=Longstrider;ampliar plantas=Plant Growth;dificultar deteccao=Nondetection;enviar mensagem=Sending;idiomas=Tongues;nevoa fetida=Stinking Cloud;pequena cabana=Tiny Hut;terreno alucinogeno=Hallucinatory Terrain;conhecimento lendario=Legend Lore;ataque visual=Eyebite;danca irresistivel=Irresistible Dance;espada=Arcane Sword;miragem=Mirage Arcane;prisao de energia=Forcecage;metamorfose=Polymorph;alterar forma=Shapechange;metamorfose verdadeira=True Polymorph;conjurar fada=Conjure Fey;carne para pedra=Flesh to Stone;viagem planar=Plane Shift;estabilizar=Spare the Dying;detectar o bem e mal=Detect Evil and Good;infringir ferimentos=Inflict Wounds;protecao contra o bem e mal=Protection from Evil and Good;purificar alimentos=Purify Food and Drink;raio guiador=Guiding Bolt;ajuda=Aid;aprimorar habilidade=Enhance Ability;oracao curativa=Prayer of Healing;vinculo protetor=Warding Bond;andar na agua=Water Walk;criar alimentos=Create Food and Water;espiritos guardioes=Spirit Guardians;falar com os mortos=Speak with Dead;glifo de vigilancia=Glyph of Warding;adivinhacao=Divination;guardiao da fe=Guardian of Faith;dissipar o bem e mal=Dispel Evil and Good;praga=Contagion;aliado planar=Planar Ally;doenca plena=Harm;banquete dos herois=Heroes' Feast;palavra de recordacao=Word of Recall;conjurar celestial=Conjure Celestial;palavra divina=Divine Word;druidismo=Druidcraft;constricao=Entangle;passos sem pegadas=Pass without Trace;pele de arvore=Barkskin;conjurar elementais menores=Conjure Minor Elementals;conjurar seres da floresta=Conjure Woodland Beings;dominar besta=Dominate Beast;pele de pedra=Stoneskin;tempestade de gelo=Ice Storm;caminhar em arvores=Tree Stride;conjurar elemental=Conjure Elemental;reencarnacao=Reincarnate;teletransporte por arvores=Transport via Plants;espirro acido=Acid Splash;toque arrepiante=Chill Touch;escudo arcano=Shield;vitalidade falsa=False Life;recuo acelerado=Expeditious Retreat;nublar=Blur;patas de aranha=Spider Climb;velocidade=Haste;telecinesia=Telekinesis;bola de fogo controlavel=Delayed Blast Fireball;teletransporte=Teleport;area escorregadia=Grease;aura magica=Arcanist's Magic Aura;truque de corda=Rope Trick;escudo de fogo=Fire Shield;mao=Arcane Hand;invocacao instantanea=Instant Summons;recipiente arcano=Magic Jar;isolamento=Sequester;auxilio divino=Divine Favor;marca do cacador=Hunter's Mark;rajada mistica=Eldritch Blast;repreensao infernal=Hellish Rebuke;prestidigitacao=Prestidigitation;circulo de teletransporte=Teleportation Circle;" +
      "forjar morte=Feign Death;forca fantasmagorica=Phantasmal Force;portal arcano=Arcane Gate;telepatia=Telepathy;palavra de poder curar=Power Word Heal;amizade=Friends;protecao contra laminas=Blade Ward;chicote de espinhos=Thorn Whip;armadura de agathys=Armor of Agathys;bracos de hadar=Arms of Hadar;fome de hadar=Hunger of Hadar;bruxaria=Hex;raio de bruxa=Witch Bolt;sussurros dissonantes=Dissonant Whispers;orbe cromatica=Chromatic Orb;raio adoecente=Ray of Sickness;destruicao colerica=Wrathful Smite;destruicao lancinante=Searing Smite;destruicao trovejante=Thunderous Smite;destruicao cegante=Blinding Smite;destruicao estonteante=Staggering Smite;destruicao banidora=Banishing Smite;duelo compelido=Compelled Duel;golpe constritor=Ensnaring Strike;saraivada de espinhos=Hail of Thorns;coroa da loucura=Crown of Madness;nuvem de adagas=Cloud of Daggers;cordao de flechas=Cordon of Arrows;sentido bestial=Beast Sense;arma elemental=Elemental Weapon;aura de vitalidade=Aura of Vitality;manto do cruzado=Crusader's Mantle;conjurar rajada=Conjure Barrage;flecha relampejante=Lightning Arrow;aura de pureza=Aura of Purity;aura de vida=Aura of Life;vinha esmagadora=Grasping Vine;circulo de poder=Circle of Power;onda destrutiva=Destructive Wave;aljava veloz=Swift Quiver;conjurar saraivada=Conjure Volley;tsunami=Tsunami"
    ).split(";").map((p) => p.split("=")));
    const LDJ_PREFERIR = new Set(["arcane sword"]); // texto do D.S ruim: usa o do LDJ mesmo havendo tradução
    const POSSES = / de (bigby|tasha|otto|leomund|mordenkainen|otiluke|evard|tenser|nystul|melf|drawmij|rary)$/;
    const fold = (s) => nz(s).replace(/[:.,!?]/g, "").replace(/\s+/g, " ").trim().replace(POSSES, "");
    const LDJ = { meta: {}, alias: {}, novos: new Set(), semPar: [] };
    function aplicarLDJ(dados) {
      if (!dados || !dados.magias) return;
      const porPt = {};
      for (const [k, v] of Object.entries(D.S)) if (!k.startsWith("pt:")) porPt[fold(v[0])] ??= k;
      LDJ.semPar = [];
      for (const [f, m] of Object.entries(dados.magias)) {
        const en = LDJ_NOMES[f], key = en ? en.toLowerCase() : porPt[f] || "pt:" + f;
        if (key.startsWith("pt:")) LDJ.semPar.push(m.n);
        LDJ.meta[key] = m; LDJ.alias[key] = m.n;
        if (!D.S[key] || LDJ_PREFERIR.has(key) || LDJ.novos.has(key)) {
          D.S[key] = [m.n, m.d, m.mat || "", en || D.S[key]?.[3] || m.n];
          LDJ.novos.add(key);
        }
      }
      if (LDJ.semPar.length) console.info("LDJ sem correspondência em inglês:", LDJ.semPar);
    }
    try { aplicarLDJ(JSON.parse(localStorage.getItem("ini_ldj") || "null")); } catch (_) {}
    const tr = (s) => trW(s).replace(/(\d+(?:\.\d+)?)\s*(?:ft\.?|feet)/gi, (_, n) => fm(+n)).replace(/, (e|ou) /g, " $1 ");
    const trAL = mk({ unaligned: "sem tendência", "any alignment": "qualquer tendência", "any non-good alignment": "qualquer tendência não boa", "any non-lawful alignment": "qualquer tendência não leal", "any chaotic alignment": "qualquer tendência caótica", "any evil alignment": "qualquer tendência má", "non-good": "não bom", "non-lawful": "não leal", typically: "geralmente", usually: "geralmente", or: "ou", and: "e", lawful: "leal", chaotic: "caótico", neutral: "neutro", good: "bom", evil: "mau", alignment: "tendência" });
    const AL = (s) => { s = String(s || "").toLowerCase().trim(); if (!s || s === "—") return s || ""; return cap(trAL(s.replace(/\b(lawful|chaotic|neutral) (good|evil|neutral)\b/g, "$1 e $2"))); };
    const X = { bite: "Mordida", claw: "Garra", claws: "Garras", tail: "Cauda", slam: "Pancada", sting: "Ferrão", gore: "Chifrada", hooves: "Cascos", tentacle: "Tentáculo", tentacles: "Tentáculos", fist: "Punho", "unarmed strike": "Ataque Desarmado", longsword: "Espada Longa", shortsword: "Espada Curta", scimitar: "Cimitarra", shortbow: "Arco Curto", longbow: "Arco Longo", dagger: "Adaga", greataxe: "Machado Grande", greatsword: "Montante", spear: "Lança", javelin: "Azagaia", mace: "Maça", quarterstaff: "Bordão", club: "Clava", greatclub: "Clava Grande", rapier: "Rapieira", handaxe: "Machadinha", morningstar: "Maça Estrela", warhammer: "Martelo de Guerra", battleaxe: "Machado de Batalha", halberd: "Alabarda", trident: "Tridente", net: "Rede", sling: "Funda", whip: "Chicote", "light crossbow": "Besta Leve", "heavy crossbow": "Besta Pesada", "hand crossbow": "Besta de Mão", pike: "Pique", glaive: "Glaive", maul: "Malho", flail: "Mangual", spellcasting: "Conjuração", multiattack: "Ataque Múltiplo" };

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
      if (at) { if (hit == null && at.to_hit_mod != null) hit = at.to_hit_mod; if (!dmg.length && at.damage_die_count) dmg.push({ n: at.damage_die_count, f: +String(at.damage_die_type).slice(1), b: at.damage_bonus || 0, t: at.damage_type?.name || at.extra_damage_type?.name || "" }); }
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
    const av = (m, size = 36) => { const src = m && ((PH[m.key]) || (!m.custom && PUB.has(m.key) ? pubName(m.key) : "") || illu(m)); const st = `width:${size}px;height:${size}px`; return src ? `<img class="av" style="${st}" src="${esc(src)}" alt="" loading="lazy">` : `<span class="av av0" style="${st};font-size:${Math.round(size * 0.45)}px">${esc(((m && (pt(m) || m.name)) || "?").charAt(0).toUpperCase())}</span>`; };
    const tsz = (m) => { const t = TP[m.type?.name] || m.type?.name || "", z = SZ[m.size?.name] || m.size?.name || ""; return t && z ? `${t} (${z})` : t || z; };

    let TR = {}; try { TR = JSON.parse(localStorage.getItem("ini_tr") || "{}"); } catch (_) {}
    const saveTR = () => { try { localStorage.setItem("ini_tr", JSON.stringify(TR)); } catch (_) {} };
    const pt = (m) => { const k = m.name.toLowerCase(); return TR[k] || D.M[k] || ""; };

    /* banco local (IndexedDB) */
    let db, ALL = [], SP = [], PH = {}, BY = {}, ABI = new Map(), curSheet = null, phKey = null, formPhoto, shown = 40, showAll = false, editKey = null, cmSpells = [], spOrigin = "panel";
    const rq = (r) => new Promise((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
    const done = (t) => new Promise((ok, no) => { t.oncomplete = ok; t.onerror = () => no(t.error); });
    const put = async (store, arr) => { const t = db.transaction(store, "readwrite"); arr.forEach((x) => t.objectStore(store).put(x)); await done(t); };
    const del = async (store, key) => { const t = db.transaction(store, "readwrite"); t.objectStore(store).delete(key); await done(t); };
    const status = (h) => { $("#dl-status").innerHTML = h; };
    async function reload() {
      ALL = await rq(db.transaction("mon").objectStore("mon").getAll());
      SP = await rq(db.transaction("spl").objectStore("spl").getAll());
      PH = Object.fromEntries((await rq(db.transaction("img").objectStore("img").getAll())).map((x) => [x.key, x.data]));
      BY = Object.fromEntries(ALL.map((m) => [m.key, m]));
      ALL.sort((a, b) => a.name.localeCompare(b.name)); SP.sort((a, b) => a.name.localeCompare(b.name));
      $("#dbinfo").textContent = ALL.length ? `${ALL.length} fichas e ${SP.length} magias salvas neste computador.` : "Nada salvo ainda. Use “Baixar / atualizar bestiário”.";
      $("#spinfo").textContent = (SP.length ? `${SP.length} magias baixadas, além das ${Object.keys(D.S).length} do SRD 5.1 já embutidas.` : `${Object.keys(D.S).length} magias do SRD 5.1 embutidas (em português). Baixe o bestiário para incluir outras fontes.`) + (LDJ.novos.size ? ` Tradução pessoal do LDJ: ${Object.keys(LDJ.meta).length} magias.` : "");
      abiIndex(); buildFilter(); renderBestiary(); renderColls(); spSearch(); if (document.activeElement === $("#name")) sugg(); window.__ini.render();
    }
    async function api(path) { const r = await fetch(path.startsWith("http") ? path : API + path); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }
    async function getPage(url) {
      try { return await api(url); }
      catch (e) { if (/HTTP 400/.test(e.message) && /[?&]ordering=/.test(url)) return api(url.replace(/([?&])ordering=[^&]*&?/, "$1").replace(/[?&]$/, "")); throw e; }
    }

    /* o campo Nome de “Adicionar combatente” é a busca do bestiário */
    const match = (m, q) => nz(m.name + " " + pt(m) + " " + (m.subtitle || "")).includes(q);
    const sug = $("#sug");
    function sugg() {
      const raw = $("#name").value.trim(), q = nz(raw);
      sug.hidden = q.length < 2; if (q.length < 2) return;
      const r = ALL.filter((m) => match(m, q)).slice(0, 12);
      sug.innerHTML = r.map((m) => `<div data-sug="${esc(m.key)}">${av(m, 22)}${esc(pt(m) || m.name)}${pt(m) ? ` <span class="muted">(${esc(m.name)})</span>` : ""} <span class="muted">· ${CAT[catOf(m)]} · ${lvl(m)} · CA ${m.armor_class} · PV ${m.hit_points} · ${esc(srcOf(m))}</span></div>`).join("")
        + (q.length > 2 ? `<div data-online="1" class="muted">${r.length ? "Não é este? " : "Nada no bestiário local. "}Buscar “${esc(raw)}” na Open5e (online)</div>` : "");
    }
    $("#name").addEventListener("input", () => { window.__ini.pending = ""; sugg(); });
    $("#name").addEventListener("focus", sugg);
    const uniq = (base) => {
      const re = new RegExp("^" + rx(base) + "(?: (\\d+))?$");
      let maior = 0;
      for (const c of window.__ini.list()) { const m = c.name.match(re); if (m) maior = Math.max(maior, m[1] ? +m[1] : 1); }
      return maior ? `${base} ${maior + 1}` : base;
    };
    const rollInit = (m) => 1 + Math.floor(Math.random() * 20) + (m.initiative_bonus ?? Math.floor(((m.ability_scores?.dexterity ?? 10) - 10) / 2));
    function pick(k) {
      const m = ALL.find((x) => x.key === k); if (!m) return;
      $("#name").value = uniq(pt(m) || m.name); $("#kind").value = CAT[catOf(m)]; $("#initiative").value = rollInit(m);
      $("#hp").value = $("#maxHp").value = m.hit_points; $("#ac").value = m.armor_class;
      window.__ini.pending = m.key; sug.hidden = true;
    }
    function addMon(m) {
      window.__ini.add({ name: uniq(pt(m) || m.name), kind: CAT[catOf(m)], initiative: rollInit(m), hp: m.hit_points, maxHp: m.hit_points, ac: m.armor_class, key: m.key });
    }
    async function online() {
      const q = $("#name").value.trim(); sug.innerHTML = '<div class="muted">Buscando na Open5e…</div>';
      try {
        const j = await api("/creatures/?name__icontains=" + encodeURIComponent(q) + "&limit=30&ordering=name");
        await put("mon", j.results || []); await reload(); sug.hidden = false; sugg();
        if (!(j.results || []).length) sug.innerHTML = '<div class="muted">A Open5e não tem nenhum monstro com esse nome.</div>';
      } catch (e) { sug.innerHTML = `<div class="err">Falha na busca online (${esc(e.message)}).</div>`; }
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
        <span class="acts"><button class="small" data-view="${k}">Ver</button><button class="small" data-ph="${k}" title="Adicionar ou trocar a foto">${ico("camera")}</button><button class="small primary" data-add="${k}">Adicionar</button>${m.custom ? `<button class="small" data-edit="${k}">Editar</button>` : `<button class="small" data-tr="${k}">Traduzir</button>`}<button class="small danger" data-del="${k}">Excluir</button></span></div>`;
    }
    function renderBestiary() {
      const q = nz($("#bq").value.trim()), f = $("#bf").value;
      $("#ball").textContent = showAll ? "Ocultar lista" : "Mostrar tudo";
      if (!q && !f && !showAll) { $("#bcount").textContent = ALL.length ? `${ALL.length} fichas guardadas. Pesquise, escolha um filtro ou use “Mostrar tudo”.` : "Nenhuma ficha guardada ainda."; $("#blist").innerHTML = ""; return; }
      const ws = q.split(/\s+/).filter(Boolean), list = ALL.filter((m) => inF(m, f) && ws.every((w) => hay(m).includes(w)));
      $("#bcount").textContent = `${list.length} fichas`;
      $("#blist").innerHTML = list.slice(0, shown).map(rowFull).join("") + (list.length > shown ? `<button class="small" data-more="1">Mostrar mais (${list.length - shown})</button>` : "") || '<span class="muted">Nada encontrado.</span>';
    }
    $("#bf").onchange = () => { shown = 40; renderBestiary(); };
    $("#bq").addEventListener("input", () => { shown = 40; renderBestiary(); });
    $("#ball").onclick = () => { showAll = !showAll; shown = 40; renderBestiary(); };

    /* coleções baixadas (com exclusão) */
    function renderColls() {
      const g = {};
      ALL.filter((m) => !m.custom).forEach((m) => { (g[m.document?.key || "?"] ??= { n: srcOf(m), m: 0, s: 0 }).m++; });
      SP.forEach((s) => { (g[s.document?.key || "?"] ??= { n: s.document?.display_name || s.document?.key || "?", m: 0, s: 0 }).s++; });
      $("#colls").innerHTML = Object.entries(g).map(([k, v]) => `<div class="res"><span><b>${esc(v.n)}</b> <span class="muted">${v.m} monstros · ${v.s} magias</span></span><button class="small danger" data-delcol="${esc(k)}">Excluir coleção</button></div>`).join("");
    }

    /* download: uma fonte por vez, com ordenação por nome (paginação estável) */
    $("#dl-cancel").onclick = () => { $("#docs-wrap").hidden = true; };
    $("#dl-open").onclick = async () => {
      if (!$("#docs-wrap").hidden) { $("#docs-wrap").hidden = true; return; }
      $("#docs-wrap").hidden = false;
      try {
        const j = await api("/documents/?limit=100");
        $("#docs").innerHTML = j.results.map((d) => `<label><input type="checkbox" value="${esc(d.key)}" ${/^srd-20/.test(d.key) ? "checked" : ""}>${esc(d.display_name || d.name || d.key)}</label>`).join("");
      } catch (e) { $("#docs").innerHTML = `<span class="err">Não foi possível listar as fontes (${esc(e.message)}). Verifique a conexão.</span>`; }
    };
    async function pull(path, store, label) {
      let url = API + path, n = 0, total = 0;
      while (url) {
        const j = await getPage(url.replace(/^http:/, "https:")); total = j.count ?? total;
        await put(store, j.results || []); n += (j.results || []).length; status(`${esc(label)}: ${n} de ${total}…`); url = j.next;
      }
      return [n, total];
    }
    $("#dl-go").onclick = async () => {
      const keys = [...document.querySelectorAll("#docs input:checked")].map((i) => i.value);
      if (!keys.length) { status("Marque ao menos uma fonte."); return; }
      $("#dl-go").disabled = true; let nm_ = 0, ns = 0, miss = 0;
      try {
        for (const k of keys) {
          const f = `document__key__in=${encodeURIComponent(k)}&limit=100&ordering=name`;
          const [a, ta] = await pull("/creatures/?" + f, "mon", `Monstros (${k})`); nm_ += a; miss += Math.max(0, ta - a);
          const [b, tb] = await pull("/spells/?" + f, "spl", `Magias (${k})`); ns += b; miss += Math.max(0, tb - b);
        }
        $("#docs-wrap").hidden = true; await reload();
        status(`Concluído: ${nm_} monstros e ${ns} magias.` + (miss ? " Alguns itens podem ter ficado de fora; digite o nome no campo “Adicionar combatente” e use a busca online." : ""));
      } catch (e) { console.error(e); await reload(); status(`<span class="err">Falha no download (${esc(e.message)}). O que já foi baixado foi mantido; tente de novo.</span>`); }
      $("#dl-go").disabled = false;
    };

    /* abas laterais: ficha (direita) e magia (esquerda, ou empilhada na direita) */
    function layout() {
      const full = innerWidth < 700, W = full ? innerWidth : Math.round(Math.min(460, Math.max(320, innerWidth * 0.34)));
      document.documentElement.style.setProperty("--dw", W + "px");
      const sp = $("#spd"), dest = $(innerWidth < 1100 || spOrigin === "sheet" ? "#dock-r" : "#dock-l");
      if (sp.parentNode !== dest) dest.appendChild(sp);
      let L = false, R = false;
      [["#dock-l", false], ["#dock-r", true]].forEach(([s, r]) => { const dk = $(s), vis = [...dk.children].some((c) => !c.hidden); dk.hidden = !vis; if (r) R = vis; else L = vis; });
      document.body.style.paddingLeft = 22 + (L && !full ? W : 0) + "px"; document.body.style.paddingRight = 22 + (R && !full ? W : 0) + "px";
    }
    window.addEventListener("resize", layout);
    const closeSheet = () => { $("#sheet").hidden = true; $("#tip").style.display = "none"; layout(); };
    const closeSpell = () => { $("#spd").hidden = true; $("#tip").style.display = "none"; layout(); };

    /* ficha do monstro */
    const speed = (sp) => sp ? Object.entries(sp).filter(([k, v]) => k !== "unit" && v).map(([k, v]) => k === "walk" ? fm(v) : `${SPD[k] || k} ${fm(v)}`).join(", ") : "—";
    const habD = (n, i, x = "", pre = "") => `<div class="hab" data-desc="${esc(i.plain)}"><b>${esc(n)}</b>${x}${pre}<div class="full">${i.html}${i.tr && i.orig && i.orig !== i.plain ? `<div class="orig">Original: ${esc(i.orig)}</div>` : ""}</div></div>`;
    const spRow = (name, key) => { const d = D.S[String(name).toLowerCase()]; return `<div class="hab" data-spopen="${esc(key || String(name).toLowerCase())}" data-desc="${esc(d ? d[1] : "")}" style="cursor:pointer"><b>${esc(d ? d[0] : name)}</b>${d ? ` <span class="muted">(${esc(d[3] || name)})</span>` : ""}</div>`; };
    function openSheet(k) {
      const m = ALL.find((x) => x.key === k), el = $("#sheet-body"); curSheet = k;
      if (!m) { el.innerHTML = '<span class="muted">Ficha indisponível: não está no bestiário local.</span>'; $("#sheet").hidden = false; layout(); return; }
      const r = m.resistances_and_immunities || {}, ln = (l, v) => v ? `<div><b>${l}:</b> ${esc(v)}</div>` : "";
      const saves = Object.entries(m.saving_throws || {}).filter(([a, v]) => v !== m.modifiers?.[a]).map(([a, v]) => `${ABIL.find((x) => x[0] === a)?.[1] || a} ${mod(v)}`).join(", ");
      const skills = Object.entries(m.skill_bonuses || {}).map(([a, v]) => `${SK[a] || a} ${mod(v)}`).join(", ");
      const senses = [["darkvision_range", "visão no escuro"], ["blindsight_range", "percepção às cegas"], ["tremorsense_range", "sentido sísmico"], ["truesight_range", "visão verdadeira"]].filter(([a]) => m[a]).map(([a, l]) => `${l} ${fm(m[a])}`).concat("Percepção passiva " + m.passive_perception).join(", ");
      const g = {}; (m.actions || []).forEach((a) => (g[a.action_type || "ACTION"] ??= []).push(a));
      const acts = Object.entries(g).map(([t, arr]) => `<div class="grp">${esc(GRP[t] || t)}</div>` + arr.map((a) => {
        const ri = rollInfo(a);
        return habD(nmA(a), descInfo(a.name, a.desc, m), ri ? ` <button class="small roll" data-roll="${esc(JSON.stringify(ri))}">Rolar</button>` : "", ri ? `<div class="ln muted">${esc(rollLine(ri))}</div><div class="rr"></div>` : "");
      }).join("")).join("");
      const spl = (m.spells || []).map((s) => spRow(s.name, s.key)).join("");
      const p = pt(m), cat = catOf(m);
      el.innerHTML = `<div class="row" style="gap:12px">${av(m, 72)}<span><button class="small" data-ph="${esc(m.key)}">${PH[m.key] ? "Trocar foto" : "Adicionar foto"}</button>${PH[m.key] ? ` <button class="small subtle" data-phx="${esc(m.key)}">Remover foto</button>` : ""}</span></div><h3>${esc(p || m.name)}</h3><div class="muted">${[p ? m.name : "", cat !== "monster" || m.custom ? CAT[cat] : "", tsz(m), m.alignment && m.alignment !== "—" ? AL(m.alignment) : "", m.subtitle || "", srcOf(m)].filter(Boolean).map(esc).join(" · ")}</div>
        <div class="stats"><span>CA <b>${m.armor_class}</b>${m.armor_detail ? " (" + esc(tr(m.armor_detail)) + ")" : ""}</span><span>PV <b>${m.hit_points}</b> ${esc(m.hit_dice || "")}</span><span>Deslocamento <b>${esc(speed(m.speed))}</b></span><span>${cat === "monster" ? "ND" : "Nível"} <b>${cat === "monster" ? CRV(m) : (m.level ?? "—")}</b></span></div>
        <table class="ab"><tr>${ABIL.map((a) => `<th>${a[1]}</th>`).join("")}</tr><tr>${ABIL.map((a) => `<td>${m.ability_scores?.[a[0]]} (${mod(m.modifiers?.[a[0]])})</td>`).join("")}</tr></table>
        ${ln("Salvaguardas", saves)}${ln("Perícias", skills)}${ln("Resistências", tr(r.damage_resistances_display))}${ln("Imunidades", tr(r.damage_immunities_display))}${ln("Vulnerabilidades", tr(r.damage_vulnerabilities_display))}${ln("Imunidades a condições", tr(r.condition_immunities_display))}${ln("Sentidos", senses)}${ln("Idiomas", tr(m.languages?.as_string))}
        ${(m.traits || []).length ? '<div class="grp">Características</div>' + m.traits.map((t) => habD(nm(t.name), descInfo(t.name, t.desc, m))).join("") : ""}${acts}${spl ? '<div class="grp">Magias</div>' + spl : ""}
        <p class="muted" style="font-size:11px;margin-top:14px">Descrições traduzidas quando há tradução confiável; o restante segue em inglês. Clique em uma descrição para ver o original.</p>`;
      $("#sheet").hidden = false; $("#sheet").scrollTop = 0; layout();
    }

    /* magias: lista no painel, texto na aba lateral */
    const abiIndex = () => { ABI = new Map(); ALL.forEach((m) => { [...(m.traits || []).map((a) => ({ a, k: "Característica", m })), ...(m.actions || []).map((a) => ({ a, k: GRP[a.action_type] || "Ação", m }))].forEach((x) => { const l = fname(x.a.name); if (!ABI.has(l)) ABI.set(l, { name: x.a.name.replace(/\s*\(.*\)\s*$/, ""), items: [] }); ABI.get(l).items.push(x); }); }); };
    const catalog = () => {
      const have = new Set(SP.map((s) => s.name.toLowerCase()));
      return SP.concat(Object.entries(D.S).filter(([k]) => !have.has(k)).map(([k, v]) => ({
        key: "ds:" + k, name: v[3] || k, level: LDJ.meta[k] ? LDJ.meta[k].nivel : null,
        document: LDJ.novos.has(k) ? { display_name: "Livro do Jogador (pessoal)", key: "ldj" } : { display_name: "SRD 5.1", key: "srd-2014" }
      })));
    };
    function spSearch() {
      const q = nz($("#sq").value.trim()), box = $("#spells"); if (!q) { box.innerHTML = ""; return; }
      const kOf = (s) => s.key.startsWith("ds:") ? s.key.slice(3) : s.name.toLowerCase();
      const r = catalog().filter((s) => { const k = kOf(s); return nz(s.name + " " + (D.S[k]?.[0] || "") + " " + (LDJ.alias[k] || "")).includes(q); }).slice(0, 30);
      box.innerHTML = r.map((s) => {
        const k = kOf(s), d = D.S[k], pm = LDJ.meta[k];
        const al = LDJ.alias[k] && d && nz(LDJ.alias[k]) !== nz(d[0]) ? ` · no LDJ: ${esc(LDJ.alias[k])}` : "";
        const info = [s.level == null ? "" : s.level ? s.level + "º círculo" : "Truque", SCH[s.school?.name] || pm?.escola || "", srcOf(s)].filter(Boolean).join(" · ");
        return `<div class="res" data-spopen="${esc(s.key)}"><span><b>${esc(d ? d[0] : s.name)}</b>${d && d[0] !== s.name ? ` <span class="muted">(${esc(s.name)})</span>` : ""}<br><span class="muted">${info}${al}</span></span></div>`;
      }).join("") + abilityRows(q) || '<span class="muted">Nada encontrado.</span>';
    }
    function abilityRows(q) {
      return [...ABI.entries()].filter(([l, v]) => nz(v.name + " " + nm(v.name)).includes(q)).slice(0, 15).map(([l, v]) => `<div class="res" data-abopen="${esc(l)}"><span><b>${esc(nm(v.name))}</b> <span class="muted">(${esc(v.name)})</span><br><span class="muted">Habilidade de monstro · ${v.items.length} ${v.items.length > 1 ? "monstros" : "monstro"}: ${esc(v.items.slice(0, 3).map((x) => pt(x.m) || x.m.name).join(", "))}${v.items.length > 3 ? "…" : ""}</span></span></div>`).join("");
    }
    function openAbility(l, ix = 0, origin) {
      const v = ABI.get(l); if (!v) return; spOrigin = origin || spOrigin; const it = v.items[ix] || v.items[0], info = descInfo(it.a.name, it.a.desc, it.m);
      $("#spd-body").innerHTML = `<h3>${esc(nmA(it.a))}</h3><div class="muted">${esc(it.a.name)}</div>
        <div class="sp-meta"><div><b>Tipo:</b> Habilidade de monstro (${esc(it.k.toLowerCase())})</div><div><b>Exemplo de:</b> ${esc(pt(it.m) || it.m.name)} <button class="small" data-view="${esc(it.m.key)}">Abrir ficha</button></div></div>
        <div class="sp-body">${info.html}</div>${info.tr && info.orig !== info.plain ? `<div class="orig">Original: ${esc(info.orig)}</div>` : ""}
        ${v.items.length > 1 ? `<div class="sp-meta"><b>Também em:</b> ${v.items.map((x, i) => `<a class="splink" data-abix="${i}" data-l="${esc(l)}">${esc(pt(x.m) || x.m.name)}</a>`).join(" · ")}<br><span class="muted">O texto muda conforme o monstro (números e alcances).</span></div>` : ""}`;
      $("#spd").hidden = false; $("#spd").scrollTop = 0; layout();
    }
    function openSpell(id, origin) {
      const key = String(id), l = key.replace(/^ds:/, "").toLowerCase();
      const rec = SP.find((s) => s.key === key) || SP.filter((s) => s.name.toLowerCase() === l).sort((a, b) => (b.document?.key === "srd-2014") - (a.document?.key === "srd-2014"))[0];
      const d = D.S[rec ? rec.name.toLowerCase() : l]; if (!rec && !d) return;
      spOrigin = origin || "panel";
      const pm = LDJ.meta[rec ? rec.name.toLowerCase() : l];
      const meta = rec ? [["Círculo", rec.level ? rec.level + "º círculo" : "Truque"], ["Escola", SCH[rec.school?.name] || rec.school?.name], ["Tempo de conjuração", cap(tr(rec.casting_time || ""))], ["Alcance", tr(rec.range_text || "")], ["Componentes", [rec.verbal && "V", rec.somatic && "S", rec.material && "M"].filter(Boolean).join(", ")], ["Duração", cap(tr(rec.duration || "")) + (rec.concentration ? " (concentração)" : "")], ["Ritual", rec.ritual ? "Sim" : ""], ["Fonte", srcOf(rec)]] : pm ? [["Círculo", pm.nivel ? pm.nivel + "º círculo" : "Truque"], ["Escola", pm.escola], ["Tempo de conjuração", pm.tempo], ["Alcance", pm.alcance], ["Componentes", pm.comp], ["Duração", pm.dur], ["Ritual", pm.ritual ? "Sim" : ""], ["Fonte", "Livro do Jogador (tradução pessoal)"]] : [];
      const mat = d?.[2] || rec?.material_specified || "", en = rec ? (rec.desc || "") + (rec.higher_level ? "\n\n" + rec.higher_level : "") : "";
      const other = d && rec && rec.document?.key !== "srd-2014";
      $("#spd-body").innerHTML = `<h3>${esc(d ? d[0] : rec.name)}</h3><div class="muted">${esc(rec ? rec.name : d[3])}</div>
        <div class="sp-meta">${meta.filter(([, v]) => v).map(([k, v]) => `<div><b>${k}:</b> ${esc(v)}</div>`).join("")}</div>
        ${other ? '<div class="sp-note">Texto em português do SRD 5.1 (2014). A versão desta fonte pode ter diferenças; o original está no final.</div>' : ""}
        <div class="sp-body">${esc(d ? d[1] : en)}</div>${mat ? `<div class="sp-body"><b>Materiais:</b> ${esc(mat)}</div>` : ""}${other && en ? `<div class="orig">Original: ${esc(en)}</div>` : ""}`;
      $("#spd").hidden = false; $("#spd").scrollTop = 0; layout();
    }

    /* criar / editar ficha (monstro, personagem ou NPC) */
    $("#cm-type").innerHTML = Object.entries(TP).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
    $("#cm-ab").innerHTML = ABIL.map(([k, l]) => `<div><label>${l}</label><input id="ab-${k}" type="number" value="10"></div>`).join("");
    $("#cm-cat").onchange = () => { const mo = $("#cm-cat").value === "monster"; $("#cm-crl").textContent = mo ? "ND" : "Nível"; if (!mo) $("#cm-type").value = "Humanoid"; };
    const lines = (id) => $(id).value.split("\n").map((s) => s.trim()).filter(Boolean);
    const spName = (s) => D.S[String(s.name).toLowerCase()]?.[0] || s.name;
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
    function resetForm() {
      editKey = null; cmSpells = []; formPhoto = undefined; chips();
      ["#cm-name", "#cm-sub", "#cm-traits", "#cm-acts"].forEach((s) => ($(s).value = "")); ABIL.forEach(([k]) => ($("#ab-" + k).value = 10));
      $("#cm-save").textContent = "Salvar ficha"; $("#cm-cancel").hidden = true; formPv();
    }
    function editCustom(k) {
      const m = ALL.find((x) => x.key === k); if (!m) return;
      resetForm(); editKey = k; cmSpells = (m.spells || []).slice(); chips(); formPv();
      $("#cm-cat").value = catOf(m); $("#cm-cat").onchange(); $("#cm-name").value = m.name; $("#cm-sub").value = m.subtitle || "";
      $("#cm-size").value = m.size?.name || "Medium"; $("#cm-type").value = m.type?.name || "Humanoid";
      $("#cm-cr").value = catOf(m) === "monster" ? m.challenge_rating : (m.level ?? 1); $("#cm-ac").value = m.armor_class; $("#cm-hp").value = m.hit_points;
      $("#cm-hd").value = m.hit_dice || ""; $("#cm-sp").value = m.speed?.walk ?? 30; ABIL.forEach(([a]) => ($("#ab-" + a).value = m.ability_scores?.[a] ?? 10));
      $("#cm-traits").value = m.raw?.traits ?? (m.traits || []).map((t) => `${t.name}: ${t.desc}`).join("\n");
      $("#cm-acts").value = m.raw?.actions ?? (m.actions || []).map((a) => `${a.name} | ${a.desc}`).join("\n");
      $("#cm-save").textContent = "Salvar alterações"; $("#cm-cancel").hidden = false; $("#cm-msg").textContent = "";
      $("#cm").open = true; $("#cm").scrollIntoView({ behavior: "smooth" });
    }
    $("#cm-cancel").onclick = () => { resetForm(); $("#cm-msg").textContent = "Edição cancelada."; };
    function parseAct(l) {
      const p = l.split("|").map((s) => s.trim()), a = { name: p[0], action_type: "ACTION", attacks: [] };
      if (p.length < 3) { a.desc = p[1] || ""; return a; }
      const hit = parseInt(p[1]) || 0, d = (p[2] || "").match(/(\d+)d(\d+)\s*([+-]\s*\d+)?/);
      a.attacks = [{ to_hit_mod: hit, damage_die_count: d ? +d[1] : 0, damage_die_type: d ? "D" + d[2] : "D0", damage_bonus: d && d[3] ? parseInt(d[3].replace(/\s/g, "")) : 0, damage_type: p[3] ? { name: p[3] } : null }];
      a.desc = `Ataque: ${mod(hit)} para acertar. Dano: ${p[2]}${p[3] ? " " + p[3] : ""}. ${p[4] || ""}`.trim();
      return a;
    }
    $("#cm-save").onclick = async () => {
      const name = $("#cm-name").value.trim(); if (!name) { $("#cm-msg").textContent = "Informe o nome."; return; }
      const cat = $("#cm-cat").value, v = parseFloat($("#cm-cr").value) || 0, ab = {}, md = {};
      ABIL.forEach(([k]) => { ab[k] = parseInt($("#ab-" + k).value) || 10; md[k] = Math.floor((ab[k] - 10) / 2); });
      const m = { key: editKey || "custom_" + Date.now().toString(36), custom: true, updatedAt: Date.now(), cat, name, subtitle: $("#cm-sub").value.trim(), document: { display_name: "Personalizado", key: "custom" },
        size: { name: $("#cm-size").value }, type: { name: $("#cm-type").value }, challenge_rating: cat === "monster" ? v : 0, level: cat === "monster" ? null : v, alignment: "—",
        armor_class: parseInt($("#cm-ac").value) || 10, hit_points: parseInt($("#cm-hp").value) || 1, hit_dice: $("#cm-hd").value.trim(),
        speed: { walk: parseInt($("#cm-sp").value) || 0, unit: "feet" }, ability_scores: ab, modifiers: md, saving_throws: {}, skill_bonuses: {},
        initiative_bonus: md.dexterity, passive_perception: 10 + md.wisdom, resistances_and_immunities: {}, spells: cmSpells.slice(),
        raw: { traits: $("#cm-traits").value, actions: $("#cm-acts").value },
        traits: lines("#cm-traits").map((l) => { const i = l.indexOf(":"); return i < 0 ? { name: l, desc: "" } : { name: l.slice(0, i).trim(), desc: l.slice(i + 1).trim() }; }),
        actions: lines("#cm-acts").map(parseAct) };
      const edited = !!editKey; await put("mon", [m]);
      if (typeof formPhoto === "string") await put("img", [{ key: m.key, data: formPhoto }]); else if (formPhoto === null) await del("img", m.key);
      resetForm(); await reload(); queueSync();
      $("#cm-msg").textContent = `“${name}” ${edited ? "atualizado" : "salvo"} no bestiário.`;
    };

    /* eventos */
    $("#sq").addEventListener("input", () => { $("#sq-x").hidden = !$("#sq").value; spSearch(); });
    $("#sq-x").onclick = () => { $("#sq").value = ""; $("#sq-x").hidden = true; spSearch(); $("#sq").focus(); };
    $("#sh-close").onclick = closeSheet; $("#spd-close").onclick = closeSpell;
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { sug.hidden = true; if (!$("#spd").hidden) closeSpell(); else closeSheet(); } });
    $("#combatants").addEventListener("click", (e) => { if (e.target.closest("button,input,select,.fx-form,.fxchip")) return; const a = e.target.closest(".combatant"); if (a && a.dataset.key) openSheet(a.dataset.key); });
    document.addEventListener("click", async (e) => {
      const t = e.target, d = t.dataset, sg = t.closest("[data-sug]");
      tip.style.display = "none";
      if (!t.closest(".field-name")) sug.hidden = true;
      if (!t.closest("#cm-spq,#cm-spsug")) spsug.hidden = true;
      if (sg) return pick(sg.dataset.sug);
      if (t.closest("[data-online]")) return online();
      const ao = t.closest("[data-abopen]"); if (ao) return openAbility(ao.dataset.abopen, 0, "panel");
      const ax = t.closest("[data-abix]"); if (ax) return openAbility(ax.dataset.l, +ax.dataset.abix);
      const pb = t.closest("[data-ph]"); if (pb) return askPhoto(pb.dataset.ph);
      const px = t.closest("[data-phx]"); if (px) { const k = px.dataset.phx; delete PH[k]; await del("img", k); touch(k); renderBestiary(); window.__ini.render(); return openSheet(k); }
      const so = t.closest("[data-spopen]"); if (so) return openSpell(so.dataset.spopen, t.closest("#sheet") ? "sheet" : "panel");
      const sa = t.closest("[data-spadd]");
      if (sa) { const s = catalog().find((x) => x.key === sa.dataset.spadd); if (s && !cmSpells.some((c) => c.key === s.key)) cmSpells.push({ key: s.key, name: s.name }); spq.value = ""; spsug.hidden = true; return chips(); }
      const rb = t.closest("[data-roll]"); if (rb) { rb.closest(".hab").querySelector(".rr").innerHTML = doRoll(JSON.parse(rb.dataset.roll)); return; }
      if (d.chip) { cmSpells.splice(+d.chip, 1); return chips(); }
      if (d.more) { shown += 40; return renderBestiary(); }
      if (d.view) return openSheet(d.view);
      if (d.edit) return editCustom(d.edit);
      if (d.add) { const m = ALL.find((x) => x.key === d.add); if (m) addMon(m); return; }
      if (d.tr) { const m = ALL.find((x) => x.key === d.tr), v = prompt("Nome em português para “" + m.name + "” (vazio remove):", pt(m) || m.name); if (v === null) return; v.trim() ? (TR[m.name.toLowerCase()] = v.trim()) : delete TR[m.name.toLowerCase()]; saveTR(); return renderBestiary(); }
      if (d.del) {
        const m = ALL.find((x) => x.key === d.del); if (!m) return;
        if (!confirm(m.custom ? `Excluir “${m.name}” definitivamente?` : `Remover “${m.name}” do seu bestiário local? Você pode baixar de novo depois.`)) return;
        await del("mon", d.del); if (m.custom) { await del("img", d.del); TOMB[d.del] = Date.now(); saveTomb(); } if (editKey === d.del) resetForm(); await reload(); return queueSync();
      }
      if (d.delcol) {
        const k = d.delcol, nmc = [...ALL, ...SP].find((x) => !x.custom && (x.document?.key || "?") === k); if (!nmc) return;
        if (!confirm(`Excluir a coleção “${srcOf(nmc)}” (monstros e magias) do seu computador? Você pode baixá-la de novo depois. Suas criações não são afetadas.`)) return;
        for (const [store, arr] of [["mon", ALL], ["spl", SP]]) { const keys = arr.filter((x) => !x.custom && (x.document?.key || "?") === k).map((x) => x.key), tx = db.transaction(store, "readwrite"); keys.forEach((x) => tx.objectStore(store).delete(x)); await done(tx); }
        return reload();
      }
      const hb = t.closest(".hab"); if (hb && !t.closest(".roll")) hb.classList.toggle("open");
    });
    const tip = $("#tip");
    document.addEventListener("mouseover", (e) => { if (matchMedia("(hover: none)").matches) return; const h = e.target.closest(".hab,[data-fxtip]"); if (!h || h.classList.contains("open")) { tip.style.display = "none"; return; } const s = h.dataset.desc || h.dataset.fxtip || ""; tip.textContent = s.length > 260 ? s.slice(0, 260) + "… (clique para ler tudo)" : s; tip.style.display = s ? "block" : "none"; });
    document.addEventListener("mousemove", (e) => { tip.style.left = Math.max(8, Math.min(e.clientX + 14, innerWidth - 340)) + "px"; tip.style.top = e.clientY + 14 + "px"; });
    document.addEventListener("mouseout", (e) => { if (!e.relatedTarget?.closest?.(".hab,[data-fxtip]")) tip.style.display = "none"; });
    $("#tr-exp").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify({ ...D.M, ...TR }, null, 1)], { type: "application/json" })); a.download = "traducoes-monstros.json"; a.click(); };
    $("#tr-imp").onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { const o = JSON.parse(await f.text()); for (const k in o) TR[k.toLowerCase()] = String(o[k]); saveTR(); renderBestiary(); } catch (_) { alert("Arquivo JSON inválido."); } e.target.value = ""; };

    window.__ini.avatar = (key, name, size) => av(BY[key] || { name }, size);
    const fileIn = $("#ph-file");
    const toSquare = (file, size) => new Promise((ok, no) => { const url = URL.createObjectURL(file), im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = c.height = size; const q = Math.min(im.width, im.height); c.getContext("2d").drawImage(im, (im.width - q) / 2, (im.height - q) / 2, q, q, 0, 0, size, size); URL.revokeObjectURL(url); ok(c.toDataURL("image/jpeg", 0.85)); }; im.onerror = () => no(new Error("imagem inválida")); im.src = url; });

    /* recorte da foto: zoom, arrastar e prévia do ícone redondo */
    function cropPhoto(file) {
      return new Promise((ok, no) => {
        const url = URL.createObjectURL(file), im = new Image();
        im.onerror = () => { URL.revokeObjectURL(url); no(new Error("imagem inválida")); };
        im.onload = () => {
          const S = 260, base = S / Math.min(im.width, im.height);
          let zoom = 1, ox = 0, oy = 0;
          const ov = document.createElement("div"); ov.className = "crop-ov";
          ov.innerHTML = `<div class="crop-box" role="dialog" aria-label="Ajustar foto">
            <h3>Ajustar foto</h3>
            <canvas class="crop-stage" width="${S}" height="${S}"></canvas>
            <div class="crop-zoom"><span>−</span><input type="range" min="1" max="4" step="0.01" value="1" aria-label="Zoom"><span>+</span></div>
            <div class="crop-prev"><span class="muted">Como vai aparecer:</span><canvas width="72" height="72"></canvas><canvas width="34" height="34"></canvas></div>
            <p class="muted" style="font-size:11px;margin:6px 0 10px">Arraste a imagem para posicionar. Use o controle ou a roda do mouse para o zoom.</p>
            <div class="row" style="justify-content:flex-end;margin:0"><button type="button" class="small subtle" data-c="no">Cancelar</button><button type="button" class="small primary" data-c="ok">Usar foto</button></div></div>`;
          document.body.appendChild(ov);
          const stage = ov.querySelector(".crop-stage"), [p72, p34] = ov.querySelectorAll(".crop-prev canvas"), rg = ov.querySelector("input");
          const clamp = () => { const sc = base * zoom, mx = Math.max(0, (im.width * sc - S) / 2), my = Math.max(0, (im.height * sc - S) / 2); ox = Math.max(-mx, Math.min(mx, ox)); oy = Math.max(-my, Math.min(my, oy)); };
          const paint = (cv, size) => { const c = cv.getContext("2d"), k = size / S, sc = base * zoom; c.clearRect(0, 0, size, size); c.fillStyle = "#000"; c.fillRect(0, 0, size, size); c.drawImage(im, (S / 2 + ox - im.width * sc / 2) * k, (S / 2 + oy - im.height * sc / 2) * k, im.width * sc * k, im.height * sc * k); };
          const draw = () => {
            clamp(); paint(stage, S);
            const c = stage.getContext("2d"); c.save(); c.fillStyle = "rgba(10,9,14,.62)"; c.beginPath(); c.rect(0, 0, S, S); c.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2, true); c.fill("evenodd");
            c.strokeStyle = "#9f7940"; c.lineWidth = 2; c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); c.stroke(); c.restore();
            for (const [cv, sz] of [[p72, 72], [p34, 34]]) { paint(cv, sz); const c2 = cv.getContext("2d"); c2.globalCompositeOperation = "destination-in"; c2.beginPath(); c2.arc(sz / 2, sz / 2, sz / 2, 0, Math.PI * 2); c2.fill(); c2.globalCompositeOperation = "source-over"; }
          };
          let drag = null;
          stage.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, ox, oy }; stage.setPointerCapture(e.pointerId); });
          stage.addEventListener("pointermove", (e) => { if (!drag) return; const r = stage.getBoundingClientRect(), k = S / r.width; ox = drag.ox + (e.clientX - drag.x) * k; oy = drag.oy + (e.clientY - drag.y) * k; draw(); });
          stage.addEventListener("pointerup", () => { drag = null; });
          const setZoom = (z) => { zoom = Math.max(1, Math.min(4, z)); rg.value = zoom; draw(); };
          rg.addEventListener("input", () => setZoom(+rg.value));
          stage.addEventListener("wheel", (e) => { e.preventDefault(); setZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08)); }, { passive: false });
          const fim = (data) => { document.removeEventListener("keydown", esc, true); ov.remove(); URL.revokeObjectURL(url); ok(data); };
          const esc = (e) => { if (e.key === "Escape") { e.stopPropagation(); fim(null); } };
          document.addEventListener("keydown", esc, true);
          ov.addEventListener("click", (e) => {
            const b = e.target.closest("[data-c]"); if (!b) return;
            if (b.dataset.c === "no") return fim(null);
            const out = document.createElement("canvas"); out.width = out.height = 192; paint(out, 192); fim(out.toDataURL("image/jpeg", 0.85));
          });
          draw();
        };
        im.src = url;
      });
    }
    const askPhoto = (k) => { phKey = k; fileIn.value = ""; fileIn.click(); };
    const formPv = () => { const m = editKey && BY[editKey]; const src = formPhoto === undefined ? (m && (PH[m.key])) : formPhoto; $("#cm-phv").innerHTML = src ? `<img class="av" style="width:48px;height:48px" src="${esc(src)}" alt="">` : '<span class="muted">sem foto</span>'; };
    fileIn.onchange = async () => {
      const f = fileIn.files[0]; if (!f) return;
      try { const data = await cropPhoto(f); if (!data) return; if (phKey === "form") { formPhoto = data; formPv(); return; } PH[phKey] = data; await put("img", [{ key: phKey, data }]); touch(phKey); renderBestiary(); window.__ini.render(); if (curSheet === phKey) openSheet(phKey); } catch (e) { alert("Não consegui usar essa imagem: " + e.message); }
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

    /* sincronização das criações com um repositório privado do GitHub */
    let TOMB = {}, SY = {}, syncing = false, syncDeNovo = false, syTimer = null;
    try { TOMB = JSON.parse(localStorage.getItem("ini_tomb") || "{}"); SY = JSON.parse(localStorage.getItem("ini_sync") || "{}"); } catch (_) {}
    const saveTomb = () => { try { localStorage.setItem("ini_tomb", JSON.stringify(TOMB)); } catch (_) {} };
    const saveSY = () => { try { localStorage.setItem("ini_sync", JSON.stringify(SY)); } catch (_) {} };
    [300, 1200, 3000].forEach((ms) => setTimeout(() => { const b = $("#bq"); if (b && SY.repo && b.value === SY.repo && document.activeElement !== b) { b.value = ""; renderBestiary(); } }, ms));
    $("#sy-repo").value = SY.repo || ""; $("#sy-token").value = SY.token || ""; $("#sy-path").value = SY.path || "criacoes.json";
    const syMsg = (h) => { $("#sy-status").innerHTML = h; };
    const b64d = (b) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s/g, "")), (c) => c.charCodeAt(0)));
    const b64e = (str) => { const u = new TextEncoder().encode(str); let bin = ""; for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(bin); };
    const ghUrl = (p = "") => `https://api.github.com/repos/${SY.repo}${p}`;
    const ghFile = () => ghUrl("/contents/" + SY.path.split("/").map(encodeURIComponent).join("/"));
    const ghHead = (accept) => ({ Authorization: "Bearer " + SY.token, Accept: accept, "X-GitHub-Api-Version": "2022-11-28" });
    async function pullRemote() {
      const r = await fetch(ghFile(), { headers: ghHead("application/vnd.github+json"), cache: "no-store" });
      if (r.status === 404) {
        const rr = await fetch(ghUrl(), { headers: ghHead("application/vnd.github+json"), cache: "no-store" });
        if (!rr.ok) throw new Error("repositório não encontrado ou token sem acesso a ele");
        return { sha: null, doc: { v: 1, items: {}, deleted: {} } };
      }
      if (r.status === 401 || r.status === 403) throw new Error("token recusado (confira a validade e a permissão Contents: leitura e escrita)");
      if (!r.ok) throw new Error("GitHub respondeu " + r.status);
      const j = await r.json(); let txt;
      if (j.content && j.encoding === "base64") txt = b64d(j.content);
      else { const rr = await fetch(ghFile(), { headers: ghHead("application/vnd.github.raw+json"), cache: "no-store" }); if (!rr.ok) throw new Error("GitHub respondeu " + rr.status); txt = await rr.text(); }
      const doc = JSON.parse(txt || "{}"); return { sha: j.sha, doc: { v: 1, items: doc.items || {}, deleted: doc.deleted || {} } };
    }
    const ghFileAt = (p) => ghUrl("/contents/" + p.split("/").map(encodeURIComponent).join("/"));
    async function ghGet(p) {
      const r = await fetch(ghFileAt(p), { headers: ghHead("application/vnd.github+json"), cache: "no-store" });
      if (r.status === 404) return { sha: null, json: null };
      if (!r.ok) throw new Error("GitHub respondeu " + r.status + " em " + p);
      const j = await r.json();
      const txt = j.content && j.encoding === "base64" ? b64d(j.content)
        : await (await fetch(ghFileAt(p), { headers: ghHead("application/vnd.github.raw+json"), cache: "no-store" })).text();
      return { sha: j.sha, json: JSON.parse(txt || "null") };
    }
    async function ghPut(p, obj, sha, msg) {
      const r = await fetch(ghFileAt(p), { method: "PUT", headers: { ...ghHead("application/vnd.github+json"), "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, content: b64e(JSON.stringify(obj)), ...(sha ? { sha } : {}) }) });
      if (!r.ok) throw new Error(`não consegui gravar ${p} (GitHub ${r.status})`);
    }
    async function syncExtras() {
      const p = SY.path.replace(/[^/]*$/, "traducoes.json");
      const { sha, json } = await ghGet(p);
      const remoto = json || {};
      let ldj = null; try { ldj = JSON.parse(localStorage.getItem("ini_ldj") || "null"); } catch (_) {}
      if (remoto.ldj && (!ldj || (remoto.ldj.importadoEm || 0) > (ldj.importadoEm || 0))) {
        ldj = remoto.ldj;
        try { localStorage.setItem("ini_ldj", JSON.stringify(ldj)); } catch (_) {}
        aplicarLDJ(ldj); spSearch();
      }
      const tr = { ...(remoto.tr || {}), ...TR };
      if (JSON.stringify(tr) !== JSON.stringify(TR)) { TR = tr; saveTR(); renderBestiary(); }
      const novo = { v: 1, tr, ldj: ldj || null };
      if (JSON.stringify(novo) !== JSON.stringify({ v: 1, tr: remoto.tr || {}, ldj: remoto.ldj || null })) await ghPut(p, novo, sha, "Sincronização das traduções");
    }
    window.addEventListener("storage", (e) => {
      if (e.key !== "ini_ldj" || !e.newValue) return;
      try { aplicarLDJ(JSON.parse(e.newValue)); spSearch(); queueSync(); } catch (_) {}
    });
    window.addEventListener("online", () => queueSync());
    const touch = async (k) => { const m = BY[k]; if (m && m.custom) { m.updatedAt = Date.now(); await put("mon", [m]); queueSync(); } };
    function queueSync() { if (!SY.repo || !SY.token) return; clearTimeout(syTimer); syTimer = setTimeout(syncNow, 1500); }
    async function syncNow() {
      if (!SY.repo || !SY.token) return; if (syncing) { syncDeNovo = true; return; }
      if (!/^[\w.-]+\/[\w.-]+$/.test(SY.repo)) { syMsg('<span class="err">Use o formato usuario/repositorio.</span>'); return; }
      syncing = true; syMsg("Sincronizando…");
      try {
        for (const m of ALL.filter((x) => x.custom && !x.updatedAt)) { m.updatedAt = Date.now(); await put("mon", [m]); }
        for (let attempt = 0; attempt < 2; attempt++) {
          const { sha, doc } = await pullRemote();
          const local = Object.fromEntries(ALL.filter((m) => m.custom).map((m) => [m.key, m]));
          const keys = new Set([...Object.keys(local), ...Object.keys(doc.items), ...Object.keys(doc.deleted), ...Object.keys(TOMB)]);
          const out = { v: 1, items: {}, deleted: {} }; let upRemote = !sha, upLocal = false;
          for (const k of keys) {
            const l = local[k], r = doc.items[k], dts = Math.max(doc.deleted[k] || 0, TOMB[k] || 0), lt = l ? l.updatedAt || 0 : 0, rt = r ? r.updatedAt || 0 : 0;
            if (dts && dts >= Math.max(lt, rt)) {
              out.deleted[k] = dts; TOMB[k] = dts;
              if (l) { await del("mon", k); await del("img", k); delete PH[k]; upLocal = true; }
              if (r || doc.deleted[k] !== dts) upRemote = true;
            } else if (l && lt >= rt) { out.items[k] = { ...l, photo: PH[k] || null }; if (lt > rt) upRemote = true; }
            else if (r) {
              const { photo, ...rec } = r; await put("mon", [rec]);
              if (photo) { PH[k] = photo; await put("img", [{ key: k, data: photo }]); } else if (PH[k]) { delete PH[k]; await del("img", k); }
              out.items[k] = r; upLocal = true;
            }
          }
          if (upRemote) {
            const body = { message: "Sincronização das criações", content: b64e(JSON.stringify(out)), ...(sha ? { sha } : {}) };
            const pr = await fetch(ghFile(), { method: "PUT", headers: { ...ghHead("application/vnd.github+json"), "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (pr.status === 409 || pr.status === 422) { if (attempt === 0) continue; throw new Error("conflito ao gravar; tente de novo"); }
            if (!pr.ok) throw new Error(`não consegui gravar (GitHub ${pr.status}); o token precisa de Contents: leitura e escrita`);
          }
          saveTomb(); if (upLocal) await reload();
          syMsg(`Sincronizado às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · ${Object.keys(out.items).length} criações.`);
          break;
        }
        try { await syncExtras(); } catch (_) { await syncExtras(); }
      } catch (e) { console.error(e); syMsg(`<span class="err">Falha na sincronização: ${esc(e.message)}</span>`); }
      syncing = false; if (syncDeNovo) { syncDeNovo = false; queueSync(); }
    }
    $("#sy-save").onclick = () => { SY = { repo: $("#sy-repo").value.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/+$/, ""), token: $("#sy-token").value.trim(), path: $("#sy-path").value.trim() || "criacoes.json" }; saveSY(); syncNow(); };
    $("#sy-now").onclick = () => { syncNow(); };
    $("#sy-save").addEventListener("click", () => { $("#sync").open = false; });
    $("#sy-clear").onclick = () => { SY.token = ""; $("#sy-token").value = ""; saveSY(); syMsg("Token removido deste aparelho."); };
    document.addEventListener("visibilitychange", () => { if (!document.hidden) queueSync(); });

    /* pacotes embutidos no site (SRD 2014 e 2024): funcionam sem a API; ela só é usada para outras fontes */
    let PACKS = [], LP = {};
    try { LP = JSON.parse(localStorage.getItem("ini_packs") || "{}"); } catch (_) {}
    const saveLP = () => { try { localStorage.setItem("ini_packs", JSON.stringify(LP)); } catch (_) {} };
    function renderPacks() {
      $("#packs").innerHTML = PACKS.length ? '<div class="sub">Incluídos no site (não usam a API)</div>' + PACKS.map((p) =>
        `<div class="res"><span><b>${esc(p.name)}</b> <span class="muted">${+p.monsters || 0} monstros · ${+p.spells || 0} magias</span></span><button class="small" data-pack="${esc(p.key)}">${LP[p.key] === p.v ? "Recarregar" : "Carregar"}</button></div>`).join("") : "";
    }
    async function loadPack(p) {
      status(`Carregando ${esc(p.name)}…`);
      const r = await fetch("dados/bestiario/" + encodeURIComponent(p.key) + ".json?v=" + p.v, { cache: "no-cache" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      await put("mon", d.monsters || []); await put("spl", d.spells || []);
      LP[p.key] = p.v; saveLP(); renderPacks(); await reload();
      status(`${esc(p.name)}: ${(d.monsters || []).length} monstros e ${(d.spells || []).length} magias carregados.`);
    }
    $("#packs").addEventListener("click", async (e) => {
      const b = e.target.closest("[data-pack]"); if (!b) return;
      const p = PACKS.find((x) => x.key === b.dataset.pack); if (!p) return;
      b.disabled = true;
      try { await loadPack(p); } catch (err) { status(`<span class="err">Falha ao carregar (${esc(err.message)}).</span>`); }
      b.disabled = false;
    });
    async function initPacks() {
      try { const r = await fetch("dados/bestiario/index.json", { cache: "no-cache" }); if (r.ok) PACKS = await r.json(); } catch (_) {}
      renderPacks();
      for (const p of PACKS) if (LP[p.key] !== p.v) { try { await loadPack(p); } catch (err) { console.error(err); } }
    }

    /* administrador: publica fotos e pacotes SRD direto no repositório do site (sem pasta do computador) */
    const siteRepo = () => { const p = location.pathname.split("/")[1]; return /\.github\.io$/.test(location.hostname) && p ? `${location.hostname.split(".")[0]}/${p}` : ""; };
    const showAdm = () => { const on = !!(SY.repo && SY.token); $("#pubpanel").hidden = !on; if (on && !$("#pub-repo").value) $("#pub-repo").value = siteRepo(); };
    showAdm();
    $("#sy-save").addEventListener("click", () => setTimeout(showAdm, 0));
    $("#sy-clear").addEventListener("click", () => setTimeout(showAdm, 0));
    $("#pub-go").onclick = async () => {
      const repo = $("#pub-repo").value.trim(), tok = $("#pub-token").value.trim(), msg = (t) => { $("#pub-status").innerHTML = t; };
      if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !tok) { msg("Informe o repositório do site e o token de publicação."); return; }
      const H = { Authorization: "Bearer " + tok, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" };
      const gh = async (path, opt = {}) => {
        const r = await fetch("https://api.github.com/repos/" + repo + path, { ...opt, headers: H, cache: "no-store" });
        if (!r.ok) throw new Error(`GitHub respondeu ${r.status}` + (r.status === 401 || r.status === 403 || r.status === 404 ? ": confira se o token vale para este repositório e tem Contents (leitura e escrita)" : ""));
        return r.json();
      };
      $("#pub-go").disabled = true;
      try {
        const files = [], chaves = new Set(PUB);
        const fotos = ALL.filter((m) => !m.custom && PH[m.key]);
        for (const m of fotos) { files.push({ path: pubName(m.key), b64: PH[m.key].split(",")[1] }); chaves.add(m.key); }
        if (fotos.length) files.push({ path: "fotos/index.json", b64: b64e(JSON.stringify([...chaves].sort()) + "\n") });
        const keys = [...new Set([...ALL.filter((m) => !m.custom).map((m) => m.document?.key), ...SP.map((s) => s.document?.key)])].filter((k) => /^srd-20/.test(k || ""));
        const idx = PACKS.filter((p) => !keys.includes(p.key)), v = Date.now();
        for (const k of keys) {
          const monsters = ALL.filter((m) => !m.custom && m.document?.key === k), spells = SP.filter((s) => s.document?.key === k), name = srcOf(monsters[0] || spells[0]);
          files.push({ path: "dados/bestiario/" + encodeURIComponent(k) + ".json", b64: b64e(JSON.stringify({ v: 1, key: k, name, monsters, spells })) });
          idx.push({ key: k, name, monsters: monsters.length, spells: spells.length, v });
        }
        if (keys.length) files.push({ path: "dados/bestiario/index.json", b64: b64e(JSON.stringify(idx) + "\n") });
        if (!files.length) { msg("Nada para publicar: não há fotos suas de monstros da API nem coleções SRD baixadas."); $("#pub-go").disabled = false; return; }
        msg("Conectando ao GitHub…");
        const info = await gh(""), branch = info.default_branch;
        const parent = (await gh(`/git/ref/heads/${branch}`)).object.sha, base = (await gh(`/git/commits/${parent}`)).tree.sha;
        let feitos = 0, prox = 0;
        const worker = async () => { while (prox < files.length) { const f = files[prox++]; f.sha = (await gh("/git/blobs", { method: "POST", body: JSON.stringify({ content: f.b64, encoding: "base64" }) })).sha; msg(`Enviando arquivos… ${++feitos} de ${files.length}`); } };
        await Promise.all([worker(), worker(), worker(), worker()]);
        const tree = await gh("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: base, tree: files.map((f) => ({ path: f.path, mode: "100644", type: "blob", sha: f.sha })) }) });
        const commit = await gh("/git/commits", { method: "POST", body: JSON.stringify({ message: "Fotos e bestiário SRD (publicado pelo site)", tree: tree.sha, parents: [parent] }) });
        await gh(`/git/refs/heads/${branch}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha }) });
        $("#pub-token").value = "";
        msg(`Publicado: ${fotos.length} fotos e ${keys.length} pacotes. O site atualiza em 1 a 2 minutos.`);
      } catch (e) { console.error(e); msg(`<span class="err">Falha ao publicar: ${esc(e.message)}</span>`); }
      $("#pub-go").disabled = false;
    };

    /* backup local (sem GitHub) */
    $("#bk-exp").onclick = () => {
      const mon = ALL.filter((m) => m.custom), img = mon.filter((m) => PH[m.key]).map((m) => ({ key: m.key, data: PH[m.key] }));
      let ldj = null; try { ldj = JSON.parse(localStorage.getItem("ini_ldj") || "null"); } catch (_) {}
      const dados = { v: 1, em: new Date().toISOString(), mon, img, tr: TR, ldj };
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(dados)], { type: "application/json" }));
      a.download = `rastreador-backup-${dados.em.slice(0, 10)}.json`; a.click();
    };
    $("#bk-imp").onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const d = JSON.parse(await f.text());
        if (!d || !Array.isArray(d.mon)) throw new Error("formato inesperado");
        const novos = d.mon.filter((m) => !BY[m.key] || (m.updatedAt || 0) > (BY[m.key].updatedAt || 0));
        await put("mon", novos);
        await put("img", (d.img || []).filter((i) => novos.some((m) => m.key === i.key)));
        Object.assign(TR, d.tr || {}); saveTR();
        if (d.ldj) { try { localStorage.setItem("ini_ldj", JSON.stringify(d.ldj)); } catch (_) {} aplicarLDJ(d.ldj); }
        await reload(); queueSync();
        status(`Backup importado: ${novos.length} fichas novas ou mais recentes.`);
      } catch (err) { alert("Não consegui importar o backup: " + err.message); }
      e.target.value = "";
    };
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(() => {});

    const o = indexedDB.open("bestiario", 3);
    o.onupgradeneeded = () => { const d = o.result; ["mon", "spl", "img"].forEach((s) => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: "key" }); }); };
    o.onblocked = () => { $("#dbinfo").innerHTML = '<span class="err">Atualização do banco bloqueada: feche as outras abas deste rastreador e recarregue a página.</span>'; };
    o.onsuccess = () => { db = o.result; db.onversionchange = () => db.close(); reload().then(queueSync).then(initPacks); };
    o.onerror = () => { $("#dbinfo").innerHTML = '<span class="err">Este navegador bloqueou o armazenamento local (IndexedDB).</span>'; };
  })();
