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
  assert.match(html,/id="painel-ataque"/);assert.match(html,/js\/ataque-ini\.js/);assert.match(sw,/"js\/ataque-ini\.js"/);assert.match(ci,/'adicionar-combatente','painel-ataque'/);
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
test('faixa "Vez de ...": quem está na vez, escolher em quem atacar e qual ataque, rolando ataque e dano num clique; o painel Atacar fica dentro da ordem do combate com botão Atacar em cada cartão',()=>{
  const j=ler('js/ataque-ini.js'),html=ler('iniciativa.html'),ini=ler('js/iniciativa.js');
  assert.match(html,/id="acoes-da-vez"/);assert.ok(html.indexOf('id="acoes-da-vez"')<html.indexOf('id="combatants"')&&html.indexOf('id="painel-ataque"')<html.indexOf('id="combatants"'),'painel e faixa ficam acima da lista, não no fim da página');
  assert.ok(html.indexOf('id="painel-ataque"')>html.indexOf('id="iniciativa-atual"')&&html.indexOf('id="painel-ataque"')<html.indexOf('id="camp-ini"'),'o painel está dentro da seção da ordem do combate');
  assert.match(j,/<b>Vez de \$\{esc\(atk\.name\)\}<\/b>/);assert.match(j,/id="vez-alvo"/);assert.match(j,/data-vez="\$\{i\}"/);assert.match(j,/rolar\("tudo", \{ rapido: true/);assert.match(j,/const cur = window\.__ini\.atual\?\.\(\), l = lista\(\), atk = l\.find/);
  assert.match(j,/if \(!sel\.manualAtacante && cur/,'sem escolha manual, o atacante acompanha a vez');assert.match(ini,/data-atacar="\$\{c\.id\}"/);assert.match(ini,/new CustomEvent\("ini:atacar"/);
});
test('faixa da vez roda de verdade: lista ataques de quem está na vez, rola no clique e o botão Aplicar reduz os PV uma vez só',async()=>{
  const el=()=>{const o={innerHTML:'',hidden:false,open:false,value:'',listeners:{},dataset:{},style:{},addEventListener(n,f){(o.listeners[n]??=[]).push(f);},querySelector:s=>caches.get(s)||(caches.set(s,el()),caches.get(s)),insertAdjacentHTML(_,h){o.innerHTML+=h;},scrollIntoView(){},closest:()=>null};return o;},caches=new Map();
  const faixa=el(),raiz=el(),res=el(),docEls={'painel-ataque':raiz,'acoes-da-vez':faixa};
  const document={getElementById:id=>docEls[id],querySelector:s=>s==='#vez-res'?res:null,activeElement:null};
  const lista=[{id:'a',name:'Goblin',kind:'Monstro',hp:7,maxHp:7,ac:13,key:'gob'},{id:'b',name:'Herói',kind:'Personagem',hp:20,maxHp:20,ac:15}],aplicados=[];
  const ini={list:()=>lista,atual:()=>'a',papel:()=>'jogador',acoesDe:k=>k==='gob'?[{nome:'Cimitarra',hit:4,dmg:[{n:1,f:6,b:2,t:'cortante'}]}]:[],aoAlterar(){},aplicarDano:(id,n,q)=>{aplicados.push([id,n,q]);lista.find(c=>c.id===id).hp-=n;return true;}};
  const w={__ini:ini,addEventListener(){},crypto:{getRandomValues:a=>{a[0]=0xFFFFFFFF;return a;}}};   // d20 = 20: crítico
  const c=vm.createContext({window:w,document,crypto:w.crypto,Event:function(){}});vm.runInContext(ler("js/ataque-ini.js"),c);
  assert.equal(faixa.hidden,false);assert.match(faixa.innerHTML,/Vez de Goblin/);assert.match(faixa.innerHTML,/Cimitarra \+4/);assert.match(faixa.innerHTML,/<option value="b" selected>Herói/,'o alvo padrão é o adversário');
  const clique=sel=>faixa.listeners.click.forEach(f=>f({target:{closest:()=>sel}}));
  clique({dataset:{vez:'0'},id:''});await new Promise(r=>setTimeout(r,5));
  assert.match(res.innerHTML,/CRÍTICO/);assert.match(res.innerHTML,/Aplicar \d+ de dano em Herói/);
  clique({dataset:{},id:'atk-aplicar',disabled:false});assert.equal(aplicados.length,1);assert.equal(aplicados[0][0],'b');assert.equal(aplicados[0][2],'a');
  clique({dataset:{},id:'atk-aplicar',disabled:false});assert.equal(aplicados.length,1,'o segundo clique não aplica de novo');assert.ok(!/id="atk-aplicar"/.test(res.innerHTML),'o botão some depois de aplicar');
});
test('celular: a faixa da vez, o painel Atacar e o cartão da iniciativa têm alvos de toque de 44 px e ficam só no bloco de telas pequenas/toque',()=>{
  const css=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','css','fluxos.css'),'utf8'),i=css.indexOf('/* Celular e telas de toque');
  assert.ok(i>0);const bloco=css.slice(i);assert.match(bloco,/@media \(max-width:760px\), \(pointer:coarse\)/);
  for(const parte of ['.acoes-vez-botoes .small','#painel-ataque select','#ci-lista .ci-cartao-ini .ci-acoes .small','#ci-lista .ci-cartao-ini .ci-ini input','input[type=checkbox]'])assert.ok(bloco.includes(parte),parte);
  assert.equal((bloco.match(/min-height:44px/g)||[]).length>=4,true);assert.ok(!/^\.grupo-cartao|^\.personagem-card/m.test(bloco),'não mexe nos outros cartões');
});
