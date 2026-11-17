const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const ler = (p) => fs.readFileSync(p, "utf8");
function ambiente(largura, aberta = true) {
  const props = {}, corpo = { dataset: {}, classList: { toggle() {} } };
  const doc = { querySelector: (s) => (s === "#dock-r" ? { hidden: true, children: [{ hidden: !aberta }] } : null), body: corpo, documentElement: { style: { setProperty: (k, v) => { props[k] = v; } } } };
  const c = vm.createContext({ innerWidth: largura, document: doc, Event: function () {} }); c.window = { addEventListener() {}, dispatchEvent() {}, innerWidth: largura }; c.window.document = doc;
  vm.runInContext(ler("js/paineis-layout.js"), c); c.window.PAINEIS_LAYOUT.aplicar(); return { corpo, props };
}
test("aba lateral ocupa ~36% da largura em tela grande, com respiro para a página (440 a 760 px)", () => {
  for (const [largura, painel] of [[1200, "440px"], [1400, "504px"], [1600, "576px"], [1920, "691px"], [2560, "760px"]]) { const a = ambiente(largura); assert.equal(a.props["--ficha-painel"], painel, String(largura)); assert.equal(a.props["--painel-reserva-direita"], painel, "a página cede o espaço"); assert.equal(a.corpo.dataset.painel, "lateral"); }
});
test("telas menores e celular seguem como antes (empilhado, até 440 px)", () => {
  for (const [largura, painel] of [[375, "375px"], [820, "440px"], [1199, "440px"]]) { const a = ambiente(largura); assert.equal(a.props["--ficha-painel"], painel, String(largura)); assert.equal(a.props["--painel-reserva-direita"], "0px"); assert.equal(a.corpo.dataset.painel, "empilhado"); }
});
test("sem painel aberto não há espaço reservado", () => { assert.equal(ambiente(1920, false).props["--painel-reserva-direita"], "0px"); });
test("links da ficha na aba lateral abrem em nova guia (Editar, Subir de nível, Ficha completa)", () => {
  const p = ler("js/personagem.js"); assert.match(p, /window\.open\(u\.href, "_blank", "noopener"\)/); assert.ok(!/window\.top\.location/.test(p));
});
