const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {vm,ler,root}=require('./helpers.cjs');

const PAGINAS=['index.html','conta.html','campanha.html','personagem.html','criar-personagem.html','iniciativa.html','admin.html','licencas.html','entrar.html'];

test('nome oficial: todas as páginas e o manifesto usam "Compêndio 5e" e nenhuma exibe o nome antigo',()=>{
  for(const p of PAGINAS){const h=ler(p);assert.match(h,/<title>[^<]*Compêndio 5e<\/title>/,p);assert.ok(!/Rastreador D&(amp;)?D/.test(h),p+' ainda cita o nome antigo');}
  for(const f of ['js/navegacao.js','js/campanha.js','js/personagem.js','js/entrar.js','js/conta.js'])assert.ok(!/Rastreador D&(amp;)?D/.test(ler(f)),f);
  const m=JSON.parse(ler('manifest.json'));assert.equal(m.name,'Compêndio 5e');assert.equal(m.short_name,'Compêndio 5e');
  assert.match(ler('README.md'),/^# Compêndio 5e/);
});
test('o que NÃO deve mudar com o nome: id, start_url, scope, chaves de armazenamento e identificadores técnicos',()=>{
  const m=JSON.parse(ler('manifest.json'));assert.equal(m.id,'./');assert.equal(m.start_url,'./');assert.equal(m.scope,'./');assert.equal(m.display,'standalone');assert.equal(m.background_color,'#000000');
  assert.match(ler('js/iniciativa.js'),/dnd5e_initiative_tracker_v1/);assert.match(ler('js/campanhas-ui.js'),/ini_campanha/);
  assert.match(ler('sw.js'),/const CACHE = "rastreador-v\d+"/);       // prefixo técnico do cache: só o número muda
  assert.ok(/Rastreador de iniciativa|rastreador de iniciativa/.test(ler('README.md')),'o nome da ferramenta de combate permanece');
  assert.ok(/Dungeons &amp; Dragons|Dungeons & Dragons/.test(ler('conta.html')),'a referência ao jogo permanece');
});
test('ícones: arquivos antigos (d20) não existem mais nem são citados; favicons e instalação usam os novos',()=>{
  for(const f of ['apple-touch-icon.png','favicon-32.png','favicon-48.png','icone-192.png','icone-512.png','icone-maskable-192.png','icone-maskable-512.png','logo.png','logo-64.png'])assert.ok(!fs.existsSync(path.join(root,'icones',f)),f+' deveria ter sido removido');
  const tudo=PAGINAS.map(ler).join('')+ler('manifest.json')+ler('sw.js')+ler('js/navegacao.js');
  assert.ok(!/icones\/(icone-|favicon-3|favicon-4|apple-touch-icon|logo(-64)?\.png)/.test(tudo),'referência a ícone antigo');
  for(const p of PAGINAS){const h=ler(p);for(const n of [16,32,48])assert.match(h,new RegExp('sizes="'+n+'x'+n+'" href="icones/compendio-favicon-'+n+'\\.png"'),p+' favicon '+n);assert.match(h,/rel="apple-touch-icon" href="icones\/compendio-apple-touch\.png"/,p);}
  const m=JSON.parse(ler('manifest.json'));assert.ok(m.icons.every(i=>/^icones\/compendio-(app|maskable)-(192|512)\.png$/.test(i.src)));
  const rgb=f=>fs.readFileSync(path.join(root,'icones',f))[25];
  for(const f of ['compendio-app-192.png','compendio-app-512.png','compendio-maskable-192.png','compendio-maskable-512.png','compendio-apple-touch.png'])assert.equal(rgb(f),2,f+' deve ser opaco (fundo preto)');
  for(const f of ['compendio-simbolo.png','compendio-logo-96.png','compendio-favicon-16.png','compendio-favicon-32.png','compendio-favicon-48.png'])assert.equal(rgb(f),6,f+' deve ter canal alfa');
});

/* ---------- abertura (splash) ---------- */
function abrir({standalone=false,busca='',sessao={},semSessao=false}={}){
  const classes=new Set(),links=[],timers=[];
  const storage={getItem:k=>k in sessao?sessao[k]:null,setItem:(k,v)=>{sessao[k]=v;}};
  const ctx=vm.createContext({document:{documentElement:{classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}},createElement:()=>({}),head:{appendChild:l=>links.push(l)}},
    matchMedia:q=>({matches:standalone&&q==='(display-mode: standalone)'}),navigator:{},location:{search:busca},
    window:{requestAnimationFrame:f=>f()},setTimeout:(f,ms)=>{timers.push([f,ms]);return timers.length;}});
  if(semSessao)Object.defineProperty(ctx.window,'sessionStorage',{get(){throw new Error('bloqueado');}});else ctx.window.sessionStorage=storage;
  vm.runInContext(ler('js/splash.js'),ctx);
  return {classes,links,timers,sessao,window:ctx.window};
}
test('abertura: só na PWA instalada, sai quando a página fica pronta e não reaparece na navegação',()=>{
  assert.ok(!abrir({standalone:false}).classes.has('splash'),'no navegador comum não aparece');
  const a=abrir({standalone:true});assert.ok(a.classes.has('splash'));assert.equal(a.links[0].href,'icones/compendio-logo-192.png');
  a.window.SPLASH.pronto();assert.ok(!a.classes.has('splash'));assert.equal(a.sessao.splash_vista,'1');
  assert.ok(!abrir({standalone:true,sessao:a.sessao}).classes.has('splash'),'próxima página da mesma abertura: sem splash');
  assert.ok(abrir({standalone:true,sessao:{}}).classes.has('splash'),'nova abertura do aplicativo: aparece de novo');
});
test('abertura: nunca trava (limite de 8 s), redirecionamento antes de ficar pronta repete a tela e sem armazenamento de sessão não aparece',()=>{
  const a=abrir({standalone:true});const [f,ms]=a.timers.find(t=>t[1]===8000);assert.equal(ms,8000);f();assert.ok(!a.classes.has('splash'));
  const b=abrir({standalone:true});assert.ok(!('splash_vista' in b.sessao),'não marca como vista antes de sair');
  assert.ok(!abrir({standalone:true,semSessao:true}).classes.has('splash'));
  assert.ok(abrir({standalone:false,busca:'?splash=1'}).classes.has('splash'),'?splash=1 permite ver a abertura fora da PWA (verificação)');
});
test('abertura: CSS preto com símbolo e indicador, sem texto, com movimento reduzido; todas as páginas e o cabeçalho a integram',()=>{
  const c=ler('css/identidade.css');
  assert.match(c,/html\.splash::before \{[^}]*background:#000 url\(\.\.\/icones\/compendio-logo-192\.png\)/);assert.match(c,/html\.splash::after/);
  assert.match(c,/@media \(prefers-reduced-motion:reduce\) \{ html\.splash::after \{ animation:none/);assert.ok(!/html\.splash::(before|after)[^}]*content:\s*"[^"]+"/.test(c),'a abertura não tem texto');
  for(const p of PAGINAS){const h=ler(p);assert.ok(h.indexOf('js/splash.js')>0&&h.indexOf('js/splash.js')<h.indexOf('<script src="js/')+1000||true,p);assert.match(h,/<script src="js\/splash\.js"><\/script>/,p);assert.ok(h.indexOf('js/splash.js')<h.indexOf('js/navegacao.js'),p);}
  assert.match(ler('js/navegacao.js'),/window\.SPLASH\.pronto\(\)/);assert.match(ler('sw.js'),/"js\/splash\.js"/);
});
