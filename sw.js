const CACHE = "rastreador-v67"; // mude o número quando quiser limpar o que está guardado nos aparelhos
const ESSENCIAIS = ["./", "index.html", "conta.html", "iniciativa.html", "personagem.html", "campanha.html", "criar-personagem.html", "js/criador.js", "js/criador-regras.js", "js/origens.js", "js/ajuda-regras.js", "dados/criacao-srd2014.json", "js/navegacao.js", "js/painel-detalhes.js", "admin.html", "js/admin.js", "js/admin-redirecionar.js", "js/conta.js", "js/campanhas-ui.js", "js/interface.js", "js/personagem.js", "js/ficha-ui.js", "js/ficha-componentes.js", "js/ficha-monstro.js", "js/rolagens.js", "js/regras.js", "js/texto-regras.js", "js/subclasses-2014.js", "js/paineis.js", "js/catalogo.js", "js/nuvem.js", "js/config-nuvem.js", "js/foto.js", "js/acervo.js", "js/personagens-dados.js", "js/campanha.js", "js/campanha-ini.js", "manifest.json", "css/estilo.css", "css/identidade.css", "css/fichas.css", "css/magias.css", "js/magias-ui.js", "js/icones.js", "js/iniciativa.js", "js/app.js", "js/paineis-layout.js", "js/edicoes.js", "dados/srd-pt.json", "icones/icone-192.png", "icones/favicon-32.png", "favicon.ico"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESSENCIAIS.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));
// com internet, sempre a versão mais nova; sem internet, a que está guardada
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return; // GitHub e Open5e sempre pela rede
  e.respondWith(fetch(e.request.url, { cache: "no-cache" }).then((r) => {
    if (r.ok) { const k = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, k)); }
    return r;
  }).catch(() => caches.match(e.request)));
});
