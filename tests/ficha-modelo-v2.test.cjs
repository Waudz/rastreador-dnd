const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,ler}=require('./helpers.cjs');
function motor(){const ctx=vm.createContext({window:{}});for(const n of ['origens','regras','subclasses-2014','criador-regras'])vm.runInContext(ler('js/'+n+'.js'),ctx);const C=ctx.window.CRIADOR,R=ctx.window.REGRAS;C.configurar(JSON.parse(ler('dados/criacao-srd2014.json')),JSON.parse(ler('dados/magias.json')));return {C,R};}
const copia=o=>JSON.parse(JSON.stringify(o));
/* Responde às escolhas obrigatórias como o jogador faria no criador, sem inventar o que não é válido. */
function preencher(C,R,p){
  const f=p.ficha,st=C.estado(f);
  for(let r=0;r<4;r++)for(const g of [...C.grupos(f),...C.gruposMagias(C.derivar(p).ficha)]){
    if(g.selecionadas.length>=g.qtd)continue;
    const livres=g.opts.filter(v=>!(g.bloqueadas||[]).includes(v)&&!g.selecionadas.includes(v)&&!C.requisitos(f,v).length);
    st.selecoes[g.key]=[...g.selecionadas,...livres.slice(0,g.qtd-g.selecionadas.length)];
  }
  const d=C.classe(f.classes[0].c);
  (d.data.startingChoices||[]).forEach((g,i)=>{st.equipamento['op:'+i]=0;g.options[0].items.forEach((x,j)=>{if(x.category)for(let k=0;k<(x.count||1);k++)st.equipamento[`item:${i}:${j}:${k}`]=C.itemCategoria(x.category)[0].id;});});
  for(const m of R.melhoriasDisponiveis(f.classes)){f.melhorias??={};if(!f.melhorias[m.id])f.melhorias[m.id]=['for','con'];}
}
function novo(C,R,niveis=3){
  const row={nome:'Novo',versao:1,pv_max:10,pv_atual:10,inventario:[],dinheiro:{},ficha:{}};   // como "Novo personagem" cria
  const p=C.iniciar(row,'criacao'),f=p.ficha;
  f.classes=[{c:'Fighter',n:niveis,sub:niveis>=3?'srd51:subclass/champion':''}];f.raca='Humano';f.backgroundId='soldado';
  C.estado(f).base={for:15,des:14,con:13,int:10,sab:10,car:10};preencher(C,R,p);
  return {row,p};
}
const salvar=(C,q,modo,original)=>{const s=C.salvamento(q,{modo,original});return {s,linha:{...(original||{}),...s.dados,versao:((original&&original.versao)||1)+1}};};

