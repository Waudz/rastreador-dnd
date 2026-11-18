/* Integração Encontros <-> Iniciativa. Não cria outro combate: escreve combatentes no MESMO estado da Iniciativa da campanha
   (localStorage "dnd5e_initiative_tracker_v1:<campanha>", o formato que js/iniciativa.js lê) e guarda o vínculo em c.enc = { no, uid }.
   O estado final do combate (PV, condições, situação) é copiado para um "recibo" (compendio:encontros-sync:<campanha>) a cada gravação da Iniciativa,
   e a aba Encontros o aplica nas instâncias mesmo depois de o combate ser limpo. Funções puras recebem o estado como objeto (testáveis). */
(() => {
  "use strict";
  const CHAVE = "dnd5e_initiative_tracker_v1", RECIBO = "compendio:encontros-sync:";
  /* condições dos monstros do encontro <-> efeitos da Iniciativa (mesmos tipos/cores de js/iniciativa.js) */
  const FX = { Amedrontado: ["frightened", "#9b8cff"], Atordoado: ["stunned", "#c79bff"], Caído: ["prone", "#b08a5a"], Cego: ["blinded", "#a0a0b0"], Contido: ["restrained", "#b8b8c8"], Enfeitiçado: ["charmed", "#ff7eb6"], Envenenado: ["poison", "#7bc043"], Agarrado: ["grappled", "#d49a5a"], Paralisado: ["paralyzed", "#e8c33c"], Inconsciente: ["unconscious", "#6c7bd6"], Invisível: ["invisible", "#9ad7ff"], Surdo: ["deafened", "#a0a0b0"], Incapacitado: ["custom", "#d7ad65"] };
  const PARA_PT = Object.fromEntries(Object.entries(FX).filter(([, v]) => v[0] !== "custom").map(([pt, v]) => [v[0], pt]));
  const SITUACOES = { "": "Ativo", fugiu: "Fugiu", capturado: "Capturado" };
  const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const ini = (v) => { const n = Number(v); return v === null || v === undefined || v === "" || !Number.isFinite(n) ? null : Math.round(n); };

  /* ---------- estado da Iniciativa ---------- */
  const estadoVazio = () => ({ combatants: [], currentId: null, round: 1, nextOrder: 0, stats: {} });
  function lerEstado(storage, campanhaId) {
    try { const e = JSON.parse(storage.getItem(CHAVE + ":" + campanhaId) || "null"); if (e && Array.isArray(e.combatants)) return { ...estadoVazio(), ...e }; } catch (_) { /* estado ilegível: começa vazio */ }
    return estadoVazio();
  }
  const gravarEstado = (storage, campanhaId, e) => storage.setItem(CHAVE + ":" + campanhaId, JSON.stringify(e));
  const vinculo = (c) => (c && c.enc && c.enc.uid ? c.enc : null);
  const combatenteDe = (estado, uid) => estado.combatants.find((c) => vinculo(c) && c.enc.uid === uid) || null;

  /* ---------- conversões ---------- */
  const efeitosDe = (condicoes) => (condicoes || []).filter((n) => FX[n]).map((n) => ({ id: id(), type: FX[n][0], name: n, color: FX[n][1], rounds: null }));
  function situacaoDe(c, anterior) {
    if (c.morto) return "derrotado";
    if (Number(c.hp) <= 0) return "inconsciente";
    return anterior === "fugiu" || anterior === "capturado" ? anterior : "";
  }
  function combatenteDe_instancia(m, enc, no, iniciativa, ordem) {
    return { id: id(), order: ordem, name: m.nome, kind: "Monstro", initiative: iniciativa, hp: m.pv, maxHp: m.pvMax, temp: 0, ac: m.ca, key: m.origem, effects: efeitosDe(m.condicoes), enc: { no, enc, uid: m.uid } };
  }
  const rolarD20 = () => 1 + Math.floor(Math.random() * 20);

  /* Enviar para a Iniciativa. itens: [{ no, enc, m }]. opcoes: { modo: "auto"|"manual"|"branco", compartilhada, valores: { [uid ou origem]: numero }, rolar }.
     Nunca reinicia o combate (rodada, turno atual e quem já está nele ficam como estão: serve também para reforços) e nunca envia a mesma instância duas vezes. */
  function enviar(estado, itens, opcoes = {}) {
    const { modo = "auto", compartilhada = false, valores = {}, rolar = rolarD20 } = opcoes, enviados = [], duplicados = [], ignorados = [], compartilhado = {};
    for (const { no, enc, m } of itens) {
      if (combatenteDe(estado, m.uid) || enviados.includes(m.uid)) { duplicados.push(m.uid); continue; }
      if (m.situacao === "fugiu" || m.situacao === "capturado" || m.situacao === "derrotado") { ignorados.push(m.uid); continue; }
      let valor = null;
      if (modo === "auto") { const k = m.origem; if (compartilhada && k in compartilhado) valor = compartilhado[k]; else { valor = rolar() + (Number(m.bonusIni) || 0); if (compartilhada) compartilhado[k] = valor; } }
      else if (modo === "manual") valor = ini(compartilhada && valores[m.origem] !== undefined ? valores[m.origem] : valores[m.uid]);
      estado.combatants.push(combatenteDe_instancia(m, enc, no, valor, estado.nextOrder++)); enviados.push(m.uid);
    }
    return { enviados, duplicados, ignorados };
  }
  /* vínculos: associar um combatente que já está em combate (inclusive improvisado) a uma instância, ou soltá-lo sem tirá-lo do combate */
  function associar(estado, combatenteId, no, enc, uid) {
    const c = estado.combatants.find((x) => x.id === combatenteId); if (!c) return { erro: "Combatente não encontrado." };
    if (combatenteDe(estado, uid)) return { erro: "Esta criatura do encontro já está ligada a outro combatente." };
    if (vinculo(c)) return { erro: "Este combatente já está ligado a outra criatura." };
    c.enc = { no, enc, uid }; return { ok: true };
  }
  function desassociar(estado, uid) { const c = combatenteDe(estado, uid); if (!c) return false; delete c.enc; return true; }
  const candidatos = (estado) => estado.combatants.filter((c) => !vinculo(c) && c.kind === "Monstro" && !c.pid);

  /* Iniciativa -> instância (copia PV, condições conhecidas e situação) */
  function lerDoCombatente(c, m) {
    const condicoes = [...new Set([...(m.condicoes || []).filter((n) => !FX[n]), ...(c.effects || []).map((e) => PARA_PT[e.type] || (e.type === "custom" && FX[e.name] ? e.name : null)).filter(Boolean)])];
    return { ...m, pv: Math.max(0, Math.round(Number(c.hp))), pvMax: Math.max(1, Math.round(Number(c.maxHp) || m.pvMax)), ca: Math.max(0, Math.round(Number(c.ac)) || 0), condicoes, situacao: situacaoDe(c, m.situacao), naIniciativa: true };
  }
  /* instância -> Iniciativa (só o que o mestre editou no encontro; efeitos de outras origens e durações ficam) */
  function escreverNoCombatente(c, m) {
    c.name = m.nome; c.hp = Math.min(m.pv, m.pvMax); c.maxHp = m.pvMax; c.ac = m.ca;
    const quer = new Set((m.condicoes || []).filter((n) => FX[n])); c.effects = Array.isArray(c.effects) ? c.effects : [];
    c.effects = c.effects.filter((e) => { const pt = PARA_PT[e.type]; return !pt || quer.has(pt); });
    for (const n of quer) if (!c.effects.some((e) => (PARA_PT[e.type] || e.name) === n)) c.effects.push({ id: id(), type: FX[n][0], name: n, color: FX[n][1], rounds: null });
    if (c.hp > 0) { c.morto = false; delete c.estavel; }
    return c;
  }
  /* recibos do estado final: gravados pela Iniciativa a cada save (js/iniciativa.js) e aplicados pela aba Encontros */
  function recibosDe(combatants, agora = Date.now()) {
    const r = {}; for (const c of combatants || []) { const v = vinculo(c); if (v) r[v.uid] = { no: v.no, enc: v.enc, pv: c.hp, pvMax: c.maxHp, ca: c.ac, efeitos: (c.effects || []).map((e) => ({ type: e.type, name: e.name })), morto: !!c.morto, t: agora }; }
    return r;
  }
  function registrar(storage, campanhaId, combatants, agora) {
    const novos = recibosDe(combatants, agora); if (!Object.keys(novos).length) return;
    let atual = {}; try { atual = JSON.parse(storage.getItem(RECIBO + campanhaId) || "{}") || {}; } catch (_) { atual = {}; }
    storage.setItem(RECIBO + campanhaId, JSON.stringify({ ...atual, ...novos }));
  }
  const lerRecibos = (storage, campanhaId) => { try { return JSON.parse(storage.getItem(RECIBO + campanhaId) || "{}") || {}; } catch (_) { return {}; } };
  function limparRecibos(storage, campanhaId, uids) { const r = lerRecibos(storage, campanhaId); for (const u of uids) delete r[u]; if (Object.keys(r).length) storage.setItem(RECIBO + campanhaId, JSON.stringify(r)); else storage.removeItem(RECIBO + campanhaId); }
  function aplicarRecibo(m, rec) {
    const c = { hp: rec.pv, maxHp: rec.pvMax, ac: rec.ca, morto: rec.morto, effects: rec.efeitos || [] };
    return lerDoCombatente(c, m);
  }
  /* aplica recibos mais novos que a última edição feita no encontro; devolve { alteracoes: [{ no, uid, m }], aplicados: [uid] } */
  function pendentes(nos, recibos) {
    const alteracoes = [], aplicados = [];
    for (const [uid, rec] of Object.entries(recibos || {})) {
      const no = nos.find((n) => n.id === rec.no); const lista = no && no.dados && Array.isArray(no.dados.monstros) ? no.dados.monstros : []; let m = lista.find((x) => x.uid === uid), dono = no;
      if (!m) { for (const n of nos) { const l = n.dados && Array.isArray(n.dados.monstros) ? n.dados.monstros : []; const f = l.find((x) => x.uid === uid); if (f) { m = f; dono = n; break; } } }
      if (!m) { aplicados.push(uid); continue; }                       // instância removida do encontro: recibo descartado
      if (rec.t > (m.sincEm || 0)) alteracoes.push({ no: dono.id, uid, m: aplicarRecibo(m, rec) }); aplicados.push(uid);
    }
    return { alteracoes, aplicados };
  }
  window.ENCONTROS_INI = { CHAVE, RECIBO, FX, SITUACOES, lerEstado, gravarEstado, vinculo, combatenteDe, enviar, associar, desassociar, candidatos, lerDoCombatente, escreverNoCombatente, recibosDe, registrar, lerRecibos, limparRecibos, aplicarRecibo, pendentes, situacaoDe, efeitosDe };
})();
