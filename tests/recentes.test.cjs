const {test}=require('node:test'),assert=require('node:assert/strict');const {vm,ler,armazenamento}=require('./helpers.cjs');
/* Monstros recentes da iniciativa (js/recentes.js): histórico de 15, sem duplicatas, persistente e independente do combate. */
function novo(){const dep=armazenamento(),w={localStorage:dep},c=vm.createContext({window:w,localStorage:dep,console});vm.runInContext(ler('js/recentes.js'),c);return {R:w.RECENTES,dep};}
const L=r=>JSON.parse(JSON.stringify(r));
test('adicionar pela pesquisa registra o monstro; repetir não duplica e sobe para o primeiro lugar',()=>{
  const {R,dep}=novo(),K='ini_recentes';
  assert.deepEqual(L(R.ler(K,dep)),[]);R.registrar(K,'srd_goblin',dep);R.registrar(K,'srd_orc',dep);assert.deepEqual(L(R.ler(K,dep)),['srd_orc','srd_goblin']);
  R.registrar(K,'srd_goblin',dep);assert.deepEqual(L(R.ler(K,dep)),['srd_goblin','srd_orc'],'sem duplicata: o repetido sobe');
  R.registrar(K,'',dep);R.registrar(K,null,dep);assert.deepEqual(L(R.ler(K,dep)),['srd_goblin','srd_orc'],'identificador vazio é ignorado');
});
test('limite de 15: o mais antigo sai; reutilizar um antigo o leva ao topo',()=>{
  const {R,dep}=novo(),K='k';for(let i=1;i<=16;i++)R.registrar(K,'m'+i,dep);
  const l=L(R.ler(K,dep));assert.equal(l.length,15);assert.equal(l[0],'m16');assert.equal(l[14],'m2');assert.ok(!l.includes('m1'),'m1 foi o mais antigo e saiu');
  R.registrar(K,'m2',dep);assert.equal(L(R.ler(K,dep))[0],'m2');assert.equal(R.ler(K,dep).length,15);
});
test('remover individual e limpar tudo mexem só no histórico; persiste ao reabrir; registros corrompidos viram lista válida',()=>{
  const {R,dep}=novo(),K='k';R.registrar(K,'a',dep);R.registrar(K,'b',dep);R.registrar(K,'c',dep);
  assert.deepEqual(L(R.remover(K,'b',dep)),['c','a']);assert.deepEqual(L(R.remover(K,'zzz',dep)),['c','a'],'remover o que não existe não quebra');
  const {R:R2}=(()=>{const c=vm.createContext({window:{localStorage:dep},localStorage:dep,console});vm.runInContext(ler('js/recentes.js'),c);return {R:c.window.RECENTES};})();assert.deepEqual(L(R2.ler(K,dep)),['c','a'],'reabrir o app mantém o histórico');
  R.limpar(K,dep);assert.deepEqual(L(R.ler(K,dep)),[]);
  dep.setItem(K,'{lixo');assert.deepEqual(L(R.ler(K,dep)),[]);dep.setItem(K,JSON.stringify({a:1}));assert.deepEqual(L(R.ler(K,dep)),[]);
  dep.setItem(K,JSON.stringify(['a',3,null,'a','b','',{x:1},'c']));assert.deepEqual(L(R.ler(K,dep)),['a','b','c'],'só textos válidos, sem repetição');
});
test('a lista persiste só o identificador estável; limpar a iniciativa e o bestiário ausente não quebram: referências inexistentes são descartadas',()=>{
  const app=ler('js/app.js'),ini=ler('js/iniciativa.js'),html=ler('iniciativa.html'),sw=ler('sw.js');
  assert.ok(!/RECENTES|ini_recentes/.test(ini),'o rastreador não conhece o histórico: encerrar ou limpar o combate não o apaga');
  assert.match(app,/acervo\.chave\("ini_recentes"\)/);assert.match(app,/const ok = lista\.filter\(\(k\) => BY\[k\]\)/,'monstro personalizado excluído some do histórico');assert.match(app,/if \(!ALL\.length\) return lista;/,'catálogo carregando não descarta nada');
  assert.match(app,/window\.addEventListener\("ini:adicionado"/);assert.match(app,/if \(!REC \|\| !k \|\| !BY\[k\]\) return;/,'só monstros que existem no bestiário (oficial ou próprio)');
  assert.match(ini,/window\.dispatchEvent\?\.\(new CustomEvent\("ini:adicionado"/);assert.equal((ini.match(/ini:adicionado/g)||[]).length,2,'registra nos dois caminhos de adição, nunca ao pesquisar ou abrir a ficha');
  assert.match(html,/id="recentes-btn"/);assert.match(html,/<script src="js\/recentes\.js" defer><\/script>(?:\s*<script src="js\/ficha-[a-z]+\.js" defer><\/script>)*\s*<script src="js\/app\.js" defer>/);assert.match(sw,/"js\/recentes\.js"/);
});
test('interface: excluir individual sem confirmação, Limpar recentes com a confirmação do site, mensagem de vazio e clique usa o mesmo caminho da pesquisa',()=>{
  const app=ler('js/app.js');
  assert.match(app,/REC\.remover\(chaveRec\(\), x\.dataset\.recX\); renderRecentes\(\); return; \}   \/\/ sem confirmação/);
  assert.match(app,/await perguntar\("Apagar o histórico de monstros recentes\?[^"]*", \{ titulo: "Limpar recentes", ok: "Limpar", perigo: true \}\)/);
  assert.match(app,/Nenhum monstro utilizado recentemente\./);assert.match(app,/if \(it\) \{ pick\(it\.dataset\.rec\);/);
});
