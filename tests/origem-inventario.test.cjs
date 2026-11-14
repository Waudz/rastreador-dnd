/* Origem dos equipamentos (criador e inventário), edição pelo mestre, lotes agrupados e transferências com histórico. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,ler}=require('./helpers.cjs');
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

test('permissões: só o mestre vê o campo editável; jogador só lê; o servidor recusa a alteração por quem não é o mestre',()=>{
  const src=ler('js/personagem.js');
  assert.ok(src.includes('souMestre ? `<input data-lote-origem'),'detalhes: o campo editável só existe para o mestre');
  assert.ok(src.includes('souMestre ? `<label class="inv-c-nome">Origem<input data-inv-origem'),'painel de edição idem');
  assert.ok(/if \(!souMestre\) \{ aviso\("Somente o mestre pode alterar a origem\.", true\); return; \}/.test(src),'o tratador também recusa sem confiar na interface');
  const sql=ler('supabase/migrations/20261114120000_proteger_origem_item.sql').replace(/--[^\n]*/g,'');
  assert.match(sql,/c\.mestre_id=ator\) then return new/);
  assert.match(sql,/item->'origem'.*is distinct from.*prev->'origem'/s);assert.match(sql,/errcode='42501'/);
  assert.match(sql,/transferencias/);assert.match(sql,/security definer set search_path=''/);
  assert.match(sql,/revoke all on function private\.personagens_proteger_origem_item\(\) from public,anon,authenticated/);
  assert.ok(!/\bgrant\b/i.test(sql)&&!/drop table|delete from|update public\.personagens/i.test(sql),'sem permissões novas nem alteração de dados');
  assert.match(sql,/before update of inventario on public\.personagens/);
  assert.match(ler('supabase/rollback/origem-item.sql'),/zz_personagens_origem_item/);
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
  assert.equal(RS.mecanico(custom,null,['Invisível por 1 hora']),'Invisível por 1 hora · Cargas 1/3 · Raro');
  assert.equal(RS.mecanico({},C.obter('srd51:item/dart'),[]).split(' · ').filter(x=>/Arremesso|Alcance/.test(x)).length,2,'sem repetir o mesmo alcance');
  assert.equal(RS.mecanico({},C.obter('srd51:item/chain-mail'),[]),'CA 16 · For 13');
});

test('lista e grade: nomes e textos longos são limitados por linhas, sem altura fixa, rolagem horizontal nem fonte menor',()=>{
  const css=ler('css/fichas.css'),bloco=css.slice(css.indexOf('Inventário: resumo mecânico'));
  assert.match(bloco,/\.inv-mec,\.inv-resumo\{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden\}/);
  assert.match(bloco,/\.inv-origem\{[^}]*-webkit-line-clamp:1/);assert.match(bloco,/#inv\.inv-grade \.inv-mec\{-webkit-line-clamp:1\}/);
  assert.match(bloco,/#inv\.inv-grade \.inv-resumo,#inv\.inv-grade \.inv-origem\{display:none\}/);
  assert.match(bloco,/overflow-wrap:anywhere/);assert.match(bloco,/min-width:0/);
  assert.ok(!/(?:^|[;{\s])height\s*:|max-height|white-space\s*:\s*nowrap|overflow-x\s*:\s*scroll/.test(bloco),'nenhuma altura fixa, nowrap ou rolagem horizontal');
  assert.ok(!/font-size:\s*(\.[0-7]\d*|0\.[0-7]\d*)rem/.test(bloco.replace(/\.inv-origem\{[^}]*\}/,'')),'sem reduzir a fonte do texto principal');
  const fonte=ler('js/personagem.js');
  assert.ok(fonte.includes('class="inv-mec"')&&fonte.includes('class="inv-resumo"')&&fonte.includes('class="inv-origem muted"'));
  assert.ok(fonte.includes('${mec ?')&&fonte.includes('${resumo ?')&&fonte.includes('${orig ?'),'linhas vazias não são renderizadas');
});

test('detalhes: origem por lote e histórico só quando existem registros',()=>{
  const fonte=ler('js/personagem.js');
  assert.ok(fonte.includes('if (hist.length)'),'o histórico só aparece com registros');
  assert.ok(fonte.includes('Histórico de transferências')&&fonte.includes('<h4 class="sub">Origem</h4>'));
  assert.ok(!/Recebido de: —|Recebido de: -/.test(fonte),'sem campos vazios');
  assert.ok(ler('js/catalogo-itens.js').includes('${v.extraHTML || ""}'));
});
