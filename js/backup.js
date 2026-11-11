/* Backup, restauração e recuperação das criações (tela Minha conta). Nada é apagado e nada é sobrescrito sem confirmação. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  if (!$("#backup-conta") || !window.acervo || !window.nuvem) return;
  let pendente = null;
  const msg = (t, erro) => { const e = $("#backup-msg"); e.textContent = t || ""; e.classList.toggle("err", !!erro); };
  const baixar = (nome, dados) => { const a = document.createElement("a"), url = URL.createObjectURL(new Blob([JSON.stringify(dados)], { type: "application/json" })); a.href = url; a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  const plural = (n, s, p) => n + " " + (n === 1 ? s : p);
  function mostrarPrevia(d, r, origem) {
    pendente = d;
    const n = r.novos.length, partes = [n === 1 ? "1 criação nova será adicionada" : n + " criações novas serão adicionadas",
      r.iguais.length ? plural(r.iguais.length, "já existe igual", "já existem iguais") : "",
      r.conflitos.length ? plural(r.conflitos.length, "existe com conteúdo diferente e fica como está", "existem com conteúdo diferente e ficam como estão") + (r.conflitos.some((c) => c.backupMaisRecente) ? " (a menos que você marque a opção abaixo)" : "") : "",
      r.trNovas.length ? plural(r.trNovas.length, "tradução nova", "traduções novas") : ""].filter(Boolean);
    $("#backup-resumo").textContent = "Origem: " + origem + ". " + partes.join("; ") + ".";
    $("#backup-substituir").checked = false;
    $("#backup-substituir").closest("label").hidden = !r.conflitos.some((c) => c.backupMaisRecente);
    $("#backup-confirmar").disabled = false;
    $("#backup-previa").hidden = false; msg("");
  }
  async function analisarEMostrar(d, origem) {
    const r = await acervo.analisar(d);
    if (!r.total) { $("#backup-previa").hidden = true; pendente = null; msg("O arquivo não tem criações."); return; }
    if (!r.novos.length && !r.trNovas.length && !r.conflitos.some((c) => c.backupMaisRecente)) {
      $("#backup-previa").hidden = true; pendente = null;
      msg("Nada a restaurar: tudo o que está neste arquivo já existe na sua conta" + (r.conflitos.length ? " (" + plural(r.conflitos.length, "item com conteúdo diferente foi mantido", "itens com conteúdo diferente foram mantidos") + ")" : "") + ".");
      return;
    }
    mostrarPrevia(d, r, origem);
  }
  const preparar = () => {
    if (!nuvem.usuario()) throw new Error("Entre na sua conta.");
    if (!acervo.ativo()) throw new Error("A conta ainda não guarda as criações. Seus dados locais foram preservados.");
  };
  $("#backup-baixar").onclick = async () => {
    try { preparar(); msg("Preparando o backup…"); const d = await acervo.exportar(), n = Object.keys(d.items).length; baixar("backup-criacoes-" + new Date().toISOString().slice(0, 10) + ".json", d); msg("Backup com " + plural(n, "criação", "criações") + " baixado. Guarde o arquivo fora deste aparelho."); }
    catch (e) { msg(e.message, true); }
  };
  $("#backup-arquivo").onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    try {
      preparar();
      if (f.size > acervo.LIMITE_BYTES) throw new Error("Escolha um arquivo de até 20 MB.");
      let d; try { d = JSON.parse(await f.text()); } catch (_) { throw new Error("O arquivo não é um backup válido."); }
      acervo.validar(d);
      await analisarEMostrar(d, d.origem ? "backup de " + d.origem : "arquivo " + f.name);
    } catch (err) { $("#backup-previa").hidden = true; pendente = null; msg(err.message, true); }
  };
  $("#backup-legado").onclick = async () => {
    try {
      preparar(); msg("Procurando…");
      const d = await acervo.lerLocais();
      if (!d) { $("#backup-previa").hidden = true; pendente = null; msg("Não encontrei criações antigas nem de visitante neste navegador."); return; }
      await analisarEMostrar(d, d.origem);
    } catch (err) { $("#backup-previa").hidden = true; pendente = null; msg(err.message, true); }
  };
  $("#backup-confirmar").onclick = async () => {
    if (!pendente) return;
    const botao = $("#backup-confirmar"); botao.disabled = true; msg("Restaurando…");
    try {
      const r = await acervo.restaurar(pendente, { substituir: $("#backup-substituir").checked });
      $("#backup-previa").hidden = true; pendente = null;
      msg("Pronto: " + plural(r.adicionadas, "criação adicionada", "criações adicionadas") + (r.substituidas ? ", " + plural(r.substituidas, "substituída", "substituídas") : "") + (r.mantidas ? ", " + plural(r.mantidas, "mantida como estava", "mantidas como estavam") : "") + (r.traducoes ? ", " + plural(r.traducoes, "tradução nova", "traduções novas") : "") + ".");
    } catch (err) { msg(err.message, true); botao.disabled = false; }
  };
  $("#backup-cancelar").onclick = () => { pendente = null; $("#backup-previa").hidden = true; msg(""); };

  /* Quem usou o rastreador como visitante e depois entra na conta: oferece, uma vez, levar as criações deste navegador. Só mostra a prévia. */
  (async () => {
    try {
      if (!nuvem.usuario() || !acervo.ativo()) return;
      const chave = "backup_oferta_" + nuvem.usuario().id;
      if (localStorage.getItem(chave)) return;
      const d = await acervo.lerLocais(); if (!d) return;
      const r = await acervo.analisar(d);
      if (!r.novos.length && !r.trNovas.length) { localStorage.setItem(chave, "1"); return; }
      localStorage.setItem(chave, "1");
      $("#backup-conta").open = true;
      mostrarPrevia(d, r, d.origem);
      msg("Encontramos criações salvas neste navegador antes de você entrar. Confira e toque em Restaurar para levá-las para sua conta, ou em Cancelar para deixar como está.");
    } catch (_) {}
  })();
})();
