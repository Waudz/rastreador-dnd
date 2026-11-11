const {test}=require("node:test"),assert=require("node:assert/strict");
const {armazenamento,indexedDBFalso,executar,vm}=require("./helpers.cjs");
function fixture(){
  let user={id:"a",email:"a@example.invalid"},rpc=async(_n,{p_dados})=>p_dados;
  const localStorage=armazenamento(),indexedDB=indexedDBFalso();
  const nuvem={usuario:()=>user,rpc:(...args)=>rpc(...args),get:async()=>[{dados:{items:{}}}]};
  const c=vm.createContext({window:{nuvem,NUVEM_CONFIG:{acervoPorConta:true}},nuvem,localStorage,indexedDB,queueMicrotask});
  executar("js/acervo.js",c);
  return {acervo:c.window.acervo,localStorage,indexedDB,trocar:u=>user=u,rpc:f=>rpc=f};
}
const backup=()=>({items:{heroi:{key:"heroi",name:"Herói",custom:true,updatedAt:10,photo:"data:image/png;base64,TESTE"}},tr:{dragon:"dragão"},ldj:{meta:{a:"texto"}}});
test("sincronização da conta envia criação local e confirma resultado remoto",async()=>{
 const f=fixture();await f.acervo.importar(backup());const db=f.indexedDB.bancos.get('bestiario_a');db.mon.set('novo',{key:'novo',name:'Novo',custom:true,updatedAt:20});let recebido;
 f.rpc(async(_n,{p_dados})=>{recebido=p_dados;return p_dados;});await f.acervo.sincronizar();assert.equal(recebido.items.novo.name,'Novo');assert.equal(recebido.items.heroi.photo,'data:image/png;base64,TESTE');assert.match(f.localStorage.getItem('ini_sync_status_a'),/Sincronizado/);
});
test("falha de sincronização não registra sucesso",async()=>{const f=fixture();await f.acervo.importar(backup());f.rpc(async()=>{throw Error('Sem conexão');});await assert.rejects(f.acervo.sincronizar(),/Sem conexão/);assert.equal(f.localStorage.getItem('ini_sync_status_a'),null);});
test("troca de conta durante sincronização impede aplicar dados à nova conta",async()=>{const f=fixture();await f.acervo.importar(backup());f.rpc(async(_n,{p_dados})=>{f.trocar({id:'b'});return p_dados;});await assert.rejects(f.acervo.sincronizar(),/conta mudou/);assert.equal(f.localStorage.getItem('ini_sync_status_b'),null);assert.equal(f.indexedDB.bancos.has('bestiario_b'),false);});
test("importação preserva criação, foto e tradução na conta certa",async()=>{
  const f=fixture();f.localStorage.setItem("ini_sync","token-legado");
  assert.equal(await f.acervo.importar(backup()),1);
  const db=f.indexedDB.bancos.get("bestiario_a");
  assert.equal(db.mon.get("heroi").name,"Herói");assert.equal(db.img.get("heroi").data,"data:image/png;base64,TESTE");
  assert.equal(JSON.parse(f.localStorage.getItem("ini_tr_a")).dragon,"dragão");
  assert.equal(f.localStorage.getItem("ini_sync"),null);
});
test("falha remota mantém token e dados anteriores",async()=>{
  const f=fixture();f.localStorage.setItem("ini_sync","token-legado");f.rpc(async()=>{throw Error("Servidor indisponível");});
  await assert.rejects(f.acervo.importar(backup()),/indisponível/);assert.equal(f.localStorage.getItem("ini_sync"),"token-legado");assert.equal(f.indexedDB.abertos.length,0);
});
test("troca de conta durante RPC não grava dados nem remove token",async()=>{
  const f=fixture();f.localStorage.setItem("ini_sync","token-legado");
  f.rpc(async(_n,{p_dados})=>{f.trocar({id:"b",email:"b@example.invalid"});return p_dados;});
  await assert.rejects(f.acervo.importar(backup()),/conta mudou/);
  assert.equal(f.indexedDB.abertos.length,0);assert.equal(f.localStorage.getItem("ini_sync"),"token-legado");assert.equal(f.localStorage.getItem("ini_tr_b"),null);
});
test("backup destinado a outro e-mail é rejeitado antes da rede",async()=>{
  const f=fixture();let chamadas=0;f.rpc(async()=>{chamadas++;});
  await assert.rejects(f.acervo.importar({...backup(),destino:"outro@example.invalid"}),/e-mail de destino/);assert.equal(chamadas,0);
});
test("foto removida não reaparece na próxima sincronização",async()=>{
  const f=fixture();await f.acervo.importar(backup());const b=backup();b.items.heroi.photo="";b.items.heroi.updatedAt=11;await f.acervo.importar(b);
  assert.equal(f.indexedDB.bancos.get("bestiario_a").img.has("heroi"),false);
});
test("exclusão vence cópia antiga e preserva cópia local mais nova",async()=>{
  const f=fixture();await f.acervo.importar(backup());await f.acervo.aplicar({items:{},deleted:{heroi:9}});
  assert(f.indexedDB.bancos.get("bestiario_a").mon.has("heroi"));await f.acervo.aplicar({items:{},deleted:{heroi:10}});
  assert.equal(f.indexedDB.bancos.get("bestiario_a").mon.has("heroi"),false);
});
test("validação recusa campos com formato errado",()=>{
  const f=fixture();assert.throws(()=>f.acervo.validar({items:[]}),/Campo inválido/);assert.throws(()=>f.acervo.validar({items:{x:{key:"y",custom:true,name:"X"}}}),/Criação inválida/);
});

test("baixar cópia remota antiga não desfaz uma exclusão local ainda não sincronizada",async()=>{
  const f=fixture();await f.acervo.importar(backup());
  f.localStorage.setItem("ini_tomb_a",JSON.stringify({heroi:20}));
  await f.acervo.aplicar(backup());
  assert.equal(f.indexedDB.bancos.get("bestiario_a").mon.has("heroi"),false);
  assert.equal(JSON.parse(f.localStorage.getItem("ini_tomb_a")).heroi,20);
});

test("publicação antes da migração mantém o banco e as chaves legados",async()=>{
  const localStorage=armazenamento();localStorage.setItem("ini_sync","token-preservado");
  const nuvem={usuario:()=>({id:"a",email:"a@example.invalid"})};
  const c=vm.createContext({window:{nuvem,NUVEM_CONFIG:{acervoPorConta:false}},nuvem,localStorage});
  executar("js/acervo.js",c);const a=c.window.acervo;
  assert.equal(a.banco(),"bestiario");assert.equal(a.chave("ini_tr"),"ini_tr");assert.equal(a.ativo(),false);
  assert.deepEqual(JSON.parse(JSON.stringify(await a.baixar())),{});
  await assert.rejects(a.importar(backup()),/migração/);
  assert.equal(localStorage.getItem("ini_sync"),"token-preservado");
});
