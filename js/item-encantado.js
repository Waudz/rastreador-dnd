/* Variantes mágicas e magias vinculadas a itens individuais — D&D 5e (2014).
   Dados ficam no inventário, nunca alteram o catálogo compartilhado. */
(() => {
  "use strict";
  const RAR = { arma: ["", "Incomum", "Rara", "Muito rara"], escudo: ["", "Incomum", "Rara", "Muito rara"], armadura: ["", "Rara", "Muito rara", "Lendária"] };
  const bonus = it => Math.max(0, Math.min(3, Number(it?.propriedades?.encantamento?.bonus) || 0));
  const tipo = cat => cat && ["arma", "armadura", "escudo"].includes(cat.categoria) ? cat.categoria : null;
  const nomeBase = (it, cat) => cat?.nome || String(it?.nome || "").replace(/ \\+[123]$/, "");
  function configurar(it, cat, valor) {
    const t = tipo(cat); if (!t) throw Error("Apenas armas, armaduras e escudos do catálogo aceitam bônus +1 a +3.");
    const n = Number(valor); if (!Number.isInteger(n) || n < 0 || n > 3) throw Error("Bônus mágico inválido.");
    const pr = it.propriedades || (it.propriedades = {});
    if (n) { pr.encantamento = { bonus: n }; pr.raridade = RAR[t][n]; }
    else { delete pr.encantamento; delete pr.raridade; }
    it.nome = nomeBase(it, cat) + (n ? " +" + n : "");
    return it;
  }
  const magias = it => Array.isArray(it?.propriedades?.magiasItem) ? it.propriedades.magiasItem : [];
  function vincularMagia(it, magia, custo, passiva = false) {
    if (!it || !magia?.en || !magia?.n) throw Error("Escolha uma magia do catálogo.");
    const n = Number(custo);
    if (!Number.isInteger(n) || n < 0 || n > 99) throw Error("Custo de cargas inválido.");
    const lista = magias(it).filter(m => m.en !== magia.en);
    lista.push({ en: String(magia.en).slice(0,120), n: String(magia.n).slice(0,120), l: Number(magia.l) || 0, custo: n, passiva: !!passiva });
    (it.propriedades ||= {}).magiasItem = lista;
    return lista;
  }
  function conjurar(it, en) {
    const m = magias(it).find(x => x.en === en);
    if (!m || m.passiva) throw Error("Magia não disponível para conjuração.");
    const pr = it.propriedades || {};
    const custo = Number(m.custo) || 0;
    if (custo && (!pr.cargas || Number(pr.cargas.atual) < custo)) throw Error("Cargas insuficientes.");
    if (custo) pr.cargas.atual -= custo;
    return m;
  }
  const bonusCA = P => {
    const e = P?.ficha?.equip || {};
    return (P?.inventario || []).reduce((n, it) => n + (it.equipado && it.qtd > 0 && (it.uid === e.armaduraUid || it.uid === e.escudoUid) ? bonus(it) : 0), 0);
  };
  window.ITEM_ENCANTADO = { RAR, bonus, tipo, configurar, magias, vincularMagia, conjurar, bonusCA };
})();
