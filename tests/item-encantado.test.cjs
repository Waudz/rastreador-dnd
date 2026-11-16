const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const src=fs.readFileSync('js/item-encantado.js','utf8');
function motor(){const ctx={window:{}};vm.runInNewContext(src,ctx);return ctx.window.ITEM_ENCANTADO;}
test('raridades e nomes seguem o SRD 2014, sem alterar o catálogo',()=>{
 const E=motor(),cat={categoria:'arma',nome:'Adaga'},it={nome:'Adaga',propriedades:{}};
 E.configurar(it,cat,1);assert.equal(it.nome,'Adaga +1');assert.equal(it.propriedades.raridade,'Incomum');assert.equal(E.bonus(it),1);
 E.configurar(it,cat,3);assert.equal(it.nome,'Adaga +3');assert.equal(it.propriedades.raridade,'Muito rara');
 E.configurar(it,cat,0);assert.equal(it.nome,'Adaga');assert.equal(E.bonus(it),0);
 assert.equal(cat.nome,'Adaga');
 for(const [categoria,raridade] of [['armadura','Lendária'],['escudo','Muito rara']]){
  const i={nome:'Teste',propriedades:{}};E.configurar(i,{categoria,nome:'Teste'},3);assert.equal(i.propriedades.raridade,raridade);
 }
 assert.throws(()=>E.configurar(it,{categoria:'equipamento',nome:'Ábaco'},1));
});
test('magias vinculadas consomem apenas as cargas configuradas',()=>{
 const E=motor(),it={propriedades:{cargas:{atual:3,max:3}}};
 E.vincularMagia(it,{en:'invisibility',n:'Invisibilidade',l:2},2);
 assert.equal(E.conjurar(it,'invisibility').n,'Invisibilidade');assert.equal(it.propriedades.cargas.atual,1);
 assert.throws(()=>E.conjurar(it,'invisibility'),/insuficientes/);
 E.vincularMagia(it,{en:'light',n:'Luz',l:0},0,true);
 assert.throws(()=>E.conjurar(it,'light'),/não disponível/);
});
test('CA só recebe bônus de armadura e escudo equipados e vinculados',()=>{
 const E=motor(),a={uid:'a',qtd:1,equipado:true,propriedades:{encantamento:{bonus:2}}},b={uid:'b',qtd:1,equipado:true,propriedades:{encantamento:{bonus:1}}};
 const P={ficha:{equip:{armaduraUid:'a',escudoUid:'b'}},inventario:[a,b]};
 assert.equal(E.bonusCA(P),3);b.equipado=false;assert.equal(E.bonusCA(P),2);
});
