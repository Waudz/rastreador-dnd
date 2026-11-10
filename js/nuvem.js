/* Cliente mínimo do Supabase (login, tabelas, funções e arquivos) sem biblioteca externa.
   Uso: nuvem.entrar(email, senha); nuvem.get("campanhas?select=id,nome"); nuvem.rpc("criar_campanha", { p_nome: "..." }) */
(() => {
  "use strict";
  const C = window.NUVEM_CONFIG || {}, LS = "nuvem_sessao", base = C.url;
  let sessao = null, renovando = null;
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
    [/JWT expired|invalid JWT/i, "Sua sessão expirou. Entre de novo."]
  ];
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
  async function cadastrar(email, senha, nome) {
    const j = await http(`${base}/auth/v1/signup`, { method: "POST", headers: JSONH, body: JSON.stringify({ email, password: senha, data: { nome: nome || "" } }) });
    if (!j || !j.access_token) throw new Error("Conta criada, mas o projeto exige confirmar o e-mail. Peça ao administrador para desligar “Confirm email”.");
    return aceitar(j);
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
    const t = h.get("access_token");
    const u = await http(`${base}/auth/v1/user`, { headers: { apikey: C.chave, Authorization: "Bearer " + t } });
    history.replaceState(null, "", location.pathname + location.search);
    return aceitar({ access_token: t, refresh_token: h.get("refresh_token"), expires_in: +h.get("expires_in") || 3600, user: u });
  }
  async function sair() {
    try { const t = sessao && sessao.access_token; if (t) await fetch(`${base}/auth/v1/logout`, { method: "POST", headers: { apikey: C.chave, Authorization: "Bearer " + t } }); } catch (_) {}
    guardar(null);
  }
  async function trocarSenha(nova) {
    const t = await token(); if (!t) throw new Error("Faça login.");
    await http(`${base}/auth/v1/user`, { method: "PUT", headers: { ...JSONH, Authorization: "Bearer " + t }, body: JSON.stringify({ password: nova }) });
  }

  /* ---------- tabelas (PostgREST) ---------- */
  async function rest(metodo, caminho, corpo, extra) {
    const t = await token(); if (!t) throw new Error("Faça login.");
    const h = { apikey: C.chave, Authorization: "Bearer " + t, ...(extra || {}) };
    if (corpo !== undefined) h["Content-Type"] = "application/json";
    if (metodo !== "GET" && metodo !== "DELETE") h.Prefer = "return=representation";
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

  window.nuvem = {
    usuario: () => (sessao && sessao.user) || null,
    aoMudar: (f) => ouvintes.push(f),
    cadastrar, entrar, linkMagico, retornoDoLink, sair, trocarSenha,
    get: (c) => rest("GET", c), post: (c, o) => rest("POST", c, o), patch: (c, o) => rest("PATCH", c, o), apagar: (c) => rest("DELETE", c),
    rpc: (nome, args) => rest("POST", "rpc/" + nome, args || {}),
    enviarArquivo, urlDoArquivo, apagarArquivos, observar, esc
  };
})();
