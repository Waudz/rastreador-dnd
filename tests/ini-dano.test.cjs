const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,ler,documentoFalso,armazenamento}=require('./helpers.cjs');
/* Roda js/iniciativa.js de verdade num DOM mínimo para conferir o dano aplicado pelo painel Atacar. */
function iniciativa(salvo){
  const document=documentoFalso(),localStorage=armazenamento(),el0=document.el,gerados=new Map();if(salvo)localStorage.setItem('dnd5e_initiative_tracker_v1',JSON.stringify(salvo));
  const completo=e=>{for(const m of ['after','before','append','prepend','remove','insertAdjacentHTML','focus','scrollIntoView','select','click','blur'])e[m]=e[m]||(()=>{});e.querySelector=e.querySelector||(()=>completo(el0('__q')));e.querySelectorAll=e.querySelectorAll||(()=>[]);e.closest=e.closest||(()=>null);e.addEventListener=e.addEventListener||(()=>{});e.dataset=e.dataset||{};e.children=e.children||[];return e;};
  document.el=id=>completo(el0(id));document.getElementById=id=>document.el(id);document.querySelector=s=>document.el(s.replace(/^#/,''));document.createElement=()=>document.el('__c'+gerados.size+gerados.set(gerados.size,1).size);document.body.append=()=>{};document.addEventListener=()=>{};document.documentElement={dataset:{}};
  const w={addEventListener(){}};
  const c=vm.createContext({ico:()=>'',window:w,document,localStorage,location:{search:''},URLSearchParams,console,setTimeout,clearTimeout,setInterval(){},navigator:{}});
  vm.runInContext(ler('js/iniciativa.js'),c);w.__ini.__doc=document;return w.__ini;
}
test('aplicarDano reduz PV sem passar de 0, conta abates e aceita atacante explícito',()=>{
  const I=iniciativa();I.add({name:'Goblin',kind:'Monstro',initiative:12,hp:7,maxHp:7,ac:15});I.add({name:'Herói',kind:'Personagem',initiative:15,hp:20,maxHp:20,ac:16});
  const [g,h]=I.list();assert.equal(I.aplicarDano(g.id,5,h.id),true);assert.equal(g.hp,2);assert.equal(I.aplicarDano(g.id,9,h.id),true);assert.equal(g.hp,0);
  assert.equal(I.aplicarDano('x',3),false);assert.equal(I.aplicarDano(g.id,0),false);assert.equal(typeof I.atual,'function');
});

test('lista do combate: quem está na vez sobe ao topo em destaque, o próximo vem logo abaixo e quem acabou de jogar vai para o fim; a ordem de iniciativa não muda',()=>{
  const cs=[['A',20],['B',15],['C',10],['D',5]].map(([name,i],k)=>({id:'id'+name,name,kind:'Monstro',initiative:i,hp:5,maxHp:5,ac:10,order:k}));
  const ordem=vez=>{const I=iniciativa({combatants:JSON.parse(JSON.stringify(cs)),currentId:vez,round:2,nextOrder:4,stats:{}}),h=I.__doc.el('combatants').innerHTML;return {nomes:[...h.matchAll(/class="nome-texto">(\w)<\/span>/g)].map(m=>m[1]),ativos:(h.match(/class="combatant active/g)||[]).length,proximos:(h.match(/class="combatant  ?proximo/g)||[]).length,h};};
  for(const [vez,esperado] of [['idC','CDAB'],['idA','ABCD'],['idD','DABC'],['idB','BCDA'],[null,'ABCD']]){const r=ordem(vez);assert.equal(r.nomes.join(''),esperado,'vez de '+vez);if(vez){assert.equal(r.ativos,1);assert.equal(r.proximos,1);assert.ok(r.h.indexOf('class="combatant active')<r.h.indexOf('proximo'),'o destaque vem antes do próximo');}}
  const r=ordem('idC');assert.match(r.h,/Turno atual/);assert.match(r.h,/proximo-badge">Próximo/);
});
const novo=(lista,extra={})=>{const I=iniciativa({combatants:lista.map(([name,i,hp,kind],k)=>({id:'i'+name,name,kind:kind||'Monstro',initiative:i,hp:hp??10,maxHp:10,ac:12,order:k})),currentId:extra.vez||null,round:extra.rodada||1,nextOrder:9,stats:{}});return I;};
test('PV rápidos: PV temporários absorvem o dano primeiro e não se acumulam; cura respeita o máximo; Desfazer volta só o que mudou',()=>{
  const I=novo([['A',20,10],['B',10,10,'Personagem']]),[a,b]=I.list();
  assert.equal(I.darTemp(a.id,5),true);assert.equal(a.temp,5);I.darTemp(a.id,3);assert.equal(a.temp,5,'vale o maior, não soma');I.darTemp(a.id,8);assert.equal(a.temp,8);
  I.aplicarDano(a.id,6);assert.equal(a.temp,2);assert.equal(a.hp,10,'só os temporários perderam');I.aplicarDano(a.id,5);assert.equal(a.temp,0);assert.equal(a.hp,7);
  I.curar(a.id,50);assert.equal(a.hp,10,'cura limitada ao máximo');
  I.aplicarDano(a.id,4);assert.equal(a.hp,6);assert.equal(I.desfazerUltimo(),true);assert.equal(a.hp,10);assert.equal(I.desfazerUltimo(),true);assert.equal(a.hp,7,'desfaz a cura que subiu de 7 para 10');
  assert.equal(I.curar(a.id,0),false);assert.equal(I.aplicarDano(a.id,-3),false);assert.equal(b.hp,10,'o outro combatente não mudou');
});
test('personagem a 0 PV: dano soma falha contra a morte (3 = morte); cura zera; monstro a 0 PV não joga o turno e os mortos ficam de fora; rodada conta certo',()=>{
  const I=novo([['A',20,10],['B',15,10,'Personagem'],['C',10,10],['D',5,10]],{vez:'iD'}),[a,b,c,d]=I.list();
  I.aplicarDano(b.id,10);assert.equal(b.hp,0);assert.deepEqual(JSON.parse(JSON.stringify(b.morte)),{s:0,f:0});I.aplicarDano(b.id,3);I.aplicarDano(b.id,3);assert.equal(b.morte.f,2);I.curar(b.id,4);assert.equal(b.morte,null,'cura a partir de 0 zera');assert.equal(b.hp,4);
  I.aplicarDano(b.id,4);I.aplicarDano(b.id,1);I.aplicarDano(b.id,1);I.aplicarDano(b.id,1);assert.equal(b.morto,true,'três falhas');
  I.aplicarDano(a.id,10);assert.equal(a.hp,0,'monstro a 0 PV');
  const r0=I.rodada();I.moverTurno(1);assert.equal(I.list().find(x=>x.id==='iD').hp,10);assert.equal(I.rodada(),r0+1,'D era o último: nova rodada');
  const J=novo([['A',20,0],['B',15,10,'Personagem'],['C',10,10]],{vez:'iC',rodada:3});J.moverTurno(1);assert.equal(J.atual(),'iB','A (monstro a 0 PV) é pulado');assert.equal(J.rodada(),4);
  const K=novo([['A',20,0],['B',15,0,'Personagem'],['C',10,10]],{vez:'iC'});K.moverTurno(1);assert.equal(K.atual(),'iB','personagem a 0 PV joga (salvaguarda contra a morte)');
  const L=novo([['A',20,0],['B',15,0],['C',10,0]],{vez:'iC'});L.moverTurno(1);assert.equal(L.atual(),'iA','todos derrotados: segue a ordem normal');
  const M=novo([['A',20,10],['B',15,0],['C',10,10]],{vez:'iC',rodada:2});M.moverTurno(-1);assert.equal(M.atual(),'iA','voltando também pula quem está derrotado');assert.equal(M.rodada(),2);
});
