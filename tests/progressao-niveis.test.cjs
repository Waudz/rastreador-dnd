const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,ler}=require('./helpers.cjs');
/* Motor de regras (2014) usado pelo subir de nível e pelo Editar personagem: nível 1 a 20, uma classe por vez, em ordem. */
function motor(){const ctx=vm.createContext({window:{}});for(const n of ['origens','regras','magias-jogo','subclasses-2014','criador-regras'])vm.runInContext(ler('js/'+n+'.js'),ctx);const C=ctx.window.CRIADOR,R=ctx.window.REGRAS;C.configurar(JSON.parse(ler('dados/criacao-srd2014.json')),JSON.parse(ler('dados/magias.json')));return {C,R};}
const ASI={Fighter:[4,6,8,12,14,16,19],Rogue:[4,8,10,12,16,19]};
const CLASSES=['Barbarian','Bard','Cleric','Druid','Fighter','Monk','Paladin','Ranger','Rogue','Sorcerer','Warlock','Wizard'];
function base(C,cid){const p=C.iniciar({nome:'T',versao:1,pv_max:10,pv_atual:10,inventario:[{nome:'Item',qtd:1}],dinheiro:{po:3},ficha:{atributos:{for:12,des:12,con:14,int:12,sab:12,car:12},raca:'Humano',backgroundId:'soldado',classes:[{c:cid,n:1,sub:''}]}},'nivel');return p;}

test('subir um nível de cada vez, do 1 ao 20, em todas as 12 classes: ordem, PV mínimo 1, sem características duplicadas',()=>{
  const {C,R}=motor();
  for(const cid of CLASSES){
    let p=base(C,cid);
    for(let n=2;n<=20;n++){
      const antes=p;p=C.subir(p,cid,'media');
      assert.equal(R.nivelTotal(p.ficha.classes),n,cid+' nível '+n);
      assert.ok(p.pv_max-antes.pv_max>=1,cid+' deve ganhar pelo menos 1 PV no nível '+n);
      const ids=C.caracteristicas(p.ficha).map(h=>h.id);assert.equal(new Set(ids).size,ids.length,cid+' nível '+n+': característica duplicada');
    }
    assert.equal(R.melhoriasDisponiveis(p.ficha.classes).length,(ASI[cid]||[4,8,12,16,19]).length,cid+': melhorias de atributo até o 20');
  }
});
test('subir vários níveis seguidos e o diff acumula; a ficha original não muda (cancelar não altera nada)',()=>{
  const {C,R}=motor(),p=base(C,'Fighter'),foto=JSON.stringify(p);
  let q=p;for(let i=0;i<4;i++)q=C.subir(q,'Fighter','media');
  assert.equal(JSON.stringify(p),foto);                                   // a cópia nunca altera o original
  const d=C.diferenca(p,q);assert.deepEqual(JSON.parse(JSON.stringify(d.nivel)),[1,5]);assert.ok(d.pv[1]>d.pv[0]);
  assert.equal(new Set(d.novas.map(h=>h.id)).size,d.novas.length);
});
test('limite 20 e multiclasse: bloqueia acima do nível total 20 e exige atributos das duas classes (2014)',()=>{
  const {C,R}=motor();let p=base(C,'Fighter');for(let n=2;n<=20;n++)p=C.subir(p,'Fighter','media');
  assert.throws(()=>C.subir(p,'Fighter','media'),/20/);
  const q=base(C,'Fighter');q.ficha.atributos={for:13,des:8,con:12,int:8,sab:8,car:8};
  const m=C.subir(q,'Wizard','media');assert.ok(C.requisitosMulti(m.ficha).some(x=>/Inteligência 13/.test(x)),'Mago exige Inteligência 13');
  q.ficha.atributos.int=13;assert.equal(C.requisitosMulti(C.subir(q,'Wizard','media').ficha).length,0);
});
test('PV: valor fixo, rolagem informada e limites do dado de vida (2014)',()=>{
  const {C,R}=motor(),p=base(C,'Fighter');
  const fixo=C.subir(p,'Fighter','media'),rol=C.subir(p,'Fighter',3);
  assert.equal(fixo.pv_max-p.pv_max,Math.max(1,6+2));assert.equal(rol.pv_max-p.pv_max,Math.max(1,3+2));
  assert.throws(()=>C.subir(p,'Fighter',11),/entre 1 e 10/);assert.throws(()=>C.subir(p,'Fighter',0),/entre 1 e 10/);
  const mago=base(C,'Wizard');mago.ficha.atributos.con=3;assert.equal(C.subir(mago,'Wizard',1).pv_max-mago.pv_max,1);   // mínimo 1 PV por nível
});
test('PV atuais e dados de jogo são preservados ao subir (só os PV máximos e atuais ganham o valor do nível)',()=>{
  const {C}=motor(),p=base(C,'Fighter');p.pv_atual=4;const q=C.subir(p,'Fighter','media');
  assert.deepEqual(JSON.parse(JSON.stringify(q.inventario)),JSON.parse(JSON.stringify(p.inventario)));assert.equal(q.dinheiro.po,3);assert.ok(q.pv_atual>=4&&q.pv_atual<=q.pv_max);
});
test('raças: a tabela de novidades por nível cobre as raças com progressão no catálogo',()=>{
  const j=ler('js/criador.js');for(const r of ['Fada','Drow','Tiefling','Draconato'])assert.ok(j.includes(r),r);
  const regras=ler('js/criador-regras.js');for(const [n,l] of [['Faerie Fire',3],['Enlarge/Reduce',5],['Hellish Rebuke',3],['Darkness',5]])assert.ok(regras.includes('["'+n+'",'+l+']'),n);
});
