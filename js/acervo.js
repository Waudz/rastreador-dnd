
/* Biblioteca privada vinculada ao usuário autenticado. */
(() => {
  const usuario=()=>window.nuvem&&nuvem.usuario();
  const banco=()=>usuario()?"bestiario_"+usuario().id:"bestiario_publico";
  const chave=k=>k+"_"+(usuario()?usuario().id:"publico");
  function abrir(){return new Promise((ok,no)=>{const r=indexedDB.open(banco(),3);r.onupgradeneeded=()=>["mon","spl","img"].forEach(s=>{if(!r.result.objectStoreNames.contains(s))r.result.createObjectStore(s,{keyPath:"key"});});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});}
  async function aplicar(d) {
    const db=await abrir();
    try{await new Promise((ok,no)=>{
      const t=db.transaction(["mon","img"],"readwrite"), mon=t.objectStore("mon"), img=t.objectStore("img");
      Object.entries(d.deleted||{}).forEach(([k,ts])=>{const q=mon.get(k);q.onsuccess=()=>{if(!q.result||(q.result.updatedAt||0)<=ts){mon.delete(k);img.delete(k);}};});
      Object.values(d.items||{}).forEach(m=>{if(!m||typeof m.key!=="string"||!m.custom)return;const q=mon.get(m.key);q.onsuccess=()=>{if(q.result&&(q.result.updatedAt||0)>(m.updatedAt||0))return; const copia={...m};delete copia.photo;mon.put(copia);if(m.photo&&/^data:image\//.test(m.photo))img.put({key:m.key,data:m.photo});};});
      t.oncomplete=ok;t.onerror=()=>no(t.error);
    });}finally{db.close();}
    localStorage.setItem(chave("ini_tomb"),JSON.stringify(d.deleted||{}));
    if(d.tr)localStorage.setItem(chave("ini_tr"),JSON.stringify(d.tr));
    if(d.ldj)localStorage.setItem(chave("ini_ldj"),JSON.stringify(d.ldj));
  }
  async function mesclar(d){if(!usuario())throw Error("Entre na sua conta.");return nuvem.rpc("mesclar_acervo",{p_dados:d});}
  async function importar(d){
    if(!d||typeof d!=="object"||(!d.items&&!d.tr&&!d.ldj))throw Error("Backup inválido.");
    if(!usuario())throw Error("Entre na sua conta.");
    if(d.destino&&String(d.destino).toLowerCase()!==usuario().email.toLowerCase())throw Error("Entre com o e-mail de destino do backup.");
    const salvo=await mesclar(d);await aplicar(salvo);
    // O token legado só é removido após a gravação na conta e no navegador.
    localStorage.removeItem("ini_sync");
    return Object.keys(salvo.items||{}).length;
  }
  async function baixar(){const r=await nuvem.get("acervos?select=dados&usuario_id=eq."+usuario().id);const d=r[0]?.dados||{};await aplicar(d);return d;}
  window.acervo={banco,chave,aplicar,mesclar,importar,baixar};
})();
