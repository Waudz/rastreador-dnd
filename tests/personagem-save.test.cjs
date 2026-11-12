const {test}=require("node:test"),assert=require("node:assert/strict");
const {vm,executar,documentoFalso,tick}=require("./helpers.cjs");
async function ficha(patch,{search='?id=p',mestre=true,fichaInicial={}}={}){
  const document=documentoFalso(),eventos={},timers=new Map();let proximo=0;
  document.addEventListener=(n,fn)=>(eventos[n]??=[]).push(fn);
  const p={id:"p",nome:"Inicial",campanha_id:"c",dono_id:"u",pv_atual:10,pv_max:10,pv_temp:0,ca:10,versao:1,ficha:{classes:[{c:"Fighter",n:1}]}};
  Object.assign(p.ficha,fichaInicial);
  const nuvem={usuario:()=>({id:"u"}),esc:s=>String(s??""),retornoDoLink:async()=>{},observar(){},rpc:async()=>mestre,patch,get:async q=>q.startsWith("personagens")?[p]:q.startsWith("campanhas")?[{id:"c",nome:"Campanha"}]:q.startsWith("membros")?[{papel:"mestre"}]:[{id:"u",nome:"Pessoa"}]};
  const c=vm.createContext({window:{addEventListener(){}},document,nuvem,location:{search},URLSearchParams,setTimeout:fn=>{timers.set(++proximo,fn);return proximo;},clearTimeout:id=>timers.delete(id),fetch:async url=>({ok:true,json:async()=>url.includes("habilidades-pt")?{}:[]})});
  executar("js/ficha-componentes.js",c);executar("js/magias-ui.js",c);executar("js/regras.js",c);executar("js/personagens-dados.js",c);executar("js/personagem.js",c);await tick();
  const nome=v=>eventos.input.forEach(fn=>fn({target:{dataset:{col:"nome"},value:v}}));
  const salvar=async()=>{const a=[...timers.values()];timers.clear();for(const fn of a)await fn();};
  return {document,nome,salvar,timers,p,eventos};
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
test('evolução permanece em Personagem e Combate prioriza defesa e ataques',async()=>{
 const f=await ficha(async()=>[{versao:2}]);
 const h=f.document.el('ficha').innerHTML;
 const combate=h.split('id="secao-combate"')[1].split('</section>')[0];
 const personagem=h.split('id="secao-personagem"')[1].split('</section>')[0];
 assert.match(combate,/Classe de armadura/);assert.match(combate,/Ataques/);assert.doesNotMatch(combate,/Criação e evolução/);
 assert.match(personagem,/Construção do personagem/);assert.match(personagem,/modo=editar/);assert.match(personagem,/modo=nivel/);
 assert.ok(!/id="melhorias"|data-asi|data-escolha|id="cat-q"/.test(h),'a ficha não traz seletores de construção');
 assert.ok(!/data-atr=/.test(h),'atributos permanentes são só leitura');assert.match(h,/data-modtemp="for"/);assert.match(h,/id="b-foto"/);
});
test('perícias mostram o atributo da regra e preservam o botão de rolagem',async()=>{
 const f=await ficha(async()=>[{versao:2}]);const h=f.document.el('ficha').innerHTML;
 assert.match(h,/data-rolar-per="percepcao"[^>]*>.*?Percepção.*?pericia-atributo">SAB/s);
 assert.match(h,/data-rolar-per="acrobacia"[^>]*>.*?Acrobacia.*?pericia-atributo">DES/s);
 assert.match(h,/aria-label="Sem proficiência"/);
});
test('espaços de magia, preparação e diário sobrevivem à gravação',async()=>{
 let salvo;const f=await ficha(async(_q,d)=>{salvo=d;return[{versao:2}];},{fichaInicial:{classes:[{c:'Cleric',n:4}],notas:'História anterior',magias:[{n:'Luz',en:'Light',l:0,d:'Descrição original'},{n:'Bênção',en:'Bless',l:1,d:'Texto original',prep:true}]}});
 const h=f.document.el('ficha').innerHTML;assert.match(h,/espacos-magia/);assert.match(h,/Truques/);assert.match(h,/1º círculo/);assert.match(h,/História anterior/);
 for(const fn of f.eventos.click)await fn({target:{closest:s=>s==='[data-slot]'?{dataset:{slot:'0',d:'1'}}:null}});
 assert.equal(f.p.ficha.slotsUsados[0],1);await f.salvar();
 assert.equal(salvo.ficha.notas,'História anterior');assert.equal(salvo.ficha.magias[1].prep,true);
 for(const fn of f.eventos.click)await fn({target:{closest:s=>s==='[data-slot]'?{dataset:{slot:'0',d:'-1'}}:null}});
 assert.equal(f.p.ficha.slotsUsados[0],0);
});
test("gravações são serializadas e a alteração mais recente é enviada em seguida",async()=>{
  const chamadas=[];let terminar;
  const f=await ficha(async(_q,d)=>{chamadas.push(d);if(chamadas.length===1)return new Promise(ok=>terminar=()=>ok([{versao:2}]));return[{versao:3}];});
  f.nome("Primeira");const primeira=f.salvar();await tick();f.nome("Segunda");await f.salvar();assert.equal(chamadas.length,1);
  terminar();await primeira;await f.salvar();assert.equal(chamadas.length,2);assert.equal(chamadas[0].nome,"Primeira");assert.equal(chamadas[1].nome,"Segunda");
});

test('pacto usa as ações existentes e mantém o repertório ao gastar e recuperar',async()=>{
 const f=await ficha(async()=>[{versao:2}],{fichaInicial:{classes:[{c:'Warlock',n:3}],magias:[{n:'Bruxaria',l:1,d:'Texto preservado'}]}});
 assert.match(f.document.el('ficha').innerHTML,/magia-slot-acoes/);
 for(const d of ['1','-1']){for(const fn of f.eventos.click)await fn({target:{closest:s=>s==='[data-slot]'?{dataset:{slot:'p',d}}:null}});assert.equal(f.p.ficha.pactoUsado,d==='1'?1:0);}
 assert.equal(f.p.ficha.magias[0].d,'Texto preservado');
});
