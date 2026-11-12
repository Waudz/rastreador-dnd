/* Uso de consumíveis e itens com efeitos (D&D 5e, 2014). Base extensível: cada item guarda `propriedades.efeitos` (lista de efeitos) e o motor aplica
   cada TIPO de efeito com a sua função. Para suportar um novo tipo, basta acrescentar uma entrada em TIPOS_EFEITO.
   Operação única e atômica: `usar` valida tudo, calcula o resultado numa cópia e só no fim grava no personagem (inventário, ficha, PV).
   Se qualquer passo falhar, o personagem fica exatamente como estava (sem consumo parcial nem duplicado).
   Efeitos são DADOS (nada executável), então o mestre pode configurar itens personalizados.

   Tipos suportados hoje:
     cura        { dados:{n,d,b} }                     recupera PV (rolagem no app ou resultado manual), sem passar do máximo
     pv-temp     { dados:{n,d,b} }                     PV temporários; não se acumulam (vale o maior), regra de 2014
     modificador { categoria, valor, duracao }          bônus temporário por categoria (testes, ataques, salvaguardas, ca, cdMagia)
     atributo    { atributo, valor, duracao }           bônus temporário no valor de um atributo
     condicao    { condicao, duracao }                  condição ou estado (ex.: Invisível)
     resistencia { dano | "escolher", duracao }          resistência a um tipo de dano
     manual      { texto, duracao }                     efeito descrito em texto, aplicado à mão (não automatizado)
   Efeito passivo (`passivo:true`): vale enquanto o item estiver equipado (e sintonizado, se exigir): anel/capa de proteção.
   Não suportados ainda (use "manual"): efeitos que dependem de dado a cada rodada (ex.: Bênção 1d4), conjuração de magia por item,
   dano a terceiros, efeitos em área, recarga automática de cargas ao amanhecer, expiração automática por tempo,
   aplicar o efeito diretamente na ficha de OUTRO personagem (exige permissão do servidor): para outro alvo o resultado é só registrado. */
