const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,executar,armazenamento}=require('./helpers.cjs');
function fixture(){const window={},localStorage=armazenamento();executar('js/campanhas-ui.js',vm.createContext({window,localStorage,URLSearchParams}));return {C:window.CAMPANHAS_UI,localStorage};}
const membros=[{papel:'jogador',campanha:{id:'c',nome:'Campanha'}}];
test('entrada só abre a preferência que pertence às campanhas carregadas',()=>{
 const {C,localStorage}=fixture();localStorage.setItem('ini_campanha','outra-conta');assert.equal(C.entrada(membros,'?aba=campanhas'),'');
 C.lembrar('c');assert.equal(C.entrada(membros,'?aba=campanhas'),'campanha.html?id=c');
 assert.equal(C.entrada([],''),'');
});
test('gerenciamento, biblioteca e conta não sofrem redirecionamento automático',()=>{
 const {C}=fixture();C.lembrar('c');for(const busca of ['?aba=personagens','?aba=conta','?aba=campanhas&gerenciar=1&acao=criar'])assert.equal(C.entrada(membros,busca),'');
});
