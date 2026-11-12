const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,ler}=require('./helpers.cjs');
const ctx=vm.createContext({window:{},document:undefined});vm.runInContext(ler('js/ataque-ini.js'),ctx);const A=ctx.window.ATAQUE_INI;
const copia=o=>JSON.parse(JSON.stringify(o));
const seq=(...v)=>{let i=0;return()=>v[i++%v.length];};            // rng: v em [0,1) -> d20 = 1+floor(v*20)
const face=(n,f=20)=>(n-1)/f+0.0001;

test('expressões de dano: dados, fixo e inválidas',()=>{
  assert.deepEqual(copia(A.parseExpressao('1d8+3')),[{n:1,f:8,b:3,t:''}]);assert.deepEqual(copia(A.parseExpressao(' 2d6 + 1d4 + 2 ')),[{n:2,f:6,b:2,t:''},{n:1,f:4,b:0,t:''}]);
  assert.deepEqual(copia(A.parseExpressao('1d6-1')),[{n:1,f:6,b:-1,t:''}]);assert.deepEqual(copia(A.parseExpressao('5')),[{n:0,f:0,b:5,t:''}]);
  for(const ruim of ['','abc','d6','1d','0d6','1d1','1d6+','-1d6','1d6*2'])assert.equal(A.parseExpressao(ruim),null,ruim);
});
test('ataque: acerta se total >= CA; 20 natural sempre acerta (crítico); 1 natural sempre erra',()=>{
  let r=A.rolarAtaque({bonus:5,ca:15,rng:seq(face(10))});assert.equal(r.total,15);assert.equal(r.resultado,'acerto');
  r=A.rolarAtaque({bonus:5,ca:16,rng:seq(face(10))});assert.equal(r.resultado,'erro');
  r=A.rolarAtaque({bonus:-5,ca:30,rng:seq(face(20))});assert.equal(r.resultado,'critico');assert.equal(r.acertou,true);
  r=A.rolarAtaque({bonus:20,ca:5,rng:seq(face(1))});assert.equal(r.resultado,'falha-critica');assert.equal(r.acertou,false);
  assert.equal(A.rolarAtaque({bonus:3,rng:seq(face(10))}).resultado,'sem-alvo');
});
test('vantagem pega o maior de dois d20, desvantagem o menor',()=>{
  let r=A.rolarAtaque({bonus:0,ca:10,modo:'vantagem',rng:seq(face(4),face(15))});assert.deepEqual(copia(r.dados),[4,15]);assert.equal(r.nat,15);
  r=A.rolarAtaque({bonus:0,ca:10,modo:'desvantagem',rng:seq(face(4),face(15))});assert.equal(r.nat,4);
  assert.equal(A.rolarAtaque({bonus:0,ca:10,modo:'normal',rng:seq(face(4),face(15))}).dados.length,1);
});
test('dano: soma dados e modificador; crítico dobra os dados mas não o modificador; metade arredonda para baixo; nunca negativo',()=>{
  const partes=[{n:1,f:8,b:3,t:'cortante'}];
  let r=A.rolarDano(partes,{rng:seq(face(5,8))});assert.equal(r.total,8);assert.equal(r.detalhe[0].rolls.length,1);
  r=A.rolarDano(partes,{critico:true,rng:seq(face(5,8),face(6,8))});assert.equal(r.total,5+6+3,'2 dados + 3 (o +3 não dobra)');assert.equal(r.detalhe[0].rolls.length,2);
  r=A.rolarDano(partes,{metade:true,rng:seq(face(6,8))});assert.equal(r.bruto,9);assert.equal(r.total,4);
  assert.equal(A.rolarDano([{n:1,f:4,b:-10,t:''}],{rng:seq(0)}).total,0);
  r=A.rolarDano([{n:2,f:6,b:0,t:'fogo'},{n:1,f:4,b:2,t:'gélido'}],{rng:seq(face(3,6),face(4,6),face(2,4))});assert.equal(r.total,3+4+2+2);assert.match(A.descreverDano(r),/fogo/);
});
test('integração: aplicar dano usa as mesmas estatísticas do botão Dano; criaturas e fichas alimentam o painel; o painel existe na página e no cache',()=>{
  const ini=ler('js/iniciativa.js'),app=ler('js/app.js'),ci=ler('js/campanha-ini.js'),html=ler('iniciativa.html'),sw=ler('sw.js');
  assert.match(ini,/function aplicarDano\(id, amount, quemId\)/);assert.match(ini,/if \(button\.dataset\.damage\) aplicarDano\(id, amount\);/);assert.match(ini,/aplicarDano,\n\s+trocarContexto/);assert.match(ini,/atual: \(\) => currentId/);
  assert.match(app,/window\.__ini\.acoesDe = \(key\)/);assert.match(ci,/window\.__ini\.ataquesDe = \(pid\)/);
  assert.match(html,/id="painel-ataque"/);assert.match(html,/js\/ataque-ini\.js/);assert.match(sw,/"js\/ataque-ini\.js"/);assert.match(ci,/'adicionar-combatente','painel-ataque'/);
});
test('cada clique em Aplicar aplica o dano uma vez só',()=>{
  const j=ler('js/ataque-ini.js');assert.match(j,/const U = ultimo; ultimo = null;/);assert.match(j,/b\.disabled = true;/);
});
