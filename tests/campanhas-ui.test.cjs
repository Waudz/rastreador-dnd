const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,executar,armazenamento}=require('./helpers.cjs');
function fixture(user){const window={nuvem:{usuario:()=>user===undefined?null:user}},localStorage=armazenamento();executar('js/campanhas-ui.js',vm.createContext({window,localStorage,URLSearchParams}));return {C:window.CAMPANHAS_UI,localStorage};}
const membros=[{papel:'jogador',campanha:{id:'c',nome:'Campanha'}}];
test('entrada só abre a preferência que pertence às campanhas carregadas',()=>{
 const {C,localStorage}=fixture();localStorage.setItem('ini_campanha','outra-conta');assert.equal(C.entrada(membros,'?aba=campanhas'),'');
 C.lembrar('c');assert.equal(C.entrada(membros,'?aba=campanhas'),'campanha.html?id=c');
 assert.equal(C.entrada([],''),'');
});
test('gerenciamento, biblioteca e conta não sofrem redirecionamento automático',()=>{
 const {C}=fixture();C.lembrar('c');for(const busca of ['?aba=personagens','?aba=conta','?aba=campanhas&gerenciar=1&acao=criar'])assert.equal(C.entrada(membros,busca),'');
});

test('a campanha ativa é lembrada por usuário e nunca vaza para outra conta',()=>{
 const a=fixture({id:'ana'});a.C.lembrar('c');assert.equal(a.localStorage.getItem('ini_campanha:ana'),'c');
 const b=fixture({id:'beto'});b.localStorage.setItem('ini_campanha:ana','c');b.localStorage.setItem('ini_campanha:beto','x');
 assert.equal(b.C.entrada(membros,''),'');                      // a preferência de Beto aponta para campanha que ele não tem
 assert.equal(b.C.ativaId(),'x');
});
test('sem preferência alguma, a única campanha abre direto; com várias, mostra a lista',()=>{
 const f=fixture({id:'u'});assert.equal(f.C.entrada(membros,''),'campanha.html?id=c');
 const duas=membros.concat([{papel:'mestre',campanha:{id:'d',nome:'D'}}]);assert.equal(f.C.entrada(duas,''),'');
});
test('preferência antiga global continua valendo para quem ainda não tem a própria, mas só se for membro',()=>{
 const f=fixture({id:'u'});f.localStorage.setItem('ini_campanha','c');assert.equal(f.C.entrada(membros,''),'campanha.html?id=c');
 f.localStorage.setItem('ini_campanha','fora');assert.equal(f.C.entrada(membros.concat([{papel:'mestre',campanha:{id:'d',nome:'D'}}]),''),'');
});
test('esquecer remove só a campanha inacessível',()=>{
 const f=fixture({id:'u'});f.C.lembrar('c');f.C.esquecer('outra');assert.equal(f.C.ativaId(),'c');f.C.esquecer('c');assert.equal(f.C.ativaId(),'');
});

test('abertura rápida usa só a preferência local e respeita gerenciar, ação e abas de conta',()=>{
 const f=fixture({id:'u'});assert.equal(f.C.entradaRapida(''),'');
 f.C.lembrar('c');assert.equal(f.C.entradaRapida('?aba=campanhas'),'campanha.html?id=c');
 for(const b of ['?aba=conta','?aba=personagens','?gerenciar=1','?acao=criar'])assert.equal(f.C.entradaRapida(b),'');
 assert.equal(fixture().C.entradaRapida(''),'');                // sem sessão nunca redireciona
});
