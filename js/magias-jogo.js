/* Regras de magia de D&D 5e (2014) para o jogo: grimório do Mago, cópia, preparação, troca ao subir de nível, magias do mestre.
   Não embute o catálogo: recebe as magias como parâmetro. Mexe só no registro do personagem (uma linha: ficha, inventário e dinheiro),
   então cada operação vira uma única gravação.
   Fontes consultadas: Livro do Jogador 2014 (Mago: grimório, p. 114; Bardo, Feiticeiro, Bruxo e Patrulheiro: trocar uma magia ao subir de nível)
   e SRD 5.1 (item Pergaminho de Magia: cópia exige Inteligência (Arcanismo) CD 10 + círculo; o pergaminho some com sucesso ou falha). */
(() => {
  "use strict";
  const R = window.REGRAS;
  const CLASSES_TROCA = ["Bard", "Sorcerer", "Ranger", "Warlock"];               // trocam UMA magia conhecida ao subir de nível
  const TIPO = { Bard: "known", Sorcerer: "known", Ranger: "known", Warlock: "known", Wizard: "spellbook", Cleric: "prepared", Druid: "prepared", Paladin: "prepared", Artificer: "prepared" };
  const SAVANT = { "Escola de Abjuração": "Abjuração", "Escola de Adivinhação": "Adivinhação", "Escola de Conjuração": "Conjuração", "Escola de Encantamento": "Encantamento", "Escola de Evocação": "Evocação", "Escola de Ilusão": "Ilusão", "Escola de Necromancia": "Necromancia", "Escola de Transmutação": "Transmutação" };
  const escola = (m) => String((m && m.cab) || "").split(/\s[·•]\s/)[0].trim();
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const idDe = (m) => m.en || m.n;
  const classeDe = (f, cid) => (f.classes || []).find((c) => c.c === cid);
  const tipoClasse = (cid) => TIPO[cid] || null;
  const garantir = (f) => { f.criacao ||= {}; f.criacao.grimorioExtra ||= []; f.criacao.historicoMagias ||= []; f.magias ||= []; return f; };
  const maiorCirculo = (f) => { const c = R.conjuracao(f.classes || []); return c.pact ? Math.max(c.pact.nivel, c.slots.reduce((n, x, i) => (x ? i + 1 : n), 0)) : c.slots.reduce((n, x, i) => (x ? i + 1 : n), 0); };
  const circuloMagia = (m) => Number(m.l);
  const agora = () => new Date().toISOString();

  /* custo e tempo de copiar uma magia para o grimório: 50 PO e 2 horas por círculo; Mago de escola do mesmo tipo da magia paga metade */
  function custoCopia(f, m) {
    const l = circuloMagia(m), w = classeDe(f, "Wizard"), metade = !!(w && SAVANT[w.sub] && SAVANT[w.sub] === escola(m));
    return { po: (50 * l) / (metade ? 2 : 1), horas: (2 * l) / (metade ? 2 : 1), metade };
  }
  const noGrimorio = (f, m) => (f.magias || []).some((x) => idDe(x) === idDe(m) && x.noGrimorio);
  const listaPergaminhos = (P) => (P.inventario || []).filter((i) => i && i.tipo === "pergaminho" && i.magiaVinculada && Number(i.qtd) > 0);

  /* Pode copiar? Devolve os motivos exatos quando não pode. Só confere; não altera nada. */
  function validarCopia(P, m, { fonte, pergaminhoUid } = {}) {
    const f = garantir(P.ficha || (P.ficha = {})), motivos = [], l = circuloMagia(m), w = classeDe(f, "Wizard");
    if (!w) motivos.push("Só o Mago tem grimório.");
    if (!(m.c || []).includes("Wizard")) motivos.push("A magia não é da lista do Mago.");
    if (l < 1) motivos.push("Truques não vão para o grimório.");
    if (w && l > maiorCirculo(f)) motivos.push("Você ainda não tem espaços de magia de " + l + "º círculo.");
    if (noGrimorio(f, m)) motivos.push("A magia já está no grimório.");
    const c = custoCopia(f, m), po = Number((P.dinheiro || {}).po) || 0;
    if (po < c.po) motivos.push("PO insuficiente: a cópia custa " + c.po + " PO e você tem " + po + ".");
    if (fonte === "pergaminho") {
      const p = listaPergaminhos(P).find((i) => i.uid === pergaminhoUid);
      if (!p) motivos.push("Escolha um pergaminho do inventário.");
      else if (idDe(p.magiaVinculada) !== idDe(m)) motivos.push("O pergaminho escolhido contém outra magia.");
    } else if (fonte !== "grimorio") motivos.push("Escolha a origem da cópia: pergaminho ou outro grimório.");
    return { ok: motivos.length === 0, motivos, custo: c, cd: fonte === "pergaminho" ? 10 + l : null, destroiPergaminho: fonte === "pergaminho", testeArcanismo: fonte === "pergaminho" };
  }

  /* Faz a cópia. Para pergaminho, `arcanismo` é o resultado total do teste de Inteligência (Arcanismo).
     O custo e o tempo são gastos na tentativa (representam tintas e material) e o pergaminho é destruído em qualquer resultado. */
  function copiarParaGrimorio(P, m, { fonte, pergaminhoUid, arcanismo } = {}) {
    const v = validarCopia(P, m, { fonte, pergaminhoUid });
    if (!v.ok) return { ok: false, motivos: v.motivos };
    const f = P.ficha, l = circuloMagia(m);
    let sucesso = true;
    if (fonte === "pergaminho") {
      const r = Number(arcanismo);
      if (!Number.isFinite(r)) return { ok: false, motivos: ["Informe o resultado do teste de Inteligência (Arcanismo)."] };
      sucesso = r >= v.cd;
    }
    P.dinheiro = { ...(P.dinheiro || {}), po: (Number((P.dinheiro || {}).po) || 0) - v.custo.po };
    let destruido = false;
    if (fonte === "pergaminho") {
      const p = listaPergaminhos(P).find((i) => i.uid === pergaminhoUid);
      p.qtd = Number(p.qtd) - 1; destruido = true;
      if (p.qtd <= 0) P.inventario = P.inventario.filter((i) => i !== p);
    }
    const registro = { tipo: "copia", fonte, magia: idDe(m), circulo: l, sucesso, custoPO: v.custo.po, horas: v.custo.horas, cd: v.cd, arcanismo: fonte === "pergaminho" ? Number(arcanismo) : null, pergaminhoDestruido: destruido, quando: agora() };
    f.criacao.historicoMagias.push(registro);
    if (sucesso) {
      f.criacao.grimorioExtra.push({ en: idDe(m), origem: fonte === "pergaminho" ? "copia-pergaminho" : "copia-grimorio", nivelTotal: R.nivelTotal(f.classes || []), custoPO: v.custo.po, horas: v.custo.horas, quando: registro.quando });
      f.magias.push(entradaGrimorio(m, fonte === "pergaminho" ? "copia-pergaminho" : "copia-grimorio", f));
    }
    return { ok: true, sucesso, registro, custo: v.custo, cd: v.cd, destruido };
  }
  const ROTULO_ORIGEM = { "copia-pergaminho": "Copiada de pergaminho", "copia-grimorio": "Copiada de outro grimório", nivel: "Aprendida ao subir de nível", criacao: "Criação do personagem", mestre: "Concedida pelo mestre", raca: "Raça", subclasse: "Subclasse", caracteristica: "Característica", item: "Item", manual: "Registro manual" };
  function entradaGrimorio(m, origem, f) {
    return { n: m.n, en: m.en, l: circuloMagia(m), cab: m.cab, d: m.d, conc: !!m.conc, ritual: !!m.ritual, prep: false, noGrimorio: true, classes: ["wizard"], fonte: "classe", classeConj: "Wizard", registroOrigem: { tipo: origem, nivelTotal: R.nivelTotal((f && f.classes) || []) }, autoCriador: false };
  }

  /* Preparar ou desmarcar. Mago: só do grimório. Clérigo, Druida e Paladino: da lista da classe. Conhecedores (Bardo, Feiticeiro, Bruxo, Patrulheiro): não preparam, usam as conhecidas. */
  function podePreparar(f, entrada) {
    const cid = entrada.classeConj || (entrada.classes && entrada.classes[0] ? entrada.classes[0].replace(/^./, (c) => c.toUpperCase()) : null);
    if (entrada.l === 0 || entrada.semprePreparada) return { ok: false, motivo: "Truques e magias sempre preparadas não são preparados." };
    const t = tipoClasse(cid);
    if (t === "known") return { ok: false, motivo: "Esta classe conhece suas magias: não as prepara." };
    if (t === "spellbook" && !entrada.noGrimorio) return { ok: false, motivo: "O Mago só prepara magias do grimório." };
    return { ok: true };
  }

  /* Troca de uma magia conhecida ao subir de nível (Bardo, Feiticeiro, Bruxo e Patrulheiro, uma por nível). Só existe como escolha DO NÍVEL. */
  function aplicarTroca(p, cid, de, para, { grupoKey }) {
    const f = p.ficha, st = f.criacao;
    if (!CLASSES_TROCA.includes(cid)) throw new Error("Esta classe não troca magias ao subir de nível.");
    const entrada = (st.niveis || [])[st.niveis.length - 1];
    if (!entrada || entrada.c !== cid) throw new Error("A troca vale para o nível que acabou de ser ganho nesta classe.");
    if (entrada.troca) throw new Error("Já houve uma troca neste nível.");
    const lista = (st.selecoes[grupoKey] || []).slice(), i = lista.indexOf(de);
    if (i < 0) throw new Error("A magia a trocar não é uma das suas conhecidas.");
    if (lista.includes(para)) throw new Error("Você já conhece a nova magia.");
    const CR = window.CRIADOR, g = CR && CR.gruposMagias(CR.derivar(p).ficha).find((x) => x.key === grupoKey);
    if (g && !g.opts.includes(para)) throw new Error("A nova magia precisa ser da lista da classe e de um círculo para o qual você tem espaços de magia.");
    lista[i] = para; st.selecoes[grupoKey] = lista; entrada.troca = { de, para };
    return p;
  }

  function desfazerTroca(p, grupoKey) {
    const st = p.ficha.criacao, entrada = (st.niveis || [])[st.niveis.length - 1];
    if (!entrada || !entrada.troca) throw new Error("Não há troca neste nível.");
    const lista = (st.selecoes[grupoKey] || []).slice(), i = lista.indexOf(entrada.troca.para);
    if (i < 0) throw new Error("A magia trocada não está mais entre as escolhidas.");
    lista[i] = entrada.troca.de; st.selecoes[grupoKey] = lista; delete entrada.troca;
    return p;
  }

  /* Concessão do mestre: magia especial ou personalizada, separada das aprendidas pelas regras. */
  function concederMestre(P, m, nota) {
    const f = garantir(P.ficha || (P.ficha = {}));
    f.magiasMestre ||= [];
    const base = { n: m.n, en: m.en || m.n, l: circuloMagia(m) || 0, cab: m.cab || "", d: m.d || "", conc: !!m.conc, ritual: !!m.ritual, personalizada: !m.en };
    if (f.magiasMestre.some((x) => norm(x.en) === norm(base.en))) throw new Error("Esta magia já foi concedida.");
    const reg = { ...base, nota: String(nota || "").slice(0, 200), quando: agora() };
    f.magiasMestre.push(reg);
    f.magias.push({ ...base, prep: true, semprePreparada: true, fonte: "mestre", registroOrigem: { tipo: "mestre", nota: reg.nota }, origem: "Concedida pelo mestre", classes: [], autoCriador: false });
    f.criacao.historicoMagias.push({ tipo: "concessao-mestre", magia: base.en, nota: reg.nota, quando: reg.quando });
    return reg;
  }

  window.MAGIAS_JOGO = { escola, custoCopia, validarCopia, copiarParaGrimorio, podePreparar, aplicarTroca, desfazerTroca, concederMestre, listaPergaminhos, entradaGrimorio, tipoClasse, noGrimorio, maiorCirculo, CLASSES_TROCA, ROTULO_ORIGEM, SAVANT };
})();
