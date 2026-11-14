/* Agrupamento visual de itens idênticos: os registros (uid, origem, quantidade) continuam individuais. */
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
const cat=(A,id,qtd,origem)=>A.C.paraInventario(A.C.obter(id),qtd,origem);
/* o que o inventário guarda: 10 dardos da criação (origem própria) e 5 comprados */
function cenario(A){
  const c={dono:{tipo:'personagem'},itens:[],movimentos:[]};
  A.I.adicionar(c,cat(A,DARDO,10,{tipo:'criacao',id:'classe:fixo:'+DARDO,nota:'Criação — Equipamento de Monge'}),{tipo:'entrada'});
  A.I.adicionar(c,cat(A,DARDO,5,{tipo:'jogo',id:'compra:1',nota:'Compra'}),{tipo:'compra'});
  return c;
}

test('10 Dardos da criação e 5 comprados formam uma linha de 15, com dois registros',()=>{
  const A=amb(),c=cenario(A);assert.equal(c.itens.length,2,'os registros seguem separados nos dados');
  const g=A.I.agrupar(c.itens);assert.equal(g.size,2);
  const grupo=g.get(c.itens[0].uid);assert.equal(grupo,g.get(c.itens[1].uid));assert.equal(grupo.principal,c.itens[0]);assert.equal(A.I.totalDe(grupo.membros),15);
  assert.equal(JSON.stringify(grupo.membros.map(m=>m.qtd)),JSON.stringify([10,5]));assert.notEqual(c.itens[0].uid,c.itens[1].uid);
  assert.equal(c.itens[0].origem.nota,'Criação — Equipamento de Monge');assert.equal(c.itens[1].origem.nota,'Compra');
});

test('agrupar só lê: não muda nenhum registro e dá o mesmo resultado depois de salvar e reabrir',()=>{
  const A=amb(),c=cenario(A),antes=JSON.stringify(c.itens);
  A.I.agrupar(c.itens);assert.equal(JSON.stringify(c.itens),antes);
  const reaberto=J(c.itens),g=A.I.agrupar(reaberto);assert.equal(g.size,2);assert.equal(A.I.totalDe(g.get(reaberto[0].uid).membros),15);
});

test('componente de pacote e item avulso idênticos agrupam e a origem do pacote continua legível',()=>{
  const A=amb(),c={dono:{},itens:[],movimentos:[]};
  for(const x of A.C.paraInventarioPacote(A.C.obter(EXP),1,{tipo:'jogo'}))A.I.adicionar(c,x,{tipo:'entrada'});
  A.I.adicionar(c,cat(A,'srd51:item/torch',3,{tipo:'jogo'}),{tipo:'compra'});
  const tochas=c.itens.filter(i=>i.catId==='srd51:item/torch'),g=A.I.agrupar(c.itens).get(tochas[0].uid);
  assert.equal(tochas.length,2);assert.equal(A.I.totalDe(g.membros),13);
  assert.equal(tochas[0].origem.pacote.nome,'Pacote de Explorador');assert.ok(!tochas[1].origem.pacote);
  assert.equal(A.I.agrupar(c.itens).get(c.itens.find(i=>i.catId==='srd51:item/backpack').uid),undefined,'item sem par não vira grupo');
});

test('não agrupa itens com propriedades, nome, peso ou descrição diferentes, sem ID, equipados, conjuntos ou pergaminhos',()=>{
  const A=amb(),c=cenario(A),base=c.itens;
  const magico=cat(A,DARDO,2,{tipo:'mestre',id:'m1'});magico.propriedades={raridade:'raro',bonus:1};
  const outroNome=cat(A,DARDO,2,{tipo:'mestre',id:'m2'});outroNome.nome='Dardo do Pedro';
  const pesado=cat(A,DARDO,2,{tipo:'mestre',id:'m3'});pesado.peso=3;
  const comDesc=cat(A,DARDO,2,{tipo:'mestre',id:'m4'});comDesc.desc='forjado em Waterdeep';
  const semId=A.I.novoItem({nome:'Dardo',qtd:2,peso:0.25,origem:{tipo:'jogo',id:'m5'}});
  const equipado=cat(A,DARDO,2,{tipo:'mestre',id:'m6'});equipado.equipado=true;
  const conj=A.I.novoItem({nome:'Pacote',qtd:1,ref:EXP,catId:EXP,conjunto:[{ref:'srd51:item/torch',nome:'Tocha',qtd:1,peso:1}]});
  const perg=A.I.novoItem({nome:'Pergaminho',qtd:1,ref:'x',catId:'x',magiaVinculada:{en:'Light',n:'Luz',l:0}});
  const todos=[...base,magico,outroNome,pesado,comDesc,semId,equipado,conj,perg],g=A.I.agrupar(todos);
  for(const i of [magico,outroNome,pesado,comDesc,semId,equipado,conj,perg])assert.equal(g.get(i.uid),undefined,'não deveria agrupar: '+i.nome);
  assert.equal(g.get(base[0].uid).membros.length,2);
  /* dois mágicos iguais entre si agrupam entre si */
  const magico2=cat(A,DARDO,1,{tipo:'mestre',id:'m7'});magico2.propriedades={bonus:1,raridade:'raro'};
  assert.equal(A.I.agrupar([magico,magico2]).get(magico.uid).membros.length,2,'a ordem das chaves das propriedades não importa');
  /* uid ligado à ficha fica de fora */
  assert.equal(A.I.agrupar(base,new Set([base[1].uid])).size,0);
});