test('personagem criado do zero: salva, recarrega e continua idêntico (sem duplicar nada)',()=>{
  const {C,R}=motor(),{p}=novo(C,R,3),q=C.derivar(p);
  assert.deepEqual(copia(C.validar(q)),[],'o criador deve aceitar um personagem completo');
  const {s,linha}=salvar(C,q,'criacao');
  assert.equal(s.dados.pv_max,12+8+8);assert.equal(s.dados.pv_atual,s.dados.pv_max);               // 1º nível: dado máximo; depois valor fixo; Constituição 14 (+2)
  assert.ok(s.dados.inventario.length>0,'equipamento inicial concedido uma vez');
  const q2=C.derivar(C.iniciar(copia(linha),'criacao'));
  assert.deepEqual(copia(C.validar(q2)),[]);
  for(const k of ['classes','atributos','perClasse','perRaca','idiomas','outrasProf','progressao'])assert.deepEqual(copia(q2.ficha[k]),copia(q.ficha[k]),k);
  assert.deepEqual(q2.ficha.caracteristicas.map(h=>h.cf).sort(),q.ficha.caracteristicas.map(h=>h.cf).sort());
  const ids=q2.ficha.caracteristicas.map(h=>h.cf);assert.equal(new Set(ids).size,ids.length,'característica duplicada');
  const salvo2=C.salvamento(q2,{modo:'criacao'}).dados;assert.equal(salvo2.inventario.length,s.dados.inventario.length);   // reabrir e salvar não duplica itens
});
test('histórico por nível: classe, PV, características automáticas, escolhas e melhorias de cada nível',()=>{
  const {C,R}=motor(),{p}=novo(C,R,4),q=C.derivar(p),pr=q.ficha.progressao;
  assert.equal(pr.length,4);assert.deepEqual(copia(pr.map(x=>x.total)),[1,2,3,4]);assert.ok(pr.every(x=>x.classe==='Fighter'));assert.deepEqual(copia(pr.map(x=>x.nivelClasse)),[1,2,3,4]);
  assert.equal(pr[0].pv.modo,'maximo');assert.equal(pr[0].pv.ganho,10+2);assert.equal(pr[1].pv.modo,'fixo');assert.equal(pr[1].pv.ganho,6+2);
  assert.ok(pr[0].automaticas.length>0&&pr[2].automaticas.length>0,'características automáticas por nível');
  assert.ok(Object.keys(pr[0].escolhas).length>0,'escolhas do nível 1 registradas (estilo de luta, perícias)');
  assert.ok(pr[3].melhoria&&pr[3].melhoria.id==='Fighter:4'&&pr[3].melhoria.atributos.length===2,'melhoria de atributo no nível 4 do Guerreiro');
  assert.equal(pr.reduce((s,x)=>s+x.pv.ganho,0),C.pvTotal(q.ficha));
});
test('editar um personagem salvo: subir o nível, reduzir e cancelar; PV atual preservado e sem alterar o original',()=>{
  const {C,R}=motor(),{p}=novo(C,R,3),{linha}=salvar(C,C.derivar(p),'criacao');linha.pv_atual=9;const snapshot=JSON.stringify(linha);
  const e=C.iniciar(copia(linha),'criacao');e.ficha.classes[0].n=4;preencher(C,R,e);
  const r=salvar(C,C.derivar(e),'editar',copia(linha));
  assert.equal(r.s.dados.pv_max,linha.pv_max+8);assert.equal(r.s.dados.pv_atual,9);assert.equal(r.s.pv.mudou,true);       // +1 nível: +6 +2 de Constituição; PV atuais intactos
  assert.equal(r.s.dados.ficha.progressao.length,4);assert.equal(r.s.dados.ficha.progressao[3].nivelClasse,4);
  const menos=C.iniciar(copia(linha),'criacao');menos.ficha.classes[0].n=2;menos.ficha.classes[0].sub='';
  const m=salvar(C,C.derivar(menos),'editar',copia(linha));assert.equal(m.s.dados.ficha.progressao.length,2);assert.equal(m.s.dados.pv_max,linha.pv_max-8);assert.ok(m.s.dados.pv_atual<=m.s.dados.pv_max);
  const sem=salvar(C,C.derivar(C.iniciar(copia(linha),'criacao')),'editar',copia(linha));assert.equal(sem.s.pv.mudou,false);assert.equal(sem.s.dados.pv_max,linha.pv_max);   // abrir e salvar sem mudar nada
  assert.equal(JSON.stringify(linha),snapshot,'a ficha original não muda');
});
test('subir de nível acrescenta ao histórico, inclusive multiclasse, na ordem em que aconteceu',()=>{
  const {C,R}=motor(),{p}=novo(C,R,3),{linha}=salvar(C,C.derivar(p),'criacao');
  let q=C.iniciar(copia(linha),'nivel');q.ficha.atributos.int=13;
  q=C.subir(q,'Wizard',2);q=C.subir(q,'Fighter','media');
  const d=C.derivar(q).ficha.progressao;
  assert.deepEqual(copia(d.map(x=>x.classe)),['Fighter','Fighter','Fighter','Wizard','Fighter']);
  assert.deepEqual(copia(d.map(x=>x.nivelClasse)),[1,2,3,1,4]);assert.equal(d[3].pv.modo,'rolagem');assert.equal(d[3].pv.valor,2);assert.equal(d[3].pv.dado,6);
  assert.equal(q.pv_max,linha.pv_max+Math.max(1,2+2)+(6+2));                              // d6 rolado 2 + CON 2; Guerreiro fixo 6 + CON 2
  const r=C.derivar(C.iniciar(copia({...linha,ficha:q.ficha,pv_max:q.pv_max,pv_atual:q.pv_atual}),'criacao')).ficha.progressao;
  assert.deepEqual(copia(r.map(x=>x.classe)),copia(d.map(x=>x.classe)));                                  // reabrir mantém a ordem
});
test('a progressão é o único cálculo de PV: valor fixo, rolagem, mínimo 1 e dado máximo só no 1º nível',()=>{
  const {C}=motor(),f={atributos:{con:3},raca:'Humano',classes:[{c:'Wizard',n:3}],criacao:{niveis:[{c:'Wizard',pv:{modo:'maximo'}},{c:'Wizard',pv:{modo:'rolagem',valor:1}},{c:'Wizard',pv:{modo:'fixo'}}]}};
  assert.equal(C.ganhoPV(f,0,f.criacao.niveis[0]),Math.max(1,6-4));assert.equal(C.ganhoPV(f,1,f.criacao.niveis[1]),1);assert.equal(C.pvTotal(f),2+1+1);
  f.criacao.niveis[1].pv={modo:'rolagem',valor:99};assert.equal(C.ganhoPV(f,1,f.criacao.niveis[1]),Math.max(1,4-4));   // rolagem fora do dado vira o valor fixo
});
test('modificadores temporários entram nos testes e ataques sem mudar o atributo permanente',()=>{
  const {R}=motor(),f={atributos:{for:16,des:12,con:14,int:10,sab:12,car:8},classes:[{c:'Fighter',n:3}]};
  const antes=R.valorPericia(f,'atletismo');f.modTemp={for:2};
  assert.equal(R.valorPericia(f,'atletismo'),antes+1);assert.equal(f.atributos.for,16);assert.equal(R.valoresAtaque(f,{atr:'for',prof:true}).dano,4);assert.equal(R.atributoEf(f,'for'),18);
  f.modTemp={};assert.equal(R.atributoEf(f,'for'),16);
});

