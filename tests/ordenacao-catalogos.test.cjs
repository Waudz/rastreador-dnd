const test = require("node:test");
const assert = require("node:assert/strict");
const { ordenar } = require("../js/ordenacao-catalogos.js");
const itens = [
  { nome: "Zarabatana", categoria: "arma", raridade: "rare", custo: { v: 2, u: "gp" } },
  { nome: "Ábaco", categoria: "equipamento", raridade: "mundano", custo: { v: 50, u: "sp" } },
  { nome: "Adaga", categoria: "arma", raridade: "uncommon", custo: { v: 150, u: "cp" } },
  { nome: "Sem preço", categoria: "equipamento", raridade: "mundano" }
];
test("ordenação alfabética pt-BR e reversa", () => {
  assert.deepEqual(ordenar(itens, "nome-asc").map(x => x.nome), ["Ábaco", "Adaga", "Sem preço", "Zarabatana"]);
  assert.deepEqual(ordenar(itens, "nome-desc").map(x => x.nome), ["Zarabatana", "Sem preço", "Adaga", "Ábaco"]);
});
test("ordenação por valor converte moedas e mantém valores ausentes ao final", () => {
  assert.deepEqual(ordenar(itens, "valor-asc").map(x => x.nome), ["Adaga", "Zarabatana", "Ábaco", "Sem preço"]);
  assert.deepEqual(ordenar(itens, "valor-desc").map(x => x.nome), ["Ábaco", "Zarabatana", "Adaga", "Sem preço"]);
});
test("ordenação por raridade respeita a hierarquia", () => {
  assert.deepEqual(ordenar(itens, "raridade-desc").map(x => x.nome), ["Zarabatana", "Adaga", "Ábaco", "Sem preço"]);
});
test("não modifica a lista original", () => {
  const antes = itens.map(x => x.nome);
  ordenar(itens, "nome-asc");
  assert.deepEqual(itens.map(x => x.nome), antes);
});
