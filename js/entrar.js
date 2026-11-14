/* Página de entrada: login, cadastro com confirmação de e-mail, recuperação de senha. O CAPTCHA (Turnstile), quando ligado,
   protege só estas ações. Quem não quer conta continua como visitante (iniciativa.html). */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s), esc = nuvem.esc;
  const msg = (el, t, erro) => { el.innerHTML = t ? (erro ? `<span class="err">${esc(t)}</span>` : esc(t)) : ""; };
  const voltar = nuvem.destinoSeguro(new URLSearchParams(location.search).get("voltar"));
  const aqui = () => location.origin + location.pathname + (voltar ? "?voltar=" + encodeURIComponent(voltar) : "");   // para onde os links do e-mail voltam
  const ir = () => location.replace(voltar || "conta.html");
  let modoCriar = false;
  const captcha = async () => (window.TURNSTILE ? window.TURNSTILE.obter() : undefined);

  function modo(criar) {
    modoCriar = criar;
    $("#aba-entrar").classList.toggle("on", !criar); $("#aba-criar").classList.toggle("on", criar);
    $("#campo-nome").hidden = !criar; $("#btn-login").textContent = criar ? "Criar conta" : "Entrar";
    $("#l-senha").autocomplete = criar ? "new-password" : "current-password";
    $("#l-senha").placeholder = criar ? "Mínimo 10 caracteres" : "";
    $("#dica-senha").hidden = !criar; $("#confirmar-email").hidden = true;
    msg($("#msg-login"), "");
  }
  $("#aba-entrar").onclick = () => modo(false);
  $("#aba-criar").onclick = () => modo(true);

  async function enviarLogin() {
    const email = $("#l-email").value.trim(), senha = $("#l-senha").value, m = $("#msg-login");
    if (!email || !senha) { msg(m, "Informe o e-mail e a senha.", true); return; }
    if (modoCriar) { const v = nuvem.validarSenha(senha); if (!v.ok) { msg(m, v.erro, true); return; } }   // no login não se exige regra: contas antigas podem ter senha mais curta
    $("#btn-login").disabled = true; msg(m, "Aguarde…");
    try {
      const token = await captcha();
      if (modoCriar) {
        const r = await nuvem.cadastrar(email, senha, $("#l-nome").value.trim(), aqui(), token);
        if (r && r.confirmar) { $("#l-senha").value = ""; mostrarConfirmacao(email); msg(m, ""); }
        else ir();
      } else { await nuvem.entrar(email, senha, token); ir(); }
    } catch (e) { msg(m, e.message, true); }
    $("#btn-login").disabled = false;
  }
  $("#btn-login").onclick = (e) => { e?.preventDefault?.(); return enviarLogin(); };
  $("#form-login").addEventListener("submit", (e) => { e.preventDefault(); if (!$("#btn-login").disabled) enviarLogin(); });
  function mostrarConfirmacao(email) {
    $("#confirmar-texto").textContent = "Enviamos um e-mail para " + email + ". Abra o link dele neste aparelho para ativar a conta. Se não chegou em alguns minutos, olhe a caixa de spam ou peça o reenvio.";
    $("#confirmar-email").hidden = false;
  }
  $("#btn-reenviar").onclick = async () => {
    const email = $("#l-email").value.trim(), m = $("#msg-login"); if (!email) return;
    $("#btn-reenviar").disabled = true; setTimeout(() => { $("#btn-reenviar").disabled = false; }, 60000);   // o servidor aceita um pedido por minuto
    try { await nuvem.reenviarConfirmacao(email, aqui(), await captcha()); msg(m, "E-mail de confirmação reenviado."); }
    catch (e) { msg(m, e.message, true); }
  };
  $("#btn-confirmar-ok").onclick = () => { $("#confirmar-email").hidden = true; modo(false); $("#l-senha").focus(); };
  $("#btn-esqueci").onclick = async () => {
    const email = $("#l-email").value.trim(), m = $("#msg-login");
    if (!email) { msg(m, "Informe o e-mail da conta para receber o link de nova senha.", true); return; }
    msg(m, "Enviando…");
    try { await nuvem.esqueciSenha(email, aqui(), await captcha()); msg(m, "Se existir uma conta com este e-mail, enviamos um link para criar uma nova senha. Confira também o spam."); }
    catch (e) { msg(m, e.message, true); }
  };
  $("#btn-link").onclick = async () => {
    const email = $("#l-email").value.trim(), m = $("#msg-login");
    if (!email) { msg(m, "Informe o e-mail para receber o link.", true); return; }
    msg(m, "Enviando…");
    try { await nuvem.linkMagico(email, aqui(), await captcha()); msg(m, "Link enviado. Abra o e-mail neste aparelho."); }
    catch (e) { msg(m, e.message, true); }
  };
  $("#btn-recuperar").onclick = async () => {
    const m = $("#msg-recuperar"), a = $("#r-senha").value, b = $("#r-senha2").value;
    if (a !== b) { msg(m, "As duas senhas não são iguais.", true); return; }
    const v = nuvem.validarSenha(a); if (!v.ok) { msg(m, v.erro, true); return; }
    try { await nuvem.trocarSenha(a); $("#r-senha").value = $("#r-senha2").value = ""; ir(); }
    catch (e) { msg(m, e.message, true); }
  };

  /* ---------- início ---------- */
  (async () => {
    nuvem.olhos();
    try { await nuvem.retornoDoLink(); }
    catch (e) { $("#entrar").hidden = false; msg($("#msg-login"), e.message, true); return; }
    if (nuvem.usuario() && (nuvem.retornoTipo() === "recovery" || new URLSearchParams(location.search).get("recuperar") === "1")) { $("#entrar").hidden = true; $("#recuperar").hidden = false; $("#r-senha").focus(); return; }   // veio do link “esqueci minha senha”
    if (nuvem.usuario()) { ir(); return; }                // já está conectado: não pede login de novo
    $("#entrar").hidden = false;
  })();
})();
