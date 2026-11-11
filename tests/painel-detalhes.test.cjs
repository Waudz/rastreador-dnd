const {test}=require('node:test'),assert=require('node:assert/strict');
const {criar}=require('../js/painel-detalhes.js');
function cenario(){
  const mk=id=>({id,hidden:true,scrollTop:0,querySelectorAll:()=>[]});
  const ids=['ci-resumo','sheet','spd','spd-voltar'],els=Object.fromEntries(ids.map(i=>[i,mk(i)]));
  let avisos=0;const doc={querySelector:s=>els[s.slice(1)]||null};
  return {els,p:criar(doc,()=>avisos++),avisos:()=>avisos};
}
const aberto=e=>Object.entries(e).filter(([k,v])=>k!=='spd-voltar'&&!v.hidden).map(([k])=>k);
test('mostrar exibe só uma vista e limpa o histórico',()=>{
  const {els,p}=cenario();p.mostrar('sheet');p.mostrar('ci-resumo');
  assert.deepEqual(aberto(els),['ci-resumo']);assert.equal(p.temAnterior(),false);assert.equal(els['spd-voltar'].hidden,true);
});
test('magia aberta por cima esconde a ficha, oferece Voltar e restaura a rolagem',()=>{
  const {els,p}=cenario();p.mostrar('ci-resumo');els['ci-resumo'].scrollTop=240;
  p.empilhar('spd');
  assert.deepEqual(aberto(els),['spd']);assert.equal(els['spd-voltar'].hidden,false);
  els['ci-resumo'].scrollTop=0;           // o navegador pode zerar a rolagem de um elemento escondido
  assert.equal(p.voltar(),'ci-resumo');
  assert.deepEqual(aberto(els),['ci-resumo']);assert.equal(els['ci-resumo'].scrollTop,240);assert.equal(els['spd-voltar'].hidden,true);
});
test('magia aberta direto, sem ficha, não tem para onde voltar: Voltar fecha',()=>{
  const {els,p}=cenario();p.empilhar('spd');
  assert.equal(els['spd-voltar'].hidden,true);p.voltar();assert.deepEqual(aberto(els),[]);
});
test('Fechar encerra o painel inteiro mesmo com histórico',()=>{
  const {els,p}=cenario();p.mostrar('sheet');p.empilhar('spd');p.fechar();
  assert.deepEqual(aberto(els),[]);assert.equal(p.temAnterior(),false);
});
test('trocar de registro com a magia aberta descarta o histórico antigo',()=>{
  const {els,p}=cenario();p.mostrar('sheet');p.empilhar('spd');p.mostrar('sheet');
  assert.deepEqual(aberto(els),['sheet']);assert.equal(p.temAnterior(),false);
});
test('abrir outra magia a partir da magia mantém o retorno à ficha original',()=>{
  const {els,p}=cenario();p.mostrar('ci-resumo');p.empilhar('spd');p.empilhar('spd');
  assert.equal(p.voltar(),'ci-resumo');assert.deepEqual(aberto(els),['ci-resumo']);
});
test('cada mudança avisa o layout para recalcular a reserva de espaço',()=>{
  const c=cenario();c.p.mostrar('sheet');c.p.empilhar('spd');c.p.voltar();c.p.fechar();assert.equal(c.avisos(),4);
});
