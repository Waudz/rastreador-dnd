/* Biblioteca privada da conta. Cada operação mantém a identidade com que começou. */
(() => {
  "use strict";
  const usuario = () => window.nuvem && nuvem.usuario();
  const ativo = () => window.NUVEM_CONFIG?.acervoPorConta === true;
  const LIMITE_ITENS = 2000, LIMITE_BYTES = 20 * 1048576;
  const exigirAtivo = () => { if(!ativo())throw new Error("A migração dos dados para a conta ainda não foi concluída. Seus dados locais foram preservados."); };
  const banco = () => !ativo() ? "bestiario" : usuario() ? "bestiario_" + usuario().id : "bestiario_publico";
  const chave = k => ativo() ? k + "_" + (usuario() ? usuario().id : "publico") : k;
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
    if (!objeto(d) || (!d.items && !d.tr)) throw new Error("Backup inválido.");
    for (const k of ["items", "deleted", "tr"]) {
      if (d[k] !== undefined && !objeto(d[k])) throw new Error("Campo inválido no backup: " + k);
    }
    const chaves = Object.keys(d.items || {});
    if (chaves.length > LIMITE_ITENS) throw new Error("O backup tem criações demais (máximo " + LIMITE_ITENS + ").");
    for (const [key, m] of Object.entries(d.items || {})) {
      if (!objeto(m) || key !== m.key || !m.custom || typeof m.name !== "string") throw new Error("Criação inválida no backup.");
      if (m.photo !== undefined && m.photo !== "" && !/^data:image\//.test(String(m.photo))) throw new Error("Foto inválida no backup.");
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
    exigirAtivo();
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
  }
  async function mesclar(d, conta = identidade()) {
    exigirAtivo();
    conferir(conta);
    const salvo = await nuvem.rpc("mesclar_acervo", { p_dados: d });
    conferir(conta);
    return salvo;
  }
  async function importar(d) {
    exigirAtivo();
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
    if(!ativo()) return {};
    const conta = identidade();
    const r = await nuvem.get("acervos?select=dados&usuario_id=eq." + conta.id);
    conferir(conta);
    const d = r[0]?.dados || {};
    await aplicar(d, conta);
    return d;
  }
  async function sincronizar(){
    exigirAtivo();const conta=identidade(),db=await abrir(conta);
    let mon,img;
    try{[mon,img]=await Promise.all(['mon','img'].map(s=>new Promise((ok,no)=>{const r=db.transaction(s).objectStore(s).getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);})));}finally{db.close();}
    conferir(conta);const fotos=Object.fromEntries(img.map(i=>[i.key,i.data]));
    const ler=k=>{try{return JSON.parse(localStorage.getItem(k+'_'+conta.id)||'{}');}catch(_){return {};}};
    const dados={v:1,items:Object.fromEntries(mon.filter(m=>m.custom).map(m=>[m.key,{...m,photo:fotos[m.key]||''}])),deleted:ler('ini_tomb'),tr:ler('ini_tr')};
    const salvo=await mesclar(dados,conta);await aplicar(salvo,conta);conferir(conta);
    localStorage.setItem('ini_sync_status_'+conta.id,JSON.stringify({mensagem:'Sincronizado com sua conta',em:Date.now()}));
    return salvo;
  }
  /* ---------- backup, restauração e recuperação do navegador antigo ----------
     Regras: nada é apagado e nada é sobrescrito sem o usuário confirmar; exclusões ("deleted") de um backup NUNCA são aplicadas. */
  const lerStore = (db, s) => new Promise((ok, no) => { const r = db.transaction(s).objectStore(s).getAll(); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  const lerJSON = (k) => { try { return JSON.parse(localStorage.getItem(k) || "{}") || {}; } catch (_) { return {}; } };
  async function exportar() {
    exigirAtivo();
    const conta = identidade();
    try { await baixar(); } catch (_) {}                    // alinha com a conta antes (outro aparelho pode ter criado algo); sem rede, exporta o que há aqui
    const db = await abrir(conta);
    let mon, img;
    try { [mon, img] = await Promise.all([lerStore(db, "mon"), lerStore(db, "img")]); } finally { db.close(); }
    conferir(conta);
    const fotos = Object.fromEntries(img.map(i => [i.key, i.data]));
    return { v: 1, tipo: "backup-criacoes", criadoEm: new Date().toISOString(), origem: conta.email,
      items: Object.fromEntries(mon.filter(m => m.custom).map(m => [m.key, { ...m, photo: fotos[m.key] || "" }])),
      deleted: {}, tr: lerJSON("ini_tr_" + conta.id) };
  }
  async function itensDaConta(conta) {
    const db = await abrir(conta);
    try { return Object.fromEntries((await lerStore(db, "mon")).filter(m => m.custom).map(m => [m.key, m])); } finally { db.close(); }
  }
  /* compara o backup com o que a conta tem hoje, sem gravar nada */
  async function analisar(d) {
    exigirAtivo(); validar(d);
    const conta = identidade(), atuais = await itensDaConta(conta), trAtual = lerJSON("ini_tr_" + conta.id);
    const novos = [], iguais = [], conflitos = [];
    for (const [k, m] of Object.entries(d.items || {})) {
      const x = atuais[k];
      if (!x) novos.push(k);
      else if (Number(x.updatedAt || 0) === Number(m.updatedAt || 0) && x.name === m.name) iguais.push(k);
      else conflitos.push({ key: k, nome: m.name, backupMaisRecente: Number(m.updatedAt || 0) > Number(x.updatedAt || 0) });
    }
    const trNovas = Object.keys(d.tr || {}).filter(k => !(k in trAtual));
    return { novos, iguais, conflitos, trNovas, total: Object.keys(d.items || {}).length };
  }
  async function restaurar(d, { substituir = false } = {}) {
    exigirAtivo();
    const conta = identidade(), r = await analisar(d), items = {}, tr = {};
    r.novos.forEach(k => { items[k] = d.items[k]; });
    const trocados = substituir ? r.conflitos.filter(c => c.backupMaisRecente) : [];
    trocados.forEach(c => { items[c.key] = d.items[c.key]; });
    r.trNovas.forEach(k => { tr[k] = d.tr[k]; });          // só traduções que a conta ainda não tem
    const resultado = { adicionadas: r.novos.length, substituidas: trocados.length, mantidas: r.conflitos.length - trocados.length, iguais: r.iguais.length, traducoes: r.trNovas.length };
    if (!Object.keys(items).length && !Object.keys(tr).length) return resultado;
    const salvo = await mesclar({ v: 1, items, deleted: {}, tr }, conta);
    await aplicar(salvo, conta);
    conferir(conta);
    return resultado;
  }
  /* dados de antes da migração para a conta: banco "bestiario" (sem id) e chaves de localStorage sem id. Só leitura; nada é apagado. */
  async function lerLegado() {
    if (typeof indexedDB === "undefined") return null;
    if (typeof indexedDB.databases === "function") { try { if (!(await indexedDB.databases()).some(x => x.name === "bestiario")) return null; } catch (_) {} }
    const db = await new Promise((ok) => {
      const r = indexedDB.open("bestiario");
      r.onupgradeneeded = () => { try { r.transaction.abort(); } catch (_) {} };    // o banco não existia: não criar um vazio
      r.onerror = () => ok(null); r.onblocked = () => ok(null);
      r.onsuccess = () => ok(r.result);
    });
    if (!db) return null;
    try {
      if (!db.objectStoreNames.contains("mon")) return null;
      const mon = (await lerStore(db, "mon")).filter(m => m && m.custom && typeof m.key === "string" && typeof m.name === "string");
      const img = db.objectStoreNames.contains("img") ? await lerStore(db, "img") : [];
      if (!mon.length) return null;
      const fotos = Object.fromEntries(img.filter(i => typeof i.data === "string" && /^data:image\//.test(i.data)).map(i => [i.key, i.data]));
      return { v: 1, tipo: "legado", origem: "este navegador (dados anteriores à conta)", deleted: {}, tr: lerJSON("ini_tr"),
        items: Object.fromEntries(mon.map(m => [m.key, { ...m, photo: fotos[m.key] || "" }])) };
    } finally { db.close(); }
  }
  window.acervo = { exportar, analisar, restaurar, lerLegado, LIMITE_BYTES, ativo, banco, chave, aplicar, mesclar, importar, baixar, sincronizar, validar };
})();
