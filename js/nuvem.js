/* Cliente do Supabase. A AUTENTICAÇÃO usa o SDK oficial (vendor/supabase/supabase.js, carregado antes deste arquivo):
   sessão persistente, renovação automática, PKCE e sincronização entre abas ficam por conta dele.
   Aqui ficam só: a interface `window.nuvem` (a mesma de antes, para as telas), as chamadas de dados e de arquivos, e as regras de
   convivência com a internet instável (cair a conexão NUNCA desconecta nem apaga dados locais).
   Uso: nuvem.entrar(email, senha); nuvem.get("campanhas?select=id,nome"); nuvem.rpc("criar_campanha", { p_nome: "..." }) */
(() => {
  "use strict";
  const C = window.NUVEM_CONFIG || {}, base = C.url, SDK = window.supabase;
  const CHAVE_SESSAO = "nuvem_sessao_sdk", CHAVE_ANTIGA = "nuvem_sessao";   // a antiga é migrada uma vez e removida
  const ouvintes = [];
  let tipoRetorno = "", erroDoLink = "", tokensNoEndereco = null, usuarioAtual = null;

  /* armazenamento da sessão: localStorage (sobrevive a fechar o navegador e a PWA); se estiver bloqueado, memória */
  const memoria = {};
  const armazem = {
    getItem: (k) => { try { return localStorage.getItem(k); } catch (_) { return k in memoria ? memoria[k] : null; } },
    setItem: (k, v) => { try { localStorage.setItem(k, v); } catch (_) { memoria[k] = String(v); } },
    removeItem: (k) => { try { localStorage.removeItem(k); } catch (_) { delete memoria[k]; } }
  };
  const nomeDe = (u) => (u && u.user_metadata && u.user_metadata.nome) || (u && u.nome) || "";
  const simples = (u) => (u && u.id ? { id: u.id, email: u.email, nome: nomeDe(u) } : null);
  const lerSessaoGuardada = (chave) => { try { const s = JSON.parse(armazem.getItem(chave) || "null"); return s && s.user ? s : null; } catch (_) { return null; } };
  /* o usuário é conhecido na hora (sem esperar a rede): vem da sessão guardada, assim a tela não "pisca" deslogada ao reabrir */
  usuarioAtual = simples((lerSessaoGuardada(CHAVE_SESSAO) || lerSessaoGuardada(CHAVE_ANTIGA) || {}).user);

  /* o que o link do e-mail trouxe no endereço, lido ANTES do SDK limpar a URL */
  (() => {
    try {
      const h = new URLSearchParams((location.hash || "").replace(/^#/, "")), q = new URLSearchParams(location.search || "");
      erroDoLink = h.get("error_description") || q.get("error_description") || "";
      if (h.get("access_token")) tokensNoEndereco = { access_token: h.get("access_token"), refresh_token: h.get("refresh_token") || "", type: h.get("type") || "" };
    } catch (_) {}
  })();

  const sb = SDK && base ? SDK.createClient(base, C.chave, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: CHAVE_SESSAO, storage: armazem }
  }) : null;

  const avisar = () => ouvintes.forEach((f) => { try { f(usuarioAtual); } catch (_) {} });
  if (sb) sb.auth.onAuthStateChange((evento, sess) => {
    if (evento === "PASSWORD_RECOVERY") tipoRetorno = "recovery";
    if (evento === "INITIAL_SESSION") { if (sess && sess.user) usuarioAtual = simples(sess.user); return; }
    /* SIGNED_OUT só acontece na saída voluntária (aqui ou em outra aba) ou quando o servidor invalida a sessão de vez.
       Falha de rede ao renovar NÃO gera esse evento: a sessão continua guardada e o SDK tenta de novo sozinho. */
    if (evento === "SIGNED_OUT") usuarioAtual = null;
    else if (sess && sess.user) usuarioAtual = simples(sess.user);
    avisar();
  });

  const MSG = [
    [/Invalid login credentials/i, "E-mail ou senha incorretos."],
    [/already registered|already been registered/i, "Este e-mail já tem conta. Use “Entrar”."],
    [/Password should be at least|weak.?password/i, "A senha precisa ter pelo menos 10 caracteres, com letras e números."],
    [/Unable to validate email|invalid format|valid email/i, "E-mail inválido."],
    [/rate limit|too many|over_email_send_rate_limit/i, "Muitas tentativas seguidas. Espere um pouco e tente de novo."],
    [/not authorized/i, "Este e-mail não pode receber mensagens agora. Use e-mail e senha."],
    [/Email not confirmed/i, "O e-mail ainda não foi confirmado."],
    [/permission denied|row-level security|violates row-level/i, "Você não tem permissão para isso."],
    [/JWT expired|invalid JWT/i, "Sua sessão expirou. Entre de novo."],
    [/weak_password|weak password|known to be weak|should contain at least one character/i, "Senha fraca. Use pelo menos 10 caracteres, com letras e números."],
    [/otp_expired|email link is invalid or has expired|token has expired or is invalid/i, "Este link expirou ou já foi usado. Peça um novo."],
    [/captcha/i, "Não foi possível confirmar que você não é um robô. Tente de novo."],
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
  const SEM_REDE = "Sem conexão com o servidor. Seus dados continuam salvos neste aparelho.";
  const erroDeRede = (e) => !!e && (/retryable|fetch/i.test(String(e.name || "")) || /failed to fetch|networkerror|load failed|network request failed|sem conexão/i.test(String(e.message || "")) || (typeof navigator !== "undefined" && navigator.onLine === false));
  const comoErro = (e) => { const x = new Error(erroDeRede(e) ? SEM_REDE : traduz(String((e && e.message) || e || "Erro"))); x.status = e && e.status; x.codigo = e && e.code; x.detalhe = e; if (erroDeRede(e)) x.semRede = true; return x; };
  const exigirSdk = () => { if (!sb) throw new Error("Não foi possível carregar o módulo de login. Recarregue a página."); return sb.auth; };

  async function http(url, opt) {
    let r;
    try { r = await fetch(url, opt); } catch (e) { const x = new Error(SEM_REDE); x.semRede = true; throw x; }
    let txt;
    try { txt = await r.text(); }
    catch (_) { const e = new Error(SEM_REDE); e.semRede = true; throw e; }
    let j = null, jsonInvalido = false;
    try { j = txt ? JSON.parse(txt) : null; } catch (_) { jsonInvalido = true; }
    if (!r.ok) {
      const m = (j && (j.message || j.msg || j.error_description || j.error)) || r.statusText || "Erro " + r.status;
      const e = new Error(traduz(String(m))); e.status = r.status; e.detalhe = j; throw e;
    }
    if (jsonInvalido) throw new Error("O servidor retornou uma resposta inválida. Confira os dados antes de tentar novamente.");
    return j;
  }
  const JSONH = { apikey: C.chave, "Content-Type": "application/json" };
  /* token de acesso: o SDK renova sozinho quando falta pouco. Sem internet, nada de "Faça login": avisa que está sem conexão. */
  async function token() {
    if (!sb) return null;
    let r;
    try { r = await sb.auth.getSession(); } catch (e) { if (erroDeRede(e)) throw new Error(SEM_REDE); return null; }
    if (r && r.data && r.data.session) return r.data.session.access_token;
    if (r && r.error && erroDeRede(r.error)) { const x = new Error(SEM_REDE); x.semRede = true; throw x; }
    return null;
  }

  /* ---------- login ---------- */
  const comCaptcha = (extra, captcha) => (captcha ? { ...extra, captchaToken: captcha } : extra);
  /* Com “Confirm email” ligado no Supabase o servidor NÃO devolve sessão: a conta só vale depois do link enviado ao e-mail.
     Retorna { confirmar: true } nesse caso (o app mostra a orientação); retorna o usuário só se o projeto ainda não exigir confirmação.
     O token do CAPTCHA (Turnstile) só é enviado quando existir; hoje o CAPTCHA está desligado até a configuração ser feita. */
  async function cadastrar(email, senha, nome, voltarPara, captcha) {
    const v = validarSenha(senha); if (!v.ok) throw new Error(v.erro);
    const { data, error } = await exigirSdk().signUp({ email, password: senha, options: comCaptcha({ data: { nome: nome || "" }, emailRedirectTo: voltarPara || location.href.split("#")[0] }, captcha) });
    if (error) throw comoErro(error);
    if (!data || !data.session) return { confirmar: true, email };
    return usuarioAtual;
  }
  async function reenviarConfirmacao(email, voltarPara, captcha) {
    const { error } = await exigirSdk().resend({ type: "signup", email, options: comCaptcha({ emailRedirectTo: voltarPara || location.href.split("#")[0] }, captcha) });
    if (error) throw comoErro(error);
  }
  /* A resposta é sempre a mesma, exista ou não a conta (não revela quais e-mails estão cadastrados). */
  async function esqueciSenha(email, voltarPara, captcha) {
    const { error } = await exigirSdk().resetPasswordForEmail(email, comCaptcha({ redirectTo: voltarPara || location.href.split("#")[0] }, captcha));
    if (error && !(error.status && error.status < 500 && error.status !== 429 && !/captcha/i.test(error.message || ""))) throw comoErro(error);
  }
  async function entrar(email, senha, captcha) {
    const { data, error } = await exigirSdk().signInWithPassword({ email, password: senha, options: comCaptcha({}, captcha) });
    if (error) throw comoErro(error);
    usuarioAtual = simples(data.user);
    return usuarioAtual;
  }
  async function linkMagico(email, voltarPara, captcha) {
    const { error } = await exigirSdk().signInWithOtp({ email, options: comCaptcha({ emailRedirectTo: voltarPara || location.href.split("#")[0], shouldCreateUser: true }, captcha) });
    if (error) throw comoErro(error);
  }
  /* sessão da versão anterior do aplicativo (chave nuvem_sessao): entregue ao SDK uma vez; só é apagada se der certo
     ou se o servidor a rejeitar de vez. Sem internet, fica guardada para a próxima abertura. */
  async function migrarSessaoAntiga() {
    const antiga = lerSessaoGuardada(CHAVE_ANTIGA); if (!antiga || !sb) return;
    try {
      const atual = await sb.auth.getSession();
      if (atual && atual.data && atual.data.session) { armazem.removeItem(CHAVE_ANTIGA); return; }
      const { error } = await sb.auth.setSession({ access_token: antiga.access_token, refresh_token: antiga.refresh_token });
      if (!error || !erroDeRede(error)) armazem.removeItem(CHAVE_ANTIGA);
    } catch (e) { if (!erroDeRede(e)) armazem.removeItem(CHAVE_ANTIGA); }
  }
  /* chamar ao abrir a página: o SDK já trocou o código do link por sessão (PKCE); aqui se aguarda isso, se aproveita um link
     antigo (tokens no endereço) e se informa o tipo (signup, recovery...). */
  async function retornoDoLink() {
    if (erroDoLink) { const m = erroDoLink.replace(/\+/g, " "); erroDoLink = ""; throw new Error(traduz(m)); }
    if (!sb) return usuarioAtual;
    try { await sb.auth.getSession(); } catch (_) {}
    if (tokensNoEndereco) {
      const t = tokensNoEndereco; tokensNoEndereco = null;
      try {
        const atual = await sb.auth.getSession();
        if (!(atual && atual.data && atual.data.session)) { const { error } = await sb.auth.setSession({ access_token: t.access_token, refresh_token: t.refresh_token }); if (error) throw comoErro(error); }
        tipoRetorno = tipoRetorno || t.type;
        history.replaceState(null, "", location.pathname + location.search);
      } catch (e) { if (!erroDeRede(e)) throw e; }
    }
    await migrarSessaoAntiga();
    return usuarioAtual;
  }
  /* Sair VOLUNTARIAMENTE. Padrão: só este aparelho. Mesmo sem internet a sessão local é removida (a do servidor expira sozinha);
     os dados do usuário no aparelho (criações, combates, preferências) nunca são apagados. */
  async function encerrar(escopo) {
    const limpar = () => { armazem.removeItem(CHAVE_SESSAO); armazem.removeItem(CHAVE_SESSAO + "-code-verifier"); armazem.removeItem(CHAVE_ANTIGA); usuarioAtual = null; };
    if (sb) { try { await sb.auth.signOut({ scope: escopo }); } catch (_) {} }
    const tinha = !!usuarioAtual || !!lerSessaoGuardada(CHAVE_SESSAO);
    limpar(); if (tinha) avisar();
  }
  const sair = () => encerrar("local");
  const sairDeTodos = () => encerrar("global");
  /* Troca de senha. Sem depender só do navegador:
     1) sem CAPTCHA configurado, a senha atual é conferida pelo servidor (novo login com ela); 2) o pedido leva `current_password`
     (o Supabase recusa se “Require current password” estiver ligado e ela não bater) e, quando “Secure password change” exige,
     o código `nonce` enviado ao e-mail (reautenticar()). Quem chegou por link de recuperação pode definir a senha sem a atual. */
  async function trocarSenha(nova, atual, codigo) {
    const v = validarSenha(nova); if (!v.ok) throw new Error(v.erro);
    if (!usuarioAtual) throw new Error("Faça login.");
    if (atual !== undefined && atual !== null) {
      if (!atual) throw new Error("Informe a senha atual.");
      if (atual === nova) throw new Error("A nova senha precisa ser diferente da atual.");
      if (!C.turnstileSiteKey) {
        try { await entrar(usuarioAtual.email, atual); }
        catch (e) { throw new Error(e.status === 400 || e.status === 401 || /incorretos/.test(e.message) ? "A senha atual está incorreta." : e.message); }
      }
    }
    const atributos = { password: nova };
    if (atual) atributos.current_password = atual;
    if (codigo) atributos.nonce = String(codigo).trim();
    const { error } = await exigirSdk().updateUser(atributos);
    if (error) { const e = comoErro(error); if (/reauthentication|nonce|reauth/i.test(String(error.message || "") + String(error.code || ""))) e.reautenticar = true; throw e; }
  }
  async function reautenticar() {
    const { error } = await exigirSdk().reauthenticate();
    if (error) throw comoErro(error);
  }

  /* ---------- para onde voltar depois de entrar ---------- */
  /* só páginas do próprio aplicativo (nome.html com parâmetros simples): nunca outro site nem endereço montado */
  const PAGINAS = ["index.html", "conta.html", "campanha.html", "personagem.html", "criar-personagem.html", "iniciativa.html", "licencas.html"];
  function destinoSeguro(v) {
    v = String(v == null ? "" : v);
    const m = /^([a-z0-9-]+\.html)(\?[A-Za-z0-9=&._%-]*)?$/.exec(v);
    return m && PAGINAS.includes(m[1]) ? v : "";
  }
  function entradaUrl(depois) {
    const atual = depois !== undefined ? depois : (String(location.pathname || "").split("/").pop() || "index.html") + (location.search || "");
    const d = destinoSeguro(atual);
    return "entrar.html" + (d && !/^(entrar|index)\.html/.test(d) ? "?voltar=" + encodeURIComponent(d) : "");
  }

  /* ---------- tabelas (PostgREST) ---------- */
  async function rest(metodo, caminho, corpo, extra, jaRenovou) {
    const t = await token(); if (!t) throw new Error("Faça login.");
    const h = { apikey: C.chave, Authorization: "Bearer " + t, ...(extra || {}) };
    if (corpo !== undefined) h["Content-Type"] = "application/json";
    if (metodo !== "GET" && metodo !== "DELETE" && !h.Prefer) h.Prefer = "return=representation";
    try { return await http(`${base}/rest/v1/${caminho}`, { method: metodo, headers: h, body: corpo !== undefined ? JSON.stringify(corpo) : undefined }); }
    catch (e) {
      /* token vencido entre a leitura e o envio: renova uma vez e repete; se a renovação falhar por falta de internet, só avisa */
      if (!jaRenovou && e.status === 401 && /expired|JWT/i.test(JSON.stringify(e.detalhe || "") + e.message) && sb) {
        try { await sb.auth.refreshSession(); } catch (_) {}
        return rest(metodo, caminho, corpo, extra, true);
      }
      throw e;
    }
  }

  /* ---------- arquivos (Storage) ---------- */
  async function enviarArquivo(caminho, arquivo, bucket = "documentos") {
    const t = await token(); if (!t) throw new Error("Faça login.");
    return http(`${base}/storage/v1/object/${encodeURIComponent(bucket)}/${caminho.split("/").map(encodeURIComponent).join("/")}`, { method: "POST", headers: { apikey: C.chave, Authorization: "Bearer " + t, "Content-Type": arquivo.type || "application/octet-stream", "x-upsert": "false" }, body: arquivo });
  }
  async function urlDoArquivo(caminho, segundos, bucket = "documentos") {
    const t = await token(); if (!t) throw new Error("Faça login.");
    const j = await http(`${base}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${caminho.split("/").map(encodeURIComponent).join("/")}`, { method: "POST", headers: { ...JSONH, Authorization: "Bearer " + t }, body: JSON.stringify({ expiresIn: segundos || 600 }) });
    return `${base}/storage/v1${j.signedURL}`;
  }
  async function apagarArquivos(caminhos, bucket = "documentos") {
    const t = await token(); if (!t) throw new Error("Faça login.");
    return http(`${base}/storage/v1/object/${encodeURIComponent(bucket)}`, { method: "DELETE", headers: { ...JSONH, Authorization: "Bearer " + t }, body: JSON.stringify({ prefixes: caminhos }) });
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
    usuario: () => usuarioAtual,
    aoMudar: (f) => ouvintes.push(f),
    destinoSeguro, entradaUrl,
    online: () => typeof navigator === "undefined" || navigator.onLine !== false,
    cadastrar, reenviarConfirmacao, esqueciSenha, entrar, linkMagico, retornoDoLink, retornoTipo: () => tipoRetorno, sair, sairDeTodos, trocarSenha, reautenticar, validarSenha, SENHA_MIN,
    get: (c) => rest("GET", c), post: (c, o, h) => rest("POST", c, o, h), patch: (c, o) => rest("PATCH", c, o), apagar: (c) => rest("DELETE", c),
    rpc: (nome, args) => rest("POST", "rpc/" + nome, args || {}),
    catalogoPublico: (campos) => http(`${base}/rest/v1/catalogo_publicado?select=${campos === 'atualizado_em' ? 'atualizado_em' : 'dados,atualizado_em'}&id=eq.2014`, {headers:{apikey:C.chave},cache:'no-store'}),
    /* só caminhos de imagem do catálogo (itens e monstros), legíveis por visitantes sem conta; exige a função public.catalogo_imagens_publicas (docs/PLANO-IMAGENS-PUBLICAS.md) */
    catalogoImagensPublicas: () => http(`${base}/rest/v1/rpc/catalogo_imagens_publicas`, { method: "POST", headers: { apikey: C.chave, "Content-Type": "application/json" }, body: "{}", cache: "no-store" }),
    enviarArquivo, urlDoArquivo, apagarArquivos, observar, esc, olhos, copiar
  };
})();
