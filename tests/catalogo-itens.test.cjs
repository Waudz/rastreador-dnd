const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const ler = (p) => fs.readFileSync(p, "utf8"), dados = JSON.parse(ler("dados/itens-srd2014.json")), itens = dados.itens;
function carregar() {
  const store = {};
  const c = vm.createContext({ window: {}, localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } }, console, URL, fetch: async () => ({ ok: true, json: async () => dados }) });
  for (const f of ["js/inventario.js", "js/regras.js", "js/itens-efeitos.js", "js/catalogo-itens.js"]) vm.runInContext(ler(f), c);
  c.window.CAT_ITENS.indexar(itens);
  return { C: c.window.CAT_ITENS, IV: c.window.INVENTARIO, store };
}
const J = (x) => JSON.parse(JSON.stringify(x));
test("catálogo: 578 itens do SRD 5.1, ids únicos, todos com nome em português e categoria conhecida", () => {
  assert.equal(itens.length, 578); assert.equal(new Set(itens.map((i) => i.id)).size, 578);
  const { C } = carregar(), cats = new Set(C.CATEGORIAS.map((c) => c[0]));
  for (const i of itens) { assert.ok(i.nome && i.id.startsWith("srd51:item/"), i.id); assert.ok(cats.has(i.categoria), i.id + " " + i.categoria); }
  const iguais = itens.filter((i) => i.nome === i.en).map((i) => i.nome);
  assert.ok(iguais.length < 8, "quase tudo traduzido: " + iguais);
  const por = {}; for (const i of itens) por[i.categoria] = (por[i.categoria] || 0) + 1;
  assert.equal(por.arma, 37); assert.equal(por.armadura + por.escudo, 13); assert.equal(por.pacote, 7); assert.equal(por.kit, 7); assert.equal(por.ferramenta, 31); assert.equal(por["montaria-veiculo"], 40);
});
test("nada inventado: o SRD não traz descrição, então o catálogo não tem desc; valores vêm dos dados (arma, armadura, preço, peso em kg)", () => {
  assert.ok(itens.every((i) => i.desc === undefined));
  const por = (id) => itens.find((i) => i.id === "srd51:item/" + id);
  assert.deepEqual(J(por("longsword").arma.dano), { dado: "1d8", tipo: "slashing" }); assert.equal(por("longsword").peso, 1.5); assert.equal(por("longsword").custo.v, 15);
  assert.equal(por("plate-armor").armadura.ca, 18); assert.equal(por("chain-mail").armadura.forMin, 13);
  assert.equal(por("longbow").arma.alcanceM.normal, 45); assert.equal(por("longbow").arma.alcanceM.longo, 180);
  assert.equal(por("potion-of-healing-common").cura, "2d4+2");
});
test("kits são itens únicos; só os pacotes têm componentes, todos apontando para registros do catálogo", () => {
  const ids = new Set(itens.map((i) => i.id));
  for (const i of itens.filter((x) => x.categoria === "kit")) assert.equal(i.pacote, undefined, i.nome + " é item único");
  const packs = itens.filter((i) => i.pacote); assert.equal(packs.length, 7);
  for (const p of packs) { assert.equal(p.categoria, "pacote"); for (const c of p.pacote) { assert.ok(ids.has(c.id), c.id); assert.ok(c.qtd >= 1); } }
  assert.equal(itens.find((i) => i.id === "srd51:item/explorers-pack").pacote.length, 8);
});
test("busca e filtros: acento, categoria, propriedade, raridade e sintonia", () => {
  const { C } = carregar();
  assert.ok(C.filtrar(itens, { q: "bolsa de carga" }).some((i) => i.en === "Bag of Holding")); assert.ok(C.filtrar(itens, { q: "ESPADA" }).length >= 8); assert.ok(C.filtrar(itens, { q: "acolchoada" }).length >= 1);
  assert.deepEqual(C.filtrar(itens, { cat: "arma", prop: "finesse" }).map((i) => i.en).sort(), ["Dagger", "Dart", "Rapier", "Scimitar", "Shortsword", "Whip"]);
  assert.ok(C.filtrar(itens, { cat: "magico", raridade: "legendary", sintonia: "sim" }).every((i) => i.raridade === "legendary" && i.sintonia));
  assert.equal(C.filtrar(itens, { q: "zzzz-nada" }).length, 0);
});
test("ficha de leitura: peso, preço e lacuna de descrição sem inventar texto", () => {
  const { C } = carregar(), it = itens.find((i) => i.id === "srd51:item/longsword"), h = C.fichaHTML(C.viewDoCatalogo(it, null));
  assert.match(h, /Dano<\/dt><dd>1d8 cortante/); assert.match(h, /15 PO/); assert.match(h, /1,5 kg/); assert.match(h, /não traz descrição textual/);
  const pack = C.fichaHTML(C.viewDoCatalogo(itens.find((i) => i.id === "srd51:item/explorers-pack"), null)); assert.match(pack, /Conteúdo do conjunto/); assert.match(pack, /Tocha <b>×10<\/b>/); assert.match(pack, /29,5 kg/);
});
test("adicionar ao inventário: item comum, poção com efeito aprovado, kit único e pacote agrupado sem empilhar", () => {
  const { C, IV } = carregar(), P = { inventario: [], ficha: {} }, k = IV.conteinerDe(P), por = (id) => C.obter("srd51:item/" + id);
  IV.adicionar(k, C.paraInventario(por("longsword"), 2)); IV.adicionar(k, C.paraInventario(por("longsword"), 1));
  assert.equal(P.inventario.length, 1); assert.equal(P.inventario[0].qtd, 3); assert.equal(P.inventario[0].catId, "srd51:item/longsword"); assert.equal(P.inventario[0].tipo, "equipamento");
  assert.equal(Object.keys(P.inventario[0].propriedades).length, 0, "raridade e sintonia não vão para a ficha (o servidor só aceita do mestre)");
  const pocao = C.paraInventario(por("potion-of-healing-common"), 1); assert.equal(pocao.ref, "srd51:item/potion-of-healing"); assert.equal(pocao.propriedades.efeitos[0].dados.n, 2); assert.equal(C.doInventario(pocao).id, "srd51:item/potion-of-healing-common");
  const kit = C.paraInventario(por("climbers-kit"), 1); assert.equal(kit.conjunto, undefined);
  const p1 = C.paraInventario(por("explorers-pack"), 1), p2 = C.paraInventario(por("explorers-pack"), 1); IV.adicionar(k, p1); IV.adicionar(k, p2);
  assert.equal(P.inventario.filter((i) => i.conjunto).length, 2, "dois pacotes ficam separados"); assert.equal(p1.conjunto.length, 8); assert.equal(p1.peso, 29.5); assert.equal(C.pesoDoConjunto(p1.conjunto), 29.5);
});
test("itens personalizados: validação e persistência por conta; só campos narrativos", () => {
  const { C, store } = carregar(), P = C.personalizados;
  assert.equal(P.salvar({ nome: " " }).ok, false); assert.equal(P.salvar({ nome: "x", imagem: "javascript:alert(1)" }).ok, false); assert.equal(P.salvar({ nome: "x", imagem: "http://a.com/b.png" }).ok, false);
  const r = P.salvar({ nome: "Medalhão", categoria: "equipamento", desc: "Prata.", peso: 0.1, custoV: 25, custoU: "gp", imagem: "https://a.com/b.png" }); assert.ok(r.ok);
  const l = P.listar(); assert.equal(l.length, 1); assert.equal(l[0].nome, "Medalhão"); assert.ok(!("efeitos" in l[0]) && !("raridade" in l[0]));
  assert.ok(C.todos().some((i) => i.custom && i.nome === "Medalhão")); assert.equal(P.salvar({ id: r.id, nome: "Medalhão 2" }).ok, true); assert.equal(P.listar().length, 1);
  P.excluir(r.id); assert.equal(P.listar().length, 0); assert.ok(Object.keys(store).some((k) => /itens_custom_v1:publico/.test(k)));
});
test("aba Itens: página, navegação, cache offline e integração com o inventário", () => {
  const h = ler("itens.html"), sw = ler("sw.js"), nav = ler("js/navegacao.js"), p = ler("js/personagem.js");
  for (const f of ["js/catalogo-itens.js", "js/itens.js", "js/visualizador-imagem.js", "css/itens.css"]) assert.ok(h.includes(f), f);
  for (const f of ["itens.html", "js/itens.js", "js/catalogo-itens.js", "css/itens.css", "dados/itens-srd2014.json"]) assert.ok(sw.includes('"' + f + '"'), "sw " + f);
  assert.match(nav, /\['itens\.html','Itens','bag'\]/); assert.match(ler("personagem.html"), /js\/catalogo-itens\.js/);
  for (const k of ["adicionarDoCatalogo", "data-cat-add", "acaoComponente", "data-comp-retirar", "data-comp-consumir"]) assert.ok(p.includes(k), k);
});
