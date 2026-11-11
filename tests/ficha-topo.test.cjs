const {test}=require('node:test'),assert=require('node:assert/strict');
const {ler}=require('./helpers.cjs');
test('Ficha completa e Editar Personagem ficam juntas no topo da ficha, sem duplicar',()=>{
 const html=ler('personagem.html'),js=ler('js/personagem.js'),ini=ler('iniciativa.html');
 assert.equal((html.match(/id="editar-ficha"/g)||[]).length,1);
 assert.equal((html.match(/id="ficha-completa"/g)||[]).length,1);
 assert.ok(html.indexOf('id="estado"')<html.indexOf('class="ficha-topo-acoes"'));    // indicador de salvamento ao lado, ações no mesmo topo
 assert.ok(!/id="editar-ficha"/.test(js.replace(/\$\("#editar-ficha"\)/g,'')),'o botão não pode mais ser desenhado dentro da ficha');
 assert.ok(!ini.includes('ci-ficha-completa'),'o painel da iniciativa não repete o botão');
});
test('Ficha completa só aparece na ficha embutida e abre a ficha em página própria',()=>{
 const js=ler('js/personagem.js');
 assert.match(js,/if \(fc && emPainel\) \{ fc\.href = "personagem\.html\?id=" \+ encodeURIComponent\(id\); fc\.hidden = false; \}/);
 assert.match(ler('personagem.html'),/id="ficha-completa" target="_blank" rel="noopener"/);
});
test('Editar alterna o rótulo e continua usando a mesma ação de edição',()=>{
 const js=ler('js/personagem.js');
 assert.match(js,/be\.textContent = editandoFicha \? "Concluir Edição" : "Editar Personagem"/);
 assert.match(js,/if\(c\("#editar-ficha"\)\)\{editandoFicha=!editandoFicha;desenhar\(\);return;\}/);
});
test('retratos usam um único padrão quadrado e o avatar da conta é a única exceção circular',()=>{
 const base=ler('css/estilo.css'),fichas=ler('css/fichas.css');
 assert.match(base,/\.av\{[^}]*border-radius:10px/);
 assert.doesNotMatch(fichas,/\.av[^{]*\{[^}]*border-radius:\s*50%/);
 assert.doesNotMatch(fichas,/\.ficha-identidade \.av \{ width:64px!important; height:72px/);      // proporção antiga, não quadrada
});
