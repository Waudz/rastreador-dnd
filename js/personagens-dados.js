/* Conversão e alterações de personagens compartilhadas pela campanha e pelos testes. */
window.PERSONAGENS_DADOS = (() => {
  "use strict";
  const normalizar = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  const ALIASES = { Barbarian: ["barbaro","barbara"], Bard: ["bardo","barda"], Cleric: ["clerigo","cleriga"], Druid: ["druida"], Fighter: ["guerreiro","guerreira"], Monk: ["monge","monja"], Paladin: ["paladino","paladina"], Ranger: ["patrulheiro","patrulheira"], Rogue: ["ladino","ladina"], Sorcerer: ["feiticeiro","feiticeira"], Warlock: ["bruxo","bruxa"], Wizard: ["mago","maga"], Artificer: ["artifice"] };
  function classeDaDescricao(texto) {
    const s = normalizar(texto);
    const candidatas = Object.entries(ALIASES).filter(([id, nomes]) => [normalizar(id), ...nomes].some(n => new RegExp("(^|[^a-z])"+n+"([^a-z]|$)").test(s)));
    return candidatas.length === 1 ? candidatas[0][0] : "";
  }
  function racaDaDescricao(texto, regras) {
    const partes = String(texto || "").split(/[,;·]/).map(normalizar);
    const candidatas = regras.RACAS.filter(r => partes.includes(normalizar(r[0])));
    return candidatas.length === 1 ? candidatas[0][0] : "";
  }
  function fotoDaCriacao(m, fotos) {
    return fotos?.[m.key] || m.photo || "";
  }
  function fichaDe(m, npc, foto, regras) {
    const ab = m.ability_scores || {}, ft = m.speed?.walk ?? 30;
    const lista = a => (a || []).filter(x => x && x.name).map(x => ({ nome: String(x.name).slice(0,120), desc: String(x.desc || "").slice(0,4000) }));
    const magias = (m.spells || []).map(s => typeof s === "string" ? s : s && (s.name || s.nome)).filter(Boolean);
    const nivel = Math.max(1, Math.min(20, Math.floor(Number(m.level) || 1)));
    const classe = m.cat === "player" ? classeDaDescricao(m.subtitle) : "";
    const raca = m.cat === "player" ? racaDaDescricao(m.subtitle,regras) : "";
    return {
      npc: npc || undefined, origem: m.key, foto: foto || undefined,
      classe: classe ? regras.classe(classe).n : m.cat === "player" ? m.subtitle || "" : m.type?.name || "",
      classes: classe ? [{ c: classe, n: nivel, sub: "" }] : [],
      nivel: m.level || null, raca: raca || undefined,
      bonusRaca: raca ? { ...regras.racial(raca).bonus } : undefined,
      deslocamento: Math.round(Number(ft) * 0.3 * 10) / 10,
      atributos: Object.fromEntries([["for","strength"],["des","dexterity"],["con","constitution"],["int","intelligence"],["sab","wisdom"],["car","charisma"]].map(([k,en]) => [k,Number(ab[en]) || 10])),
      caracteristicas: lista(m.traits).concat(lista(m.actions)),
      notas: [m.subtitle, magias.length ? "Magias: "+magias.join(", ") : ""].filter(Boolean).join("\n")
    };
  }
  async function atribuirDono(api, personagemId, donoId) {
    const r = await api.patch("personagens?id=eq."+encodeURIComponent(personagemId), { dono_id: donoId || null });
    if (!r?.[0] || r[0].dono_id !== (donoId || null)) throw new Error("A atribuição não foi confirmada. Confira se você é mestre da campanha.");
    return r[0];
  }
  async function atualizarFoto(api, personagemId, foto) {
    for (let tentativa=0; tentativa<2; tentativa++) {
      const atual = (await api.get("personagens?select=id,ficha,versao&id=eq."+encodeURIComponent(personagemId)))[0];
      if (!atual) throw new Error("Personagem não encontrado ou sem permissão.");
      const r = await api.patch("personagens?id=eq."+encodeURIComponent(personagemId)+"&versao=eq."+atual.versao, { ficha: { ...(atual.ficha || {}), foto } });
      if (r?.[0]) return r[0];
    }
    throw new Error("A ficha mudou durante a atualização da foto. Tente novamente.");
  }
  return { classeDaDescricao,racaDaDescricao,fotoDaCriacao,fichaDe,atribuirDono,atualizarFoto };
})();
