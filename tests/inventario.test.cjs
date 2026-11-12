const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,ler}=require('./helpers.cjs');
function motor(){const ctx=vm.createContext({window:{}});for(const n of ['origens','regras','inventario','magias-jogo','itens-efeitos','subclasses-2014','criador-regras'])vm.runInContext(ler('js/'+n+'.js'),ctx);const C=ctx.window.CRIADOR;const cat=JSON.parse(ler('dados/magias.json'));C.configurar(JSON.parse(ler('dados/criacao-srd2014.json')),cat);return {C,R:ctx.window.REGRAS,M:ctx.window.MAGIAS_JOGO,I:ctx.window.INVENTARIO,E:ctx.window.ITENS_EFEITOS,cat};}
const copia=o=>JSON.parse(JSON.stringify(o));
const por=(cat,en)=>cat.find(m=>m.en===en);
function preencher(C,R,p){const f=p.ficha,st=C.estado(f);for(let r=0;r<4;r++)for(const g of [...C.grupos(f),...C.gruposMagias(C.derivar(p).ficha)]){if(g.selecionadas.length>=g.qtd)continue;const livres=g.opts.filter(v=>!(g.bloqueadas||[]).includes(v)&&!g.selecionadas.includes(v)&&!C.requisitos(f,v).length);st.selecoes[g.key]=[...g.selecionadas,...livres.slice(0,g.qtd-g.selecionadas.length)];}
  const d=C.classe(f.classes[0].c);(d.data.startingChoices||[]).forEach((g,i)=>{st.equipamento['op:'+i]=0;g.options[0].items.forEach((x,j)=>{if(x.category)for(let k=0;k<(x.count||1);k++)st.equipamento[`item:${i}:${j}:${k}`]=C.itemCategoria(x.category)[0].id;});});
  for(const m of R.melhoriasDisponiveis(f.classes)){f.melhorias??={};if(!f.melhorias[m.id])f.melhorias[m.id]=['int','con'];}}
function mago(C,R){const p=C.iniciar({nome:'Mago',versao:1,pv_max:10,pv_atual:10,inventario:[],dinheiro:{},ficha:{}},'criacao'),f=p.ficha;f.classes=[{c:'Wizard',n:5,sub:'srd51:subclass/evocation'}];f.raca='Humano';f.backgroundId='soldado';C.estado(f).base={for:8,des:13,con:14,int:15,sab:12,car:10};preencher(C,R,p);const s=C.salvamento(C.derivar(p),{modo:'criacao'});return {...s.dados,id:'p1',versao:2};}

