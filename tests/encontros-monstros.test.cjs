const test = require("node:test"), assert = require("node:assert/strict");
const { ler, armazenamento, vm } = require("./helpers.cjs");

function carregar() {
  const ctx = vm.createContext({ window: {}, localStorage: armazenamento(), console });
  vm.runInContext(ler("js/encontros-dados.js"), ctx); vm.runInContext(ler("js/encontros-monstros.js"), ctx);
  return ctx.window;
}
const j = (x) => JSON.parse(JSON.stringify(x)), deq = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));
const goblin = { key: "srd_goblin", name: "Goblin", armor_class: 15, hit_points: 7, challenge_rating: 0.25, type: { name: "Humanoid" }, size: { name: "Small" } };

test("adicionar: três goblins independentes, numerados, sem mexer no registro do bestiário", () => {
  const { ENCONTROS_MONSTROS: M } = carregar(), original = j(goblin), reg = M.resumo(goblin, "Goblin");
  const p = M.adicionar([], reg, 3);
  deq(p.novos.map((m) => m.nome), ["Goblin 1", "Goblin 2", "Goblin 3"]);
  assert.equal(new Set(p.novos.map((m) => m.uid)).size, 3);
  p.novos[1].pv = 2; p.novos[1].condicoes.push("Caído");
  assert.equal(p.novos[0].pv, 7); assert.equal(p.novos[2].pv, 7); deq(p.novos[0].condicoes, []);
  deq(j(goblin), original);
  assert.ok(p.novos.every((m) => m.origem === "srd_goblin" && m.ca === 15 && m.pvMax === 7));
});

test("numeração: um sem número; ao juntar mais, o original vira 1; renomeados à mão ficam como estão", () => {
  const { ENCONTROS_MONSTROS: M } = carregar(), reg = M.resumo(goblin, "");
  const a = M.adicionar([], reg, 1); assert.equal(a.novos[0].nome, "Goblin");
  const b = M.adicionar(a.novos, reg, 2); deq(b.renomeados.map((r) => r.nome), ["Goblin 1"]); deq(b.novos.map((m) => m.nome), ["Goblin 2", "Goblin 3"]);
  const feito = [{ ...a.novos[0], nome: "Chefe Grix" }]; const c = M.adicionar(feito, reg, 1);
  assert.equal(c.renomeados.length, 0); assert.equal(c.novos[0].nome, "Goblin 1");
});

test("edição rápida valida nome, PV, CA e limita PV ao máximo", () => {
  const { ENCONTROS_MONSTROS: M } = carregar(), m = M.adicionar([], M.resumo(goblin), 1).novos[0];
  assert.equal(M.editar(m, { nome: "  " }).erro !== undefined, true);
  const r = M.editar(m, { nome: " Grix ", pv: "3", ca: "17", condicoes: ["Caído", "Inexistente"] }).monstro;
  assert.equal(r.nome, "Grix"); assert.equal(r.pv, 3); assert.equal(r.ca, 17); deq(r.condicoes, ["Caído"]); assert.equal(m.pv, 7);
  assert.equal(M.editar(m, { pv: 999 }).monstro.pv, 7);
  assert.equal(M.editar(m, { pvMax: 4 }).monstro.pv, 4);
});

test("mover preserva o estado (uid, PV, condições, nome) e não duplica", () => {
  const { ENCONTROS_MONSTROS: M } = carregar(), l = M.adicionar([], M.resumo(goblin), 3).novos;
  l[1].pv = 2; l[1].condicoes = ["Caído"]; l[1].nome = "Grix";
  const r = M.mover(l, [], [l[1].uid]);
  assert.equal(r.origem.length, 2); assert.equal(r.destino.length, 1);
  deq(j(r.destino[0]), j(l[1]));
  assert.ok(M.mover(l, r.destino, [l[1].uid]).erro, "já está no destino");
  assert.ok(M.mover(l, [], []).erro);
});

test("busca no bestiário por nome em inglês ou português, sem acentos", () => {
  const { ENCONTROS_MONSTROS: M } = carregar(), cat = [M.resumo(goblin, "Goblin"), M.resumo({ key: "k2", name: "Giant Spider", armor_class: 14, hit_points: 26 }, "Aranha Gigante")];
  deq(M.buscar(cat, "gob").map((x) => x.key), ["srd_goblin"]);
  deq(M.buscar(cat, "ARANHA").map((x) => x.key), ["k2"]);
  deq(M.buscar(cat, "spider").map((x) => x.key), ["k2"]);
  deq(M.buscar(cat, ""), []);
});

