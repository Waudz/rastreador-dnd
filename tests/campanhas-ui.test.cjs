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

test('barra compacta não mostra convite nem administração ao jogador',async()=>{
 const {documentoFalso}=require('./helpers.cjs'),document=documentoFalso(),localStorage=armazenamento(),chamadas=[];
 const box=document.el('campanha-contexto');box.removeAttribute=()=>{};box.querySelector=s=>document.el(s.slice(1));
 const nuvem={usuario:()=>({id:'u'}),esc:s=>String(s),get:async()=>membros,rpc:async(nome,dados)=>{chamadas.push({nome,dados});return [];}};
 const window={nuvem};executar('js/campanhas-ui.js',vm.createContext({window,nuvem,document,localStorage,URLSearchParams}));
 await window.CAMPANHAS_UI.montarSeletor({id:'c',nome:'Campanha',podeGerenciar:false});
 assert.match(box.innerHTML,/Abrir lista de campanhas/);assert.match(box.innerHTML,/Entrar com código/);assert.doesNotMatch(box.innerHTML,/Compartilhar código|Gerenciar participantes|Prévia da aparência/);
 assert.match(document.el('camp-lista').innerHTML,/aria-current="page"/);
 await assert.rejects(window.CAMPANHAS_UI.entrarPorCodigo('  '),/Digite/);assert.equal(chamadas.length,0);
 await window.CAMPANHAS_UI.entrarPorCodigo(' ABC ');assert.equal(chamadas[0].nome,'entrar_na_campanha');assert.equal(chamadas[0].dados.p_codigo,'ABC');
 await window.CAMPANHAS_UI.montarSeletor({id:'c',nome:'Campanha',podeGerenciar:true,podeEditarVisual:true});assert.doesNotMatch(box.innerHTML,/Compartilhar convite/);assert.doesNotMatch(box.innerHTML,/Gerenciar participantes/);assert.match(box.innerHTML,/Editar aparência/);assert.equal((box.innerHTML.match(/<summary/g)||[]).length,2);
});
test('abrir ou fechar a ficha lateral reposiciona o fundo da campanha (a faixa muda de lugar sem mudar de tamanho)',()=>{
  const {ler}=require('./helpers.cjs'),l=ler('js/paineis-layout.js'),v=ler('js/campanha-visual.js');
  assert.match(l,/dispatchEvent\?\.\(new Event\('paineis:layout'\)\)/);assert.match(v,/addEventListener\?\.\('paineis:layout',\(\)=>requestAnimationFrame\(\(\)=>requestAnimationFrame\(posicionarFundo\)\)\)/);
});
