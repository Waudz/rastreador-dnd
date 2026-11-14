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

  function equipar(P, uid) {
    const it = porUid(P, uid); if (!existe(it)) throw new Error("Este item não está no inventário.");
    const cat = catDoItem(it), tipo = tipoEquipavel(cat);
    if (!tipo) throw new Error(cat ? "Este item não é arma, armadura nem escudo." : "Este item não está ligado ao catálogo; ligue-o antes de equipar.");
    const f = (P.ficha = P.ficha || {}), e = equipF(f);
    if (tipo === "arma") {
      if (!(cat.arma && cat.arma.dano && cat.arma.dano.dado)) throw new Error("Esta arma não tem dano definido no catálogo.");
      const L = ataquesF(f), linha = L.find((x) => x.itemUid === uid), nova = linhaDeArma(f, it, cat);
      if (linha) Object.assign(linha, { nome: nova.nome, armaId: nova.armaId }); else L.push(nova);
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
    f.ataques = ataquesF(f).filter((x) => x.itemUid !== uid);
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
    if (f.equip) {
      for (const [campo, chave, desfaz] of [["armaduraUid", "armadura", desfazerArmadura], ["escudoUid", "escudo", desfazerEscudo]]) {
        const u = f.equip[campo]; if (u && !existe(porUid(P, u))) { removidos.push(chave); desfaz(P); delete f.equip[campo]; mudou = true; }
      }
    }
    return { mudou, removidos };
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

  window.EQUIP_FICHA = { tipoEquipavel, proficiente, linhaDeArma, equipar, desequipar, alternar, reconciliar, diagnosticar, aplicarVinculos, catDoItem };
})();
