/* Recursos de classe com usos e recarga (D&D 5e, 2014). Tabela única por classe; o estado gasto fica em ficha.recursosUsados[id].
   Cobre os recursos principais do Livro do Jogador. Recursos de subclasse e de raça, e características com recarga que dependem de eventos
   (Intervenção Divina, Recuperação Natural, Golpe de Sorte etc.) ainda não estão aqui: seguem como texto em "Recursos e habilidades". */
(() => {
  "use strict";
  const R = window.REGRAS;
  const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const nivel = (f, cid) => ((f.classes || []).find((c) => c.c === cid) || {}).n || 0;
  const cha = (f) => R.mod(R.atributoEf(f, "car"));
  /* cada classe devolve a lista de recursos para o nível atual; max = null significa uso ilimitado */
  const TABELA = {
    Barbarian: (f, n) => [{ id: "furia", nome: "Fúria", max: n >= 20 ? null : n >= 17 ? 6 : n >= 12 ? 5 : n >= 6 ? 4 : n >= 3 ? 3 : 2, recarga: "longo", nota: "Bônus de dano da Fúria: +" + (n >= 16 ? 4 : n >= 9 ? 3 : 2) }],
    Bard: (f, n) => [{ id: "inspiracao", nome: "Inspiração de Bardo", max: Math.max(1, cha(f)), recarga: n >= 5 ? "curto" : "longo", nota: "Dado de inspiração: d" + (n >= 15 ? 12 : n >= 10 ? 10 : n >= 5 ? 8 : 6) }],
    Cleric: (f, n) => (n >= 2 ? [{ id: "canal-clerigo", nome: "Canalizar Divindade", max: n >= 18 ? 3 : n >= 6 ? 2 : 1, recarga: "curto" }] : []),
    Druid: (f, n) => (n >= 2 ? [{ id: "forma-selvagem", nome: "Forma Selvagem", max: n >= 20 ? null : 2, recarga: "curto" }] : []),
    Fighter: (f, n) => [{ id: "retomar-folego", nome: "Retomar o Fôlego", max: 1, recarga: "curto" },
      ...(n >= 2 ? [{ id: "surto-acao", nome: "Surto de Ação", max: n >= 17 ? 2 : 1, recarga: "curto" }] : []),
      ...(n >= 9 ? [{ id: "indomavel", nome: "Indomável", max: n >= 17 ? 3 : n >= 13 ? 2 : 1, recarga: "longo" }] : [])],
    Monk: (f, n) => (n >= 2 ? [{ id: "ki", nome: "Pontos de Ki", max: n, recarga: "curto" }] : []),
    Paladin: (f, n) => [{ id: "maos-consagradas", nome: "Mãos Consagradas (reserva de PV)", max: 5 * n, recarga: "longo", tipo: "reserva" },
      { id: "sentido-divino", nome: "Sentido Divino", max: 1 + Math.max(0, cha(f)), recarga: "longo" },
      ...(n >= 3 ? [{ id: "canal-paladino", nome: "Canalizar Divindade", max: 1, recarga: "curto" }] : []),
      ...(n >= 14 ? [{ id: "toque-purificador", nome: "Toque Purificador", max: Math.max(1, cha(f)), recarga: "longo" }] : [])],
    Sorcerer: (f, n) => (n >= 2 ? [{ id: "feiticaria", nome: "Pontos de Feitiçaria", max: n, recarga: "longo" }] : []),
    Warlock: (f, n) => (n >= 20 ? [{ id: "mestre-arcano", nome: "Mestre Arcano", max: 1, recarga: "longo", nota: "Recupera todos os espaços de Pacto (1 minuto)" }] : []),
    Wizard: (f, n) => [{ id: "recuperacao-arcana", nome: "Recuperação Arcana", max: 1, recarga: "longo", nota: "Recupera espaços de até " + Math.ceil(n / 2) + " níveis combinados, nenhum de 6º círculo ou mais, num descanso curto" }],
  };
  function calcular(f) {
    const usados = f.recursosUsados || {}, out = [];
    for (const c of f.classes || []) {
      const t = TABELA[c.c]; if (!t || !(c.n > 0)) continue;
      for (const r of t(f, c.n)) {
        const gasto = r.max == null ? 0 : Math.min(r.max, num(usados[r.id], 0));
        out.push({ ...r, classe: c.c, usados: gasto, restante: r.max == null ? null : r.max - gasto });
      }
    }
    return out;
  }
  const achar = (f, id) => calcular(f).find((r) => r.id === id);
  function usar(f, id, qtd = 1) {
    const r = achar(f, id); if (!r) throw new Error("Recurso não encontrado.");
    const n = Math.floor(num(qtd, 0)); if (!(n >= 1)) throw new Error("Quantidade inválida.");
    if (r.max == null) return r;
    if (n > r.restante) throw new Error(r.restante ? "Só restam " + r.restante + "." : "Sem usos restantes.");
    f.recursosUsados = { ...(f.recursosUsados || {}), [id]: r.usados + n };
    return achar(f, id);
  }
  /* descanso curto: recursos "curto"; descanso longo: "curto" e "longo". Devolve os ids recuperados. */
  function recuperar(f, descanso) {
    const ids = [];
    for (const r of calcular(f)) if (r.usados && (r.recarga === "curto" || descanso === "longo")) { ids.push(r.id); }
    if (ids.length) { const u = { ...(f.recursosUsados || {}) }; ids.forEach((i) => delete u[i]); f.recursosUsados = u; }
    return ids;
  }
  /* depois de reduzir o nível, usos gastos acima do novo máximo ficam limitados pelo cálculo (min com max) */
  window.RECURSOS = { TABELA, calcular, usar, recuperar, achar };
})();
