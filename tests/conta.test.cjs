const {test}=require("node:test"),assert=require("node:assert/strict");
const {documentoFalso,executar,vm,tick}=require("./helpers.cjs");
async function fixture(user){
  const document=documentoFalso();
  const nuvem={usuario:()=>user,esc:s=>String(s??""),olhos(){},retornoDoLink:async()=>{},sair:async()=>{user=null;},get:async q=>{
    if(q.startsWith("perfis"))return[{nome:"Pessoa"}];
    if(q.startsWith("membros"))return[{papel:"mestre",campanha:{id:"mestrada",nome:"Mestrada"}},{papel:"jogador",campanha:{id:"jogada",nome:"Jogada"}}];
    return[{id:"1",nome:"Preparado pelo mestre",ficha:{},campanha:{id:"mestrada"}},{id:"2",nome:"Meu herói",ficha:{},campanha:{id:"jogada"}},{id:"3",nome:"NPC",ficha:{npc:true},campanha:{id:"jogada"}}];
  }};
  const c=vm.createContext({window:{},document,nuvem,navigator:{},location:{protocol:"https:"}});
  executar("js/conta.js",c);await tick();return {document,nuvem};
}
test("página inicial sem sessão mostra login",async()=>{const f=await fixture(null);assert.equal(f.document.el("entrar").hidden,false);assert.equal(f.document.el("area").hidden,true);});
test("sessão existente abre campanhas e apenas personagens como jogador",async()=>{
  const f=await fixture({id:"pessoa",email:"pessoa@example.invalid"});
  assert.equal(f.document.el("area").hidden,false);
  const html=f.document.el("personagens").innerHTML;assert.match(html,/Meu herói/);assert.doesNotMatch(html,/Preparado pelo mestre|NPC/);
  assert.match(f.document.el("campanhas").innerHTML,/Mestrada/);assert.match(f.document.el("campanhas").innerHTML,/Jogada/);
  assert.doesNotMatch(f.document.el("p-camp").innerHTML,/Mestrada/);
});
test("sair limpa a senha e dados visíveis da conta",async()=>{
  const f=await fixture({id:"pessoa",email:"pessoa@example.invalid"});f.document.el("l-senha").value="senha-fictícia";
  await f.document.el("btn-sair").onclick();
  assert.equal(f.document.el("l-senha").value,"");assert.equal(f.document.el("personagens").innerHTML,"");assert.equal(f.document.el("area").hidden,true);
});
