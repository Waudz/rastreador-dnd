const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {ler,root}=require('./helpers.cjs');
const existe=p=>fs.existsSync(path.join(root,p));
test('importador do Livro do Jogador, pdf.js e pacote de 2024 saíram do repositório público',()=>{
 for(const p of ['ferramentas/importar-ldj.html','ferramentas/importar-ldj.js','vendor/pdfjs','dados/bestiario/srd-2024.json'])assert.ok(!existe(p),p);
});
test('catálogos publicados contêm só o SRD 5.1 de 2014',()=>{
 const idx=JSON.parse(ler('dados/bestiario/index.json'));assert.deepEqual(idx.map(p=>p.key),['srd-2014']);
 const h=JSON.parse(ler('dados/habilidades.json'));assert.ok(h.length>100&&h.every(x=>x.e==='2014'));
 const pt=JSON.parse(ler('dados/habilidades-pt.json'));assert.ok(Object.keys(pt).every(k=>k.startsWith('2014|')));
});
test('o aplicativo não lê, grava nem sincroniza texto de livro importado',()=>{
 for(const p of ['js/app.js','js/acervo.js'])assert.ok(!/ini_ldj|\bLDJ\b|\.ldj\b|ldj:/.test(ler(p)),p);
 assert.ok(!/api\.github\.com|raw\.githubusercontent/.test(ler('js/app.js')+ler('js/acervo.js')+ler('js/admin.js')+ler('js/nuvem.js')));
 for(const h of fs.readdirSync(root).filter(f=>f.endsWith('.html')))assert.ok(!/api\.github\.com|api\.open5e\.com/.test(ler(h)),h+' não deve liberar GitHub/Open5e na CSP');
});
test('atribuição do SRD 5.1 completa na página de licenças e resumida em todas as páginas',()=>{
 const l=ler('licencas.html');
 assert.match(l,/This work includes material taken from the System Reference Document 5\.1 \("SRD 5\.1"\) by Wizards of the Coast LLC/);
 assert.match(l,/https:\/\/dnd\.wizards\.com\/resources\/systems-reference-document/);assert.match(l,/https:\/\/creativecommons\.org\/licenses\/by\/4\.0\/legalcode/);
 assert.match(l,/Alterações feitas/);assert.match(l,/MIT/);
 const n=ler('js/navegacao.js');assert.match(n,/System Reference Document 5\.1 da Wizards of the Coast LLC/);assert.match(n,/href="licencas\.html"/);
 for(const h of ['index.html','conta.html','campanha.html','personagem.html','criar-personagem.html','iniciativa.html'])assert.match(ler(h),/src="js\/navegacao\.js"/,h);
});
test('só raças do SRD 5.1 são oferecidas na ficha: Artífice e subclasses de outros livros ficam fora da escolha',()=>{
 const p=ler('js/personagem.js');
 assert.match(p,/R\.classeSrd\(x\.id\)/);assert.match(p,/R\.SUBCLASSES_SRD\[d\.id\]/);
 assert.match(ler('js/criador.js'),/!s\.id\.startsWith\('phb2014:'\)/);
});
