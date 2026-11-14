const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ler = arquivo => fs.readFileSync(path.join(__dirname,'..','js',arquivo),'utf8');
test('monstros globais: excluir e restaurar usam exclusão lógica e confirmação',()=>{
 const s=ler('app.js');
 assert.match(s,/data-global-del/);assert.match(s,/data-global-restore/);
 assert.match(s,/await perguntar\(`Excluir/);assert.match(s,/await perguntar\(`Restaurar/);
 assert.match(s,/CATALOGO\.salvar\('monstro', key, null, \{ excluido: true \}\)/);
 assert.match(s,/CATALOGO\.salvar\('monstro', key, null, \{ excluido: false \}\)/);
 assert.match(s,/if \(!window\.CATALOGO\?\.admin\(\)\) return;/);
});
test('itens globais: excluir e restaurar preservam dados e exigem administrador',()=>{
 const s=ler('itens.js');
 assert.match(s,/data-it-excluir/);assert.match(s,/data-it-restaurar/);
 assert.match(s,/CATALOGO\.salvar\('item',it\.id,null,\{excluido:true\}\)/);
 assert.match(s,/CATALOGO\.salvar\('item', key, null, \{ excluido: false \}\)/);
 assert.match(s,/if \(!window\.CATALOGO\?\.admin\(\)\) return;/);
});
