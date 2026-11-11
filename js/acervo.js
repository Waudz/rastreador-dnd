/* Biblioteca privada da conta. Cada operação mantém a identidade com que começou. */
(() => {
  "use strict";
  const usuario = () => window.nuvem && nuvem.usuario();
  const banco = () => usuario() ? "bestiario_" + usuario().id : "bestiario_publico";
  const chave = k => k + "_" + (usuario() ? usuario().id : "publico");
  function identidade() {
    const u = usuario();
    if (!u) throw new Error("Entre na sua conta.");
    return { id: u.id, email: String(u.email || "").toLowerCase() };
  }
  function conferir(conta) {
    if (usuario()?.id !== conta.id) throw new Error("A conta mudou durante a operação. Entre novamente e tente de novo.");
  }
  function validar(d) {
    const objeto = x => x && typeof x === "object" && !Array.isArray(x);
    if (!objeto(d) || (!d.items && !d.tr && !d.ldj)) throw new Error("Backup inválido.");
    for (const k of ["items", "deleted", "tr", "ldj"]) {
      if (d[k] !== undefined && !objeto(d[k])) throw new Error("Campo inválido no backup: " + k);
    }
    for (const [key, m] of Object.entries(d.items || {})) {
      if (!objeto(m) || key !== m.key || !m.custom || typeof m.name !== "string") throw new Error("Criação inválida no backup.");
    }
    return d;
  }
  function abrir(conta) {
    conferir(conta);
    return new Promise((ok, no) => {
      const r = indexedDB.open("bestiario_" + conta.id, 3);
      r.onupgradeneeded = () => ["mon", "spl", "img"].forEach(s => {
        if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: "key" });
      });
      r.onsuccess = () => ok(r.result);
      r.onerror = () => no(r.error);
      r.onblocked = () => no(new Error("Feche as outras abas do rastreador e tente novamente."));
    });
  }
  async function aplicar(d, conta = identidade()) {
    conferir(conta);

    let locais = {}; try { locais = JSON.parse(localStorage.getItem("ini_tomb_" + conta.id) || "{}"); } catch (_) {}
    const deleted = { ...(d.deleted || {}) };
    for (const [k,ts] of Object.entries(locais || {})) if (Number(ts) > Number(deleted[k] || 0)) deleted[k] = ts;
    d = { ...d, deleted };
    const db = await abrir(conta);
    try {
      conferir(conta);
      await new Promise((ok, no) => {
        const t = db.transaction(["mon", "img"], "readwrite"), mon = t.objectStore("mon"), img = t.objectStore("img");
        const cancelou = () => { try { conferir(conta); return false; } catch (_) { t.abort(); return true; } };
        Object.entries(d.deleted || {}).forEach(([k, ts]) => {
          const q = mon.get(k);
          q.onsuccess = () => { if (cancelou()) return; if (!q.result || (q.result.updatedAt || 0) <= ts) { mon.delete(k); img.delete(k); } };
        });
        Object.values(d.items || {}).forEach(m => {
          if (!m || typeof m.key !== "string" || !m.custom) return;
          const q = mon.get(m.key);
          q.onsuccess = () => {
            if (cancelou()) return;
            const morte = Number(d.deleted?.[m.key] || 0);
            if (morte && morte >= (m.updatedAt || 0)) return;
            if (q.result && (q.result.updatedAt || 0) > (m.updatedAt || 0)) return;
            const copia = { ...m }; delete copia.photo; mon.put(copia);
            if (m.photo && /^data:image\//.test(m.photo)) img.put({ key: m.key, data: m.photo });
            else if (m.photo === "") img.delete(m.key);
          };
        });
        t.oncomplete = ok;
        t.onerror = () => no(t.error || new Error("Não foi possível gravar o acervo."));
        t.onabort = () => no(new Error("A gravação foi cancelada. Confira a conta e tente novamente."));
      });
    } finally { db.close(); }
    conferir(conta);
    const gravar = (k, v) => localStorage.setItem(k + "_" + conta.id, JSON.stringify(v));
    gravar("ini_tomb", d.deleted || {});
    if (d.tr) gravar("ini_tr", d.tr);
    if (d.ldj) gravar("ini_ldj", d.ldj);
  }
  async function mesclar(d, conta = identidade()) {
    conferir(conta);
    const salvo = await nuvem.rpc("mesclar_acervo", { p_dados: d });
    conferir(conta);
    return salvo;
  }
  async function importar(d) {
    validar(d);
    const conta = identidade();
    if (d.destino && String(d.destino).toLowerCase() !== conta.email) throw new Error("Entre com o e-mail de destino do backup.");
    const salvo = await mesclar(d, conta);
    await aplicar(salvo, conta);
    conferir(conta);
    localStorage.removeItem("ini_sync");
    return Object.keys(salvo.items || {}).length;
  }
  async function baixar() {
    const conta = identidade();
    const r = await nuvem.get("acervos?select=dados&usuario_id=eq." + conta.id);
    conferir(conta);
    const d = r[0]?.dados || {};
    await aplicar(d, conta);
    return d;
  }
  window.acervo = { banco, chave, aplicar, mesclar, importar, baixar, validar };
})();
