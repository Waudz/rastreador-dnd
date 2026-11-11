/* Dados deste aparelho (iniciativa): backup e restauração do combate e das criações de visitante. Nada sai do aparelho. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  if (!$("#dados-locais") || !window.__ini) return;
  const msg = (t, erro) => { const e = $("#dl-msg"); e.textContent = t || ""; e.classList.toggle("err", !!erro); };
  const baixar = (nome, dados) => { const a = document.createElement("a"), url = URL.createObjectURL(new Blob([JSON.stringify(dados)], { type: "application/json" })); a.href = url; a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  const hoje = () => new Date().toISOString().slice(0, 10);
  $("#dl-combate-baixar").onclick = () => {
    const d = window.__ini.exportarCombate(), n = d.combatants.length;
    if (!n) { msg("Não há combate para guardar."); return; }
    baixar("backup-combate-" + hoje() + ".json", d); msg("Backup com " + n + (n === 1 ? " combatente" : " combatentes") + " baixado.");
  };
  $("#dl-combate-arquivo").onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    try {
      if (f.size > 5 * 1048576) throw new Error("Escolha um arquivo de até 5 MB.");
      let d; try { d = JSON.parse(await f.text()); } catch (_) { throw new Error("O arquivo não é um backup de combate válido."); }
      if (!d || d.tipo !== "backup-combate" || !Array.isArray(d.combatants)) throw new Error("O arquivo não é um backup de combate.");
      const atual = window.__ini.list().length;
      if (!confirm("Substituir o combate atual" + (atual ? " (" + atual + " combatentes)" : "") + " pelo do arquivo (" + d.combatants.length + " combatentes)? O combate atual será perdido.")) return;
      window.__ini.importarCombate(d); msg("Combate restaurado.");
    } catch (err) { msg(err.message, true); }
  };
  $("#dl-criacoes-baixar").onclick = async () => {
    try {
      const d = window.acervo && await window.acervo.exportarVisitante();
      if (!d) { msg(window.nuvem && nuvem.usuario() ? "Suas criações ficam na sua conta: baixe o backup em Minha conta." : "Não há criações salvas neste aparelho."); return; }
      baixar("backup-criacoes-visitante-" + hoje() + ".json", d); msg("Backup das criações baixado.");
    } catch (err) { msg(err.message, true); }
  };
})();
