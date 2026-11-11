const {test}=require("node:test"),assert=require("node:assert/strict");
const {documentoFalso,executar,vm,tick}=require("./helpers.cjs");
async function fixture(user){
  const document=documentoFalso(),consultas=[],destinos=[],estado={confirmar:false};
  const nuvem={usuario:()=>user,esc:s=>String(s??""),olhos(){},retornoDoLink:async()=>{},entradaUrl:()=>"entrar.html?voltar=conta.html",sair:async()=>{user=null;},sairDeTodos:async()=>{user=null;},get:async q=>{
    consultas.push(q);if(user&&user.semRede)throw new Error('Sem conexão com a internet.');
    if(q.startsWith("perfis"))return[{nome:"Pessoa"}];
    if(q.startsWith("membros"))return[{papel:"mestre",campanha:{id:"mestrada",nome:"Mestrada"}},{papel:"jogador",campanha:{id:"jogada",nome:"Jogada"}}];
    return[{id:"1",nome:"Preparado pelo mestre",ficha:{},campanha:{id:"mestrada"}},{id:"2",nome:"Meu herói",ficha:{raca:'Humano',classes:[{c:'Fighter',n:4}]},campanha:{id:"jogada",nome:'Jogada'}},{id:"3",nome:"NPC",ficha:{npc:true},campanha:{id:"jogada"}}];
  }};
  const c=vm.createContext({window:{},document,nuvem,confirm:()=>estado.confirmar,acervo:{ativo:()=>false},navigator:{},location:{protocol:"https:",search:"",replace:u=>destinos.push(u)},URLSearchParams,setTimeout,clearTimeout});
  executar('js/regras.js',c);executar('js/ficha-componentes.js',c);executar("js/conta.js",c);await tick();return {document,nuvem,consultas,destinos,estado};
}
test("sem sessão, a conta manda para a página de entrada e não mostra dados",async()=>{const f=await fixture(null);assert.deepEqual(f.destinos,["entrar.html?voltar=conta.html"]);assert.equal(f.document.el("area").hidden,true);assert.equal(f.consultas.length,0);});
test("sessão existente abre campanhas e apenas personagens como jogador",async()=>{
  const f=await fixture({id:"pessoa",email:"pessoa@example.invalid"});
  assert.equal(f.document.el("area").hidden,false);
  const html=f.document.el("personagens").innerHTML;assert.match(html,/Meu herói/);assert.doesNotMatch(html,/Preparado pelo mestre|NPC/);
  assert.match(f.document.el("campanhas").innerHTML,/Mestrada/);assert.match(f.document.el("campanhas").innerHTML,/Jogada/);
  assert.doesNotMatch(f.document.el("p-camp").innerHTML,/Mestrada/);
});
test("sair é voluntário: limpa os dados visíveis da conta e volta ao modo visitante",async()=>{
  const f=await fixture({id:"pessoa",email:"pessoa@example.invalid"});
  await f.document.el("btn-sair").onclick();
  assert.equal(f.document.el("personagens").innerHTML,"");assert.equal(f.document.el("area").hidden,true);assert.deepEqual(f.destinos,["iniciativa.html"]);
});
test("sair de todos os aparelhos só acontece depois de confirmar e volta ao modo visitante",async()=>{
  const f=await fixture({id:"pessoa",email:"pessoa@example.invalid"});
  await f.document.el("btn-sair-todos").onclick();assert.deepEqual(f.destinos,[]);assert.equal(f.nuvem.usuario().id,"pessoa");   // sem confirmar, nada muda
  f.estado.confirmar=true;await f.document.el("btn-sair-todos").onclick();assert.equal(f.nuvem.usuario(),null);assert.deepEqual(f.destinos,["iniciativa.html"]);
});


test('filtros de biblioteca operam nos dados já autorizados sem novas consultas',async()=>{
 const f=await fixture({id:'pessoa',email:'pessoa@example.invalid'}),antes=f.consultas.length;
 assert.match(f.document.el('personagens').innerHTML,/Guerreiro 4/);
 assert.match(f.document.el('personagens').innerHTML,/Humano/);
 f.document.el('biblioteca-busca').events.input({target:{value:'heroi'}});assert.match(f.document.el('personagens').innerHTML,/Meu herói/);
 f.document.el('biblioteca-classe').events.change({target:{value:'Wizard'}});assert.doesNotMatch(f.document.el('personagens').innerHTML,/Meu herói/);
 f.document.el('biblioteca-limpar').onclick();assert.match(f.document.el('personagens').innerHTML,/Meu herói/);
 assert.equal(f.consultas.length,antes);
});

test("falha de rede ao abrir: aviso claro com Tentar novamente, sessão e dados intactos, nenhuma página errada",async()=>{
  const u={id:"u1",email:"a@b.invalid",semRede:true};const f=await fixture(u);
  const html=f.document.el("campanhas").innerHTML;
  assert.match(html,/Sem conexão/);assert.match(html,/Tentar novamente/);assert.match(html,/continua conectada e nada foi apagado/);
  assert.deepEqual(f.destinos,[]);assert.equal(f.nuvem.usuario(),u);                        // continua conectado, sem redirecionar
});
