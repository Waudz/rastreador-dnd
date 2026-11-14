/* Resumos curtos para a lista e a grade do inventário (D&D 5e, 2014).
   Só reúnem texto que JÁ existe: campos do catálogo (CAT_ITENS), propriedades do próprio item e a descrição escrita (it.desc).
   Nada é inventado: sem dado, devolve "" e a interface não mostra a linha.
   mecanico(): a linha do que o equipamento FAZ (dano, propriedades, alcance, CA, efeitos, cargas, bônus).
   descricao(): a descrição escrita ou, na falta dela, uma frase factual montada com os dados do catálogo. */
(() => {
  "use strict";
  const C = () => window.CAT_ITENS || null;
  const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const limpa = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  const linha = (rows, k) => { const r = (rows || []).find((x) => x && x[0] === k); return r ? limpa(r[1]) : ""; };

  /* efeitos: lista de textos já prontos (quem chama traduz os efeitos do item com as regras da ficha) */
  function mecanico(it, cat, efeitosTexto) {
    const efs = (efeitosTexto || []).map(limpa).filter(Boolean);
    const c = C(), pr = (it && it.propriedades) || {}, partes = [];
    if (cat && c && !cat.custom) {
      const rows = c.linhas(cat);
      const dano = linha(rows, "Dano");
      if (dano) partes.push(dano);
      let props = linha(rows, "Propriedades");
      const duas = cat.arma && cat.arma.danoDuasMaos && cat.arma.danoDuasMaos.dado;
      if (props && duas) props = props.replace(/Versátil/i, "Versátil (" + cat.arma.danoDuasMaos.dado + ")");
      const temAlcance = !!(linha(rows, "Alcance") || linha(rows, "Arremesso"));
      if (props && temAlcance) props = props.split(/,\s*/).filter((p) => !/^Arremesso$/i.test(p)).join(", ");   // o alcance de arremesso já diz isso
      if (props) partes.push(props.replace(/,\s*/g, " · "));
      const alc = linha(rows, "Alcance"), arremesso = linha(rows, "Arremesso");
      if (alc) partes.push("Alcance " + alc);
      if (arremesso && arremesso !== alc) partes.push("Arremesso " + arremesso);   // não repete o mesmo alcance
      /* a cura do catálogo só some quando um efeito configurado JÁ diz que recupera PV; outros efeitos (resistência, condição...) não escondem nada */
      const curaNoEfeito = efs.some((t) => /recupera|pontos de vida/i.test(t)), cura = linha(rows, "Cura ao usar"); if (cura && !curaNoEfeito) partes.push("Cura " + cura);
      const ca = linha(rows, "Classe de Armadura"); if (ca) partes.push("CA " + ca);
      const forMin = linha(rows, "Força mínima"); if (forMin) partes.push("For " + forMin);
    }
    if (pr.bonus != null && Number(pr.bonus)) partes.push((Number(pr.bonus) > 0 ? "+" : "") + Number(pr.bonus));
    for (const t of efs.slice(0, 2)) partes.push(t);
    if (efs.length > 2) partes.push("+" + (efs.length - 2) + (efs.length - 2 === 1 ? " efeito" : " efeitos"));   // o resto está nos detalhes
    if (pr.cargas) partes.push("Cargas " + num(pr.cargas.atual) + "/" + num(pr.cargas.max));
    const vistos = new Set();
    return partes.filter((p) => { const k = p.toLowerCase(); if (!p || vistos.has(k)) return false; vistos.add(k); return true; }).join(" · ");
  }

  /* frase factual a partir do catálogo (só quando não há descrição escrita) */
  function fatual(cat) {
    const c = C(); if (!cat || !c || cat.custom) return "";
    if (cat.arma) {
      const base = c.SUBTIPOS[cat.arma.categoria + "-" + cat.arma.alcance] || "Arma", props = cat.arma.propriedades || [];
      const extra = [props.includes("two-handed") ? "exige as duas mãos para atacar" : "", props.includes("thrown") ? "pode ser arremessada" : "", props.includes("finesse") ? "pode usar Destreza em vez de Força" : "", props.includes("reach") ? "tem alcance de 3 m" : ""].filter(Boolean);
      return base + (extra.length ? ": " + extra.join(", ") : "") + ".";
    }
    if (cat.armadura) {
      const a = cat.armadura, nome = a.categoria === "shield" ? "Escudo" : "Armadura " + ({ light: "leve", medium: "média", heavy: "pesada" }[a.categoria] || "");
      const extra = [a.forMin ? "exige Força " + a.forMin : "", a.furtividade ? "desvantagem em Furtividade" : ""].filter(Boolean);
      return nome.trim() + (extra.length ? ": " + extra.join(", ") : "") + ".";
    }
    return "";
  }
  function descricao(it, cat) {
    const d = limpa(it && it.desc) || limpa(cat && cat.desc);
    return d || fatual(cat);
  }
  window.INV_RESUMO = { mecanico, descricao, fatual };
})();
