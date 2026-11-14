/* Equipamento da ficha x inventário (D&D 5e, 2014).
   Não é um sistema paralelo: continua valendo `ficha.ataques` (linhas de ataque), `ficha.equip.armadura` e `ficha.equip.escudo` (que alimentam a CA) e o `equipado`
   do item. Este módulo só acrescenta o VÍNCULO por identificador individual do item (`uid`):
     ataque     { ..., itemUid, armaId }       linha criada a partir de uma arma do inventário
     ficha.equip.armaduraUid / escudoUid       item do inventário que está vestido
   Regras: equipar usa um item que existe no inventário; desequipar não remove o item; remover o item do inventário desfaz o vínculo na ficha;
   trocar de armadura/escudo desequipa o anterior (sem criar itens); o nome do item pode mudar (o vínculo é o uid).
   Fichas antigas, sem vínculo, continuam funcionando como antes: `diagnosticar` só LÊ e relata; `aplicarVinculos` só roda se alguém chamar (nunca automático). */
(() => {
  "use strict";
  const R = () => window.REGRAS, CAT = () => window.CAT_ITENS;
  const slug = (id) => String(id || "").split("/").pop();
  const TIPO_PT = { bludgeoning: "contundente", piercing: "perfurante", slashing: "cortante" };
  /* armas específicas das classes que não têm "armas simples/marciais" inteiras (Livro do Jogador, 2014), por slug do catálogo */
  const PROF_ESPECIFICA = {
    Bard: ["hand-crossbow", "longsword", "rapier", "shortsword"], Rogue: ["hand-crossbow", "longsword", "rapier", "shortsword"], Monk: ["shortsword"],
    Druid: ["club", "dagger", "dart", "javelin", "mace", "quarterstaff", "scimitar", "sickle", "sling", "spear"],
    Sorcerer: ["dagger", "dart", "sling", "quarterstaff", "light-crossbow"], Wizard: ["dagger", "dart", "sling", "quarterstaff", "light-crossbow"],
  };
  const idsDoItem = (it) => [it && it.catId, it && it.ref, it && it.id].filter((x) => typeof x === "string" && x);
  const catDoItem = (it) => { const C = CAT(); if (!C || !it) return null; for (const id of idsDoItem(it)) { const c = C.obter(id); if (c) return c; } return null; };
  const inv = (P) => (Array.isArray(P.inventario) ? P.inventario : (P.inventario = []));
  const porUid = (P, uid) => inv(P).find((i) => i && i.uid === uid) || null;
  const existe = (it) => !!it && Number(it.qtd) >= 1;
  const equipF = (f) => (f.equip = f.equip || { armadura: "", escudo: false, bonus: 0 });
  const ataquesF = (f) => (f.ataques = Array.isArray(f.ataques) ? f.ataques : []);

  /* 'arma' | 'armadura' | 'escudo' | null */
  function tipoEquipavel(cat) { return cat && !cat.custom && ["arma", "armadura", "escudo"].includes(cat.categoria) ? cat.categoria : null; }

  /* proficiência da ficha com a arma: classes (simples/marciais ou lista específica) e subclasse; raça/talento o jogador marca à mão na linha de ataque */
  function proficiente(f, cat) {
    const a = cat && cat.arma; if (!a) return false;
    for (const c of f.classes || []) {
      const d = R().classe(c.c); const txt = (d && d.armas) || "";
      if ((a.categoria === "simple" && /simples/i.test(txt)) || (a.categoria === "martial" && /marciais/i.test(txt))) return true;
      if ((PROF_ESPECIFICA[c.c] || []).includes(slug(cat.id))) return true;
    }
    return a.categoria === "martial" && (f.proficienciasSubclasse || []).includes("Armas marciais");
  }
  function linhaDeArma(f, item, cat) {
    const a = cat.arma, props = a.propriedades || [], ranged = a.alcance === "ranged";
    return { nome: item.nome || cat.nome, dado: a.dano.dado, tipo: TIPO_PT[a.dano.tipo] || a.dano.tipo, atr: props.includes("finesse") ? "acuidade" : ranged ? "des" : "for", prof: proficiente(f, cat), magico: 0, extra: 0, distancia: ranged, armaId: cat.id, itemUid: item.uid };
  }

  function desfazerArmadura(P, uidAtual) {
    const e = equipF(P.ficha); const u = uidAtual || e.armaduraUid;
    if (u && (!uidAtual || e.armaduraUid === uidAtual)) { const it = porUid(P, u); if (it) it.equipado = false; e.armadura = ""; delete e.armaduraUid; }
  }
  function desfazerEscudo(P, uidAtual) {
    const e = equipF(P.ficha); const u = uidAtual || e.escudoUid;
    if (u && (!uidAtual || e.escudoUid === uidAtual)) { const it = porUid(P, u); if (it) it.equipado = false; e.escudo = false; delete e.escudoUid; }
  }

  /* Equipar uma pilha (qtd > 1) equipa UMA unidade: separa 1 unidade num registro novo (uid novo, origem copiada, origemUid apontando para a pilha) e deixa o resto da pilha intacto,
     com o uid, a origem e o histórico de sempre. Nada é apagado; o registro novo é o que a ficha liga. Munição não é equipável; armas de arremesso seguem a mesma regra (uma unidade equipada). */
  function separarUnidade(P, it) {
    const IVn = window.INVENTARIO; if (!IVn || !(Number(it.qtd) > 1)) return it;
    const novo = { ...JSON.parse(JSON.stringify(it)), uid: IVn.novoItem({}).uid, qtd: 1, equipado: false, origemUid: it.uid };
    const L = inv(P); L.splice(L.indexOf(it) + 1, 0, novo); it.qtd -= 1;
    IVn.registrar(IVn.conteinerDe(P), { tipo: "divisao", uid: it.uid, nome: it.nome, qtd: 1, nota: "Unidade separada para equipar", para: novo.uid, origem: it.origem || null });
    return novo;
  }
  const jaLigado = (P, uid) => { const f = P.ficha || {}, e = f.equip || {}; return (f.ataques || []).some((x) => x.itemUid === uid) || e.armaduraUid === uid || e.escudoUid === uid; };
  function equipar(P, uid) {
    let it = porUid(P, uid); if (!existe(it)) throw new Error("Este item não está no inventário.");
    const cat = catDoItem(it), tipo = tipoEquipavel(cat);
    if (!tipo) throw new Error(cat ? "Este item não é arma, armadura nem escudo." : "Este item não está ligado ao catálogo; ligue-o antes de equipar.");
    const f = (P.ficha = P.ficha || {}), e = equipF(f);
    if (tipo === "arma" && !(cat.arma && cat.arma.dano && cat.arma.dano.dado)) throw new Error("Esta arma não tem dano definido no catálogo.");
    if (Number(it.qtd) > 1 && !jaLigado(P, uid)) { it = separarUnidade(P, it); uid = it.uid; }
    if (tipo === "arma") {
      const L = ataquesF(f), linha = L.find((x) => x.itemUid === uid), nova = linhaDeArma(f, it, cat), g = f.armasGuardadas && f.armasGuardadas[uid];
      if (linha) Object.assign(linha, { nome: nova.nome, armaId: nova.armaId });
      else {
        /* ajustes guardados ao desequipar (bônus mágico, extra, atributo, proficiência marcada...) voltam, mas só para o MESMO item e a MESMA arma do catálogo */
        L.push(g && g.armaId === cat.id ? { ...nova, ...g.linha, nome: nova.nome, armaId: nova.armaId, itemUid: uid } : nova);
      }
      if (g) { delete f.armasGuardadas[uid]; if (!Object.keys(f.armasGuardadas).length) delete f.armasGuardadas; }
    } else if (tipo === "armadura") {
      const chave = R().ARMADURA_POR_ITEM[slug(cat.id)]; if (!chave) throw new Error("Armadura sem correspondência na ficha.");
      if (e.armaduraUid && e.armaduraUid !== uid) desfazerArmadura(P);
      e.armadura = chave; e.armaduraUid = uid;
    } else {
      if (e.escudoUid && e.escudoUid !== uid) desfazerEscudo(P);
      e.escudo = true; e.escudoUid = uid;
    }
    it.equipado = true; return it;
  }
  function desequipar(P, uid) {
    const it = porUid(P, uid), f = P.ficha || {};
    if (it) it.equipado = false;
    const linha = ataquesF(f).find((x) => x.itemUid === uid);
    if (linha) { const { itemUid, ...resto } = linha; (f.armasGuardadas = f.armasGuardadas || {})[uid] = { armaId: linha.armaId, linha: JSON.parse(JSON.stringify(resto)) }; }
    f.ataques = f.ataques.filter((x) => x.itemUid !== uid);
    if (f.equip) { desfazerArmadura(P, uid); desfazerEscudo(P, uid); }
    return it;
  }
  const alternar = (P, uid, ligado) => (ligado ? equipar(P, uid) : desequipar(P, uid));

  /* O item saiu do inventário (descarte, exclusão, quantidade zero)? A ficha deixa de tratá-lo como equipado. Também acompanha mudança de nome.
     Só mexe no que tem vínculo (itemUid / armaduraUid / escudoUid); fichas antigas ficam como estão. */
  function reconciliar(P) {
    const f = P.ficha; if (!f) return { mudou: false, removidos: [] };
    const removidos = []; let mudou = false;
    if (Array.isArray(f.ataques)) {
      f.ataques = f.ataques.filter((x) => {
        if (!x || !x.itemUid) return true;
        const it = porUid(P, x.itemUid);
        if (!existe(it)) { removidos.push(x.nome); mudou = true; return false; }
        if (it.nome && x.nome !== it.nome) { x.nome = it.nome; mudou = true; }
        return true;
      });
    }
    if (f.armasGuardadas) {
      for (const u of Object.keys(f.armasGuardadas)) if (!existe(porUid(P, u))) { delete f.armasGuardadas[u]; mudou = true; }
      if (!Object.keys(f.armasGuardadas).length) delete f.armasGuardadas;
    }
    if (f.equip) {
      for (const [campo, chave, desfaz] of [["armaduraUid", "armadura", desfazerArmadura], ["escudoUid", "escudo", desfazerEscudo]]) {
        const u = f.equip[campo]; if (u && !existe(porUid(P, u))) { removidos.push(chave); desfaz(P); delete f.equip[campo]; mudou = true; }
      }
    }
    return { mudou, removidos };
  }

  /* Transferência entre dois personagens (dados já carregados dos dois). A Origem do item é preservada e a passagem fica em `transferencias` (ver INVENTARIO.transferir).
     Depois de sair do remetente, a ficha dele deixa de tratar o item como equipado (reconciliar) e o registro que chega ao destinatário vem desequipado e sem vínculo.
     Imagem enviada pelo jogador (guardada na ficha pelo uid) acompanha o item quando cabe no orçamento da ficha do destinatário. Quem chama grava as DUAS fichas. */
  function transferir(Pa, Pb, uid, qtd, meta) {
    const IVn = window.INVENTARIO; if (!IVn) throw new Error("Inventário indisponível.");
    const it = porUid(Pa, uid); if (!existe(it)) throw new Error("Este item não está no inventário.");
    const imagem = it.ref || it.catId ? null : ((Pa.ficha || {}).imagensItens || {})[it.uid] || null;
    const novo = IVn.transferir(IVn.conteinerDe(Pa), IVn.conteinerDe(Pb), uid, qtd, meta || {});
    reconciliar(Pa);
    if (imagem && window.INV_IMG) { try { window.INV_IMG.definir(Pb.ficha, novo, imagem); } catch (_) { /* sem espaço: segue sem a imagem */ } }
    return novo;
  }

  /* ---------- escolher na ficha: achar o item correspondente no INVENTÁRIO (nunca cria item) ---------- */
  const idArmadura = (chave) => { const e = Object.entries(R().ARMADURA_POR_ITEM).find(([, k]) => k === chave); return e ? "srd51:item/" + e[0] : null; };
  /* alvo: {tipo:"armadura", chave} | {tipo:"escudo"} | {tipo:"arma", nome | armaId}. Devolve {catId, itens:[itens do inventário]}; itens vazio = não há correspondência. */
  function procurar(P, alvo) {
    const C = CAT(); let catId = null;
    if (alvo.tipo === "armadura") catId = idArmadura(alvo.chave);
    else if (alvo.tipo === "escudo") catId = "srd51:item/shield";
    else if (alvo.armaId) catId = alvo.armaId;
    else if (C) { const k = C.sem(alvo.nome), a = C.todos().filter((c) => !c.custom && c.categoria === "arma" && C.sem(c.nome) === k); catId = a.length === 1 ? a[0].id : null; }
    if (!catId) return { catId: null, itens: [] };
    /* itens que já estão ligados a outro ataque/armadura/escudo não são oferecidos */
    const f = P.ficha || {}, usados = new Set([...(f.ataques || []).map((x) => x.itemUid), f.equip && f.equip.armaduraUid, f.equip && f.equip.escudoUid].filter(Boolean));
    return { catId, itens: candidatos(P, [catId], true).filter((i) => !usados.has(i.uid)) };
  }
  /* item ainda sem catId/ref (achado pelo nome único): recebe só os IDs que faltam */
  function completarIds(it, catId) { if (!it.catId) it.catId = catId; if (!it.ref) it.ref = catId; }
  /* armadura/escudo escolhido na ficha + item do inventário escolhido */
  function vincularItem(P, uid, catId) { const it = porUid(P, uid); if (!existe(it)) throw new Error("Este item não está no inventário."); completarIds(it, catId); return equipar(P, uid); }
  /* linha de ataque que já existe na ficha (adicionada pela lista de armas) + item do inventário */
  function vincularLinha(P, indice, uid) {
    const f = P.ficha, linha = f.ataques && f.ataques[indice]; let it = porUid(P, uid);
    if (!linha || !existe(it)) throw new Error("Ataque ou item não encontrado.");
    if (linha.itemUid && linha.itemUid !== uid) throw new Error("Este ataque já está ligado a outro item.");
    const cat = catDoItem(it); if (!cat) { const k = linha.armaId; if (!k) throw new Error("Item sem vínculo com o catálogo."); completarIds(it, k); }
    if (Number(it.qtd) > 1 && !jaLigado(P, uid)) { it = separarUnidade(P, it); uid = it.uid; }
    linha.itemUid = uid; linha.armaId = linha.armaId || (catDoItem(it) || {}).id; it.equipado = true; return linha;
  }

  /* ---------- diagnóstico (somente leitura) ---------- */
  const candidatos = (P, ids, nomeCat) => inv(P).filter((i) => existe(i) && (idsDoItem(i).some((x) => ids.includes(x)) || (nomeCat && !idsDoItem(i).length && CAT() && CAT().idPorNomeUnico(i.nome) && ids.includes(CAT().idPorNomeUnico(i.nome)))));
  function diagnosticar(P) {
    const f = P.ficha || {}, C = CAT(), out = { itens: [], ataques: [], armadura: null, escudo: null, equipadosSemVinculo: [] };
    for (const i of inv(P)) {
      if (!i || idsDoItem(i).length && i.catId) continue;
      const ids = idsDoItem(i);
      if (ids.length && C && C.obter(ids[0])) { out.itens.push({ uid: i.uid, nome: i.nome, estado: "vinculo-incompleto", proposta: { catId: C.obter(ids[0]).id } }); continue; }
      if (i.origem && i.origem.tipo === "criacao" && !i.catId) { out.itens.push({ uid: i.uid, nome: i.nome, estado: "personalizado", proposta: null }); continue; }
      const todos = C ? C.todos().filter((c) => !c.custom && c.categoria !== "pacote" && C.sem(c.nome) === C.sem(i.nome)) : [];
      /* nome ambíguo: se a ficha tem uma linha de ataque com este nome, só as armas entre os candidatos contam (ex.: "Bastão" = quarterstaff, não rod) */
      const porContexto = todos.length > 1 && (f.ataques || []).some((a) => C.sem(a.nome) === C.sem(i.nome)) ? todos.filter((c) => c.categoria === "arma") : [];
      out.itens.push(todos.length === 1 ? { uid: i.uid, nome: i.nome, estado: "nome-unico", proposta: { catId: todos[0].id } }
        : porContexto.length === 1 ? { uid: i.uid, nome: i.nome, estado: "contexto", candidatos: todos.map((c) => c.id), proposta: { catId: porContexto[0].id } }
        : todos.length > 1 ? { uid: i.uid, nome: i.nome, estado: "ambiguo", candidatos: todos.map((c) => c.id), proposta: null } : { uid: i.uid, nome: i.nome, estado: "personalizado", proposta: null });
    }
    const dono = (id) => candidatos(P, [id], true);
    (f.ataques || []).forEach((a, n) => {
      if (a.itemUid) { const it = porUid(P, a.itemUid); out.ataques.push({ k: n, nome: a.nome, estado: existe(it) ? "vinculado" : "item-removido" }); return; }
      /* linha com armaId (criador): procura pelo ID; linha antiga só com nome: procura no inventário o item de mesmo nome que seja arma ou ainda sem vínculo */
      let c;
      if (a.armaId) c = dono(a.armaId);
      else { const k = C && C.sem(a.nome); if (!k) { out.ataques.push({ k: n, nome: a.nome, estado: "manual" }); return; }
        const todos = inv(P).filter((i) => existe(i) && C.sem(i.nome) === k && (!catDoItem(i) || tipoEquipavel(catDoItem(i)) === "arma"));
        if (!todos.length && !(C.idPorNomeUnico(a.nome) || (C.todos().some((x) => !x.custom && C.sem(x.nome) === k)))) { out.ataques.push({ k: n, nome: a.nome, estado: "manual" }); return; }
        c = todos; }
      out.ataques.push(c.length === 1 ? { k: n, nome: a.nome, estado: "vinculavel", proposta: { itemUid: c[0].uid } } : c.length > 1 ? { k: n, nome: a.nome, estado: "ambiguo", candidatos: c.map((x) => x.uid) } : { k: n, nome: a.nome, estado: "sem-item" });
    });
    const e = f.equip || {};
    const inverso = Object.fromEntries(Object.entries(R().ARMADURA_POR_ITEM).map(([s, k]) => [k, "srd51:item/" + s]));
    const verif = (alvo, uidCampo, id, ativo) => {
      if (!ativo) return null;
      if (e[uidCampo]) return { estado: existe(porUid(P, e[uidCampo])) ? "vinculado" : "item-removido" };
      const c = dono(id); return c.length === 1 ? { estado: "vinculavel", proposta: { itemUid: c[0].uid } } : c.length > 1 ? { estado: "ambiguo", candidatos: c.map((x) => x.uid) } : { estado: "sem-item" };
    };
    out.armadura = verif("armadura", "armaduraUid", inverso[e.armadura], !!e.armadura);
    out.escudo = verif("escudo", "escudoUid", "srd51:item/shield", !!e.escudo);
    const vinculados = new Set([...(f.ataques || []).map((a) => a.itemUid), e.armaduraUid, e.escudoUid].filter(Boolean));
    for (const i of inv(P)) { const t = tipoEquipavel(catDoItem(i)); if (i && i.equipado && t && !vinculados.has(i.uid)) out.equipadosSemVinculo.push({ uid: i.uid, nome: i.nome, tipo: t }); }
    return out;
  }
  /* Relatório em três grupos para quem vai decidir: seguros (um único candidato), ambíguos (precisa escolher) e sem correspondência. Só lê. */
  function resumo(d) {
    const seguros = [], ambiguos = [], semCorrespondencia = [], ok = [];
    for (const i of d.itens) {
      if (i.estado === "vinculo-incompleto" || i.estado === "nome-unico") seguros.push({ tipo: "item", nome: i.nome, uid: i.uid, vinculo: i.proposta.catId });
      else if (i.estado === "contexto" || i.estado === "ambiguo") ambiguos.push({ tipo: "item", nome: i.nome, uid: i.uid, candidatos: i.candidatos, sugestao: i.proposta ? i.proposta.catId : null });
    }
    const grupo = (tipo, nome, x) => { if (x.estado === "vinculavel") seguros.push({ tipo, nome, vinculo: x.proposta.itemUid }); else if (x.estado === "ambiguo") ambiguos.push({ tipo, nome, candidatos: x.candidatos }); else if (x.estado === "sem-item" || x.estado === "item-removido") semCorrespondencia.push({ tipo, nome, motivo: x.estado }); else if (x.estado === "vinculado") ok.push({ tipo, nome }); };
    d.ataques.forEach((a) => grupo("ataque", a.nome, a));
    if (d.armadura) grupo("armadura", "armadura", d.armadura);
    if (d.escudo) grupo("escudo", "escudo", d.escudo);
    return { seguros, ambiguos, semCorrespondencia, ok, equipadosSemVinculo: d.equipadosSemVinculo };
  }
  /* Correção segura e EXPLÍCITA (nunca chamada sozinha): só preenche catId/ref que faltam e o vínculo ficha<->item quando há UMA única correspondência.
     Não altera nome, quantidade, peso, descrição, origem, imagens nem o que já está vinculado. Devolve a lista do que mudou. */
  function aplicarVinculos(P, { catalogo = true, equipamento = true, contexto = false } = {}) {
    const d = diagnosticar(P), mudancas = [];
    if (catalogo) for (const x of d.itens) { if (!x.proposta) continue; const it = porUid(P, x.uid); if (!it || ![ "vinculo-incompleto", "nome-unico"].concat(contexto ? ["contexto"] : []).includes(x.estado)) continue; it.catId = it.catId || x.proposta.catId; it.ref = it.ref || x.proposta.catId; mudancas.push({ item: it.nome, catId: x.proposta.catId }); }
    if (equipamento) {
      const d2 = diagnosticar(P), f = P.ficha, e = equipF(f);
      for (const a of d2.ataques) if (a.estado === "vinculavel") { const l = f.ataques[a.k], it = porUid(P, a.proposta.itemUid); l.itemUid = it.uid; l.armaId = l.armaId || it.catId || it.ref; it.equipado = true; mudancas.push({ ataque: l.nome, itemUid: it.uid }); }
      if (d2.armadura && d2.armadura.estado === "vinculavel") { e.armaduraUid = d2.armadura.proposta.itemUid; porUid(P, e.armaduraUid).equipado = true; mudancas.push({ armadura: e.armadura }); }
      if (d2.escudo && d2.escudo.estado === "vinculavel") { e.escudoUid = d2.escudo.proposta.itemUid; porUid(P, e.escudoUid).equipado = true; mudancas.push({ escudo: true }); }
    }
    return mudancas;
  }

  window.EQUIP_FICHA = { tipoEquipavel, proficiente, linhaDeArma, equipar, desequipar, alternar, reconciliar, separarUnidade, transferir, diagnosticar, resumo, procurar, vincularItem, vincularLinha, aplicarVinculos, catDoItem };
})();
