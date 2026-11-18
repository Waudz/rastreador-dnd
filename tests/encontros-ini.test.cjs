const test = require("node:test"), assert = require("node:assert/strict");
const { ler, armazenamento, vm } = require("./helpers.cjs");

function carregar() {
  const ctx = vm.createContext({ window: {}, localStorage: armazenamento(), console });
  for (const f of ["js/encontros-dados.js", "js/encontros-monstros.js", "js/encontros-ini.js"]) vm.runInContext(ler(f), ctx);
  return ctx.window;
}
const j = (x) => JSON.parse(JSON.stringify(x));
const goblin = { key: "srd_goblin", name: "Goblin", armor_class: 15, hit_points: 7, challenge_rating: 0.25, initiative_bonus: 2 };
function cenario() {
  const W = carregar(), M = W.ENCONTROS_MONSTROS, I = W.ENCONTROS_INI, st = armazenamento();
  const ms = M.adicionar([], M.resumo(goblin, "Goblin"), 3).novos;
  const itens = (l) => l.map((m) => ({ no: "n1", enc: "e1", m }));
  return { W, M, I, st, ms, itens };
}

test("enviar: individual ou em grupo, com rolagem automática, valor manual ou em branco", () => {
  const { I, ms, itens } = cenario(); let e = I.lerEstado(armazenamento(), "c1");
  let r = I.enviar(e, itens(ms), { modo: "auto", rolar: () => 10 });
  assert.equal(r.enviados.length, 3); assert.ok(e.combatants.every((c) => c.initiative === 12 && c.kind === "Monstro" && c.hp === 7 && c.maxHp === 7 && c.ac === 15 && c.key === "srd_goblin"));
  assert.deepEqual(j(e.combatants.map((c) => c.name)), ["Goblin 1", "Goblin 2", "Goblin 3"], "identificação individual");
  e = I.lerEstado(armazenamento(), "c1"); I.enviar(e, itens([ms[0]]), { modo: "manual", valores: { [ms[0].uid]: "17" } }); assert.equal(e.combatants[0].initiative, 17);
  e = I.lerEstado(armazenamento(), "c1"); I.enviar(e, itens(ms), { modo: "branco" }); assert.ok(e.combatants.every((c) => c.initiative === null));
});

test("iniciativa compartilhada: uma rolagem para criaturas iguais; individual: uma por criatura", () => {
  const { I, ms, itens } = cenario(); let n = 0;
  let e = I.lerEstado(armazenamento(), "c1"); I.enviar(e, itens(ms), { modo: "auto", compartilhada: true, rolar: () => ++n });
  assert.equal(new Set(e.combatants.map((c) => c.initiative)).size, 1); assert.equal(n, 1);
  n = 0; e = I.lerEstado(armazenamento(), "c1"); I.enviar(e, itens(ms), { modo: "auto", rolar: () => ++n });
  assert.equal(new Set(e.combatants.map((c) => c.initiative)).size, 3);
  e = I.lerEstado(armazenamento(), "c1"); I.enviar(e, itens(ms), { modo: "manual", compartilhada: true, valores: { srd_goblin: 14 } }); assert.ok(e.combatants.every((c) => c.initiative === 14));
});

test("sem envio duplicado, e reforços não reiniciam o combate", () => {
  const { M, I, ms, itens } = cenario(); const e = I.lerEstado(armazenamento(), "c1");
  I.enviar(e, itens(ms.slice(0, 2)), { modo: "auto", rolar: () => 5 }); e.currentId = e.combatants[1].id; e.round = 4;
  const r = I.enviar(e, itens(ms), { modo: "auto", rolar: () => 20 });
  assert.equal(r.duplicados.length, 2); assert.equal(r.enviados.length, 1); assert.equal(e.combatants.length, 3);
  assert.equal(e.round, 4); assert.equal(e.currentId, e.combatants[1].id, "turno atual preservado"); assert.equal(e.combatants[0].initiative, 7, "quem já estava não muda");
  const ref = M.adicionar(ms, M.resumo(goblin), 1).novos; assert.equal(I.enviar(e, itens(ref), { modo: "branco" }).enviados.length, 1); assert.equal(e.combatants.length, 4);
  ms[0].situacao = "fugiu"; assert.equal(I.enviar(I.lerEstado(armazenamento(), "x"), itens([ms[0]]), {}).ignorados.length, 1);
});

