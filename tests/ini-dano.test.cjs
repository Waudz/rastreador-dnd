const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,ler,documentoFalso,armazenamento}=require('./helpers.cjs');
/* Roda js/iniciativa.js de verdade num DOM mínimo para conferir o dano aplicado pelo painel Atacar. */
function iniciativa(){
  const document=documentoFalso(),localStorage=armazenamento(),el0=document.el,gerados=new Map();
  const completo=e=>{for(const m of ['after','before','append','prepend','remove','insertAdjacentHTML','focus','scrollIntoView','select','click','blur'])e[m]=e[m]||(()=>{});e.querySelector=e.querySelector||(()=>completo(el0('__q')));e.querySelectorAll=e.querySelectorAll||(()=>[]);e.closest=e.closest||(()=>null);e.addEventListener=e.addEventListener||(()=>{});e.dataset=e.dataset||{};e.children=e.children||[];return e;};
  document.el=id=>completo(el0(id));document.getElementById=id=>document.el(id);document.querySelector=s=>document.el(s.replace(/^#/,''));document.createElement=()=>document.el('__c'+gerados.size+gerados.set(gerados.size,1).size);document.body.append=()=>{};document.addEventListener=()=>{};document.documentElement={dataset:{}};
  const w={addEventListener(){}};
  const c=vm.createContext({ico:()=>'',window:w,document,localStorage,location:{search:''},URLSearchParams,console,setTimeout,clearTimeout,setInterval(){},navigator:{}});
  vm.runInContext(ler('js/iniciativa.js'),c);return w.__ini;
}
test('aplicarDano reduz PV sem passar de 0, conta abates e aceita atacante explícito',()=>{
  const I=iniciativa();I.add({name:'Goblin',kind:'Monstro',initiative:12,hp:7,maxHp:7,ac:15});I.add({name:'Herói',kind:'Personagem',initiative:15,hp:20,maxHp:20,ac:16});
  const [g,h]=I.list();assert.equal(I.aplicarDano(g.id,5,h.id),true);assert.equal(g.hp,2);assert.equal(I.aplicarDano(g.id,9,h.id),true);assert.equal(g.hp,0);
  assert.equal(I.aplicarDano('x',3),false);assert.equal(I.aplicarDano(g.id,0),false);assert.equal(typeof I.atual,'function');
});
