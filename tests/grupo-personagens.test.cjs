const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,executar,documentoFalso}=require('./helpers.cjs');
const c=vm.createContext({window:{},document:documentoFalso(),URLSearchParams});
for(const p of ['js/regras.js','js/ficha-componentes.js','js/rolagens.js','js/grupo-personagens.js','js/campanha-visual.js'])executar(p,c);
const G=c.window.GRUPO_PERSONAGENS,V=c.window.CAMPANHA_VISUAL;
test('bônus de iniciativa usa as regras da ficha, incluindo Versatilidade',()=>{
 assert.equal(G.bonus({atributos:{des:8}}),-1);assert.equal(G.bonus({atributos:{des:14},classes:[{c:'Bard',n:2}]}),3);assert.equal(G.bonus({}),0);
});
test('link do lote preserva campanha e elimina IDs repetidos',()=>{
 const u=new URLSearchParams(G.destino('campanha A',['a','b','a']).split('?')[1]);assert.equal(u.get('campanha'),'campanha A');assert.equal(u.get('personagens'),'a,b');assert.equal(u.get('rolar'),'1');
});
test('cabeçalho compacto reutiliza a ficha e escapa nomes',()=>{
 const h=G.identidade({id:'p',nome:'<nome>',ca:15,ficha:{classes:[{c:'Wizard',n:3}]}},{resumo:true});assert.match(h,/Mago 3/);assert.match(h,/Nível 3/);assert.match(h,/CA 15/);assert.match(h,/&lt;nome&gt;/);assert.match(h,/data-ci-resumo="p"/);
});
test('prévia aceita apenas imagens raster de até 8 MB',()=>{
 for(const type of ['image/png','image/jpeg','image/webp'])assert.doesNotThrow(()=>V.validar({type,size:1000}));
 assert.throws(()=>V.validar({type:'image/svg+xml',size:1000}),/PNG/);assert.throws(()=>V.validar({type:'image/png',size:9*1024*1024}),/8 MB/);
});
test('símbolo opcional é circular e tem alternativa discreta',()=>{
 assert.match(V.simbolo('','Campanha'),/campanha-simbolo/);assert.doesNotMatch(V.simbolo('','Campanha'),/<img/);assert.match(V.simbolo('blob:teste','Campanha',true),/pequeno/);
});

test('aparência trata as quatro combinações de imagens e não fornece edição ao jogador',()=>{
 for(const visual of [{},{simbolo:'blob:simbolo'},{backdrop:'blob:fundo'},{simbolo:'blob:simbolo',backdrop:'blob:fundo'}]){
  const document=documentoFalso(),classes=new Map();
  document.el('.campanha-compacta').classList.toggle=(nome,valor)=>classes.set(nome,valor);
  document.el('.campanha-compacta').style.setProperty=()=>{};
  document.el('campanha-backdrop').removeAttribute=()=>{};
  document.documentElement={clientWidth:1280};document.el('campanha-faixa').getBoundingClientRect=()=>({left:80});
  const contexto=vm.createContext({window:{FICHA_COMPONENTES:c.window.FICHA_COMPONENTES},document,innerWidth:1280,URL:{revokeObjectURL(){}}});
  executar('js/enquadramento.js',contexto);contexto.ENQUADRAMENTO=contexto.window.ENQUADRAMENTO;
  executar('js/campanha-visual.js',contexto);const V=contexto.window.CAMPANHA_VISUAL;
  V.montar({id:'c',mestre:false,visual});
  assert.equal(document.el('campanha-backdrop').hidden,!visual.backdrop);assert.equal(classes.get('com-backdrop'),!!visual.backdrop);
  assert.equal(document.el('campanha-aparencia').innerHTML,'');
  assert.equal(document.el('campanha-simbolo').innerHTML.includes('<img'),!!visual.simbolo);
  V.montar({id:'c',mestre:true});assert.match(document.el('campanha-aparencia').innerHTML,/data-visual-arquivo="simbolo"/);assert.match(document.el('campanha-aparencia').innerHTML,/data-visual-arquivo="backdrop"/);
 }
});
