const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,executar,documentoFalso,ler,root,armazenamento}=require('./helpers.cjs');
const fs=require('node:fs'),path=require('node:path');

test('páginas carregam recursos existentes uma vez e dependências antes dos consumidores',()=>{
 for(const f of fs.readdirSync(root).filter(f=>f.endsWith('.html'))){
  const html=ler(f),scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]),styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
  for(const list of [scripts,styles]){assert.equal(new Set(list).size,list.length,f+' sem duplicações');for(const p of list)assert.ok(fs.existsSync(path.join(root,p)),f+': '+p);}
  for(const [consumidor,dependencias]of [['js/grupo-personagens.js',['js/ficha-componentes.js']],['js/leitor-fichas.js',['js/nuvem.js','js/magias-ui.js','js/painel-detalhes.js']],['js/campanha-ini.js',['js/grupo-personagens.js','js/regras.js','js/iniciativa.js']]])if(scripts.includes(consumidor))for(const d of dependencias)assert.ok(scripts.indexOf(d)>=0&&scripts.indexOf(d)<scripts.indexOf(consumidor),f+': '+d+' antes de '+consumidor);
 }
});

test('campanha revogada apaga a preferência inválida sem reativar o legado',()=>{
 const localStorage=armazenamento(),window={nuvem:{usuario:()=>({id:'u'})}};
 executar('js/campanhas-ui.js',vm.createContext({window,localStorage,URLSearchParams}));
 window.CAMPANHAS_UI.lembrar('removida');assert.equal(window.CAMPANHAS_UI.validar([]),null);assert.equal(window.CAMPANHAS_UI.ativaId(),'');assert.equal(localStorage.getItem('ini_campanha:u'),'');assert.equal(localStorage.getItem('ini_campanha'),null);
 assert.equal(window.CAMPANHAS_UI.entrada([{papel:'mestre',campanha:{id:'outra',nome:'Outra'}}],''),'','exige nova escolha depois de perder acesso, mesmo quando só sobra uma campanha');
});

test('cancelar a aparência exige descarte explícito e recupera a imagem original',()=>{
 const document=documentoFalso(),eventos={};document.addEventListener=(n,fn)=>eventos[n]=fn;
 document.el('.campanha-compacta').style.setProperty=()=>{};document.el('campanha-backdrop').removeAttribute=()=>{};document.documentElement={clientWidth:1280};document.el('campanha-faixa').getBoundingClientRect=()=>({left:80});
 let permite=false,confirmacoes=0;const window={FICHA_COMPONENTES:{esc:s=>String(s)},nuvem:{usuario:()=>({id:'u'})}},c=vm.createContext({window,document,innerWidth:1280,URL:{revokeObjectURL(){}},confirm:()=>{confirmacoes++;return permite;}});
 executar('js/enquadramento.js',c);c.ENQUADRAMENTO=window.ENQUADRAMENTO;executar('js/campanha-visual.js',c);
 const V=window.CAMPANHA_VISUAL;V.montar({id:'c',mestre:true,visual:{simbolo:'original.png'}});
 eventos.click({target:{closest:s=>s==='[data-visual-remover]'?{dataset:{visualRemover:'simbolo'}}:null}});
 assert.doesNotMatch(document.el('campanha-simbolo').innerHTML,/original.png/);assert.equal(V.sair(),false);assert.doesNotMatch(document.el('campanha-simbolo').innerHTML,/original.png/);
 permite=true;assert.equal(V.sair(),true);assert.match(document.el('campanha-simbolo').innerHTML,/original.png/);assert.equal(confirmacoes,2);
});

function menus(){
 const eventos={},foco=[],janela={};let detalhes=[];
 function criar(id){const p={style:{},setAttribute(){},matches(){return false;},showPopover(){},hidePopover(){}};return {id,open:true,isConnected:true,matches:()=>true,querySelector:s=>s==='summary'?{getBoundingClientRect:()=>({right:200,bottom:40}),focus:()=>foco.push(id)}:p};}
 detalhes=[criar('a'),criar('b')];const document={querySelectorAll:()=>detalhes,addEventListener:(n,fn)=>eventos[n]=fn};executar('js/menus.js',vm.createContext({document,window:{addEventListener:(n,fn)=>janela[n]=fn},innerWidth:375,innerHeight:812}));return {eventos,detalhes,foco,janela};
}
test('abrir outro menu fecha o anterior; Esc devolve foco e clique externo fecha tudo',()=>{
 const f=menus();f.eventos.toggle({target:f.detalhes[1]});assert.equal(f.detalhes[0].open,false);assert.equal(f.detalhes[1].open,true);
 let parou=false;f.eventos.keydown({key:'Escape',preventDefault(){},stopImmediatePropagation(){parou=true;}});assert.equal(f.detalhes[1].open,false);assert.deepEqual(f.foco,['b']);assert.equal(parou,true);
 f.detalhes[0].open=true;f.eventos.click({target:{closest:()=>null}});assert.equal(f.detalhes[0].open,false);
});
test('ação fecha o menu, mas um formulário mantém o menu aberto até enviar',()=>{
 const f=menus(),d=f.detalhes[0];f.detalhes[1].open=false;f.eventos.click({target:{closest:s=>s.startsWith('details')?d:s==='a,button'?{}:s==='form,[data-camp-form]'?{}:null}});assert.equal(d.open,true);
 f.eventos.click({target:{closest:s=>s.startsWith('details')?d:s==='a,button'?{}:null}});assert.equal(d.open,false);d.open=true;f.janela.pagehide();assert.equal(d.open,false);
});
