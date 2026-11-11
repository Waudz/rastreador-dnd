const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,executar,armazenamento,indexedDBFalso}=require('./helpers.cjs');
const J=x=>JSON.parse(JSON.stringify(x));
const FOTO='data:image/png;base64,AAAA';
const criacao=(key,name,updatedAt,extra={})=>({key,custom:true,name,updatedAt,cat:'npc',...extra});
function fixture({servidor={},conta={id:'u1',email:'ana@example.invalid'},local={}}={}){
  const idb=indexedDBFalso(),localStorage=armazenamento(),rpcs=[];
  const estado={v:1,items:{},deleted:{},tr:{},...servidor};
  const nuvem={usuario:()=>conta,get:async()=>[{dados:estado}],
    rpc:async(n,a)=>{rpcs.push(J(a.p_dados));const p=a.p_dados;     // mesma regra da função mesclar_acervo do banco
      for(const [k,v] of Object.entries(p.deleted||{}))if(Number(v)>Number(estado.deleted[k]||0))estado.deleted[k]=v;
      for(const [k,v] of Object.entries(p.items||{}))if(Number(v.updatedAt||0)>=Number((estado.items[k]||{}).updatedAt||0))estado.items[k]=J(v);
      for(const [k,v] of Object.entries(estado.deleted))if(Number(v)>=Number((estado.items[k]||{}).updatedAt||0))delete estado.items[k];
      estado.tr={...estado.tr,...(p.tr||{})};return J(estado);}};
  const banco={mon:new Map(),img:new Map(),spl:new Map()};idb.bancos.set('bestiario_'+conta.id,banco);
  for(const [k,m] of Object.entries(local))banco.mon.set(k,m);
  const window={nuvem,NUVEM_CONFIG:{acervoPorConta:true}};
  executar('js/acervo.js',vm.createContext({window,nuvem,localStorage,indexedDB:idb}));
  return {acervo:window.acervo,idb,banco,localStorage,rpcs,estado};
}
const backup=(items,extra={})=>({v:1,items:Object.fromEntries(items.map(m=>[m.key,m])),deleted:{},tr:{},...extra});

