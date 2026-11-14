/* Bônus raciais (D&D 5e 2014) no catálogo, no criador, na compra de pontos e na edição. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,ler}=require('./helpers.cjs');
function amb(){
  const ctx=vm.createContext({window:{},console});
  for(const n of ['origens','regras','magias-jogo','subclasses-2014','criador-regras'])vm.runInContext(ler('js/'+n+'.js'),ctx);
  const W=ctx.window,C=W.CRIADOR,R=W.REGRAS;C.configurar(JSON.parse(ler('dados/criacao-srd2014.json')),JSON.parse(ler('dados/magias.json')));
  return {C,R};
}
const ATR=['for','des','con','int','sab','car'];
const J=o=>JSON.parse(JSON.stringify(o));
function novo(C,raca,{ficha={},modo='criacao',base}={}){
  const p=C.iniciar({nome:'Pedro',versao:1,pv_max:10,pv_atual:10,inventario:[],dinheiro:{},ficha},modo);
  p.ficha.classes=[{c:'Fighter',n:1,sub:''}];p.ficha.raca=raca;p.ficha.backgroundId='soldado';
  if(base)p.ficha.criacao.base={...base};
  return p;
}
const soma=o=>Object.values(o||{}).reduce((n,v)=>n+(Number(v)||0),0);
const BASE={for:15,des:14,con:13,int:12,sab:10,car:8};   // 27 pontos

test('catálogo: Humano dá +1 nos seis atributos; Humano Variante pede dois atributos',()=>{
  const {R}=amb(),h=R.racial('Humano'),v=R.racial('Humano (Variante)');
  assert.equal(JSON.stringify(h.bonus),JSON.stringify({for:1,des:1,con:1,int:1,sab:1,car:1}));assert.equal(h.atributos,0);
  assert.equal(soma(v.bonus),0);assert.equal(v.atributos,2);
});

test('criador aplica o Humano: bônus na distribuição e valor final = base + 1',()=>{
  const {C}=amb(),q=C.derivar(novo(C,'Humano',{base:BASE}));
  for(const k of ATR){assert.equal(q.ficha.bonusRaca[k],1,k);assert.equal(q.ficha.atributos[k],BASE[k]+1,k);}
  assert.equal(C.validar(q).filter(e=>e.etapa===1).length,0);
});

test('Humano Variante: +1 em dois atributos diferentes escolhidos; repetidos ou inválidos não contam',()=>{
  const {C}=amb();
  const p=novo(C,'Humano (Variante)',{base:BASE});p.ficha.atrRaca=['for','con'];
  let q=C.derivar(p);assert.equal(JSON.stringify(q.ficha.bonusRaca),JSON.stringify({for:1,con:1}));assert.equal(q.ficha.atributos.for,16);assert.equal(q.ficha.atributos.con,14);assert.equal(q.ficha.atributos.des,14);
  assert.equal(C.validar(q).filter(e=>/atributos da raça/.test(e.texto)).length,0);
  p.ficha.atrRaca=['for','for'];q=C.derivar(p);assert.equal(soma(q.ficha.bonusRaca),1,'o mesmo atributo duas vezes não vale');assert.ok(C.validar(q).some(e=>/atributos da raça/.test(e.texto)));
  p.ficha.atrRaca=['xxx','des'];q=C.derivar(p);assert.equal(JSON.stringify(q.ficha.bonusRaca),JSON.stringify({des:1}));
  p.ficha.atrRaca=[];q=C.derivar(p);assert.equal(soma(q.ficha.bonusRaca),0);assert.ok(C.validar(q).some(e=>/atributos da raça/.test(e.texto)),'pede a escolha');
});

test('todas as raças e sub-raças do criador aplicam os bônus do catálogo',()=>{
  const {C,R}=amb();let n=0;
  for(const nome of R.RACAS_BASE){
    const r=R.racial(nome),p=novo(C,nome,{base:BASE});
    if(r.atributos){p.ficha.atrRaca=ATR.filter(k=>!(k in r.bonus)).slice(0,r.atributos);}
    const q=C.derivar(p),esperado={...r.bonus};
    (p.ficha.atrRaca||[]).forEach((k,i)=>{esperado[k]=(esperado[k]||0)+(nome==='Fada'&&i===0?2:1);});
    for(const k of ATR){assert.equal(q.ficha.bonusRaca[k]||0,esperado[k]||0,nome+' '+k);assert.equal(q.ficha.atributos[k],BASE[k]+(esperado[k]||0),nome+' '+k);}
    assert.ok(soma(q.ficha.bonusRaca)>=2,nome+' tem bônus');n++;
  }
  assert.ok(n>=16);
});

test('a compra de 27 pontos não depende da raça: custo, saldo e validação ficam iguais',()=>{
  const {C,R}=amb();
  for(const nome of ['Humano','Anão (da Colina)','Draconato','Meio-elfo']){
    const p=novo(C,nome,{base:BASE});if(R.racial(nome).atributos)p.ficha.atrRaca=['for','des'].filter(k=>!(k in R.racial(nome).bonus)).slice(0,R.racial(nome).atributos);
    const q=C.derivar(p);assert.equal(C.custo(q.ficha.criacao.base),27,nome);assert.equal(JSON.stringify(q.ficha.criacao.base),JSON.stringify(BASE),'a base não recebe bônus');
    assert.ok(!C.validar(q).some(e=>/27 pontos/.test(e.texto)),nome);
  }
});

test('trocar de raça muda só o bônus: a base (compra de pontos) permanece',()=>{
  const {C}=amb(),p=novo(C,'Humano',{base:BASE});let q=C.derivar(p);assert.equal(q.ficha.atributos.for,16);
  p.ficha.raca='Anão (da Montanha)';p.ficha.atrRaca=[];q=C.derivar(p);
  assert.equal(JSON.stringify(q.ficha.criacao.base),JSON.stringify(BASE));
  assert.equal(q.ficha.atributos.for,17);assert.equal(q.ficha.atributos.con,15);assert.equal(q.ficha.atributos.des,14,'o +1 do Humano saiu');assert.equal(q.ficha.atributos.car,8);
  p.ficha.raca='Humano';q=C.derivar(p);assert.equal(q.ficha.atributos.des,15);assert.equal(JSON.stringify(q.ficha.criacao.base),JSON.stringify(BASE));
  const d1=C.derivar(p),d2=C.derivar(d1);assert.equal(JSON.stringify(d2.ficha.atributos),JSON.stringify(d1.ficha.atributos),'derivar de novo não soma duas vezes');
});

test('ficha nova com atributos padrão (todos 10) continua na compra de pontos e aplica a raça',()=>{
  const {C}=amb();
  for(const ficha of [{atributos:{}},{atributos:{for:10,des:10,con:10,int:10,sab:10,car:10}}]){
    const p=novo(C,'Humano',{ficha}),q=C.derivar(p);
    assert.equal(p.ficha.criacao.metodo,'pointbuy');assert.equal(q.ficha.bonusRaca.for,1);assert.equal(q.ficha.atributos.for,9,'base 8 + 1');
  }
});

test('ficha com valores de verdade segue preservada; redistribuir na criação usa a raça escolhida',()=>{
  const {C}=amb(),manual={atributos:{for:15,des:14,con:13,int:12,sab:10,car:8}};
  const p=novo(C,'Humano',{ficha:manual});
  assert.equal(p.ficha.criacao.metodo,'preservado');
  let q=C.derivar(p);assert.equal(JSON.stringify(q.ficha.atributos),JSON.stringify(manual.atributos),'nada muda sem editar a base');
  p.ficha.criacao.baseEditada=true;p.ficha.criacao.base={...BASE};
  q=C.derivar(p);assert.equal(q.ficha.bonusRaca.for,1);assert.equal(q.ficha.atributos.for,16,'raça aplicada uma vez sobre a base redistribuída');
  p.ficha.raca='Anão (da Colina)';q=C.derivar(p);assert.equal(q.ficha.atributos.con,15);assert.equal(q.ficha.atributos.for,15);
});

test('editar uma ficha existente preserva atributos e não aplica o bônus racial duas vezes',()=>{
  const {C}=amb();
  const salvo={nome:'Pedro',versao:2,pv_max:12,pv_atual:12,inventario:[],dinheiro:{},ficha:{classes:[{c:'Fighter',n:1}],raca:'Humano',backgroundId:'soldado',atributos:{for:16,des:15,con:14,int:13,sab:11,car:9},bonusRaca:{for:1,des:1,con:1,int:1,sab:1,car:1},criacao:{versao:1,concluido:true,equipAplicado:true,selecoes:{},equipamento:{}}}};
  const antes=J(salvo.ficha.atributos);
  const e=C.iniciar(salvo,'editar'),q=C.derivar(e);
  assert.equal(JSON.stringify(q.ficha.atributos),JSON.stringify(antes));
  assert.equal(JSON.stringify(C.derivar(q).ficha.atributos),JSON.stringify(antes),'derivar repetido');
  const s=C.salvamento(C.derivar(e),{modo:'editar',original:salvo});
  assert.equal(JSON.stringify(s.dados.ficha.atributos),JSON.stringify(antes));
  /* reabrir em modo de criação (ficha já concluída) também não reaplica nada */
  const r=C.derivar(C.iniciar(J(salvo),'criacao'));assert.equal(JSON.stringify(r.ficha.atributos),JSON.stringify(antes));
  /* editar a base redistribuindo mantém o bônus racial já gravado, uma vez */
  const e2=C.iniciar(salvo,'editar');e2.ficha.criacao.baseEditada=true;e2.ficha.criacao.base={...BASE};
  const q2=C.derivar(e2);assert.equal(q2.ficha.atributos.for,16);assert.equal(q2.ficha.atributos.car,9);
});

test('interface do criador mostra o bônus e o "Raça +N" a partir da ficha derivada',()=>{
  const src=ler('js/criador.js');assert.ok(src.includes("Raça +${q.ficha.bonusRaca?.[k]||0}"));assert.ok(src.includes("Bônus da raça:"));
});
