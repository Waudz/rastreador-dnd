/* Equipamento inicial do criador: identificação por ID do catálogo, entrega sem perda nem duplicação e integração com o inventário. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,ler}=require('./helpers.cjs');

function fixture({catalogo=true,inventario=[{nome:'Lembrança',qtd:1}]}={}){
  const ctx=vm.createContext({window:{},console});
  const nomes=['origens','regras','magias-jogo','subclasses-2014'].concat(catalogo?['inventario','catalogo-itens']:[],['criador-regras']);
  for(const n of nomes)vm.runInContext(ler('js/'+n+'.js'),ctx);
  const W=ctx.window,C=W.CRIADOR,R=W.REGRAS,dados=JSON.parse(ler('dados/criacao-srd2014.json'));
  if(catalogo)W.CAT_ITENS.indexar(JSON.parse(ler('dados/itens-srd2014.json')).itens);
  C.configurar(dados,JSON.parse(ler('dados/magias.json')));
  const p=C.iniciar({nome:'Pedro',versao:1,pv_max:10,pv_atual:10,inventario,dinheiro:{po:4},ficha:{}},'criacao');
  p.ficha.classes=[{c:'Monk',n:1,sub:''}];p.ficha.raca='Humano';p.ficha.backgroundId='eremita';
  return {W,C,R,p,ctx,dados};
}
const catalogoDe=W=>id=>W.CAT_ITENS.obter(id);
const escolherOpcao=(p,i,j)=>{p.ficha.criacao.equipamento['op:'+i]=j;};
/* escolhe a opção j do grupo i e, quando ela pede uma categoria, a primeira arma da categoria (ou a indicada) */
function escolher(C,p,i,j,preferidos={}){
  p.ficha.criacao.equipamento['op:'+i]=j;
  const o=C.classe(p.ficha.classes[0].c).data.startingChoices[i].options[j];
  o.items.forEach((x,k)=>{if(x.category)for(let n=0;n<(x.count||1);n++)p.ficha.criacao.equipamento[`item:${i}:${k}:${n}`]=preferidos[`${i}:${k}:${n}`]||C.itemCategoria(x.category)[0].id;});
}
const monge=({arma='srd51:item/quarterstaff',pacote=1}={})=>{const f=fixture();escolher(f.C,f.p,0,1,{'0:0:0':arma});escolher(f.C,f.p,1,pacote);return f;};

test('Monge que escolhe Bastão recebe o Bastão pelo ID, com peso do catálogo e ataque',()=>{
  const {C,p,W}=monge(),q=C.aplicarEquipamento(p);
  const b=q.inventario.find(i=>i.catId==='srd51:item/quarterstaff');
  assert.ok(b,'Bastão no inventário');
  assert.equal(b.ref,'srd51:item/quarterstaff');assert.equal(b.nome,'Bastão');assert.equal(b.qtd,1);
  assert.equal(b.peso,catalogoDe(W)('srd51:item/quarterstaff').peso);
  assert.equal(b.tipo,'equipamento');assert.equal(b.origem.tipo,'criacao');assert.match(b.origem.nota,/^Criação — Equipamento de Monge/);
  const atq=q.ficha.ataques.find(a=>a.armaId==='srd51:item/quarterstaff');
  assert.ok(atq,'ataque do Bastão');assert.equal(atq.dado,'1d6');assert.equal(atq.tipo,'contundente');assert.equal(atq.atr,'for');
  assert.equal(q.inventario.filter(i=>i.catId==='srd51:item/quarterstaff').length,1);
});

test('Monge recebe automaticamente 10 Dardos (item fixo da classe) e o ataque correspondente',()=>{
  const {C,p,W}=monge(),q=C.aplicarEquipamento(p);
  const d=q.inventario.find(i=>i.catId==='srd51:item/dart');
  assert.ok(d);assert.equal(d.qtd,10);assert.equal(d.nome,'Dardo');assert.equal(d.ref,'srd51:item/dart');
  assert.equal(d.peso,catalogoDe(W)('srd51:item/dart').peso);
  const atq=q.ficha.ataques.find(a=>a.armaId==='srd51:item/dart');assert.ok(atq);assert.equal(atq.dado,'1d4');assert.equal(atq.atr,'acuidade');
});

test('Pacote de Explorador é entregue completo, com quantidades, pesos e origem do pacote',()=>{
  const {C,p,W}=monge({pacote:1}),q=C.aplicarEquipamento(p),cat=catalogoDe(W),pacote=cat('srd51:item/explorers-pack');
  assert.ok(!q.inventario.some(i=>i.catId==='srd51:item/explorers-pack'),'o pacote é desmembrado');
  for(const c of pacote.pacote){
    const i=q.inventario.find(x=>x.catId===c.id&&x.origem?.nota==='Criação — Pacote de Explorador');
    assert.ok(i,'falta '+c.id);assert.equal(i.qtd,c.qtd,c.id);assert.equal(i.peso,cat(c.id).peso,c.id);assert.equal(i.nome,cat(c.id).nome);assert.equal(i.ref,c.id);
  }
  assert.equal(q.inventario.filter(i=>i.origem?.nota==='Criação — Pacote de Explorador').length,pacote.pacote.length);
});

