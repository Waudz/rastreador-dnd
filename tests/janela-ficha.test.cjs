const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const ler = (p) => fs.readFileSync(p, "utf8");
function ambiente({ largura, fino, resumoOculto }) {
  const props = {}, corpo = { dataset: {}, classList: { toggle() {} } }, botao = { textContent: "Voltar", setAttribute() {} };
  const els = { "#dock-r": { hidden: true, children: [{ hidden: !!resumoOculto }] }, "#ci-resumo": { hidden: !!resumoOculto }, "#ci-resumo-fechar": botao };
  const doc = { querySelector: (s) => els[s] || null, body: corpo, documentElement: { style: { setProperty: (k, v) => { props[k] = v; } } } };
  const c = vm.createContext({ innerWidth: largura, document: doc, matchMedia: (q) => ({ matches: /pointer:fine/.test(q) ? !!fino : false }), Event: function () {} });
  c.window = { addEventListener() {}, dispatchEvent() {}, matchMedia: c.matchMedia, innerWidth: largura }; c.window.document = doc;
  vm.runInContext(ler("js/paineis-layout.js"), c); c.window.PAINEIS_LAYOUT.aplicar();
  return { corpo, botao, props };
}
test("ficha do personagem vira janela só em tela larga (>= 1200 px) com mouse", () => {
  const a = ambiente({ largura: 1500, fino: true }); assert.equal(a.corpo.dataset.fichaJanela, "1"); assert.equal(a.botao.textContent, "Fechar ×"); assert.equal(a.props["--painel-reserva-direita"], "0px", "a janela não reserva espaço lateral");
});
test("celular, toque e telas estreitas ficam como antes (painel empilhado, botão Voltar)", () => {
  for (const [largura, fino] of [[375, false], [820, true], [1100, true], [1500, false]]) { const a = ambiente({ largura, fino }); assert.equal(a.corpo.dataset.fichaJanela, "", largura + " " + fino); assert.equal(a.botao.textContent, "Voltar"); }
});
test("sem ficha aberta não há janela", () => { assert.equal(ambiente({ largura: 1500, fino: true, resumoOculto: true }).corpo.dataset.fichaJanela, ""); });
test("CSS da janela fica restrito a tela larga com mouse e fecha por fundo e Esc", () => {
  const css = ler("css/fichas.css"), bloco = css.slice(css.indexOf("Ficha do personagem em JANELA")); assert.match(bloco, /@media\(min-width:1200px\) and \(pointer:fine\)\{/); assert.match(bloco, /body\[data-ficha-janela="1"\] #dock-r\{position:fixed;inset:0/);
  const l = ler("js/leitor-fichas.js"); assert.match(l, /e\.target\.id==='dock-r'/); assert.match(l, /e\.key==='Escape'&&document\.body\.dataset\.fichaJanela==='1'/);
});
