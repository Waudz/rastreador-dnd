/* Regras de D&D 5e usadas pela ficha automática: classes, raças, armaduras, perícias, espaços de magia.
   Tudo em português; distâncias em metros (1,5 m = 5 pés). */
window.REGRAS = (() => {
  "use strict";
  const ATR = ["for", "des", "con", "int", "sab", "car"];
  const ATR_NOME = { for: "Força", des: "Destreza", con: "Constituição", int: "Inteligência", sab: "Sabedoria", car: "Carisma" };

  const PERICIAS = [
    ["acrobacia", "Acrobacia", "des"], ["adestrar", "Adestrar Animais", "sab"], ["arcanismo", "Arcanismo", "int"], ["atletismo", "Atletismo", "for"],
    ["atuacao", "Atuação", "car"], ["enganacao", "Enganação", "car"], ["furtividade", "Furtividade", "des"], ["historia", "História", "int"],
    ["intimidacao", "Intimidação", "car"], ["intuicao", "Intuição", "sab"], ["investigacao", "Investigação", "int"], ["medicina", "Medicina", "sab"],
    ["natureza", "Natureza", "int"], ["percepcao", "Percepção", "sab"], ["persuasao", "Persuasão", "car"], ["prestidigitacao", "Prestidigitação", "des"],
    ["religiao", "Religião", "int"], ["sobrevivencia", "Sobrevivência", "sab"]
  ];
  const TODAS = PERICIAS.map((p) => p[0]);

  /* conj: tipo da conjuração (full, half, meio-arredondado-para-cima = halfup, pact) e atributo */
  const CLASSES = [
    { id: "Barbarian", n: "Bárbaro", dv: 12, salv: ["for", "con"], arm: "Armaduras leves e médias, escudos", armas: "Armas simples e marciais", per: [2, ["adestrar", "atletismo", "intimidacao", "natureza", "percepcao", "sobrevivencia"]], defesa: "bar", subs: ["Trilha do Berserker", "Trilha do Guerreiro Totêmico"] },
    { id: "Bard", n: "Bardo", dv: 8, salv: ["des", "car"], arm: "Armaduras leves", armas: "Armas simples, bestas de mão, espadas longas, rapieiras, espadas curtas", ferr: "3 instrumentos musicais à escolha", per: [3, TODAS], conj: { t: "full", a: "car" }, subs: ["Colégio do Conhecimento", "Colégio da Bravura"] },
    { id: "Cleric", n: "Clérigo", dv: 8, salv: ["sab", "car"], arm: "Armaduras leves e médias, escudos", armas: "Armas simples", per: [2, ["historia", "intuicao", "medicina", "persuasao", "religiao"]], conj: { t: "full", a: "sab" }, subs: ["Domínio da Vida", "Domínio da Luz", "Domínio da Guerra", "Domínio da Tempestade", "Domínio do Conhecimento", "Domínio da Natureza", "Domínio da Trapaça"] },
    { id: "Druid", n: "Druida", dv: 8, salv: ["int", "sab"], arm: "Armaduras leves e médias, escudos (não de metal)", armas: "Clavas, adagas, dardos, azagaias, maças, bordões, cimitarras, foices, fundas, lanças", ferr: "Kit de herbalismo", per: [2, ["arcanismo", "adestrar", "intuicao", "medicina", "natureza", "percepcao", "religiao", "sobrevivencia"]], conj: { t: "full", a: "sab" }, subs: ["Círculo da Terra", "Círculo da Lua"] },
    { id: "Fighter", n: "Guerreiro", dv: 10, salv: ["for", "con"], arm: "Todas as armaduras, escudos", armas: "Armas simples e marciais", per: [2, ["acrobacia", "adestrar", "atletismo", "historia", "intuicao", "intimidacao", "percepcao", "sobrevivencia"]], subs: ["Campeão", "Mestre de Batalha", "Cavaleiro Místico"], terco: "Cavaleiro Místico" },
    { id: "Monk", n: "Monge", dv: 8, salv: ["for", "des"], arm: "Nenhuma", armas: "Armas simples, espadas curtas", ferr: "Um tipo de ferramenta de artesão ou instrumento musical", per: [2, ["acrobacia", "atletismo", "historia", "intuicao", "religiao", "furtividade"]], defesa: "mon", subs: ["Caminho da Mão Espalmada", "Caminho das Sombras", "Caminho dos Quatro Elementos"] },
    { id: "Paladin", n: "Paladino", dv: 10, salv: ["sab", "car"], arm: "Todas as armaduras, escudos", armas: "Armas simples e marciais", per: [2, ["atletismo", "intuicao", "intimidacao", "medicina", "persuasao", "religiao"]], conj: { t: "half", a: "car", min: 2 }, subs: ["Juramento de Devoção", "Juramento dos Anciões", "Juramento de Vingança"] },
    { id: "Ranger", n: "Patrulheiro", dv: 10, salv: ["for", "des"], arm: "Armaduras leves e médias, escudos", armas: "Armas simples e marciais", per: [3, ["adestrar", "atletismo", "intuicao", "investigacao", "natureza", "percepcao", "furtividade", "sobrevivencia"]], conj: { t: "half", a: "sab", min: 2 }, subs: ["Caçador", "Mestre das Feras"] },
    { id: "Rogue", n: "Ladino", dv: 8, salv: ["des", "int"], arm: "Armaduras leves", armas: "Armas simples, bestas de mão, espadas longas, rapieiras, espadas curtas", ferr: "Ferramentas de ladrão", per: [4, ["acrobacia", "atletismo", "enganacao", "intuicao", "intimidacao", "investigacao", "percepcao", "atuacao", "persuasao", "prestidigitacao", "furtividade"]], subs: ["Ladrão", "Assassino", "Trapaceiro Arcano"], terco: "Trapaceiro Arcano" },
    { id: "Sorcerer", n: "Feiticeiro", dv: 6, salv: ["con", "car"], arm: "Nenhuma", armas: "Adagas, dardos, fundas, bordões, bestas leves", per: [2, ["arcanismo", "enganacao", "intuicao", "intimidacao", "persuasao", "religiao"]], conj: { t: "full", a: "car" }, subs: ["Linhagem Dracônica", "Magia Selvagem"] },
    { id: "Warlock", n: "Bruxo", dv: 8, salv: ["sab", "car"], arm: "Armaduras leves", armas: "Armas simples", per: [2, ["arcanismo", "enganacao", "historia", "intimidacao", "investigacao", "natureza", "religiao"]], conj: { t: "pact", a: "car" }, subs: ["A Arquifada", "O Corruptor", "O Grande Antigo"] },
    { id: "Wizard", n: "Mago", dv: 6, salv: ["int", "sab"], arm: "Nenhuma", armas: "Adagas, dardos, fundas, bordões, bestas leves", per: [2, ["arcanismo", "historia", "intuicao", "investigacao", "medicina", "religiao"]], conj: { t: "full", a: "int" }, subs: ["Escola de Abjuração", "Escola de Adivinhação", "Escola de Conjuração", "Escola de Encantamento", "Escola de Evocação", "Escola de Ilusão", "Escola de Necromancia", "Escola de Transmutação"] },
    { id: "Artificer", n: "Artífice", dv: 8, salv: ["con", "int"], arm: "Armaduras leves e médias, escudos", armas: "Armas simples", ferr: "Ferramentas de ladrão, ferramentas de funileiro", per: [2, ["arcanismo", "historia", "investigacao", "medicina", "natureza", "percepcao", "prestidigitacao"]], conj: { t: "halfup", a: "int", min: 1 }, subs: ["Alquimista", "Armeiro", "Artilheiro", "Ferreiro de Batalha"] }
  ];
  const classe = (id) => CLASSES.find((c) => c.id === id);

  /* [nome, deslocamento em metros, bônus de atributo, observações]  — subraças aparecem como "Raça (Sub-raça)" */
  const RACAS = [
    ["Aasimar", 9, "CAR +2", "Visão no escuro 18 m; resistência a necrótico e radiante; mãos curativas"],
    ["Anão (da Colina)", 7.5, "CON +2, SAB +1", "Visão no escuro 18 m; resiliência anã; robustez anã (+1 PV por nível)"],
    ["Anão (da Montanha)", 7.5, "CON +2, FOR +2", "Visão no escuro 18 m; resiliência anã; treinamento com armaduras"],
    ["Autômato (Autognomo)", 9, "+2 e +1 à escolha", "Constructo; sem necessidade de respirar, comer ou dormir"],
    ["Draconato", 9, "FOR +2, CAR +1", "Ancestral dracônico; sopro; resistência a um tipo de dano"],
    ["Elfo (Alto)", 9, "DES +2, INT +1", "Visão no escuro 18 m; sentidos aguçados; transe; um truque de mago"],
    ["Elfo (da Floresta)", 10.5, "DES +2, SAB +1", "Visão no escuro 18 m; passo ligeiro; máscara da natureza"],
    ["Elfo (Drow)", 9, "DES +2, CAR +1", "Visão no escuro 36 m; sensibilidade à luz solar; magia drow"],
    ["Fada", 9, "+2 e +1 à escolha", "Voo 9 m; magia de fada; tipo Feérico"],
    ["Firbolg", 9, "SAB +2, FOR +1", "Magia de firbolg; passo oculto; fala de besta e folha"],
    ["Genasi (do Ar)", 9, "CON +2, DES +1", "Respirar sem ar; levitação"],
    ["Genasi (da Água)", 9, "CON +2, SAB +1", "Resistência a ácido; anfíbio; nadar 9 m"],
    ["Genasi (do Fogo)", 9, "CON +2, INT +1", "Visão no escuro 18 m; resistência a fogo"],
    ["Genasi (da Terra)", 9, "CON +2, FOR +1", "Caminhar na terra; passo da terra"],
    ["Gnomo (da Floresta)", 7.5, "INT +2, DES +1", "Visão no escuro 18 m; esperteza gnômica; falar com bestas pequenas"],
    ["Gnomo (da Rocha)", 7.5, "INT +2, CON +1", "Visão no escuro 18 m; esperteza gnômica; conhecimento de artífice"],
    ["Goliath", 9, "FOR +2, CON +1", "Atleta natural; resistência à pedra; constituição poderosa"],
    ["Halfling (Pés Leves)", 7.5, "DES +2, CAR +1", "Sortudo; corajoso; agilidade halfling; furtividade natural"],
    ["Halfling (Robusto)", 7.5, "DES +2, CON +1", "Sortudo; corajoso; resiliência dos robustos"],
    ["Humano", 9, "+1 em todos", "Sem traços adicionais"],
    ["Humano (Variante)", 9, "+1 em dois atributos", "Uma perícia e um talento"],
    ["Kenku", 9, "DES +2, SAB +1", "Falsificador; imitação"],
    ["Meio-elfo", 9, "CAR +2, +1 em dois", "Visão no escuro 18 m; ancestral feérico; versatilidade em perícias"],
    ["Meio-orc", 9, "FOR +2, CON +1", "Visão no escuro 18 m; resistência implacável; ataques selvagens"],
    ["Tabaxi", 9, "DES +2, CAR +1", "Visão no escuro 18 m; agilidade felina; garras; escalada e velocidade"],
    ["Tiefling", 9, "CAR +2, INT +1", "Visão no escuro 18 m; resistência a fogo; legado infernal"],
    ["Tritão", 9, "FOR, CON, CAR +1", "Anfíbio; nadar 9 m; controlar bestas aquáticas"],
    ["Metamorfo (Changeling)", 9, "CAR +2, +1 à escolha", "Mudar de aparência; instinto de manipulação"],
    ["Bugbear", 9, "FOR +2, DES +1", "Visão no escuro 18 m; membros longos; furtivo"],
    ["Goblin", 9, "DES +2, CON +1", "Visão no escuro 18 m; fúria dos menores; fuga ágil"],
    ["Hobgoblin", 9, "CON +2, INT +1", "Visão no escuro 18 m; saber marcial; salvando a face"],
    ["Orc", 9, "FOR +2, CON +1", "Visão no escuro 18 m; agressivo; músculos poderosos"],
    ["Kobold", 9, "DES +2, FOR -2", "Visão no escuro 18 m; táticas de matilha; sensibilidade à luz solar"],
    ["Lizardfolk (Povo-lagarto)", 9, "CON +2, SAB +1", "Mordida; armadura natural; prender a respiração"],
    ["Yuan-ti Puro-sangue", 9, "CAR +2, INT +1", "Visão no escuro 18 m; resistência à magia; imunidade a veneno"],
    ["Centauro", 12, "FOR +2, SAB +1", "Tipo Feérico; investida; casco; montaria"],
    ["Minotauro", 9, "FOR +2, CON +1", "Chifres; investida com chifres; martelada"],
    ["Satyr (Sátiro)", 9, "CAR +2, DES +1", "Tipo Feérico; ariete; alegria; resistência à magia"]
  ];

  /* armaduras: [id, nome, categoria, CA base, FOR mínima, desvantagem em Furtividade, peso kg] */
  const ARMADURAS = [
    ["acolchoada", "Acolchoada", "leve", 11, 0, true, 4], ["couro", "Couro", "leve", 11, 0, false, 5], ["couro-batido", "Couro batido", "leve", 12, 0, false, 6.5],
    ["gibao", "Gibão de peles", "media", 12, 0, false, 6], ["camisao", "Camisão de malha", "media", 13, 0, false, 10], ["escamas", "Brunea de escamas", "media", 14, 0, true, 22.5],
    ["peitoral", "Peitoral", "media", 14, 0, false, 10], ["meia", "Meia-armadura", "media", 15, 0, true, 20],
    ["anel", "Cota de anéis", "pesada", 14, 0, true, 20], ["malha", "Cota de malha", "pesada", 16, 13, true, 27.5], ["talas", "Cota de talas", "pesada", 17, 15, true, 30], ["placas", "Armadura de placas", "pesada", 18, 15, true, 32.5]
  ];

  /* armas comuns: [nome, dado, tipo de dano, atributo (for | des | acuidade), peso kg] */
  const ARMAS = [
    ["Adaga", "1d4", "perfurante", "acuidade", 0.5], ["Bordão", "1d6", "contundente", "for", 2], ["Clava", "1d4", "contundente", "for", 1], ["Lança", "1d6", "perfurante", "for", 1.5],
    ["Maça", "1d6", "contundente", "for", 2], ["Machadinha", "1d6", "cortante", "for", 1], ["Azagaia", "1d6", "perfurante", "for", 1], ["Arco curto", "1d6", "perfurante", "des", 1],
    ["Besta leve", "1d8", "perfurante", "des", 2.5], ["Funda", "1d4", "contundente", "des", 0], ["Espada curta", "1d6", "perfurante", "acuidade", 1], ["Cimitarra", "1d6", "cortante", "acuidade", 1.5],
    ["Rapieira", "1d8", "perfurante", "acuidade", 1], ["Espada longa", "1d8", "cortante", "for", 1.5], ["Machado de batalha", "1d8", "cortante", "for", 2], ["Martelo de guerra", "1d8", "contundente", "for", 1],
    ["Arco longo", "1d8", "perfurante", "des", 1], ["Besta de mão", "1d6", "perfurante", "des", 1.5], ["Besta pesada", "1d10", "perfurante", "des", 9], ["Machado grande", "1d12", "cortante", "for", 3.5],
    ["Espada grande", "2d6", "cortante", "for", 3], ["Maça estrela", "1d8", "perfurante", "for", 2], ["Mangual", "1d8", "contundente", "for", 1], ["Glaive", "1d10", "cortante", "for", 3],
    ["Lança de cavalaria", "1d12", "perfurante", "for", 3], ["Tridente", "1d6", "perfurante", "for", 2], ["Desarmado", "1", "contundente", "for", 0]
  ];
  const TIPOS_DANO = ["cortante", "perfurante", "contundente", "ácido", "frio", "fogo", "força", "elétrico", "necrótico", "venenoso", "psíquico", "radiante", "trovejante"];

  const IDIOMAS = ["Comum", "Anão", "Élfico", "Gigante", "Gnômico", "Goblin", "Halfling", "Orc", "Abissal", "Celestial", "Dracônico", "Língua Profunda", "Infernal", "Primordial", "Silvestre", "Subcomum", "Língua de Sinais", "Druídico", "Gíria de Ladrão"];

  /* espaços de magia por nível de conjurador (1–20): spell levels 1..9 */
  const SLOTS = [null, [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1],
    [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]];
  const PACTO = [null, [1, 1], [2, 1], [2, 2], [2, 2], [2, 3], [2, 3], [2, 4], [2, 4], [2, 5], [2, 5], [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [4, 5], [4, 5], [4, 5], [4, 5]];

  const mod = (v) => Math.floor((Number(v) - 10) / 2);
  const prof = (nivel) => 2 + Math.floor((Math.max(1, nivel) - 1) / 4);
  const nivelTotal = (cls) => (cls || []).reduce((s, c) => s + (Number(c.n) || 0), 0);

  /* nível de conjurador e espaços (regra de multiclasse) */
  function conjuracao(cls) {
    const lista = (cls || []).filter((c) => c.n > 0).map((c) => ({ c, d: classe(c.c) })).filter((x) => x.d);
    const tipos = lista.map((x) => {
      let t = x.d.conj && x.d.conj.t;
      if (!t && x.d.terco && x.c.sub === x.d.terco) t = "third";
      return { ...x, t };
    }).filter((x) => x.t);
    const normais = tipos.filter((x) => x.t !== "pact"), pacto = tipos.filter((x) => x.t === "pact");
    let nc = 0;
    const unico = normais.length === 1;
    normais.forEach((x) => {
      const n = x.c.n;
      if (x.t === "full") nc += n;
      else if (x.t === "half") nc += unico ? (n >= 2 ? Math.ceil(n / 2) : 0) : Math.floor(n / 2);
      else if (x.t === "halfup") nc += unico ? Math.ceil(n / 2) : Math.ceil(n / 2);
      else if (x.t === "third") nc += unico ? (n >= 3 ? Math.ceil(n / 3) : 0) : Math.floor(n / 3);
    });
    const slots = nc > 0 ? SLOTS[Math.min(20, nc)] : [];
    const pact = pacto.length ? PACTO[Math.min(20, pacto.reduce((s, x) => s + x.c.n, 0))] : null;
    const habilidades = tipos.map((x) => ({ classe: x.d.n, id: x.d.id, atr: x.d.conj ? x.d.conj.a : "int", t: x.t }));
    return { nc, slots, pact: pact ? { qtd: pact[0], nivel: pact[1] } : null, habilidades };
  }



  function melhoriasDisponiveis(cls){
    return (cls||[]).flatMap(c=>(c.c==="Fighter"?[4,6,8,12,14,16,19]:c.c==="Rogue"?[4,8,10,12,16,19]:[4,8,12,16,19]).filter(n=>n<=c.n).map(n=>({id:c.c+":"+n,n,classe:(classe(c.c)||{}).n||c.c})));
  }
  function aplicarMelhorias(f){
    const disponiveis=new Set(melhoriasDisponiveis(f.classes).map(x=>x.id)), antes=f.bonusMelhorias||{}, depois={};
    Object.entries(f.melhorias||{}).forEach(([id,escolhas])=>{if(disponiveis.has(id))escolhas.slice(0,2).forEach(k=>{if(ATR.includes(k))depois[k]=(depois[k]||0)+1;});});
    f.atributos ||= {};
    ATR.forEach(k=>{const base=(Number(f.atributos[k])||10)-(antes[k]||0);const b=Math.min(depois[k]||0,Math.max(0,20-base));f.atributos[k]=base+b;depois[k]=b;});f.bonusMelhorias=depois;
  }
  // Escolhas de proficiência têm fontes distintas; bônus nunca se somam duas vezes.
  const normalizar = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  function racial(nome) {
    const r = RACAS.find(r => r[0] === nome), b = {}, n = normalizar(nome);
    if (!r) return { bonus: b, fixas: [], escolhas: 0, atributos: 0, tracos: [] };
    for (const m of r[2].matchAll(/(FOR|DES|CON|INT|SAB|CAR) ([+-]\d+)/g)) b[m[1].toLowerCase()] = +m[2];
    if (nome === "Humano") ATR.forEach(k => b[k] = 1);
    if (nome === "Tritão") ["for", "con", "car"].forEach(k => b[k] = 1);
    const fixas = n.startsWith("elfo") ? ["percepcao"] : n === "meio-orc" ? ["intimidacao"] : n === "goliath" ? ["atletismo"] : n === "tabaxi" ? ["percepcao", "furtividade"] : n === "bugbear" ? ["furtividade"] : n.startsWith("satyr") ? ["atuacao", "persuasao"] : [];
    const escolhas = n === "meio-elfo" || n.startsWith("lizardfolk") || n==="kenku" || n.startsWith("metamorfo") ? 2 : n === "humano (variante)" || n==="centauro" ? 1 : 0;
    const opcoes = n==="kenku" ? ["acrobacia","enganacao","furtividade","prestidigitacao"] : n.startsWith("metamorfo") ? ["enganacao","intuicao","intimidacao","persuasao"] : n==="centauro" ? ["adestrar","medicina","natureza","sobrevivencia"] : n.startsWith("lizardfolk") ? ["adestrar","natureza","percepcao","furtividade","sobrevivencia"] : TODAS;
    const atributos = /em dois|dois atributos/.test(r[2]) ? 2 : /escolha/.test(r[2]) ? 2 : 0;
    let tracos = r[3].split(";").map(t => t.trim());
    if (n.startsWith("elfo")) tracos = [...new Set([...tracos, "Ancestral feérico: vantagem contra enfeitiçamento; magia não pode fazer você dormir.", "Sentidos aguçados: proficiência em Percepção."])];
    if (n === "meio-elfo") tracos = ["Visão no escuro: 18 m.", "Ancestral feérico: vantagem contra enfeitiçamento; magia não pode fazer você dormir.", "Versatilidade em perícias: escolha duas perícias diferentes."];
    return { bonus: b, fixas, escolhas, opcoes, atributos, tracos };
  }
  function limiteEspecializacao(cls) {
    return (cls || []).reduce((s,c) => s + (c.c === "Rogue" ? (c.n >= 6 ? 4 : c.n >= 1 ? 2 : 0) : c.c === "Bard" ? (c.n >= 10 ? 4 : c.n >= 3 ? 2 : 0) : 0), 0);
  }
  function fontesPericias(f) {
    const cls = f.classes || [], r = racial(f.raca), c = cls[0] && classe(cls[0].c);
    const fixas = r.fixas;
    const raciais = [...new Set(f.perRaca || [])].filter(k => r.opcoes && r.opcoes.includes(k) && !fixas.includes(k)).slice(0,r.escolhas);
    const classePer = [...new Set(f.perClasse || [])].filter(k => c && c.per[1].includes(k) && !fixas.includes(k) && !raciais.includes(k)).slice(0,c ? c.per[0] : 0);
    const multi = cls.slice(1).flatMap(x => { const d = classe(x.c); return d && ["Bard","Ranger","Rogue"].includes(x.c) ? [...new Set(x.per || [])].filter(k=>d.per[1].includes(k)).slice(0,1) : []; });
    const basicas = [...new Set([...fixas,...raciais,...classePer,...multi])];
    const especializadas = [...new Set(f.especializacoes || [])].filter(k=>basicas.includes(k)).slice(0,limiteEspecializacao(cls));
    return { fixas, raciais, classePer, basicas, especializadas, valores: Object.fromEntries(basicas.map(k=>[k,especializadas.includes(k)?2:1])) };
  }
  function aplicarRaca(f, anterior) {
    f.atributos ||= {};
    const antes = anterior || {}, r = racial(f.raca), depois = {...r.bonus};
    const escolhas = [...new Set(f.atrRaca || [])].filter(k=>ATR.includes(k) && !(k in r.bonus)).slice(0,r.atributos);
    escolhas.forEach((k,i)=>depois[k]=(depois[k]||0)+(/\+2 e \+1/.test((RACAS.find(r=>r[0]===f.raca)||[])[2]||"") && i===0 ? 2 : 1));
    ATR.forEach(k=> { f.atributos[k] = (Number(f.atributos[k]) || 10) - (antes[k] || 0) + (depois[k] || 0); });
    f.bonusRaca = depois;
  }
  const SUB_CATALOGO = {"Trilha do Berserker":"Path of the Berserker","Colégio do Conhecimento":"College of Lore","Domínio da Vida":"Life Domain","Círculo da Terra":"Circle of the Land","Campeão":"Champion","Caminho da Mão Espalmada":"Way of the Open Hand","Juramento de Devoção":"Oath of Devotion","Caçador":"Hunter","Ladrão":"Thief","Linhagem Dracônica":"Draconic Bloodline","O Corruptor":"The Fiend","Escola de Evocação":"School of Evocation"};
  function habilidadesAutomaticas(f, itens, pt) {
    return itens.filter(h=>h.e==="2014" && (f.classes||[]).some(c=>(h.u||h.c)===c.c && (!h.u || h.c===(SUB_CATALOGO[c.sub]||c.sub)) && h.l && h.l.length && Math.min(...h.l)<=c.n))
      .sort((a,b)=>Math.min(...a.l)-Math.min(...b.l)||(a.p||a.n).localeCompare(b.p||b.n,"pt-BR"))
      .map(h=>{const cf=h.e+"|"+h.c+"|"+h.n;return {nome:h.p||h.n,desc:pt[cf]||h.d,cf,auto:"classe"};});
  }

  return { melhoriasDisponiveis, aplicarMelhorias, racial, fontesPericias, limiteEspecializacao, aplicarRaca, habilidadesAutomaticas, ATR, ATR_NOME, PERICIAS, CLASSES, classe, RACAS, ARMADURAS, ARMAS, TIPOS_DANO, IDIOMAS, SLOTS, PACTO, mod, prof, nivelTotal, conjuracao };
})();