test('os sete pacotes de aventureiro entregam exatamente o conteúdo do catálogo',()=>{
  const {C,W,dados}=fixture(),cat=catalogoDe(W);let vistos=0;
  for(const cls of dados.classes){
    cls.data.startingChoices.forEach((g,gi)=>g.options.forEach((o,oi)=>o.items.filter(x=>x.item&&cat(x.item)?.categoria==='pacote').forEach(x=>{
      const f=fixture();f.p.ficha.classes=[{c:cls.id.split('/').pop().replace(/^./,m=>m.toUpperCase()),n:1,sub:''}];
      for(let i=0;i<cls.data.startingChoices.length;i++)escolher(f.C,f.p,i,i===gi?oi:0);
      const q=f.C.aplicarEquipamento(f.p),pac=cat(x.item);vistos++;
      for(const c of pac.pacote){const i=q.inventario.filter(z=>z.catId===c.id&&z.origem?.id.includes(':'+x.item+':'));assert.equal(i.reduce((n,z)=>n+z.qtd,0),c.qtd,cls.id+' '+x.item+' '+c.id);assert.ok(i.every(z=>z.peso===cat(c.id).peso));}
    })));
  }
  assert.ok(vistos>=7,'pacotes testados: '+vistos);
});

test('Eremita entrega o equipamento da Origem: catálogo quando a correspondência é única, personalizado nos demais',()=>{
  const {C,p,W}=monge(),q=C.aplicarEquipamento(p),cat=catalogoDe(W);
  const nota='Criação — Origem Eremita',da=q.inventario.filter(i=>i.origem?.nota===nota);
  const porNome=n=>da.find(i=>i.nome===n);
  for(const [nome,id] of [['Cobertor','srd51:item/blanket'],['Roupas comuns','srd51:item/clothes-common'],['Algibeira','srd51:item/pouch'],['Kit de herbalismo','srd51:item/herbalism-kit']]){
    const i=porNome(nome);assert.ok(i,nome);assert.equal(i.catId,id);assert.equal(i.ref,id);assert.equal(i.peso,cat(id).peso,nome+' usa o peso real');
  }
  const estojo=porNome('Estojo de pergaminhos com anotações');
  assert.ok(estojo,'item personalizado preservado');assert.equal(estojo.ref,null);assert.ok(!estojo.catId);assert.equal(estojo.peso,0);assert.equal(estojo.qtd,1);
  assert.equal(da.length,5);
  assert.equal(q.dinheiro.po,4+5,'ouro da Origem somado ao que já havia');
});

test('nome ambíguo no catálogo não é adivinhado (Bastão existe como quarterstaff e rod)',()=>{
  const {W}=fixture(),bastoes=W.CAT_ITENS.todos().filter(i=>i.nome==='Bastão');assert.ok(bastoes.length>=2);
  const f=fixture();f.p.ficha.backgroundId='forasteiro';
  const eq=f.C.equipamento(f.p),b=eq.itens.find(i=>i.nome==='Bastão'&&i.origem.nota.includes('Origem'));
  if(b){assert.ok(!b.catId,'sem ID inventado');assert.equal(b.peso,0);}
});

test('trocar o nome traduzido da arma não quebra a identificação nem o ataque',()=>{
  const {C,p,W,dados}=monge();
  dados.items.find(i=>i.id==='srd51:item/quarterstaff').nome='Cajado de Combate';
  W.CAT_ITENS.obter('srd51:item/quarterstaff').nome='Cajado de Combate';
  const q=C.aplicarEquipamento(p),b=q.inventario.find(i=>i.catId==='srd51:item/quarterstaff');
  assert.ok(b,'continua entregue');assert.equal(b.nome,'Cajado de Combate');
  const atq=q.ficha.ataques.find(a=>a.armaId==='srd51:item/quarterstaff');assert.ok(atq);assert.equal(atq.nome,'Cajado de Combate');assert.equal(atq.dado,'1d6');
});

test('sem catálogo carregado o criador ainda entrega pelo ID, com ref e peso convertido',()=>{
  const {C,p}=(()=>{const f=fixture({catalogo:false});escolher(f.C,f.p,0,1,{'0:0:0':'srd51:item/quarterstaff'});escolher(f.C,f.p,1,1);return f;})();
  const q=C.aplicarEquipamento(p),b=q.inventario.find(i=>i.catId==='srd51:item/quarterstaff');
  assert.ok(b);assert.equal(b.ref,'srd51:item/quarterstaff');assert.ok(b.peso>0);assert.ok(b.uid);assert.equal(b.origem.tipo,'criacao');
});