test("tipos de encontro: novo aleatório ou com salas; antigos sem campo seguem como 'salas'", () => {
  const D = carregar().ENCONTROS_DADOS, nos = [];
  const a = D.novoNo(nos, { tipo: "encontro", nome: "Emboscada", campanhaId: "c", modo: "aleatorio" }).no; nos.push(a);
  const b = D.novoNo(nos, { tipo: "encontro", nome: "Igreja", campanhaId: "c", modo: "salas" }).no; nos.push(b);
  const c = D.novoNo(nos, { tipo: "encontro", nome: "Padrão", campanhaId: "c" }).no;
  assert.equal(D.modoDe(a), "aleatorio"); assert.equal(D.modoDe(b), "salas"); assert.equal(c.dados.modo, "salas");
  assert.equal(D.modoDe({ dados: { estado: "rascunho" } }), "salas", "encontro antigo");
  assert.ok(D.novoNo(nos, { tipo: "sala", nome: "S", paiId: a.id, campanhaId: "c" }).erro, "sem salas em aleatório");
  assert.ok(D.novoNo(nos, { tipo: "sala", nome: "S", paiId: b.id, campanhaId: "c" }).no);
});

test("converter para aleatório traz monstros e descrições das salas, sem perder nada", () => {
  const { ENCONTROS_DADOS: D, ENCONTROS_MONSTROS: M } = carregar(), nos = [];
  const e = D.novoNo(nos, { tipo: "encontro", nome: "Igreja", campanhaId: "c", modo: "salas" }).no; nos.push(e);
  e.dados.descricao = "Geral"; e.dados.monstros = M.adicionar([], M.resumo(goblin), 1).novos;
  const s1 = D.novoNo(nos, { tipo: "sala", nome: "Nave", paiId: e.id, campanhaId: "c" }).no; nos.push(s1);
  const s2 = D.novoNo(nos, { tipo: "sala", nome: "Cripta", paiId: e.id, campanhaId: "c" }).no; nos.push(s2);
  s1.dados.descricao = "Bancos quebrados"; s1.dados.monstros = M.adicionar([], M.resumo(goblin), 2).novos; s1.dados.monstros[0].pv = 1;
  const p = D.planoParaAleatorio(nos, e.id);
  assert.equal(p.dados.modo, "aleatorio"); assert.equal(p.dados.monstros.length, 3);
  assert.ok(p.dados.monstros.some((m) => m.pv === 1), "estado preservado");
  assert.match(p.dados.descricao, /Geral[\s\S]*\*\*Nave\*\*\nBancos quebrados/); deq(p.salas.sort(), [s1.id, s2.id].sort());
  assert.equal(p.resumo.salas, 2); assert.equal(p.resumo.monstros, 2);
  assert.equal(e.dados.modo, "salas", "o plano não altera o original");
  assert.equal(s1.dados.monstros.length, 2);
});

test("repositório: envia itens locais para a conta, pais antes dos filhos", async () => {
  const { ENCONTROS_DADOS: D } = carregar(), st = armazenamento(), enviados = [];
  st.setItem("compendio:encontros:c1", JSON.stringify([{ id: "f", pai_id: "p", tipo: "sala", nome: "S", dados: {} }, { id: "p", pai_id: null, tipo: "encontro", nome: "E", dados: {} }]));
  const nuvem = { get: async () => [], post: async (c, o) => { enviados.push(o.id); return [o]; }, patch: async () => [{}], apagar: async () => [] };
  const r = D.criarRepositorio("c1", nuvem, st); await r.listar();
  assert.equal(r.locais().length, 2); assert.equal(await r.enviarLocais(), 2);
  deq(enviados, ["p", "f"]); assert.equal(st.getItem("compendio:encontros:c1"), null);
});

test("interface: monstros e tipos de encontro integrados e registrados", () => {
  const ui = ler("js/encontros-ui.js"), html = ler("campanha.html"), sw = ler("sw.js");
  assert.ok(html.indexOf("encontros-monstros.js") > html.indexOf("encontros-dados.js") && html.indexOf("encontros-monstros.js") < html.indexOf("encontros-ui.js"));
  assert.ok(sw.includes('"js/encontros-monstros.js"'));
  assert.match(ui, /secaoMonstros\(s, n\)/); assert.match(ui, /Remover “/ === undefined ? /x/ : /mon-remover/);
  assert.match(ui, /blocoSalas/); assert.match(ui, /data-enc-rapido="modo"/);
  assert.ok(!/IDBObjectStore|\.put\(|objectStore\([^)]*\)\.(put|delete)/.test(ler("js/encontros-monstros.js")), "só lê o bestiário");
});
