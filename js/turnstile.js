/* Cloudflare Turnstile: usado SOMENTE na página de entrada (entrar.html), para cadastro, login manual e recuperação de senha.
   Nunca em navegação, iniciativa, monstros, magias ou renovação da sessão. Sem chave configurada (padrão), não faz nada. */
window.TURNSTILE = (() => {
  "use strict";
  const chave = () => (window.NUVEM_CONFIG || {}).turnstileSiteKey || "";
  const ativo = () => !!chave();
  let carregando = null, widget = null, pendente = null;
  const carregar = () => carregando || (carregando = new Promise((ok, no) => {
    if (window.turnstile) return ok(window.turnstile);
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; s.async = true;
    s.onload = () => ok(window.turnstile);
    s.onerror = () => { carregando = null; no(new Error("Não foi possível carregar a verificação de segurança. Confira sua conexão e tente de novo.")); };
    document.head.appendChild(s);
  }));
  /* devolve um token novo (uso único) ou undefined quando o CAPTCHA está desligado. O desafio só aparece se o Cloudflare achar necessário. */
  async function obter() {
    if (!ativo()) return undefined;
    const t = await carregar();
    return new Promise((ok, no) => {
      const limite = setTimeout(() => { pendente = null; no(new Error("A verificação de segurança demorou demais. Tente de novo.")); }, 30000);
      pendente = { ok: (v) => { clearTimeout(limite); pendente = null; ok(v); }, no: (e) => { clearTimeout(limite); pendente = null; no(e); } };
      if (widget === null) {
        widget = t.render(document.querySelector("#captcha"), {
          sitekey: chave(), execution: "execute", appearance: "interaction-only",
          callback: (tok) => { if (pendente) pendente.ok(tok); },
          "error-callback": () => { if (pendente) pendente.no(new Error("Falha na verificação de segurança. Tente de novo.")); },
          "expired-callback": () => {}
        });
      } else t.reset(widget);
      t.execute(widget);
    });
  }
  return { ativo, obter };
})();
