const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,ler}=require('./helpers.cjs');
const ctx=vm.createContext({window:{}});for(const n of ['origens','regras'])vm.runInContext(ler('js/'+n+'.js'),ctx);
const R=ctx.window.REGRAS;
const ficha=()=>({classes:[{c:'Wizard',n:5,sub:''}],atributos:{for:10,des:14,con:12,int:16,sab:10,car:8},ataques:[]});
const prep=f=>R.preparacao(f).find(x=>x.id==='Wizard').limite;

test('bônus temporário de testes altera perícias e nada mais',()=>{
  const f=ficha(),base=R.valorPericia(f,'arcanismo'),atk=R.valoresAtaque(f,{atr:'for'}),limite=prep(f);
  f.bonusTemp={testes:2};
  assert.equal(R.valorPericia(f,'arcanismo'),base+2);assert.deepEqual(JSON.parse(JSON.stringify(R.valoresAtaque(f,{atr:'for'}))),JSON.parse(JSON.stringify(atk)));
  assert.equal(R.atributoEf(f,'int'),16);assert.equal(prep(f),limite);
});
test('bônus temporário de ataques altera só a jogada de ataque, não o dano',()=>{
  const f=ficha(),a=R.valoresAtaque(f,{atr:'des'});f.bonusTemp={ataques:1};
  const b=R.valoresAtaque(f,{atr:'des'});assert.equal(b.ataque,a.ataque+1);assert.equal(b.dano,a.dano);
  assert.equal(R.valorPericia(f,'acrobacia'),R.valorPericia({...f,bonusTemp:{}},'acrobacia'));
});
test('CA, salvaguardas e CD de magia não alteram atributos nem a capacidade de preparar; só o valor do atributo altera',()=>{
  const f=ficha(),limite=prep(f);f.bonusTemp={ca:2,salvaguardas:1,cdMagia:3};
  assert.equal(prep(f),limite,'categorias não mudam a preparação');assert.equal(R.atributoEf(f,'int'),16);
  f.modTemp={int:2};assert.equal(prep(f),limite+1,'Inteligência 18 dá +1 de modificador, logo +1 magia preparada');
});
test('a ficha aplica cada categoria no lugar certo',()=>{
  const j=ler('js/personagem.js');
  assert.match(j,/bonusTemp\(F\(\), "salvaguardas"\)/);assert.match(j,/bonusTemp\(F\(\), "ca"\)/);assert.match(j,/bonusTemp\(F\(\),"cdMagia"\)/);assert.match(j,/data-bonustemp/);
  assert.match(j,/rolarSal[\s\S]{0,200}bonusTemp\(F\(\),"salvaguardas"\)/);
});
