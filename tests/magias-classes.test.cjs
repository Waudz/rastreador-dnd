const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,ler}=require('./helpers.cjs');
function motor(){const ctx=vm.createContext({window:{}});for(const n of ['origens','regras','inventario','magias-jogo','itens-efeitos','subclasses-2014','criador-regras'])vm.runInContext(ler('js/'+n+'.js'),ctx);const C=ctx.window.CRIADOR,R=ctx.window.REGRAS;const cat=JSON.parse(ler('dados/magias.json'));C.configurar(JSON.parse(ler('dados/criacao-srd2014.json')),cat);return {C,R,cat,M:ctx.window.MAGIAS_JOGO};}
const copia=o=>JSON.parse(JSON.stringify(o));
const cl=(c,n,sub='')=>({c,n,sub});
/* Tabela de espaços do Livro do Jogador 2014 (conjurador multiclasse), níveis de conjurador 1 a 20 */
const PHB=[[2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2,1],[4,3,3,3,2,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1]];

test('tabela de espaços: um conjurador completo de 1 a 20 bate com o Livro do Jogador',()=>{
  const {R}=motor();for(let n=1;n<=20;n++)assert.deepEqual(copia(R.conjuracao([cl('Wizard',n)]).slots),PHB[n-1],'Mago '+n);
});
test('multiclasse (2014): nível de conjurador = completos + metade (↓) de Paladino/Patrulheiro + um terço (↓) de Cavaleiro Místico/Trapaceiro Arcano',()=>{
  const {R}=motor(),slots=cls=>copia(R.conjuracao(cls).slots),nc=cls=>R.conjuracao(cls).nc;
  assert.equal(nc([cl('Wizard',5),cl('Cleric',3)]),8);assert.deepEqual(slots([cl('Wizard',5),cl('Cleric',3)]),PHB[7]);
  assert.equal(nc([cl('Paladin',4),cl('Wizard',3)]),5,'Paladino 4 conta 2');assert.deepEqual(slots([cl('Paladin',4),cl('Wizard',3)]),PHB[4]);
  assert.equal(nc([cl('Ranger',5),cl('Druid',5)]),7,'Patrulheiro 5 conta 2');
  assert.equal(nc([cl('Fighter',6,'Cavaleiro Místico'),cl('Wizard',2)]),4,'Cavaleiro Místico 6 conta 2');
  assert.equal(nc([cl('Rogue',9,'Trapaceiro Arcano'),cl('Cleric',1)]),4);
  assert.equal(nc([cl('Paladin',1),cl('Wizard',1)]),1,'Paladino 1 ainda não conjura');
  assert.equal(nc([cl('Paladin',3),cl('Ranger',3)]),2,'duas metades somam níveis arredondados para baixo em cada');
  assert.equal(nc([cl('Fighter',7),cl('Barbarian',3),cl('Wizard',4)]),4,'classes sem conjuração não contam');
});
test('uma única classe conjuradora usa a própria tabela, mesmo com outras classes sem conjuração (Paladino 5 = 4/2; Cavaleiro Místico 7 = 4/2)',()=>{
  const {R}=motor(),slots=cls=>copia(R.conjuracao(cls).slots);
  assert.deepEqual(slots([cl('Paladin',5),cl('Fighter',3)]),[4,2]);assert.deepEqual(slots([cl('Paladin',2)]),[2]);assert.deepEqual(slots([cl('Paladin',20)]),[4,3,3,3,2]);
  assert.deepEqual(slots([cl('Ranger',5)]),[4,2]);assert.deepEqual(slots([cl('Fighter',7,'Cavaleiro Místico')]),[4,2]);assert.deepEqual(slots([cl('Fighter',3,'Cavaleiro Místico')]),[2]);
});
test('Bruxo: Magia de Pacto fica separada dos espaços da conjuração (e não entra no nível de conjurador)',()=>{
  const {R}=motor(),c=R.conjuracao([cl('Warlock',3),cl('Wizard',3)]);
  assert.deepEqual(copia(c.slots),[4,2]);assert.deepEqual(copia(c.pact),{qtd:2,nivel:2});assert.equal(c.nc,3);
  const so=R.conjuracao([cl('Warlock',5)]);assert.deepEqual(copia(so.pact),{qtd:2,nivel:3});assert.deepEqual(copia(so.slots),[]);
});
test('Paladino: lista de magias da classe (SRD 5.1) e preparação = Carisma + metade do nível (mín. 1), círculo conforme o nível de Paladino',()=>{
  const {C,cat}=motor();
  const lista=cat.filter(m=>m.c.includes('Paladin'));assert.equal(lista.length,31);assert.ok(lista.every(m=>m.l>=1&&m.l<=5),'Paladino não tem truques e vai até o 5º círculo');
  for(const en of ['Bless','Cure Wounds','Divine Favor','Shield of Faith','Lesser Restoration','Revivify','Banishment','Geas'])assert.ok(lista.some(m=>m.en===en),en);
  assert.ok(!lista.some(m=>m.en==='Fireball'));
  const p=C.iniciar({nome:'Pal',versao:1,pv_max:10,pv_atual:10,inventario:[],dinheiro:{},ficha:{atributos:{for:15,des:10,con:14,int:8,sab:10,car:14},raca:'Humano',backgroundId:'soldado',classes:[cl('Paladin',5)]}},'nivel');
  const g=C.gruposMagias(C.derivar(p).ficha).find(x=>x.key==='magias|Paladin|magias');
  assert.ok(g,'o Paladino 5 tem escolha de magias');assert.equal(g.qtd,4,'floor(5/2)=2 + Car +2');assert.equal(g.max,2);
  assert.ok(g.opts.length>0&&g.opts.every(id=>{const m=C.magiaPorId(id);return m.l>=1&&m.l<=2&&m.c.includes('Paladin');}));
  assert.ok(!C.gruposMagias(C.derivar(base(C,[cl('Paladin',1)])).ficha).some(x=>x.key.startsWith('magias|Paladin')),'Paladino 1 não conjura');
  assert.equal(C.gruposMagias(C.derivar(base(C,[cl('Paladin',2)])).ficha).find(x=>x.key==='magias|Paladin|magias').qtd,3,'floor(2/2)=1 + Car +2');
});
function base(C,classes){return C.iniciar({nome:'T',versao:1,pv_max:10,pv_atual:10,inventario:[],dinheiro:{},ficha:{atributos:{for:15,des:10,con:14,int:12,sab:10,car:14},raca:'Humano',backgroundId:'soldado',classes}},'nivel');}
test('multiclasse: cada classe prepara/conhece pelo próprio nível e atributo; círculo máximo por classe é o da própria tabela',()=>{
  const {C,R}=motor(),p=base(C,[cl('Wizard',3),cl('Cleric',5)]),f=C.derivar(p).ficha;
  const gm=C.gruposMagias(f),mago=gm.find(x=>x.key==='magias|Wizard|magias'),cler=gm.find(x=>x.key==='magias|Cleric|magias');
  assert.equal(mago.max,2,'Mago 3 prepara até o 2º círculo (própria tabela), embora os espaços combinados cheguem ao 3º');assert.equal(cler.max,3);
  assert.equal(R.conjuracao(f.classes).slots.length,4,'espaços combinados (nível de conjurador 8) chegam ao 4º círculo');
  const lim=R.preparacao(f);assert.equal(lim.find(x=>x.id==='Cleric').limite,5+R.mod(10),'Clérigo: nível 5 + Sab 10 (+0) = 5');assert.equal(lim.find(x=>x.id==='Wizard').limite,3+R.mod(12));
});
test('multiclasse: magia preparada pertence só à classe que a preparou; limites não se misturam',()=>{
  const {C,R}=motor(),p=base(C,[cl('Wizard',3),cl('Cleric',3)]),f=C.derivar(p).ficha;
  f.magias=[{n:'a',en:'Shield',l:1,prep:true,classePreparacao:'Wizard',classes:['wizard']},{n:'b',en:'Bless',l:1,prep:true,classePreparacao:'Cleric',classes:['cleric']},{n:'c',en:'Cure Wounds',l:1,prep:true,classePreparacao:'Cleric',classes:['cleric']}];
  const lim=R.preparacao(f);assert.equal(lim.find(x=>x.id==='Wizard').usadas,1);assert.equal(lim.find(x=>x.id==='Cleric').usadas,2);
});
test('Arcanum Místico do Bruxo: uma magia de 6º, 7º, 8º e 9º círculo nos níveis 11, 13, 15 e 17; fora dos espaços de Pacto e das magias conhecidas',()=>{
  const {C,cat}=motor(),chaves=n=>copia(C.gruposMagias(C.derivar(base(C,[cl('Warlock',n)])).ficha).filter(g=>g.arcanum).map(g=>g.arcanum));
  assert.deepEqual(chaves(10),[]);assert.deepEqual(chaves(11),[6]);assert.deepEqual(chaves(13),[6,7]);assert.deepEqual(chaves(15),[6,7,8]);assert.deepEqual(chaves(17),[6,7,8,9]);assert.deepEqual(chaves(20),[6,7,8,9]);
  const q=base(C,[cl('Warlock',17)]),gs=C.gruposMagias(C.derivar(q).ficha),arc=gs.filter(g=>g.arcanum);
  for(const g of arc){assert.equal(g.qtd,1);assert.ok(g.opts.length>0,'há magias de Bruxo no '+g.arcanum+'º círculo no catálogo');assert.ok(g.opts.every(id=>{const m=C.magiaPorId(id);return m.l===g.arcanum&&m.c.includes('Warlock');}));}
  const conhecidas=gs.find(g=>g.key==='magias|Warlock|magias');assert.equal(conhecidas.max,5,'Pacto do 17º nível: espaços de 5º círculo');assert.ok(conhecidas.opts.every(id=>C.magiaPorId(id).l<=5));assert.equal(conhecidas.qtd,14);
  const st=C.estado(q.ficha);for(const g of arc)st.selecoes[g.key]=[g.opts[0]];
  const f=C.derivar(q).ficha,entradas=f.magias.filter(m=>m.arcanum);
  assert.deepEqual(copia(entradas.map(m=>m.arcanum).sort()),[6,7,8,9]);assert.ok(entradas.every(m=>m.ativa===true&&m.registroOrigem.tipo==='arcanum'));
  const ps=f.progressao;assert.ok(ps[10].escolhas['magias|Warlock|arcanum6'],'registrado no nível 11');assert.ok(ps[16].escolhas['magias|Warlock|arcanum9'],'registrado no nível 17');assert.ok(!ps[11].escolhas['magias|Warlock|arcanum6']);
  const re=C.derivar(C.iniciar(copia({...q,ficha:f}),'criacao')).ficha;assert.equal(re.magias.filter(m=>m.arcanum).length,4,'sobrevive a recalcular, sem duplicar');
});
test('subir de nível do Bruxo 10 → 11 oferece o Arcanum de 6º círculo e a troca por nível não mexe nele',()=>{
  const {C,M}=motor();let p=base(C,[cl('Warlock',10)]);const g0=C.gruposMagias(C.derivar(p).ficha);for(const g of g0)C.estado(p.ficha).selecoes[g.key]=g.opts.filter(o=>!(g.bloqueadas||[]).includes(o)).slice(0,g.qtd);
  p=C.subir(C.iniciar(copia(p),'nivel'),'Warlock','media');
  const g=C.gruposMagias(C.derivar(p).ficha).find(x=>x.arcanum===6);assert.ok(g,'o grupo do Arcanum aparece no nível 11');
  assert.throws(()=>M.aplicarTroca(p,'Warlock',g.opts[0],g.opts[1],{grupoKey:g.key}),/conhecidas|primeiro|lista/);
});