test('personagem com itens preexistentes recebe o equipamento inicial que ainda não foi entregue',()=>{
  const {C,p}=monge();p.inventario=[{nome:'Lembrança',qtd:1},{uid:'x',nome:'Bastão',qtd:1,ref:'srd51:item/rod'},{uid:'y',nome:'Dardo',qtd:3,ref:'srd51:item/dart'}];
  assert.ok(!p.ficha.criacao.equipAplicado,'ter itens não marca o equipamento como entregue');
  const s=C.salvamento(C.derivar(p),{modo:'criacao',original:p});
  const inv=s.dados.inventario;
  assert.equal(inv[0].nome,'Lembrança');assert.equal(inv[1].ref,'srd51:item/rod');assert.equal(inv[2].qtd,3,'item preexistente intocado');
  assert.ok(inv.some(i=>i.catId==='srd51:item/quarterstaff'),'Bastão escolhido entregue mesmo com outro "Bastão" já no inventário');
  assert.equal(inv.find(i=>i.catId==='srd51:item/dart'&&i.origem?.tipo==='criacao').qtd,10);
  assert.equal(s.dados.ficha.criacao.equipAplicado,true);assert.equal(s.dados.ficha.criacao.concluido,true);
});

test('salvar de novo ou editar não duplica equipamento nem ouro',()=>{
  const {C,p}=monge(),s1=C.salvamento(C.derivar(p),{modo:'criacao',original:p});
  const n=s1.dados.inventario.length,po=s1.dados.dinheiro.po;
  const salvo={nome:'Pedro',versao:2,pv_max:s1.pv.max,pv_atual:s1.pv.atual,inventario:s1.dados.inventario,dinheiro:s1.dados.dinheiro,ficha:s1.dados.ficha};
  /* repetir o salvamento de criação com a ficha já concluída */
  const s2=C.salvamento(C.derivar(C.iniciar(salvo,'criacao')),{modo:'criacao',original:salvo});
  assert.equal(s2.dados.inventario.length,n);assert.equal(s2.dados.dinheiro.po,po);
  /* editar */
  const e=C.iniciar(salvo,'editar'),s3=C.salvamento(C.derivar(e),{modo:'editar',original:salvo});
  assert.equal(s3.dados.inventario.length,n);assert.equal(s3.dados.dinheiro.po,po);
  assert.ok(!C.validar(C.derivar(e)).some(x=>x.etapa===6),'editar não exige escolhas de equipamento');
  /* marcação perdida: as chaves de origem impedem a segunda entrega */
  const perdido=JSON.parse(JSON.stringify(salvo));delete perdido.ficha.criacao.equipAplicado;delete perdido.ficha.criacao.concluido;
  const r=C.aplicarEquipamento(C.iniciar(perdido,'criacao'));
  assert.equal(r.inventario.length,n);
});

test('equipamento entregue mantém ID, quantidade, peso, categoria e origem de cada item',()=>{
  const {C,p,W}=monge(),q=C.aplicarEquipamento(p),cat=catalogoDe(W),eq=C.equipamento(p);
  const entregues=q.inventario.filter(i=>i.origem?.tipo==='criacao');
  assert.equal(entregues.length,eq.itens.length);
  for(const e of eq.itens){
    const i=entregues.find(x=>x.origem.id===e.origem.id);assert.ok(i,e.origem.id);
    assert.equal(i.qtd,e.qtd);
    if(e.id){const c=cat(e.id);assert.equal(i.catId,e.id);assert.equal(i.ref,e.id);assert.equal(i.nome,c.nome);assert.equal(i.peso,Number(c.peso)||0);assert.ok(i.tipo);assert.ok(i.uid);}
    assert.ok(/^Criação — /.test(i.origem.nota),i.origem.nota);
  }
  assert.equal(new Set(entregues.map(i=>i.uid)).size,entregues.length,'uid únicos');
});

test('o item do criador é reconhecido como o mesmo item do catálogo, do mestre e da aba Itens',()=>{
  const {C,p,W}=monge(),q=C.aplicarEquipamento(p),cat=W.CAT_ITENS,I=W.INVENTARIO;
  const doCriador=q.inventario.find(i=>i.catId==='srd51:item/quarterstaff');
  const doCatalogo=cat.paraInventario(cat.obter('srd51:item/quarterstaff'),1,{tipo:'mestre'});
  for(const k of ['ref','catId','nome','peso','tipo'])assert.equal(doCriador[k],doCatalogo[k],k);
  assert.equal(cat.doInventario(doCriador).id,'srd51:item/quarterstaff');
  const c=I.conteinerDe({inventario:[doCriador],ficha:{}});I.adicionar(c,I.novoItem(doCatalogo),{tipo:'entrada'});
  assert.equal(c.itens.length,2,'a origem da criação é preservada: linhas separadas, cada uma com sua quantidade');assert.equal(c.itens[0].origem.tipo,'criacao');assert.equal(c.itens[1].qtd,1);
  I.adicionar(c,I.novoItem(doCatalogo),{tipo:'entrada'});assert.equal(c.itens.length,2);assert.equal(c.itens[1].qtd,2,'itens do catálogo sem origem própria empilham entre si');
});

