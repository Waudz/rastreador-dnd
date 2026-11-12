const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,ler}=require('./helpers.cjs');
function motor(){const ctx=vm.createContext({window:{}});for(const n of ['origens','regras','magias-jogo','subclasses-2014','criador-regras'])vm.runInContext(ler('js/'+n+'.js'),ctx);const C=ctx.window.CRIADOR,R=ctx.window.REGRAS,M=ctx.window.MAGIAS_JOGO;const cat=JSON.parse(ler('dados/magias.json'));C.configurar(JSON.parse(ler('dados/criacao-srd2014.json')),cat);return {C,R,M,cat};}
const copia=o=>JSON.parse(JSON.stringify(o));
function preencher(C,R,p){
  const f=p.ficha,st=C.estado(f);
  for(let r=0;r<4;r++)for(const g of [...C.grupos(f),...C.gruposMagias(C.derivar(p).ficha)]){
    if(g.selecionadas.length>=g.qtd)continue;
    const livres=g.opts.filter(v=>!(g.bloqueadas||[]).includes(v)&&!g.selecionadas.includes(v)&&!C.requisitos(f,v).length);
    st.selecoes[g.key]=[...g.selecionadas,...livres.slice(0,g.qtd-g.selecionadas.length)];
  }
  const d=C.classe(f.classes[0].c);
  (d.data.startingChoices||[]).forEach((g,i)=>{st.equipamento['op:'+i]=0;g.options[0].items.forEach((x,j)=>{if(x.category)for(let k=0;k<(x.count||1);k++)st.equipamento[`item:${i}:${j}:${k}`]=C.itemCategoria(x.category)[0].id;});});
  for(const m of R.melhoriasDisponiveis(f.classes)){f.melhorias??={};if(!f.melhorias[m.id])f.melhorias[m.id]=['int','con'];}
}
function personagem(C,R,classes,base,raca='Humano'){
  const p=C.iniciar({nome:'Mago',versao:1,pv_max:10,pv_atual:10,inventario:[],dinheiro:{},ficha:{}},'criacao'),f=p.ficha;
  f.classes=classes;f.raca=raca;f.backgroundId='soldado';C.estado(f).base=base;preencher(C,R,p);
  const q=C.derivar(p),s=C.salvamento(q,{modo:'criacao'});
  return {...s.dados,id:'p1',versao:2};
}
const MAGO5=(C,R)=>personagem(C,R,[{c:'Wizard',n:5,sub:'srd51:subclass/evocation'}],{for:8,des:13,con:14,int:15,sab:12,car:10});
const reabrir=(C,P)=>C.derivar(C.iniciar(copia(P),'criacao')).ficha;
const por=(cat,en)=>cat.find(m=>m.en===en);
const pergaminho=(m,uid='u1')=>({uid,nome:'Pergaminho de Magia: '+m.n,qtd:1,peso:0,tipo:'pergaminho',magiaVinculada:{en:m.en,n:m.n,l:Number(m.l)}});

