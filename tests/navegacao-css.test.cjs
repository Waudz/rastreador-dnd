const {test}=require('node:test'),assert=require('node:assert/strict');
const {ler}=require('./helpers.cjs');
test('navegação compartilha faixa horizontal sem grade ou quebra nos breakpoints',()=>{
 const css=ler('css/identidade.css'),base=ler('css/estilo.css');
 const regras=[...css.matchAll(/\.appnav\s*\{([^}]+)\}/g)].map(m=>m[1]);
 assert.equal(regras.length,1,'Uma definição comum, sem sobrescrita móvel');
 const regra=regras[0];for(const propriedade of ['display:flex','flex-flow:row nowrap','overflow-x:auto','overflow-y:hidden','max-width:100%','min-width:0','scrollbar-width:none','scroll-behavior:smooth'])assert.ok(regra.includes(propriedade),propriedade);
 assert.match(css,/\.appnav a\s*\{[^}]*flex:0 0 auto;[^}]*white-space:nowrap/);
 assert.match(css,/\.appnav a\s*\{[^}]*min-height:44px;[^}]*font-size:13px/);
 assert.doesNotMatch(base,/\.appnav\s*\{[^}]*flex-wrap:wrap/);
 assert.doesNotMatch(css,/\.appnav\s*\{[^}]*display:grid/);
});
test('folhas comuns da navegação são carregadas nas páginas principais',()=>{
 for(const pagina of ['index.html','conta.html','campanha.html','personagem.html','criar-personagem.html','iniciativa.html']){
   const h=ler(pagina);assert.match(h,/href="css\/identidade.css"/);assert.match(h,/src="js\/navegacao.js"/);
 }
});
