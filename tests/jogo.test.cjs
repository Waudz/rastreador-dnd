const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,ler}=require('./helpers.cjs');
function motor(){const ctx=vm.createContext({window:{}});for(const n of ['origens','regras','inventario','magias-jogo','itens-efeitos','recursos','jogo'])vm.runInContext(ler('js/'+n+'.js'),ctx);return {R:ctx.window.REGRAS,J:ctx.window.JOGO,RC:ctx.window.RECURSOS,E:ctx.window.ITENS_EFEITOS,I:ctx.window.INVENTARIO};}
const copia=o=>JSON.parse(JSON.stringify(o));
const pers=(classes,extra={})=>({id:'p',pv_atual:20,pv_max:20,pv_temp:0,inventario:[],ficha:{classes,atributos:{for:14,des:12,con:14,int:10,sab:10,car:14}},...extra});
test('dano: PV temporários absorvem primeiro; a 0 PV fica inconsciente; cura desfaz; morte instantânea; falhas a 0 PV',()=>{
  const {J}=motor(),P=pers([{c:'Fighter',n:3}],{pv_temp:5});
  let r=J.dano(P,8);assert.equal(r.temp,5);assert.equal(P.pv_temp,0);assert.equal(P.pv_atual,17);
  r=J.dano(P,17);assert.equal(r.zerou,true);assert.equal(P.pv_atual,0);assert.ok(J.temCondicao(P.ficha,'Inconsciente')&&J.temCondicao(P.ficha,'Incapacitado'));
  r=J.dano(P,3);assert.equal(P.ficha.morte.falhas,1);r=J.dano(P,3,{critico:true});assert.equal(P.ficha.morte.falhas,3);assert.equal(P.ficha.morte.morto,true);
  const Q=pers([{c:'Fighter',n:3}]);J.dano(Q,45);assert.equal(Q.ficha.morte.morto,true,'excedente 25 >= PV máximo 20');
  const S=pers([{c:'Fighter',n:3}]);J.dano(S,20);J.cura(S,4);assert.equal(S.pv_atual,4);assert.ok(!J.temCondicao(S.ficha,'Inconsciente'));assert.equal(S.ficha.morte.falhas,0);
});
test('salvaguarda contra a morte: 20 cura 1, 1 vale duas falhas, 10+ sucesso, 3 sucessos estabilizam',()=>{
  const {J}=motor(),P=pers([{c:'Fighter',n:3}]);J.dano(P,20);
  J.salvaguardaMorte(P,12);J.salvaguardaMorte(P,15);assert.equal(P.ficha.morte.sucessos,2);J.salvaguardaMorte(P,10);assert.equal(P.ficha.morte.estavel,true);
  const Q=pers([{c:'Fighter',n:3}]);J.dano(Q,20);J.salvaguardaMorte(Q,1);assert.equal(Q.ficha.morte.falhas,2);J.salvaguardaMorte(Q,5);assert.equal(Q.ficha.morte.morto,true);
  const S=pers([{c:'Fighter',n:3}]);J.dano(S,20);J.salvaguardaMorte(S,20);assert.equal(S.pv_atual,1);assert.throws(()=>J.salvaguardaMorte(S,10),/0 PV/);
});
test('concentração: dano pede CD = maior entre 10 e metade; falha encerra; 0 PV e incapacitação encerram; nova concentração substitui',()=>{
  const {J}=motor(),P=pers([{c:'Wizard',n:5}]);J.iniciarConcentracao(P,{n:'Bênção',en:'Bless',l:1,conc:true});
  let r=J.dano(P,5);assert.equal(r.concentracao.cd,10);r=J.dano(P,30>19?3:3);J.iniciarConcentracao(P,{n:'Voo',en:'Fly',l:3,conc:true});assert.equal(P.ficha.concentracao.en,'Fly');
  r=J.dano(P,2);assert.equal(r.concentracao.cd,10);assert.equal(J.cdConcentracao(30),15);
  assert.equal(J.testeConcentracao(P,10,9).ok,false);assert.equal(P.ficha.concentracao,null);
  J.iniciarConcentracao(P,{n:'Voo',en:'Fly',l:3,conc:true});J.aplicarCondicao(P,'Atordoado');assert.equal(P.ficha.concentracao,null,'Atordoado implica Incapacitado');
  assert.throws(()=>J.iniciarConcentracao(P,{n:'Voo',l:3,conc:true}),/Incapacitado/);
  assert.throws(()=>J.iniciarConcentracao(pers([{c:'Wizard',n:5}]),{n:'Luz',l:0}),/não exige/);
});
test('descanso longo (2014): exige 1 PV, restaura PV, metade dos dados de vida (mín. 1), espaços, recursos, exaustão -1 e encerra concentração',()=>{
  const {J,RC}=motor(),P=pers([{c:'Fighter',n:4},{c:'Wizard',n:2}],{pv_atual:3,pv_temp:4});const f=P.ficha;
  f.dvUsados={10:4,6:2};f.slotsUsados=[2,1];f.exaustao=2;f.recursosUsados={'surto-acao':1,'retomar-folego':1};f.concentracao={magia:'x',en:'x',circulo:1};
  RC.usar(f,'recuperacao-arcana',1);
  const r=J.descansoLongo(P);assert.equal(r.ok,true);assert.equal(P.pv_atual,20);assert.equal(P.pv_temp,0);assert.equal(f.exaustao,1);
  assert.equal(f.dvUsados[10],1,'6 dados no total: recupera 3, começando pelos maiores');assert.equal(f.dvUsados[6],2);
  assert.equal(f.slotsUsados.length,0);assert.deepEqual(copia(f.recursosUsados),{});assert.equal(f.concentracao,null);
  const Z=pers([{c:'Fighter',n:3}],{pv_atual:0});assert.equal(J.descansoLongo(Z).ok,false);assert.equal(Z.pv_atual,0);
  const um=pers([{c:'Fighter',n:1}]);um.ficha.dvUsados={10:1};J.descansoLongo(um);assert.equal(um.ficha.dvUsados[10],0,'mínimo 1 dado de vida');
});
test('descanso curto recupera recursos "curto" e Pacto, mas não os de descanso longo, nem PV nem espaços comuns',()=>{
  const {J}=motor(),P=pers([{c:'Fighter',n:9},{c:'Warlock',n:2}],{pv_atual:5});const f=P.ficha;f.slotsUsados=[1];f.pactoUsado=2;f.recursosUsados={'retomar-folego':1,indomavel:1,'surto-acao':1};
  J.descansoCurto(P);assert.equal(f.pactoUsado,0);assert.equal(f.recursosUsados.indomavel,1);assert.ok(!f.recursosUsados['retomar-folego']&&!f.recursosUsados['surto-acao']);assert.equal(P.pv_atual,5);assert.equal(f.slotsUsados[0],1);
});
test('recursos de classe: máximos do Livro do Jogador e uso/recuperação',()=>{
  const {R,RC}=motor(),f={classes:[{c:'Barbarian',n:6},{c:'Monk',n:5}],atributos:{car:14}};
  const m=id=>RC.achar(f,id).max;assert.equal(m('furia'),4);assert.equal(m('ki'),5);
  assert.equal(RC.achar({classes:[{c:'Paladin',n:5}],atributos:{car:14}},'maos-consagradas').max,25);
  assert.equal(RC.achar({classes:[{c:'Bard',n:5}],atributos:{car:16}},'inspiracao').recarga,'curto');
  RC.usar(f,'ki',5);assert.throws(()=>RC.usar(f,'ki',1),/Sem usos/);RC.recuperar(f,'curto');assert.equal(RC.achar(f,'ki').restante,5);
});
test('recuperação arcana: respeita limite, 6º círculo e espaços realmente gastos',()=>{
  const {J}=motor(),P=pers([{c:'Wizard',n:6}]);P.ficha.slotsUsados=[1,1,1];
  assert.throws(()=>J.recuperacaoArcana(P,[3,1]),/limite é 3/);assert.throws(()=>J.recuperacaoArcana(P,[6]),/6º/);
  J.recuperacaoArcana(P,[2,1]);assert.equal(P.ficha.slotsUsados[0],0);assert.equal(P.ficha.slotsUsados[1],0);assert.equal(P.ficha.slotsUsados[2],1);
  assert.throws(()=>J.recuperacaoArcana(P,[1]),/Sem usos|Não há/);
});
test('integração poção + PV a 0 + concentração: curar por item tira da inconsciência',()=>{
  const {J,E,I}=motor(),P=pers([{c:'Fighter',n:3}]);J.dano(P,20);I.adicionar(I.conteinerDe(P),E.itemDoCatalogo('pocao-cura'));
  const r=E.usar(P,P.inventario[0].uid,{rolagens:{0:7}});assert.equal(r.ok,true);assert.equal(P.pv_atual,7);
  assert.ok(!J.temCondicao(P.ficha,'Inconsciente'),'a poção deve passar pelo mesmo caminho de cura');
});

