const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,executar}=require('./helpers.cjs');
test('biblioteca filtra por campanha sem misturar personagens de campanhas diferentes',()=>{
 const window={},ctx=vm.createContext({window,document:{createElement:()=>({}),}});executar('js/ficha-componentes.js',ctx);
 const lista=[{nome:'Ana',campanha:{id:'A'},ficha:{}},{nome:'Bia',campanha:{id:'B'},ficha:{}},{nome:'Sem',ficha:{}}];
 const F=window.FICHA_COMPONENTES,nomes=r=>JSON.parse(JSON.stringify(r.map(p=>p.nome)));
 assert.deepEqual(nomes(F.filtrarPersonagens(lista,{nome:'',classe:'',nivel:'',campanha:'A'})),['Ana']);
 assert.deepEqual(nomes(F.filtrarPersonagens(lista,{nome:'',classe:'',nivel:'',campanha:''})),['Ana','Bia','Sem']);
});
