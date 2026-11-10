const CACHE = "rastreador-v1"; // mude o número quando quiser forçar todos os aparelhos a baixar tudo de novo
const ESSENCIAIS = ["./", "index.html", "manifest.json", "css/estilo.css", "js/iniciativa.js", "js/app.js", "dados/srd-pt.json", "icones/icone-192.png"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESSENCIAIS)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return; // GitHub e Open5e sempre pela rede
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const salvo = await c.match(e.request);
    const rede = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => salvo);
    return salvo || rede;
  }));
});
