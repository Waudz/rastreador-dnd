const {test}=require("node:test"),assert=require("node:assert/strict");
const {vm,executar,documentoFalso,armazenamento,tick}=require("./helpers.cjs");
async function fixture({sheet={pv:12},search="?campanha=antiga",erro=false,user={id:"mestre"},ficha={},papel='mestre',autorizado=true}={}){
  const document=documentoFalso(),localStorage=armazenamento(),lista=[],consultas=[],rpcs=[],eventos={};let atualizar;
  localStorage.setItem("ini_campanha","antiga");
  const nuvem={usuario:()=>user,esc:s=>String(s??""),rpc:async n=>{rpcs.push(n);return autorizado;},observar(fn){atualizar=fn;},get:async q=>{
    consultas.push(q);if(erro)throw Error("Permissão recusada");
    return q.startsWith("membros")?[{papel,campanha:{id:"antiga",nome:"Antiga"}},{papel,campanha:{id:"atual",nome:"Atual"}}]:[{id:"p",nome:"Herói",pv_atual:sheet.pv,pv_max:15,ca:13,ficha:{foto:"data:image/png;base64,FOTO",classes:[{c:"Bard",n:2}],atributos:{des:14},...ficha}}];
  }};
  const window={nuvem,addEventListener:(n,fn)=>eventos[n]=fn,__ini:{list:()=>lista,add:c=>lista.push(c),render(){}}};
  const c=vm.createContext({window,nuvem,document,location:{search,origin:'http://localhost'},localStorage,URLSearchParams,setInterval(){}});
  executar("js/origens.js",c);executar("js/regras.js",c);c.REGRAS=window.REGRAS;executar('js/ficha-componentes.js',c);executar('js/rolagens.js',c);executar('js/grupo-personagens.js',c);executar("js/campanha-ini.js",c);await tick();
  return {document,lista,consultas,rpcs,atualizar,nuvem,eventos,window,sheet};
}
test("link da campanha escolhe a campanha atual em vez da preferência antiga",async()=>{
  const f=await fixture({search:"?campanha=atual&personagem=p"});
  assert.equal(f.document.el("iniciativa-atual").hidden,false);assert(f.consultas.some(q=>q.includes("campanha_id=eq.atual")));
  assert.equal(f.lista.length,1);assert.equal(f.lista[0].pid,"p");assert.equal(f.lista[0].foto,"data:image/png;base64,FOTO");
});

test('sem campanha na URL restaura a preferência validada antes de carregar personagens',async()=>{const f=await fixture({search:''});assert.equal(f.document.el('iniciativa-atual').hidden,false);assert(f.consultas.some(q=>q.includes('campanha_id=eq.antiga')));});
test("adicionar manualmente preserva foto e evita duplicação",async()=>{
  const f=await fixture({search:"?campanha=atual"});
  const e={target:{closest:s=>s==="[data-ci]"?{dataset:{ci:"p"}}:null}};
  f.document.el("camp-ini").events.click(e);f.document.el("camp-ini").events.click(e);
  assert.equal(f.lista.length,1);assert.equal(f.lista[0].initiative,null);assert.equal(f.lista[0].maxHp,15);assert.equal(f.lista[0].campanhaId,"atual");
});
test("erro de acesso é exibido em vez de esconder o painel",async()=>{
  const f=await fixture({erro:true});assert.equal(f.document.el("camp-ini").hidden,false);assert.match(f.document.el("ci-msg").innerHTML,/Permissão recusada/);
});
test("visitante: o painel de campanhas fica oculto e nada é consultado",async()=>{
  const f=await fixture({user:null});assert.equal(f.consultas.length,0);assert.equal(f.document.el("camp-ini").hidden,true);
});

test("clique no personagem abre o resumo lateral",async()=>{
 const f=await fixture();f.document.el("camp-ini").events.click({target:{closest:s=>s==="[data-ci-resumo]"?{dataset:{ciResumo:"p"}}:null}});
 assert.equal(f.document.el("ci-resumo").hidden,false);assert.match(f.document.el("ci-resumo-corpo").innerHTML,/Herói/);assert.match(f.document.el("ci-resumo-corpo").innerHTML,/personagem.html\?id=p&modo=painel/);
 f.document.el("ci-resumo-fechar").events.click();assert.equal(f.document.el("ci-resumo").hidden,true);
});
test("consulta automática sem alterações não refaz a grade nem exibe carregamento",async()=>{
 const f=await fixture();let escritas=0,html=f.document.el("ci-lista").innerHTML;
 Object.defineProperty(f.document.el("ci-lista"),"innerHTML",{get:()=>html,set:v=>{html=v;escritas++;}});
 await f.atualizar();assert.equal(escritas,0);assert.equal(f.document.el("ci-msg").innerHTML,"");
});
test("normalização de HTML pelo navegador não provoca redesenho em cada consulta",async()=>{const f=await fixture();let escritas=0;Object.defineProperty(f.document.el('ci-lista'),'innerHTML',{get:()=>'<article>HTML normalizado pelo navegador</article>',set(){escritas++;}});await f.atualizar();assert.equal(escritas,0);});

