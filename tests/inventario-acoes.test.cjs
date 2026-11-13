const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ler=p=>fs.readFileSync(p,'utf8');
const c=vm.createContext({window:{},console});vm.runInContext(ler('js/inventario.js'),c);const IV=c.window.INVENTARIO;
const P=()=>({id:'p1',inventario:[IV.novoItem({nome:'Corda',qtd:5,peso:2,uid:'u1'})],ficha:{}});
test('descartar parcial registra a saída e mantém o item; descartar tudo tira da lista',()=>{
  const p=P(),k=IV.conteinerDe(p);
  IV.retirar(k,'u1',2,{tipo:'descarte',nota:'perdida'});assert.equal(p.inventario[0].qtd,3);
  IV.retirar(k,'u1',3,{tipo:'descarte'});assert.equal(p.inventario.length,0);
  assert.equal(JSON.stringify(p.ficha.movimentos.map(m=>[m.tipo,m.qtd])),JSON.stringify([['descarte',2],['descarte',3]]));
  assert.throws(()=>IV.retirar(k,'u1',1,{tipo:'descarte'}),/não encontrado/);
});
test('descartar mais do que existe ou zero é recusado sem alterar nada',()=>{
  const p=P(),k=IV.conteinerDe(p);
  assert.throws(()=>IV.retirar(k,'u1',6,{tipo:'descarte'}),/Quantidade inválida/);assert.throws(()=>IV.retirar(k,'u1',0,{tipo:'descarte'}),/Quantidade inválida/);
  assert.equal(p.inventario[0].qtd,5);assert.equal((p.ficha.movimentos||[]).length,0);
});
test('exclusão administrativa tem rótulo próprio, diferente de descarte e uso',()=>{
  assert.equal(IV.ROTULO_MOV.exclusao,'Item excluído');assert.notEqual(IV.ROTULO_MOV.exclusao,IV.ROTULO_MOV.descarte);
});
test('ficha: quantidade com + e −, descartar com confirmação, excluir, detalhes e editor de efeitos só para o mestre',()=>{
  const j=ler('js/personagem.js');
  for(const k of ['data-inv-qtd-mais','data-inv-qtd-menos','data-inv-descartar','data-inv-excluir','data-inv-detalhes','abrirDescartar','abrirExcluir','abrirDetalhes','ajustarQtd'])assert.ok(j.includes(k),k);
  assert.match(j,/function abrirEditor\(i\) \{ const it = itemPor\(i\); if \(!it \|\| !souMestre\) return;/,'o editor continua exclusivo do mestre');
  assert.match(j,/\$\{souMestre \? `<button type="button" class="small" data-det-config/,'botão de configuração só aparece ao mestre');
  assert.match(j,/Math\.max\(0, Math\.floor\(num\(t\.value, 0\)\)\)/,'quantidade digitada nunca fica negativa');
  assert.match(j,/n === total && !confirmando/,'descartar todas as unidades pede confirmação');
});
