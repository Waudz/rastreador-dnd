/* Ataque desarmado (2014): derivado da ficha, sem item, sem duplicar, com Artes Marciais do Monge. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,ler}=require('./helpers.cjs');
function amb(){
  const ctx=vm.createContext({window:{},console});
  for(const n of ['origens','regras','magias-jogo','subclasses-2014','inventario','catalogo-itens','equipamento-ficha','criador-regras'])vm.runInContext(ler('js/'+n+'.js'),ctx);
  const W=ctx.window;W.CAT_ITENS.indexar(JSON.parse(ler('dados/itens-srd2014.json')).itens);
  W.CRIADOR.configurar(JSON.parse(ler('dados/criacao-srd2014.json')),JSON.parse(ler('dados/magias.json')));
  return {W,R:W.REGRAS,E:W.EQUIP_FICHA,CR:W.CRIADOR};
}
const J=o=>JSON.parse(JSON.stringify(o));
const ficha=(classes,atributos,extra={})=>({classes,atributos:{for:10,des:10,con:10,int:10,sab:10,car:10,...atributos},equip:{armadura:'',escudo:false,bonus:0},ataques:[],...extra});
const calc=(R,f)=>{const a=R.ataqueDesarmado(f);return {a,v:R.valoresAtaque(f,a)};};

test('personagem comum: Força, dano 1 + Força, proficiente, contundente',()=>{
  const {R}=amb(),f=ficha([{c:'Fighter',n:5}],{for:16,des:18});   // bônus de proficiência +3
  const {a,v}=calc(R,f);
  assert.equal(a.atr,'for');assert.equal(a.dado,'1');assert.equal(a.tipo,'contundente');assert.equal(a.prof,true);assert.equal(a.artesMarciais,false);
  assert.equal(v.ataque,3+3);assert.equal(v.dano,3);
});

test('Monge sem armadura: dado de artes marciais pelos níveis 1, 5, 11 e 17',()=>{
  const {R}=amb();
  for(const [n,dado,pb] of [[1,'1d4',2],[4,'1d4',2],[5,'1d6',3],[10,'1d6',4],[11,'1d8',4],[16,'1d8',5],[17,'1d10',6],[20,'1d10',6]]){
    const f=ficha([{c:'Monk',n}],{des:16,for:8}),{a,v}=calc(R,f);
    assert.equal(a.dado,dado,'nível '+n);assert.equal(a.artesMarciais,true);assert.equal(v.ataque,3+pb,'ataque nível '+n);assert.equal(v.dano,3,'dano soma o modificador');
  }
});

test('Monge usa o maior entre Força e Destreza; Força maior continua valendo',()=>{
  const {R}=amb();
  assert.equal(calc(R,ficha([{c:'Monk',n:1}],{for:18,des:12})).v.dano,4);
  assert.equal(calc(R,ficha([{c:'Monk',n:1}],{for:8,des:14})).v.dano,2);
  assert.equal(R.ataqueDesarmado(ficha([{c:'Fighter',n:1}],{des:20,for:8})).atr,'for','quem não é Monge não usa Destreza');
});

test('Monge com armadura ou escudo perde Artes Marciais: Força e dano 1 + Força',()=>{
  const {R}=amb();
  for(const equip of [{armadura:'couro',escudo:false},{armadura:'',escudo:true},{armadura:'malha',escudo:true}]){
    const f=ficha([{c:'Monk',n:5}],{des:18,for:12});f.equip={...f.equip,...equip};
    const {a,v}=calc(R,f);assert.equal(a.artesMarciais,false);assert.equal(a.dado,'1');assert.equal(a.atr,'for');assert.equal(v.dano,1);
  }
  const f=ficha([{c:'Monk',n:5}],{des:18});f.equip.armadura='';assert.equal(R.ataqueDesarmado(f).artesMarciais,true,'tirar a armadura devolve a característica');
});

test('multiclasse: o dado vem do nível de Monge, a proficiência do nível total',()=>{
  const {R}=amb();
  const f=ficha([{c:'Monk',n:5},{c:'Fighter',n:6}],{des:16});   // total 11: +4
  const {a,v}=calc(R,f);assert.equal(a.dado,'1d6');assert.equal(a.nivelMonge,5);assert.equal(v.ataque,3+4);
  assert.equal(R.ataqueDesarmado(ficha([{c:'Fighter',n:10},{c:'Monk',n:1}],{des:14})).dado,'1d4');
  assert.equal(R.ataqueDesarmado(ficha([{c:'Fighter',n:5},{c:'Wizard',n:6}],{des:14})).dado,'1');
  assert.equal(R.ataqueDesarmado(ficha([{c:'Monk',n:3},{c:'Monk',n:2}],{})).nivelMonge,5,'níveis de Monge somam');
});

test('subir de nível e mudar atributos atualizam o ataque sem gravar nada na ficha',()=>{
  const {R,CR}=amb();
  let p=CR.iniciar({nome:'M',versao:1,pv_max:10,pv_atual:10,inventario:[],dinheiro:{},ficha:{}},'criacao');
  p.ficha.classes=[{c:'Monk',n:4,sub:''}];p.ficha.raca='Humano';p.ficha.backgroundId='eremita';p.ficha.atributos={for:10,des:16,con:12,int:10,sab:14,car:8};
  assert.equal(R.ataqueDesarmado(p.ficha).dado,'1d4');
  p=CR.subir(p,'Monk','media');assert.equal(p.ficha.classes[0].n,5);assert.equal(R.ataqueDesarmado(p.ficha).dado,'1d6');
  const antes=R.valoresAtaque(p.ficha,R.ataqueDesarmado(p.ficha)).dano;p.ficha.atributos.des+=2;
  assert.equal(R.valoresAtaque(p.ficha,R.ataqueDesarmado(p.ficha)).dano,antes+1);
  assert.equal((p.ficha.ataques||[]).length,0,'nada foi gravado em ficha.ataques');
});

test('efeitos existentes (bônus temporário de ataque) valem no ataque desarmado',()=>{
  const {R}=amb(),f=ficha([{c:'Fighter',n:1}],{for:14});const base=calc(R,f).v.ataque;
  f.bonusTemp={ataques:2};assert.equal(calc(R,f).v.ataque,base+2);
});

test('sem nenhum item no inventário o ataque existe e não vira item',()=>{
  const {R}=amb(),P={inventario:[],ficha:ficha([{c:'Wizard',n:1}],{for:12})};
  const lista=R.ataquesDaFicha(P.ficha);assert.equal(lista.length,1);assert.equal(lista[0].nome,'Ataque desarmado');assert.equal(P.inventario.length,0);assert.equal(P.ficha.ataques.length,0);
});

test('equipar e desequipar armas não mexe no ataque desarmado e ele nunca duplica',()=>{
  const {W,R,E}=amb(),P={inventario:[],ficha:ficha([{c:'Rogue',n:1}],{des:14})};
  P.inventario.push(W.CAT_ITENS.paraInventario(W.CAT_ITENS.obter('srd51:item/dagger'),1,{tipo:'mestre'}));
  const conta=()=>R.ataquesDaFicha(P.ficha).filter(a=>a.auto).length;
  assert.equal(conta(),1);E.equipar(P,P.inventario[0].uid);assert.equal(conta(),1);assert.equal(R.ataquesDaFicha(P.ficha).length,2);
  E.desequipar(P,P.inventario[0].uid);assert.equal(conta(),1);assert.equal(R.ataquesDaFicha(P.ficha).length,1);
  P.inventario=[];E.reconciliar(P);assert.equal(conta(),1);
});

test('persistência: salvar e reabrir não duplica nem grava o ataque automático',()=>{
  const {R}=amb(),f=ficha([{c:'Monk',n:5}],{des:16});f.ataques=[{nome:'Bastão',dado:'1d6',tipo:'contundente',atr:'for',prof:true,magico:1,extra:0}];
  const volta=J(J(f));
  assert.equal(JSON.stringify(volta.ataques),JSON.stringify(f.ataques));
  assert.equal(R.ataquesDaFicha(volta).length,2);assert.equal(R.ataquesDaFicha(volta).filter(a=>/desarmado/i.test(a.nome)).length,1);
  assert.equal(JSON.stringify(R.ataqueDesarmado(volta)),JSON.stringify(R.ataqueDesarmado(f)));
});

test('entrada manual "Ataque Desarmado" (ou "Desarmado" da lista de armas) é preservada e impede duplicação',()=>{
  const {R}=amb();
  for(const nome of ['Ataque Desarmado','Desarmado','ataque desarmado','Soco (unarmed strike)']){
    const manual={nome,dado:'1d4',tipo:'contundente',atr:'des',prof:true,magico:2,extra:1};
    const f=ficha([{c:'Monk',n:5}],{des:16});f.ataques=[manual];const antes=JSON.stringify(f);
    const lista=R.ataquesDaFicha(f);
    assert.equal(lista.length,1,nome);assert.equal(lista[0],manual,'é a entrada do jogador, com seus modificadores');
    assert.equal(JSON.stringify(f),antes,'a ficha não foi tocada');
    assert.equal(R.valoresAtaque(f,lista[0]).dano,3+2+1);
  }
});

test('ataque de personagem na iniciativa usa o mesmo cálculo da ficha (inclui o desarmado)',()=>{
  assert.match(ler('js/campanha-ini.js'),/R\.ataquesDaFicha\(f\)/);
});
