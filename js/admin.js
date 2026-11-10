(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const b64e = (str) => { const u = new TextEncoder().encode(str); let bin = ""; for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(bin); };
  const pubName = (k) => "fotos/" + String(k).replace(/[^\w.-]/g, "_") + ".jpg";
  const srcOf = (m) => m?.document?.display_name || m?.document?.key || "?";
  const siteRepo = () => { const p = location.pathname.split("/")[1]; return /\.github\.io$/.test(location.hostname) && p && !/\.html$/.test(p) ? `${location.hostname.split(".")[0]}/${p}` : ""; };
  const msg = (t) => { $("#pub-status").innerHTML = t; };
  let ALL = [], SP = [], PH = {}, PUB = new Set(), PACKS = [];

  const getAll = (db, s) => new Promise((ok, no) => { const r = db.transaction(s).objectStore(s).getAll(); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  async function carregar() {
    const db = await new Promise((ok, no) => {
      const o = indexedDB.open("bestiario", 3);
      o.onupgradeneeded = () => { for (const s of ["mon", "spl", "img"]) if (!o.result.objectStoreNames.contains(s)) o.result.createObjectStore(s, { keyPath: "key" }); };
      o.onsuccess = () => ok(o.result); o.onerror = () => no(o.error);
    });
    ALL = await getAll(db, "mon"); SP = await getAll(db, "spl");
    PH = Object.fromEntries((await getAll(db, "img")).map((x) => [x.key, x.data]));
    db.close();
    try { const r = await fetch("fotos/index.json", { cache: "no-cache" }); if (r.ok) PUB = new Set(await r.json()); } catch (_) {}
    try { const r = await fetch("dados/bestiario/index.json", { cache: "no-cache" }); if (r.ok) PACKS = await r.json(); } catch (_) {}
    const fotos = ALL.filter((m) => !m.custom && PH[m.key]).length;
    const keys = [...new Set([...ALL.filter((m) => !m.custom).map((m) => m.document?.key), ...SP.map((s) => s.document?.key)])].filter((k) => /^srd-20/.test(k || ""));
    $("#resumo").textContent = `Neste navegador: ${fotos} fotos de monstros da API e ${keys.length} coleções SRD (${keys.join(", ") || "nenhuma"}). Já publicadas no site: ${PUB.size} fotos e ${PACKS.length} pacotes.`;
  }

  $("#pub-go").onclick = async () => {
    const repo = $("#pub-repo").value.trim(), tok = $("#pub-token").value.trim();
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !tok) { msg("Informe o repositório do site e o token de publicação."); return; }
    const H = { Authorization: "Bearer " + tok, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" };
    const gh = async (path, opt = {}) => {
      const r = await fetch("https://api.github.com/repos/" + repo + path, { ...opt, headers: H, cache: "no-store" });
      if (!r.ok) throw new Error(`GitHub respondeu ${r.status}` + (r.status === 401 || r.status === 403 || r.status === 404 ? ": confira se o token vale para este repositório e tem Contents (leitura e escrita)" : ""));
      return r.json();
    };
    $("#pub-go").disabled = true;
    try {
      const files = [], chaves = new Set(PUB);
      const fotos = ALL.filter((m) => !m.custom && PH[m.key]);
      for (const m of fotos) { files.push({ path: pubName(m.key), b64: PH[m.key].split(",")[1] }); chaves.add(m.key); }
      if (fotos.length) files.push({ path: "fotos/index.json", b64: b64e(JSON.stringify([...chaves].sort()) + "\n") });
      const keys = [...new Set([...ALL.filter((m) => !m.custom).map((m) => m.document?.key), ...SP.map((s) => s.document?.key)])].filter((k) => /^srd-20/.test(k || ""));
      const idx = PACKS.filter((p) => !keys.includes(p.key)), v = Date.now();
      for (const k of keys) {
        const monsters = ALL.filter((m) => !m.custom && m.document?.key === k), spells = SP.filter((s) => s.document?.key === k), name = srcOf(monsters[0] || spells[0]);
        files.push({ path: "dados/bestiario/" + encodeURIComponent(k) + ".json", b64: b64e(JSON.stringify({ v: 1, key: k, name, monsters, spells })) });
        idx.push({ key: k, name, monsters: monsters.length, spells: spells.length, v });
      }
      if (keys.length) files.push({ path: "dados/bestiario/index.json", b64: b64e(JSON.stringify(idx) + "\n") });
      if (!files.length) { msg("Nada para publicar: não há fotos suas de monstros da API nem coleções SRD baixadas neste navegador."); $("#pub-go").disabled = false; return; }
      msg("Conectando ao GitHub…");
      const info = await gh(""), branch = info.default_branch;
      const parent = (await gh(`/git/ref/heads/${branch}`)).object.sha, base = (await gh(`/git/commits/${parent}`)).tree.sha;
      let feitos = 0, prox = 0;
      const worker = async () => { while (prox < files.length) { const f = files[prox++]; f.sha = (await gh("/git/blobs", { method: "POST", body: JSON.stringify({ content: f.b64, encoding: "base64" }) })).sha; msg(`Enviando arquivos… ${++feitos} de ${files.length}`); } };
      await Promise.all([worker(), worker(), worker(), worker()]);
      const tree = await gh("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: base, tree: files.map((f) => ({ path: f.path, mode: "100644", type: "blob", sha: f.sha })) }) });
      const commit = await gh("/git/commits", { method: "POST", body: JSON.stringify({ message: "Fotos e bestiário SRD (publicado pelo site)", tree: tree.sha, parents: [parent] }) });
      await gh(`/git/refs/heads/${branch}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha }) });
      $("#pub-token").value = "";
      msg(`Publicado: ${fotos.length} fotos e ${keys.length} pacotes. O site atualiza em 1 a 2 minutos.`);
    } catch (e) { console.error(e); msg(`<span class="err">Falha ao publicar: ${esc(e.message)}</span>`); }
    $("#pub-go").disabled = false;
  };

  $("#pub-repo").value = siteRepo();
  carregar().catch((e) => { $("#resumo").innerHTML = `<span class="err">Não consegui ler os dados deste navegador (${esc(e.message)}).</span>`; });
})();
