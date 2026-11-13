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
