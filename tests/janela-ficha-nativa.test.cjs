const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const ler = (p) => fs.readFileSync(p, "utf8");
function carregar() {
  const w = { nuvem: { get: async () => [] }, matchMedia: () => ({ matches: true }) }, c = vm.createContext({ window: w, innerWidth: 1500, matchMedia: w.matchMedia, console });
  for (const f of ["js/origens.js", "js/regras.js", "js/ficha-componentes.js", "js/janela-ficha.js"]) vm.runInContext(ler(f), c);
  return c.window;
}
const P = { id: "p1", nome: "Caleb <b>Hawke</b>", pv_atual: 9, pv_max: 10, pv_temp: 3, ca: 15, inventario: [{ nome: "Corda", qtd: 2 }], ficha: { raca: "Humano", background: "Soldado", classes: [{ c: "Fighter", n: 3, sub: "Campeão" }], atributos: { for: 16, des: 14, con: 14, int: 10, sab: 12, car: 8 }, magias: [{ n: "Luz", en: "Light", l: 0 }], ataques: [{ nome: "Espada longa", dado: "1d8", tipo: "cortante", atr: "for", prof: true, magico: 0, extra: 0 }] } };
test("janela de dados do personagem: conteúdo nativo (sem iframe, sem menus) com PV, atributos, ataques, magias e inventário", () => {
  const w = carregar(), h = w.FICHA_JANELA.html(P);
  assert.ok(!/<iframe|appheader|<nav/.test(h), "só os dados, nada de página nem menus");
  for (const t of ["Pontos de vida", "Atributos", "Ataques", "Magias", "Inventário"]) assert.ok(h.includes(t), t);
  assert.match(h, /9 <small>\/ 10 PV/); assert.match(h, /PV temporários: <b>3<\/b>/); assert.match(h, /\+5 · 1d8\+3 cortante/); assert.match(h, /Ficha completa \(editar\)<\/a>/); assert.match(h, /target="_top"/);
  assert.ok(!h.includes("<b>Hawke</b>"), "nome é escapado");
});
test("a janela nativa só abre em computador com mouse (>= 900 px); o resto usa a ficha em quadro como antes", () => {
  assert.equal(carregar().FICHA_JANELA.disponivel(), true);
  const w = carregar(); const c = vm.createContext({ window: { nuvem: {}, REGRAS: w.REGRAS, FICHA_COMPONENTES: w.FICHA_COMPONENTES, matchMedia: () => ({ matches: false }) }, innerWidth: 1500, matchMedia: () => ({ matches: false }) });
  vm.runInContext(ler("js/janela-ficha.js"), c); assert.equal(c.window.FICHA_JANELA.disponivel(), false, "sem mouse");
  const l = ler("js/leitor-fichas.js"); assert.match(l, /modoAbertura==='painel'&&window\.FICHA_JANELA&&window\.FICHA_JANELA\.disponivel\(\)/);
});
