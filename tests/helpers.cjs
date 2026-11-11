const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const ler=p=>fs.readFileSync(path.join(root,p),"utf8");
const tick=()=>new Promise(ok=>setImmediate(ok));
function armazenamento(){const dados=new Map();return {getItem:k=>dados.get(k)??null,setItem:(k,v)=>dados.set(k,String(v)),removeItem:k=>dados.delete(k),dados};}
function indexedDBFalso(){
  const bancos=new Map(),abertos=[];
  return {bancos,abertos,open(nome){
    const q={};abertos.push(nome);
    queueMicrotask(()=>{if(!bancos.has(nome))bancos.set(nome,{mon:new Map(),img:new Map(),spl:new Map()});
      const dados=bancos.get(nome);
      q.result={objectStoreNames:{contains:k=>k in dados},close(){},transaction(stores,modo){
        const copia=Object.fromEntries(Object.entries(dados).map(([k,v])=>[k,new Map(v)]));
        let pendentes=0,abortou=false;
        const t={objectStore(k){return {
          get(id){const r={};pendentes++;queueMicrotask(()=>{if(abortou)return;r.result=copia[k].get(id);try{r.onsuccess?.();}finally{pendentes--;}});return r;},
          put(v){copia[k].set(v.key,structuredClone(v));},
          delete(id){copia[k].delete(id);}
        };},abort(){abortou=true;queueMicrotask(()=>t.onabort?.());}};
        const terminar=()=>{if(abortou)return;if(pendentes){setImmediate(terminar);return;}Object.assign(dados,copia);t.oncomplete?.();};
        setImmediate(terminar);return t;
      }};
      q.onsuccess?.();
    });return q;
  }};
}
function documentoFalso(){
  const elementos=new Map();
  const el=id=>{if(!elementos.has(id))elementos.set(id,{id,value:"",hidden:true,innerHTML:"",textContent:"",disabled:false,classList:{toggle(){}},events:{},addEventListener(n,fn){this.events[n]=fn;},querySelector(){return null;},focus(){}});return elementos.get(id);};
  return {el,querySelector:s=>el(s.replace(/^#/,"")),querySelectorAll:()=>[],addEventListener(){}};
}
function executar(p,contexto){vm.runInContext(ler(p),contexto,{filename:p});}
module.exports={root,ler,tick,armazenamento,indexedDBFalso,documentoFalso,executar,vm};
