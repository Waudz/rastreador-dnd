const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ler = p => fs.readFileSync(p, "utf8");

test("adaga +1/+2/+3 exibe bonus no dano do inventario sem mudar o dado base", () => {
  const window = { CAT_ITENS: { linhas: () => [
    ["Dano", "1d4 perfurante"], ["Propriedades", "Acuidade, Leve"], ["Arremesso", "6 m / 18 m"]
  ] } };
  vm.runInNewContext(ler("js/inventario-resumo.js"), { window });
  const cat = { arma: { dano: { dado: "1d4" } } };
  const texto = window.INV_RESUMO.mecanico;
  assert.match(texto({ nome: "Adaga" }, cat, []), /^1d4 perfurante/);
  assert.match(texto({ nome: "Adaga +1" }, cat, []), /^1d4 perfurante/,
    "o nome por si so nao e uma fonte de bonus");
  for (const bonus of [1, 2, 3]) {
    const item = { nome: "Adaga +" + bonus, propriedades: { encantamento: { bonus } } };
    const dano = window.INV_RESUMO.danoComEncantamento(item, cat, "1d4 perfurante");
    assert.equal(dano, "1d4 + " + bonus + " perfurante");
    assert.match(texto(item, cat, []), new RegExp("^1d4 \\+ " + bonus + " perfurante"));
    assert.equal((texto(item, cat, []).match(/1d4 \+ /g) || []).length, 1, "bonus nao duplicado");
  }
  assert.equal(window.INV_RESUMO.danoComEncantamento(
    { propriedades: { encantamento: { bonus: 1 } } }, { armadura: {} }, "CA 15"
  ), "CA 15", "nao adiciona dano a itens que nao sao armas");
});

test("editor abre como modal com formularios existentes e indice correto", () => {
  const p = ler("js/personagem.js");
  const css = ler("css/fichas.css");
  assert.match(p, /function abrirEditorInv\(i\)/);
  assert.match(p, /window\.COMP_JANELA\.abrir\(\{/);
  assert.match(p, /conteudo\.dataset\.i = String\(i\)/);
  assert.match(p, /editor\.hidden = false/);
  assert.match(p, /data-inv-uid="\$\{esc\(it\.uid\)\}" hidden/);
  assert.match(p, /abrirEditorInv\(\+b\.dataset\.invEditarAbrir\)/);
  assert.match(p, /abrirEditorInv\(INV\(\)\.length - 1\)/);
  assert.match(p, /window\.INV_RESUMO\?\.danoComEncantamento\(it, cat, v\)/);
  assert.match(css, /\.inv-editor-modal\{width:min\(620px,100%\);border-color:var\(--line/);
  new vm.Script(p);
});