(() => {
  "use strict";
  const R = window.REGRAS, INV = window.INVENTARIO;
  const copia = (o) => JSON.parse(JSON.stringify(o));
  const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const TIPOS_DANO = ["ácido", "contundente", "cortante", "elétrico", "energético", "frio", "fogo", "necrótico", "perfurante", "psíquico", "radiante", "trovejante", "venenoso"];
  const CONDICOES = ["Agarrado", "Amedrontado", "Atordoado", "Caído", "Cego", "Contido", "Surdo", "Enfeitiçado", "Envenenado", "Incapacitado", "Inconsciente", "Invisível", "Paralisado", "Petrificado"];
  const DURACOES = { manual: "Até encerrarEfeito", "descanso-curto": "Até um descanso curto", "descanso-longo": "Até um descanso longo" };
  const formatarDados = (d) => d ? (d.n && d.d ? `${d.n}d${d.d}` : "") + (num(d.b) ? (d.n && d.d ? (d.b > 0 ? "+" : "") : "") + d.b : (d.n && d.d ? "" : "0")) : "";
  const faixa = (d) => ({ min: num(d.n) * (d.n && d.d ? 1 : 0) + num(d.b), max: num(d.n) * num(d.d) + num(d.b) });
  /* Rolagem de dados do app. `rng` devolve número em [0,1): permite testar com valores fixos. */
  function rolar(d, rng = Math.random) {
    const rolls = []; for (let i = 0; i < num(d.n); i++) rolls.push(1 + Math.floor(rng() * num(d.d)));
    return { rolls, bonus: num(d.b), total: rolls.reduce((s, x) => s + x, 0) + num(d.b), expressao: formatarDados(d) };
  }
  const efeitosDe = (item) => (item && item.propriedades && Array.isArray(item.propriedades.efeitos) ? item.propriedades.efeitos : []);
  const temEfeitos = (item) => efeitosDe(item).some((e) => !e.passivo) || (item && item.tipo === "pergaminho");

  /* ---------- aplicação de cada tipo (opera na CÓPIA `E` = {pv_atual, pv_max, pv_temp, ficha}) ---------- */
  const TIPOS_EFEITO = {
    cura: {
      rotulo: "Cura", dado: true,
      aplicar(E, ef, ctx) { const antes = E.pv_atual; if (window.JOGO) { const c = window.JOGO.cura(E, ctx.total); return { texto: `Cura ${ctx.total}: PV ${antes} → ${c.depois}${c.recuperado < ctx.total ? " (limitado ao máximo)" : ""}${antes === 0 && c.depois > 0 ? "; voltou à consciência" : ""}`, valor: ctx.total, recuperado: c.recuperado }; } const depois = Math.min(E.pv_max, antes + ctx.total); E.pv_atual = depois; return { texto: `Cura ${ctx.total}: PV ${antes} → ${depois}${depois - antes < ctx.total ? " (limitado ao máximo)" : ""}`, valor: ctx.total, recuperado: depois - antes }; },
    },
    "pv-temp": {
      rotulo: "PV temporários", dado: true,
      aplicar(E, ef, ctx) { const antes = num(E.pv_temp), depois = Math.max(antes, ctx.total); E.pv_temp = depois; return { texto: depois > antes ? `PV temporários: ${antes} → ${depois}` : `PV temporários mantidos em ${antes} (não se acumulam; o maior valor vale)`, valor: ctx.total }; },
    },
    modificador: {
      rotulo: "Modificador", ativo: true,
      validar(ef) { return R && R.CATEGORIAS_TEMP.some((c) => c[0] === ef.categoria) && Number.isFinite(Number(ef.valor)) ? null : "Escolha a categoria e o valor do modificador."; },
      descrever: (ef) => `${R.CATEGORIAS_TEMP.find((c) => c[0] === ef.categoria)?.[1] || ef.categoria}: ${num(ef.valor) >= 0 ? "+" : ""}${num(ef.valor)}`,
    },
    atributo: {
      rotulo: "Atributo", ativo: true,
      validar(ef) { return R && R.ATR_NOME && R.ATR_NOME[ef.atributo] && Number.isFinite(Number(ef.valor)) ? null : "Escolha o atributo e o valor."; },
      descrever: (ef) => `${R.ATR_NOME[ef.atributo]}: ${num(ef.valor) >= 0 ? "+" : ""}${num(ef.valor)}`,
    },
    condicao: { rotulo: "Condição", ativo: true, validar: (ef) => (String(ef.condicao || "").trim() ? null : "Informe a condição."), descrever: (ef) => String(ef.condicao) },
    resistencia: { rotulo: "Resistência", ativo: true, escolha: "dano", validar: (ef) => (ef.dano === "escolher" || TIPOS_DANO.includes(ef.dano) ? null : "Escolha o tipo de dano."), descrever: (ef, ctx) => "Resistência a dano " + (ctx && ctx.dano ? ctx.dano : ef.dano) },
    manual: { rotulo: "Efeito manual", ativo: true, validar: (ef) => (String(ef.texto || "").trim() ? null : "Descreva o efeito."), descrever: (ef) => String(ef.texto) },
  };

  /* O que precisa ser decidido antes de usar: alvo, resultado de cada rolagem, tipo de dano das resistências "à escolha". */
  function plano(item) {
    const lista = efeitosDe(item).filter((e) => !e.passivo);
    return lista.map((ef, i) => { const t = TIPOS_EFEITO[ef.tipo]; return { i, ef, tipo: ef.tipo, rotulo: t ? t.rotulo : ef.tipo, dado: !!(t && t.dado), dados: ef.dados, escolhaDano: !!(t && t.escolha === "dano" && ef.dano === "escolher"), suportado: !!t }; });
  }
  function validarItem(item) {
    const erros = [];
    for (const [i, ef] of efeitosDe(item).entries()) {
      const t = TIPOS_EFEITO[ef.tipo];
      if (!t) { erros.push(`Efeito ${i + 1}: tipo "${ef.tipo}" ainda não é suportado.`); continue; }
      if (t.dado && !(ef.dados && num(ef.dados.n) >= 0 && num(ef.dados.d) >= 0 && (num(ef.dados.n) * num(ef.dados.d) > 0 || num(ef.dados.b) > 0))) erros.push(`Efeito ${i + 1}: informe os dados ou o valor.`);
      if (t.validar) { const m = t.validar(ef); if (m) erros.push(`Efeito ${i + 1}: ${m}`); }
    }
    return erros;
  }

  /* Valida a escolha do jogador sem alterar nada. */
  function previa(P, uid, esc = {}) {
    const motivos = [], item = (P.inventario || []).find((i) => i.uid === uid);
    if (!item) return { ok: false, motivos: ["Item não encontrado no inventário."] };
    if (!(Number(item.qtd) >= 1)) motivos.push("Não há unidades disponíveis.");
    const cons = item.propriedades.consumo || (item.tipo === "magico" ? "carga" : "unidade");
    if (cons === "carga") { const g = item.propriedades.cargas, custo = num(item.propriedades.custoCarga, 1); if (!g || g.atual < custo) motivos.push("Cargas insuficientes."); }
    motivos.push(...validarItem(item));
    const alvo = esc.alvo && esc.alvo.tipo === "outro" ? { tipo: "outro", nome: String(esc.alvo.nome || "").trim() } : { tipo: "proprio" };
    if (alvo.tipo === "outro" && !alvo.nome) motivos.push("Informe o nome do alvo.");
    const linhas = [];
    for (const p of plano(item)) {
      if (!p.suportado) continue;
      let ctx = {};
      if (p.dado) {
        const r = (esc.rolagens || {})[p.i], fx = faixa(p.dados);
        if (num(p.dados.n) * num(p.dados.d) === 0) { ctx.total = num(p.dados.b); linhas.push({ i: p.i, tipo: p.tipo, ctx }); continue; }   // valor fixo: não há o que rolar
        if (r === undefined || r === null || r === "" || !Number.isFinite(Number(r))) { motivos.push(`${p.rotulo}: role os dados ou informe o resultado (${formatarDados(p.dados)}).`); continue; }
        if (!Number.isInteger(Number(r)) || Number(r) < fx.min || Number(r) > fx.max) { motivos.push(`${p.rotulo}: o resultado de ${formatarDados(p.dados)} fica entre ${fx.min} e ${fx.max}.`); continue; }
        ctx.total = Number(r);
      }
      if (p.escolhaDano) { const d = (esc.danos || {})[p.i]; if (!TIPOS_DANO.includes(d)) { motivos.push("Escolha o tipo de dano da resistência."); continue; } ctx.dano = d; }
      linhas.push({ i: p.i, tipo: p.tipo, ctx });
    }
    return { ok: motivos.length === 0, motivos, item, alvo, linhas, consumo: cons };
  }

  /* Usa o item: tudo ou nada. Devolve { ok, resultado:[...], consumido } e altera P somente em caso de sucesso. */
  function usar(P, uid, esc = {}) {
    const v = previa(P, uid, esc);
    if (!v.ok) return { ok: false, motivos: v.motivos };
    try {
      const E = { pv_atual: num(P.pv_atual), pv_max: num(P.pv_max), pv_temp: num(P.pv_temp), ficha: copia(P.ficha || {}) }, novoP = { id: P.id, inventario: copia(P.inventario || []), ficha: E.ficha };
      const c = INV.conteinerDe(novoP), item = c.itens.find((i) => i.uid === uid), resultado = [], alvoProprio = v.alvo.tipo === "proprio";
      E.ficha.efeitosAtivos = Array.isArray(E.ficha.efeitosAtivos) ? E.ficha.efeitosAtivos : [];
      for (const l of v.linhas) {
        const ef = efeitosDe(item).filter((e) => !e.passivo)[l.i], t = TIPOS_EFEITO[ef.tipo];
        if (!alvoProprio) { resultado.push({ tipo: ef.tipo, texto: t.aplicar ? `${t.rotulo}: ${l.ctx.total} em ${v.alvo.nome} (aplicar na ficha do alvo)` : `${t.rotulo}: ${t.descrever(ef, l.ctx)} em ${v.alvo.nome} (aplicar na ficha do alvo)`, valor: l.ctx.total ?? null, alvo: v.alvo.nome }); continue; }
        if (t.aplicar) resultado.push({ tipo: ef.tipo, ...t.aplicar(E, ef, l.ctx) });
        else {
          const ativo = { id: "ef_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), tipo: ef.tipo, texto: t.descrever(ef, l.ctx), duracao: { ...(ef.duracao || { texto: "", ate: "manual" }) }, origem: { item: item.nome, uid: item.uid }, quando: new Date().toISOString() };
          for (const k of ["categoria", "atributo", "valor", "condicao", "dano", "texto"]) if (ef[k] !== undefined) ativo[k] = ef[k];
          if (l.ctx.dano) { ativo.dano = l.ctx.dano; ativo.texto = t.descrever(ef, l.ctx); }
          E.ficha.efeitosAtivos.push(ativo); resultado.push({ tipo: ef.tipo, texto: `${t.rotulo}: ${ativo.texto}${ativo.duracao.texto ? " (" + ativo.duracao.texto + ")" : ""}` });
        }
      }
      let consumido = null;
      const extra = { alvo: v.alvo.tipo === "outro" ? v.alvo.nome : "este personagem", resultado: resultado.map((r) => r.texto), origem: item.origem || null };
      if (v.consumo === "carga") { const g = item.propriedades.cargas, custo = num(item.propriedades.custoCarga, 1); g.atual -= custo; consumido = { carga: custo }; INV.registrar(c, { tipo: "uso-efeito", uid, nome: item.nome, qtd: 0, consumido, ...extra }); }
      else if (v.consumo === "unidade") { consumido = { unidade: 1 }; INV.retirar(c, uid, 1, { tipo: "uso-efeito", extra: { consumido, ...extra } }); }
      else INV.registrar(c, { tipo: "uso-efeito", uid, nome: item.nome, qtd: 0, consumido: null, ...extra });
      sincronizarPassivos(novoP);
      /* tudo certo: só agora o personagem muda */
      P.pv_atual = Math.max(0, Math.min(E.pv_max, E.pv_atual)); P.pv_temp = E.pv_temp; P.inventario = novoP.inventario; P.ficha = E.ficha;
      return { ok: true, resultado, consumido };
    } catch (e) { return { ok: false, motivos: ["Não foi possível usar o item: " + e.message] }; }
  }
  /* Efeitos ativos */
  function encerrarEfeito(P, id) {
    const f = P.ficha || {}, lista = f.efeitosAtivos || [], i = lista.findIndex((e) => e.id === id);
    if (i < 0) throw new Error("Efeito não encontrado."); if (lista[i].passivo) throw new Error("Efeito de item equipado: desequipe o item.");
    lista.splice(i, 1); return true;
  }
  function recuperarNoDescanso(f, descanso) {
    if (!Array.isArray(f.efeitosAtivos)) return 0;
    const antes = f.efeitosAtivos.length;
    f.efeitosAtivos = f.efeitosAtivos.filter((e) => e.passivo || !(e.duracao && (e.duracao.ate === "descanso-longo" ? descanso === "longo" : e.duracao.ate === "descanso-curto" ? descanso === "curto" || descanso === "longo" : false)));
    return antes - f.efeitosAtivos.length;
  }
  /* Itens com efeito passivo: valem equipados (e sintonizados, se exigirem). Recalculado do zero a cada mudança no inventário. */
  function sincronizarPassivos(P) {
    const f = (P.ficha = P.ficha || {}); f.efeitosAtivos = (Array.isArray(f.efeitosAtivos) ? f.efeitosAtivos : []).filter((e) => !e.passivo);
    for (const it of P.inventario || []) {
      const s = it.propriedades && it.propriedades.sintonia, vale = it.equipado && (!s || !s.requer || s.sintonizado);
      if (!vale) continue;
      for (const ef of efeitosDe(it).filter((e) => e.passivo)) { const t = TIPOS_EFEITO[ef.tipo]; if (!t || !t.ativo) continue; const a = { id: "ps_" + it.uid + "_" + f.efeitosAtivos.length, tipo: ef.tipo, texto: t.descrever(ef), duracao: { texto: "Enquanto equipado", ate: "manual" }, origem: { item: it.nome, uid: it.uid }, passivo: true }; for (const k of ["categoria", "atributo", "valor", "condicao", "dano", "texto"]) if (ef[k] !== undefined) a[k] = ef[k]; if (ef.tipo === "manual") a.texto = ef.texto; f.efeitosAtivos.push(a); }
    }
    return f.efeitosAtivos;
  }

  /* ---------- amostras representativas (SRD 5.1 / 2014) ---------- */
  const cura = (n, d, b) => [{ tipo: "cura", dados: { n, d, b } }];
  const CATALOGO = {
    "pocao-cura": { nome: "Poção de Cura", tipo: "consumivel", peso: 0.5, ref: "srd51:item/potion-of-healing", propriedades: { raridade: "Comum", efeitos: cura(2, 4, 2) } },
    "pocao-cura-maior": { nome: "Poção de Cura Maior", tipo: "consumivel", peso: 0.5, ref: "srd51:item/potion-of-healing-greater", propriedades: { raridade: "Incomum", efeitos: cura(4, 4, 4) } },
    "pocao-cura-superior": { nome: "Poção de Cura Superior", tipo: "consumivel", peso: 0.5, ref: "srd51:item/potion-of-healing-superior", propriedades: { raridade: "Rara", efeitos: cura(8, 4, 8) } },
    "pocao-cura-suprema": { nome: "Poção de Cura Suprema", tipo: "consumivel", peso: 0.5, ref: "srd51:item/potion-of-healing-supreme", propriedades: { raridade: "Muito rara", efeitos: cura(10, 4, 20) } },
    "pocao-heroismo": { nome: "Poção de Heroísmo", tipo: "consumivel", peso: 0.5, ref: "srd51:item/potion-of-heroism", propriedades: { raridade: "Rara", efeitos: [{ tipo: "pv-temp", dados: { n: 0, d: 0, b: 10 } }, { tipo: "manual", texto: "Imune a amedrontado e sob o efeito de Bênção (+1d4 em ataques e salvaguardas, rolado à mão)", duracao: { texto: "1 hora", ate: "manual" } }] } },
    "pocao-resistencia": { nome: "Poção de Resistência", tipo: "consumivel", peso: 0.5, ref: "srd51:item/potion-of-resistance", propriedades: { raridade: "Incomum", efeitos: [{ tipo: "resistencia", dano: "escolher", duracao: { texto: "1 hora", ate: "manual" } }] } },
    "pocao-invisibilidade": { nome: "Poção de Invisibilidade", tipo: "consumivel", peso: 0.5, ref: "srd51:item/potion-of-invisibility", propriedades: { raridade: "Muito rara", efeitos: [{ tipo: "condicao", condicao: "Invisível", duracao: { texto: "1 hora (termina se atacar ou conjurar)", ate: "manual" } }] } },
    antitoxina: { nome: "Antitoxina", tipo: "consumivel", peso: 0, ref: "srd51:item/antitoxin", propriedades: { efeitos: [{ tipo: "manual", texto: "Vantagem em salvaguardas contra veneno", duracao: { texto: "1 hora", ate: "manual" } }] } },
    "anel-protecao": { nome: "Anel de Proteção", tipo: "magico", peso: 0, ref: "srd51:item/ring-of-protection", propriedades: { raridade: "Rara", consumo: "nenhum", sintonia: { requer: true, sintonizado: false }, efeitos: [{ tipo: "modificador", categoria: "ca", valor: 1, passivo: true }, { tipo: "modificador", categoria: "salvaguardas", valor: 1, passivo: true }] } },
    "varinha-misseis": { nome: "Varinha de Mísseis Mágicos", tipo: "magico", peso: 0.5, ref: "srd51:item/wand-of-magic-missiles", propriedades: { raridade: "Incomum", consumo: "carga", custoCarga: 1, cargas: { atual: 7, max: 7, recarga: "1d6+1 ao amanhecer (à mão)" }, efeitos: [{ tipo: "manual", texto: "Conjura Mísseis Mágicos (1º círculo; +1 círculo por carga extra gasta, à mão). Dano é rolado à mão." }] } },
  };
  const itemDoCatalogo = (chave, origem) => { const m = CATALOGO[chave]; if (!m) throw new Error("Item do catálogo não encontrado."); return INV.novoItem({ nome: m.nome, tipo: m.tipo, peso: m.peso, ref: m.ref, origem: origem || { tipo: "jogo" }, propriedades: copia(m.propriedades) }); };

  window.ITENS_EFEITOS = { TIPOS_EFEITO, TIPOS_DANO, CONDICOES, DURACOES, CATALOGO, itemDoCatalogo, rolar, formatarDados, faixa, efeitosDe, temEfeitos, plano, validarItem, previa, usar, encerrarEfeito, recuperarNoDescanso, sincronizarPassivos };
})();
