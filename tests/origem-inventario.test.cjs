/* Origem dos equipamentos (criador e inventário), edição pelo mestre, lotes agrupados e transferências com histórico. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {vm,ler,root}=require('./helpers.cjs');
function amb(){
  const ctx=vm.createContext({window:{},console});
  for(const n of ['origens','regras','magias-jogo','subclasses-2014','inventario','catalogo-itens','equipamento-ficha','inventario-imagens','inventario-resumo','criador-regras'])vm.runInContext(ler('js/'+n+'.js'),ctx);
  const W=ctx.window;W.CAT_ITENS.indexar(JSON.parse(ler('dados/itens-srd2014.json')).itens);
  W.CRIADOR.configurar(JSON.parse(ler('dados/criacao-srd2014.json')),JSON.parse(ler('dados/magias.json')));
  return {W,C:W.CAT_ITENS,I:W.INVENTARIO,E:W.EQUIP_FICHA,CR:W.CRIADOR,R:W.REGRAS,ctx};
}
const J=o=>JSON.parse(JSON.stringify(o));
const item=(A,id,qtd,origem)=>A.C.paraInventario(A.C.obter(id),qtd,origem);
function criar(A,classe,bg,escolhas={}){
  const p=A.CR.iniciar({nome:'Pedro',versao:1,pv_max:10,pv_atual:10,inventario:[],dinheiro:{},ficha:{}},'criacao');
  p.ficha.classes=[{c:classe,n:1,sub:''}];p.ficha.raca='Humano';p.ficha.backgroundId=bg;
  const d=A.CR.classe(classe).data;
  d.startingChoices.forEach((g,i)=>{const j=escolhas[i]??0;p.ficha.criacao.equipamento['op:'+i]=j;g.options[j].items.forEach((x,k)=>{if(x.category)for(let n=0;n<(x.count||1);n++)p.ficha.criacao.equipamento[`item:${i}:${k}:${n}`]=A.CR.itemCategoria(x.category)[0].id;});});
  return p;
}
const origens=(A,p)=>A.CR.equipamento(p).itens.map(i=>[i.nome,i.origem.texto]);

/* ---------- Origem no criador ---------- */
test('criador: Bárbaro com Herói do povo mostra a origem de cada equipamento a partir dos dados reais',()=>{
  const A=amb(),p=criar(A,'Barbarian','heroi');
  const g=A.CR.grupos(p.ficha).find(g=>g.key==='background|ferramentas');assert.ok(g,'o antecedente pede ferramentas');
  p.ficha.criacao.selecoes['background|ferramentas']=[g.opts[0]];
  const eq=A.CR.equipamento(p),por=n=>eq.itens.filter(i=>i.origem.texto===n);
  assert.ok(eq.itens.every(i=>i.origem.texto),'todo item tem origem: '+eq.itens.filter(i=>!i.origem.texto).map(i=>i.nome));
  const jav=eq.itens.find(i=>i.catId==='srd51:item/javelin');assert.equal(jav.qtd,4);assert.equal(jav.origem.texto,'Equipamento inicial da classe Bárbaro');
  assert.ok(por('Escolha de equipamento da classe · Grupo 1').length>=1);assert.ok(por('Escolha de equipamento da classe · Grupo 2').length>=1);
  const pacote=eq.itens.filter(i=>i.origem.pacote);assert.ok(pacote.length>=8);
  for(const i of pacote)assert.equal(i.origem.texto,'Componente do Pacote de Explorador');
  assert.deepEqual([...new Set(pacote.map(i=>i.origem.pacote.nome))].map(x=>x),['Pacote de Explorador']);
  const bg=eq.itens.filter(i=>/antecedente Herói do povo/.test(i.origem.texto));assert.ok(bg.length>=4);
  assert.ok(bg.some(i=>/^Equipamento do antecedente/.test(i.origem.texto)&&i.nome==='Pá'),'equipamento fixo do antecedente');
  assert.equal(por('Escolha de ferramentas do antecedente Herói do povo').length,1,'a ferramenta escolhida');
  assert.equal(eq.ouroOrigem,'Dinheiro inicial do antecedente Herói do povo');assert.equal(eq.ouro,10);
});

test('criador: a origem funciona para todas as classes e antecedentes e muda junto com as escolhas',()=>{
  const A=amb();let n=0;
  for(const cls of A.CR.dados.classes){const c=cls.id.split('/').pop().replace(/^./,m=>m.toUpperCase());
    for(const bg of window_bgs(A)){const p=criar(A,c,bg);const g=A.CR.grupos(p.ficha).find(x=>x.key==='background|ferramentas');if(g)p.ficha.criacao.selecoes['background|ferramentas']=g.opts.slice(0,g.qtd);
      const eq=A.CR.equipamento(p);n++;
      for(const i of eq.itens)assert.ok(i.origem.texto&&/(classe|Pacote|antecedente)/.test(i.origem.texto),c+' '+bg+' '+i.nome+': '+i.origem.texto);
      assert.equal(eq.itens.filter(i=>i.origem.tipo!=='criacao').length,0);
    }}
  assert.ok(n>=100,'combinações: '+n);
});
function window_bgs(A){return A.W.ORIGENS.map(b=>b.id).filter(id=>id!=='personalizado');}

