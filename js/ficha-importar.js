/* Importar bloco de estatísticas (D&D 5e, 2014): lê o texto colado pelo usuário (português ou inglês), sem IA e sem serviços externos.
   Só preenche o que está no texto: o que não aparece fica em branco e nada é inventado. Linhas ou trechos que não forem reconhecidos
   são preservados (em "Texto não reconhecido") em vez de descartados. O resultado é uma prévia para revisar antes de preencher o formulário. */
(() => {
  "use strict";
  const FC = window.FICHA_CRIACAO;
  const semAcento = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const limpar = (s) => String(s).replace(/[   ]/g, " ").replace(/[−–—]/g, "-").replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
  const TAMANHOS = { tiny: "Tiny", miudo: "Tiny", miuda: "Tiny", small: "Small", pequeno: "Small", pequena: "Small", medium: "Medium", medio: "Medium", media: "Medium", large: "Large", grande: "Large", huge: "Huge", enorme: "Huge", gargantuan: "Gargantuan", imenso: "Gargantuan", imensa: "Gargantuan", colossal: "Gargantuan" };
  const TIPOS = { aberration: "Aberration", aberracao: "Aberration", beast: "Beast", fera: "Beast", besta: "Beast", celestial: "Celestial", construct: "Construct", constructo: "Construct", dragon: "Dragon", dragao: "Dragon", elemental: "Elemental", fey: "Fey", feerico: "Fey", fiend: "Fiend", diabo: "Fiend", corruptor: "Fiend", infero: "Fiend", giant: "Giant", gigante: "Giant", humanoid: "Humanoid", humanoide: "Humanoid", monstrosity: "Monstrosity", monstruosidade: "Monstrosity", ooze: "Ooze", limo: "Ooze", plant: "Plant", planta: "Plant", undead: "Undead", "morto-vivo": "Undead", "morto vivo": "Undead", mortovivo: "Undead" };
  const ATR_CHAVE = { for: "strength", str: "strength", forca: "strength", des: "dexterity", dex: "dexterity", destreza: "dexterity", con: "constitution", constituicao: "constitution", int: "intelligence", inteligencia: "intelligence", sab: "wisdom", wis: "wisdom", sabedoria: "wisdom", car: "charisma", cha: "charisma", carisma: "charisma" };
  const PERICIA_CHAVE = Object.fromEntries([...FC.PERICIAS.flatMap(([k, n]) => [[semAcento(n), k], [k.replace(/_/g, " "), k]]), ["acrobacias", "acrobatics"], ["arcano", "arcana"], ["atletismo", "athletics"], ["historia", "history"], ["religiao", "religion"], ["sobrevivencia", "survival"], ["persuasao", "persuasion"], ["intimidacao", "intimidation"], ["investigacao", "investigation"], ["enganacao", "deception"], ["intuicao", "insight"], ["percepcao", "perception"], ["atuacao", "performance"], ["lidar com animais", "animal_handling"], ["adestrar animais", "animal_handling"], ["prestidigitacao", "sleight_of_hand"], ["sleight of hand", "sleight_of_hand"], ["animal handling", "animal_handling"]]);
  const CONDICAO_CHAVE = { cego: "blinded", blinded: "blinded", encantado: "charmed", enfeiticado: "charmed", charmed: "charmed", surdo: "deafened", deafened: "deafened", exaustao: "exhaustion", exhaustion: "exhaustion", amedrontado: "frightened", assustado: "frightened", frightened: "frightened", agarrado: "grappled", grappled: "grappled", incapacitado: "incapacitated", incapacitated: "incapacitated", invisivel: "invisible", invisible: "invisible", paralisado: "paralyzed", paralyzed: "paralyzed", petrificado: "petrified", petrified: "petrified", envenenado: "poisoned", poisoned: "poisoned", caido: "prone", prone: "prone", contido: "restrained", impedido: "restrained", restrained: "restrained", atordoado: "stunned", stunned: "stunned", inconsciente: "unconscious", unconscious: "unconscious" };
  const ALINHAR = [[/sem tendencia|unaligned/, "unaligned"], [/qualquer tendencia|any alignment/, "any alignment"], [/leal (?:e )?(?:bom|bondoso)|lawful good/, "lawful good"], [/neutro (?:e )?(?:bom|bondoso)|neutral good/, "neutral good"], [/caotico (?:e )?(?:bom|bondoso)|chaotic good/, "chaotic good"], [/leal (?:e )?neutro|lawful neutral/, "lawful neutral"], [/caotico (?:e )?neutro|chaotic neutral/, "chaotic neutral"], [/leal (?:e )?(?:mau|maligno)|lawful evil/, "lawful evil"], [/neutro (?:e )?(?:mau|maligno)|neutral evil/, "neutral evil"], [/caotico (?:e )?(?:mau|maligno)|chaotic evil/, "chaotic evil"], [/^(neutro|neutral|neutra)$/, "neutral"]];
  /* texto copiado do D&D Beyond ou de PDF: entidades HTML, links e formatação Markdown, tabelas e marcadores viram texto simples (o conteúdo não muda) */
  const ENTIDADES = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', ndash: "-", mdash: "-", minus: "-", times: "x", ordm: "º", ordf: "ª" };
  function normalizarTexto(bruto) {
    let t = String(bruto || "").replace(/\r/g, "");
    t = t.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&([a-z]+);/gi, (m, n) => (ENTIDADES[n.toLowerCase()] !== undefined ? ENTIDADES[n.toLowerCase()] : m));
    t = t.replace(/!?\[image\]\([^)]*\)/gi, "").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/<\/?(?:b|i|em|strong|u|span|p|br|div|a)[^>]*>/gi, " ");
    return t.split("\n").map((l) => l.replace(/^\s*(?:#{1,6}\s+|>\s*|[-•·▪*]\s+(?=\S))/, "").replace(/\*{1,3}|_{2,3}/g, "").replace(/(^|\s)_([^_\s][^_]*?)_(?=\s|$|[.,;:])/g, "$1$2"))
      .filter((l) => !(l.includes("|") && /^[\s:|-]+$/.test(l))).map((l) => (/\|.*\|/.test(l) ? l.replace(/\|/g, "  ") : l)).join("\n");
  }
  const paraPes = (n, un) => { const v = Number(String(n).replace(",", ".")); if (!Number.isFinite(v)) return null; return /^m|metr|^meter/i.test(un || "") ? Math.round(v / 0.3) : Math.round(v); };
  /* "9 m", "30 pés", "36,5 m (120 pés)": quando o texto traz os dois, vale o valor em pés escrito pelo livro (sem converter nem arredondar) */
  const paraPesTexto = (txt) => {
    const pes = String(txt).match(/(\d+(?:[.,]\d+)?)\s*(?:p[ée]s?|ft\.?|feet)\b/i); if (pes) return paraPes(pes[1], "ft");
    const m = String(txt).match(/(\d+(?:[.,]\d+)?)\s*m(?:etros?)?\b/i); return m ? paraPes(m[1], "m") : null;
  };

  /* rótulos de linha -> campo (português e inglês) */
  const ROTULOS = [
    ["ca", /^(?:classe de armadura|armor class|ca)\s+(.+)$/i], ["pv", /^(?:pontos de vida|hit points|pv)\s+(.+)$/i], ["deslocamento", /^(?:deslocamento|velocidade|speed)\s+(.+)$/i],
    ["salvaguardas", /^(?:testes? de resist[êe]ncia|salvaguardas?|saving throws?)\s+(.+)$/i], ["pericias", /^(?:per[íi]cias|habilidades|skills)\s*:?\s+(.+)$/i],
    ["vulnerabilidades", /^(?:vulnerabilidades? a dano|vulnerabilidades? de dano|damage vulnerabilities)\s+(.+)$/i], ["resistencias", /^(?:resist[êe]ncias? a dano|resist[êe]ncias? de dano|damage resistances)\s+(.+)$/i],
    ["imunidades", /^(?:imunidades? a dano|imunidades? de dano|damage immunities)\s+(.+)$/i], ["condicoes", /^(?:imunidades? a condi[çc][ãa]o|imunidades? a condi[çc][õo]es|condition immunities)\s+(.+)$/i],
    ["sentidos", /^(?:sentidos|senses)\s*:?\s+(.+)$/i], ["idiomas", /^(?:idiomas|l[íi]nguas|languages)\s*:?\s*(.*)$/i], ["nd", /^(?:desafio|challenge|nd)\s+(.+)$/i], ["prof", /^(?:b[ôo]nus de profici[êe]ncia|proficiency bonus)\s+(.+)$/i]
  ];
  const SECOES = [["lendaria", /^(?:a[çc][õo]es lend[áa]rias|legendary actions)\.?$/i], ["bonus", /^(?:a[çc][õo]es b[ôo]nus|bonus actions)\.?$/i], ["reacao", /^(?:rea[çc][õo]es|reactions)\.?$/i], ["covil", /^(?:a[çc][õo]es de covil|lair actions)\.?$/i], ["acao", /^(?:a[çc][õo]es|actions)\.?$/i], ["traco", /^(?:caracter[íi]sticas|traits?)\.?$/i], ["descricao", /^(?:descri[çc][ãa]o|description)\.?$/i], ["regional", /^(?:efeitos regionais|regional effects)\.?$/i]];
  const CONECTORES = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "com", "sem", "em", "no", "na", "of", "the", "and", "in", "to", "ou", "or", "para"]);
  /* "Nome. Texto" no início de uma característica ou ação */
  function inicioDeEntrada(linha) {
    const m = linha.match(/^(.{2,60}?(?:\s*\([^)]{1,50}\))?)\.\s+([A-ZÀ-Ý0-9(].*)$/) || linha.match(/^(.{2,60}?(?:\s*\([^)]{1,50}\))?)\.$/);
    if (!m) return null; const nome = m[1].trim(), palavras = nome.replace(/\([^)]*\)/g, "").trim().split(/\s+/).filter(Boolean);
    if (!palavras.length || palavras.length > 6 || !/^[A-ZÀ-Ý]/.test(nome) || /[,:;]/.test(nome.replace(/\([^)]*\)/g, ""))) return null;     // nome curto, começando por maiúscula (o D&D Beyond em português usa "Ataque múltiplo")
    return { nome, texto: (m[2] || "").trim() };
  }
  const listaPorVirgula = (txt) => String(txt).split(/\s*[,;]\s*|\s+e\s+|\s+and\s+/i).map((s) => s.trim().replace(/^(?:and|e)\s+/i, "")).filter(Boolean);

  /* defesas: devolve {chaves, naoMagico, sobra} */
  function lerDefesas(txt, mapa) {
    let t = limpar(txt), naoMagico = false;
    if (/n[ãa]o m[áa]gic|nonmagical|non-magical/i.test(t)) { naoMagico = true; t = t.replace(/(?:de|from)\s+ataques?\s+n[ãa]o\s+m[áa]gic[oa]s?|from nonmagical attacks|from non-magical attacks/gi, ""); }
    const chaves = [], sobra = [];
    for (const parte of listaPorVirgula(t)) { const k = mapa(parte); if (k) { if (!chaves.includes(k)) chaves.push(k); } else if (parte.replace(/[.\s]/g, "")) sobra.push(parte); }
    return { chaves, naoMagico, sobra };
  }
  const mapaDano = (p) => FC.tipoEn(p) || "";
  const mapaCond = (p) => CONDICAO_CHAVE[semAcento(p).replace(/[^a-z]/g, "")] || "";

  /* uma ação ou característica em texto -> linha no formato do formulário */
  const TIPO_RX = "(?:de\\s+)?dano\\s+(?:de\\s+)?([A-Za-zÀ-ÿ]+)|([A-Za-zÀ-ÿ]+)\\s+damage";
  function danosDoTrecho(trecho) {
    const out = [], re = new RegExp("(\\d+)\\s*\\((\\d+)d(\\d+)(?:\\s*([+-])\\s*(\\d+))?\\)\\s*(?:" + TIPO_RX + ")", "gi"); let m;
    while ((m = re.exec(trecho))) { const tipo = m[6] || m[7] || ""; out.push({ n: +m[2], f: +m[3], b: m[4] ? (m[4] === "-" ? -1 : 1) * +m[5] : 0, t: tipo }); }
    return out;
  }
  const dadoTexto = (d) => `${d.n}d${d.f}${d.b ? (d.b > 0 ? "+" : "-") + Math.abs(d.b) : ""}${d.t ? " " + d.t : ""}`;
  const ABREV_ATR = { strength: "FOR", dexterity: "DES", constitution: "CON", intelligence: "INT", wisdom: "SAB", charisma: "CAR" };
  const chaveAtr = (nome) => ATR_CHAVE[semAcento(nome).replace(/[^a-z]/g, "").slice(0, 3)] || ATR_CHAVE[semAcento(nome).replace(/[^a-z]/g, "")] || "";
  const RX_ATR = "(For[çc]a|Destreza|Constitui[çc][ãa]o|Intelig[êe]ncia|Sabedoria|Carisma|Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)";
  /* uma característica ou ação em texto -> linha no formato do formulário. O texto original vai inteiro na descrição; só se estrutura o que o texto diz com clareza. */
  function linhaDeAcao(nome, texto, avisos) {
    const limpo = String(texto).replace(/\|/g, "/").replace(/\s*\n\s*/g, " ¶ ").trim(), n = String(nome).replace(/\|/g, "/");
    const ataque = texto.match(/(?:Ataque\s+(?:com\s+(?:arma|magia)\s+)?(?:corpo a corpo|[àa] dist[âa]ncia|m[áa]gico)[^:]*|(?:Melee|Ranged)(?: or Ranged)? (?:Weapon|Spell) Attack)\s*:\s*([+-]\d+)/i) || texto.match(/([+-]\d+)\s*(?:to hit|para (?:atingir|acertar)|de ataque)/i);
    const sv = texto.match(/(?:teste de resist[êe]ncia|salvaguarda|saving throw)\s+(?:de\s+)?(For[çc]a|Destreza|Constitui[çc][ãa]o|Intelig[êe]ncia|Sabedoria|Carisma|Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)[^.]*?(?:CD|DC)\s*(\d+)/i) || texto.match(/(?:CD|DC)\s*(\d+)\s*(?:de\s+)?(For[çc]a|Destreza|Constitui[çc][ãa]o|Intelig[êe]ncia|Sabedoria|Carisma|Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)/i);
    const aposAcerto = texto.split(/\b(?:Acerto|Hit)\s*:/i), frase = aposAcerto.length > 1 ? aposAcerto[1] : texto;
    const trecho = frase.split(/\.\s+(?=[A-ZÀ-Ý])/)[0] + ".";
    let partes = danosDoTrecho(aposAcerto.length > 1 ? trecho : String(texto));
    if (!ataque && partes.length > 1) { avisos.push("“" + nome + "”: encontrei mais de um dano no texto; estruturei só o primeiro. Revise."); partes = partes.slice(0, 1); }
    if (/\b(?:ou|or)\b/i.test(trecho) && partes.length > 1) { avisos.push("“" + nome + "”: o dano parece ter alternativas; só o primeiro foi estruturado. Revise."); partes = partes.slice(0, 1); }
    let cabeca = "";
    if (ataque) cabeca = (Number(ataque[1]) >= 0 ? "+" : "") + Number(ataque[1]);
    else if (sv) { const num = /^\d+$/.test(sv[1]) ? sv[1] : sv[2], atr = /^\d+$/.test(sv[1]) ? sv[2] : sv[1]; cabeca = ("CD " + num + " " + (ABREV_ATR[chaveAtr(atr)] || "")).trim(); }
    return cabeca && partes.length ? n + " | " + cabeca + " | " + partes.map(dadoTexto).join(" + ") + " | " + limpo : n + " | " + limpo;
  }

  function parsear(textoBruto) {
    const v = { nome: "", tamanho: "", tipo: "", alinhamento: "", ca: null, armadura: "", pv: null, dados: "", deslocamentos: {}, atributos: {}, salvaguardas: {}, pericias: {}, resistencias: [], imunidades: [], vulnerabilidades: [], condicoes: [], naoMagico: { res: false, imu: false, vul: false }, sentidos: {}, idiomas: "", nd: null, xp: null, prof: null, caracteristicas: [], acoes: { acao: [], bonus: [], reacao: [], lendaria: [], covil: [] }, lendariaIntro: "", naoReconhecido: [], avisos: [] };
    const linhasBrutas = normalizarTexto(textoBruto).split("\n").map(limpar).filter(Boolean);
    if (!linhasBrutas.length) { v.avisos.push("Nenhum texto para interpretar."); return v; }
    let i = 0; v.nome = linhasBrutas[i++].replace(/\.$/, "");
    // linha de tamanho, tipo e tendência (qualquer ordem; português ou inglês)
    const cab = linhasBrutas[i] || "";
    if (cab && !ROTULOS.some(([, rx]) => rx.test(cab)) && !/\d\s*\([+-]\d+\)/.test(cab)) {
      i++; const partes = cab.split(/,\s*/), tamTipo = partes[0], tend = partes.slice(1).join(", ");
      const palavras = semAcento(tamTipo).replace(/\(.*?\)/g, " ").split(/\s+/).filter(Boolean);
      for (const p of palavras) { if (!v.tamanho && TAMANHOS[p]) v.tamanho = TAMANHOS[p]; if (!v.tipo && TIPOS[p]) v.tipo = TIPOS[p]; }
      if (!v.tipo) { const t2 = semAcento(tamTipo).replace(/\(.*?\)/g, " ").replace(/\s+/g, " "); for (const [k, val] of Object.entries(TIPOS)) if (k.includes(" ") || k.includes("-")) if (t2.includes(k)) v.tipo = val; }
      const t = semAcento(tend).trim(); for (const [rx, val] of ALINHAR) if (rx.test(t)) { v.alinhamento = val; break; }
      if (tend && !v.alinhamento) v.alinhamento = limpar(tend);                              // tendência fora da lista: guarda o texto como veio
      if (!v.tamanho && !v.tipo) { v.naoReconhecido.push(cab); }
    }
    const textoAtributos = linhasBrutas.join(" "), nums = [...textoAtributos.matchAll(/(\d{1,2})\s*\(\s*([+-]\d+)\s*\)/g)].slice(0, 6);
    if (nums.length === 6) ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"].forEach((k, n) => { v.atributos[k] = +nums[n][1]; });
    let secao = "", ultimo = null, entrada = null, semRotuloInicio = true;
    const fecharEntrada = () => {
      if (!entrada) return; const texto = entrada.texto.join(" ").replace(/\s+/g, " ").trim();
      if (entrada.secao === "traco") v.caracteristicas.push({ nome: entrada.nome, texto });
      else if (entrada.secao in v.acoes) v.acoes[entrada.secao].push(linhaDeAcao(entrada.nome, texto, v.avisos));
      else v.naoReconhecido.push(`${entrada.nome}. ${texto}`);
      entrada = null;
    };
    const salvarRotulo = (campo, valor) => { v._ul = campo; v._bruto = v._bruto || {}; v._bruto[campo] = (v._bruto[campo] ? v._bruto[campo] + " " : "") + valor; };
    for (; i < linhasBrutas.length; i++) {
      const linha = linhasBrutas[i];
      if (/^(?:FOR|DES|CON|COM|INT|SAB|CAR|STR|DEX|WIS|CHA)(?:\s+(?:FOR|DES|CON|COM|INT|SAB|CAR|STR|DEX|WIS|CHA))*$/i.test(linha) || /^(?:\d{1,2}\s*\(\s*[+-]\d+\s*\)\s*){1,6}$/.test(linha)) continue;   // tabela de atributos (já lida)
      if (semAcento(linha) === semAcento(v.nome)) continue;                                                    // o D&D Beyond repete o nome (legenda da imagem)
      const sec = SECOES.find(([, rx]) => rx.test(linha));
      if (sec) { fecharEntrada(); secao = sec[0]; ultimo = null; semRotuloInicio = false; continue; }
      if (/^(?:regras b[áa]sicas|manual dos monstros|livro dos monstros|monster manual|basic rules)[^.]*(?:p[áa]g|p\.|page)/i.test(linha)) { v.fonte = linha; continue; }
      if (secao === "descricao") { v.naoReconhecido.push(linha); continue; }
      const semRotulo = (!secao || secao === "traco") && (/(?:percep[çc][ãa]o passiva|passive perception)/i.test(linha) || /^(?:vis[ãa]o (?:no escuro|verdadeira)|percep[çc][ãa]o [àa]s cegas|sentido s[íi]smico|darkvision|blindsight|truesight|tremorsense)\b/i.test(linha));
      const rot = semRotulo ? ["sentidos", { exec: () => [null, linha] }] : (!secao || secao === "traco" ? ROTULOS.find(([, rx]) => rx.test(linha)) : null);
      if (rot) { fecharEntrada(); const m = rot[1].exec ? rot[1].exec(linha) : linha.match(rot[1]); salvarRotulo(rot[0], m[1] || ""); ultimo = rot[0]; if (rot[0] === "nd") secao = "traco"; continue; }
      if (!secao && ultimo && !inicioDeEntrada(linha)) { v._bruto[ultimo] += " " + linha; continue; }            // continuação de um rótulo (lista longa)
      const efectiva = secao || "traco"; if (!secao) secao = "traco";
      const ini = inicioDeEntrada(linha);
      if (efectiva === "regional") { v.naoReconhecido.push(linha); continue; }
      if (ini) { fecharEntrada(); entrada = { secao: efectiva, nome: ini.nome, texto: ini.texto ? [ini.texto] : [] }; }
      else if (entrada) entrada.texto.push(linha);
      else if (efectiva === "lendaria") v.lendariaIntro += (v.lendariaIntro ? " " : "") + linha;
      else v.naoReconhecido.push(linha);
    }
    fecharEntrada();
    const B = v._bruto || {}; delete v._bruto; delete v._ul;
    if (B.ca) { const m = B.ca.match(/(\d+)\s*(?:\(([^)]*)\))?/); if (m) { v.ca = +m[1]; v.armadura = m[2] ? m[2].trim() : ""; } else v.naoReconhecido.push("Classe de Armadura " + B.ca); }
    if (B.pv) { const m = B.pv.match(/(\d+)\s*(?:\(([^)]*)\))?/); if (m) { v.pv = +m[1]; v.dados = m[2] ? m[2].replace(/\s+/g, "").replace(/([+-])/g, " $1 ").trim() : ""; } else v.naoReconhecido.push("Pontos de Vida " + B.pv); }
    if (B.deslocamento) {
      const mapa = [[/(?:escalada|climb)/i, "climb"], [/(?:voo|fly)/i, "fly"], [/(?:nata[çc][ãa]o|swim)/i, "swim"], [/(?:escava[çc][ãa]o|escavar|burrow)/i, "burrow"]];
      for (const parte of B.deslocamento.split(/\s*,\s+(?=[A-Za-zÀ-ÿ])/)) { const ft = paraPesTexto(parte); if (ft == null) { if (parte.trim()) v.naoReconhecido.push("Deslocamento: " + parte); continue; } const m = mapa.find(([rx]) => rx.test(parte)); v.deslocamentos[m ? m[1] : "walk"] = ft; }
    }
    const bonus = (txt, mapa, destino, rotulo) => { for (const parte of listaPorVirgula(txt)) { const m = parte.match(/^(.+?)\s*([+-]\s*\d+)$/); const k = m ? mapa(m[1]) : ""; if (m && k) destino[k] = parseInt(m[2].replace(/\s/g, "")); else if (parte) v.naoReconhecido.push(`${rotulo}: ${parte}`); } };
    if (B.salvaguardas) bonus(B.salvaguardas, (n) => ATR_CHAVE[semAcento(n).replace(/[^a-z]/g, "").slice(0, 3)] || ATR_CHAVE[semAcento(n).replace(/[^a-z]/g, "")] || "", v.salvaguardas, "Salvaguardas");
    if (B.pericias) bonus(B.pericias, (n) => PERICIA_CHAVE[semAcento(n).replace(/\s+/g, " ").trim()] || "", v.pericias, "Perícias");
    for (const [campo, chave, mapa, rot] of [["resistencias", "resistencias", mapaDano, "Resistências"], ["imunidades", "imunidades", mapaDano, "Imunidades"], ["vulnerabilidades", "vulnerabilidades", mapaDano, "Vulnerabilidades"]]) if (B[campo]) { const r = lerDefesas(B[campo], mapa); v[chave] = r.chaves; v.naoMagico[{ resistencias: "res", imunidades: "imu", vulnerabilidades: "vul" }[campo]] = r.naoMagico; for (const s of r.sobra) v.naoReconhecido.push(`${rot} a dano: ${s}`); }
    if (B.condicoes) { const r = lerDefesas(B.condicoes, mapaCond); v.condicoes = r.chaves; for (const s of r.sobra) v.naoReconhecido.push("Imunidades a condições: " + s); }
    if (B.sentidos) {
      const m = [[/vis[ãa]o no escuro|darkvision/i, "darkvision"], [/percep[çc][ãa]o [àa]s cegas|vis[ãa]o cega|blindsight/i, "blindsight"], [/sentido s[íi]smico|tremorsense/i, "tremorsense"], [/vis[ãa]o verdadeira|truesight/i, "truesight"]];
      for (const parte of B.sentidos.split(/\s*,\s+(?=[A-Za-zÀ-ÿ])/)) {
        const pp = parte.match(/(?:percep[çc][ãa]o passiva|passive perception)\s*(?:de\s*)?(\d+)/i); if (pp) { v.sentidos.passiva = +pp[1]; continue; }
        const alvo = m.find(([rx]) => rx.test(parte)), ft = paraPesTexto(parte); if (alvo && ft != null) v.sentidos[alvo[1]] = ft; else if (parte.trim()) v.naoReconhecido.push("Sentidos: " + parte);
      }
    }
    if (B.idiomas) v.idiomas = B.idiomas.replace(/^[—–-]\s*$/, "").trim();
    if (B.nd) { const m = B.nd.match(/([\d/.,]+)\s*(?:\(\s*([\d.,]+)\s*(?:XP|PX)\s*\))?/i); if (m) { const nd = FC.lerND(m[1]); if (Number.isFinite(nd)) v.nd = nd; if (m[2]) v.xp = +String(m[2]).replace(/[.,]/g, ""); } else v.naoReconhecido.push("Desafio " + B.nd); }
    if (B.prof) { const m = B.prof.match(/[+-]?\s*(\d+)/); if (m) v.prof = +m[1]; }
    if (v.lendariaIntro) v.caracteristicas.push({ nome: "Ações Lendárias (regras)", texto: v.lendariaIntro });
    if (!v.tamanho && !v.tipo) v.avisos.push("Não encontrei tamanho e tipo; mantive os valores atuais do formulário.");
    if (Object.keys(v.atributos).length < 6) v.avisos.push("Não encontrei os seis atributos no formato “14 (+2)”; preencha-os à mão.");
    return v;
  }

  /* resumo legível para a prévia */
  const NOME_ATR = { strength: "FOR", dexterity: "DES", constitution: "CON", intelligence: "INT", wisdom: "SAB", charisma: "CAR" };
  function resumo(v) {
    const L = []; const add = (r, x) => { if (x !== null && x !== undefined && x !== "" && !(Array.isArray(x) && !x.length)) L.push([r, x]); };
    add("Nome", v.nome); add("Tamanho / tipo / tendência", [v.tamanho, v.tipo, v.alinhamento].filter(Boolean).join(" · ")); add("Classe de Armadura", v.ca != null ? v.ca + (v.armadura ? ` (${v.armadura})` : "") : ""); add("Pontos de vida", v.pv != null ? v.pv + (v.dados ? ` (${v.dados})` : "") : "");
    add("Deslocamentos (pés)", Object.entries(v.deslocamentos).map(([k, n]) => `${k} ${n}`).join(", ")); add("Atributos", Object.entries(v.atributos).map(([k, n]) => `${NOME_ATR[k]} ${n}`).join(" · "));
    add("Salvaguardas", Object.entries(v.salvaguardas).map(([k, n]) => `${NOME_ATR[k]} ${n >= 0 ? "+" : ""}${n}`).join(", ")); add("Perícias", Object.entries(v.pericias).map(([k, n]) => `${k} ${n >= 0 ? "+" : ""}${n}`).join(", "));
    add("Resistências", v.resistencias.join(", ") + (v.naoMagico.res && v.resistencias.length ? " (não mágicos)" : "")); add("Imunidades", v.imunidades.join(", ") + (v.naoMagico.imu && v.imunidades.length ? " (não mágicos)" : "")); add("Vulnerabilidades", v.vulnerabilidades.join(", ") + (v.naoMagico.vul && v.vulnerabilidades.length ? " (não mágicos)" : "")); add("Imunidades a condições", v.condicoes.join(", "));
    add("Sentidos (pés)", Object.entries(v.sentidos).map(([k, n]) => `${k} ${n}`).join(", ")); add("Idiomas", v.idiomas); add("Desafio", v.nd != null ? v.nd + (v.xp ? ` (${v.xp} XP)` : "") : ""); add("Bônus de proficiência", v.prof != null && v.prof !== "" ? "+" + v.prof : "");
    add("Características", v.caracteristicas.map((c) => c.nome).join(", "));
    for (const [id, rot] of [["acao", "Ações"], ["bonus", "Ações bônus"], ["reacao", "Reações"], ["lendaria", "Ações lendárias"], ["covil", "Ações de covil"]]) add(rot, v.acoes[id].map((l) => l.split("|")[0].trim()).join(", "));
    return L;
  }

  window.FICHA_IMPORTAR = { normalizarTexto, parsear, resumo, linhaDeAcao, inicioDeEntrada };
})();
