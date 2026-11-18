const test = require("node:test"), assert = require("node:assert/strict");
const { ler, armazenamento, vm } = require("./helpers.cjs");

function carregar() {
  const ctx = vm.createContext({ window: {}, localStorage: armazenamento(), console });
  vm.runInContext(ler("js/encontros-dados.js"), ctx, { filename: "encontros-dados.js" });
  return ctx;
}
const igual = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));
function cenario() {
  const D = carregar().window.ENCONTROS_DADOS, nos = [], C = "camp1";
  const add = (tipo, nome, pai) => { const r = D.novoNo(nos, { tipo, nome, paiId: pai || null, campanhaId: C }); assert.ok(r.no, r.erro); nos.push(r.no); return r.no; };
  return { D, nos, add, C };
}

test("hierarquia: pasta > subpasta > encontro > sala, sem limite de profundidade", () => {
  const { D, nos, add } = cenario();
  let pai = null; for (let i = 0; i < 12; i++) pai = add("pasta", "P" + i, pai && pai.id);
  const e = add("encontro", "Emboscada", pai.id), s = add("sala", "Portão", e.id);
  igual(D.caminho(nos, s.id).length, 14);
  assert.ok(D.novoNo(nos, { tipo: "encontro", nome: "Raiz", campanhaId: "c" }).no, "encontro na raiz");
});

test("regras de criação: sala só dentro de encontro; pasta/encontro só em pasta ou raiz; nome obrigatório", () => {
  const { D, nos, add } = cenario();
  const p = add("pasta", "Capítulo 1"), e = add("encontro", "E", p.id);
  assert.ok(D.novoNo(nos, { tipo: "sala", nome: "X", campanhaId: "c" }).erro);
  assert.ok(D.novoNo(nos, { tipo: "sala", nome: "X", paiId: p.id, campanhaId: "c" }).erro);
  assert.ok(D.novoNo(nos, { tipo: "pasta", nome: "X", paiId: e.id, campanhaId: "c" }).erro);
  assert.ok(D.novoNo(nos, { tipo: "encontro", nome: "   ", campanhaId: "c" }).erro);
  assert.ok(D.novoNo(nos, { tipo: "encontro", nome: "a".repeat(121), campanhaId: "c" }).erro);
});

test("mover: bloqueia para dentro de si mesmo ou de descendente; salas não se movem", () => {
  const { D, nos, add } = cenario();
  const a = add("pasta", "A"), b = add("pasta", "B", a.id), c = add("pasta", "C", b.id), e = add("encontro", "E", c.id), s = add("sala", "S", e.id);
  assert.equal(D.podeMover(nos, a.id, a.id).ok, false);
  assert.equal(D.podeMover(nos, a.id, c.id).ok, false);
  assert.equal(D.podeMover(nos, c.id, a.id).ok, true);
  assert.equal(D.podeMover(nos, e.id, null).ok, true);
  assert.equal(D.podeMover(nos, s.id, a.id).ok, false);
  assert.ok(!D.destinos(nos, a.id).some((d) => d.id === c.id || d.id === a.id));
  assert.equal(D.destinos(nos, e.id)[0].id, null);
});

test("ordenação manual troca com o irmão e respeita as pontas", () => {
  const { D, nos, add } = cenario();
  const x = add("pasta", "X"), y = add("pasta", "Y"), z = add("pasta", "Z");
  assert.equal(D.reordenar(nos, x.id, -1), null);
  assert.equal(D.reordenar(nos, z.id, 1), null);
  for (const u of D.reordenar(nos, y.id, -1)) D.porId(nos, u.id).ordem = u.ordem;
  igual(D.filhos(nos, null).map((n) => n.nome), ["Y", "X", "Z"]);
});

test("várias salas por nomes: uma por linha, sem vazios nem repetidos", () => {
  const { D } = cenario();
  igual(D.nomesEmLote("Portão\n\n  Nave  \nportão; Sacristia, Cripta"), ["Portão", "Nave", "Sacristia", "Cripta"]);
});

test("duplicar cria cópia independente em rascunho, com salas novas", () => {
  const { D, nos, add } = cenario();
  const p = add("pasta", "P"), e = add("encontro", "E", p.id), s = add("sala", "Sala 1", e.id);
  e.dados.estado = "preparado"; e.dados.concluido = true; s.dados.explorada = true; e.dados.descricao = "texto";
  const r = D.duplicar(nos, e.id);
  assert.equal(r.novos.length, 2);
  const [c, cs] = r.novos;
  assert.notEqual(c.id, e.id); assert.notEqual(cs.id, s.id); assert.equal(cs.pai_id, c.id); assert.equal(c.pai_id, p.id);
  assert.equal(c.dados.estado, "rascunho"); assert.equal(c.dados.concluido, false); assert.equal(cs.dados.explorada, false);
  assert.equal(c.dados.descricao, "texto");
  c.dados.descricao = "mudou"; assert.equal(e.dados.descricao, "texto");
  assert.ok(D.duplicar(nos, p.id).erro);
});

