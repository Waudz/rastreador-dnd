const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,executar}=require('./helpers.cjs');
function fixture(mobile=true){
 let vista=null,anterior=null;const eventos={},classes={},passos=[],dock={prepend(){},setAttribute(){}};
 const document={body:{classList:{toggle:(k,v)=>classes[k]=v}},activeElement:{focus(){}},createElement:()=>({}),getElementById:()=>dock,addEventListener:(n,fn)=>eventos[n]=fn};
 const history={state:{},pushState(s){this.state=s;passos.push(s);},back(){passos.push('back');},go:n=>passos.push(n)};
 const PAINEL={mostrar:id=>{vista={id};anterior=null;},empilhar:id=>{anterior=vista;vista={id};},visivel:()=>vista,temAnterior:()=>!!anterior,voltar:()=>{vista=anterior;anterior=null;},fechar:()=>{vista=null;anterior=null;}};
 const window={PAINEL,scrollY:123,scrollTo:()=>{},addEventListener:(n,fn)=>eventos[n]=fn};
 executar('js/leitura-mobile.js',vm.createContext({window,document,history,matchMedia:()=>({matches:mobile})}));
 return {PAINEL,eventos,history,passos,classes};
}
test('leitura mobile ocupa estado próprio no histórico e volta sem destruir a origem',()=>{const f=fixture();f.PAINEL.mostrar('ci-resumo');assert.equal(f.classes['leitura-mobile'],true);assert.equal(f.history.state.compendioLeitura,1);f.PAINEL.empilhar('spd');assert.equal(f.history.state.compendioLeitura,2);f.eventos.popstate({state:{compendioLeitura:1}});assert.equal(f.PAINEL.visivel().id,'ci-resumo');f.eventos.popstate({state:{}});assert.equal(f.PAINEL.visivel(),null);assert.equal(f.classes['leitura-mobile'],false);});
test('Voltar usa navegação do navegador; desktop mantém o painel habitual',()=>{const m=fixture();m.PAINEL.mostrar('spd');m.PAINEL.voltar();assert.equal(m.passos.at(-1),'back');const d=fixture(false);d.PAINEL.mostrar('spd');assert.equal(d.passos.length,0);assert.equal(d.classes['leitura-mobile'],false);d.PAINEL.fechar();assert.equal(d.PAINEL.visivel(),null);});
