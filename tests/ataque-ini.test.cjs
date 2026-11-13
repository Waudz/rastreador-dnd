const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,ler}=require('./helpers.cjs');
const ctx=vm.createContext({window:{},document:undefined});vm.runInContext(ler('js/ataque-ini.js'),ctx);const A=ctx.window.ATAQUE_INI;
const copia=o=>JSON.parse(JSON.stringify(o));
const seq=(...v)=>{let i=0;return()=>v[i++%v.length];};            // rng: v em [0,1) -> d20 = 1+floor(v*20)
const face=(n,f=20)=>(n-1)/f+0.0001;

test('expressões de dano: dados, fixo e inválidas',()=>{
  assert.deepEqual(copia(A.parseExpressao('1d8+3')),[{n:1,f:8,b:3,t:''}]);assert.deepEqual(copia(A.parseExpressao(' 2d6 + 1d4 + 2 ')),[{n:2,f:6,b:2,t:''},{n:1,f:4,b:0,t:''}]);
  assert.deepEqual(copia(A.parseExpressao('1d6-1')),[{n:1,f:6,b:-1,t:''}]);assert.deepEqual(copia(A.parseExpressao('5')),[{n:0,f:0,b:5,t:''}]);
  for(const ruim of ['','abc','d6','1d','0d6','1d1','1d6+','-1d6','1d6*2'])assert.equal(A.parseExpressao(ruim),null,ruim);
});
test('ataque: acerta se total >= CA; 20 natural sempre acerta (crítico); 1 natural sempre erra',()=>{
  let r=A.rolarAtaque({bonus:5,ca:15,rng:seq(face(10))});assert.equal(r.total,15);assert.equal(r.resultado,'acerto');
  r=A.rolarAtaque({bonus:5,ca:16,rng:seq(face(10))});assert.equal(r.resultado,'erro');
  r=A.rolarAtaque({bonus:-5,ca:30,rng:seq(face(20))});assert.equal(r.resultado,'critico');assert.equal(r.acertou,true);
  r=A.rolarAtaque({bonus:20,ca:5,rng:seq(face(1))});assert.equal(r.resultado,'falha-critica');assert.equal(r.acertou,false);
  assert.equal(A.rolarAtaque({bonus:3,rng:seq(face(10))}).resultado,'sem-alvo');
});
test('vantagem pega o maior de dois d20, desvantagem o menor',()=>{
  let r=A.rolarAtaque({bonus:0,ca:10,modo:'vantagem',rng:seq(face(4),face(15))});assert.deepEqual(copia(r.dados),[4,15]);assert.equal(r.nat,15);
  r=A.rolarAtaque({bonus:0,ca:10,modo:'desvantagem',rng:seq(face(4),face(15))});assert.equal(r.nat,4);
  assert.equal(A.rolarAtaque({bonus:0,ca:10,modo:'normal',rng:seq(face(4),face(15))}).dados.length,1);
});
test('dano: soma dados e modificador; crítico dobra os dados mas não o modificador; metade arredonda para baixo; nunca negativo',()=>{
  const partes=[{n:1,f:8,b:3,t:'cortante'}];
  let r=A.rolarDano(partes,{rng:seq(face(5,8))});assert.equal(r.total,8);assert.equal(r.detalhe[0].rolls.length,1);
  r=A.rolarDano(partes,{critico:true,rng:seq(face(5,8),face(6,8))});assert.equal(r.total,5+6+3,'2 dados + 3 (o +3 não dobra)');assert.equal(r.detalhe[0].rolls.length,2);
  r=A.rolarDano(partes,{metade:true,rng:seq(face(6,8))});assert.equal(r.bruto,9);assert.equal(r.total,4);
  assert.equal(A.rolarDano([{n:1,f:4,b:-10,t:''}],{rng:seq(0)}).total,0);
  r=A.rolarDano([{n:2,f:6,b:0,t:'fogo'},{n:1,f:4,b:2,t:'gélido'}],{rng:seq(face(3,6),face(4,6),face(2,4))});assert.equal(r.total,3+4+2+2);assert.match(A.descreverDano(r),/fogo/);
});
test('integração: aplicar dano usa as mesmas estatísticas do botão Dano; criaturas e fichas alimentam o painel; o painel existe na página e no cache',()=>{
  const ini=ler('js/iniciativa.js'),app=ler('js/app.js'),ci=ler('js/campanha-ini.js'),html=ler('iniciativa.html'),sw=ler('sw.js');
  assert.match(ini,/function aplicarDano\(id, amount, quemId\)/);assert.match(ini,/if \(button\.dataset\.damage\) aplicarDano\(id, amount\);/);assert.match(ini,/aplicarDano,\n\s+trocarContexto/);assert.match(ini,/atual: \(\) => currentId/);
  assert.match(app,/window\.__ini\.acoesDe = \(key\)/);assert.match(ci,/window\.__ini\.ataquesDe = \(pid\)/);
  assert.ok(!/id="painel-ataque"/.test(html),"o painel separado foi removido");assert.match(html,/js\/ataque-ini\.js/);assert.match(sw,/"js\/ataque-ini\.js"/);assert.ok(!/painel-ataque/.test(ci),'campanha-ini não depende do painel antigo');
});
test('cada clique em Aplicar aplica o dano uma vez só',()=>{
  const j=ler('js/ataque-ini.js');assert.match(j,/const U = ultimo; ultimo = null;/);assert.match(j,/b\.disabled = true;/);
});
function motorMagias(){const c=vm.createContext({window:{},document:undefined});for(const n of ['origens','regras','magias-jogo','ataque-ini'])vm.runInContext(ler('js/'+n+'.js'),c);return {A:c.window.ATAQUE_INI,R:c.window.REGRAS,M:c.window.MAGIAS_JOGO,cat:JSON.parse(ler('dados/magias.json'))};}
test('magias: o texto do catálogo vira ataque, salvaguarda e dano sugerido (inclusive o "1d1O" com letra O)',()=>{
  const {A,cat}=motorMagias(),por=en=>cat.find(m=>m.en===en);
  let a=A.analisarMagia(por('Fireball'));assert.equal(a.tipo,'salvaguarda');assert.equal(a.atributoSalva,'des');assert.equal(a.metadeNaSalva,true);assert.equal(a.tipoDano,'fogo');assert.equal(A.danoSugerido(por('Fireball'),a,{circulo:3}),'8d6');assert.equal(A.danoSugerido(por('Fireball'),a,{circulo:5}),'8d6+2d6','cada círculo acima do 3º soma 1d6');
  a=A.analisarMagia(por('Fire Bolt'));assert.equal(a.tipo,'ataque');assert.deepEqual(copia(a.dado),{n:1,f:10,b:0});assert.equal(A.danoSugerido(por('Fire Bolt'),a,{nivelTotal:1}),'1d10');assert.equal(A.danoSugerido(por('Fire Bolt'),a,{nivelTotal:5}),'2d10');assert.equal(A.danoSugerido(por('Fire Bolt'),a,{nivelTotal:11}),'3d10');assert.equal(A.danoSugerido(por('Fire Bolt'),a,{nivelTotal:17}),'4d10');
  a=A.analisarMagia(por('Sacred Flame'));assert.equal(a.tipo,'salvaguarda');assert.equal(a.metadeNaSalva,false);
  a=A.analisarMagia(por('Guiding Bolt'));assert.equal(a.tipo,'ataque');assert.equal(A.danoSugerido(por('Guiding Bolt'),a,{circulo:1}),'4d6');assert.equal(A.danoSugerido(por('Guiding Bolt'),a,{circulo:2}),'4d6+1d6');
  a=A.analisarMagia(por('Cure Wounds'));assert.equal(a.dado,null,'cura não é dano');assert.equal(A.danoSugerido(por('Cure Wounds'),a,{circulo:1}),'');
  assert.equal(A.danoSugerido(por('Magic Missile'),A.analisarMagia(por('Magic Missile')),{circulo:1}),'1d4+1');
});
test('magias: CD e ataque de magia por classe (2014: 8 + proficiência + modificador), com bônus temporário; só as magias que se pode conjurar',()=>{
  const {A,M}=motorMagias(),f={classes:[{c:'Wizard',n:5,sub:''},{c:'Cleric',n:1,sub:''}],atributos:{for:8,des:14,con:12,int:16,sab:14,car:10}};
  let st=A.estatisticasMagia(f,{classeConj:'Wizard',l:3});assert.equal(st.cd,8+3+3);assert.equal(st.ataque,3+3);assert.equal(st.nivelTotal,6,'nível total 6 -> proficiência +3');
  st=A.estatisticasMagia(f,{classeConj:'Cleric',l:1});assert.equal(st.cd,8+3+2,'Clérigo usa Sabedoria');
  f.bonusTemp={cdMagia:1};assert.equal(A.estatisticasMagia(f,{classeConj:'Wizard'}).cd,15);
  const fm={classes:[{c:'Bard',n:3,sub:''},{c:'Wizard',n:2,sub:''}],magias:[
   {n:'Truque',en:'T',l:0},{n:'Conhecida de Bardo',en:'B',l:1,classeConj:'Bard',prep:false},{n:'Grimório não preparada',en:'W',l:1,classeConj:'Wizard',prep:false,noGrimorio:true},
   {n:'Preparada',en:'P',l:1,classeConj:'Wizard',prep:true},{n:'Inativa',en:'I',l:5,classeConj:'Wizard',prep:true,ativa:false},{n:'Do mestre',en:'M',l:2,fonte:'mestre',prep:true}]};
  assert.deepEqual(copia(A.conjuraveis(fm,M).map(m=>m.en)),['T','B','P','M'],'não conjura do grimório sem preparar nem magia inativa');
});
test('modo treino: sempre ligado para quem não é mestre da campanha; só o mestre pode desligar; gastar espaço só fora do treino e só com controle de versão',()=>{
  const j=ler('js/ataque-ini.js'),c=ler('js/campanha-ini.js');
  assert.match(j,/const treinoTravado = \(\) => papel\(\) !== "mestre";/);assert.match(j,/const emTreino = \(\) => treinoTravado\(\) \|\| !!estado\(\)\.treino;/);
  assert.match(j,/if \(emTreino\(\) \|\| a\.tipo !== "magia"/,'em treino nada é gasto');
  assert.match(c,/window\.__ini\.papel = \(\) =>/);assert.match(c,/if \(!sincroniza\(\)\) return \{ ok: false, msg: "Só o mestre gasta espaços/);assert.match(c,/&versao=eq\./,'gravação com controle de versão');
});
test('interface única de ataque: faixa "Vez de ..." acima da lista, com ataques rápidos, Outras opções e resultado; sem painel separado nem controles duplicados',()=>{
  const j=ler('js/ataque-ini.js'),html=ler('iniciativa.html'),ini=ler('js/iniciativa.js');
  assert.ok(html.indexOf('id="acoes-da-vez"')>html.indexOf('id="iniciativa-atual"')&&html.indexOf('id="acoes-da-vez"')<html.indexOf('id="combatants"'),'a faixa fica dentro da ordem do combate, acima da lista');
  for(const id of ['vez-topo','vez-avancado','vez-avancado-corpo','vez-res'])assert.match(html,new RegExp('id="'+id+'"'));assert.ok(!/id="atk-(corpo|res|modo|alvo|atacante)"/.test(html+j),'sem controles duplicados do painel antigo');
  assert.match(j,/id="vez-atacante"/);assert.match(j,/id="vez-alvo"/);assert.match(j,/id="vez-modo"/);assert.match(j,/data-vez="\$\{i\}"/);assert.match(j,/data-vez-avancado/);assert.match(j,/Outras opções/);assert.match(j,/id="atk-so-ataque"/);assert.match(j,/id="atk-so-dano"/);assert.match(j,/id="atk-metade"/);assert.match(j,/id="atk-rolar"/);
  assert.match(ini,/data-atacar="\$\{c\.id\}"/);assert.match(ini,/new CustomEvent\("ini:atacar"/);assert.match(j,/window\.addEventListener\?\.\("ini:atacar"/);
});
function ambiente({papelAtual='jogador',fichaConj=null}={}){
  const caches=new Map(),el=()=>{const o={innerHTML:'',hidden:false,listeners:{},dataset:{},style:{},addEventListener(n,f){(o.listeners[n]??=[]).push(f);},querySelector:q=>{if(!caches.has(q))caches.set(q,el());return caches.get(q);},scrollIntoView(){},closest:()=>null,insertAdjacentHTML(_,h){o.innerHTML+=h;}};return o;};
  const faixa=el(),docEls={'acoes-da-vez':faixa},document={getElementById:id=>docEls[id],activeElement:null};
  const lista=[{id:'a',name:'Goblin',kind:'Monstro',hp:7,maxHp:7,ac:13,key:'gob'},{id:'b',name:'Herói',kind:'Personagem',hp:20,maxHp:20,ac:15,pid:'p'}],aplicados=[],espacos=[];let vez='a';
  const ini={list:()=>lista,atual:()=>vez,papel:()=>papelAtual,aoAlterar(){},aplicarDano:(id,n,q)=>{aplicados.push([id,n,q]);lista.find(c=>c.id===id).hp-=n;return true;},
   acoesDe:k=>k==='gob'?[{nome:'Cimitarra',hit:4,dmg:[{n:1,f:6,b:2,t:'cortante'}]},{nome:'Sopro',hit:null,dmg:[{n:2,f:6,b:0,t:'fogo'}]}]:[],ataquesDe:()=>[{nome:'Espada longa',hit:5,dmg:[{n:1,f:8,b:3,t:'cortante'}]}],
   fichaDe:()=>fichaConj,gastarEspaco:async(pid,c)=>{espacos.push([pid,c]);return {ok:true,msg:'Gastou 1 espaço de '+c+'º círculo.'};}};
  const w={__ini:ini,addEventListener(n,f){(w.ev??={})[n]=f;},crypto:{getRandomValues:a=>{a[0]=w.valorDado===undefined?0xFFFFFFFF:Math.floor(w.valorDado*4294967295);return a;}}};
  const c=vm.createContext({window:w,document,crypto:w.crypto,Event:function(){}});for(const n of ['origens','regras','magias-jogo','ataque-ini'])vm.runInContext(ler('js/'+n+'.js'),c);
  const q=s=>faixa.querySelector(s),dispara=(tipo,alvo)=>(faixa.listeners[tipo]||[]).forEach(f=>f({target:{closest:()=>alvo,...alvo}}));
  return {faixa,q,lista,aplicados,espacos,w,ini,setVez:id=>{vez=id;ini.atual=()=>id;},clique:(dataset,id='')=>dispara('click',{dataset,id}),muda:(id,value,checked)=>dispara('change',{id,value,checked}),espera:()=>new Promise(r=>setTimeout(r,5)),
    texto:()=>q('#vez-topo').innerHTML,res:()=>q('#vez-res').innerHTML,avanc:()=>q('#vez-avancado-corpo').innerHTML};
}
test('faixa unificada: aparece com atacante e alvo; resultado e Aplicar só depois de um ataque; Aplicar atua uma vez só',async()=>{
  const t=ambiente();assert.equal(t.faixa.hidden,false);assert.match(t.texto(),/Vez de[\s\S]*Goblin/);assert.match(t.texto(),/Cimitarra \+4/);assert.match(t.texto(),/<option value="b" selected>Herói/);
  assert.equal(t.res(),'','sem ataque, sem resultado nem botão aplicar');assert.equal(t.q('#vez-avancado').hidden,true,'Outras opções começa recolhido');
  t.clique({vez:'0'});await t.espera();assert.match(t.res(),/CRÍTICO/);assert.match(t.res(),/Aplicar \d+ de dano em Herói/);
  t.clique({},'atk-aplicar');assert.equal(t.aplicados.length,1);assert.equal(t.aplicados[0][0],'b');assert.equal(t.aplicados[0][2],'a');
  t.clique({},'atk-aplicar');assert.equal(t.aplicados.length,1);assert.ok(!/id="atk-aplicar"/.test(t.res()));
});
test('ataque rápido com vantagem e desvantagem usa dois d20; ataque sem bônus de acerto pede Só o dano em Outras opções',async()=>{
  const t=ambiente();t.muda('vez-modo','vantagem');t.clique({vez:'0'});await t.espera();assert.match(t.res(),/vantagem/);
  t.muda('vez-modo','desvantagem');t.clique({vez:'0'});await t.espera();assert.match(t.res(),/desvantagem/);
  t.muda('vez-modo','normal');t.clique({vez:'1'});await t.espera();assert.match(t.res(),/não tem bônus de acerto/);
});
test('Outras opções: ataque manual, só ataque, só dano e metade do dano com o mesmo motor e a mesma confirmação',async()=>{
  const t=ambiente();t.clique({vezAvancado:''});assert.equal(t.q('#vez-avancado').hidden,false);assert.match(t.avanc(),/id="atk-so-ataque"/);assert.match(t.avanc(),/id="atk-so-dano"/);assert.match(t.avanc(),/Metade do dano/);assert.match(t.avanc(),/Manual…/);
  t.w.valorDado=0.55;
  t.clique({},'atk-so-ataque');await t.espera();assert.match(t.res(),/<b>Acertou/);assert.ok(!/Dano:/.test(t.res()),'só o ataque não rola dano');assert.ok(!/atk-aplicar/.test(t.res()));
  t.clique({},'atk-so-dano');await t.espera();assert.match(t.res(),/<b>Dano:<\/b> \d+/);assert.match(t.res(),/atk-aplicar/);
  t.muda('atk-ataque','manual');assert.match(t.avanc(),/id="atk-bonus"/);assert.match(t.avanc(),/id="atk-dano"/);
  t.q('#atk-dano').value='2d8+2';t.q('#atk-bonus').value='6';t.q('#atk-metade').checked=true;t.clique({},'atk-so-dano');await t.espera();assert.match(t.res(),/\(de \d+\)/,'metade do dano mostra o bruto');assert.match(t.res(),/\(metade\)/);
  t.q('#atk-dano').value='lixo';t.clique({},'atk-so-dano');await t.espera();assert.match(t.res(),/Dano inválido/);
});
test('magias em Outras opções e nos botões rápidos: ataque de magia e salvaguarda com a CD; treino não gasta espaço e o mestre fora do treino gasta',async()=>{
  const f={classes:[{c:'Wizard',n:5,sub:''}],atributos:{int:16,des:12,con:12,for:10,sab:10,car:10},magias:[
    {n:'Bola de Fogo',en:'Fireball',l:3,prep:true,classeConj:'Wizard',d:'Cada criatura faz uma salvaguarda de Destreza. Se falhar, sofre 8d6 pontos de dano ígneo, ou metade do dano se passar. Em Círculos Superiores o dano aumenta em 1d6 para cada círculo acima do 3º.'},
    {n:'Raio de Fogo',en:'Fire Bolt',l:0,prep:true,classeConj:'Wizard',d:'Faça um ataque mágico. Se acertar, sofre 1d10 pontos de dano ígneo. O dano aumenta em 1d10 no 5º nível (2d10).'}]};
  const t=ambiente({papelAtual:'jogador',fichaConj:f});t.muda('vez-atacante','b');
  assert.match(t.texto(),/Bola de Fogo \(magia\)/);assert.match(t.texto(),/Raio de Fogo \(magia\)/);assert.match(t.texto(),/id="vez-treino" checked disabled/,'jogador: treino sempre ligado e travado');
  t.w.valorDado=0.999;t.clique({vez:'2'});await t.espera();assert.match(t.res(),/conjura Raio de Fogo/);assert.match(t.res(),/CRÍTICO/);assert.match(t.res(),/\[\d+\+\d+\+\d+\+\d+\]/,'2d10 do truque no 5º nível, em dobro no crítico');
  t.clique({vez:'1'});await t.espera();assert.match(t.res(),/CD 14, Destreza/);assert.match(t.res(),/Salvaguarda de Goblin/);assert.equal(t.espacos.length,0,'em treino nada é gasto');
  t.clique({vezAvancado:''});t.muda('atk-ataque','1');assert.match(t.avanc(),/id="atk-circulo"/);assert.match(t.avanc(),/value="8d6"/);t.muda('atk-circulo','5');assert.match(t.avanc(),/value="8d6\+2d6"/,'espaço de 5º círculo');
  const m=ambiente({papelAtual:'mestre',fichaConj:f});m.muda('vez-atacante','b');assert.ok(!/id="vez-treino" checked/.test(m.texto()),'mestre: treino desligado por padrão');
  m.clique({vez:'1'});await m.espera();assert.equal(m.espacos.length,1);assert.deepEqual(m.espacos[0],['p',3]);assert.match(m.res(),/Gastou 1 espaço de 3º círculo/);
  m.muda('vez-treino','',true);m.clique({vez:'1'});await m.espera();assert.equal(m.espacos.length,1,'com o treino ligado não gasta mais');
});
test('botão Atacar do cartão abre a interface unificada com o combatente como atacante, mesmo fora da vez',()=>{
  const t=ambiente();t.setVez(null);t.w.ev['ini:atacar']({detail:{id:'b'}});assert.equal(t.faixa.hidden,false);assert.match(t.texto(),/Ataque de[\s\S]*Herói/);assert.match(t.texto(),/Espada longa \+5/);assert.match(t.texto(),/<option value="a" selected>Goblin/);
});
test('celular: a faixa da vez, o painel Atacar e o cartão da iniciativa têm alvos de toque de 44 px e ficam só no bloco de telas pequenas/toque',()=>{
  const css=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','css','fluxos.css'),'utf8'),i=css.indexOf('/* Celular e telas de toque');
  assert.ok(i>0);const bloco=css.slice(i);assert.match(bloco,/@media \(max-width:760px\), \(pointer:coarse\)/);
  for(const parte of ['.acoes-vez-botoes .small','#vez-avancado select','#ci-lista .ci-cartao-ini .ci-acoes .small','#ci-lista .ci-cartao-ini .ci-ini input','input[type=checkbox]'])assert.ok(bloco.includes(parte),parte);
  assert.equal((bloco.match(/min-height:44px/g)||[]).length>=4,true);assert.ok(!/^\.grupo-cartao|^\.personagem-card/m.test(bloco),'não mexe nos outros cartões');
});
test('defesas do alvo no dano (2014): imunidade zera, resistência divide, vulnerabilidade dobra, cada tipo à parte e antes de "metade"',()=>{
  const seq2=(...v)=>{let i=0;return()=>v[i++%v.length];},partes=[{n:1,f:8,b:2,t:'fogo'},{n:1,f:6,b:0,t:'cortante'}];
  const rng=()=>seq2(face(8,8),face(6,6))(),r0=()=>0.9999;       // dado máximo: 8+2 de fogo, 6 cortante
  let r=A.rolarDano(partes,{rng:r0});assert.equal(r.total,10+6);
  r=A.rolarDano(partes,{rng:r0,defesas:{resistencias:['fire'],imunidades:[],vulnerabilidades:[]}});assert.equal(r.total,5+6);assert.equal(r.ajustes[0].ajuste,'resistência');assert.match(A.descreverDano(r),/fogo \(resistência\)/);
  r=A.rolarDano(partes,{rng:r0,defesas:{resistencias:[],imunidades:['fire'],vulnerabilidades:['slashing']}});assert.equal(r.total,0+12);
  r=A.rolarDano(partes,{rng:r0,defesas:{resistencias:['fire'],imunidades:[],vulnerabilidades:[]},metade:true});assert.equal(r.bruto,11);assert.equal(r.total,5,'a metade vem depois das defesas');
  r=A.rolarDano([{n:1,f:6,b:0,t:'fogo'}],{rng:r0,defesas:{resistencias:['fire'],imunidades:[],vulnerabilidades:['fire']}});assert.equal(r.total,6,'resistência e vulnerabilidade: metade e dobro');
  assert.equal(A.tipoEn('Elétrico'),'lightning');assert.equal(A.tipoEn('ígneo'),'fire');assert.equal(A.tipoEn('energia'),'force');assert.equal(A.tipoEn('xyz'),'');
  r=A.rolarDano([{n:1,f:6,b:0,t:'desconhecido'}],{rng:r0,defesas:{resistencias:['fire'],imunidades:['fire'],vulnerabilidades:[]}});assert.equal(r.total,6,'tipo sem correspondência não é alterado');
});
test('faixa: defesas da criatura aparecem no resultado e a salvaguarda do alvo é automática quando conhecida',async()=>{
  const f={classes:[{c:'Wizard',n:5,sub:''}],atributos:{int:16,des:12,con:12,for:10,sab:10,car:10},magias:[{n:'Bola de Fogo',en:'Fireball',l:3,prep:true,classeConj:'Wizard',d:'Cada criatura faz uma salvaguarda de Destreza. Se falhar, sofre 8d6 pontos de dano ígneo, ou metade do dano se passar.'}]};
  const t=ambiente({papelAtual:'jogador',fichaConj:f});
  t.ini.defesasDe=k=>k==='gob'?{resistencias:['slashing'],imunidades:[],vulnerabilidades:[],naoMagico:true}:null;t.ini.salvaDe=(k,ab)=>k==='gob'&&ab==='des'?7:null;
  t.muda('vez-atacante','b');t.muda('vez-alvo','a');t.w.valorDado=0.999;
  t.clique({vez:'1'});await t.espera();assert.match(t.res(),/Salvaguarda de Goblin: 20 \+ 7 = 27/,'bônus do alvo automático (Destreza do goblin)');assert.match(t.res(),/Defesas de Goblin: resistência a slashing/);
  t.muda('vez-atacante','a');t.muda('vez-alvo','b');t.w.valorDado=0.999;t.clique({vez:'0'});await t.espera();assert.ok(!/Defesas de Herói/.test(t.res()),'a linha de defesas só aparece se o alvo tiver defesas');
});
test('multiataque: repete o ataque escolhido N vezes, cada um com seu d20 e dano, e soma num só Aplicar',async()=>{
  const t=ambiente();t.w.valorDado=0.999;t.muda('vez-vezes','3');t.clique({vez:'0'});await t.espera();
  assert.match(t.res(),/Ataque 1\/3/);assert.match(t.res(),/Ataque 3\/3/);assert.match(t.res(),/Dano 2\/3/);assert.match(t.res(),/Dano total:<\/b> \d+/);assert.equal((t.res().match(/id="atk-aplicar"/g)||[]).length,1,'um só botão Aplicar');
  t.clique({},'atk-aplicar');assert.equal(t.aplicados.length,1);const soma=t.aplicados[0][1];assert.ok(soma>=3*3&&soma<=3*16*2,'total dos três ataques');
  t.muda('vez-vezes','1');t.clique({vez:'0'});await t.espera();assert.ok(!/Ataque 1\/1/.test(t.res()),'um ataque não mostra contagem');
});
test('re-rolar iniciativa: botão d20 em cada cartão usa o bônus do combatente e a rolagem compartilhada; bônus de criaturas e personagens por gancho',()=>{
  const ini=ler('js/iniciativa.js'),app=ler('js/app.js'),ci=ler('js/campanha-ini.js');
  assert.match(ini,/data-reroll="\$\{c\.id\}"/);assert.match(ini,/window\.ROLAGENS\.rolar\("1d20", mod\)/);assert.match(ini,/alvo\.initiative = r\.total; render\(\)/);assert.match(ini,/window\.__ini\.bonusIniciativaDe/);
  assert.match(app,/window\.__ini\.bonusIniciativaDe = \(c\) =>/);assert.match(app,/window\.__ini\.salvaDe = /);assert.match(app,/window\.__ini\.defesasDe = /);assert.match(ci,/window\.__ini\.salvaPersonagem = /);assert.match(ci,/window\.__ini\.defesasPersonagem = /);
});
