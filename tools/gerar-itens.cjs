/* Gera dados/itens-srd2014.json (catálogo de itens do SRD 5.1, regras de 2014) a partir de dados/criacao-srd2014.json + tools/itens-pt.txt.
   Uso: node tools/gerar-itens.cjs
   Nada é inventado: preços, pesos, dano, CA, propriedades, raridade, sintonia, espaço e conteúdo dos pacotes vêm do SRD (via 5e-database/HeroQuill);
   só mudam as unidades (libras em kg, ×0,5; pés em metros, ×0,3) e o idioma dos rótulos. O SRD não traz descrição textual para estes itens neste conjunto de dados:
   o campo `desc` fica ausente e a ficha mostra a lacuna. */
const fs = require("fs"), path = require("path");
const raiz = path.join(__dirname, "..");
const fonte = JSON.parse(fs.readFileSync(path.join(raiz, "dados/criacao-srd2014.json"), "utf8")).items;
const pt = {};
for (const l of fs.readFileSync(path.join(__dirname, "itens-pt.txt"), "utf8").split(/\r?\n/)) { if (!l.trim() || l.startsWith("#")) continue; const i = l.indexOf("="); pt[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }
const sem = (id) => id.replace("srd51:item/", "");
const kg = (lb) => (lb == null ? null : Math.round(lb * 0.5 * 1000) / 1000);
const m = (ft) => (ft == null ? null : Math.round(ft * 0.3 * 100) / 100);
const PROP = (p) => p.replace("srd51:property/", "");
/* itens do catálogo de efeitos (js/itens-efeitos.js) que a ficha já automatiza e o servidor já aprova */
const EFEITOS = { "potion-of-healing-common": "pocao-cura", "potion-of-healing-greater": "pocao-cura-maior", "potion-of-healing-superior": "pocao-cura-superior", "potion-of-healing-supreme": "pocao-cura-suprema", "potion-of-heroism": "pocao-heroismo", "potion-of-invisibility": "pocao-invisibilidade", "antitoxin-vial": "antitoxina", "ring-of-protection": "anel-protecao", "wand-of-magic-missiles": "varinha-misseis" };
for (const k of fonte.filter((x) => /^srd51:item\/potion-of-resistance-/.test(x.id))) EFEITOS[sem(k.id)] = "pocao-resistencia";
const ALIAS = { "potion-of-healing-common": ["srd51:item/potion-of-healing"] };
const saida = []; const faltaNome = [];
for (const x of fonte) {
  const d = x.data, id = sem(x.id), nome = pt[id] || (x.nome !== x.en ? x.nome : null);
  if (!nome) faltaNome.push(id);
  const it = { id: x.id, en: x.en, nome: nome || x.en };
  const cat = d.category; let categoria, subtipo = null;
  if (cat === "weapon") { categoria = "arma"; subtipo = d.weapon.category + "-" + d.weapon.kind; }
  else if (cat === "armor") { categoria = d.armor.category === "shield" ? "escudo" : "armadura"; subtipo = d.armor.category; }
  else if (cat === "adventuring-gear") { const g = d.gear.category; categoria = { "standard-gear": "equipamento", ammunition: "municao", "holy-symbols": "foco", "arcane-foci": "foco", "druidic-foci": "foco", kits: "kit", "equipment-packs": "pacote" }[g]; subtipo = g; }
  else if (cat === "tools") { categoria = "ferramenta"; subtipo = d.tool.category; }
  else if (cat === "mounts-and-vehicles") { categoria = "montaria-veiculo"; subtipo = d.vehicle.category; }
  else { categoria = /^spell-scroll/.test(id) ? "pergaminho" : /^(potion-of|oil-of|philter-of)/.test(id) ? "pocao" : "magico"; subtipo = d.slot || null; }
  it.categoria = categoria; if (subtipo) it.subtipo = subtipo;
  if (d.cost && d.cost.amount > 0) it.custo = { v: d.cost.amount, u: d.cost.unit };
  if (d.weight != null) it.peso = kg(d.weight);
  if (d.rarity) it.raridade = d.rarity;
  if (cat === "magic-items") it.sintonia = !!d.attunement;
  if (d.slot) it.espaco = d.slot;
  if (d.weapon) { const w = d.weapon; it.arma = { categoria: w.category, alcance: w.kind, propriedades: w.properties.map(PROP) }; if (w.damage) it.arma.dano = { dado: w.damage.dice, tipo: w.damage.type }; if (w.twoHandedDamage) it.arma.danoDuasMaos = { dado: w.twoHandedDamage.dice, tipo: w.twoHandedDamage.type }; if (w.range) it.arma.alcanceM = { normal: m(w.range.normal), ...(w.range.long ? { longo: m(w.range.long) } : {}) }; if (w.throwRange) it.arma.arremessoM = { normal: m(w.throwRange.normal), longo: m(w.throwRange.long) }; }
  if (d.armor) { const a = d.armor; it.armadura = { categoria: a.category, ca: a.base, somaDes: !!a.dexBonus, maxDes: a.maxDexBonus != null ? a.maxDexBonus : null, forMin: a.strengthMinimum || 0, furtividade: !!a.stealthDisadvantage }; }
  if (d.gear && d.gear.contents) it.pacote = d.gear.contents.map((c) => ({ id: c.item, qtd: c.quantity }));
  if (d.gear && d.gear.bundleSize) it.lote = d.gear.bundleSize;
  if (d.use && d.use.heal) it.cura = d.use.heal;
  if (d.vehicle && d.vehicle.speed) it.velocidade = d.vehicle.speed.unit === "ft/round" ? { v: m(d.vehicle.speed.amount), u: "m/rodada" } : { v: Math.round(d.vehicle.speed.amount * 1.6 * 10) / 10, u: "km/h" };
  if (EFEITOS[id]) it.efeitos = EFEITOS[id];
  if (ALIAS[id]) it.alias = ALIAS[id];
  saida.push(it);
}
const ids = new Set(); for (const i of saida) { if (ids.has(i.id)) throw new Error("id duplicado " + i.id); ids.add(i.id); }
for (const i of saida) for (const c of i.pacote || []) if (!ids.has(c.id)) throw new Error("componente inexistente " + c.id + " em " + i.id);
fs.writeFileSync(path.join(raiz, "dados/itens-srd2014.json"), JSON.stringify({ versao: 1, fonte: "SRD 5.1 (CC BY 4.0) via 5e-database e HeroQuill; ver docs/FONTES-CRIADOR.md", itens: saida }));
const por = {}; for (const i of saida) por[i.categoria] = (por[i.categoria] || 0) + 1;
console.log(saida.length, "itens", por, "sem nome em português:", faltaNome);
