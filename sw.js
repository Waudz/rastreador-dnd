const CACHE = "rastreador-v107"; // mude o número quando quiser limpar o que está guardado nos aparelhos
const ESSENCIAIS = ["js/recursos.js", "js/jogo.js", "js/jogo-ui.js", "js/magias-jogo.js", "js/inventario.js", "js/itens-efeitos.js", "css/fluxos.css", "js/feedback.js", "js/leitor-fichas.js", "js/estado-secao.js", "js/enquadramento.js", "js/menus.js", "css/mobile.css", "js/leitura-mobile.js", "js/menu-ficha.js", "js/campanha-imagens.js", "js/splash.js", "js/esqueleto.js", "js/pre-pagina.js", "js/dados-locais.js", "entrar.html", "js/entrar.js", "js/turnstile.js", "vendor/supabase/supabase.js", "js/backup.js", "licencas.html", "dados/magias.json", "icones/compendio-apple-touch.png", "icones/compendio-maskable-512.png", "icones/compendio-maskable-192.png", "icones/compendio-app-512.png", "icones/compendio-simbolo.png", "icones/compendio-logo-96.png", "icones/compendio-logo-192.png", "./", "index.html", "conta.html", "iniciativa.html", "personagem.html", "campanha.html", "criar-personagem.html", "js/criador.js", "js/criador-regras.js", "js/origens.js", "js/ajuda-regras.js", "dados/criacao-srd2014.json", "js/navegacao.js", "js/painel-detalhes.js", "admin.html", "js/admin.js", "js/admin-redirecionar.js", "js/conta.js", "js/campanhas-ui.js", "js/interface.js", "js/personagem.js", "js/ficha-ui.js", "js/ficha-componentes.js", "js/ficha-monstro.js", "js/rolagens.js", "js/regras.js", "js/texto-regras.js", "js/subclasses-2014.js", "js/paineis.js", "js/catalogo.js", "js/nuvem.js", "js/config-nuvem.js", "js/foto.js", "js/acervo.js", "js/personagens-dados.js", "js/campanha.js", "js/campanha-ini.js", "manifest.json", "css/estilo.css", "css/identidade.css", "css/fichas.css", "css/grupo-personagens.css", "css/campanha-visual.css", "js/campanha-visual.js", "js/grupo-personagens.js", "css/magias.css", "js/magias-ui.js", "js/icones.js", "js/iniciativa.js", "js/app.js", "js/paineis-layout.js", "js/edicoes.js", "dados/srd-pt.json", "icones/compendio-app-192.png", "icones/compendio-favicon-16.png", "icones/compendio-favicon-32.png", "icones/compendio-favicon-48.png", "icones/compendio-favicon.ico", "favicon.ico"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESSENCIAIS.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));
/* Sem internet: a cópia guardada daquela URL; se a URL tem outra busca (ex.: iniciativa.html?aba=iniciativa, campanha.html?id=...),
   a cópia da mesma página sem considerar a busca (a página lê a busca em JavaScript); e, para navegação, a página inicial guardada.
   Nunca devolve "nada": isso viraria a tela de erro do navegador ("Não é possível acessar esse site"). */
function offline(req) {
  return caches.match(req)
    .then((r) => r || caches.match(req, { ignoreSearch: true }))
    .then((r) => r || (req.mode === "navigate" ? caches.match("index.html") : null))
    .then((r) => r || Response.error());
}
// com internet, sempre a versão mais nova; sem internet, a que está guardada
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return; // GitHub e Open5e sempre pela rede
  e.respondWith(fetch(e.request.url, { cache: "no-cache" }).then((r) => {
    if (r.ok) { const k = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, k)); }
    return r;
  }).catch(() => offline(e.request)));
});