test("lixeira: restaurar devolve o grupo; pai excluído manda para a raiz; sala exige o encontro", () => {
  const { D, nos, add } = cenario();
  const p = add("pasta", "P"), e = add("encontro", "E", p.id), s = add("sala", "S", e.id);
  const quando = "2026-11-18T10:00:00.000Z";
  for (const x of D.idsDoGrupo(nos, p.id)) D.porId(nos, x).excluido_em = quando;
  assert.equal(D.buscar(nos, "E").length, 0, "excluídos não aparecem na busca");
  const r = D.restaurar(nos, e.id);
  assert.equal(r.campos.pai_id, null); igual([...r.ids].sort(), [e.id, s.id].sort());
  assert.ok(D.restaurar(nos, s.id).erro);
  assert.equal(D.contar(nos, p.id).encontros, 0);
});

test("busca por nome ignora acentos e maiúsculas", () => {
  const { D, nos, add } = cenario();
  add("pasta", "Cripta Sombria"); add("encontro", "Emboscada dos Goblins"); add("pasta", "Outra");
  igual(D.buscar(nos, "EMBOSCADA").map((n) => n.nome), ["Emboscada dos Goblins"]);
  igual(D.buscar(nos, "sombría").map((n) => n.nome), ["Cripta Sombria"]);
});

test("formatação simples escapa HTML e aceita negrito e cores", () => {
  const { D } = cenario();
  const h = D.formatar('<script>x</script> **forte** [vermelho]perigo[/vermelho]\nlinha');
  assert.ok(!h.includes("<script>")); assert.ok(h.includes("<b>forte</b>")); assert.ok(h.includes("color:#e07a7a")); assert.ok(h.includes("<br>"));
  assert.ok(!D.formatar('[vermelho"onmouseover=x]a[/vermelho"]').includes("onmouseover=x]a<"));
});

test("repositório: usa o banco; se a tabela não existe cai para o aparelho e funciona", async () => {
  const { D } = cenario(), ctx = carregar(), DD = ctx.window.ENCONTROS_DADOS;
  const chamadas = [];
  const nuvemOk = { get: async (c) => { chamadas.push(c); return [{ id: "1" }]; }, post: async (c, o) => o, patch: async (c, o) => [{ id: "1", ...o }], apagar: async () => [] };
  const r1 = DD.criarRepositorio("c1", nuvemOk, armazenamento());
  igual(await r1.listar(), [{ id: "1" }]); assert.equal(r1.modo, "nuvem");
  assert.match(chamadas[0], /^encontros_nos\?campanha_id=eq\.c1/);
  const falta = async () => { throw new Error('relation "encontros_nos" does not exist (42P01)'); };
  const st = armazenamento(), r2 = DD.criarRepositorio("c2", { get: falta, post: falta, patch: falta, apagar: falta }, st);
  igual(await r2.listar(), []); assert.equal(r2.modo, "local");
  await r2.inserir([{ id: "a", ordem: 0 }]);
  await r2.atualizar("a", { nome: "N" });
  assert.equal((await r2.listar())[0].nome, "N");
  await r2.apagar(["a"]); igual(await r2.listar(), []);
  const r3 = DD.criarRepositorio("c3", { get: async () => { throw new Error("401 sem permissão"); } }, armazenamento());
  await assert.rejects(r3.listar(), /401/); assert.equal(r3.modo, "nuvem", "erro real não vira modo local");
});

test("migração: tabela com RLS só do mestre, sem acesso anônimo nem política para jogadores", () => {
  const sql = ler("supabase/migrations/20261118120000_encontros.sql");
  assert.match(sql, /PROPOSTA PARA APROVAÇÃO/);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on public\.encontros_nos from anon/i);
  assert.match(sql, /using \(public\.eh_mestre\(campanha_id\)\) with check \(public\.eh_mestre\(campanha_id\)\)/);
  assert.equal((sql.match(/create policy/gi) || []).length, 1);
  assert.ok(!/eh_membro/.test(sql));
  assert.ok(!/drop table(?! if exists public\.encontros_nos;)/i.test(sql.replace(/^--.*$/gm, "")), "sem drops fora dos comentários de reversão");
});

test("integração: aba só para o mestre, scripts e cache registrados", () => {
  const camp = ler("js/campanha.js"), html = ler("campanha.html"), sw = ler("sw.js");
  assert.match(camp, /if \(mestre\(\) && window\.ENCONTROS_UI\) abas\.splice/);
  assert.match(camp, /ENCONTROS_UI\.montar/);
  assert.match(html, /js\/encontros-dados\.js/); assert.match(html, /js\/encontros-ui\.js/); assert.match(html, /css\/encontros\.css/);
  assert.ok(html.indexOf("encontros-ui.js") < html.indexOf("js/campanha.js"));
  for (const f of ["js/encontros-dados.js", "js/encontros-ui.js", "css/encontros.css"]) assert.ok(sw.includes('"' + f + '"'), f + " no cache offline");
});

test("interface: sem emojis, sem drag-and-drop, e confirma exclusões", () => {
  const ui = ler("js/encontros-ui.js");
  assert.ok(!/draggable|dragstart|ondrop|addEventListener\("drop/.test(ui));
  assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(ui));
  assert.match(ui, /perguntar\(`Mover/); assert.match(ui, /perguntar\(`Excluir “/);
});
