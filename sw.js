const CACHE = "rastreador-v21"; // mude o número quando quiser limpar o que está guardado nos aparelhos
const ESSENCIAIS = ["./", "index.html", "manifest.json", "css/estilo.css", "js/icones.js", "js/iniciativa.js", "js/app.js", "dados/srd-pt.json", "icones/icone-192.png", "icones/favicon-32.png", "favicon.ico"];
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
