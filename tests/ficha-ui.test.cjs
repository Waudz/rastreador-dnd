const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,executar}=require('./helpers.cjs');
test('abas mantêm seleção após redesenho e aceitam navegação pelo teclado',()=>{
 const eventos={},nomes=['principal','combate','magias'];let foco;
 const abas=nomes.map(nome=>({dataset:{fichaAba:nome},setAttribute(k,v){this[k]=v;},focus(){foco=nome;},click(){eventos.click({target:{closest:()=>this}});}}));
 const paineis=nomes.map(nome=>({dataset:{fichaSecao:nome}}));
 const window={},document={body:{classList:{contains:()=>false}},getElementById:()=>({}),querySelectorAll:s=>s==='[data-ficha-aba]'?abas:paineis,addEventListener:(n,f)=>eventos[n]=f};
 executar('js/ficha-ui.js',vm.createContext({window,document}));
 window.atualizarAbasFicha();assert.equal(paineis[0].hidden,false);assert.equal(paineis[1].hidden,true);
 eventos.keydown({key:'ArrowRight',preventDefault(){},target:{closest:()=>abas[0]}});
 assert.equal(foco,'combate');assert.equal(paineis[1].hidden,false);assert.equal(abas[1]['aria-selected'],'true');
 window.atualizarAbasFicha();assert.equal(paineis[1].hidden,false);
 eventos.keydown({key:'End',preventDefault(){},target:{closest:()=>abas[1]}});assert.equal(foco,'magias');
});
test('rolagens somam dados e modificadores e rejeitam expressões inválidas',()=>{
 const window={};executar('js/rolagens.js',vm.createContext({window}));
 const r=window.ROLAGENS.rolar('2d6+3',2,()=>.5);
 assert.equal(r.total,13);assert.equal(r.dados.length,2);
 assert.equal(window.ROLAGENS.rolar('1d20',-1,()=>0).total,0);
 for(const x of ['0d6','99d1000','1d1','alert(1)','3d6+NaN'])assert.throws(()=>window.ROLAGENS.rolar(x));
});
