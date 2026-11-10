const CACHE = "rastreador-v13"; // mude o número quando quiser forçar todos os aparelhos a baixar tudo de novo
const ESSENCIAIS = ["./", "index.html", "manifest.json", "css/estilo.css", "js/icones.js", "js/iniciativa.js", "js/app.js", "dados/srd-pt.json", "icones/icone-192.png", "icones/favicon-32.png", "favicon.ico"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESSENCIAIS.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return; // GitHub e Open5e sempre pela rede
  if (/\/(dados\/bestiario\/|fotos\/index\.json)/.test(u.pathname)) { // listas e pacotes publicados: sempre tenta a versão nova
    e.respondWith(fetch(new Request(e.request, { cache: "no-cache" })).then((r) => { if (r.ok) { const k = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, k)); } return r; }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const salvo = await c.match(e.request);
    const rede = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => salvo);
    return salvo || rede;
  }));
});
