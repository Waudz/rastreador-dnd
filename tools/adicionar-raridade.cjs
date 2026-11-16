
const fs = require("node:fs");
const path = require("node:path");

const arquivo = path.join(
  __dirname,
  "../dados/itens-srd2014.json"
);

// Ler o catálogo
const catalogo = JSON.parse(
  fs.readFileSync(arquivo, "utf8")
);

let alterados = 0;

// Percorrer todos os itens
for (const item of catalogo.itens) {
  if (item.raridade == null || item.raridade === "") {
    item.raridade = "mundano";
    alterados++;
  }
}

// Salvar as alterações
fs.writeFileSync(
  arquivo,
  JSON.stringify(catalogo, null, 2) + "\n",
  "utf8"
);

console.log(`${alterados} itens atualizados!`);
