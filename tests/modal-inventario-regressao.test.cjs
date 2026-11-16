const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const ler=p=>fs.readFileSync(p,'utf8');
test('detalhes no inventário reutilizam modal e preservam painel lateral',()=>{
 const p=ler('js/personagem.js'),j=ler('js/janela.js'),pai=ler('js/painel-detalhes.js'),css=ler('css/fichas.css');
 assert.ok(p.includes('window.COMP_JANELA.abrir({ titulo: rotulo'));
 assert.ok(j.includes('tipo:"comp-modal-ficha",aberto:true'));
 assert.ok(j.includes('tipo:"comp-modal-ficha",aberto:false'));
 assert.ok(pai.includes('e.origin !== raiz.location.origin'));
 assert.ok(pai.includes('e.source !== frame.contentWindow'));
 assert.ok(css.includes('#ci-resumo.comp-modal-ativo'));
 assert.ok(p.includes('data-det-editar'));
});
test('detalhes respeitam a raridade do mesmo item mostrado no cartão',()=>{
 const p=ler('js/personagem.js'),css=ler('css/itens.css');
 assert.ok(p.includes('CAT()?.infoMagica?.(it)?.raridade?.chave'));
 for(const r of ['mundano','comum','incomum','rara','muito-rara','lendaria','artefato'])
  assert.ok(css.includes('.itens-modal.raridade-'+r),'raridade '+r);
});
test('em meia janela o painel é empilhado sem cobrir a iniciativa',()=>{
 const p=ler('js/paineis-layout.js'),css=ler('css/fichas.css');
 assert.ok(p.includes("largura>=1200?'lateral':'empilhado'"));
 assert.ok(css.includes('@media(max-width:1199px)'));
 assert.ok(css.includes('@media(min-width:1200px)'));
});
