/* Traz os personagens e NPCs de uma campanha (Supabase) para a ordem de iniciativa e devolve a vida ao banco */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s), esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const box = $("#camp-ini");
  if (!box || !window.nuvem || !nuvem.usuario()) return;
  let camps = [], pers = [], atual = "", enviado = {}, falhas = 0;
  const msg = (t, erro) => { $("#ci-msg").innerHTML = t ? (erro ? `<span class="err">${esc(t)}</span>` : esc(t)) : ""; };

  async function iniciar() {
    try {
      const ms = await nuvem.get(`membros?select=campanha_id,papel,campanha:campanhas(id,nome)&usuario_id=eq.${encodeURIComponent(nuvem.usuario().id)}&papel=eq.mestre`);
      camps = ms.filter((m) => m.campanha).map((m) => m.campanha);
    } catch (_) { return; }
    if (!camps.length) return;                       // só aparece para quem é mestre de alguma campanha
    box.hidden = false;
    $("#ci-camp").innerHTML = camps.map((c) => `<option value="${esc(c.id)}">${esc(c.nome)}</option>`).join("");
    try { atual = localStorage.getItem("ini_campanha") || ""; } catch (_) {}
    if (!camps.some((c) => c.id === atual)) atual = camps[0].id;
    $("#ci-camp").value = atual;
    carregar();
  }
  async function carregar() {
    msg("Carregando…");
    try { pers = await nuvem.get(`personagens?select=id,nome,pv_atual,pv_max,ca,ficha&campanha_id=eq.${encodeURIComponent(atual)}&order=nome`); msg(""); }
    catch (e) { msg(e.message, true); return; }
    desenhar();
  }
  const emCombate = (p) => window.__ini.list().some((c) => c.pid === p.id);
  function desenhar() {
    $("#ci-lista").innerHTML = pers.length ? pers.map((p) => {
      const f = p.ficha || {};
      return `<div class="res"><span><b>${esc(p.nome)}</b> <span class="badge jog">${f.npc ? "NPC" : "Personagem"}</span> <span class="muted">PV ${p.pv_atual}/${p.pv_max} · CA ${p.ca}</span></span>${emCombate(p) ? '<span class="muted">No combate</span>' : `<button type="button" class="small primary" data-ci="${esc(p.id)}">Adicionar</button>`}</div>`;
    }).join("") : '<span class="muted">Esta campanha ainda não tem personagens.</span>';
  }
  function adicionar(p) {
    if (emCombate(p)) return;
    const f = p.ficha || {}, des = Number((f.atributos || {}).des) || 10, md = Math.floor((des - 10) / 2);
    const usados = new Set(window.__ini.list().map((c) => c.name));
    let nome = p.nome, n = 2; while (usados.has(nome)) nome = `${p.nome} ${n++}`;
    window.__ini.add({ name: nome, kind: f.npc ? "NPC" : "Personagem", initiative: 1 + Math.floor(Math.random() * 20) + md, hp: p.pv_atual, maxHp: Math.max(1, p.pv_max), ac: p.ca || 0, key: "", pid: p.id, foto: f.foto || "" });
    enviado[p.id] = p.pv_atual;
  }
  box.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ci]"); if (b) { const p = pers.find((x) => x.id === b.dataset.ci); if (p) { adicionar(p); desenhar(); } return; }
    if (e.target.closest("#ci-todos")) { pers.forEach(adicionar); desenhar(); return; }
    if (e.target.closest("#ci-recarregar")) carregar();
  });
  box.addEventListener("change", (e) => { if (e.target.id === "ci-camp") { atual = e.target.value; try { localStorage.setItem("ini_campanha", atual); } catch (_) {} carregar(); } });

  /* vida do combate -> ficha da campanha (só muda quando o valor muda) */
  setInterval(async () => {
    if (!window.__ini || falhas > 5) return;
    for (const c of window.__ini.list()) {
      if (!c.pid) continue;
      const v = Math.max(0, Math.min(c.maxHp, Math.round(c.hp)));
      if (enviado[c.pid] === undefined) { enviado[c.pid] = v; continue; }
      if (enviado[c.pid] === v) continue;
      try { await nuvem.patch(`personagens?id=eq.${encodeURIComponent(c.pid)}`, { pv_atual: v }); enviado[c.pid] = v; falhas = 0; const p = pers.find((x) => x.id === c.pid); if (p) p.pv_atual = v; }
      catch (_) { falhas++; }
    }
  }, 2500);

  iniciar();
})();
