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
      destruido = true;
      if (window.INVENTARIO) window.INVENTARIO.consumir(window.INVENTARIO.conteinerDe(P), p.uid, 1, (sucesso ? "Copiado para o grimório: " : "Cópia falhou: ") + m.n, "copia");   // sai do inventário e fica no histórico de movimentações
      else { p.qtd = Number(p.qtd) - 1; if (p.qtd <= 0) P.inventario = P.inventario.filter((i) => i !== p); }
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
    if (entrada.fonte === "mestre" && !entrada.noGrimorio) return { ok: false, motivo: "Magia concedida pelo mestre: não entra no limite de preparadas." };
    if (entrada.l === 0 || entrada.semprePreparada) return { ok: false, motivo: "Truques e magias sempre preparadas não são preparados." };
    const t = tipoClasse(cid);
    if (t === "known") return { ok: false, motivo: "Esta classe conhece suas magias: não as prepara." };
    if (t === "spellbook" && !entrada.noGrimorio) return { ok: false, motivo: "O Mago só prepara magias do grimório." };
    return { ok: true };
  }

  /* Troca de uma magia conhecida ao subir de nível (Bardo, Feiticeiro, Bruxo e Patrulheiro, uma por nível). Só existe como escolha DO NÍVEL. */
  const nivelNaClasse = (st, cid) => (st.niveis || []).filter((x) => x.c === cid).length;
  function podeTrocar(f,cid){const c=(f.classes||[]).find(c=>c.c===cid);return CLASSES_TROCA.includes(cid)||!!(c&&window.CRIADOR?.perfilMagias(c,f)?.escolas);}
  function opcoesTroca(f,cid,de,grupoKey){
    const CR=window.CRIADOR,g=CR?.gruposMagias(f).find(g=>g.key===grupoKey);if(!g)return [];
    const v=g.vagas?.find(v=>v.magia===de);
    return g.opts.filter(id=>!g.selecionadas.includes(id)&&(!g.escolas||v?.livre&&v.confirmada||g.escolas.includes(escola(CR.magiaPorId(id)))));
  }
  function aplicarTroca(p, cid, de, para, { grupoKey }) {
    const f = p.ficha, st = f.criacao;
    if (!podeTrocar(f,cid)) throw new Error("Esta classe não troca magias ao subir de nível.");
    if (grupoKey !== "magias|" + cid + "|magias") throw new Error("A troca vale somente para magias conhecidas da classe, sem Arcanum ou truques.");
    const entrada = (st.niveis || [])[st.niveis.length - 1];
    if (!entrada || entrada.c !== cid) throw new Error("A troca vale para o nível que acabou de ser ganho nesta classe.");
    if (entrada.troca) throw new Error("Já houve uma troca neste nível.");
    const lista = (st.selecoes[grupoKey] || []).slice(), i = lista.indexOf(de);
    if (i < 0) throw new Error("A magia a trocar não é uma das suas conhecidas.");
    if (lista.includes(para)) throw new Error("Você já conhece a nova magia.");
    if (nivelNaClasse(st, cid) < 2) throw new Error("No primeiro nível da classe ainda não há magia anterior para trocar.");
    const CR0 = window.CRIADOR, d0 = CR0 && CR0.derivar(p).ficha;
    if (d0) {
      const racial = (id) => (d0.magias || []).some((x) => CR0.magiaId(x) === id && (x.origem === "Raça" || x.autoCriador && x.fonte !== "classe"));
      if (racial(de) || racial(para) || CR0.magiasConcedidas(d0).some((m) => m.id === de || m.id === para)) throw new Error("Magias concedidas por raça, talento ou subclasse não entram na troca.");
      const ent = (d0.magias || []).find((x) => CR0.magiaId(x) === de);
      if (ent && (ent.fonte !== "classe" || (ent.classeConj && ent.classeConj !== cid && !(ent.classes||[]).includes(cid.toLowerCase())))) throw new Error("Só magias aprendidas por esta classe podem ser trocadas.");
    }
    const CR = window.CRIADOR, g = CR && CR.gruposMagias(CR.derivar(p).ficha).find((x) => x.key === grupoKey);
    if (g && !g.opts.includes(para)) throw new Error("A nova magia precisa ser da lista da classe e de um círculo para o qual você tem espaços de magia.");
    let vaga;
    if(g?.escolas){vaga=g.vagas.find(v=>v.magia===de);if(!vaga||vaga.nivel>=nivelNaClasse(st,cid))throw Error('Troque uma magia conhecida antes deste nível.');
      if(vaga.livre&&!vaga.confirmada)throw Error('Confirme no editor a origem da escolha livre antes de trocá-la.');
      if(!vaga.livre&&!g.escolas.includes(escola(CR.magiaPorId(para))))throw Error('Esta escolha é restrita a '+g.escolas.join(' ou ')+'. A exceção acompanha apenas a escolha livre original.');
    }
    lista[i] = para;
    if(vaga){CR.registrarVagas(f);const vs=st.vagasMagias[grupoKey],v=vs.find(v=>v.id===vaga.id);v.magia=para;v.nivelEscolha=nivelNaClasse(st,cid);}
    st.selecoes[grupoKey] = lista; entrada.troca = { de, para,...(vaga?{vaga:JSON.parse(JSON.stringify(vaga))}:{}) };
    return p;
  }

  function desfazerTroca(p, grupoKey) {
    const st = p.ficha.criacao, entrada = (st.niveis || [])[st.niveis.length - 1];
    if (!entrada || !entrada.troca) throw new Error("Não há troca neste nível.");
    const lista = (st.selecoes[grupoKey] || []).slice(), i = lista.indexOf(entrada.troca.para);
    if (i < 0) throw new Error("A magia trocada não está mais entre as escolhidas.");
    if(entrada.troca.vaga){const vs=st.vagasMagias?.[grupoKey]||[],i=vs.findIndex(v=>v.id===entrada.troca.vaga.id);if(i>=0)vs[i]=JSON.parse(JSON.stringify(entrada.troca.vaga));}
    lista[i] = entrada.troca.de; st.selecoes[grupoKey] = lista; delete entrada.troca;
    return p;
  }

  /* Concessão do mestre: o mestre escolhe COMO a magia é concedida. Fica separada das aprendidas pelas regras.
     modo: conhecida (repertório, sem preparar nem contar no limite), grimorio (entra no grimório do Mago; prepara-se pelas regras do Mago),
           sempre (sempre preparada), uso-limitado ({max, recarga: curto|longo|nenhum}), outra (texto livre em `forma`). */
  const MODOS_CONCESSAO = { conhecida: "Conhecida", grimorio: "Adicionada ao grimório", sempre: "Sempre preparada", "uso-limitado": "Uso limitado", outra: "Outra forma" };
  function concederMestre(P, m, nota, opcoes = {}) {
    const f = garantir(P.ficha || (P.ficha = {})), modo = opcoes.modo || "conhecida";
    if (!MODOS_CONCESSAO[modo]) throw new Error("Escolha como a magia é concedida.");
    f.magiasMestre ||= [];
    const base = { n: m.n, en: m.en || m.n, l: circuloMagia(m) || 0, cab: m.cab || "", d: m.d || "", conc: !!m.conc, ritual: !!m.ritual, personalizada: !m.en };
    if (f.magiasMestre.some((x) => norm(x.en) === norm(base.en))) throw new Error("Esta magia já foi concedida.");
    const concessao = { modo };
    if (modo === "grimorio") {
      if (!classeDe(f, "Wizard")) throw new Error("Só o Mago tem grimório.");
      if (base.l < 1) throw new Error("Truques não vão para o grimório.");
    }
    if (modo === "uso-limitado") {
      const max = Math.round(Number(opcoes.usos));
      if (!(max >= 1 && max <= 99)) throw new Error("Informe quantos usos a magia tem (1 a 99).");
      const recarga = ["curto", "longo", "nenhum"].includes(opcoes.recarga) ? opcoes.recarga : "longo";
      concessao.usos = { max, usados: 0, recarga };
    }
    if (modo === "outra") { concessao.forma = String(opcoes.forma || "").trim().slice(0, 200); if (!concessao.forma) throw new Error("Descreva como a magia foi concedida."); }
    const reg = { ...base, nota: String(nota || "").slice(0, 200), concessao, quando: agora() };
    f.magiasMestre.push(reg);
    const entrada = { ...base, prep: modo === "sempre" || modo === "uso-limitado", semprePreparada: modo === "sempre", fonte: "mestre", concessao: JSON.parse(JSON.stringify(concessao)), registroOrigem: { tipo: "mestre", nota: reg.nota, modo }, origem: "Concedida pelo mestre", classes: [], autoCriador: false };
    if (modo === "grimorio") { entrada.noGrimorio = true; entrada.classeConj = "Wizard"; entrada.classes = ["wizard"]; entrada.prep = false; }
    f.magias.push(entrada);
    f.criacao.historicoMagias.push({ tipo: "concessao-mestre", magia: base.en, modo, nota: reg.nota, quando: reg.quando });
    return reg;
  }
  /* Uso limitado: gasta um uso (na magia e no registro do mestre, que é o que sobrevive ao recálculo); recupera no descanso conforme a recarga. */
  function usarConcedida(f, entrada) {
    const u = entrada && entrada.concessao && entrada.concessao.usos;
    if (!u) throw new Error("Esta magia não tem usos limitados.");
    if (u.usados >= u.max) throw new Error("Sem usos restantes.");
    u.usados += 1;
    const reg = (f.magiasMestre || []).find((x) => x.en === entrada.en); if (reg && reg.concessao && reg.concessao.usos) reg.concessao.usos.usados = u.usados;
    return u;
  }
  function recuperarUsos(f, descanso) {
    let n = 0;
    const regra = (u) => u && u.usados && (descanso === "longo" ? u.recarga !== "nenhum" : u.recarga === "curto");
    for (const m of f.magias || []) { const u = m.concessao && m.concessao.usos; if (regra(u)) { u.usados = 0; n++; } }
    for (const m of f.magiasMestre || []) { const u = m.concessao && m.concessao.usos; if (regra(u)) u.usados = 0; }
    return n;
  }

  window.MAGIAS_JOGO = { podeTrocar,opcoesTroca, escola, custoCopia, validarCopia, copiarParaGrimorio, podePreparar, aplicarTroca, desfazerTroca, usarConcedida, recuperarUsos, MODOS_CONCESSAO, concederMestre, listaPergaminhos, entradaGrimorio, tipoClasse, noGrimorio, maiorCirculo, CLASSES_TROCA, ROTULO_ORIGEM, SAVANT };
})();
