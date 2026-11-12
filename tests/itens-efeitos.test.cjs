const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,ler}=require('./helpers.cjs');
function motor(){const ctx=vm.createContext({window:{}});for(const n of ['origens','regras','inventario','itens-efeitos'])vm.runInContext(ler('js/'+n+'.js'),ctx);return {R:ctx.window.REGRAS,I:ctx.window.INVENTARIO,E:ctx.window.ITENS_EFEITOS};}
const copia=o=>JSON.parse(JSON.stringify(o));
function pers(I,E,chaves,extra={}){const P={id:'p1',pv_atual:5,pv_max:20,pv_temp:0,inventario:[],ficha:{classes:[{c:'Fighter',n:3}],atributos:{for:14,des:12,con:12,int:10,sab:10,car:10}},...extra};const c=I.conteinerDe(P);for(const k of chaves)I.adicionar(c,E.itemDoCatalogo(k));return P;}
const seq=(...v)=>{let i=0;return()=>v[i++%v.length];};

test('rolagem no app: 2d4+2 usa o gerador informado e fica entre 4 e 10',()=>{
  const {E}=motor();assert.equal(E.formatarDados({n:2,d:4,b:2}),'2d4+2');
  const r=E.rolar({n:2,d:4,b:2},seq(0,0.99));assert.deepEqual(copia(r.rolls),[1,4]);assert.equal(r.total,7);
  for(let i=0;i<200;i++){const t=E.rolar({n:2,d:4,b:2}).total;assert.ok(t>=4&&t<=10);}
});
test('poção de cura: cura com resultado rolado ou manual, nunca passa do máximo, consome uma unidade só depois de tudo validado',()=>{
  const {I,E}=motor(),P=pers(I,E,['pocao-cura','pocao-cura']),uid=P.inventario[0].uid;
  assert.equal(P.inventario[0].qtd,2);
  const sem=E.usar(P,uid,{});assert.equal(sem.ok,false);assert.match(sem.motivos.join(' '),/role os dados ou informe/);assert.equal(P.pv_atual,5);assert.equal(P.inventario[0].qtd,2,'recusa não consome');
  const fora=E.usar(P,uid,{rolagens:{0:11}});assert.equal(fora.ok,false);assert.match(fora.motivos.join(' '),/entre 4 e 10/);assert.equal(P.inventario[0].qtd,2);
  const r=E.usar(P,uid,{rolagens:{0:7}});assert.equal(r.ok,true);assert.equal(P.pv_atual,12);assert.equal(P.inventario[0].qtd,1);
  const r2=E.usar(P,uid,{rolagens:{0:10}});assert.equal(r2.ok,true);assert.equal(P.pv_atual,20,'limitado ao máximo (12+10 > 20)');assert.match(r2.resultado[0].texto,/limitado ao máximo/);
  assert.equal(P.inventario.length,0,'última unidade consumida e item removido');
  const uso=P.ficha.movimentos.filter(m=>m.tipo==='uso-efeito');assert.equal(uso.length,2);assert.equal(uso[0].consumido.unidade,1);assert.match(uso[0].resultado[0],/PV 5 → 12/);assert.equal(uso[0].alvo,'este personagem');
});
test('outras poções de cura: valores e faixas conforme o SRD 2014',()=>{
  const {I,E}=motor();
  for(const [k,expr,min,max] of [['pocao-cura-maior','4d4+4',8,20],['pocao-cura-superior','8d4+8',16,40],['pocao-cura-suprema','10d4+20',30,60]]){
    const P=pers(I,E,[k]),f=E.efeitosDe(P.inventario[0])[0];assert.equal(E.formatarDados(f.dados),expr);const fx=E.faixa(f.dados);assert.equal(fx.min,min);assert.equal(fx.max,max);
  }
});
test('falha no meio do uso não altera o personagem (nada de consumo parcial ou duplicado)',()=>{
  const {I,E}=motor(),P=pers(I,E,['pocao-cura']),uid=P.inventario[0].uid,antes=JSON.stringify(P);
  const original=E.TIPOS_EFEITO.cura.aplicar;E.TIPOS_EFEITO.cura.aplicar=()=>{throw new Error('falha simulada');};
  const r=E.usar(P,uid,{rolagens:{0:6}});E.TIPOS_EFEITO.cura.aplicar=original;
  assert.equal(r.ok,false);assert.match(r.motivos.join(' '),/falha simulada/);assert.equal(JSON.stringify(P),antes);
  assert.equal(E.usar(P,uid,{rolagens:{0:6}}).ok,true);assert.equal(P.inventario.length,0,'uma única unidade foi consumida');
});
test('alvo: outro personagem ou criatura recebe só o registro, a ficha atual não muda, mas o consumo e o histórico acontecem',()=>{
  const {I,E}=motor(),P=pers(I,E,['pocao-cura']),uid=P.inventario[0].uid;
  assert.match(E.usar(P,uid,{rolagens:{0:6},alvo:{tipo:'outro',nome:''}}).motivos.join(' '),/nome do alvo/);
  const r=E.usar(P,uid,{rolagens:{0:6},alvo:{tipo:'outro',nome:'Brann'}});assert.equal(r.ok,true);assert.equal(P.pv_atual,5);assert.equal(P.inventario.length,0);
  assert.equal(P.ficha.movimentos.at(-1).alvo,'Brann');assert.match(P.ficha.movimentos.at(-1).resultado[0],/Brann/);
});
test('PV temporários não se acumulam (vale o maior); valor fixo não pede rolagem; efeito manual e condição viram efeitos ativos com duração',()=>{
  const {I,E}=motor(),P=pers(I,E,['pocao-heroismo','pocao-invisibilidade','pocao-heroismo'],{pv_temp:15}),h=P.inventario[0].uid;
  const r=E.usar(P,h,{});assert.equal(r.ok,true);assert.equal(P.pv_temp,15,'10 não substitui 15');assert.match(r.resultado[0].texto,/não se acumulam/);
  assert.ok(P.ficha.efeitosAtivos.some(e=>e.tipo==='manual'&&/Bênção/.test(e.texto)));
  P.pv_temp=0;E.usar(P,h,{});assert.equal(P.pv_temp,10);
  const inv=P.inventario.find(i=>/Invisibilidade/.test(i.nome));E.usar(P,inv.uid,{});
  const c=P.ficha.efeitosAtivos.find(e=>e.tipo==='condicao');assert.equal(c.condicao,'Invisível');assert.match(c.duracao.texto,/1 hora/);assert.equal(c.origem.item,'Poção de Invisibilidade');
});
test('resistência pede o tipo de dano e vira efeito ativo; encerrar remove',()=>{
  const {I,E}=motor(),P=pers(I,E,['pocao-resistencia']),u=P.inventario[0].uid;
  assert.match(E.usar(P,u,{}).motivos.join(' '),/tipo de dano/);assert.match(E.usar(P,u,{danos:{0:'xyz'}}).motivos.join(' '),/tipo de dano/);
  assert.equal(P.inventario.length,1);
  assert.equal(E.usar(P,u,{danos:{0:'fogo'}}).ok,true);const e=P.ficha.efeitosAtivos[0];assert.match(e.texto,/fogo/);E.encerrarEfeito(P,e.id);assert.equal(P.ficha.efeitosAtivos.length,0);
});
test('modificadores e atributos de efeitos entram nos cálculos; passivos valem só equipados e sintonizados; só o atributo muda a preparação',()=>{
  const {R,I,E}=motor(),P=pers(I,E,['anel-protecao']),it=P.inventario[0];
  E.sincronizarPassivos(P);assert.equal(R.bonusTemp(P.ficha,'ca'),0,'não equipado');
  it.equipado=true;E.sincronizarPassivos(P);assert.equal(R.bonusTemp(P.ficha,'ca'),0,'exige sintonia');
  I.sintonizar(I.conteinerDe(P),it.uid,true);E.sincronizarPassivos(P);assert.equal(R.bonusTemp(P.ficha,'ca'),1);assert.equal(R.bonusTemp(P.ficha,'salvaguardas'),1);assert.equal(R.bonusTemp(P.ficha,'testes'),0);
  P.ficha.bonusTemp={ca:2};assert.equal(R.bonusTemp(P.ficha,'ca'),3,'soma com o bônus manual');
  it.equipado=false;E.sincronizarPassivos(P);assert.equal(R.bonusTemp(P.ficha,'ca'),2);
  P.ficha.efeitosAtivos=[{id:'a',tipo:'atributo',atributo:'for',valor:2}];assert.equal(R.atributoEf(P.ficha,'for'),16);
  assert.throws(()=>E.encerrarEfeito(P,'nao'),/não encontrado/);
});
test('item mágico com cargas: gasta carga, não unidade; sem cargas é recusado; extensível a tipos ainda não suportados (recusados, nada consumido)',()=>{
  const {I,E}=motor(),P=pers(I,E,['varinha-misseis']),u=P.inventario[0].uid;
  for(let i=0;i<7;i++)assert.equal(E.usar(P,u,{}).ok,true);
  assert.equal(P.inventario[0].propriedades.cargas.atual,0);assert.equal(P.inventario[0].qtd,1);assert.match(E.usar(P,u,{}).motivos.join(' '),/Cargas insuficientes/);
  const x=I.adicionar(I.conteinerDe(P),I.novoItem({nome:'Esfera Estranha',tipo:'consumivel',propriedades:{efeitos:[{tipo:'teleporte'}]}}));
  const r=E.usar(P,x.uid,{});assert.equal(r.ok,false);assert.match(r.motivos.join(' '),/ainda não é suportado/);assert.ok(P.inventario.some(i=>i.uid===x.uid&&i.qtd===1));
});
test('item personalizado do mestre com efeitos configuráveis, inclusive manual, e validação das configurações',()=>{
  const {I,E}=motor(),P=pers(I,E,[]);
  const it=I.adicionar(I.conteinerDe(P),I.novoItem({nome:'Elixir da Aldeia',tipo:'consumivel',origem:{tipo:'mestre',nota:'Recompensa'},propriedades:{efeitos:[{tipo:'cura',dados:{n:1,d:6,b:0}},{tipo:'modificador',categoria:'testes',valor:2,duracao:{texto:'10 minutos',ate:'descanso-curto'}},{tipo:'manual',texto:'Cheira a hortelã',duracao:{texto:'',ate:'manual'}}]}}));
  assert.equal(E.validarItem(it).length,0);
  const ruim=I.novoItem({nome:'Ruim',tipo:'consumivel',propriedades:{efeitos:[{tipo:'modificador',categoria:'nada',valor:1},{tipo:'manual',texto:''},{tipo:'cura'}]}});assert.equal(E.validarItem(ruim).length,3);
  const r=E.usar(P,it.uid,{rolagens:{0:4}});assert.equal(r.ok,true);assert.equal(P.pv_atual,9);assert.equal(P.ficha.efeitosAtivos.length,2);
  assert.equal(P.ficha.movimentos.at(-1).origem.tipo,'mestre');
  const d=P.ficha.efeitosAtivos.length;assert.equal(E.recuperarNoDescanso(P.ficha,'curto'),1,'o modificador some no descanso curto');assert.equal(P.ficha.efeitosAtivos.length,d-1);
  assert.equal(E.recuperarNoDescanso(P.ficha,'longo'),0);
});
