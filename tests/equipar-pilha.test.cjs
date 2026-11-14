/* Equipar uma unidade de uma pilha e ajustar quantidades sem tocar nas origens de pacote/criação. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,ler}=require('./helpers.cjs');
function amb(){
  const ctx=vm.createContext({window:{},console});
  for(const n of ['origens','regras','magias-jogo','subclasses-2014','inventario','catalogo-itens','equipamento-ficha'])vm.runInContext(ler('js/'+n+'.js'),ctx);
  const W=ctx.window;W.CAT_ITENS.indexar(JSON.parse(ler('dados/itens-srd2014.json')).itens);
  return {W,C:W.CAT_ITENS,I:W.INVENTARIO,E:W.EQUIP_FICHA};
}
const J=o=>JSON.parse(JSON.stringify(o));
const DARDO='srd51:item/dart',EXP='srd51:item/explorers-pack';
const item=(A,id,qtd,origem)=>A.C.paraInventario(A.C.obter(id),qtd,origem);
function pers(A,classe='Monk'){return {inventario:[],ficha:{classes:[{c:classe,n:1}],equip:{armadura:'',escudo:false,bonus:0},ataques:[]}};}
const cont=P=>A_I.conteinerDe(P);let A_I;

test('equipar uma pilha de 10 equipa UMA unidade: a pilha mantém uid, origem e as outras 9',()=>{
  const A=amb();A_I=A.I;const P=pers(A);
  const pilha=item(A,DARDO,10,{tipo:'criacao',id:'classe:fixo:'+DARDO,nota:'Criação — Equipamento de Monge'});P.inventario.push(pilha);const uidPilha=pilha.uid;
  const eq=A.E.equipar(P,pilha.uid);
  assert.equal(P.inventario.length,2);assert.equal(pilha.uid,uidPilha);assert.equal(pilha.qtd,9);assert.equal(pilha.equipado,false);
  assert.notEqual(eq.uid,uidPilha);assert.equal(eq.qtd,1);assert.equal(eq.equipado,true);assert.equal(eq.origemUid,uidPilha);
  assert.equal(eq.origem.nota,'Criação — Equipamento de Monge');assert.equal(eq.catId,DARDO);assert.equal(eq.peso,pilha.peso);
  assert.equal(P.ficha.ataques.length,1);assert.equal(P.ficha.ataques[0].itemUid,eq.uid);
  assert.equal(P.inventario.reduce((n,i)=>n+i.qtd,0),10,'nenhuma unidade se perdeu');
  const mov=P.ficha.movimentos.find(m=>m.tipo==='divisao');assert.ok(mov);assert.equal(mov.uid,uidPilha);assert.equal(mov.para,eq.uid);
});

test('equipar de novo o mesmo registro não divide outra vez; desequipar mantém as unidades e o vínculo some só da ficha',()=>{
  const A=amb();A_I=A.I;const P=pers(A);P.inventario.push(item(A,DARDO,5,{tipo:'jogo'}));
  const eq=A.E.equipar(P,P.inventario[0].uid);A.E.equipar(P,eq.uid);
  assert.equal(P.inventario.length,2);assert.equal(P.inventario[0].qtd,4);assert.equal(P.ficha.ataques.length,1);
  A.E.desequipar(P,eq.uid);
  assert.equal(P.ficha.ataques.length,0);assert.equal(P.inventario.length,2,'a unidade continua no inventário');assert.equal(eq.equipado,false);
  assert.equal(P.inventario.reduce((n,i)=>n+i.qtd,0),5);
});

test('grupo: equipar escolhe um registro com unidades, separa 1 e o resto continua agrupado',()=>{
  const A=amb();A_I=A.I;const P=pers(A);
  P.inventario.push(item(A,DARDO,10,{tipo:'criacao',id:'a',nota:'Criação'}),item(A,DARDO,5,{tipo:'jogo',id:'manual',nota:'Adicionado manualmente'}));
  const [a,b]=P.inventario;
  const eq=A.E.equipar(P,a.uid);
  const g=A.I.agrupar(P.inventario);
  assert.equal(g.get(eq.uid),undefined,'o equipado aparece sozinho');
  assert.equal(A.I.totalDe(g.get(a.uid).membros),14);assert.equal(g.get(a.uid).membros.length,2);
  assert.equal(b.qtd,5,'o outro registro não foi tocado');assert.equal(a.qtd,9);
});

test('armadura e escudo em pilha também equipam só uma unidade; item de 1 unidade equipa direto',()=>{
  const A=amb();A_I=A.I;const P=pers(A,'Fighter');
  P.inventario.push(item(A,'srd51:item/shield',2,{tipo:'jogo'}),item(A,'srd51:item/chain-mail',1,{tipo:'jogo'}));
  const [esc,mal]=P.inventario;
  const e1=A.E.equipar(P,esc.uid);assert.equal(esc.qtd,1);assert.equal(e1.qtd,1);assert.equal(P.ficha.equip.escudoUid,e1.uid);assert.equal(P.ficha.equip.escudo,true);
  const e2=A.E.equipar(P,mal.uid);assert.equal(e2.uid,mal.uid,'1 unidade: sem divisão');assert.equal(P.inventario.length,3);assert.equal(P.ficha.equip.armaduraUid,mal.uid);
});

test('ajustes da arma guardados valem para a unidade separada ao reequipar',()=>{
  const A=amb();A_I=A.I;const P=pers(A,'Rogue');P.inventario.push(item(A,'srd51:item/dagger',3,{tipo:'jogo'}));
  const eq=A.E.equipar(P,P.inventario[0].uid);P.ficha.ataques[0].magico=2;A.E.desequipar(P,eq.uid);
  A.E.equipar(P,eq.uid);assert.equal(P.ficha.ataques[0].magico,2);assert.equal(P.ficha.ataques[0].itemUid,eq.uid);assert.equal(P.inventario.length,2);
});

test('vincular uma linha de ataque a uma pilha também separa só uma unidade',()=>{
  const A=amb();A_I=A.I;const P=pers(A,'Rogue');P.inventario.push(item(A,'srd51:item/dagger',4,{tipo:'jogo'}));
  P.ficha.ataques.push({nome:'Adaga',dado:'1d4',tipo:'perfurante',atr:'acuidade',prof:true,magico:1,extra:0});
  A.E.vincularLinha(P,0,P.inventario[0].uid);
  assert.equal(P.inventario.length,2);assert.equal(P.inventario[0].qtd,3);assert.equal(P.ficha.ataques[0].itemUid,P.inventario[1].uid);assert.equal(P.ficha.ataques[0].magico,1);
});

test('remover o item equipado (a unidade separada) não mexe na pilha',()=>{
  const A=amb();A_I=A.I;const P=pers(A);P.inventario.push(item(A,DARDO,10,{tipo:'jogo'}));
  const eq=A.E.equipar(P,P.inventario[0].uid);P.inventario.splice(P.inventario.indexOf(eq),1);
  A.E.reconciliar(P);assert.equal(P.ficha.ataques.length,0);assert.equal(P.inventario[0].qtd,9);
});

test('+ cria registro "Adicionado manualmente" e não aumenta pacote nem criação',()=>{
  const A=amb(),c={dono:{},itens:[],movimentos:[]};
  for(const x of A.C.paraInventarioPacote(A.C.obter(EXP),1,{tipo:'jogo'}))A.I.adicionar(c,x,{tipo:'entrada'});
  const tocha=c.itens.find(i=>i.catId==='srd51:item/torch'),uid0=tocha.uid;
  const novo=A.I.ajustarQuantidade(c,[tocha],1);
  assert.equal(tocha.qtd,10,'a quantidade do pacote não mudou');assert.equal(tocha.uid,uid0);assert.equal(tocha.origem.pacote.nome,'Pacote de Explorador');
  assert.equal(novo.qtd,1);assert.equal(novo.origem.id,'manual');assert.equal(novo.origem.nota,'Adicionado manualmente');assert.notEqual(novo.uid,uid0);assert.equal(novo.catId,'srd51:item/torch');assert.equal(novo.peso,tocha.peso);
  assert.equal(c.itens.indexOf(novo),c.itens.indexOf(tocha)+1);
  A.I.ajustarQuantidade(c,A.I.agrupar(c.itens).get(tocha.uid).membros,2);
  assert.equal(c.itens.filter(i=>i.catId==='srd51:item/torch').length,2,'os próximos + reaproveitam o registro manual');assert.equal(novo.qtd,3);assert.equal(tocha.qtd,10);
  assert.ok(c.movimentos.some(m=>m.tipo==='entrada'&&m.nota==='Adicionado manualmente'));
});

test('− sai primeiro do registro manual e só depois do último registro; origens e uid ficam',()=>{
  const A=amb(),c={dono:{},itens:[],movimentos:[]};
  A.I.adicionar(c,item(A,DARDO,10,{tipo:'criacao',id:'classe:fixo:'+DARDO,nota:'Criação'}));A.I.adicionar(c,item(A,DARDO,5,{tipo:'jogo',id:'compra:1',nota:'Compra'}));
  const [cri,comp]=c.itens,m=()=>A.I.agrupar(c.itens).get(cri.uid).membros;
  A.I.ajustarQuantidade(c,m(),4);const man=c.itens.find(i=>i.origem.id==='manual');assert.equal(man.qtd,4);
  A.I.ajustarQuantidade(c,m(),-3);assert.equal(man.qtd,1);assert.equal(cri.qtd,10);assert.equal(comp.qtd,5);
  A.I.ajustarQuantidade(c,m(),-4);   // 1 do manual, depois 3 da compra (último)
  assert.equal(man.qtd,0);assert.equal(comp.qtd,2);assert.equal(cri.qtd,10);
  A.I.ajustarQuantidade(c,m(),-100);assert.equal(A.I.totalDe(m()),0);assert.equal(c.itens.length,3,'registros zerados continuam, com origem');
  assert.equal(cri.origem.nota,'Criação');assert.equal(comp.origem.nota,'Compra');
  const aj=c.movimentos.filter(x=>x.tipo==='ajuste');assert.ok(aj.length>=1);assert.ok(aj.every(x=>x.origem&&x.origem.tipo),'cada ajuste guarda a origem');
});

test('ajustes seguidos do mesmo registro juntam-se numa entrada de histórico; item avulso sem origem soma direto',()=>{
  const A=amb(),c={dono:{},itens:[],movimentos:[]};
  A.I.adicionar(c,item(A,DARDO,10,{tipo:'criacao',id:'x',nota:'Criação'}));const base=c.itens[0];
  A.I.ajustarQuantidade(c,[base],-1);A.I.ajustarQuantidade(c,[base],-1);A.I.ajustarQuantidade(c,[base],-1);
  const aj=c.movimentos.filter(m=>m.tipo==='ajuste');assert.equal(aj.length,1);assert.equal(aj[0].qtd,-3);assert.equal(base.qtd,7);
  const livre={dono:{},itens:[item(A,'srd51:item/rope-hempen-50-feet',1,{tipo:'jogo'})],movimentos:[]};
  A.I.ajustarQuantidade(livre,livre.itens,2);assert.equal(livre.itens.length,1);assert.equal(livre.itens[0].qtd,3,'sem origem a preservar, soma direta como antes');
});

test('quantidade digitada = diferença para o total: aumento vira registro manual, redução tira do manual/último',()=>{
  const A=amb(),c={dono:{},itens:[],movimentos:[]};
  A.I.adicionar(c,item(A,DARDO,10,{tipo:'criacao',id:'a',nota:'Criação'}));A.I.adicionar(c,item(A,DARDO,5,{tipo:'jogo',id:'b',nota:'Compra'}));
  const m=()=>A.I.agrupar(c.itens).get(c.itens[0].uid).membros,total=()=>A.I.totalDe(m());
  A.I.ajustarQuantidade(c,m(),20-total());assert.equal(total(),20);assert.equal(c.itens[0].qtd,10);assert.equal(c.itens[1].qtd,5);
  A.I.ajustarQuantidade(c,m(),12-total());assert.equal(total(),12);assert.equal(c.itens[0].qtd,10,'a criação ficou intacta');
});

test('persistência: salvar e reabrir mantém divisão, origens, vínculos e agrupamento',()=>{
  const A=amb();A_I=A.I;const P=pers(A,'Rogue');
  P.inventario.push(item(A,'srd51:item/dagger',3,{tipo:'criacao',id:'c',nota:'Criação'}));
  const eq=A.E.equipar(P,P.inventario[0].uid);A.I.ajustarQuantidade(A.I.conteinerDe(P),[P.inventario[0]],2);
  const R2=J(P);
  assert.equal(R2.inventario.length,P.inventario.length);assert.equal(JSON.stringify(R2.inventario),JSON.stringify(P.inventario));
  assert.equal(A.E.reconciliar(R2).mudou,false);assert.equal(R2.ficha.ataques[0].itemUid,eq.uid);
  const g=A.I.agrupar(R2.inventario,new Set([]));assert.equal(g.size,2,'a pilha original e o registro manual agrupam; o equipado não');
  assert.equal(R2.inventario.reduce((n,i)=>n+i.qtd,0),5);
});

test('interface: o + e a edição direta usam ajustarQuantidade, e equipar escolhe um registro com unidades',()=>{
  const src=ler('js/personagem.js');
  assert.match(src,/IV\.ajustarQuantidade\(cont\(\), membrosDe\(it\), delta\)/);
  assert.match(src,/IV\.ajustarQuantidade\(cont\(\), membrosDe\(it\), alvo - tot\)/);
  assert.match(src,/membrosDe\(it\)\.find\(\(m\) => num\(m\.qtd, 0\) >= 1\)/);
  assert.ok(!/else if \(k === "qtd"\) it_\.qtd/.test(src),'digitar não altera o primeiro registro');
});

test('registro com quantidade zero não é equipável nem fica ligado à ficha, e o histórico continua',()=>{
  const A=amb();A_I=A.I;const P=pers(A);P.inventario.push(item(A,DARDO,2,{tipo:'criacao',id:'z',nota:'Criação'}));
  const eq=A.E.equipar(P,P.inventario[0].uid);
  A.I.ajustarQuantidade(A.I.conteinerDe(P),[P.inventario[0]],-1);assert.equal(P.inventario[0].qtd,0);
  assert.throws(()=>A.E.equipar(P,P.inventario[0].uid),/não está no inventário/);
  eq.qtd=0;assert.equal(A.E.reconciliar(P).mudou,true);assert.equal(P.ficha.ataques.length,0,'unidade zerada deixa de ser tratada como equipada');
  assert.ok(P.ficha.movimentos.some(m=>m.tipo==='divisao')&&P.ficha.movimentos.some(m=>m.tipo==='ajuste'),'o histórico foi preservado');
  assert.equal(P.inventario[0].origem.nota,'Criação','o registro zerado mantém a origem');
  assert.ok(ler('js/personagem.js').includes('equipavel(it) && qtdLinha(it) > 0'),'sem caixa Equipado para quantidade zero');
});
