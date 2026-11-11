const {test}=require("node:test"),assert=require("node:assert/strict");
const {vm,executar,documentoFalso,tick}=require("./helpers.cjs");
async function ficha(patch,{search='?id=p',mestre=true}={}){
  const document=documentoFalso(),eventos={},timers=new Map();let proximo=0;
  document.addEventListener=(n,fn)=>(eventos[n]??=[]).push(fn);
  const p={id:"p",nome:"Inicial",campanha_id:"c",dono_id:"u",pv_atual:10,pv_max:10,pv_temp:0,ca:10,versao:1,ficha:{classes:[{c:"Fighter",n:1}]}};
  const nuvem={usuario:()=>({id:"u"}),esc:s=>String(s??""),retornoDoLink:async()=>{},observar(){},rpc:async()=>mestre,patch,get:async q=>q.startsWith("personagens")?[p]:q.startsWith("campanhas")?[{id:"c",nome:"Campanha"}]:q.startsWith("membros")?[{papel:"mestre"}]:[{id:"u",nome:"Pessoa"}]};
  const c=vm.createContext({window:{addEventListener(){}},document,nuvem,location:{search},URLSearchParams,setTimeout:fn=>{timers.set(++proximo,fn);return proximo;},clearTimeout:id=>timers.delete(id),fetch:async url=>({ok:true,json:async()=>url.includes("habilidades-pt")?{}:[]})});
  executar("js/regras.js",c);executar("js/personagens-dados.js",c);executar("js/personagem.js",c);await tick();
  const nome=v=>eventos.input.forEach(fn=>fn({target:{dataset:{col:"nome"},value:v}}));
  const salvar=async()=>{const a=[...timers.values()];timers.clear();for(const fn of a)await fn();};
  return {document,nome,salvar,timers};
}
test("resposta vazia do banco não é exibida como Salvo",async()=>{
  const f=await ficha(async()=>[]);await f.salvar();assert.match(f.document.el("estado").innerHTML,/Não salvou/);
});
test('URL do modo painel não concede acesso ao jogador dono da ficha',async()=>{
 let chamadas=0;
 const f=await ficha(async()=>{chamadas++;return[{versao:2}];},{search:'?id=p&modo=painel',mestre:false});
 assert.match(f.document.el('erro').innerHTML,/exclusivo do mestre/);
 assert.equal(f.document.el('ficha').innerHTML,'');
 await f.salvar();assert.equal(chamadas,0);
});
test("gravações são serializadas e a alteração mais recente é enviada em seguida",async()=>{
  const chamadas=[];let terminar;
  const f=await ficha(async(_q,d)=>{chamadas.push(d);if(chamadas.length===1)return new Promise(ok=>terminar=()=>ok([{versao:2}]));return[{versao:3}];});
  f.nome("Primeira");const primeira=f.salvar();await tick();f.nome("Segunda");await f.salvar();assert.equal(chamadas.length,1);
  terminar();await primeira;await f.salvar();assert.equal(chamadas.length,2);assert.equal(chamadas[0].nome,"Primeira");assert.equal(chamadas[1].nome,"Segunda");
});
