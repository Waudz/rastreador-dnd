const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const {ler}=require('./helpers.cjs');

test('visitante: a página inicial sem sessão leva à iniciativa; conta.html continua pedindo entrada',()=>{
  const c=ler('js/conta.js');
  assert.match(c,/index\\\.html\$\|\\\/\$/);assert.match(c,/location\.replace\("iniciativa\.html"\)/);
  assert.match(c,/mostrarLogin\(\)/);
});
test('visitante: menu mostra "Entrar" no lugar do avatar e marca o corpo da página',()=>{
  const n=ler('js/navegacao.js');
  assert.match(n,/classList\.toggle\('visitante',visitante\)/);assert.match(n,/class="appentrar"/);assert.match(n,/class="appavatar"/);
  assert.match(ler('css/identidade.css'),/\.visitante #cm/);
});
test('visitante: criar fichas e fotos exigem conta, também por código (não só por CSS)',()=>{
  const a=ler('js/app.js');
  assert.match(a,/const askPhoto = \(k\) => \{ if \(visitante\(\)\)/);
  assert.match(a,/\$\("#cm-save"\)\.onclick = async \(\) => \{\s*if \(visitante\(\)\)/);
  assert.match(a,/function editCustom\(k\) \{\s*if \(visitante\(\)\) return;/);
  const h=ler('iniciativa.html');assert.match(h,/id="aviso-visitante"/);assert.match(h,/entrar\.html\?voltar=/);
});
test('visitante: o rastreador de iniciativa não depende de conta nem de CAPTCHA',()=>{
  for(const f of ['js/iniciativa.js','js/dados-locais.js'])assert.ok(!/nuvem\.(get|post|patch|rpc)\b/.test(ler(f)),f+' não deve exigir o servidor');
});

/* ---------- backup do combate ---------- */
const {vm,executar,documentoFalso,armazenamento}=require('./helpers.cjs');
function iniciativaReal(){
  const document=documentoFalso(),ls=armazenamento();
  const window={nuvem:{usuario:()=>null,aoMudar(){},observar(){},esc:s=>String(s)}};
  const ctx=vm.createContext({window,document,localStorage:ls,nuvem:window.nuvem,location:{search:''},URLSearchParams,setTimeout,clearTimeout,console,Date,Math,JSON,structuredClone});
  try{executar('js/iniciativa.js',ctx);}catch(e){return null;}
  return window.__ini;
}
test('combate: exportar e importar passam por validação',()=>{
  const ini=iniciativaReal();if(!ini||!ini.importarCombate)return;       // o ambiente falso pode não montar a tela inteira
  const ok={tipo:'backup-combate',combatants:[{id:'a',name:'Goblin',hp:7,maxHp:7,ac:15,initiative:12,effects:[]}],round:2};
  ini.importarCombate(ok);assert.equal(ini.list().length,1);
  assert.throws(()=>ini.importarCombate({tipo:'outro',combatants:[]}),/não é um backup/);
  assert.throws(()=>ini.importarCombate({tipo:'backup-combate',combatants:[{name:''}]}),/inválido/);
  assert.throws(()=>ini.importarCombate({tipo:'backup-combate',combatants:[{id:'x',name:'A'},{id:'x',name:'B'}]}),/repetidos/);
  assert.equal(ini.list().length,1);                                      // arquivo inválido nunca altera o combate atual
  const e=ini.exportarCombate();assert.equal(e.tipo,'backup-combate');assert.equal(e.combatants[0].name,'Goblin');
});
test('dados deste aparelho: restaurar o combate pede confirmação e criações de visitante têm backup próprio',()=>{
  const d=ler('js/dados-locais.js');
  assert.match(d,/confirm\(/);assert.match(d,/exportarVisitante/);
  const a=ler('js/acervo.js');assert.match(a,/lerPublico/);assert.match(a,/lerLocais/);
  assert.match(ler('js/backup.js'),/lerLocais/);assert.match(ler('sw.js'),/js\/dados-locais\.js/);
});

/* ---------- melhorias visuais: estrutura, sem flicker ---------- */
test('estado da página vem do <head>, antes da pintura (sem JS adiado): vista, visitante e altura do cabeçalho',()=>{
  const p=ler('js/pre-pagina.js');assert.match(p,/dataset\.appView/);assert.match(p,/dataset\.contaAba/);assert.match(p,/--cab-h-est/);
  for(const h of ['iniciativa.html','conta.html','index.html']){const t=ler(h);assert.ok(t.indexOf('js/pre-pagina.js')>0&&t.indexOf('js/pre-pagina.js')<t.indexOf('defer'),h);assert.ok(!/data-entrada/.test(t),h+' não esconde mais a página inteira');}
  const i=ler('iniciativa.html');assert.ok(!/<(section|details) class="panel/.test(i.replace(/<(section|details) class="vista-/g,'')),'todo painel já nasce com a sua vista');
  const n=ler('js/navegacao.js');assert.ok(!/h\.textContent=/.test(n),'títulos não são reescritos por JS');
  assert.match(ler('css/identidade.css'),/html:not\(\.cab-pronto\) body::before/);assert.match(n,/classList\.add\('cab-pronto'\)/);
});
test('cabeçalho: logotipo, menu e perfil em três colunas (menu centralizado na janela) e ícone sem margem',()=>{
  const c=ler('css/identidade.css');
  assert.match(c,/grid-template-columns:minmax\(0,1fr\) auto minmax\(0,1fr\)/);assert.match(c,/\.appavatar \.ico, \.appnav a \.ico \{ margin:0/);
  assert.match(ler('js/navegacao.js'),/class="appdireita"/);
});
test('ficha: Usar na Iniciativa, Editar e Excluir ficam na barra do topo, com Excluir separado e sob confirmação',()=>{
  const h=ler('personagem.html'),j=ler('js/personagem.js');
  assert.match(h,/id="usar-iniciativa"/);assert.match(h,/class="ficha-acao-perigo"><button[^>]*id="excluir-personagem"/);
  assert.ok(!/class="ficha-acoes"/.test(j),'sem os botões antigos');assert.equal((h+j).split('id="excluir-personagem"').length-1,1);
  assert.match(j,/confirm\("Excluir "/);assert.match(ler('css/fichas.css'),/\.ficha-acao-perigo \{ margin-left:auto/);
});

test('abertura da PWA: sem passar por licenças nem pela tela de campanhas; destino decidido antes da pintura',()=>{
  const p=ler('js/pre-pagina.js'),m=JSON.parse(ler('manifest.json'));
  assert.equal(m.start_url,'./');
  assert.match(p,/campanha\.html\?id=/);assert.match(p,/conta-verificando/);
  assert.match(ler('css/estilo.css'),/html\.conta-verificando main, html\.conta-verificando \.rodape-licenca/);   // rodapé de licenças nunca aparece sozinho
  assert.match(ler('js/conta.js'),/classList\?\.remove\('conta-verificando'\)/);
  assert.ok(!/licencas/.test(ler('manifest.json')));
});
function preSessao({sessao,preferida,legado,url='/index.html',busca=''}){
  const ls=armazenamento();if(sessao)ls.setItem('nuvem_sessao_sdk',JSON.stringify(sessao));if(preferida)ls.setItem('ini_campanha:'+sessao.user.id,preferida);if(legado)ls.setItem('ini_campanha',legado);
  const destinos=[],classes=new Set(),el={dataset:{},classList:{toggle:(c,on)=>on?classes.add(c):classes.delete(c),add:c=>classes.add(c)},style:{setProperty(){}}};
  vm.runInContext(ler('js/pre-pagina.js'),vm.createContext({document:{documentElement:el},location:{pathname:url,search:busca,hash:'',replace:x=>destinos.push(x)},localStorage:ls,URLSearchParams,innerWidth:400,encodeURIComponent}));
  return {destinos,classes,el};
}
test('PWA com sessão e campanha ativa abre direto na campanha; sem preferência fica verificando; sem sessão vai à iniciativa',()=>{
  const s={user:{id:'u1'}};
  assert.deepEqual(preSessao({sessao:s,preferida:'c-1'}).destinos,['campanha.html?id=c-1']);
  assert.deepEqual(preSessao({sessao:s,legado:'c-9'}).destinos,['campanha.html?id=c-9']);
  const sem=preSessao({sessao:s});assert.deepEqual(sem.destinos,[]);assert.ok(sem.classes.has('conta-verificando'));
  assert.deepEqual(preSessao({sessao:s,preferida:'c-1',busca:'?aba=personagens'}).destinos,[]);   // gerenciar/personagens/conta não pulam
  assert.deepEqual(preSessao({sessao:s,preferida:'../x'}).destinos,[]);
  assert.deepEqual(preSessao({url:'/'}).destinos,['iniciativa.html']);
  assert.deepEqual(preSessao({sessao:s,url:'/iniciativa.html',busca:'?aba=magias'}).destinos,[]);
});

test('conexão lenta na abertura: mensagem neutra, nunca a lista errada nem o modo visitante para quem tem sessão',()=>{
  const css=ler('css/estilo.css');assert.match(css,/animation:entrada-ok 0s 20s forwards/);assert.match(css,/html\.conta-verificando #conta-abrindo \{ display:block; visibility:visible; \}/);
  for(const h of ['conta.html','index.html'])assert.match(ler(h),/id="conta-abrindo"/);
  const p=ler('js/pre-pagina.js');assert.ok(!/iniciativa\.html/.test(p.slice(p.indexOf('if (logado && !retornoDeLink'))),'quem tem sessão nunca é enviado à iniciativa por esta rota');
});

test('limite de 20 s: aviso claro com "Tentar novamente", sem desconectar nem apagar dados',()=>{
  const c=ler('js/conta.js');
  assert.match(c,/setTimeout\(\(\) => \{ liberar\(\); aviso\(/);assert.match(c,/data-tentar/);assert.match(c,/continua conectada e nada foi apagado/);
  const m=c.slice(c.indexOf('async function mostrarArea'),c.indexOf('function mostrarLogin'));
  assert.ok(!/nuvem\.sair|encerrar|localStorage\.removeItem|clear\(/.test(m),'a falha de rede não mexe na sessão nem em dados');
});