test('a 0 PV: dano absorvido por PV temporários ainda conta falha; crítico conta duas',()=>{
 const {J}=motor(),P=pers([{c:'Fighter',n:3}],{pv_atual:0,pv_temp:5});J.dano(P,2);assert.equal(P.pv_temp,3);assert.equal(P.ficha.morte.falhas,1);J.dano(P,1,{critico:true});assert.equal(P.ficha.morte.morto,true);
});
test('condições: o seletor começa em "Selecionar…" (nunca em Agarrado) e aplicar sem escolher avisa em vez de aplicar',()=>{
  const ui=ler('js/jogo-ui.js'),pj=ler('js/personagem.js');
  assert.match(ui,/<select id="j-condicao"><option value="" selected>Selecionar…<\/option>/);assert.match(ui,/if\(!nome\)throw Error\('Selecione uma condição para aplicar\.'\)/);
  assert.match(pj,/<select id="ef-cond">\$\{opt\("", "Selecionar…", true\)\}/);
  const {J}=motor(),P=pers([{c:'Fighter',n:3}]);assert.throws(()=>J.aplicarCondicao(P,''),/desconhecida/);assert.equal((P.ficha.efeitosAtivos||[]).length,0);
});
test('ficha: Resistência Implacável (traço racial do meio-orc) deixa 1 PV uma vez, registra o uso como recurso e volta no descanso longo; sem o traço nada muda; dano massivo não é salvo',()=>{
  const {J,RC}=motor(),orc=()=>pers([{c:'Fighter',n:3}],{pv_atual:6,pv_max:10,ficha:{raca:'Meio-orc',classes:[{c:'Fighter',n:3}],atributos:{for:14,des:12,con:14,int:10,sab:10,car:10}}});
  const P=orc();assert.ok(RC.calcular(P.ficha).some(r=>r.id==='resistencia-implacavel'&&r.max===1&&r.recarga==='longo'),'aparece nos recursos da ficha');
  let r=J.dano(P,6);assert.equal(P.pv_atual,1);assert.match(r.mensagens.join(' '),/Resistência Implacável/);assert.equal(P.ficha.recursosUsados['resistencia-implacavel'],1);assert.ok(!r.zerou);
  r=J.dano(P,1);assert.equal(P.pv_atual,0,'o uso acabou até o descanso longo');assert.ok(r.zerou);
  P.pv_atual=3;assert.equal(J.descansoLongo(P).ok,true);assert.ok(!P.ficha.recursosUsados['resistencia-implacavel'],'volta no descanso longo');
  const M=orc();M.pv_atual=4;const m=J.dano(M,14);assert.equal(m.morto,true,'sobraram 10 = PV máximo: morte instantânea, a habilidade não ajuda');assert.equal(M.ficha.recursosUsados?.['resistencia-implacavel']||0,0,'não gastou o uso');
  const H=pers([{c:'Fighter',n:3}],{pv_atual:6,pv_max:10,ficha:{raca:'Humano',classes:[{c:'Fighter',n:3}],atributos:{con:14}}});J.dano(H,6);assert.equal(H.pv_atual,0,'sem a característica, cai a 0 PV');
  const C=orc();C.ficha.criacao={};J.dano(C,6,{});const D=orc();J.dano(D,6);assert.equal(D.pv_atual,1);
});
test('ficha: crítico a 0 PV conta 2 falhas e dano igual ou maior que o PV máximo mata; Resistência Implacável por nome da característica, não por personagem',()=>{
  const {J,RC}=motor(),P=pers([{c:'Fighter',n:3}],{pv_atual:0,pv_max:10});P.ficha.morte={sucessos:0,falhas:0,estavel:false,morto:false};
  J.dano(P,3,{critico:true});assert.equal(P.ficha.morte.falhas,2);J.dano(P,10);assert.equal(P.ficha.morte.morto,true);
  const A=pers([{c:'Barbarian',n:3}],{pv_atual:5,pv_max:12,ficha:{raca:'Humano',classes:[{c:'Barbarian',n:3}],caracteristicas:[{nome:'Resistência Implacável',desc:'x'}],atributos:{con:14}}});J.dano(A,5);assert.equal(A.pv_atual,1,'qualquer ficha com a característica (de raça, classe ou item) vale');
  assert.deepEqual(JSON.parse(JSON.stringify(RC.habilidadesQueda({raca:'Meio-orc',classes:[]}).map(h=>h.id))),['resistencia-implacavel']);
});