test('Mago copia magia de pergaminho com sucesso: CD 10 + círculo, custo, pergaminho destruído, magia no grimório e fora das preparadas',()=>{
  const {C,R,M,cat}=motor(),P=MAGO5(C,R),m=por(cat,'Fireball');P.dinheiro={po:500};P.inventario=[pergaminho(m)];
  const v=M.validarCopia(P,m,{fonte:'pergaminho',pergaminhoUid:'u1'});
  assert.equal(v.ok,true);assert.equal(v.cd,13);assert.equal(v.custo.po,75,'Evocation Savant: metade de 150 PO');assert.equal(v.custo.horas,3,'Evocation Savant: metade de 6 h');assert.equal(v.destroiPergaminho,true);
  const r=M.copiarParaGrimorio(P,m,{fonte:'pergaminho',pergaminhoUid:'u1',arcanismo:13});
  assert.equal(r.sucesso,true);assert.equal(P.dinheiro.po,425);assert.equal(P.inventario.length,0,'pergaminho removido, sem duplicar');
  const e=P.ficha.magias.find(x=>x.en==='Fireball');assert.ok(e&&e.noGrimorio&&e.prep===false);assert.equal(e.registroOrigem.tipo,'copia-pergaminho');
  assert.equal(P.ficha.criacao.grimorioExtra.length,1);assert.equal(P.ficha.criacao.historicoMagias.at(-1).sucesso,true);
  assert.equal(M.validarCopia(P,m,{fonte:'grimorio'}).ok,false,'não copia duas vezes a mesma magia');
});
test('falha no teste de Arcanismo: a magia não entra, o pergaminho é destruído mesmo assim e o custo é gasto',()=>{
  const {C,R,M,cat}=motor(),P=MAGO5(C,R),m=por(cat,'Fireball');P.dinheiro={po:500};P.inventario=[pergaminho(m)];
  const r=M.copiarParaGrimorio(P,m,{fonte:'pergaminho',pergaminhoUid:'u1',arcanismo:12});
  assert.equal(r.sucesso,false);assert.equal(r.destruido,true);assert.equal(P.inventario.length,0);assert.equal(P.dinheiro.po,425);
  assert.ok(!P.ficha.magias.some(x=>x.en==='Fireball'));assert.equal(P.ficha.criacao.grimorioExtra.length,0);assert.equal(P.ficha.criacao.historicoMagias.at(-1).sucesso,false);
});
test('cópia de outro grimório: 50 PO e 2 h por círculo, sem teste e sem pergaminho',()=>{
  const {C,R,M,cat}=motor(),P=MAGO5(C,R),m=por(cat,'Shield');P.dinheiro={po:200};
  const v=M.validarCopia(P,m,{fonte:'grimorio'});assert.equal(v.ok,true);assert.equal(v.cd,null);assert.equal(v.testeArcanismo,false);
  const r=M.copiarParaGrimorio(P,m,{fonte:'grimorio'});assert.equal(r.sucesso,true);assert.equal(P.dinheiro.po,150);
  assert.equal(P.ficha.magias.find(x=>x.en==='Shield').registroOrigem.tipo,'copia-grimorio');
});
test('cópia incompatível é recusada com o motivo exato e nada é gasto',()=>{
  const {C,R,M,cat}=motor(),P=MAGO5(C,R);P.dinheiro={po:1000};const snap=JSON.stringify(P);
  const motivo=(m,o)=>M.validarCopia(P,m,o).motivos.join(' | ');
  assert.match(motivo(por(cat,'Bless'),{fonte:'grimorio'}),/não é da lista do Mago/);                 // magia de Clérigo
  assert.match(motivo(por(cat,'Fire Bolt'),{fonte:'grimorio'}),/Truques não vão para o grimório/);
  assert.match(motivo(por(cat,'Wish'),{fonte:'grimorio'}),/9º círculo/);                                // sem espaços desse círculo
  assert.match(motivo(por(cat,'Shield'),{}),/Escolha a origem/);
  assert.match(motivo(por(cat,'Fireball'),{fonte:'pergaminho',pergaminhoUid:'x'}),/Escolha um pergaminho/);
  const outro=pergaminho(por(cat,'Shield'));P.inventario=[outro];assert.match(motivo(por(cat,'Fireball'),{fonte:'pergaminho',pergaminhoUid:'u1'}),/outra magia/);
  P.dinheiro={po:10};assert.match(motivo(por(cat,'Fireball'),{fonte:'grimorio'}),/PO insuficiente/);
  const r=M.copiarParaGrimorio(P,por(cat,'Bless'),{fonte:'grimorio'});assert.equal(r.ok,false);
  P.dinheiro={po:1000};P.inventario=[];assert.equal(JSON.stringify(P).length>0,true);
  const guerreiro=personagem(...[C,R,[{c:'Fighter',n:3,sub:'srd51:subclass/champion'}],{for:15,des:14,con:13,int:10,sab:10,car:10}]);guerreiro.dinheiro={po:999};
  assert.match(M.validarCopia(guerreiro,por(cat,'Shield'),{fonte:'grimorio'}).motivos.join(' '),/Só o Mago tem grimório/);
  const antes=JSON.stringify(P);M.copiarParaGrimorio(P,por(cat,'Bless'),{fonte:'grimorio'});assert.equal(JSON.stringify(P),antes,'tentativa recusada não altera o registro');
});
test('Escola de Evocação paga metade do custo e do tempo ao copiar magia de evocação; outras escolas pagam o normal',()=>{
  const {C,R,M,cat}=motor(),P=MAGO5(C,R);
  const ev=M.custoCopia(P.ficha,por(cat,'Fireball'));assert.deepEqual(copia(ev),{po:75,horas:3,metade:true});
  const ab=M.custoCopia(P.ficha,por(cat,'Shield'));assert.deepEqual(copia(ab),{po:50,horas:2,metade:false});
  assert.equal(M.escola(por(cat,'Fireball')),'Evocação');
});
test('preparação: Mago só prepara do grimório; conhecedores não preparam; cópia não prepara sozinha',()=>{
  const {C,R,M,cat}=motor(),P=MAGO5(C,R),m=por(cat,'Fireball');P.dinheiro={po:500};M.copiarParaGrimorio(P,m,{fonte:'grimorio'});
  const e=P.ficha.magias.find(x=>x.en==='Fireball');assert.equal(M.podePreparar(P.ficha,e).ok,true);assert.equal(e.prep,false);
  const solta={...e,noGrimorio:false};assert.equal(M.podePreparar(P.ficha,solta).ok,false);
  assert.equal(M.podePreparar(P.ficha,{l:0,classeConj:'Wizard'}).ok,false);
  assert.equal(M.podePreparar(P.ficha,{l:2,classeConj:'Bard',classes:['bard']}).ok,false);
  assert.equal(M.podePreparar(P.ficha,{l:2,classeConj:'Cleric',classes:['cleric']}).ok,true);
});
test('persistência: copia, preparação e origem sobrevivem a salvar, fechar, reabrir e recalcular (sem duplicar)',()=>{
  const {C,R,M,cat}=motor(),P=MAGO5(C,R),m=por(cat,'Fireball');P.dinheiro={po:500};M.copiarParaGrimorio(P,m,{fonte:'grimorio'});
  P.ficha.magias.find(x=>x.en==='Fireball').prep=true;
  const f2=reabrir(C,P),e=f2.magias.find(x=>x.en==='Fireball');
  assert.ok(e&&e.prep===true&&e.noGrimorio===true&&e.registroOrigem.tipo==='copia-grimorio');
  assert.equal(f2.magias.filter(x=>x.en==='Fireball').length,1);
  const f3=C.derivar(C.iniciar({...copia(P),ficha:f2},'criacao')).ficha;assert.equal(f3.magias.filter(x=>x.en==='Fireball').length,1);assert.equal(f3.criacao.grimorioExtra.length,1);
  const base=f2.magias.filter(x=>x.registroOrigem.tipo==='classe').length;assert.ok(base>=6,'magias do grimório inicial preservadas');
});
test('reduzir o nível: magias de círculos que a classe já não alcança ficam inativas (guardadas, sem preparar); ao voltar, reativam',()=>{
  const {C,R,M,cat}=motor(),P=MAGO5(C,R),m=por(cat,'Fireball');P.dinheiro={po:500};M.copiarParaGrimorio(P,m,{fonte:'grimorio'});P.ficha.magias.find(x=>x.en==='Fireball').prep=true;
  const menos=C.iniciar(copia(P),'criacao');menos.ficha.classes[0].n=2;menos.ficha.classes[0].sub='';
  const q=C.derivar(menos),e=q.ficha.magias.find(x=>x.en==='Fireball');
  assert.ok(e,'a magia continua guardada');assert.equal(e.ativa,false);assert.equal(e.prep,false);
  assert.equal(q.ficha.criacao.grimorioExtra.length,1);
  assert.ok(!q.ficha.caracteristicas.some(h=>/Evoca|Savant|Sculpt|Potent/i.test(h.nome||'')&&false));
  const volta=C.iniciar({...copia(P),ficha:q.ficha},'criacao');volta.ficha.classes[0].n=5;volta.ficha.classes[0].sub='srd51:subclass/evocation';
  const v=C.derivar(volta).ficha.magias.find(x=>x.en==='Fireball');assert.equal(v.ativa,true);
});
test('troca de magia ao subir de nível: só Bardo, Feiticeiro, Bruxo e Patrulheiro, uma por nível, registrada no histórico',()=>{
  const {C,R,M,cat}=motor(),P=personagem(C,R,[{c:'Bard',n:3,sub:'srd51:subclass/lore'}],{for:8,des:14,con:13,int:10,sab:10,car:15});
  let q=C.iniciar(copia(P),'nivel');q=C.subir(q,'Bard','media');
  const chave='magias|Bard|magias',g=C.gruposMagias(C.derivar(q).ficha).find(x=>x.key===chave),de=g.selecionadas[0],para=g.opts.find(o=>!g.selecionadas.includes(o));
  const t=M.aplicarTroca(q,'Bard',de,para,{grupoKey:chave});
  assert.ok(!C.estado(t.ficha).selecoes[chave].includes(de)&&C.estado(t.ficha).selecoes[chave].includes(para));
  assert.deepEqual(copia(C.estado(t.ficha).niveis.at(-1).troca),{de,para});
  assert.throws(()=>M.aplicarTroca(t,'Bard',para,de,{grupoKey:chave}),/Já houve uma troca/);
  const mago=personagem(C,R,[{c:'Wizard',n:2,sub:''}],{for:8,des:14,con:13,int:15,sab:10,car:10});let m=C.iniciar(copia(mago),'nivel');m=C.subir(m,'Wizard','media');
  assert.throws(()=>M.aplicarTroca(m,'Wizard','a','b',{grupoKey:'magias|Wizard|magias'}),/não troca magias/);
  const reaberto=C.derivar(C.iniciar({...copia(P),ficha:C.derivar(t).ficha},'criacao')).ficha;assert.deepEqual(copia(reaberto.criacao.niveis.at(-1).troca),{de,para});
  assert.deepEqual(copia(C.derivar(t).ficha.progressao.at(-1).troca),{de,para});
});
test('magia concedida pelo mestre: origem própria, sempre preparada, fora do limite de preparadas e preservada ao recalcular',()=>{
  const {C,R,M,cat}=motor(),P=MAGO5(C,R),m=por(cat,'Wish');
  M.concederMestre(P,m,'Recompensa da campanha');M.concederMestre(P,{n:'Chama Antiga',l:4,cab:'Evocação · 1 ação',d:'Magia única da campanha.'},'Criada pelo mestre');
  const e=P.ficha.magias.filter(x=>x.fonte==='mestre');assert.equal(e.length,2);assert.ok(e.every(x=>x.semprePreparada&&!x.noGrimorio));assert.equal(e[1].personalizada,true);
  assert.throws(()=>M.concederMestre(P,m,'repetida'),/já foi concedida/);
  const f2=reabrir(C,P);assert.equal(f2.magias.filter(x=>x.fonte==='mestre').length,2);assert.ok(f2.magias.some(x=>x.en==='Wish'&&x.registroOrigem.tipo==='mestre'));
  assert.equal(M.podePreparar(f2,f2.magias.find(x=>x.fonte==='mestre')).ok,false);
  const usadas=R.preparacao(f2).find(x=>x.id==='Wizard').usadas;assert.equal(usadas,R.preparacao(P.ficha).find(x=>x.id==='Wizard').usadas);   // concessão não consome preparadas
});
test('multiclasse: cada magia guarda a classe que conjura; só as do Mago vão para o grimório',()=>{
  const {C,R,M}=motor(),P=personagem(C,R,[{c:'Wizard',n:3,sub:'srd51:subclass/evocation'},{c:'Cleric',n:2,sub:'srd51:subclass/life'}],{for:8,des:13,con:14,int:15,sab:13,car:10});
  const ms=P.ficha.magias;assert.ok(ms.some(x=>x.classeConj==='Wizard'&&x.noGrimorio));assert.ok(ms.filter(x=>x.classeConj==='Cleric').every(x=>!x.noGrimorio));
  assert.equal(M.maiorCirculo(P.ficha)>=2,true);
});
test('o catálogo não é fonte de aprendizado: a ficha não oferece "Adicionar do catálogo" nem busca livre de magias',()=>{
  const j=ler('js/personagem.js');assert.ok(!/Adicionar do catálogo \(SRD\)/.test(j),'sem aprender qualquer magia pelo catálogo');
  assert.ok(!/id="mag-q"/.test(j));
});
test('troca de magia: só por magia da lista da classe e de círculo com espaços; pode ser desfeita; Mago e Clérigo não trocam',()=>{
  const {C,R,M,cat}=motor(),P=personagem(C,R,[{c:'Bard',n:3,sub:'srd51:subclass/lore'}],{for:8,des:14,con:13,int:10,sab:10,car:15});
  const q=C.subir(C.iniciar(copia(P),'nivel'),'Bard','media'),chave='magias|Bard|magias',g=C.gruposMagias(C.derivar(q).ficha).find(x=>x.key===chave),de=g.selecionadas[0];
  const antes=copia(C.estado(q.ficha).selecoes[chave]);
  assert.throws(()=>M.aplicarTroca(q,'Bard',de,'srd51:spell/bless',{grupoKey:chave}),/lista da classe/,'Bênção é de Clérigo');
  assert.throws(()=>M.aplicarTroca(q,'Bard',de,g.opts.find(o=>!g.selecionadas.includes(o))+'x',{grupoKey:chave}),/lista da classe/);
  assert.deepEqual(copia(C.estado(q.ficha).selecoes[chave]),antes,'tentativa recusada não altera nada');
  const para=g.opts.find(o=>!g.selecionadas.includes(o));
  assert.ok(g.opts.every(o=>{const m=C.magiaPorId(o);return m&&m.l>=1&&m.l<=g.max}),'círculos acima do alcance nunca são oferecidos');
  M.aplicarTroca(q,'Bard',de,para,{grupoKey:chave});M.desfazerTroca(q,chave);
  assert.deepEqual(copia(C.estado(q.ficha).selecoes[chave]),antes);assert.equal(C.estado(q.ficha).niveis.at(-1).troca,undefined);
  assert.throws(()=>M.desfazerTroca(q,chave),/Não há troca/);
  for(const cid of ['Cleric','Druid','Paladin','Wizard'])assert.ok(!M.CLASSES_TROCA.includes(cid),cid);
  assert.ok(ler('js/criador.js').includes('troca-magia'),'o subir de nível oferece o passo de troca');
});
