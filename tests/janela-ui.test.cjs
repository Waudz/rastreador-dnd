const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('componente compartilhado expõe API de janelas',()=>{
 const s=fs.readFileSync('js/janela.js','utf8'),ctx={window:{}};vm.runInNewContext(s,ctx);
 assert.equal(typeof ctx.window.COMP_JANELA.abrir,'function');
});
test('páginas principais carregam o componente e preservam suas seções',()=>{
 for(const p of ['personagem.html','itens.html','campanha.html','conta.html','iniciativa.html','criar-personagem.html']){
  const s=fs.readFileSync(p,'utf8');assert.ok(s.includes("js/janela.js"));assert.match(s,/<main/);
 }
});
test('catálogo usa o diálogo comum e mantém compatibilidade com o fechamento',()=>{
 const s=fs.readFileSync('js/itens.js','utf8');
 assert.ok(s.includes("COMP_JANELA.abrir"));assert.match(s,/data-modal-fechar/);
});
