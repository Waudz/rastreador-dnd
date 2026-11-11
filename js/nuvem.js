/* Cliente mínimo do Supabase (login, tabelas, funções e arquivos) sem biblioteca externa.
   Uso: nuvem.entrar(email, senha); nuvem.get("campanhas?select=id,nome"); nuvem.rpc("criar_campanha", { p_nome: "..." }) */
(() => {
  "use strict";
  const C = window.NUVEM_CONFIG || {}, LS = "nuvem_sessao", base = C.url;
  let sessao = null, renovando = null, tipoRetorno = "";
  const ouvintes = [];
  try { sessao = JSON.parse(localStorage.getItem(LS) || "null"); } catch (_) {}

  const guardar = (s) => { sessao = s; try { if (s) localStorage.setItem(LS, JSON.stringify(s)); else localStorage.removeItem(LS); } catch (_) {} ouvintes.forEach((f) => { try { f(sessao && sessao.user); } catch (_) {} }); };
  const MSG = [
    [/Invalid login credentials/i, "E-mail ou senha incorretos."],
    [/already registered|already been registered/i, "Este e-mail já tem conta. Use “Entrar”."],
    [/Password should be at least|weak.?password/i, "A senha precisa ter pelo menos 8 caracteres."],
    [/Unable to validate email|invalid format|valid email/i, "E-mail inválido."],
    [/rate limit|too many|over_email_send_rate_limit/i, "Muitas tentativas seguidas. Espere um pouco e tente de novo."],
    [/not authorized/i, "Este e-mail não pode receber mensagens agora. Use e-mail e senha."],
    [/Email not confirmed/i, "O e-mail ainda não foi confirmado."],
    [/permission denied|row-level security|violates row-level/i, "Você não tem permissão para isso."],
    [/JWT expired|invalid JWT/i, "Sua sessão expirou. Entre de novo."],
    [/weak_password|weak password|known to be weak|should contain at least one character/i, "Senha fraca. Use pelo menos 10 caracteres, com letras e números."],
    [/otp_expired|email link is invalid or has expired|token has expired or is invalid/i, "Este link expirou ou já foi usado. Peça um novo."],
    [/reauthentication|nonce/i, "Por segurança, confirme sua identidade com o código enviado ao seu e-mail."],
    [/same.?password|different from the old password/i, "A nova senha precisa ser diferente da atual."]
  ];
  /* regra de senha do aplicativo: o Supabase precisa ter a MESMA regra (Authentication > Sign In / Providers > Email:
     tamanho mínimo 10 e "Letters and digits"); aqui ela só dá retorno rápido ao usuário, quem decide é o servidor */
  const SENHA_MIN = 10;
  const validarSenha = (s) => {
    s = String(s == null ? "" : s);
    if (s.length < SENHA_MIN) return { ok: false, erro: "A senha precisa ter pelo menos " + SENHA_MIN + " caracteres." };
    if (!/[A-Za-zÀ-ÿ]/.test(s) || !/\d/.test(s)) return { ok: false, erro: "Use letras e números na senha." };
    return { ok: true, erro: "" };
  };
  const traduz = (m) => { for (const [re, t] of MSG) if (re.test(m)) return t; return m; };

  async function http(url, opt) {
    let r;
    try { r = await fetch(url, opt); } catch (e) { throw new Error("Sem conexão com o servidor."); }
    const txt = await r.text();
    let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (_) {}
    if (!r.ok) {
      const m = (j && (j.message || j.msg || j.error_description || j.error)) || r.statusText || "Erro " + r.status;
      const e = new Error(traduz(String(m))); e.status = r.status; e.detalhe = j; throw e;
    }
    return j;
  }
  const JSONH = { apikey: C.chave, "Content-Type": "application/json" };

  const aceitar = (j) => {
    const u = j.user || {};
    guardar({
      access_token: j.access_token, refresh_token: j.refresh_token,
      expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600),
      user: { id: u.id, email: u.email, nome: (u.user_metadata && u.user_metadata.nome) || "" }
    });
    return sessao.user;
  };
  async function renovar() {
    if (renovando) return renovando;
    renovando = http(`${base}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: JSONH, body: JSON.stringify({ refresh_token: sessao.refresh_token }) })
      .then(aceitar).finally(() => { renovando = null; });
    return renovando;
  }
  async function token() {
    if (!sessao) return null;
    if (sessao.expires_at - Date.now() / 1000 < 60) { try { await renovar(); } catch (e) { if (e.status && e.status < 500) guardar(null); else throw e; } }
    return sessao ? sessao.access_token : null;
  }

  /* ---------- login ---------- */
  /* Com “Confirm email” ligado no Supabase o servidor NÃO devolve sessão: a conta só vale depois do link enviado ao e-mail.
     Retorna { confirmar: true } nesse caso (o app mostra a orientação); retorna o usuário só se o projeto ainda não exigir confirmação. */
  async function cadastrar(email, senha, nome, voltarPara) {
    const v = validarSenha(senha); if (!v.ok) throw new Error(v.erro);
    const j = await http(`${base}/auth/v1/signup?redirect_to=${encodeURIComponent(voltarPara || location.href.split("#")[0])}`, { method: "POST", headers: JSONH, body: JSON.stringify({ email, password: senha, data: { nome: nome || "" } }) });
    if (!j || !j.access_token) return { confirmar: true, email };
    return aceitar(j);
  }
  async function reenviarConfirmacao(email, voltarPara) {
    await http(`${base}/auth/v1/resend?redirect_to=${encodeURIComponent(voltarPara || location.href.split("#")[0])}`, { method: "POST", headers: JSONH, body: JSON.stringify({ type: "signup", email }) });
  }
  /* A resposta é sempre a mesma, exista ou não a conta (não revela quais e-mails estão cadastrados). */
  async function esqueciSenha(email, voltarPara) {
    try { await http(`${base}/auth/v1/recover?redirect_to=${encodeURIComponent(voltarPara || location.href.split("#")[0])}`, { method: "POST", headers: JSONH, body: JSON.stringify({ email }) }); }
    catch (e) { if (e.status && e.status < 500 && e.status !== 429) return; throw e; }
  }
  async function entrar(email, senha) {
    const j = await http(`${base}/auth/v1/token?grant_type=password`, { method: "POST", headers: JSONH, body: JSON.stringify({ email, password: senha }) });
    return aceitar(j);
  }
  async function linkMagico(email, voltarPara) {
    await http(`${base}/auth/v1/otp?redirect_to=${encodeURIComponent(voltarPara || location.href.split("#")[0])}`, { method: "POST", headers: JSONH, body: JSON.stringify({ email, create_user: true }) });
  }
  async function retornoDoLink() {           // chamar ao abrir a página: lê a sessão que vem na URL depois do link mágico
    const h = new URLSearchParams(location.hash.replace(/^#/, ""));
    if (!h.get("access_token")) { if (h.get("error_description")) throw new Error(traduz(h.get("error_description").replace(/\+/g, " "))); return null; }
    const t = h.get("access_token"); tipoRetorno = h.get("type") || "";
    const u = await http(`${base}/auth/v1/user`, { headers: { apikey: C.chave, Authorization: "Bearer " + t } });
    history.replaceState(null, "", location.pathname + location.search);
    return aceitar({ access_token: t, refresh_token: h.get("refresh_token"), expires_in: +h.get("expires_in") || 3600, user: u });
  }
  async function sair() {
    try { const t = sessao && sessao.access_token; if (t) await fetch(`${base}/auth/v1/logout`, { method: "POST", headers: { apikey: C.chave, Authorization: "Bearer " + t } }); } catch (_) {}
    guardar(null);
  }
  /* Troca de senha. Sem depender só do navegador:
     1) a senha atual é conferida pelo servidor (novo login com ela); 2) o pedido leva `current_password` (o Supabase recusa se
     “Require current password” estiver ligado e ela não bater) e, quando “Secure password change” exige, o código `nonce`
     enviado ao e-mail (reautenticar()). Quem chegou por link de recuperação pode definir a senha sem a atual (a sessão é recente). */
  async function trocarSenha(nova, atual, codigo) {
    const v = validarSenha(nova); if (!v.ok) throw new Error(v.erro);
    if (!sessao) throw new Error("Faça login.");
    if (atual !== undefined && atual !== null) {
      if (!atual) throw new Error("Informe a senha atual.");
      if (atual === nova) throw new Error("A nova senha precisa ser diferente da atual.");
      try { await entrar(sessao.user.email, atual); }
      catch (e) { throw new Error(e.status === 400 || e.status === 401 || /incorretos/.test(e.message) ? "A senha atual está incorreta." : e.message); }
    }
    const t = await token(); if (!t) throw new Error("Faça login.");
    const corpo = { password: nova };
    if (atual) corpo.current_password = atual;
    if (codigo) corpo.nonce = String(codigo).trim();
    try { await http(`${base}/auth/v1/user`, { method: "PUT", headers: { ...JSONH, Authorization: "Bearer " + t }, body: JSON.stringify(corpo) }); }
    catch (e) { if (/reauthentication|nonce/i.test(e.detalhe ? JSON.stringify(e.detalhe) : e.message)) e.reautenticar = true; throw e; }
  }
  async function reautenticar() {
    const t = await token(); if (!t) throw new Error("Faça login.");
    await http(`${base}/auth/v1/reauthenticate`, { method: "GET", headers: { apikey: C.chave, Authorization: "Bearer " + t } });
  }

  /* ---------- tabelas (PostgREST) ---------- */
  async function rest(metodo, caminho, corpo, extra) {
    const t = await token(); if (!t) throw new Error("Faça login.");
    const h = { apikey: C.chave, Authorization: "Bearer " + t, ...(extra || {}) };
    if (corpo !== undefined) h["Content-Type"] = "application/json";
    if (metodo !== "GET" && metodo !== "DELETE" && !h.Prefer) h.Prefer = "return=representation";
    return http(`${base}/rest/v1/${caminho}`, { method: metodo, headers: h, body: corpo !== undefined ? JSON.stringify(corpo) : undefined });
  }

  /* ---------- arquivos (Storage) ---------- */
  async function enviarArquivo(caminho, arquivo) {
    const t = await token(); if (!t) throw new Error("Faça login.");
    return http(`${base}/storage/v1/object/documentos/${caminho.split("/").map(encodeURIComponent).join("/")}`, { method: "POST", headers: { apikey: C.chave, Authorization: "Bearer " + t, "Content-Type": arquivo.type || "application/octet-stream", "x-upsert": "false" }, body: arquivo });
  }
  async function urlDoArquivo(caminho, segundos) {
    const t = await token(); if (!t) throw new Error("Faça login.");
    const j = await http(`${base}/storage/v1/object/sign/documentos/${caminho.split("/").map(encodeURIComponent).join("/")}`, { method: "POST", headers: { ...JSONH, Authorization: "Bearer " + t }, body: JSON.stringify({ expiresIn: segundos || 600 }) });
    return `${base}/storage/v1${j.signedURL}`;
  }
  async function apagarArquivos(caminhos) {
    const t = await token(); if (!t) throw new Error("Faça login.");
    return http(`${base}/storage/v1/object/documentos`, { method: "DELETE", headers: { ...JSONH, Authorization: "Bearer " + t }, body: JSON.stringify({ prefixes: caminhos }) });
  }

  /* ---------- atualização periódica (usada pelas telas enquanto estão abertas) ---------- */
  function observar(fn, ms) {
    let ativo = true, t = null;
    const volta = async () => { if (!ativo) return; if (!document.hidden) { try { await fn(); } catch (_) {} } t = setTimeout(volta, ms || 5000); };
    t = setTimeout(volta, ms || 5000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && ativo) { clearTimeout(t); volta(); } });
    return () => { ativo = false; clearTimeout(t); };
  }

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  /* botão de mostrar/ocultar senha: <div class="pw"><input type="password"><button type="button" class="pw-eye"></button></div> */
  function olhos(raiz) {
    (raiz || document).querySelectorAll(".pw-eye").forEach((b) => {
      const i = b.parentNode.querySelector("input"), pinta = () => { b.innerHTML = window.ico ? window.ico(i.type === "password" ? "eye" : "eyeoff") : "Ver"; b.title = i.type === "password" ? "Mostrar a senha" : "Ocultar a senha"; b.setAttribute("aria-label", b.title); };
      b.onclick = () => { i.type = i.type === "password" ? "text" : "password"; pinta(); };
      pinta();
    });
  }
  const copiar = async (t) => { try { await navigator.clipboard.writeText(t); return true; } catch (_) { return false; } };

  window.nuvem = {
    usuario: () => (sessao && sessao.user) || null,
    aoMudar: (f) => ouvintes.push(f),
    cadastrar, reenviarConfirmacao, esqueciSenha, entrar, linkMagico, retornoDoLink, retornoTipo: () => tipoRetorno, sair, trocarSenha, reautenticar, validarSenha, SENHA_MIN,
    get: (c) => rest("GET", c), post: (c, o, h) => rest("POST", c, o, h), patch: (c, o) => rest("PATCH", c, o), apagar: (c) => rest("DELETE", c),
    rpc: (nome, args) => rest("POST", "rpc/" + nome, args || {}),
    enviarArquivo, urlDoArquivo, apagarArquivos, observar, esc, olhos, copiar
  };
})();
