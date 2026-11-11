/* Dados públicos do projeto Supabase. A chave "publishable" é pública por desenho:
   a proteção está nas regras de acesso do banco (supabase/01-schema.sql), não no segredo da chave. */
window.NUVEM_CONFIG = {
  // Ativar somente depois de aplicar supabase/02-acervos-e-transferencia.sql.
  acervoPorConta: true,
  // Cloudflare Turnstile: chave PÚBLICA do site (a chave secreta fica só no painel do Supabase). Vazia = CAPTCHA desligado.
  // Só ligar depois de ativar o CAPTCHA no Supabase e testar o fluxo completo (docs/SEGURANCA-SUPABASE.md).
  turnstileSiteKey: "",
  url: "https://pdjzahpxjrlbqqtzkfdr.supabase.co",
  chave: "sb_publishable_Dmn37V7U9S-atPdlFYndWg_lY-XnBDK"
};
