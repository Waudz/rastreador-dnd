const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const ler = (p) => fs.readFileSync(p, "utf8");
function navegador() {
  const store = {}, els = {};
  const doc = { getElementById: (id) => els[id] || null, querySelector: (s) => els[s.replace(/^#/, "")] || null, body: { dataset: {} } };
  for (const id of ["ci-resumo", "sheet", "spd"]) els[id] = { id, hidden: true, scrollTop: 0, querySelectorAll: () => [] };
  const w = { document: doc, sessionStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } }, addEventListener() {}, location: { origin: "http://x" } };
  w.window = w; vm.createContext(w); vm.runInContext(ler("js/painel-detalhes.js"), w); return { w, store };
}
test("o estado do painel lateral fica na guia: salvar, ler, voltar (magia sobre ficha) e limpar", () => {
  const { w } = navegador(), E = w.PAINEL_ESTADO;
  assert.equal(E.ler(), null);
  E.salvar({ t: "ficha", id: "p1", nome: "Caleb", grupo: "", modo: "painel" }); assert.equal(E.ler().id, "p1");
  E.salvar({ t: "magia", dados: "Light" }); assert.equal(E.ler().t, "magia"); assert.equal(E.ler().base.id, "p1", "a magia lembra a ficha de baixo");
  E.voltar(); assert.equal(E.ler().t, "ficha"); E.voltar(); assert.equal(E.ler(), null);
  E.salvar({ t: "monstro", key: "srd_goblin" }); assert.equal(E.ler().key, "srd_goblin");
});
test("fechar o painel apaga o estado; sair da página não", () => {
  const { w } = navegador(); w.PAINEL_ESTADO.salvar({ t: "monstro", key: "k" }); w.PAINEL.mostrar("sheet"); assert.equal(w.PAINEL_ESTADO.ler().key, "k");
  w.PAINEL.fechar(); assert.equal(w.PAINEL_ESTADO.ler(), null, "fechar limpa");
  const l = ler("js/leitor-fichas.js"); assert.match(l, /pagehide',\(\)=>\{const guardado=window\.PAINEL_ESTADO&&window\.PAINEL_ESTADO\.ler\(\);window\.PAINEL\.encerrar\?\.\(\);if\(guardado\)window\.PAINEL_ESTADO\.gravar\(guardado\)/);
  assert.match(ler("js/leitura-mobile.js"), /if\(e&&e\.persisted\)\{const g=window\.PAINEL_ESTADO/);
});
test("cada página restaura o painel: ficha e magia (leitor), monstro (bestiário); itens.html também tem o painel", () => {
  const l = ler("js/leitor-fichas.js"); assert.match(l, /personagem\(ficha\.id,ficha\.nome,ficha\.grupo,ficha\.modo,true\)/); assert.match(l, /if\(e\.t==='magia'\)magia\(e\.dados\)/);
  assert.match(ler("js/app.js"), /e\.t === "monstro" && BY\[e\.key\]\) setTimeout\(\(\) => openSheet\(e\.key\), 0\)/);
  const h = ler("itens.html"); for (const s of ["paineis-layout.js", "painel-detalhes.js", "leitor-fichas.js", "magias-ui.js"]) assert.ok(h.includes("js/" + s), s);
});
test("barra do topo da aba lateral com a mesma altura e cor da barra principal; foto do bestiário amplia a foto", () => {
  const css = ler("css/fichas.css"); assert.match(css, /body\[data-painel="lateral"\] \.sh-top,body\[data-painel="lateral"\] \.ci-resumo-topo\{box-sizing:border-box;height:var\(--cab-h,61px\);min-height:var\(--cab-h,61px\);background:var\(--bg\)/);
  assert.match(ler("js/app.js"), /foto && window\.VISUALIZADOR\) return window\.VISUALIZADOR\.abrir/); assert.match(ler("js/visualizador-imagem.js"), /dnd-categoria-icone/);
});