test('analisar compara o backup com a conta sem gravar nada',async()=>{
  const f=fixture({local:{a:criacao('a','Igual',5),b:criacao('b','Local',10)}});
  const r=J(await f.acervo.analisar(backup([criacao('a','Igual',5),criacao('b','Do backup',20),criacao('c','Nova',1)],{tr:{dragon:'dragão'}})));
  assert.deepEqual(r.novos,['c']);assert.deepEqual(r.iguais,['a']);assert.equal(r.conflitos.length,1);assert.equal(r.conflitos[0].key,'b');assert.equal(r.conflitos[0].backupMaisRecente,true);
  assert.deepEqual(r.trNovas,['dragon']);assert.equal(f.rpcs.length,0);assert.equal(f.banco.mon.size,2);
});
test('restaurar adiciona só o que falta e mantém o que já existe',async()=>{
  const f=fixture({local:{b:criacao('b','Meu NPC editado',10)},servidor:{items:{b:criacao('b','Meu NPC editado',10)}}});
  const r=J(await f.acervo.restaurar(backup([criacao('b','Versão antiga',2),criacao('c','Nova',1,{photo:FOTO})])));
  assert.deepEqual(r,{adicionadas:1,substituidas:0,mantidas:1,iguais:0,traducoes:0});
  assert.equal(f.banco.mon.get('b').name,'Meu NPC editado');           // o existente não foi tocado
  assert.equal(f.banco.mon.get('c').name,'Nova');assert.equal(f.banco.img.get('c').data,FOTO);   // a foto da criação nova veio junto
  assert.deepEqual(Object.keys(f.rpcs[0].items),['c']);                 // só o novo foi enviado à conta
});
test('exclusões de um backup nunca são aplicadas',async()=>{
  const f=fixture({local:{a:criacao('a','Fica',5)},servidor:{items:{a:criacao('a','Fica',5)}}});
  await f.acervo.restaurar(backup([criacao('c','Nova',1)],{deleted:{a:999999}}));
  assert.deepEqual(f.rpcs[0].deleted,{});assert.ok(f.banco.mon.has('a'));assert.ok(f.estado.items.a);
});
test('conflito só é substituído se o usuário marcar a opção e o backup for mais recente',async()=>{
  const local={b:criacao('b','Local',10),d:criacao('d','Local novo',50)};
  const f=fixture({local,servidor:{items:J(local)}});
  const b=backup([criacao('b','Backup mais novo',20),criacao('d','Backup mais velho',5)]);
  const sem=J(await f.acervo.restaurar(b));assert.equal(sem.substituidas,0);assert.equal(f.banco.mon.get('b').name,'Local');
  const com=J(await f.acervo.restaurar(b,{substituir:true}));assert.equal(com.substituidas,1);
  assert.equal(f.banco.mon.get('b').name,'Backup mais novo');assert.equal(f.banco.mon.get('d').name,'Local novo');   // a mais nova continua valendo
});
test('traduções do backup só entram se a conta ainda não tiver a mesma chave',async()=>{
  const f=fixture({servidor:{tr:{goblin:'goblin meu'}}});f.localStorage.setItem('ini_tr_u1',JSON.stringify({goblin:'goblin meu'}));
  const r=J(await f.acervo.restaurar(backup([criacao('c','Nova',1)],{tr:{goblin:'goblin do backup',orc:'orc'}})));
  assert.equal(r.traducoes,1);assert.equal(f.rpcs[0].tr.goblin,undefined);assert.equal(f.rpcs[0].tr.orc,'orc');
});
test('nada a restaurar não chama o servidor',async()=>{
  const f=fixture({local:{a:criacao('a','Igual',5)}});const r=J(await f.acervo.restaurar(backup([criacao('a','Igual',5)])));
  assert.equal(r.adicionadas,0);assert.equal(f.rpcs.length,0);
});
test('arquivo de backup inválido é recusado',async()=>{
  const f=fixture();
  assert.throws(()=>f.acervo.validar({}),/Backup inválido/);
  assert.throws(()=>f.acervo.validar({items:{a:{key:'outra',custom:true,name:'x'}}}),/Criação inválida/);
  assert.throws(()=>f.acervo.validar({items:{a:{key:'a',custom:false,name:'x'}}}),/Criação inválida/);
  assert.throws(()=>f.acervo.validar({items:{a:criacao('a','x',1,{photo:'http://exemplo.invalid/foto.png'})}}),/Foto inválida/);
  const muitos=Object.fromEntries(Array.from({length:2001},(_,i)=>['k'+i,criacao('k'+i,'n',1)]));
  assert.throws(()=>f.acervo.validar({items:muitos}),/criações demais/);
});
test('exportar gera backup compatível, sem exclusões, com fotos e traduções da conta',async()=>{
  const f=fixture({local:{a:criacao('a','Orc',5)},servidor:{items:{a:criacao('a','Orc',5)},tr:{orc:'orc'}}});f.banco.img.set('a',{key:'a',data:FOTO});
  f.banco.mon.set('srd_goblin',{key:'srd_goblin',name:'Goblin',custom:false});     // catálogo público não entra no backup
  const d=J(await f.acervo.exportar());
  assert.equal(d.tipo,'backup-criacoes');assert.deepEqual(Object.keys(d.items),['a']);assert.equal(d.items.a.photo,FOTO);assert.deepEqual(d.deleted,{});assert.equal(d.tr.orc,'orc');
  assert.equal(d.origem,'ana@example.invalid');f.acervo.validar(d);        // o que foi exportado é aceito na restauração
});
test('recuperação do navegador antigo lê o banco "bestiario" sem apagar nem alterar nada',async()=>{
  const f=fixture();
  f.idb.bancos.set('bestiario',{mon:new Map([['x',criacao('x','Antigo',0)],['srd_orc',{key:'srd_orc',name:'Orc',custom:false}]]),img:new Map([['x',{key:'x',data:FOTO}]]),spl:new Map()});
  f.localStorage.setItem('ini_tr',JSON.stringify({goblin:'goblin antigo'}));
  const d=J(await f.acervo.lerLegado());
  assert.deepEqual(Object.keys(d.items),['x']);assert.equal(d.items.x.photo,FOTO);assert.equal(d.tr.goblin,'goblin antigo');assert.deepEqual(d.deleted,{});assert.equal(d.tipo,'legado');
  const antigo=f.idb.bancos.get('bestiario');assert.equal(antigo.mon.size,2);assert.equal(antigo.img.size,1);assert.equal(f.localStorage.getItem('ini_tr'),'{"goblin":"goblin antigo"}');
  const r=J(await f.acervo.restaurar(d));assert.equal(r.adicionadas,1);assert.ok(f.banco.mon.has('x'));assert.equal(antigo.mon.size,2);     // continua lá depois de restaurar
});
test('sem dados antigos, a recuperação diz que não achou nada',async()=>{
  const f=fixture();assert.equal(await f.acervo.lerLegado(),null);
});
test('o criacoes.json do repositório privado antigo (v, items com photo, deleted) é aceito pela restauração',async()=>{
  const f=fixture({local:{a:criacao('a','Já tenho',5)},servidor:{items:{a:criacao('a','Já tenho',5)}}});
  const antigo={v:1,items:{a:criacao('a','Já tenho',5,{photo:FOTO}),z:criacao('z','Só no repositório',7,{photo:FOTO})},deleted:{velho:123}};
  f.acervo.validar(antigo);const r=J(await f.acervo.restaurar(antigo));
  assert.equal(r.adicionadas,1);assert.equal(r.iguais,1);assert.ok(f.banco.mon.has('z'));assert.equal(f.banco.img.get('z').data,FOTO);assert.deepEqual(f.rpcs[0].deleted,{});
});
