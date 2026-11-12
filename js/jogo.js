/* Mecânicas de jogo da ficha (D&D 5e, 2014): dano e cura, PV a 0 e salvaguardas contra a morte, concentração, condições, exaustão e descansos.
   Todas as funções operam sobre o registro do personagem { pv_atual, pv_max, pv_temp, ficha } e só alteram o que dizem. Quem chama grava uma vez.
   Estado na ficha: morte {sucessos,falhas,estavel,morto}, concentracao {magia,en,circulo}|null, exaustao 0-6, efeitosAtivos (condições entre eles),
   recursosUsados, dvUsados, slotsUsados, pactoUsado, arcanumUsado {circulo:true}, diario [] (últimos 100 eventos).
   Fontes: Livro do Jogador 2014 (Cap. 8 Aventurando-se: dano, cura, morte, descansos; Apêndice A: condições; Conjuração: concentração).
   Ainda não automatizado: vantagem/desvantagem por condição nas rolagens, morte por exaustão além de marcar, vulnerabilidades, imunidades a dano,
   Fúria impedindo concentração, Guerreiro/Mago de Guerra (vantagem em concentração), efeitos que dependem de duração em rodadas. */
(() => {
  "use strict";
  const R = window.REGRAS, IE = window.ITENS_EFEITOS, RC = window.RECURSOS;
  const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const agora = () => new Date().toISOString();
  const CONDICOES = {
    Agarrado: { texto: "Deslocamento 0.", implica: [], velocidade0: true },
    Amedrontado: { texto: "Desvantagem em testes e ataques enquanto a fonte do medo estiver à vista; não se aproxima dela.", implica: [] },
    Atordoado: { texto: "Incapacitado, não se move, fala só com dificuldade; falha automática em salvaguardas de For e Des; ataques contra a criatura têm vantagem.", implica: ["Incapacitado"], velocidade0: true },
    Caído: { texto: "Só rasteja; desvantagem nos próprios ataques; ataques corpo a corpo contra ela têm vantagem, à distância têm desvantagem.", implica: [] },
    Cego: { texto: "Falha em testes que dependem da visão; ataques contra a criatura têm vantagem e os dela têm desvantagem.", implica: [] },
    Contido: { texto: "Deslocamento 0; ataques contra a criatura têm vantagem, os dela têm desvantagem; desvantagem em salvaguardas de Des.", implica: [], velocidade0: true },
    Surdo: { texto: "Não ouve; falha em testes que dependem da audição.", implica: [] },
    Enfeitiçado: { texto: "Não pode atacar quem a enfeitiçou; essa criatura tem vantagem em testes sociais contra ela.", implica: [] },
    Envenenado: { texto: "Desvantagem em jogadas de ataque e testes de habilidade.", implica: [] },
    Incapacitado: { texto: "Não pode realizar ações nem reações.", implica: [] },
    Inconsciente: { texto: "Incapacitado, não se move nem fala, não percebe o ambiente; larga o que segura e cai; falha automática em salvaguardas de For e Des; ataques têm vantagem e, a 1,5 m, são acertos críticos.", implica: ["Incapacitado", "Caído"], velocidade0: true },
    Invisível: { texto: "Impossível de ver sem magia ou sentido especial; ataques contra a criatura têm desvantagem e os dela têm vantagem.", implica: [] },
    Paralisado: { texto: "Incapacitado, não se move nem fala; falha automática em salvaguardas de For e Des; ataques têm vantagem e, a 1,5 m, são acertos críticos.", implica: ["Incapacitado"], velocidade0: true },
    Petrificado: { texto: "Transformado em pedra, incapacitado, não se move nem fala; resistência a todo dano; imune a veneno e doença.", implica: ["Incapacitado"], velocidade0: true },
  };
  const ENCERRAM_CONCENTRACAO = ["Incapacitado", "Atordoado", "Paralisado", "Petrificado", "Inconsciente"];
  const EXAUSTAO = ["", "Desvantagem em testes de habilidade", "Deslocamento reduzido à metade", "Desvantagem em ataques e salvaguardas", "PV máximo reduzido à metade", "Deslocamento 0", "Morte"];

  const ficha = (P) => (P.ficha = P.ficha || {});
  function registrar(P, tipo, texto) { const f = ficha(P); f.diario = Array.isArray(f.diario) ? f.diario : []; f.diario.push({ tipo, texto, quando: agora() }); if (f.diario.length > 100) f.diario.splice(0, f.diario.length - 100); }
  const morte = (f) => (f.morte = f.morte && typeof f.morte === "object" ? f.morte : { sucessos: 0, falhas: 0, estavel: false, morto: false });
  const estaMorto = (P) => !!(P.ficha && P.ficha.morte && P.ficha.morte.morto);

  /* ---------- condições ---------- */
  const lista = (f) => (f.efeitosAtivos = Array.isArray(f.efeitosAtivos) ? f.efeitosAtivos : []);
  const temCondicao = (f, nome) => lista(f).some((e) => e.tipo === "condicao" && e.condicao === nome) || lista(f).some((e) => e.tipo === "condicao" && ((CONDICOES[e.condicao] || {}).implica || []).includes(nome));
  function aplicarCondicao(P, nome, { duracao, origem, auto } = {}) {
    if (!CONDICOES[nome]) throw new Error("Condição desconhecida.");
    const f = ficha(P);
    if (lista(f).some((e) => e.tipo === "condicao" && e.condicao === nome)) return null;
    const e = { id: "cd_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), tipo: "condicao", condicao: nome, texto: nome, duracao: duracao || { texto: "", ate: "manual" }, origem: { item: origem || "Manual" }, quando: agora(), ...(auto ? { auto } : {}) };
    lista(f).push(e); registrar(P, "condicao", nome + " aplicada" + (origem ? " (" + origem + ")" : ""));
    if (ENCERRAM_CONCENTRACAO.includes(nome) || (CONDICOES[nome].implica || []).some((i) => ENCERRAM_CONCENTRACAO.includes(i))) encerrarConcentracao(P, nome);
    return e;
  }
  function removerCondicao(P, id) { const f = ficha(P), i = lista(f).findIndex((e) => e.id === id && e.tipo === "condicao"); if (i < 0) throw new Error("Condição não encontrada."); const [e] = lista(f).splice(i, 1); registrar(P, "condicao", e.condicao + " removida"); return e; }
  const condicoesAtivas = (f) => { const nomes = new Set(); lista(f).filter((e) => e.tipo === "condicao").forEach((e) => { nomes.add(e.condicao); ((CONDICOES[e.condicao] || {}).implica || []).forEach((i) => nomes.add(i)); }); return [...nomes]; };
  const deslocamentoZero = (f) => condicoesAtivas(f).some((n) => (CONDICOES[n] || {}).velocidade0) || num(f.exaustao) >= 5;
  const deslocamentoEfetivo = (f, base) => (deslocamentoZero(f) ? 0 : num(f.exaustao) >= 2 ? base / 2 : base);
  const pvMaxEf = (P) => (num(ficha(P).exaustao) >= 4 ? Math.floor(num(P.pv_max) / 2) : num(P.pv_max));

  /* ---------- exaustão ---------- */
  function definirExaustao(P, n) {
    const f = ficha(P), v = Math.max(0, Math.min(6, Math.floor(num(n, 0))));
    f.exaustao = v; registrar(P, "exaustao", "Exaustão nível " + v);
    if (v >= 4) P.pv_atual = Math.min(num(P.pv_atual), pvMaxEf(P));
    if (v >= 6) { morte(f).morto = true; encerrarConcentracao(P, "morte"); }
    return v;
  }

  /* ---------- concentração ---------- */
  function iniciarConcentracao(P, magia) {
    const f = ficha(P);
    if (estaMorto(P)) throw new Error("O personagem está morto.");
    if (temCondicao(f, "Incapacitado")) throw new Error("Incapacitado: não pode se concentrar.");
    if (!magia || !magia.conc) throw new Error("Esta magia não exige concentração.");
    const anterior = f.concentracao; if (anterior) registrar(P, "concentracao", "Concentração em " + anterior.magia + " encerrada: nova concentração");
    f.concentracao = { magia: magia.n, en: magia.en || magia.n, circulo: num(magia.circulo ?? magia.l) }; registrar(P, "concentracao", "Concentrando em " + magia.n);
    return { anterior: anterior || null };
  }
  function encerrarConcentracao(P, motivo = "") {
    const f = ficha(P); if (!f.concentracao) return null;
    const c = f.concentracao; f.concentracao = null; registrar(P, "concentracao", "Concentração em " + c.magia + " encerrada" + (motivo ? " (" + motivo + ")" : "")); return c;
  }
  /* bônus de salvaguarda de Constituição: modificador + proficiência (só se a classe inicial a concede) + bônus temporários */
  function bonusSalvaguarda(f, k) {
    const ps = f.classes && f.classes[0] && R.classe(f.classes[0].c) ? R.classe(f.classes[0].c).salv : [];
    return R.mod(R.atributoEf(f, k)) + (ps.includes(k) ? R.prof(R.nivelTotal(f.classes || []) || 1) : 0) + R.bonusTemp(f, "salvaguardas");
  }
  const cdConcentracao = (dano) => Math.max(10, Math.floor(num(dano) / 2));
  /* total = resultado do d20 + bônus (informado ou rolado pelo app). Falha encerra a concentração. */
  function testeConcentracao(P, cd, total) {
    const f = ficha(P); if (!f.concentracao) throw new Error("Não há concentração ativa.");
    if (!Number.isFinite(Number(total))) throw new Error("Informe o resultado do teste.");
    const ok = Number(total) >= cd;
    if (ok) registrar(P, "concentracao", "Concentração mantida (" + total + " contra CD " + cd + ")");
    else encerrarConcentracao(P, "falhou na salvaguarda " + total + " contra CD " + cd);
    return { ok, cd, total: Number(total) };
  }

  /* ---------- dano, cura, morte ---------- */
  /* dano: n pontos; opts.tipo (para resistência), opts.critico (acerto crítico contra criatura a 0 PV vale 2 falhas) */
  function dano(P, n, opts = {}) {
    const f = ficha(P); n = Math.max(0, Math.floor(num(n, 0)));
    const out = { bruto: n, aplicado: 0, temp: 0, resistido: false, zerou: false, morto: false, concentracao: null, falhaMorte: 0, mensagens: [] };
    if (estaMorto(P) || n === 0) return out;
    if (opts.tipo && lista(f).some((e) => e.tipo === "resistencia" && e.dano === opts.tipo)) { n = Math.floor(n / 2); out.resistido = true; out.mensagens.push("Resistência a " + opts.tipo + ": dano reduzido a " + n); }
    out.aplicado = n;
    const temp = num(P.pv_temp), abs = Math.min(temp, n), resto = n - abs; P.pv_temp = temp - abs; out.temp = abs;
    const antes = num(P.pv_atual);
    if (resto > 0 && antes === 0) {                       // já a 0 PV: cada dano é uma falha na salvaguarda (2 se crítico); dano igual ou maior que o PV máximo mata
      const m = morte(f);
      if (resto >= pvMaxEf(P)) { m.morto = true; out.morto = true; out.mensagens.push("Morte instantânea: dano igual ou maior que o PV máximo"); }
      else { const nf = opts.critico ? 2 : 1; m.falhas = Math.min(3, m.falhas + nf); m.estavel = false; out.falhaMorte = nf; out.mensagens.push(nf + " falha(s) na salvaguarda contra a morte"); if (m.falhas >= 3) { m.morto = true; out.morto = true; out.mensagens.push("Três falhas: o personagem morreu"); } }
    } else if (resto > 0) {
      const depois = Math.max(0, antes - resto); P.pv_atual = depois;
      if (depois === 0) {
        out.zerou = true; const excedente = resto - antes, m = morte(f);
        m.sucessos = 0; m.falhas = 0; m.estavel = false;
        if (excedente >= pvMaxEf(P)) { m.morto = true; out.morto = true; out.mensagens.push("Morte instantânea: o dano que sobrou (" + excedente + ") é igual ou maior que o PV máximo"); }
        else { aplicarCondicao(P, "Inconsciente", { origem: "PV 0", auto: "pv0" }); out.mensagens.push("Caiu a 0 PV: inconsciente e fazendo salvaguardas contra a morte"); }
      }
    }
    if (out.morto) encerrarConcentracao(P, "morte");
    else if (out.zerou) encerrarConcentracao(P, "0 PV");
    else if (f.concentracao && resto > 0) out.concentracao = { cd: cdConcentracao(resto), magia: f.concentracao.magia, bonus: bonusSalvaguarda(f, "con") };
    registrar(P, "dano", n + " de dano" + (opts.tipo ? " (" + opts.tipo + ")" : "") + (out.temp ? "; " + out.temp + " absorvidos pelos PV temporários" : "") + (out.mensagens.length ? ". " + out.mensagens.join(". ") : ""));
    return out;
  }
  /* cura: respeita o PV máximo efetivo; a partir de 0 PV desfaz inconsciência e salvaguardas contra a morte. Morto não é curado (reviver é à parte). */
  function cura(P, n) {
    const f = ficha(P); n = Math.max(0, Math.floor(num(n, 0)));
    if (estaMorto(P)) return { recuperado: 0, antes: num(P.pv_atual), depois: num(P.pv_atual), morto: true };
    const antes = num(P.pv_atual), max = pvMaxEf(P), depois = Math.min(max, antes + n);
    P.pv_atual = depois;
    if (antes === 0 && depois > 0) { const m = morte(f); m.sucessos = 0; m.falhas = 0; m.estavel = false; f.efeitosAtivos = lista(f).filter((e) => !(e.tipo === "condicao" && e.auto === "pv0")); registrar(P, "cura", "Voltou a " + depois + " PV: consciente"); }
    return { recuperado: depois - antes, antes, depois, limitado: depois - antes < n };
  }
  function salvaguardaMorte(P, d20) {
    const f = ficha(P), m = morte(f);
    if (estaMorto(P) || num(P.pv_atual) > 0) throw new Error("Só se faz salvaguarda contra a morte a 0 PV.");
    d20 = Math.floor(num(d20, NaN)); if (!(d20 >= 1 && d20 <= 20)) throw new Error("Informe o resultado do d20 (1 a 20).");
    let texto;
    if (d20 === 20) { cura(P, 1); texto = "20: voltou a 1 PV"; }
    else if (d20 === 1) { m.falhas = Math.min(3, m.falhas + 2); texto = "1: duas falhas"; }
    else if (d20 >= 10) { m.sucessos = Math.min(3, m.sucessos + 1); texto = d20 + ": sucesso"; }
    else { m.falhas = Math.min(3, m.falhas + 1); texto = d20 + ": falha"; }
    if (d20 !== 20) { if (m.falhas >= 3) { m.morto = true; texto += "; três falhas: morreu"; encerrarConcentracao(P, "morte"); } else if (m.sucessos >= 3) { m.estavel = true; m.sucessos = 0; m.falhas = 0; texto += "; três sucessos: estável"; } }
    registrar(P, "morte", "Salvaguarda contra a morte, " + texto); return { texto, morte: { ...m } };
  }
  function estabilizar(P) { const m = morte(ficha(P)); if (estaMorto(P)) throw new Error("O personagem está morto."); if (num(P.pv_atual) > 0) throw new Error("Só quem está a 0 PV precisa ser estabilizado."); m.estavel = true; m.sucessos = 0; m.falhas = 0; registrar(P, "morte", "Estabilizado"); return m; }
  function reviver(P, pv = 1) { const f = ficha(P), m = morte(f); m.morto = false; m.sucessos = 0; m.falhas = 0; m.estavel = false; P.pv_atual = Math.max(1, Math.min(pvMaxEf(P), Math.floor(num(pv, 1)))); f.efeitosAtivos = lista(f).filter((e) => !(e.tipo === "condicao" && e.auto === "pv0")); registrar(P, "morte", "Voltou à vida com " + P.pv_atual + " PV"); return P.pv_atual; }

  /* ---------- dados de vida e descansos ---------- */
  function dadosVida(f) { const m = {}; (f.classes || []).forEach((c) => { const d = R.classe(c.c); if (d && c.n > 0) m[d.dv] = (m[d.dv] || 0) + c.n; }); return m; }
  /* gasta um dado de vida: rolou = resultado do dado (sem Constituição); a cura é rolou + Con (mínimo 0) */
  function gastarDadoVida(P, faces, rolou) {
    const f = ficha(P), dv = dadosVida(f), us = (f.dvUsados = f.dvUsados || {});
    if (estaMorto(P)) throw new Error("O personagem está morto.");
    if (num(us[faces]) >= (dv[faces] || 0)) throw new Error("Sem dados de vida d" + faces + ".");
    if (rolou != null && !(Number.isInteger(rolou) && rolou >= 1 && rolou <= faces)) throw new Error("O resultado do d" + faces + " fica entre 1 e " + faces + ".");
    const ganho = rolou == null ? 0 : Math.max(0, rolou + R.mod(R.atributoEf(f, "con")));
    us[faces] = num(us[faces]) + 1;
    const c = ganho ? cura(P, ganho) : { recuperado: 0 };
    registrar(P, "descanso", "Dado de vida d" + faces + (rolou == null ? " marcado" : ": " + rolou + " → " + c.recuperado + " PV")); return { ganho, recuperado: c.recuperado };
  }
  function descansoCurto(P) {
    const f = ficha(P); if (estaMorto(P)) return { ok: false, motivo: "O personagem está morto." };
    f.descansosCurtos = num(f.descansosCurtos) + 1; f.pactoUsado = 0;
    const recursos = RC ? RC.recuperar(f, "curto") : [];
    const efeitos = IE ? IE.recuperarNoDescanso(f, "curto") : 0;
    const usosMagia = window.MAGIAS_JOGO ? window.MAGIAS_JOGO.recuperarUsos(f, "curto") : 0;
    registrar(P, "descanso", "Descanso curto: espaços de Pacto, " + recursos.length + " recurso(s), " + efeitos + " efeito(s) encerrado(s), " + usosMagia + " magia(s) de uso limitado");
    return { ok: true, recursos, efeitos, usosMagia };
  }
  /* 2014: descanso longo só dá benefícios se o personagem começa com pelo menos 1 PV (e não está morto) */
  function descansoLongo(P) {
    const f = ficha(P);
    if (estaMorto(P)) return { ok: false, motivo: "O personagem está morto." };
    if (num(P.pv_atual) < 1) return { ok: false, motivo: "É preciso ter pelo menos 1 PV no começo do descanso longo para receber seus benefícios." };
    if (num(f.exaustao) > 0) definirExaustao(P, num(f.exaustao) - 1);                    // 1 nível de exaustão (com comida e bebida)
    P.pv_atual = pvMaxEf(P); P.pv_temp = 0;
    const dv = dadosVida(f), us = (f.dvUsados = f.dvUsados || {}), total = Object.values(dv).reduce((s, x) => s + x, 0);
    let orcamento = Math.max(1, Math.floor(total / 2)), voltaram = 0;
    for (const d of Object.keys(dv).map(Number).sort((a, b) => b - a)) { const volta = Math.min(orcamento, num(us[d])); if (volta) { us[d] = num(us[d]) - volta; orcamento -= volta; voltaram += volta; } }
    f.slotsUsados = []; f.pactoUsado = 0; f.arcanumUsado = {};
    const recursos = RC ? RC.recuperar(f, "longo") : [], efeitos = IE ? IE.recuperarNoDescanso(f, "longo") : 0, usosMagia = window.MAGIAS_JOGO ? window.MAGIAS_JOGO.recuperarUsos(f, "longo") : 0;
    const m = morte(f); m.sucessos = 0; m.falhas = 0; m.estavel = false;
    f.efeitosAtivos = lista(f).filter((e) => !(e.tipo === "condicao" && e.auto === "pv0"));
    encerrarConcentracao(P, "descanso longo");
    registrar(P, "descanso", "Descanso longo: PV " + P.pv_atual + "/" + pvMaxEf(P) + ", " + voltaram + " dado(s) de vida, espaços, " + recursos.length + " recurso(s), " + efeitos + " efeito(s) encerrado(s)");
    return { ok: true, dadosVida: voltaram, recursos, efeitos, usosMagia };
  }

  /* ---------- magias: arcanum místico, recuperação arcana, espaços ---------- */
  function usarArcanum(P, circulo) {
    const f = ficha(P), m = (f.magias || []).find((x) => x.arcanum === circulo);
    if (!m) throw new Error("Você não tem Arcanum Místico de " + circulo + "º círculo."); f.arcanumUsado = f.arcanumUsado || {};
    if (f.arcanumUsado[circulo]) throw new Error("O Arcanum de " + circulo + "º círculo já foi usado neste dia."); f.arcanumUsado[circulo] = true;
    registrar(P, "magia", "Arcanum Místico: " + m.n + " conjurada sem espaço"); return m;
  }
  /* Recuperação Arcana (Mago): num descanso curto, recupera espaços cujo nível somado seja no máximo metade do nível de Mago (↑), nenhum de 6º círculo ou mais */
  function recuperacaoArcana(P, circulos) {
    const f = ficha(P), w = (f.classes || []).find((c) => c.c === "Wizard"); if (!w) throw new Error("Só o Mago tem Recuperação Arcana.");
    const limite = Math.ceil(w.n / 2), soma = circulos.reduce((s, c) => s + c, 0);
    if (!circulos.length) throw new Error("Escolha os espaços a recuperar.");
    if (circulos.some((c) => !(c >= 1 && c <= 5))) throw new Error("Não recupera espaços de 6º círculo ou mais.");
    if (soma > limite) throw new Error("O total é " + soma + " e o limite é " + limite + " (metade do nível de Mago, arredondada para cima).");
    const us = (f.slotsUsados = f.slotsUsados || []), gastos = {}; circulos.forEach((c) => { gastos[c] = (gastos[c] || 0) + 1; });
    for (const [c, q] of Object.entries(gastos)) if (num(us[c - 1]) < q) throw new Error("Não há " + q + " espaço(s) gasto(s) de " + c + "º círculo para recuperar.");
    const r = RC.usar(f, "recuperacao-arcana", 1);
    for (const [c, q] of Object.entries(gastos)) us[c - 1] = num(us[c - 1]) - q;
    registrar(P, "magia", "Recuperação Arcana: espaços de " + circulos.join(", ") + "º círculo"); return r;
  }
  /* gasta um espaço de magia do círculo (ou do Pacto) */
  function gastarEspaco(P, circulo) {
    const f = ficha(P), c = R.conjuracao(f.classes || []);
    if (circulo === "p") { if (!c.pact) throw new Error("Sem Magia de Pacto."); if (num(f.pactoUsado) >= c.pact.qtd) throw new Error("Sem espaços de Pacto."); f.pactoUsado = num(f.pactoUsado) + 1; return; }
    const total = c.slots[circulo - 1] || 0, us = (f.slotsUsados = f.slotsUsados || []);
    if (num(us[circulo - 1]) >= total) throw new Error("Sem espaços de " + circulo + "º círculo.");
    us[circulo - 1] = num(us[circulo - 1]) + 1;
  }

  window.JOGO = { CONDICOES, ENCERRAM_CONCENTRACAO, EXAUSTAO, registrar, estaMorto, aplicarCondicao, removerCondicao, condicoesAtivas, temCondicao, deslocamentoEfetivo, deslocamentoZero, pvMaxEf, definirExaustao, iniciarConcentracao, encerrarConcentracao, bonusSalvaguarda, cdConcentracao, testeConcentracao, dano, cura, salvaguardaMorte, estabilizar, reviver, dadosVida, gastarDadoVida, descansoCurto, descansoLongo, usarArcanum, recuperacaoArcana, gastarEspaco };
})();