/* Persistência das decisões: a progressão é derivada; as decisões do jogador moram em campos próprios e sobrevivem a salvar, fechar, reabrir e recalcular. */
const decisoes=f=>copia({criacao:{...f.criacao,modo:undefined,concluido:undefined,equipAplicado:undefined},melhorias:f.melhorias||{},classes:f.classes.map(c=>({c:c.c,n:c.n,sub:c.sub})),raca:f.raca,backgroundId:f.backgroundId,atrRaca:f.atrRaca||[],atrMagiaRaca:f.atrMagiaRaca||null});
function novoMago(C,R){
  const row={nome:'Mago',versao:1,pv_max:10,pv_atual:10,inventario:[],dinheiro:{},ficha:{}},p=C.iniciar(row,'criacao'),f=p.ficha;
  f.classes=[{c:'Wizard',n:5,sub:'srd51:subclass/evocation'}];f.raca='Humano';f.backgroundId='soldado';
  C.estado(f).base={for:8,des:13,con:14,int:15,sab:12,car:10};preencher(C,R,p);
  delete f.melhorias['Wizard:4'];C.estado(f).talentos={'Wizard:4':{nome:'Sentinela'}};         // no nível 4 o jogador escolheu um talento em vez de +2 em atributos
  return p;
}
test('persistência: subclasse, talento, perícias, magias e escolhas de características sobrevivem a salvar, reabrir e recalcular',()=>{
  const {C,R}=motor(),p=novoMago(C,R),q=C.derivar(p);
  assert.deepEqual(copia(C.validar(q)),[],'mago de nível 5 completo');
  const antes=decisoes(q.ficha),{linha}=salvar(C,q,'criacao');
  assert.deepEqual(decisoes(linha.ficha),antes,'o que foi gravado contém exatamente as decisões');
  const q2=C.derivar(C.iniciar(copia(linha),'criacao'));
  assert.deepEqual(decisoes(q2.ficha),antes,'reabrir e recalcular não muda nenhuma decisão');
  assert.equal(q2.ficha.classes[0].sub,'Escola de Evocação');assert.equal(q2.ficha.progressao[3].melhoria.talento,'Sentinela');
  const gMag=C.gruposMagias(q2.ficha).find(g=>g.key==='magias|Wizard|magias');assert.equal(gMag.selecionadas.length,gMag.qtd);
  assert.deepEqual(copia(gMag.selecionadas),copia(C.estado(q.ficha).selecoes['magias|Wizard|magias']));
  assert.ok(q2.ficha.magias.length>=gMag.qtd);
});
test('a progressão é só um resultado: apagá-la e recalcular dá a mesma progressão, e as decisões continuam valendo',()=>{
  const {C,R}=motor(),q=C.derivar(novoMago(C,R)),{linha}=salvar(C,q,'criacao');
  const sem=copia(linha);delete sem.ficha.progressao;
  const q2=C.derivar(C.iniciar(sem,'criacao'));
  assert.deepEqual(copia(q2.ficha.progressao),copia(q.ficha.progressao));assert.deepEqual(decisoes(q2.ficha),decisoes(q.ficha));
});
test('ao reduzir de nível a escolha antiga não é apagada em silêncio: ela fica guardada e a revisão acusa o que sobrou ou faltou',()=>{
  const {C,R}=motor(),{linha}=salvar(C,C.derivar(novoMago(C,R)),'criacao');
  const e=C.iniciar(copia(linha),'criacao');const guardada=copia(C.estado(e.ficha).selecoes);e.ficha.classes[0].n=2;e.ficha.classes[0].sub='';
  const q=C.derivar(e);assert.deepEqual(copia(C.estado(q.ficha).selecoes),guardada,'as seleções gravadas continuam no registro');
});