test('criador: trocar a escolha de equipamento atualiza a origem na hora',()=>{
  const A=amb(),p=criar(A,'Barbarian','heroi');
  const antes=origens(A,p);
  A.CR.estado(p.ficha).equipamento['op:0']=1;   // outra alternativa do grupo 1
  p.ficha.criacao.equipamento['item:0:0:0']=A.CR.itemCategoria('martial-melee-weapons')[2].id;
  const eq=A.CR.equipamento(p),g1=eq.itens.filter(i=>i.origem.texto==='Escolha de equipamento da classe · Grupo 1');
  assert.ok(g1.length>=1);assert.notEqual(JSON.stringify(antes),JSON.stringify(origens(A,p)));
  assert.ok(g1.every(i=>i.origem.id.startsWith('classe:g0')),'o id técnico segue o grupo');
  A.CR.estado(p.ficha).equipamento['op:1']=1;p.ficha.criacao.equipamento['item:1:0:0']=A.CR.itemCategoria('simple-weapons')[0].id;const eq2=A.CR.equipamento(p);assert.ok(eq2.itens.some(i=>i.origem.texto==='Escolha de equipamento da classe · Grupo 2'));
});

test('criador: a interface lista "Origem" por item e a do dinheiro, sem virar item de inventário',()=>{
  const src=ler('js/criador.js');
  assert.ok(src.includes('Origem: ${esc(i.origem.texto)}'));assert.ok(src.includes('Origem: ${esc(e.ouroOrigem)}'));
  const A=amb(),p=criar(A,'Monk','eremita'),s=A.CR.salvamento(A.CR.derivar(p),{modo:'criacao',original:p});
  assert.ok(!s.dados.inventario.some(i=>/Dinheiro/.test(i.nome||'')),'moedas não viram item');assert.equal(s.dados.dinheiro.po,5);
});

test('persistência: a origem sobrevive a salvar e reabrir, e a entrega não duplica nem perde o id técnico',()=>{
  const A=amb(),p=criar(A,'Monk','eremita'),s=A.CR.salvamento(A.CR.derivar(p),{modo:'criacao',original:p}),inv=s.dados.inventario;
  const dardo=inv.find(i=>i.catId==='srd51:item/dart');
  assert.equal(dardo.origem.texto,'Equipamento inicial da classe Monge');assert.match(dardo.origem.id,/^classe:fixo:/);assert.equal(dardo.origem.tipo,'criacao');
  const volta=J(inv);assert.equal(A.I.origemTexto(volta.find(i=>i.catId==='srd51:item/dart')),'Equipamento inicial da classe Monge');
  const salvo={nome:'Pedro',versao:2,pv_max:10,pv_atual:10,inventario:inv,dinheiro:s.dados.dinheiro,ficha:s.dados.ficha};
  const e=A.CR.salvamento(A.CR.derivar(A.CR.iniciar(J(salvo),'criacao')),{modo:'criacao',original:salvo});assert.equal(e.dados.inventario.length,inv.length,'sem duplicar');
});

test('origem deduzida de registros antigos (sem texto) e texto vazio = limpo de propósito',()=>{
  const A=amb(),I=A.I;
  assert.equal(I.origemTexto({origem:{tipo:'criacao',nota:'Criação — Equipamento de Monge'}}),'Equipamento inicial da classe Monge');
  assert.equal(I.origemTexto({origem:{tipo:'criacao',nota:'Criação — Origem Eremita'}}),'Equipamento do antecedente Eremita');
  assert.equal(I.origemTexto({origem:{tipo:'criacao',nota:'Criação — Pacote de Explorador'}}),'Componente do Pacote de Explorador');
  assert.equal(I.origemTexto({origem:{tipo:'jogo',nota:'Pacote de Explorador',pacote:{id:'x',nome:'Pacote de Explorador'}}}),'Componente do Pacote de Explorador');
  assert.equal(I.origemTexto({origem:{tipo:'mestre'}}),'Mestre');assert.equal(I.origemTexto({origem:{tipo:'inicial'}}),'');assert.equal(I.origemTexto({}),'');
  assert.equal(I.origemTexto({origem:{tipo:'mestre',texto:''}}),'','limpar mostra nada');
});

/* ---------- Edição pelo mestre ---------- */
test('editar a origem altera só o texto: nome, quantidade, peso, propriedades, id técnico e vínculos ficam',()=>{
  const A=amb(),it=item(A,'srd51:item/dagger',2,{tipo:'criacao',id:'classe:g1:srd51:item/dagger',nota:'Criação — Equipamento de Ladino',texto:'Equipamento inicial da classe Ladino'});
  it.propriedades={raridade:'raro',bonus:1};it.equipado=true;it.transferencias=[{quando:'2026-11-01T10:00:00.000Z',tipo:'transferencia',de:{nome:'A'},para:{nome:'B'},qtd:1}];
  const antes=J(it);A.I.definirOrigemTexto(it,'  Recompensa   de missão ');
  assert.equal(it.origem.texto,'Recompensa de missão');
  const depois=J(it);delete depois.origem.texto;const ref=J(antes);delete ref.origem.texto;
  assert.equal(JSON.stringify(depois),JSON.stringify(ref),'nada além do texto mudou (inclui id técnico, transferências e equipado)');
  A.I.definirOrigemTexto(it,'');assert.equal(it.origem.texto,'');assert.equal(A.I.origemTexto(it),'');assert.equal(it.origem.id,'classe:g1:srd51:item/dagger');
  A.I.definirOrigemTexto(it,'x'.repeat(500));assert.equal(it.origem.texto.length,120);
  const sem=A.I.novoItem({nome:'Corda',qtd:1});delete sem.origem;A.I.definirOrigemTexto(sem,'Presente de um NPC');assert.equal(sem.origem.tipo,'inicial');assert.equal(sem.origem.texto,'Presente de um NPC');
  assert.throws(()=>A.I.definirOrigemTexto(null,'x'),/não encontrado/);
});