test('descartar ou vender parte da linha tira do último registro e preserva origem e histórico',()=>{
  const A=amb(),c=cenario(A),g=A.I.agrupar(c.itens).get(c.itens[0].uid),primeiro=c.itens[0],segundo=c.itens[1];
  A.I.retirarDoGrupo(c,g.membros,3,{tipo:'descarte'});
  assert.equal(segundo.qtd,2);assert.equal(primeiro.qtd,10);assert.equal(c.itens.length,2);
  A.I.retirarDoGrupo(c,g.membros,4,{tipo:'venda'});   // 2 do segundo (some) + 2 do primeiro
  assert.equal(c.itens.length,1,'o registro zerado sai da lista');assert.equal(c.itens[0].uid,primeiro.uid);assert.equal(c.itens[0].qtd,8);assert.equal(c.itens[0].origem.nota,'Criação — Equipamento de Monge');
  const mov=c.movimentos.filter(m=>m.tipo==='descarte'||m.tipo==='venda');
  assert.equal(mov.length,3);assert.equal(mov.reduce((n,m)=>n+m.qtd,0),7);assert.ok(mov.every(m=>m.origem&&m.origem.tipo),'cada saída guarda a origem do registro');
  assert.throws(()=>A.I.retirarDoGrupo(c,[primeiro],99,{tipo:'descarte'}),/Quantidade inválida/);
  assert.throws(()=>A.I.retirarDoGrupo(c,[primeiro],0,{tipo:'descarte'}),/Quantidade inválida/);
});

test('+ e − e quantidade digitada na linha agrupada ajustam sem apagar registros nem origens',()=>{
  const A=amb(),c=cenario(A),m=A.I.agrupar(c.itens).get(c.itens[0].uid).membros;
  A.I.ajustarGrupo(m,1);assert.equal(JSON.stringify(m.map(x=>x.qtd)),JSON.stringify([11,5]));
  A.I.ajustarGrupo(m,-6);assert.equal(JSON.stringify(m.map(x=>x.qtd)),JSON.stringify([10,0]),'sai do último, sem remover o registro');assert.equal(c.itens.length,2);
  A.I.ajustarGrupo(m,-50);assert.equal(JSON.stringify(m.map(x=>x.qtd)),JSON.stringify([0,0]),'nunca negativa');
  A.I.ajustarGrupo(m,7);assert.equal(A.I.totalDe(m),7);assert.equal(c.itens[1].origem.nota,'Compra');
  /* digitar o total: 15 -> alvo 9 = delta -6 */
  const c2=cenario(A),m2=A.I.agrupar(c2.itens).get(c2.itens[0].uid).membros;A.I.ajustarGrupo(m2,9-A.I.totalDe(m2));assert.equal(A.I.totalDe(m2),9);
});

test('equipar tira o registro do grupo sem mudar uid nem o vínculo com a ficha; o resto continua agrupado',()=>{
  const A=amb(),c={dono:{},itens:[],movimentos:[]};
  A.I.adicionar(c,cat(A,'srd51:item/dagger',1,{tipo:'criacao',id:'a'}));A.I.adicionar(c,cat(A,'srd51:item/dagger',1,{tipo:'jogo',id:'b'}));A.I.adicionar(c,cat(A,'srd51:item/dagger',1,{tipo:'mestre',id:'c'}));
  const P={inventario:c.itens,ficha:{classes:[{c:'Rogue',n:1}],equip:{},ataques:[]}},[a,b,d]=c.itens,uidB=b.uid;
  assert.equal(A.I.agrupar(c.itens).get(a.uid).membros.length,3);
  A.E.equipar(P,b.uid);
  const g=A.I.agrupar(c.itens);assert.equal(g.get(b.uid),undefined,'o equipado aparece sozinho');assert.equal(g.get(a.uid).membros.length,2);
  assert.equal(b.uid,uidB);assert.equal(P.ficha.ataques[0].itemUid,uidB);assert.equal(b.equipado,true);
  A.E.desequipar(P,b.uid);assert.equal(A.I.agrupar(c.itens).get(a.uid).membros.length,3,'desequipado volta ao grupo');
  /* ajustes guardados (armasGuardadas) mantêm o item fora do grupo por segurança */
  P.ficha.armasGuardadas={[b.uid]:{armaId:'srd51:item/dagger',linha:{magico:1}}};
  const excl=new Set(Object.keys(P.ficha.armasGuardadas));assert.equal(A.I.agrupar(c.itens,excl).get(a.uid).membros.length,2);
});

test('interface: linha agrupada usa o total, lista as origens nos detalhes e age pelos helpers do grupo',()=>{
  const src=ler('js/personagem.js');
  assert.match(src,/listaInvHTML\(\)/);assert.match(src,/IV\.agrupar\(INV\(\), exclGrupo\(\)\)/);
  assert.ok(src.includes('<b>${q}×</b> · '),'detalhes: a quantidade de cada lote ao lado da sua origem');
  assert.match(src,/IV\.retirarDoGrupo\(cont\(\), mem, n/);assert.match(src,/IV\.ajustarQuantidade\(cont\(\), membrosDe\(it\), delta\)/);
  assert.match(src,/Faz parte do/);
  assert.ok(!/INV\(\)\.map\(linhaInv\)/.test(src),'nenhuma lista renderiza item por item sem agrupar');
});