test('imagem cadastrada no catálogo aparece para o item entregue pelo criador',()=>{
  const {C,p,W,ctx}=monge(),q=C.aplicarEquipamento(p);
  vm.runInContext(ler('js/inventario-imagens.js'),ctx);
  const b=q.inventario.find(i=>i.catId==='srd51:item/quarterstaff'),url='https://exemplo.test/bastao.png';
  assert.equal(W.INV_IMG.obter({},b),null,'sem imagem cadastrada');
  W.CATALOGO={registros:()=>[],imagem:(tipo,chave)=>tipo==='item'&&chave==='srd51:item/quarterstaff'?url:undefined};
  assert.deepEqual({...W.INV_IMG.obter({},b)},{src:url,origem:'catalogo'});
  assert.equal(W.INV_IMG.refCatalogo(b),'srd51:item/quarterstaff');
  /* item antigo, que só tinha catId (sem ref), também encontra a imagem */
  const antigo={uid:'a',nome:'Bastão',catId:'srd51:item/quarterstaff',qtd:1};assert.equal(W.INV_IMG.obter({},antigo).src,url);
  /* item personalizado da Origem não ganha imagem de outro item */
  const custom=q.inventario.find(i=>i.nome==='Estojo de pergaminhos com anotações');assert.equal(W.INV_IMG.obter({},custom),null);
});

test('alternativas de equipamento inicial das 12 classes entregam todos os itens, sem perdas',()=>{
  const {W,dados}=fixture(),cat=catalogoDe(W);let combos=0;
  assert.equal(dados.classes.length,12);
  for(const cls of dados.classes){
    const letra=cls.id.split('/').pop(),nomeC=letra.replace(/^./,m=>m.toUpperCase()),grupos=cls.data.startingChoices||[];
    assert.ok(grupos.length>0,letra);
    grupos.forEach((g,gi)=>g.options.forEach((o,oi)=>{
      const f=fixture();f.p.ficha.classes=[{c:nomeC,n:1,sub:''}];f.p.ficha.backgroundId='soldado';
      for(let i=0;i<grupos.length;i++)escolher(f.C,f.p,i,i===gi?oi:0);
      const eq=f.C.equipamento(f.p);combos++;
      assert.equal(JSON.stringify(eq.pendentes),'[]',letra+' g'+gi+' o'+oi);assert.equal(JSON.stringify(eq.ausentes),'[]',letra+' ausentes');
      /* soma esperada por ID: fixos + opção escolhida (com pacotes expandidos) */
      const esperado=new Map(),soma=(id,n)=>{const c=cat(id);assert.ok(c,'sem catálogo: '+id);if(c.pacote)c.pacote.forEach(x=>soma(x.id,x.qtd*n));else esperado.set(id,(esperado.get(id)||0)+n);};
      for(const x of cls.data.startingEquipment||[])soma(x.item,x.quantity);
      grupos.forEach((gr,k)=>{const op=gr.options[k===gi?oi:0];op.items.forEach((x,j)=>{if(x.item)soma(x.item,x.quantity||1);else for(let n=0;n<(x.count||1);n++)soma(f.p.ficha.criacao.equipamento[`item:${k}:${j}:${n}`],1);});});
      const obtido=new Map();for(const i of eq.itens.filter(i=>i.origem?.id.startsWith('classe:')))obtido.set(i.id,(obtido.get(i.id)||0)+i.qtd);
      assert.equal(JSON.stringify([...obtido].sort()),JSON.stringify([...esperado].sort()),letra+' g'+gi+' o'+oi);
      const q=f.C.aplicarEquipamento(f.p);
      for(const [id,n] of esperado)assert.equal(q.inventario.filter(i=>i.catId===id&&i.origem.id.startsWith('classe:')).reduce((s,i)=>s+i.qtd,0),n,letra+' '+id);
    }));
  }
  assert.ok(combos>=40,'combinações testadas: '+combos);
});

test('todo ID de equipamento do criador existe no catálogo de itens, com o mesmo peso e nome',()=>{
  const {W,dados}=fixture();
  for(const i of dados.items){const c=W.CAT_ITENS.obter(i.id);assert.ok(c,i.id);if(i.data.gear?.contents)assert.ok(c.pacote,i.id+' pacote');}
});