test('permissões: jogador e mestre editam a Origem da ficha que controlam; a visão somente leitura do grupo não; o banco não restringe a Origem',()=>{
  const src=ler('js/personagem.js');
  assert.ok(src.includes('!soLeitura ? `<span class="inv-origem-campo"><input data-lote-origem'),'detalhes: campo editável para quem edita a ficha (dono ou mestre)');
  assert.ok(src.includes('!soLeitura ? `<label class="inv-c-nome">Origem<span class="inv-origem-campo"><input data-inv-origem'),'painel de edição idem');
  assert.ok(src.includes('if (soLeitura) return;   // visão somente leitura do grupo'),'o tratador só recusa na visão somente leitura');
  assert.ok(!/Somente o mestre pode alterar a origem/.test(src)&&!/souMestre \? `<input data-lote-origem/.test(src),'sem restrição de mestre na interface');
  assert.ok(!fs.existsSync(path.join(root,'supabase/migrations/20261114120000_proteger_origem_item.sql')),'a migração que bloqueava a Origem foi removida (nunca aplicada)');
  assert.ok(!fs.existsSync(path.join(root,'supabase/rollback/origem-item.sql')));
  /* o gatilho existente só protege propriedades/efeitos do item e concessões; nada sobre origem nem nome */
  const trig=ler('supabase/migrations/20261112171652_proteger_campos_mestre.sql');
  const semComentario=trig.split(String.fromCharCode(10)).map(l=>l.replace(/--.*$/,'')).join(String.fromCharCode(10));
  assert.ok(!/item->'origem'|item#>[^;]*origem|transferencias|item->'nome'/.test(semComentario),'o banco não impede o jogador de editar a Origem nem o nome do item');
});

test('o jogador altera a Origem do próprio item sem tocar nos dados técnicos, e o histórico de transferências não tem edição',()=>{
  const A=amb(),it=item(A,'srd51:item/longsword',1,{tipo:'criacao',id:'classe:g0:srd51:item/longsword',nota:'Criação — Equipamento de Guerreiro',texto:'Equipamento inicial da classe Guerreiro'});
  it.propriedades={raridade:'Incomum'};it.transferencias=[{quando:'2026-11-01T10:00:00.000Z',tipo:'transferencia',de:{nome:'A'},para:{nome:'B'},qtd:1}];
  const antes=J(it);A.I.definirOrigemTexto(it,'Recompensa da missão em Julkoun');
  assert.equal(A.I.origemTexto(it),'Recompensa da missão em Julkoun');
  assert.equal(it.origem.id,antes.origem.id);assert.equal(it.origem.tipo,'criacao');assert.equal(it.origem.nota,antes.origem.nota);
  for(const k of ['uid','nome','qtd','peso','propriedades','catId','ref','equipado','transferencias'])assert.equal(JSON.stringify(it[k]),JSON.stringify(antes[k]),k);
  A.I.definirOrigemTexto(it,'');assert.equal(A.I.origemTexto(it),'','limpar');A.I.definirOrigemTexto(it,'Presente de Aldren Thorne');assert.equal(A.I.origemTexto(it),'Presente de Aldren Thorne');
  const src=ler('js/personagem.js');assert.ok(!/data-[a-z-]*(hist|transfer)[a-z-]*=.*<input|<input[^>]*transferencias/.test(src),'nenhum campo edita o histórico');
});

test('adicionar manualmente: a Origem informada vira o texto do registro, para catálogo, pacote, item em branco, lista rápida, efeitos e pergaminho',()=>{
  const src=ler('js/personagem.js');
  assert.ok(src.includes('id="add-origem"')&&src.includes('placeholder="Ex.: Recompensa da missão em Julkoun"'));
  assert.ok(src.includes('origem = origemAdd({ tipo: souMestre ? "mestre" : "jogo" })'),'catálogo e pacotes');
  assert.ok(src.includes('IV.novoItem({ nome: "", qtd: 1, peso: 0, origem: origemAdd({ tipo: "jogo" }) })'),'item em branco');
  assert.ok(src.includes('origem: origemAdd({ tipo: "jogo" }) })'),'lista rápida');
  assert.ok(src.includes('IE.itemDoCatalogo(k, origemAdd('),'item com efeitos');assert.ok(src.includes('origem: origemAdd({ tipo: souMestre ? "mestre" : "jogo", nota: $("#pg-nota")'),'pergaminho');
  /* a mesma montagem em dados: o texto acompanha o registro e os ids técnicos do catálogo e do pacote ficam */
  const A=amb(),origem={tipo:'jogo',texto:'Comprado em Daggerford'};
  const c={dono:{},itens:[],movimentos:[]};
  A.I.adicionar(c,A.C.paraInventario(A.C.obter('srd51:item/longsword'),1,origem),{tipo:'entrada'});
  for(const x of A.C.paraInventarioPacote(A.C.obter('srd51:item/explorers-pack'),1,origem))A.I.adicionar(c,x,{tipo:'entrada'});
  const esp=c.itens.find(i=>i.catId==='srd51:item/longsword');assert.equal(A.I.origemTexto(esp),'Comprado em Daggerford');assert.equal(esp.ref,'srd51:item/longsword');
  const tocha=c.itens.find(i=>i.catId==='srd51:item/torch');assert.equal(A.I.origemTexto(tocha),'Comprado em Daggerford');assert.equal(tocha.origem.pacote.id,'srd51:item/explorers-pack');assert.equal(tocha.origem.id,'pacote:srd51:item/explorers-pack','id técnico do pacote preservado');
  /* o mesmo item sem texto e com texto são registros distintos (agrupam só na tela) */
  A.I.adicionar(c,A.C.paraInventario(A.C.obter('srd51:item/longsword'),1,{tipo:'jogo'}),{tipo:'entrada'});
  assert.equal(c.itens.filter(i=>i.catId==='srd51:item/longsword').length,2);
});

/* ---------- Nome personalizado ---------- */
test('nome personalizado: só o rótulo muda; catId, mecânica, ataque e peso continuam; restaurar volta ao nome do catálogo',()=>{
  const A=amb(),P={id:'p1',nome:'Aldric',inventario:[],ficha:{classes:[{c:'Fighter',n:1}],equip:{armadura:'',escudo:false,bonus:0},ataques:[]}};
  const e=item(A,'srd51:item/longsword',1,{tipo:'jogo',texto:'Recompensa da missão em Julkoun'});P.inventario.push(e);
  const catNome=A.C.obter('srd51:item/longsword').nome;assert.equal(catNome,'Espada longa');
  A.E.equipar(P,e.uid);const dano0=J(P.ficha.ataques[0]);
  e.nome='Espada de Aldren';A.E.reconciliar(P);
  assert.equal(A.C.obter('srd51:item/longsword').nome,'Espada longa','o catálogo global não muda');
  assert.equal(e.catId,'srd51:item/longsword');assert.equal(e.ref,'srd51:item/longsword');assert.equal(A.C.doInventario(e).nome,'Espada longa','continua vinculado ao catálogo');
  assert.equal(P.ficha.ataques[0].nome,'Espada de Aldren');
  for(const k of ['dado','tipo','atr','prof','armaId','itemUid','magico','extra'])assert.equal(P.ficha.ataques[0][k],dano0[k],'ataque: '+k);
  assert.equal(A.W.INV_RESUMO.mecanico(e,A.C.doInventario(e),[]),'1d8 cortante · Versátil (1d10)','a mecânica vem do catálogo, não do nome');
  assert.equal(A.I.origemTexto(e),'Recompensa da missão em Julkoun');
  /* restaurar: o nome volta ao do catálogo (função do inventário), sem mexer no resto */
  const src=ler('js/personagem.js');assert.ok(src.includes('Restaurar nome do catálogo')&&src.includes('function restaurarNomeCatalogo'));assert.ok(src.includes('data-inv-nome-restaurar')&&src.includes('data-det-restaurar'));
  e.nome=A.C.doInventario(e).nome;A.E.reconciliar(P);assert.equal(P.ficha.ataques[0].nome,'Espada longa');assert.equal(e.catId,'srd51:item/longsword');
  assert.ok(src.includes('["Item do catálogo", cat.nome'),'detalhes: o item do catálogo continua identificável');
});

test('nomes personalizados: não agrupam entre si, a separação de pilha e a transferência levam o nome',()=>{
  const A=amb(),mk=(id,nome)=>({id,nome,inventario:[],ficha:{classes:[{c:'Rogue',n:1}],equip:{armadura:'',escudo:false,bonus:0},ataques:[]}});
  const a=mk('a','Pedro'),b=mk('b','Lydia'),d1=item(A,'srd51:item/dagger',3,{tipo:'jogo'}),d2=item(A,'srd51:item/dagger',2,{tipo:'jogo',id:'x'});
  d1.nome='Presa de Aldren';a.inventario.push(d1,d2);
  assert.equal(A.I.agrupar(a.inventario).size,0,'mesmo item do catálogo com nomes diferentes não agrupa');
  d2.nome='Presa de Aldren';A.I.definirOrigemTexto(d2,'Presente de um NPC');assert.equal(A.I.agrupar(a.inventario).size,2,'mesmo nome personalizado agrupa (origens distintas seguem separadas)');
  const eq=A.E.equipar(a,d1.uid);assert.equal(eq.nome,'Presa de Aldren','a unidade separada para equipar leva o nome');assert.equal(eq.catId,'srd51:item/dagger');
  const novo=A.E.transferir(a,b,d2.uid,1,{});assert.equal(novo.nome,'Presa de Aldren');assert.equal(novo.catId,'srd51:item/dagger');assert.equal(A.I.origemTexto(novo),'Presente de um NPC');
  assert.equal(novo.transferencias.length,1);
  /* persistência: gravar e reabrir mantém nome, vínculo e origem */
  const volta=J(b.inventario[0]);assert.equal(volta.nome,'Presa de Aldren');assert.equal(A.C.doInventario(volta).nome,'Adaga');
});

/* ---------- Origem neutra e itens mágicos ---------- */
test('a Origem é sempre neutra: nenhuma cor nem classe por categoria; raridade e efeitos continuam à frente',()=>{
  const css=ler('css/fichas.css'),bloco=css.slice(css.indexOf('Inventário: resumo mecânico'));
  assert.ok(!/color\s*:/.test(bloco),'o bloco da lista não define nenhuma cor');
  assert.ok(!/\.inv-origem-(?!campo|modelo)|\.origem-(classe|pacote|antecedente|compra|mestre)|border-left|background/.test(bloco),'nada colore o cartão pela origem');
  const fonte=ler('js/personagem.js');
  assert.ok(fonte.includes('class="inv-origem muted"'),'texto secundário da paleta (muted)');
  assert.ok(!/inv-origem[^"]*\$\{/.test(fonte),'a classe da Origem não varia com a categoria');
  /* raridade e efeitos entram no resumo mecânico (negrito), antes da origem na ordem de leitura */
  const A=amb(),RS=A.W.INV_RESUMO,m=RS.mecanico({propriedades:{raridade:'Raro',cargas:{atual:2,max:3},bonus:1}},A.C.obter('srd51:item/longsword'),['Recupera 2d4+2 pontos de vida']);
  assert.match(m,/\+1/);assert.match(m,/Recupera 2d4\+2/);assert.match(m,/Cargas 2\/3/);assert.ok(!/Raro/.test(m),'a raridade tem elemento próprio (não fica no fim da linha, onde as reticências a cortariam)');assert.ok(fonte.includes('class="muted inv-raridade"')&&fonte.includes('CAT().RARIDADES[catR.raridade]'),'raridade do catálogo na lista e na grade');
  assert.ok(fonte.indexOf('class="inv-mec"')<fonte.indexOf('class="inv-origem muted"'),'a mecânica vem antes da Origem');
  assert.ok(ler('css/itens.css').includes('.inv-selo'),'o selo existente (detalhes/catálogo) foi preservado');
});

/* ---------- Agrupamento e lotes ---------- */
test('lotes agrupados: editar a origem de um lote não muda os outros; uids e quantidades ficam',()=>{
  const A=amb(),c={dono:{},itens:[],movimentos:[]};
  for(const x of A.C.paraInventarioPacote(A.C.obter('srd51:item/explorers-pack'),1,{tipo:'jogo'}))A.I.adicionar(c,x,{tipo:'entrada'});
  A.I.adicionar(c,item(A,'srd51:item/rations-1-day',5,{tipo:'compra',id:'compra:1',nota:'Daggerford'}),{tipo:'compra'});
  const racoes=c.itens.filter(i=>i.catId==='srd51:item/rations-1-day'),g=A.I.agrupar(c.itens).get(racoes[0].uid),uids=racoes.map(r=>r.uid);
  assert.equal(racoes.length,2);assert.equal(A.I.totalDe(g.membros),15);
  assert.equal(A.I.origemTexto(racoes[0]),'Componente do Pacote de Explorador');assert.equal(A.I.origemTexto(racoes[1]),'Compra: Daggerford');
  A.I.definirOrigemTexto(racoes[1],'Compradas em Daggerford');
  assert.equal(A.I.origemTexto(racoes[0]),'Componente do Pacote de Explorador','o outro lote não mudou');assert.equal(A.I.origemTexto(racoes[1]),'Compradas em Daggerford');
  assert.equal(JSON.stringify(racoes.map(r=>r.uid)),JSON.stringify(uids));assert.equal(JSON.stringify(racoes.map(r=>r.qtd)),'[10,5]');
  assert.equal(A.I.agrupar(c.itens).get(racoes[0].uid).membros.length,2,'continua agrupado visualmente (a origem não entra na identidade)');
  /* origens iguais por texto ainda empilham ao adicionar; textos diferentes não */
  A.I.adicionar(c,item(A,'srd51:item/rations-1-day',1,{tipo:'compra',id:'compra:1',nota:'Daggerford',texto:'Compradas em Daggerford'}),{tipo:'compra'});
  assert.equal(c.itens.filter(i=>i.catId==='srd51:item/rations-1-day').length,2);assert.equal(racoes[1].qtd,6);
});

test('separar uma unidade de uma pilha preserva a origem de cada parte',()=>{
  const A=amb(),P={id:'p',nome:'Pedro',inventario:[],ficha:{classes:[{c:'Rogue',n:1}],equip:{},ataques:[]}};
  const d=item(A,'srd51:item/dagger',3,{tipo:'criacao',id:'x',nota:'Criação — Equipamento de Ladino',texto:'Equipamento inicial da classe Ladino'});P.inventario.push(d);
  const eq=A.E.equipar(P,d.uid);
  assert.equal(A.I.origemTexto(eq),'Equipamento inicial da classe Ladino');assert.equal(A.I.origemTexto(d),'Equipamento inicial da classe Ladino');assert.equal(d.qtd,2);assert.equal(eq.origemUid,d.uid);
});

/* ---------- Transferências ---------- */
function dois(A){
  const mk=(id,nome)=>({id,nome,inventario:[],ficha:{classes:[{c:'Monk',n:1}],equip:{armadura:'',escudo:false,bonus:0},ataques:[]}});
  return {pedro:mk('p1','Pedro'),lydia:mk('p2','Lydia'),tara:mk('p3','Tara')};
}
const total=(P,ref)=>P.inventario.filter(i=>(i.catId||i.ref||i.nome)===ref).reduce((n,i)=>n+i.qtd,0);

test('transferência: Pedro passa o Bastão inicial para Lydia e a origem continua a da criação',()=>{
  const A=amb(),{pedro,lydia}=dois(A);
  const b=item(A,'srd51:item/quarterstaff',1,{tipo:'criacao',id:'classe:g0:c0:srd51:item/quarterstaff',nota:'Criação — Equipamento de Monge',texto:'Equipamento inicial da classe Monge'});
  b.propriedades={};pedro.inventario.push(b);const uidAntigo=b.uid;
  const novo=A.E.transferir(pedro,lydia,b.uid,1,{});
  assert.equal(pedro.inventario.length,0,'saiu do remetente');assert.equal(lydia.inventario.length,1,'sem duplicar');
  assert.equal(A.I.origemTexto(novo),'Equipamento inicial da classe Monge','a origem original foi preservada');assert.equal(novo.origem.tipo,'criacao');assert.equal(novo.origem.id,'classe:g0:c0:srd51:item/quarterstaff');
  assert.equal(novo.uid,uidAntigo);assert.equal(novo.catId,'srd51:item/quarterstaff');assert.equal(novo.equipado,false);
  assert.equal(novo.transferencias.length,1);const t=novo.transferencias[0];
  assert.equal(t.de.nome,'Pedro');assert.equal(t.de.id,'p1');assert.equal(t.para.nome,'Lydia');assert.equal(t.para.id,'p2');assert.equal(t.qtd,1);assert.equal(t.tipo,'transferencia');assert.ok(!Number.isNaN(Date.parse(t.quando)));
  assert.ok(pedro.ficha.movimentos.some(m=>m.tipo==='transferencia-saida'&&m.para.nome==='Lydia'));assert.ok(lydia.ficha.movimentos.some(m=>m.tipo==='transferencia-entrada'&&m.de.nome==='Pedro'));
});

test('transferência parcial de pilha: restante fica com a origem, a parte enviada leva origem e histórico',()=>{
  const A=amb(),{pedro,lydia}=dois(A),d=item(A,'srd51:item/dart',10,{tipo:'criacao',id:'classe:fixo:srd51:item/dart',nota:'Criação — Equipamento de Monge',texto:'Equipamento inicial da classe Monge'});
  pedro.inventario.push(d);const novo=A.E.transferir(pedro,lydia,d.uid,4,{nota:'Para a caçada'});
  assert.equal(d.qtd,6);assert.equal(pedro.inventario.length,1);assert.equal(novo.qtd,4);assert.notEqual(novo.uid,d.uid,'a parte enviada tem uid novo');assert.equal(novo.origemUid,undefined);
  assert.equal(total(pedro,'srd51:item/dart')+total(lydia,'srd51:item/dart'),10,'nenhuma unidade criada ou perdida');
  assert.equal(A.I.origemTexto(d),'Equipamento inicial da classe Monge');assert.equal(A.I.origemTexto(novo),'Equipamento inicial da classe Monge');
  assert.equal(d.transferencias,undefined,'quem ficou com a pilha não ganha histórico');assert.equal(novo.transferencias[0].qtd,4);assert.equal(novo.transferencias[0].nota,'Para a caçada');
  assert.throws(()=>A.E.transferir(pedro,lydia,d.uid,7,{}),/Quantidade inválida/);assert.throws(()=>A.E.transferir(pedro,lydia,'x',1,{}),/não está/);
  assert.equal(total(pedro,'srd51:item/dart'),6,'a falha não mexeu em nada');
});

test('transferências sucessivas preservam a sequência e a origem; o histórico antigo não é inventado',()=>{
  const A=amb(),{pedro,lydia,tara}=dois(A);
  const antigo=item(A,'srd51:item/shortsword',1,{tipo:'criacao',id:'a',nota:'Criação — Equipamento de Monge',texto:'Equipamento inicial da classe Monge'});pedro.inventario.push(antigo);
  assert.equal(antigo.transferencias,undefined,'item que nunca foi transferido não tem histórico');
  A.E.transferir(pedro,lydia,antigo.uid,1,{});const meio=lydia.inventario[0];A.E.transferir(lydia,tara,meio.uid,1,{});const fim=tara.inventario[0];
  assert.equal(fim.transferencias.length,2);assert.equal(JSON.stringify(fim.transferencias.map(t=>[t.de.nome,t.para.nome])),JSON.stringify([['Pedro','Lydia'],['Lydia','Tara']]));
  assert.equal(A.I.origemTexto(fim),'Equipamento inicial da classe Monge');assert.equal(pedro.inventario.length+lydia.inventario.length,0);
  /* persistência e sincronização: o JSON gravado reabre igual, e outro aparelho lê o mesmo histórico */
  const volta=J(tara);assert.equal(JSON.stringify(volta.inventario[0].transferencias),JSON.stringify(fim.transferencias));
  assert.equal(JSON.stringify(A.I.normalizar(volta.inventario)),'false','normalizar não altera nem apaga o histórico');
  assert.equal(volta.inventario[0].transferencias.length,2);
});

test('equipamento personalizado e propriedades/efeitos seguem junto na transferência',()=>{
  const A=amb(),{pedro,lydia}=dois(A);
  const m=A.I.novoItem({nome:'Espada encantada +1',qtd:1,peso:1.5,tipo:'magico',desc:'Concede +1 em ataque e dano.',propriedades:{raridade:'Incomum',bonus:1,cargas:{atual:2,max:3,recarga:'amanhecer'},efeitos:[{tipo:'modificador'}]},origem:{tipo:'mestre',nota:'Recompensa',texto:'Recompensa de missão'}});
  pedro.inventario.push(m);pedro.ficha.imagensItens={[m.uid]:'data:image/png;base64,iVBORw0KGgo='};
  const novo=A.E.transferir(pedro,lydia,m.uid,1,{});
  assert.equal(novo.nome,'Espada encantada +1');assert.equal(novo.peso,1.5);assert.equal(novo.desc,'Concede +1 em ataque e dano.');
  assert.equal(JSON.stringify(novo.propriedades),JSON.stringify({raridade:'Incomum',bonus:1,cargas:{atual:2,max:3,recarga:'amanhecer'},efeitos:[{tipo:'modificador'}]}));
  assert.equal(A.I.origemTexto(novo),'Recompensa de missão');
  assert.equal(lydia.ficha.imagensItens[novo.uid],'data:image/png;base64,iVBORw0KGgo=','a imagem enviada pelo jogador acompanha o item');
});

test('equipamento equipado: ao sair, o remetente perde o vínculo e o destinatário recebe desequipado',()=>{
  const A=amb(),{pedro,lydia}=dois(A);pedro.ficha.classes=[{c:'Fighter',n:1}];
  const esp=item(A,'srd51:item/longsword',1,{tipo:'criacao',id:'e',texto:'Equipamento inicial da classe Guerreiro'}),mal=item(A,'srd51:item/chain-mail',1,{tipo:'jogo'}),esc=item(A,'srd51:item/shield',1,{tipo:'jogo'});
  pedro.inventario.push(esp,mal,esc);for(const i of [esp,mal,esc])A.E.equipar(pedro,i.uid);
  assert.equal(pedro.ficha.ataques.length,1);assert.equal(pedro.ficha.equip.armadura,'malha');
  for(const i of [esp,mal,esc])A.E.transferir(pedro,lydia,i.uid,1,{});
  assert.equal(pedro.ficha.ataques.length,0);assert.equal(pedro.ficha.equip.armadura,'');assert.equal(pedro.ficha.equip.escudo,false);assert.ok(!pedro.ficha.equip.armaduraUid&&!pedro.ficha.equip.escudoUid);
  assert.equal(lydia.inventario.length,3);assert.ok(lydia.inventario.every(i=>i.equipado===false));assert.equal(lydia.ficha.ataques.length,0);assert.ok(!lydia.ficha.equip.armaduraUid);
  assert.equal(A.I.origemTexto(lydia.inventario[0]),'Equipamento inicial da classe Guerreiro');
  /* Lydia pode equipar o que recebeu, com o vínculo dela */
  A.E.equipar(lydia,lydia.inventario[0].uid);assert.equal(lydia.ficha.ataques[0].itemUid,lydia.inventario[0].uid);
});

test('parte de uma pilha equipada: o restante continua ligado ao remetente',()=>{
  const A=amb(),{pedro,lydia}=dois(A);pedro.ficha.classes=[{c:'Rogue',n:1}];
  const d=item(A,'srd51:item/dagger',3,{tipo:'jogo'});pedro.inventario.push(d);const eq=A.E.equipar(pedro,d.uid);
  A.E.transferir(pedro,lydia,d.uid,1,{});
  assert.equal(pedro.ficha.ataques.length,1,'a unidade equipada continua equipada');assert.equal(pedro.ficha.ataques[0].itemUid,eq.uid);
  assert.equal(total(pedro,'srd51:item/dagger')+total(lydia,'srd51:item/dagger'),3);assert.equal(lydia.inventario[0].equipado,false);
  /* transferir a unidade equipada inteira desfaz o vínculo */
  A.E.transferir(pedro,lydia,eq.uid,1,{});assert.equal(pedro.ficha.ataques.length,0);assert.equal(total(lydia,'srd51:item/dagger'),2);
});

test('histórico e origem são informações separadas: editar a origem não apaga transferências e vice-versa',()=>{
  const A=amb(),{pedro,lydia}=dois(A);
  const b=item(A,'srd51:item/quarterstaff',1,{tipo:'criacao',id:'q',texto:'Equipamento inicial da classe Monge'});pedro.inventario.push(b);
  const novo=A.E.transferir(pedro,lydia,b.uid,1,{});const hist=J(novo.transferencias);
  A.I.definirOrigemTexto(novo,'Presente de um NPC');assert.equal(JSON.stringify(novo.transferencias),JSON.stringify(hist));
  const outra=A.E.transferir(lydia,pedro,novo.uid,1,{});assert.equal(A.I.origemTexto(outra),'Presente de um NPC');assert.equal(outra.transferencias.length,2);
});

test('destinatário que já tem item igual: registros ficam separados quando origem ou histórico diferem; o total fecha',()=>{
  const A=amb(),{pedro,lydia}=dois(A);
  lydia.inventario.push(item(A,'srd51:item/dart',5,{tipo:'compra',id:'compra:1',nota:'Daggerford'}));
  pedro.inventario.push(item(A,'srd51:item/dart',10,{tipo:'criacao',id:'classe:fixo:srd51:item/dart',texto:'Equipamento inicial da classe Monge'}));
  A.E.transferir(pedro,lydia,pedro.inventario[0].uid,10,{});
  assert.equal(lydia.inventario.length,2);assert.equal(total(lydia,'srd51:item/dart'),15);
  assert.equal(A.I.agrupar(lydia.inventario).get(lydia.inventario[0].uid).membros.length,2,'agrupados na tela, registros e origens preservados');
  assert.equal(JSON.stringify(lydia.inventario.map(i=>A.I.origemTexto(i))),JSON.stringify(['Compra: Daggerford','Equipamento inicial da classe Monge']));
});

/* ---------- Lista, grade e detalhes ---------- */
test('resumos: arma, arma mágica, item sem descrição e item personalizado usam só dados existentes',()=>{
  const A=amb(),RS=A.W.INV_RESUMO,C=A.C;
  const ge=C.obter('srd51:item/greatsword');
  assert.equal(RS.mecanico({},ge,[]),'2d6 cortante · Pesada · Duas mãos');assert.equal(RS.descricao({},ge),'Arma marcial corpo a corpo: exige as duas mãos para atacar.');
  const el=C.obter('srd51:item/longsword');assert.equal(RS.mecanico({},el,[]),'1d8 cortante · Versátil (1d10)');
  assert.equal(RS.mecanico({propriedades:{bonus:1}},el,[]),'1d8 cortante · Versátil (1d10) · +1');
  assert.equal(RS.descricao({desc:'  Concede +1 nas jogadas   de ataque e dano.  '},el),'Concede +1 nas jogadas de ataque e dano.','a descrição escrita tem prioridade e é compactada');
  assert.equal(RS.mecanico({},C.obter('srd51:item/backpack'),[]),'');assert.equal(RS.descricao({},C.obter('srd51:item/backpack')),'','sem dado, sem linha');
  const custom={nome:'Amuleto estranho',propriedades:{raridade:'Raro',cargas:{atual:1,max:3},efeitos:[{tipo:'condicao'}]}};
  assert.equal(RS.mecanico(custom,null,['Invisível por 1 hora']),'Invisível por 1 hora · Cargas 1/3');
  assert.equal(RS.mecanico({},C.obter('srd51:item/dart'),[]).split(' · ').filter(x=>/Arremesso|Alcance/.test(x)).length,1,'o alcance de arremesso aparece uma vez só');
  assert.equal(RS.mecanico({},C.obter('srd51:item/chain-mail'),[]),'CA 16 · For 13');
});

test('lista e grade: textos longos limitados por linhas, sem altura fixa, sem rolagem horizontal e sem fonte menor; na lista larga ocupam o espaço já existente',()=>{
  const css=ler('css/fichas.css'),bloco=css.slice(css.indexOf('Inventário: resumo mecânico'));
  const larga=bloco.slice(bloco.indexOf('@media(min-width:700px)'),bloco.indexOf('.inv-det-origens,.inv-det-hist'));
  const base=bloco.replace(larga,'');
  assert.match(base,/\.inv-mec\{[^}]*-webkit-line-clamp:2[^}]*overflow:hidden\}/);assert.match(base,/\.inv-origem\{[^}]*-webkit-line-clamp:1/);
  assert.match(base,/\.inv-resumo\{display:none\}/,'fora da lista larga o resumo da descrição não aparece');
  assert.match(base,/#inv\.inv-grade \.inv-mec\{-webkit-line-clamp:1\}/);assert.match(base,/#inv\.inv-grade \.inv-origem\{display:none\}/,'grade: origem só nos detalhes');
  assert.match(base,/@media\(max-width:519px\)\{#inv \.inv-origem\{display:none\}\}/,'celular estreito: origem só nos detalhes');
  /* lista larga: nome e mecânica na mesma linha; tipo/peso, resumo e origem na mesma linha (o cartão não passa da altura da miniatura) */
  assert.match(larga,/#inv:not\(\.inv-grade\) \.inv-titulo\{flex-wrap:nowrap\}/);assert.match(larga,/#inv:not\(\.inv-grade\) \.inv-meta\{display:flex/);
  assert.match(larga,/\.inv-resumo\{display:block;flex:1 1 0;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\}/);
  assert.match(larga,/\.inv-origem\{[^}]*max-width:45%[^}]*text-overflow:ellipsis\}/);
  assert.match(bloco,/overflow-wrap:anywhere/);assert.match(bloco,/min-width:0/);
  assert.ok(!/(?:^|[;{\s])height\s*:|max-height|overflow-x\s*:\s*scroll/.test(bloco),'nenhuma altura fixa nem rolagem horizontal');
  assert.ok(!/white-space\s*:\s*nowrap/.test(base),'nowrap só na lista larga, sempre com reticências');
  assert.ok(!/font-size:\s*0?\.[0-7]\d*rem/.test(bloco),'nenhuma fonte reduzida');
  const fonte=ler('js/personagem.js');
  assert.ok(fonte.includes('class="inv-mec"')&&fonte.includes('class="inv-resumo"')&&fonte.includes('class="inv-origem muted"'));
  assert.ok(fonte.includes('${mec ?')&&fonte.includes('${resumo ?')&&fonte.includes('${orig ?'),'linhas vazias não são renderizadas');
  assert.ok(fonte.indexOf('class="inv-mec"')<fonte.indexOf('class="inv-resumo"')&&fonte.indexOf('class="inv-resumo"')<fonte.indexOf('class="inv-origem muted"'),'prioridade: mecânica, descrição, origem');
});

test('detalhes: origem por lote e histórico só quando existem registros',()=>{
  const fonte=ler('js/personagem.js');
  assert.ok(fonte.includes('if (hist.length)'),'o histórico só aparece com registros');
  assert.ok(fonte.includes('Histórico de transferências')&&fonte.includes('<h4 class="sub">Origem</h4>'));
  assert.ok(!/Recebido de: —|Recebido de: -/.test(fonte),'sem campos vazios');
  assert.ok(ler('js/catalogo-itens.js').includes('${v.extraHTML || ""}'));
});

test('os textos digitados são normalizados com \s+ (espaços), nunca removendo letras',()=>{
  for(const f of ['js/personagem.js','js/inventario.js','js/inventario-resumo.js','js/equipamento-ficha.js'])assert.ok(!/replace\(\/s\+\/g/.test(ler(f)),f);
  assert.ok(ler('js/personagem.js').includes('e.value.replace(/\\s+/g, " ").trim()'));
  const A=amb(),it=A.I.novoItem({nome:'x'});A.I.definirOrigemTexto(it,'  Presente   de  Aldren   Thorne ');assert.equal(it.origem.texto,'Presente de Aldren Thorne');
});

test('item com efeito configurado não repete a cura na linha mecânica',()=>{
  const A=amb(),p=A.C.obter('srd51:item/potion-of-healing');
  assert.equal(A.W.INV_RESUMO.mecanico({},p,[]).includes('Cura'),true,'sem efeito configurado, a linha do catálogo aparece');
  assert.equal(A.W.INV_RESUMO.mecanico({},p,['Recupera 2d4+2 pontos de vida']),'Recupera 2d4+2 pontos de vida');
});