test('itens têm identificador único, origem e tipo; itens antigos ganham identificador estável',()=>{
  const {I}=motor(),a=I.novoItem({nome:'Corda',qtd:1,peso:5}),b=I.novoItem({nome:'Corda',qtd:1,peso:5});
  assert.notEqual(a.uid,b.uid);assert.equal(a.origem.tipo,'jogo');assert.equal(a.tipo,'equipamento');assert.equal(a.magiaVinculada,null);
  const antigo=[{nome:'Tocha',qtd:2,peso:0.5}],mudou=I.normalizar(antigo,'p1'),uid=antigo[0].uid;assert.equal(mudou,true);
  const outro=[{nome:'Tocha',qtd:2,peso:0.5}];I.normalizar(outro,'p1');assert.equal(outro[0].uid,uid,'o mesmo item antigo recebe sempre o mesmo uid');assert.equal(I.normalizar(antigo,'p1'),false);
});
test('adicionar soma pilhas idênticas do catálogo; retirar e consumir mantêm o histórico; quantidades inválidas são recusadas',()=>{
  const {I,E}=motor(),c={dono:{tipo:'personagem',id:'p1'},itens:[],movimentos:[]};
  I.adicionar(c,E.itemDoCatalogo('pocao-cura'));I.adicionar(c,E.itemDoCatalogo('pocao-cura'));
  assert.equal(c.itens.length,1);assert.equal(c.itens[0].qtd,2);
  assert.throws(()=>I.retirar(c,c.itens[0].uid,3),/Quantidade inválida/);assert.throws(()=>I.retirar(c,'x',1),/não encontrado/);
  I.consumir(c,c.itens[0].uid,1,'teste');assert.equal(c.itens[0].qtd,1);I.retirar(c,c.itens[0].uid,1,{tipo:'descarte'});assert.equal(c.itens.length,0);
  assert.deepEqual(c.movimentos.map(m=>m.tipo),['entrada','entrada','uso','descarte']);
});
test('transferir entre contêineres (personagem, NPC, loja, baú) não duplica nem perde itens, com origem e histórico nos dois lados',()=>{
  const {I,E}=motor(),a={dono:{tipo:'personagem',id:'p1'},itens:[],movimentos:[]},b={dono:{tipo:'bau',id:'b1'},itens:[],movimentos:[]};
  I.adicionar(a,I.novoItem({nome:'Espada longa',qtd:3,peso:1.5,ref:'srd51:item/longsword'}));const uid=a.itens[0].uid;
  I.transferir(a,b,uid,2,{nota:'guardado no baú'});
  assert.equal(a.itens[0].qtd,1);assert.equal(b.itens[0].qtd,2);assert.notEqual(b.itens[0].uid,uid,'a parte separada é uma nova instância');
  assert.equal(b.itens[0].origem.tipo,'transferencia');assert.equal(b.itens[0].origem.id,'p1');
  assert.equal(a.movimentos.at(-1).tipo,'transferencia-saida');assert.equal(b.movimentos.at(-1).tipo,'transferencia-entrada');assert.equal(b.movimentos.at(-1).de.id,'p1');
  assert.throws(()=>I.transferir(a,b,uid,5),/inválida/);assert.equal(a.itens[0].qtd,1,'recusa não altera nada');
  I.transferir(b,a,b.itens[0].uid,2);assert.equal(a.itens.reduce((s,i)=>s+i.qtd,0),3,'volta ao total original');
});
test('itens personalizados: propriedades livres, mágicos, sintonia (máx. 3) e cargas',()=>{
  const {I,E}=motor(),c={dono:{tipo:'personagem',id:'p1'},itens:[],movimentos:[]};
  const ids=[1,2,3,4].map(n=>I.adicionar(c,I.novoItem({nome:'Anel '+n,tipo:'magico',propriedades:{sintonia:{requer:true,sintonizado:false},segredo:'x'+n}})).uid);
  ids.slice(0,3).forEach(u=>I.sintonizar(c,u,true));assert.throws(()=>I.sintonizar(c,ids[3],true),/3 itens/);
  I.sintonizar(c,ids[0],false);I.sintonizar(c,ids[3],true);assert.equal(I.sintonizados(c.itens),3);assert.equal(c.itens[0].propriedades.segredo,'x1','propriedades extras preservadas');
  const v=I.adicionar(c,E.itemDoCatalogo('varinha-misseis'));I.usarCarga(c,v.uid,7);assert.throws(()=>I.usarCarga(c,v.uid,1),/insuficientes/);
});
test('pergaminho de magia é um item real ligado a uma magia e soma com o da mesma magia',()=>{
  const {I,cat}=motor(),c={dono:{tipo:'personagem',id:'p1'},itens:[],movimentos:[]},m=por(cat,'Fireball');
  I.adicionar(c,I.criarPergaminho(m));I.adicionar(c,I.criarPergaminho(m));I.adicionar(c,I.criarPergaminho(por(cat,'Shield')));
  assert.equal(c.itens.length,2);assert.equal(c.itens[0].qtd,2);assert.equal(c.itens[0].magiaVinculada.en,'Fireball');assert.equal(c.itens[0].tipo,'pergaminho');
});
test('fluxo completo: pergaminho no inventário, cópia para o grimório, custo, teste, consumo e persistência após salvar e reabrir',()=>{
  const {C,R,M,I,cat}=motor(),P=mago(C,R),m=por(cat,'Fireball');P.dinheiro={po:500};
  const c=I.conteinerDe(P);I.adicionar(c,I.criarPergaminho(m,{origem:{tipo:'saque',nota:'Cripta'}}));I.adicionar(c,I.criarPergaminho(m));
  const base=P.inventario.length-1,perg=()=>P.inventario.find(i=>i.tipo==='pergaminho'),uid=perg().uid;assert.equal(perg().qtd,2);assert.ok(base>=0);
  const v=M.validarCopia(P,m,{fonte:'pergaminho',pergaminhoUid:uid});assert.equal(v.ok,true);assert.equal(v.cd,13);assert.equal(v.custo.po,75,'Evocation Savant');assert.equal(v.custo.horas,3);
  const falha=M.copiarParaGrimorio(P,m,{fonte:'pergaminho',pergaminhoUid:uid,arcanismo:12});
  assert.equal(falha.sucesso,false);assert.equal(perg().qtd,1,'pergaminho consumido na falha');assert.equal(P.dinheiro.po,425);assert.ok(!P.ficha.magias.some(x=>x.en==='Fireball'));
  const ok=M.copiarParaGrimorio(P,m,{fonte:'pergaminho',pergaminhoUid:uid,arcanismo:13});
  assert.equal(ok.sucesso,true);assert.equal(perg(),undefined,'último pergaminho consumido e removido');assert.equal(P.inventario.length,base);assert.equal(P.dinheiro.po,350);
  assert.ok(P.ficha.magias.some(x=>x.en==='Fireball'&&x.noGrimorio&&x.registroOrigem.tipo==='copia-pergaminho'));
  assert.deepEqual(copia(P.ficha.movimentos.filter(x=>x.tipo==='copia').map(x=>x.nota)),['Cópia falhou: Bola de Fogo','Copiado para o grimório: Bola de Fogo']);
  /* salvar (JSON), fechar e reabrir: nada se perde e nada se duplica */
  const salvo=copia({inventario:P.inventario,dinheiro:P.dinheiro,ficha:P.ficha}),aberto={...copia(P),...salvo};
  const f2=C.derivar(C.iniciar(aberto,'criacao')).ficha;
  assert.equal(f2.magias.filter(x=>x.en==='Fireball').length,1);assert.equal(aberto.inventario.length,base);assert.ok(!aberto.inventario.some(i=>i.tipo==='pergaminho'));assert.equal(aberto.dinheiro.po,350);assert.equal(f2.movimentos.filter(x=>x.tipo==='copia').length,2);
});
test('o inventário é apenas dados do personagem: nenhuma interface de lojas ou central de itens da campanha',()=>{
  const j=ler('js/personagem.js');assert.ok(!/loja|baú|saque/i.test(j.match(/secao-inventario[\s\S]{0,4000}/)[0]));
});
