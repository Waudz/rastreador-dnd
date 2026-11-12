const {test}=require("node:test"),assert=require("node:assert/strict");
const {vm,executar,documentoFalso,tick}=require("./helpers.cjs");
async function ficha(patch,{search='?id=p',mestre=true,fichaInicial={},registro={}}={}){
  const document=documentoFalso(),eventos={},timers=new Map();let proximo=0;
  document.addEventListener=(n,fn)=>(eventos[n]??=[]).push(fn);
  const p={id:"p",nome:"Inicial",campanha_id:"c",dono_id:"u",pv_atual:10,pv_max:10,pv_temp:0,ca:10,versao:1,ficha:{classes:[{c:"Fighter",n:1}]}};
  Object.assign(p.ficha,fichaInicial);Object.assign(p,registro);
  const nuvem={usuario:()=>({id:"u"}),esc:s=>String(s??""),retornoDoLink:async()=>{},observar(){},rpc:async()=>mestre,patch,get:async q=>q.startsWith("personagens")?[p]:q.startsWith("campanhas")?[{id:"c",nome:"Campanha"}]:q.startsWith("membros")?[{papel:"mestre"}]:[{id:"u",nome:"Pessoa"}]};
  const c=vm.createContext({window:{addEventListener(){}},document,nuvem,location:{search},URLSearchParams,setTimeout:fn=>{timers.set(++proximo,fn);return proximo;},clearTimeout:id=>timers.delete(id),fetch:async url=>({ok:true,json:async()=>url.includes("habilidades-pt")?{}:[]})});
  executar("js/ficha-componentes.js",c);executar("js/magias-ui.js",c);executar("js/regras.js",c);executar("js/magias-jogo.js",c);executar("js/inventario.js",c);executar("js/itens-efeitos.js",c);executar("js/personagens-dados.js",c);executar("js/personagem.js",c);await tick();
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
test('aba Magias: sem busca livre no catálogo; Mago tem grimório e cópia; mestre tem concessão; seções por origem e magia inativa sinalizada',async()=>{
 const f=await ficha(async()=>[{versao:2}],{fichaInicial:{classes:[{c:'Wizard',n:3}],atributos:{for:8,des:14,con:12,int:16,sab:10,car:10},magias:[
  {n:'Mísseis Mágicos',en:'Magic Missile',l:1,d:'x',prep:true,noGrimorio:true,classeConj:'Wizard',registroOrigem:{tipo:'classe'}},
  {n:'Bola de Fogo',en:'Fireball',l:3,d:'x',prep:false,noGrimorio:true,ativa:false,classeConj:'Wizard',registroOrigem:{tipo:'copia-grimorio'}},
  {n:'Chama Antiga',en:'Chama Antiga',l:4,d:'x',prep:true,semprePreparada:true,fonte:'mestre',classeConj:'',registroOrigem:{tipo:'mestre'}}]}});
 const h=f.document.el('ficha').innerHTML;
 assert.ok(!/id="mag-q"|Adicionar do catálogo/.test(h));assert.match(h,/id="cp-abrir"/);assert.match(h,/id="ms-abrir"/);
 assert.match(h,/Grimório do Mago/);assert.match(h,/Concedidas pelo mestre/);assert.match(h,/Inativa/);assert.match(h,/Copiada de outro grimório/);assert.match(h,/Retirar concessão/);
 assert.equal((h.match(/data-prep=/g)||[]).length,1,'só a magia ativa do grimório pode ser preparada (a inativa e a do mestre não)');
});

const clicar=async(f,sel,dataset={})=>{for(const fn of f.eventos.click)await fn({target:{closest:s=>s===sel?{dataset,id:sel.replace(/^#/,'')}:null}});};
const digitar=(f,dataset,value)=>f.eventos.input.forEach(fn=>fn({target:{dataset,value}}));
const pocao=(qtd)=>({uid:'it_pocao',nome:'Poção de Cura',qtd,peso:0.5,tipo:'consumivel',ref:'srd51:item/potion-of-healing',origem:{tipo:'inicial'},propriedades:{efeitos:[{tipo:'cura',dados:{n:2,d:4,b:2}}]},magiaVinculada:null});
test('usar poção de cura na ficha: confirma, cura sem passar do máximo, consome uma unidade e grava tudo numa só requisição; clique duplo não consome duas vezes',async()=>{
 const envios=[];const f=await ficha(async(_q,d)=>{envios.push(d);return[{versao:2}];},{fichaInicial:{pvAuto:false,caAuto:false},registro:{pv_atual:15,pv_max:20,inventario:[pocao(2)]}});
 await clicar(f,'[data-inv-usar]',{invUsar:'0'});
 assert.match(f.document.el('uso-box').innerHTML,/Poção de Cura/);assert.match(f.document.el('uso-box').innerHTML,/disabled/,'sem resultado, o botão de confirmar fica desativado');
 await clicar(f,'#uso-ok');assert.equal(f.p.pv_atual,15,'sem resultado nada acontece');assert.equal(f.p.inventario[0].qtd,2);
 digitar(f,{usoRol:'0'},'9');await clicar(f,'#uso-ok');await clicar(f,'#uso-ok');
 assert.equal(f.p.pv_atual,20,'15 + 9 limitado a 20');assert.equal(f.p.inventario[0].qtd,1,'uma unidade consumida, não duas');
 await f.salvar();assert.equal(envios.length,1);assert.equal(envios[0].pv_atual,20);assert.equal(envios[0].inventario[0].qtd,1);assert.ok(envios[0].ficha.movimentos.some(m=>m.tipo==='uso-efeito'&&/PV 15 → 20/.test(m.resultado[0])));
});
test('falha ao gravar o uso: o estado completo fica pendente e é reenviado, sem consumir de novo',async()=>{
 let tentativas=0;const envios=[];const f=await ficha(async(_q,d)=>{tentativas++;envios.push(JSON.parse(JSON.stringify(d)));if(tentativas===1)throw new Error('sem rede');return[{versao:3}];},{fichaInicial:{pvAuto:false,caAuto:false},registro:{pv_atual:5,pv_max:20,inventario:[pocao(1)]}});
 await clicar(f,'[data-inv-usar]',{invUsar:'0'});digitar(f,{usoRol:'0'},'6');await clicar(f,'#uso-ok');
 await f.salvar();assert.equal(tentativas,1);assert.equal(f.p.inventario.length,0,'o uso já vale na ficha mesmo sem rede');
 f.nome('Outro nome');await f.salvar();   // a próxima gravação leva junto o que ficou pendente
 assert.equal(tentativas,2);assert.equal(f.p.pv_atual,11);assert.equal(f.p.inventario.length,0);
 assert.deepEqual(JSON.parse(JSON.stringify(envios[1].inventario)),[],'o reenvio leva o mesmo estado final, sem segunda baixa');assert.equal(envios[1].pv_atual,11);
});
