const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ler}=require('./helpers.cjs');
const app=ler('js/app.js');
test('edição oficial exige administrador e mantém caminho pessoal separado',()=>{
 assert.match(app,/if \(!m\.custom && !window\.CATALOGO\?\.admin\(\)\) return/);
 assert.match(app,/if \(editGlobal\)[\s\S]*?CATALOGO\.salvar\('monstro', original\.key, global, opcoes\)/);
 assert.match(app,/await put\("mon", \[m\]\)/);
});
test('edição global preserva identificador e origem e utiliza versão capturada',()=>{
 assert.match(app,/key: original\.key, custom: false, document: original\.document/);
 assert.match(app,/const opcoes = \{ versao: editVersion \}/);
 assert.match(app,/if \(formPhoto !== undefined\) opcoes\.imagem = formPhoto/);
});
test('botão de edição oficial só aparece para administrador',()=>{
 assert.match(app,/m\.custom \|\| window\.CATALOGO\?\.admin\(\)/);
 assert.match(app,/m\.custom\|\|window\.CATALOGO\?\.admin\(\)/);
});
