const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const ler = (p) => fs.readFileSync(p, "utf8");
function ambiente({ largura, fino, resumoOculto }) {
  const props = {}, corpo = { dataset: {}, classList: { toggle() {} } };
  const els = { "#dock-r": { hidden: true, children: [{ hidden: !!resumoOculto }] }, "#ci-resumo": { hidden: !!resumoOculto } };
  const doc = { querySelector: (s) => els[s] || null, body: corpo, documentElement: { style: { setProperty: (k, v) => { props[k] = v; } } } };
  const c = vm.createContext({ innerWidth: largura, document: doc, matchMedia: (q) => ({ matches: /pointer:fine/.test(q) ? !!fino : false }), Event: function () {} });
  c.window = { addEventListener() {}, dispatchEvent() {}, matchMedia: c.matchMedia, innerWidth: largura }; c.window.document = doc;
  vm.runInContext(ler("js/paineis-layout.js"), c); c.window.PAINEIS_LAYOUT.aplicar();
  return { corpo, props };
}
test("ficha do personagem larga ao lado da página: 840 px em tela grande (>= 1600 px) com mouse, reservando o espaço lateral", () => {
  for (const largura of [1600, 1920]) { const a = ambiente({ largura, fino: true }); assert.equal(a.corpo.dataset.fichaLarga, "1", String(largura)); assert.equal(a.props["--ficha-painel"], "840px"); assert.equal(a.props["--painel-reserva-direita"], "840px", "a página cede o lugar, a ficha não a cobre"); }
});
test("celular, toque e telas menores ficam como antes (440 px ao lado ou empilhado)", () => {
  for (const [largura, fino, painel] of [[375, false, "375px"], [820, true, "440px"], [1300, true, "440px"], [1599, true, "440px"], [1500, true, "440px"], [1920, false, "440px"]]) { const a = ambiente({ largura, fino }); assert.equal(a.corpo.dataset.fichaLarga, "", largura + " " + fino); assert.equal(a.props["--ficha-painel"], painel, largura + " " + fino); }
});
test("sem ficha aberta o painel não fica largo", () => { assert.equal(ambiente({ largura: 1920, fino: true, resumoOculto: true }).corpo.dataset.fichaLarga, ""); });
