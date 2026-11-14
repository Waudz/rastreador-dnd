/* Pacotes de equipamento: componentes individuais no inventário, com origem, sem item "pacote" e sem desmembrar kits de ferramentas. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,ler}=require('./helpers.cjs');
function amb(){
  const ctx=vm.createContext({window:{},console});
  for(const n of ['origens','regras','magias-jogo','subclasses-2014','inventario','catalogo-itens','equipamento-ficha','criador-regras','inventario-imagens'])vm.runInContext(ler('js/'+n+'.js'),ctx);
  const W=ctx.window;W.CAT_ITENS.indexar(JSON.parse(ler('dados/itens-srd2014.json')).itens);
  W.CRIADOR.configurar(JSON.parse(ler('dados/criacao-srd2014.json')),JSON.parse(ler('dados/magias.json')));
  return {W,C:W.CAT_ITENS,I:W.INVENTARIO,CR:W.CRIADOR};
}
const EXP='srd51:item/explorers-pack',DUN='srd51:item/dungeoneers-pack';
const novo=()=>({dono:{tipo:'personagem'},itens:[],movimentos:[]});
function adicionarPacote(A,c,id,n=1,origem={tipo:'jogo'}){const cat=A.C.obter(id);for(const x of A.C.paraInventarioPacote(cat,n,origem))A.I.adicionar(c,x,{tipo:'entrada',nota:cat.nome});return c;}
const soma=(c,ref)=>c.itens.filter(i=>i.catId===ref).reduce((n,i)=>n+i.qtd,0);

test('catálogo: o Pacote de Explorador lista todos os componentes com quantidades e pesos',()=>{
  const A=amb(),cat=A.C.obter(EXP),v=A.C.viewDoCatalogo(cat,null);
  assert.equal(v.componentes.length,cat.pacote.length);
  for(const c of cat.pacote){const x=v.componentes.find(k=>k.id===c.id);assert.ok(x,c.id);assert.equal(x.qtd,c.qtd);assert.equal(x.peso,A.C.obter(c.id).peso);assert.notEqual(x.nome,c.id,'nome traduzido');}
  const html=A.C.fichaHTML(v);assert.match(html,/Conteúdo do conjunto/);assert.match(html,/Tocha <b>×10<\/b>/);assert.match(html,/Mochila <b>×1<\/b>/);
  assert.match(v.notaConjunto,/individual/);
});

test('adicionar o pacote cria os componentes individuais, sem item que represente o pacote',()=>{
  const A=amb(),c=adicionarPacote(A,novo(),EXP),cat=A.C.obter(EXP);
  assert.equal(c.itens.length,cat.pacote.length);
  assert.ok(!c.itens.some(i=>i.catId===EXP||i.ref===EXP||i.conjunto),'nenhum item "pacote" nem conjunto');
  for(const comp of cat.pacote){
    const i=c.itens.find(x=>x.catId===comp.id),ref=A.C.obter(comp.id);
    assert.ok(i,comp.id);assert.equal(i.qtd,comp.qtd);assert.equal(i.ref,comp.id);assert.equal(i.nome,ref.nome);assert.equal(i.peso,Number(ref.peso)||0);assert.equal(i.desc,'','a descrição do item não é usada para a origem');
    assert.equal(i.origem.nota,'Pacote de Explorador');assert.equal(i.origem.pacote.id,EXP);assert.equal(i.origem.pacote.nome,'Pacote de Explorador');assert.equal(i.origem.tipo,'jogo');assert.equal(i.origem.id,'pacote:'+EXP);
  }
  assert.equal(c.itens.length,new Set(c.itens.map(i=>i.uid)).size,'uid individuais');
});

test('quantidade do pacote multiplica os componentes; o mesmo pacote duas vezes soma sem perder a origem',()=>{
  const A=amb(),c=adicionarPacote(A,novo(),EXP,2);
  assert.equal(soma(c,'srd51:item/torch'),20);assert.equal(soma(c,'srd51:item/backpack'),2);
  adicionarPacote(A,c,EXP,1);
  assert.equal(c.itens.length,A.C.obter(EXP).pacote.length,'continua uma linha por componente');
  assert.equal(soma(c,'srd51:item/torch'),30);assert.ok(c.itens.every(i=>i.origem.pacote.nome==='Pacote de Explorador'));
});

test('mesmo item vindo de pacotes diferentes (ou avulso) mantém uma linha por origem e o total correto',()=>{
  const A=amb(),c=adicionarPacote(A,novo(),EXP);adicionarPacote(A,c,DUN);
  const tochas=c.itens.filter(i=>i.catId==='srd51:item/torch');
  assert.equal(new Set(tochas.map(t=>t.origem.pacote.id)).size,2);
  assert.equal(soma(c,'srd51:item/torch'),20);
  A.I.adicionar(c,A.C.paraInventario(A.C.obter('srd51:item/torch'),3,{tipo:'jogo'}),{tipo:'entrada'});
  assert.equal(c.itens.filter(i=>i.catId==='srd51:item/torch').length,3,'o avulso não se mistura com os de pacote');assert.equal(soma(c,'srd51:item/torch'),23);
  A.I.adicionar(c,A.C.paraInventario(A.C.obter('srd51:item/torch'),2,{tipo:'jogo'}),{tipo:'entrada'});
  assert.equal(c.itens.filter(i=>i.catId==='srd51:item/torch').length,3,'avulsos entre si continuam empilhando');assert.equal(soma(c,'srd51:item/torch'),25);
});

test('consumir, descartar, vender ou remover um componente não afeta os outros',()=>{
  const A=amb(),c=adicionarPacote(A,novo(),EXP),antes=JSON.stringify(c.itens.filter(i=>i.catId!=='srd51:item/rations-1-day'&&i.catId!=='srd51:item/backpack'));
  const rac=c.itens.find(i=>i.catId==='srd51:item/rations-1-day');
  A.I.consumir(c,rac.uid,3);assert.equal(rac.qtd,7);
  A.I.retirar(c,rac.uid,2,{tipo:'venda'});assert.equal(rac.qtd,5);
  const mochila=c.itens.find(i=>i.catId==='srd51:item/backpack');A.I.retirar(c,mochila.uid,1,{tipo:'descarte'});
  assert.ok(!c.itens.some(i=>i.catId==='srd51:item/backpack'),'o item removido sai da lista');
  assert.equal(JSON.stringify(c.itens.filter(i=>i.catId!=='srd51:item/rations-1-day')),antes,'os demais ficaram idênticos');
  assert.equal(c.itens.length,A.C.obter(EXP).pacote.length-1);
});

test('kits e ferramentas não são desmembrados: continuam um item único',()=>{
  const A=amb();
  for(const id of ['srd51:item/herbalism-kit','srd51:item/thieves-tools','srd51:item/healers-kit','srd51:item/climbers-kit','srd51:item/disguise-kit']){
    const cat=A.C.obter(id);assert.ok(cat,id);assert.equal(A.C.paraInventarioPacote(cat,1,{tipo:'jogo'}),null,id);
    const x=A.C.paraInventario(cat,1,{tipo:'jogo'});assert.equal(x.catId,id);assert.ok(!x.conjunto);
  }
  const pacotes=A.C.todos().filter(i=>i.categoria==='pacote'),kits=A.C.todos().filter(i=>i.categoria==='kit'||i.categoria==='ferramenta');
  assert.equal(pacotes.length,7);assert.ok(kits.length>=30);assert.ok(kits.every(k=>!k.pacote));
});

test('criador: componentes do pacote inicial vêm individuais, com origem do pacote e sem duplicar',()=>{
  const A=amb(),CR=A.CR;
  const p=CR.iniciar({nome:'Pedro',versao:1,pv_max:10,pv_atual:10,inventario:[{nome:'Lembrança',qtd:1}],dinheiro:{po:4},ficha:{}},'criacao');
  p.ficha.classes=[{c:'Monk',n:1,sub:''}];p.ficha.raca='Humano';p.ficha.backgroundId='eremita';
  p.ficha.criacao.equipamento['op:0']=0;p.ficha.criacao.equipamento['op:1']=1;   // espada curta + pacote de explorador
  const s=CR.salvamento(CR.derivar(p),{modo:'criacao',original:p}),inv=s.dados.inventario;
  assert.ok(!inv.some(i=>i.catId===EXP));
  const doPacote=inv.filter(i=>i.origem&&i.origem.pacote&&i.origem.pacote.id===EXP);
  assert.equal(doPacote.length,A.C.obter(EXP).pacote.length);
  for(const c of A.C.obter(EXP).pacote){const i=doPacote.find(x=>x.catId===c.id);assert.ok(i,c.id);assert.equal(i.qtd,c.qtd);assert.equal(i.origem.nota,'Criação — Pacote de Explorador');assert.equal(i.origem.pacote.nome,'Pacote de Explorador');}
  assert.equal(inv[0].nome,'Lembrança');
  const salvo={nome:'Pedro',versao:2,pv_max:10,pv_atual:10,inventario:inv,dinheiro:s.dados.dinheiro,ficha:s.dados.ficha};
  const de=CR.salvamento(CR.derivar(CR.iniciar(salvo,'editar')),{modo:'editar',original:salvo});
  assert.equal(de.dados.inventario.length,inv.length,'editar não duplica o equipamento inicial');
});

test('inventários existentes seguem iguais: conjunto antigo não empilha e item sem origem.id empilha como antes',()=>{
  const A=amb(),c=novo(),I=A.I;
  const antigo=I.novoItem({nome:'Pacote de Explorador',qtd:1,peso:10,ref:EXP,catId:EXP,conjunto:[{ref:'srd51:item/torch',nome:'Tocha',qtd:10,peso:0.5}]});
  I.adicionar(c,antigo);I.adicionar(c,I.novoItem({nome:'Pacote de Explorador',qtd:1,peso:10,ref:EXP,catId:EXP,conjunto:[{ref:'srd51:item/torch',nome:'Tocha',qtd:10,peso:0.5}]}));
  assert.equal(c.itens.length,2,'conjuntos antigos continuam sem empilhar');
  I.adicionar(c,A.C.paraInventario(A.C.obter('srd51:item/dart'),4,{tipo:'jogo'}));I.adicionar(c,A.C.paraInventario(A.C.obter('srd51:item/dart'),6,{tipo:'jogo'}));
  assert.equal(c.itens.find(i=>i.catId==='srd51:item/dart').qtd,10);
  const velho={uid:'x',nome:'Corda',qtd:1,peso:5,tipo:'equipamento',ref:'srd51:item/rope-hempen-50-feet',propriedades:{},origem:{tipo:'inicial'}};
  I.adicionar(c,velho);I.adicionar(c,I.novoItem({nome:'Corda',qtd:2,peso:5,ref:'srd51:item/rope-hempen-50-feet'}));
  assert.equal(c.itens.filter(i=>i.ref==='srd51:item/rope-hempen-50-feet').length,1);
});

test('imagem do catálogo aparece nos componentes (mesmo ID)',()=>{
  const A=amb(),c=adicionarPacote(A,novo(),EXP),url='https://exemplo.test/tocha.png';
  A.W.CATALOGO={registros:()=>[],imagem:(t,k)=>t==='item'&&k==='srd51:item/torch'?url:undefined};
  const tocha=c.itens.find(i=>i.catId==='srd51:item/torch'),mochila=c.itens.find(i=>i.catId==='srd51:item/backpack');
  assert.equal(A.W.INV_IMG.obter({},tocha).src,url);assert.equal(A.W.INV_IMG.obter({},mochila),null);
});

test('interface: "Faz parte do Pacote de X" aparece sem trocar a descrição e itens antigos da criação também a mostram',()=>{
  const src=ler('js/personagem.js');
  assert.match(src,/Faz parte do/);assert.match(src,/const pacoteDe/);
  assert.match(src,/C\.paraInventarioPacote\(cat, n, origem\)/);
  assert.ok(!/desc:\s*pacoteDe/.test(src),'não escreve na descrição');
});
