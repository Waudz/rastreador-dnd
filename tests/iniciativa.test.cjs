const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,executar,documentoFalso,armazenamento}=require('./helpers.cjs');
function fixture(saved){const document=documentoFalso(),localStorage=armazenamento();document.getElementById=id=>document.el(id);document.createElement=()=>({});document.el('current-turn').after=()=>{};if(saved)localStorage.setItem('dnd5e_initiative_tracker_v1',JSON.stringify(saved));const window={};const ctx=vm.createContext({window,document,localStorage,ico:()=>'',confirm:()=>true});executar('js/iniciativa.js',ctx);return{document,localStorage,ini:window.__ini};}
const pessoa=(name,initiative)=>({name,initiative,hp:10,maxHp:10,ac:12,kind:'Personagem',pid:name});
test('iniciativa pendente fica vazia e impede começar o combate',()=>{const f=fixture();f.ini.add(pessoa('Pendente',null));assert.match(f.document.el('combatants').innerHTML,/data-iniciativa="[^"]+" value=""/);assert.equal(f.document.el('start').disabled,true);f.document.el('start').events.click();assert.ok(!f.document.el('current-turn').innerHTML.includes('Vez de:'));});
test('resultado zero e negativo são válidos; pendente fica por último',()=>{const f=fixture();f.ini.add(pessoa('Pendente',null));f.ini.add(pessoa('Negativo',-2));f.ini.add(pessoa('Zero',0));const html=f.document.el('combatants').innerHTML;assert.ok(html.indexOf('Iniciativa de Zero')<html.indexOf('Iniciativa de Negativo'));assert.ok(html.indexOf('Iniciativa de Negativo')<html.indexOf('Iniciativa de Pendente'));});
test('editar iniciativa reordena, salva e permite limpar sem converter em zero',()=>{const f=fixture();f.ini.add(pessoa('Herói',null));const id=f.ini.list()[0].id,change=f.document.el('combatants').events.change;change({target:{dataset:{iniciativa:id},value:'17'}});assert.equal(f.ini.list()[0].initiative,17);assert.equal(f.document.el('start').disabled,false);change({target:{dataset:{iniciativa:id},value:''}});assert.equal(f.ini.list()[0].initiative,null);const saved=JSON.parse(f.localStorage.getItem('dnd5e_initiative_tracker_v1'));assert.equal(saved.combatants[0].initiative,null);const reload=fixture(saved);assert.equal(reload.ini.list()[0].initiative,null);});
test('atualização automática não substitui o campo durante digitação',()=>{const f=fixture();f.ini.add(pessoa('Herói',null));const id=f.ini.list()[0].id;let escritas=0;Object.defineProperty(f.document.el('combatants'),'innerHTML',{set(){escritas++;},get(){return'';}});f.document.activeElement={matches:()=>true};f.document.el('combatants').events.focusin({target:{dataset:{iniciativa:id},select(){}}});f.ini.render();assert.equal(escritas,0);assert.equal(f.ini.list()[0].initiative,null);assert.equal(JSON.parse(f.localStorage.getItem('dnd5e_initiative_tracker_v1')).combatants[0].initiative,null);});

/* combate separado por campanha */
function comCampanha({saved,search='',ativa='',user={id:'u'}}={}){const document=documentoFalso(),localStorage=armazenamento();document.getElementById=id=>document.el(id);document.createElement=()=>({});document.el('current-turn').after=()=>{};if(saved)localStorage.setItem('dnd5e_initiative_tracker_v1',JSON.stringify(saved));const window={nuvem:{usuario:()=>user},CAMPANHAS_UI:{ativaId:()=>ativa}};const ctx=vm.createContext({window,document,localStorage,location:{search},URLSearchParams,ico:()=>'',confirm:()=>true});executar('js/iniciativa.js',ctx);return{document,localStorage,ini:window.__ini};}
const nomes=(f)=>JSON.parse(JSON.stringify(f.ini.list().map(c=>c.name)));
const em=(name,campanhaId)=>({name,initiative:5,hp:5,maxHp:5,ac:10,kind:'NPC',...(campanhaId?{campanhaId}:{})});
test('cada campanha guarda o seu combate e trocar de campanha não mistura combatentes',()=>{
 const f=comCampanha({ativa:'A'});f.ini.add(em('Orc de A','A'));
 f.ini.trocarContexto('B');assert.equal(f.ini.list().length,0);f.ini.add(em('Goblin de B','B'));
 f.ini.trocarContexto('A');assert.deepEqual(nomes(f),['Orc de A']);
 assert.ok(f.localStorage.getItem('dnd5e_initiative_tracker_v1:A')&&f.localStorage.getItem('dnd5e_initiative_tracker_v1:B'));
});
test('o estado antigo é adotado pela primeira campanha, sem perder o que pertence a outra',()=>{
 const f=comCampanha({ativa:'A',saved:{combatants:[{...em('Livre'),id:'1'},{...em('Meu','A'),id:'2'},{...em('Alheio','B'),id:'3'}],currentId:'3',round:4,nextOrder:3,stats:{}}});
 assert.deepEqual(nomes(f).sort(),['Livre','Meu']);
 const sobra=JSON.parse(f.localStorage.getItem('dnd5e_initiative_tracker_v1'));assert.deepEqual(sobra.combatants.map(c=>c.name),['Alheio']);
 f.ini.trocarContexto('B');assert.deepEqual(nomes(f),['Alheio']);
});
test('sem sessão ou sem campanha o rastreador avulso continua usando a chave antiga',()=>{
 const f=comCampanha({ativa:'A',user:null,saved:{combatants:[{...em('Avulso'),id:'1'}],round:2}});
 assert.equal(f.ini.contexto(),'');assert.equal(f.ini.list()[0].name,'Avulso');
});
test('o link da campanha tem prioridade sobre a preferência lembrada',()=>{
 assert.equal(comCampanha({ativa:'A',search:'?campanha=Z'}).ini.contexto(),'Z');
});
