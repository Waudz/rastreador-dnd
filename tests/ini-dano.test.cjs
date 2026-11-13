const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,ler,documentoFalso,armazenamento}=require('./helpers.cjs');
/* Roda js/iniciativa.js de verdade num DOM mínimo para conferir o dano aplicado pelo painel Atacar. */
function iniciativa(salvo){
  const document=documentoFalso(),localStorage=armazenamento(),el0=document.el,gerados=new Map();if(salvo)localStorage.setItem('dnd5e_initiative_tracker_v1',JSON.stringify(salvo));
  const completo=e=>{for(const m of ['after','before','append','prepend','remove','insertAdjacentHTML','focus','scrollIntoView','select','click','blur'])e[m]=e[m]||(()=>{});e.querySelector=e.querySelector||(()=>completo(el0('__q')));e.querySelectorAll=e.querySelectorAll||(()=>[]);e.closest=e.closest||(()=>null);e.addEventListener=e.addEventListener||(()=>{});e.dataset=e.dataset||{};e.children=e.children||[];return e;};
  document.el=id=>completo(el0(id));document.getElementById=id=>document.el(id);document.querySelector=s=>document.el(s.replace(/^#/,''));document.createElement=()=>document.el('__c'+gerados.size+gerados.set(gerados.size,1).size);document.body.append=()=>{};document.addEventListener=()=>{};document.documentElement={dataset:{}};
  const w={addEventListener(){},confirm:m=>{(w.perguntas??=[]).push(m);return w.respostas&&w.respostas.length?w.respostas.shift():true;}};
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

const pe=(lista,extra)=>{const I=novo(lista,extra);I.__w=I.__doc?null:null;return I;};
test('0 PV (2014): crítico a 0 PV vale 2 falhas, dano igual ou maior que o PV máximo mata, dano massivo ao cair mata e dano que não passa o limite só derruba',()=>{
  const I=novo([['P',10,5,'Personagem'],['Q',9,4,'Personagem'],['R',8,4,'Personagem']]),[p,q,r]=I.list();p.maxHp=10;q.maxHp=10;r.maxHp=10;
  I.aplicarDano(p.id,5);assert.equal(p.hp,0);assert.equal(p.morto,undefined);I.aplicarDano(p.id,2,undefined,{critico:true});assert.equal(p.morte.f,2,'crítico a 0 PV: duas falhas');I.aplicarDano(p.id,1);assert.equal(p.morto,true,'terceira falha');
  I.aplicarDano(q.id,13);assert.equal(q.hp,0);assert.ok(!q.morto,'sobraram 9 (< PV máximo 10): só cai');I.aplicarDano(q.id,10);assert.equal(q.morto,true,'dano a 0 PV igual ao PV máximo: morte instantânea');
  I.aplicarDano(r.id,14);assert.equal(r.morto,true,'sobraram 10 = PV máximo: dano massivo');
  I.aplicarDano(r.id,3);assert.equal(r.morte.f,0,'morto não recebe mais falhas');
});
test('estabilização e salvaguardas registradas à mão: estável não faz salvaguarda, dano o desestabiliza com falha; natural 1 = 2 falhas; natural 20 = 1 PV; 3 sucessos estabilizam',()=>{
  const I=novo([['P',10,6,'Personagem']]),[p]=I.list();p.maxHp=10;I.aplicarDano(p.id,6);
  I.estabilizar(p.id);assert.equal(p.estavel,true);I.aplicarDano(p.id,2);assert.equal(p.estavel,false,'dano desfaz a estabilização');assert.equal(p.morte.f,1);
  I.salvaMorte(p.id,'f2');assert.equal(p.morte.f,3);assert.equal(p.morto,true,'1 + 2 falhas');
  const Q=novo([['Q',10,0,'Personagem']]),[q]=Q.list();Q.salvaMorte(q.id,'s');Q.salvaMorte(q.id,'s');assert.ok(!q.estavel);Q.salvaMorte(q.id,'s');assert.equal(q.estavel,true,'3 sucessos');
  const T=novo([['T',10,0,'Personagem']]),[t]=T.list();T.salvaMorte(t.id,'f');T.salvaMorte(t.id,'n20');assert.equal(t.hp,1,'20 natural: volta a 1 PV');assert.equal(t.morte,null);assert.equal(T.salvaMorte(t.id,'s'),false,'com PV não faz salvaguarda');
});
test('monstros e NPCs: a 0 PV ficam inconscientes/derrotados (podem ser curados); mortos não recebem dano nem cura comum e podem ser revividos',()=>{
  const I=novo([['M',10,6],['N',9,6,'NPC'],['P',8,6,'Personagem']],{vez:'iP'}),[m,n,p]=I.list();
  I.aplicarDano(m.id,6);assert.equal(m.hp,0);assert.ok(!m.morto,'a 0 PV o monstro é inconsciente/derrotado, não morto');assert.equal(m.morte,undefined,'sem salvaguarda contra a morte');
  I.curar(m.id,3);assert.equal(m.hp,3,'inconsciente pode ser curado');
  I.marcarMorto(m.id,true);assert.equal(m.morto,true);assert.equal(I.curar(m.id,5),false);assert.equal(m.hp,3,'cura comum não revive');assert.equal(I.aplicarDano(m.id,1),false);
  I.marcarMorto(m.id,false);assert.equal(m.morto,false);assert.equal(m.hp,3,'reviver não zera quem já tem PV');
  I.aplicarDano(n.id,6);assert.equal(n.hp,0);assert.ok(!n.morto);I.marcarMorto(n.id,true);I.marcarMorto(n.id,false);assert.equal(n.hp,1,'reviver de 0 PV volta a 1 PV');
  I.marcarMorto(m.id,true);I.moverTurno(1);assert.equal(I.atual(),'iN','o morto é pulado (e o N, revivido com 1 PV, joga)');
});
test('Resistência Implacável (meio-orc, 2014): cai a 1 PV em vez de 0 uma vez, registra o uso, não salva de morte instantânea e Desfazer devolve o uso',()=>{
  const I=novo([['O',10,6,'Personagem'],['G',9,6]]),[o]=I.list();o.maxHp=10;o.sync=true;const usos=[];
  I.habilidadesQueda=c=>c.id===o.id?[{id:'resistencia-implacavel',nome:'Resistência Implacável',tipo:'auto',usado:0,limite:1}]:[];I.registrarUso=(c,id,v)=>usos.push([c.id,id,v]);
  I.aplicarDano(o.id,6);assert.equal(o.hp,1,'fica com 1 PV');assert.equal(o.usos['resistencia-implacavel'],1);assert.deepEqual(JSON.parse(JSON.stringify(usos)),[[o.id,'resistencia-implacavel',1]],'uso registrado na ficha (só quem grava)');assert.equal(o.morte,undefined);
  I.aplicarDano(o.id,1);assert.equal(o.hp,0,'segundo uso não existe até o descanso longo');assert.deepEqual(JSON.parse(JSON.stringify(o.morte)),{s:0,f:0});
  I.desfazerUltimo();assert.equal(o.hp,1,'desfaz a queda a 0');I.desfazerUltimo();assert.equal(o.hp,6,'desfaz a primeira queda');assert.equal(o.usos&&o.usos['resistencia-implacavel']||0,0,'desfazer devolve o uso');
  I.aplicarDano(o.id,16);assert.equal(o.morto,true,'dano massivo (10 além de 0 PV, PV máximo 10) não é salvo pela habilidade');assert.equal(o.hp,0);
  const g=I.list()[1];I.aplicarDano(g.id,6);assert.equal(g.hp,0,'combatente sem a característica não é afetado');
  const J=novo([['O2',10,6,'Personagem']]),[o2]=J.list();o2.maxHp=10;J.habilidadesQueda=()=>[{id:'resistencia-implacavel',nome:'Resistência Implacável',tipo:'auto',usado:1,limite:1}];J.aplicarDano(o2.id,6);assert.equal(o2.hp,0,'uso já gasto na ficha desde o último descanso');
});
test('Fúria Implacável (bárbaro 11) e Fortitude dos Mortos-Vivos: pedem a salvaguarda de Constituição com a CD certa e só valem nas condições da regra',()=>{
  const I=novo([['B',10,6,'Personagem'],['Z',9,6]]),[b,z]=I.list();b.maxHp=10;const w=I.__w;
  I.habilidadesQueda=c=>c.id===b.id?[{id:'furia-implacavel',nome:'Fúria Implacável',tipo:'salva',cdBase:10,incremento:5,requer:'furia',usado:0}]:c.id===z.id?[{id:'fortitude-morta-viva',nome:'Fortitude dos Mortos-Vivos',tipo:'salva',cdBase:5,cdPorDano:true,excecoes:true,usado:0,limite:null}]:[];
  I.aplicarDano(b.id,6);assert.equal(b.hp,0,'sem estar em fúria a habilidade não vale');I.curar(b.id,6);b.furia=true;
  I.aplicarDano(b.id,6);assert.equal(b.hp,1,'em fúria e passou na salvaguarda (confirmação simulada)');assert.equal(b.usos['furia-implacavel'],1);
  I.curar(b.id,5);I.aplicarDano(b.id,6);assert.equal(b.hp,1,'passou de novo: a CD agora é 15');
  I.aplicarDano(z.id,8);assert.equal(z.hp,1,'Fortitude: salvaguarda CD 5 + dano (13) passou');
  I.aplicarDano(z.id,1,undefined,{critico:true});assert.equal(z.hp,0,'dano de acerto crítico ignora a Fortitude dos Mortos-Vivos');
});
test('tipo de dano opcional aplica defesas (inclusive Fúria); sem tipo o dano entra inteiro; radiante ignora a Fortitude dos Mortos-Vivos',()=>{
  const I=novo([['B',10,20,'Personagem'],['Z',9,6]]),[b,z]=I.list();b.maxHp=20;
  I.aplicarDano(b.id,10,undefined,{tipo:'slashing'});assert.equal(b.hp,10,'sem fúria o cortante entra inteiro');
  b.furia=true;I.aplicarDano(b.id,6,undefined,{tipo:'slashing'});assert.equal(b.hp,7,'fúria: resistência a cortante (6 vira 3)');
  I.aplicarDano(b.id,4,undefined,{tipo:'fire'});assert.equal(b.hp,3,'fogo não é reduzido pela fúria');
  I.aplicarDano(b.id,2);assert.equal(b.hp,1,'sem tipo informado: dano inteiro (registro rápido)');
  I.habilidadesQueda=c=>c.id===z.id?[{id:'fortitude-morta-viva',nome:'F',tipo:'salva',cdBase:5,cdPorDano:true,excecoes:true,usado:0,limite:null}]:[];
  I.aplicarDano(z.id,6,undefined,{tipo:'radiant'});assert.equal(z.hp,0,'dano radiante ignora a Fortitude');
});
test('salvaguarda contra a morte pelo d20: 10-19 sucesso, 2-9 falha, 1 = duas falhas, 20 = 1 PV; três sucessos estabilizam e três falhas matam',()=>{
  const I=novo([['H',10,0,'Personagem']]),[h]=I.list();h.maxHp=10;
  assert.equal(I.salvaMorteD20(h.id,0),false);assert.equal(I.salvaMorteD20(h.id,21),false);
  I.salvaMorteD20(h.id,12);I.salvaMorteD20(h.id,5);assert.deepEqual(JSON.parse(JSON.stringify(h.morte)),{s:1,f:1});
  I.salvaMorteD20(h.id,1);assert.equal(h.morto,true,'1 natural = duas falhas: 3 no total, morre');
  const J=novo([['H',10,0,'Personagem']]),[j]=J.list();j.maxHp=10;J.salvaMorteD20(j.id,10);J.salvaMorteD20(j.id,19);J.salvaMorteD20(j.id,11);assert.equal(j.estavel,true);
  const K=novo([['H',10,0,'Personagem']]),[k]=K.list();k.maxHp=10;K.salvaMorteD20(k.id,20);assert.equal(k.hp,1);assert.ok(!k.morte||k.morte.f===0);
});
test('recursos e espaços no combate: gasto contado uma vez, limitado ao total, só vai para a ficha com sync e Desfazer devolve',async()=>{
  const I=novo([['B',10,10,'Personagem']]),[b]=I.list();b.pid='p';const reg=[],esp=[];
  I.recursosDe=()=>({recursos:[{id:'furia',nome:'Fúria',max:2,usados:0},{id:'ki',nome:'Pontos de Ki',max:3,usados:0}],slots:[2],usadosSlots:[0]});
  I.registrarUso=(c,id,v)=>reg.push([id,v]);I.gastarEspaco=async(pid,c)=>{esp.push([pid,c]);return{ok:true,msg:''};};
  assert.equal(I.usarRecurso(b.id,'ki'),true);assert.equal(b.usos.ki,1);assert.equal(reg.length,0,'sem sync nada vai para a ficha');
  b.sync=true;I.usarRecurso(b.id,'ki');assert.deepEqual(reg,[['ki',2]]);
  assert.equal((await I.usarEspaco(b.id,1)).ok,true);assert.equal((await I.usarEspaco(b.id,1)).ok,true);assert.equal((await I.usarEspaco(b.id,1)).ok,false,'só 2 espaços');assert.equal(esp.length,2);
  I.desfazerUltimo();assert.equal(b.slots[1],1,'desfazer devolve o espaço');
});
