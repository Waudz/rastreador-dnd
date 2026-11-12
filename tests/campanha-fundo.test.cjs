const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,executar,documentoFalso,tick}=require('./helpers.cjs');
async function fixture(avancado=false){
 const document=documentoFalso(),eventos={},frame={desktop:{x:23,y:71,zoom:1.6},mobile:{x:75,y:29,zoom:1.2}};
 document.documentElement={clientWidth:1265};document.addEventListener=(n,fn)=>(eventos[n]??=[]).push(fn);
 document.el('.campanha-compacta').style.setProperty=()=>{};document.el('campanha-backdrop').removeAttribute=()=>{};
 document.el('campanha-faixa').getBoundingClientRect=()=>({left:72.5});
 document.el('campanha-aparencia').insertAdjacentHTML=(_,s)=>document.el('campanha-aparencia').innerHTML+=s;
 const base={versao:1,...(avancado?{enquadramento:frame}:{})},visual={backdrop:'blob:fundo',simbolo:'',posicao:71,posicaoMobile:29,...(avancado?{enquadramento:frame}:{})};
 let fetches=0;const nuvem={usuario:()=>({id:'u'}),observar:()=>()=>{}};
 const window={nuvem,FICHA_COMPONENTES:{esc:String},CAMPANHA_IMAGENS:{carregar:async()=>base,apresentar:async()=>visual},addEventListener:(n,fn)=>eventos[n]=[fn]};
 const c=vm.createContext({window,nuvem,document,innerWidth:1280,URL:{revokeObjectURL(){}},fetch:()=>{fetches++;throw Error('Não deveria buscar arquivos');}});
 executar('js/enquadramento.js',c);c.ENQUADRAMENTO=window.ENQUADRAMENTO;executar('js/campanha-visual.js',c);
 window.CAMPANHA_VISUAL.montar({id:'c',mestre:true});await tick();await tick();
 return {document,eventos,frame,c,fetches:()=>fetches};
}
test('publicação visual funciona sem a migração e desabilita apenas enquadramento avançado',async()=>{const f=await fixture();assert.equal(f.document.el('campanha-backdrop').hidden,false);assert.equal(f.document.el('[data-visual-ajustar]').disabled,true);assert.equal(f.document.el('visual-salvar').disabled,false);assert.match(f.document.el('campanha-aparencia').innerHTML,/Novas imagens usarão a posição atual/);for(const fn of f.eventos.click)fn({target:{closest:s=>s==='[data-visual-ajustar]'?{}:null}});assert.equal(f.fetches(),0);});
test('somente a camada do fundo expande e o recálculo não modifica o enquadramento',async()=>{const f=await fixture(true),antes=JSON.stringify(f.frame);assert.equal(f.document.el('campanha-fundo').style.left,'-72.5px');assert.equal(f.document.el('campanha-fundo').style.width,'1265px');assert.equal(f.document.el('conteudo').style.width,undefined);f.c.innerWidth=375;for(const fn of f.eventos.resize)fn();assert.equal(f.document.el('campanha-fundo').style.left,'0px');assert.equal(f.document.el('campanha-fundo').style.width,'100%');assert.equal(JSON.stringify(f.frame),antes);assert.equal(f.document.el('[data-visual-ajustar]').disabled,false);});