test('jogador usa a iniciativa: vê só os próprios personagens, pode adicioná-los e nunca sincroniza PV com a ficha nem depende de ser mestre',async()=>{
 const f=await fixture({papel:'jogador',user:{id:'jog'},search:'?campanha=atual'});
 assert.equal(f.document.el('camp-ini').hidden,false);assert.equal(f.document.el('iniciativa-atual').hidden,false);assert.equal(f.document.el('adicionar-combatente').hidden,false);
 assert.equal(f.document.el('ini-sem-campanha').hidden,true,'não pede para selecionar campanha quando já está em uma');
 const q=f.consultas.find(q=>q.startsWith('personagens'));assert.ok(q&&q.includes('dono_id=eq.jog'),'só os próprios personagens');
 assert.ok(!f.rpcs.includes('eh_mestre'),'o jogador não passa pela verificação de mestre');
 f.document.el('camp-ini').events.click({target:{closest:s=>s==='[data-ci]'?{dataset:{ci:'p'}}:null}});assert.equal(f.lista.length,1);assert.equal(f.lista[0].pid,'p');
 const fonte=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','js','campanha-ini.js'),'utf8');
 assert.match(fonte,/setInterval\(async\(\)=>\{\s*if\(!sincroniza\(\)/,'a gravação de PV na ficha é só do mestre');
 assert.match(fonte,/e\.origin!==location\.origin/);assert.ok(!/sincroniza\(\)[^;]*jogador\s*=\s*true/.test(fonte));
});
test('revogação do papel no servidor impede consulta mesmo com campanha na interface',async()=>{
 const f=await fixture({autorizado:false});
 assert.equal(f.document.el('camp-ini').hidden,true);
 assert(!f.consultas.some(q=>q.startsWith('personagens')));
});
test('abrir e fechar a mesma ficha preserva a iniciativa e o estado do combate',async()=>{
 const f=await fixture({search:'?campanha=atual&personagem=p'});
 f.lista[0].initiative=-2;f.lista[0].order=4;
 const antes=JSON.stringify(f.lista);
 f.document.el('camp-ini').events.click({target:{closest:s=>s==='[data-ci-resumo]'?{dataset:{ciResumo:'p'}}:null}});
 f.document.el('ci-resumo-fechar').events.click();
 assert.equal(JSON.stringify(f.lista),antes);
 assert.match(f.document.el('ci-resumo-corpo').innerHTML,/<iframe[^>]+personagem.html/);
});
test('mensagem de outra origem não altera PV nem consulta o banco',async()=>{
 const f=await fixture();const antes=f.consultas.length;
 await f.eventos.message({origin:'https://externo.invalid',data:{tipo:'ficha-salva',id:'p'},source:{}});
 assert.equal(f.consultas.length,antes);
});
test('salvamento da ficha é relido do banco e atualiza combate sem mudar iniciativa',async()=>{
 const f=await fixture({search:'?campanha=atual&personagem=p'});
 f.lista[0].initiative=17;f.lista[0].order=2;f.lista[0].hp=3;
 const frame=f.document.el('ci-ficha-frame');frame.contentWindow={};frame.dataset={personagem:'p'};
 await f.eventos.message({origin:'http://localhost',source:frame.contentWindow,data:{tipo:'ficha-salva',id:'p'}});
 assert.equal(f.lista[0].hp,12);assert.equal(f.lista[0].initiative,17);assert.equal(f.lista[0].order,2);
});
test('dano no combate durante gravação da ficha é conciliado sem perder alterações',async()=>{
 const f=await fixture({search:'?campanha=atual&personagem=p'}),frame=f.document.el('ci-ficha-frame');
 frame.contentWindow={};frame.dataset={personagem:'p'};
 const mensagem=tipo=>({origin:'http://localhost',source:frame.contentWindow,data:{tipo,id:'p'}});
 await f.eventos.message(mensagem('ficha-salvando'));
 f.lista[0].hp=10;
 const get=f.nuvem.get;f.nuvem.get=async q=>{const r=await get(q);if(q.startsWith('personagens'))r[0].pv_atual=9;return r;};
 let gravado;f.nuvem.patch=async(_q,d)=>{gravado=d.pv_atual;return[{versao:2}];};
 await f.eventos.message(mensagem('ficha-salva'));
 assert.equal(f.lista[0].hp,7);assert.equal(gravado,7);
});

test('seleção em lote rola só os escolhidos e preserva quem já está em combate',async()=>{
 const f=await fixture();f.lista.push({pid:'existente',name:'Existente',initiative:19,hp:8});
 f.window.ROLAGENS.rolar=(expressao,bonus)=>{assert.equal(expressao,'1d20');assert.equal(bonus,3);return {total:13};};
 f.document.el('camp-ini').events.change({target:{dataset:{ciSel:'p'},checked:true}});
 assert.match(f.document.el('ci-selecao').innerHTML,/Rolar iniciativa \(1\)/);
 f.document.el('camp-ini').events.click({target:{closest:s=>s==='#ci-rolar'?{}:null}});await tick();
 assert.equal(f.lista.length,2);assert.equal(f.lista[0].initiative,19);assert.equal(f.lista[1].initiative,13);
 assert.equal(f.lista[1].pid,'p');assert.equal(f.lista[1].hp,12);assert.equal(f.lista[1].ac,13);
 f.document.el('camp-ini').events.click({target:{closest:s=>s==='#ci-rolar'?{}:null}});await tick();assert.equal(f.lista.length,2);
});
test('selecionar e desmarcar todos não adiciona participantes por conta própria',async()=>{
 const f=await fixture();const click=id=>f.document.el('camp-ini').events.click({target:{closest:s=>s===id?{}:null}});
 click('#ci-todos');assert.match(f.document.el('ci-selecao').innerHTML,/Rolar iniciativa \(1\)/);assert.equal(f.lista.length,0);
 click('#ci-nenhum');assert.equal(f.document.el('ci-selecao').innerHTML,'');
});
test('permissão revogada após selecionar impede a adição em lote',async()=>{
 const f=await fixture();f.document.el('camp-ini').events.change({target:{dataset:{ciSel:'p'},checked:true}});
 f.nuvem.rpc=async()=>false;f.document.el('camp-ini').events.click({target:{closest:s=>s==='#ci-rolar'?{}:null}});await tick();
 assert.equal(f.lista.length,0);assert.equal(f.document.el('camp-ini').hidden,true);
});
test('pedido por URL valida os IDs na campanha e não duplica personagens',async()=>{
 const f=await fixture({search:'?campanha=atual&personagens=p,p,inacessivel&rolar=1'});
 assert.equal(f.lista.length,1);assert.equal(f.lista[0].pid,'p');assert.ok(Number.isFinite(f.lista[0].initiative));
 assert.equal(f.lista[0].campanhaId,'atual');
});
test('quem tem conta mas nenhuma campanha ativa usa o rastreador sozinho, sem depender do mestre',async()=>{
 const f=await fixture({search:'',papel:'jogador',user:{id:'jog'}});f.document.el('ini-sem-campanha').hidden=false;
 const g=await fixture({search:'?campanha=inexistente',papel:'jogador',user:{id:'jog'}});
 assert.equal(g.document.el('iniciativa-atual').hidden,false);assert.equal(g.document.el('adicionar-combatente').hidden,false);assert.equal(g.document.el('ini-sem-campanha').hidden,true);
});
test('monstros padrão do SRD não têm Excluir nem Traduzir; só as criações do usuário têm Editar e Excluir',()=>{
 const fonte=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','js','app.js'),'utf8');
 assert.ok(!/data-tr="\$\{k\}"/.test(fonte),'sem botão Traduzir');
 assert.match(fonte,/m\.custom \? `<button class="small" data-edit="\$\{k\}">Editar<\/button><button class="small danger" data-del="\$\{k\}">Excluir<\/button>` : ""/);
 assert.match(fonte,/if \(!m \|\| !m\.custom\) return;/);
 const pt=JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname,'..','dados','srd-pt.json'),'utf8')).M,b=JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname,'..','dados','bestiario','srd-2014.json'),'utf8'));
 assert.deepEqual(b.monsters.filter(m=>!pt[m.name.toLowerCase()]).map(m=>m.name),[],'todo monstro do SRD tem nome em português');
});
test('adicionar monstro pelo bestiário responde na hora: aviso, contagem da criatura e botão confirmando',()=>{
 const fonte=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','js','app.js'),'utf8'),html=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','iniciativa.html'),'utf8');
 assert.match(fonte,/window\.FEEDBACK\?\.mostrar\(`“\$\{nome\}” adicionado à iniciativa\./);assert.match(fonte,/Já são \$\{qtd\} desta criatura no combate/);
 assert.match(fonte,/botao\.textContent = qtd > 1 \? "Adicionado \(" \+ qtd \+ "\)" : "Adicionado"/);assert.match(fonte,/addMon\(m, t\.closest\("\[data-add\]"\)\)/);
 assert.match(html,/js\/feedback\.js/,'a página da iniciativa carrega o aviso');
});

test('PV alterados na ficha aparecem no combate (jogador), inclusive depois de recarregar a página; "Atualizar personagens" força a sincronia',async()=>{
 const f=await fixture({papel:'jogador',user:{id:'jog'},search:'?campanha=atual'});
 f.lista.push({name:'Herói',kind:'Personagem',hp:5,maxHp:15,ac:13,pid:'p',key:''});   // combatente restaurado do aparelho, com PV antigo
 await f.atualizar();assert.equal(f.lista[0].hp,5,'primeira leitura só registra a ficha');
 f.sheet.pv=9;await f.atualizar();assert.equal(f.lista[0].hp,9,'a ficha mudou: o combate acompanha');
 f.lista[0].hp=2;await f.atualizar();assert.equal(f.lista[0].hp,2,'dano feito no combate não é desfeito sem mudança na ficha');
 f.document.el('camp-ini').events.click({target:{closest:s=>s==='#ci-recarregar'?{}:null}});await new Promise(r=>setTimeout(r,20));
 assert.equal(f.lista[0].hp,9,'o botão Atualizar personagens traz os PV da ficha');
});
test('Rolar iniciativa mostra o resultado dos dados na tela (d20, bônus e total) e adiciona com o total',async()=>{
 const f=await fixture({search:'?campanha=atual&personagens=p'});
 const r=f.document.el('ci-resultado').innerHTML;assert.match(r,/Herói: d20 \d+ \+ 3 = \d+ \(rolado\)/,'Destreza 14 (+2) mais o bônus de Bardo (+1)');
 assert.equal(f.lista.length,1);assert.ok(Number.isInteger(f.lista[0].initiative));
 assert.match(f.document.el('ci-resultado').innerHTML,/<strong>Iniciativa<\/strong>/);
});
test('o jogador ou mestre pode digitar a iniciativa (dado físico); número inválido é recusado; vazio deixa sem iniciativa',async()=>{
 const f=await fixture({search:'?campanha=atual'});const box=f.document.el('camp-ini'),digitar=v=>box.events.input({target:{dataset:{ciIni:'p'},value:v}}),clicar=()=>box.events.click({target:{closest:s=>s==='[data-ci]'?{dataset:{ci:'p'}}:null}});
 digitar('abc');clicar();assert.equal(f.lista.length,0,'inválido não adiciona');assert.match(f.document.el('ci-msg').innerHTML,/Iniciativa inválida/);
 digitar('17');clicar();assert.equal(f.lista.length,1);assert.equal(f.lista[0].initiative,17);assert.match(f.document.el('ci-resultado').innerHTML,/Herói: 17 \(informado por você\)/);
 const g=await fixture({search:'?campanha=atual'});const b2=g.document.el('camp-ini');b2.events.click({target:{closest:s=>s==='[data-ci]'?{dataset:{ci:'p'}}:null}});assert.equal(g.lista[0].initiative,null);assert.match(g.document.el('ci-resultado').innerHTML,/entrou sem iniciativa/);
});
test('cartão da iniciativa: identidade em cima e ações embaixo (campo Ini., Rolar d20, Adicionar), resultado no cartão; CSS restrito ao #ci-lista para não afetar outros cartões',async()=>{
 const f=await fixture({search:'?campanha=atual'});const h=f.document.el('ci-lista').innerHTML;
 assert.match(h,/class="ci-cartao grupo-cartao ci-cartao-ini"><div class="ci-topo">/);assert.match(h,/<div class="ci-acoes"><label class="ci-ini"><span>Ini\.<\/span><input type="number"[^>]*data-ci-ini="p"/);
 assert.match(h,/data-ci-rolar="p"[^>]*>Rolar d20<\/button><button type="button" class="small primary" data-ci="p"[^>]*>Adicionar<\/button>/);
 f.document.el('camp-ini').events.click({target:{closest:s=>s==='[data-ci-rolar]'?{dataset:{ciRolar:'p'}}:s==='button'?null:null}});
 assert.match(f.document.el('ci-lista').innerHTML,/<p class="ci-ini-res" role="status">d20 \d+ \+ 3 = \d+<\/p>/,'o resultado aparece no próprio cartão');
 const css=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','css','fluxos.css'),'utf8'),bloco=css.slice(css.indexOf('/* Iniciativa dos personagens: cartão em duas linhas'),css.indexOf('/* Celular e telas de toque'));
 for(const regra of bloco.split('\n').filter(l=>l.includes('{')&&!l.startsWith('/*')&&!l.startsWith('.ci-resultado')))assert.ok(regra.startsWith('#ci-lista .ci-cartao'),'regra restrita: '+regra.slice(0,60));
});
test('Adicionar combatente: prévia do monstro (foto, nome, CA, PV, iniciativa), botão d20 com a conta, resultado editável, Adicionar em destaque; improvisados e iniciativa em branco continuam',()=>{
  const fs=require('node:fs'),lerA=p=>fs.readFileSync(require('node:path').join(__dirname,'..',p),'utf8'),html=lerA('iniciativa.html'),app=lerA('js/app.js'),ini=lerA('js/iniciativa.js'),css=lerA('css/fluxos.css'),ic=lerA('js/icones.js');
  assert.match(html,/id="add-previa"/);assert.match(html,/id="add-d20"[^>]*aria-label="Rolar 1d20 mais o modificador de iniciativa"><i data-i="d20">/);assert.match(html,/<input id="initiative"[^>]*step="1"[^>]*placeholder/);assert.ok(!/id="initiative"[^>]*required/.test(html),'iniciativa pode ficar em branco (pendente)');
  assert.match(html,/<input id="name"[^>]*required/,'só o nome é obrigatório para um combatente improvisado');assert.match(ic,/d20: '/);
  assert.match(app,/window\.ROLAGENS\.rolar\("1d20", mod\)/,'usa a rolagem compartilhada, sem duplicar');assert.match(app,/\$\{av\(m, 56\)\}/,'foto cadastrada ou inicial do nome quando não há imagem');assert.match(app,/Valor informado por você/);
  assert.match(ini,/initiative: \$\("initiative"\)\.value\.trim\(\) === "" \? null : Number\(\$\("initiative"\)\.value\)/,'o campo é o resultado final, sem somar o modificador duas vezes');
  assert.match(css,/#add-form \.add-wrap button \{ width:100%; min-height:46px/);assert.ok(!/^\.form-grid|^\.add-wrap/m.test(css.slice(css.indexOf('/* Iniciativa: "Adicionar combatente"'))),'regras restritas ao #add-form');
});
test('ganchos de ataque dos personagens: salvaguarda (proficiência da classe inicial), resistências da ficha e bônus de iniciativa',async()=>{
 const f=await fixture({search:'?campanha=atual',ficha:{classes:[{c:'Fighter',n:5,sub:''}],atributos:{for:16,des:14,con:14,int:10,sab:10,car:10},resistencias:'Resistência a fogo e cortante'}});
 const I=f.window.__ini;assert.equal(I.salvaPersonagem('p','for'),3+3,'Força 16 (+3) mais proficiência +3 (Guerreiro tem Força e Constituição)');assert.equal(I.salvaPersonagem('p','des'),2,'Destreza 14 sem proficiência');
 f.window.ATAQUE_INI={tipoEn:t=>({fogo:'fire',cortante:'slashing'}[t]||'')};const d=I.defesasPersonagem('p');assert.deepEqual(JSON.parse(JSON.stringify(d.resistencias.sort())),['fire','slashing']);
 assert.equal(typeof I.bonusIniciativaDe({pid:'p'}),'number');assert.equal(I.bonusIniciativaDe({pid:'p'}),2+1*0+(I.bonusIniciativaDe({pid:'p'})-2),'usa a rotina compartilhada do grupo');
});
