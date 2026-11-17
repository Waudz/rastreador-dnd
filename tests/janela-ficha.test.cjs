const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const ler = (p) => fs.readFileSync(p, "utf8");
function ambiente({ largura, fino, resumoOculto }) {
  const props = {}, corpo = { dataset: {}, classList: { toggle(c, v) { corpo.classes = corpo.classes || {}; corpo.classes[c] = !!v; } } };
  const els = { "#dock-r": { hidden: true, children: [{ hidden: !!resumoOculto }] } };
  const doc = { querySelector: (s) => els[s] || null, body: corpo, documentElement: { style: { setProperty: (k, v) => { props[k] = v; } } } };
  const c = vm.createContext({ innerWidth: largura, document: doc, matchMedia: (q) => ({ matches: /pointer:fine/.test(q) ? !!fino : false }), Event: function () {} });
  c.window = { addEventListener() {}, dispatchEvent() {}, matchMedia: c.matchMedia, innerWidth: largura }; c.window.document = doc;
  vm.runInContext(ler("js/paineis-layout.js"), c); c.window.PAINEIS_LAYOUT.aplicar();
  return { corpo, props };
}
test("computador com mouse (>= 900 px, inclusive meia tela): a ficha vira janela flutuante de até 840 px", () => {
  for (const [largura, esperado] of [[900, "840px"], [960, "840px"], [1200, "840px"], [1500, "840px"], [1920, "840px"]]) { const a = ambiente({ largura, fino: true }); assert.equal(a.corpo.dataset.fichaJanela, "1", String(largura)); assert.equal(a.props["--ficha-painel"], esperado, String(largura)); assert.equal(a.corpo.dataset.painel, "janela"); }
});
test("a página só cede o espaço da janela em tela grande (>= 1600 px); abaixo disso a janela flutua por cima", () => {
  assert.equal(ambiente({ largura: 1920, fino: true }).props["--painel-reserva-direita"], "872px");
  assert.equal(ambiente({ largura: 1600, fino: true }).props["--painel-reserva-direita"], "872px");
  for (const l of [960, 1200, 1599]) assert.equal(ambiente({ largura: l, fino: true }).props["--painel-reserva-direita"], "0px", String(l));
});
test("celular, toque e telas pequenas ficam como antes (440 px ao lado a partir de 1200 px, empilhado abaixo)", () => {
  for (const [largura, fino, painel, reserva] of [[375, false, "375px", "0px"], [820, true, "440px", "0px"], [899, true, "440px", "0px"], [1300, false, "440px", "440px"], [1920, false, "440px", "440px"]]) {
    const a = ambiente({ largura, fino }); assert.equal(a.corpo.dataset.fichaJanela, "", largura + " " + fino); assert.equal(a.props["--ficha-painel"], painel, largura + " " + fino); assert.equal(a.props["--painel-reserva-direita"], reserva, largura + " " + fino);
  }
});
test("sem ficha aberta não há janela nem espaço reservado", () => { const a = ambiente({ largura: 1920, fino: true, resumoOculto: true }); assert.equal(a.corpo.dataset.fichaJanela, ""); assert.equal(a.props["--painel-reserva-direita"], "0px"); });
test("CSS da janela fica restrito a computador com mouse e a cartão da iniciativa cabe ao lado da janela", () => {
  const css = ler("css/fichas.css"), bloco = css.slice(css.indexOf("JANELA da ficha/consulta")); assert.match(bloco, /@media\(min-width:900px\) and \(pointer:fine\)\{/); assert.match(bloco, /body\[data-ficha-janela="1"\] #dock-r\{position:fixed;top:calc\(var\(--cab-h,64px\) \+ 12px\);right:16px;bottom:16px/); assert.match(bloco, /border-radius:14px/);
  assert.match(ler("css/fluxos.css"), /\.combatant:not\(\.editing\) \{ grid-template-columns:48px minmax\(140px,1fr\) 56px minmax\(260px,2fr\) max-content; \}/, "colunas do cartão encolhem para caber quando a janela ocupa o lado");
});
