const {test}=require('node:test'),assert=require('node:assert/strict');
const {ler}=require('./helpers.cjs');
test('cabeçalho é fixo, sem rolagem horizontal e com navegação em grade de cinco colunas no celular',()=>{
 const css=ler('css/identidade.css'),base=ler('css/estilo.css');
 assert.match(css,/\.appheader\s*\{[^}]*position:sticky;[^}]*top:0/);
 const nav=[...css.matchAll(/\.appnav\s*\{([^}]+)\}/g)].map(m=>m[1]);
 assert.ok(nav.length>=1);
 assert.ok(nav[0].includes('display:grid')&&nav[0].includes('repeat(5,minmax(0,1fr))'));
 for(const r of nav)assert.doesNotMatch(r,/overflow-x:\s*(auto|scroll)/);
 assert.doesNotMatch(base,/\.appnav\s*\{[^}]*overflow-x:auto/);
 assert.match(css,/\.appnav a\s*\{[^}]*flex-direction:column/);          // ícone sobre a legenda no celular
 assert.match(css,/@media \(min-width:760px\)[\s\S]*\.appnav a\s*\{[^}]*flex-direction:row/); // nomes completos no desktop
});
test('avatar da conta é circular; retratos de personagens são quadrados com cantos suaves',()=>{
 const css=ler('css/identidade.css'),base=ler('css/estilo.css');
 assert.match(css,/\.appavatar\s*\{[^}]*border-radius:50%/);
 assert.match(base,/\.av\{[^}]*aspect-ratio:1\/1;[^}]*border-radius:10px;[^}]*object-fit:cover/);
 assert.doesNotMatch(base,/\.avfx[^{]*\{[^}]*border-radius:\s*50%/);
});
test('folhas comuns da navegação são carregadas nas páginas principais',()=>{
 for(const pagina of ['index.html','conta.html','campanha.html','personagem.html','criar-personagem.html','iniciativa.html']){
   const h=ler(pagina);assert.match(h,/href="css\/identidade.css"/);assert.match(h,/src="js\/navegacao.js"/);
 }
});