test("sincronização: encontro -> iniciativa e iniciativa -> encontro (PV, condições, situação)", () => {
  const { M, I, ms, itens } = cenario(); const e = I.lerEstado(armazenamento(), "c1"); I.enviar(e, itens(ms), { modo: "branco" });
  const novo = M.editar(ms[1], { pv: 2, ca: 17, nome: "Grix", condicoes: ["Caído", "Envenenado"] }).monstro;
  I.escreverNoCombatente(I.combatenteDe(e, ms[1].uid), novo);
  const c = I.combatenteDe(e, ms[1].uid); assert.equal(c.hp, 2); assert.equal(c.ac, 17); assert.equal(c.name, "Grix"); assert.deepEqual(j(c.effects.map((x) => x.type).sort()), ["poison", "prone"]);
  assert.equal(I.combatenteDe(e, ms[0].uid).hp, 7, "outros exemplares intactos");
  c.hp = 0; c.effects = c.effects.filter((x) => x.type !== "prone"); c.effects.push({ id: "z", type: "fire", name: "Queimando", rounds: 2 });
  const volta = I.lerDoCombatente(c, novo);
  assert.equal(volta.pv, 0); assert.equal(volta.situacao, "inconsciente"); assert.deepEqual(j(volta.condicoes), ["Envenenado"]);
  c.morto = true; assert.equal(I.lerDoCombatente(c, novo).situacao, "derrotado");
  assert.equal(I.lerDoCombatente({ hp: 3, maxHp: 7, ac: 15, effects: [] }, { ...novo, situacao: "fugiu" }).situacao, "fugiu", "fugiu/capturado são preservados");
});

test("associar e desassociar combatentes (inclusive em combate), sem vincular improvisados sozinho", () => {
  const { I, ms } = cenario(); const e = I.lerEstado(armazenamento(), "c1");
  e.combatants.push({ id: "a", name: "Orc improvisado", kind: "Monstro", hp: 10, maxHp: 15, ac: 13, initiative: 11 }, { id: "p", name: "Ana", kind: "Personagem", pid: "x", hp: 20, maxHp: 20 });
  assert.equal(I.combatenteDe(e, ms[0].uid), null, "nada é vinculado automaticamente");
  assert.deepEqual(j(I.candidatos(e).map((c) => c.id)), ["a"], "personagens não são candidatos");
  assert.ok(I.associar(e, "a", "n1", "e1", ms[0].uid).ok); assert.equal(I.combatenteDe(e, ms[0].uid).id, "a");
  assert.ok(I.associar(e, "a", "n1", "e1", ms[1].uid).erro, "já ligado");
  assert.equal(I.desassociar(e, ms[0].uid), true); assert.equal(e.combatants.length, 2, "continua em combate"); assert.equal(I.combatenteDe(e, ms[0].uid), null);
});

test("encerrar o combate: o recibo guarda o estado final e é aplicado no encontro", () => {
  const { M, I, ms, itens, st } = cenario(); const e = I.lerEstado(armazenamento(), "c1"); I.enviar(e, itens(ms), { modo: "branco" });
  const c1 = I.combatenteDe(e, ms[0].uid); c1.hp = 0; c1.morto = true; const c2 = I.combatenteDe(e, ms[1].uid); c2.hp = 3; c2.effects.push({ id: "q", type: "prone", name: "Caído", rounds: null });
  I.registrar(st, "c1", e.combatants, 1000);
  e.combatants = [];                                                   // "limpar iniciativa": o combate some, o recibo fica
  I.registrar(st, "c1", e.combatants, 2000);
  const rec = I.lerRecibos(st, "c1"); assert.equal(Object.keys(rec).length, 3);
  const nos = [{ id: "n1", dados: { monstros: ms } }];
  const { alteracoes, aplicados } = I.pendentes(nos, rec);
  const por = Object.fromEntries(alteracoes.map((a) => [a.uid, a.m]));
  assert.equal(por[ms[0].uid].pv, 0); assert.equal(por[ms[0].uid].situacao, "derrotado");
  assert.equal(por[ms[1].uid].pv, 3); assert.deepEqual(j(por[ms[1].uid].condicoes), ["Caído"]);
  assert.equal(por[ms[2].uid].pv, 7);
  I.limparRecibos(st, "c1", aplicados); assert.equal(st.getItem("compendio:encontros-sync:c1"), null);
});

test("recibos: edição mais nova no encontro não é sobrescrita; instância removida descarta o recibo; mover entre salas mantém o vínculo por uid", () => {
  const { I, ms, itens } = cenario(); const e = I.lerEstado(armazenamento(), "c1"); I.enviar(e, itens(ms), { modo: "branco" });
  const rec = I.recibosDe(e.combatants, 500); ms[0].sincEm = 900; ms[0].pv = 4;
  const nos = [{ id: "n1", dados: { monstros: ms.slice(0, 2) } }, { id: "n2", dados: { monstros: [] } }];
  const r = I.pendentes(nos, rec);
  assert.ok(!r.alteracoes.some((a) => a.uid === ms[0].uid), "edição mais nova vence"); assert.ok(r.alteracoes.some((a) => a.uid === ms[1].uid));
  assert.ok(r.aplicados.includes(ms[2].uid), "recibo de instância removida é descartado");
  const mov = [{ id: "n1", dados: { monstros: [ms[0]] } }, { id: "n2", dados: { monstros: [ms[1]] } }];
  assert.ok(I.pendentes(mov, I.recibosDe(e.combatants, 5000)).alteracoes.some((a) => a.uid === ms[1].uid && a.no === "n2"), "acha a instância na sala nova");
});

