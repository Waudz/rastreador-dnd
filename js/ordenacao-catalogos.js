/* Ordenação compartilhada para catálogos do Compêndio 5e. Sem alterar os dados originais. */
(function (root) {
  "use strict";
  const col = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });
  const texto = v => String(v ?? "").trim();
  function ordenar(registros, criterio, opcoes = {}) {
    const itens = Array.from(registros || []);
    const nome = opcoes.nome || (it => it.nome ?? it.name ?? "");
    const custo = opcoes.custo || (it => {
      const c = it.custo;
      if (!c || !Number.isFinite(Number(c.v))) return null;
      return Number(c.v) * ({ gp: 1, sp: .1, cp: .01, pp: .1, po: 1, pc: .01 }[c.u] ?? 1);
    });
    const raridades = ["mundano", "common", "uncommon", "rare", "very-rare", "legendary", "artifact"];
    const valor = it => {
      if (criterio === "valor-asc" || criterio === "valor-desc") return custo(it);
      if (criterio === "raridade-asc" || criterio === "raridade-desc") {
        const pos = raridades.indexOf(it.raridade || "mundano");
        return pos < 0 ? null : pos;
      }
      if (criterio === "categoria") return it.categoria || null;
      return nome(it);
    };
    const desc = criterio.endsWith("-desc") || criterio === "nome-desc";
    return itens.map((item, index) => ({ item, index })).sort((a, b) => {
      const x = valor(a.item), y = valor(b.item);
      if (x == null || x === "") return y == null || y === "" ? a.index - b.index : 1;
      if (y == null || y === "") return -1;
      const cmp = typeof x === "number" && typeof y === "number" ? x - y : col.compare(texto(x), texto(y));
      if (cmp) return desc ? -cmp : cmp;
      const nomes = col.compare(texto(nome(a.item)), texto(nome(b.item)));
      return nomes || a.index - b.index;
    }).map(x => x.item);
  }
  const api = { ordenar };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.COMP_ORDENACAO = api;
})(typeof window !== "undefined" ? window : null);
