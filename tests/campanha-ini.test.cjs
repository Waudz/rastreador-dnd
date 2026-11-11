const {test}=require("node:test"),assert=require("node:assert/strict");
const {vm,executar,documentoFalso,armazenamento,tick}=require("./helpers.cjs");
async function fixture({search="",erro=false,user={id:"mestre"}}={}){
  const document=documentoFalso(),localStorage=armazenamento(),lista=[],consultas=[];
  localStorage.setItem("ini_campanha","antiga");
  const nuvem={usuario:()=>user,esc:s=>String(s??""),observar(){},get:async q=>{
    consultas.push(q);if(erro)throw Error("Permissão recusada");
    return q.startsWith("membros")?[{campanha:{id:"antiga",nome:"Antiga"}},{campanha:{id:"atual",nome:"Atual"}}]:[{id:"p",nome:"Herói",pv_atual:12,pv_max:15,ca:13,ficha:{foto:"data:image/png;base64,FOTO",classes:[{c:"Bard",n:2}],atributos:{des:14}}}];
  }};
  const window={nuvem,__ini:{list:()=>lista,add:c=>lista.push(c),render(){}}};
  const c=vm.createContext({window,nuvem,document,location:{search},localStorage,URLSearchParams,setInterval(){}});
  executar("js/regras.js",c);c.REGRAS=window.REGRAS;executar("js/campanha-ini.js",c);await tick();
  return {document,lista,consultas};
}
test("link da campanha escolhe a campanha atual em vez da preferência antiga",async()=>{
  const f=await fixture({search:"?campanha=atual&personagem=p"});
  assert.equal(f.document.el("ci-camp").value,"atual");assert(f.consultas.some(q=>q.includes("campanha_id=eq.atual")));
  assert.equal(f.lista.length,1);assert.equal(f.lista[0].pid,"p");assert.equal(f.lista[0].foto,"data:image/png;base64,FOTO");
});
test("adicionar manualmente preserva foto e evita duplicação",async()=>{
  const f=await fixture({search:"?campanha=atual"});
  const e={target:{closest:s=>s==="[data-ci]"?{dataset:{ci:"p"}}:null}};
  f.document.el("camp-ini").events.click(e);f.document.el("camp-ini").events.click(e);
  assert.equal(f.lista.length,1);assert.equal(f.lista[0].maxHp,15);assert.equal(f.lista[0].campanhaId,"atual");
});
test("erro de acesso é exibido em vez de esconder o painel",async()=>{
  const f=await fixture({erro:true});assert.equal(f.document.el("camp-ini").hidden,false);assert.match(f.document.el("ci-msg").innerHTML,/Permissão recusada/);
});
test("ausência de sessão mostra instrução de login sem consultar dados",async()=>{
  const f=await fixture({user:null});assert.equal(f.consultas.length,0);assert.match(f.document.el("ci-msg").innerHTML,/Entre na sua conta/);
});