test("integração: Iniciativa grava recibos, páginas carregam o módulo e a interface usa o mesmo estado", () => {
  const ini = ler("js/iniciativa.js"), ui = ler("js/encontros-ui.js");
  assert.match(ini, /ENCONTROS_INI\.registrar\(localStorage, contexto, combatants\)/);
  assert.match(ler("iniciativa.html"), /js\/encontros-ini\.js[\s\S]*js\/iniciativa\.js/);
  assert.ok(ler("campanha.html").indexOf("encontros-ini.js") < ler("campanha.html").indexOf("encontros-ui.js"));
  assert.ok(ler("sw.js").includes('"js/encontros-ini.js"'));
  assert.match(ui, /janelaEnviarIniciativa/); assert.match(ui, /puxarDaIniciativa/); assert.match(ui, /religarNo/);
});

test("cartões compactos: grade, barra de vida do app, menu, PV rápido e edição em janela (sem formulário inline)", () => {
  const ui = ler("js/encontros-ui.js"), css = ler("css/encontros.css");
  assert.match(ui, /hp-track/); assert.match(ui, /data-enc-pv/); assert.match(ui, /janelaEditarMonstro/); assert.ok(!/class="enc-form enc-mon-form"/.test(ui), "sem formulário dentro do cartão");
  assert.match(css, /\.enc-mons\{grid-template-columns:repeat\(auto-fill/);
  assert.match(ui, /window\.scrollTo\(0, y\)/, "preserva a rolagem");
});

/* ---------- loot individual ---------- */
function lootCtx() { const W = carregar(); return { M: W.ENCONTROS_MONSTROS, I: W.ENCONTROS_INI }; }
test("loot: cada instância tem o seu; itens do catálogo somam quantidade, personalizados e moedas", () => {
  const { M } = lootCtx(), ms = M.adicionar([], M.resumo(goblin), 2).novos;
  let r = M.adicionarItemLoot(M.lootVazio(), { catId: "srd51:item/club", nome: "Clava", qtd: 2 }); r = M.adicionarItemLoot(r.loot, { catId: "srd51:item/club", nome: "Clava", qtd: 1 });
  assert.equal(r.loot.itens.length, 1); assert.equal(r.loot.itens[0].qtd, 3); assert.equal(r.loot.itens[0].custom, false);
  const c = M.adicionarItemLoot(r.loot, { nome: "Dente de goblin", qtd: 4 }); assert.equal(c.loot.itens[1].custom, true); assert.equal(c.loot.itens[1].catId, null);
  assert.ok(M.adicionarItemLoot(M.lootVazio(), { nome: " " }).erro);
  const a = M.editar(ms[0], { loot: { ...c.loot, moedas: { pc: 5, pp: 0, po: 12 } } }).monstro;
  assert.equal(M.lootDe(ms[1]).itens.length, 0, "o outro exemplar não muda"); assert.equal(M.lootDe(a).moedas.po, 12); assert.equal(M.lootDe(a).moedas.pp, 0);
});
test("loot: descoberto, coletado e distribuído parciais preservam o restante", () => {
  const { M } = lootCtx(); let l = M.adicionarItemLoot(M.lootVazio(), { catId: "x", nome: "Poção", qtd: 5 }).loot; const id = l.itens[0].lid;
  l = M.registrarItem(l, id, { coletado: 4 }); assert.equal(l.itens[0].descoberto, true);
  l = M.registrarItem(l, id, { distribuido: 3 }); assert.equal(M.restante(l.itens[0]), 2);
  l = M.registrarItem(l, id, { distribuido: 99 }); assert.equal(l.itens[0].distribuido, 4, "não passa do coletado");
  l = M.registrarItem(l, id, { coletado: 1 }); assert.equal(l.itens[0].distribuido, 1, "reduzir a coleta limita a distribuição");
  l = M.registrarItem(l, id, { qtd: 2 }); assert.ok(l.itens[0].coletado <= 2);
  let m = M.registrarMoedas(M.lootVazio(), { moedas: { po: 10 } }); m = M.registrarMoedas(m, { moedasColetadas: { po: 8 } }); m = M.registrarMoedas(m, { moedasDistribuidas: { po: 20 } });
  assert.equal(m.moedasDistribuidas.po, 8); assert.equal(m.moedas.po - m.moedasDistribuidas.po, 2);
});
test("loot inicial para vários: cópias independentes, sem vínculo", () => {
  const { M } = lootCtx(), ms = M.adicionar([], M.resumo(goblin), 3).novos, base = M.adicionarItemLoot(M.registrarMoedas(M.lootVazio(), { moedas: { pc: 7 } }), { catId: "c", nome: "Adaga", qtd: 1 }).loot;
  let l = M.aplicarLootEmVarios(ms, [ms[0].uid, ms[1].uid], base);
  assert.equal(M.lootDe(l[0]).itens[0].nome, "Adaga"); assert.equal(M.lootDe(l[2]).itens.length, 0);
  assert.notEqual(M.lootDe(l[0]).itens[0].lid, M.lootDe(l[1]).itens[0].lid);
  const col = M.registrarItem(M.lootDe(l[0]), M.lootDe(l[0]).itens[0].lid, { coletado: 1 }); l = l.map((m, i) => (i === 0 ? { ...m, loot: col } : m));
  assert.equal(M.lootDe(l[1]).itens[0].coletado, 0, "coletar em um não afeta o outro");
  const s = M.aplicarLootEmVarios(l, [ms[0].uid], base, "somar"); assert.equal(M.lootDe(s[0]).itens[0].qtd, 2); assert.equal(M.lootDe(s[0]).moedas.pc, 14);
  const sub = M.aplicarLootEmVarios(l, [ms[0].uid], base, "substituir"); assert.equal(M.lootDe(sub[0]).itens[0].coletado, 0);
});
test("loot é preservado ao editar PV/condições, mover entre salas, enviar à Iniciativa e aplicar recibos", () => {
  const { M, I } = lootCtx(), ms = M.adicionar([], M.resumo(goblin), 2).novos;
  const loot = M.adicionarItemLoot(M.lootVazio(), { nome: "Anel", qtd: 1 }).loot; ms[0].loot = loot;
  const ed = M.editar(ms[0], { pv: 1, condicoes: ["Caído"], nome: "Grix" }).monstro; assert.equal(M.lootDe(ed).itens[0].nome, "Anel");
  const mv = M.mover([ed, ms[1]], [], [ed.uid]); assert.equal(M.lootDe(mv.destino[0]).itens[0].nome, "Anel");
  const e = I.lerEstado(armazenamento(), "c1"); I.enviar(e, [{ no: "n", enc: "e", m: ed }], { modo: "branco" });
  const c = I.combatenteDe(e, ed.uid); c.hp = 0; assert.ok(!("loot" in c), "a Iniciativa não recebe o loot");
  const volta = I.lerDoCombatente(c, ed); assert.equal(M.lootDe(volta).itens[0].nome, "Anel"); assert.equal(volta.pv, 0);
  assert.equal(M.lootDe(I.aplicarRecibo(ed, { pv: 0, pvMax: 7, ca: 15, efeitos: [], morto: true })).itens.length, 1);
  assert.equal(M.lootDe({}).itens.length, 0, "instâncias antigas sem loot funcionam");
});
test("loot: normalização rejeita dados inválidos e limita tamanhos", () => {
  const { M } = lootCtx(), l = M.normalizarLoot({ moedas: { pc: -5, po: "x", pp: 3.7 }, itens: [{ nome: "" }, { nome: "Item", qtd: 99999, coletado: 5000, distribuido: 9000 }] });
  assert.equal(l.moedas.pc, 0); assert.equal(l.moedas.po, 0); assert.equal(l.moedas.pp, 4); assert.equal(l.itens.length, 1);
  assert.ok(l.itens[0].qtd <= 9999 && l.itens[0].coletado <= l.itens[0].qtd && l.itens[0].distribuido <= l.itens[0].coletado);
});
test("interface de loot e ajustes visuais (árvore 240 px, breadcrumb em flex)", () => {
  const ui = ler("js/encontros-ui.js"), css = ler("css/encontros.css");
  assert.match(ui, /editorLoot/); assert.match(ui, /janelaLootInicial/); assert.match(ui, /Loot desta criatura/);
  assert.match(css, /grid-template-columns:240px minmax\(0,1fr\)/); assert.match(css, /\.enc-migalhas ol\{[^}]*display:flex[^}]*align-items:center/);
  assert.match(ui, /class="enc-mig-atual" aria-current="page"/);
});

test("regressão: o selo de loot aparece mesmo sem condições, situação ou iniciativa", () => {
  const ui = ler("js/encontros-ui.js");
  for (const trecho of ["const selo = lootSelo(m)", "naIni || rotuloSit || selo ||", "${selo}", 'pendente ? " prep" : " ok"']) assert.ok(ui.includes(trecho), trecho);
});
