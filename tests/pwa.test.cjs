const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {ler,root}=require('./helpers.cjs');
const png=p=>{const d=fs.readFileSync(path.join(root,p));return {w:d.readUInt32BE(16),h:d.readUInt32BE(20),tipoCor:d[25]};};   // tipo 6 = RGBA
const PAGINAS=['index.html','conta.html','campanha.html','personagem.html','criar-personagem.html','iniciativa.html','admin.html','licencas.html','entrar.html'];
test('logotipo de interface é PNG com transparência e os ícones de instalação são opacos e do tamanho certo',()=>{
 for(const f of ['compendio-simbolo.png','compendio-logo-96.png','compendio-logo-192.png','compendio-favicon-16.png','compendio-favicon-32.png','compendio-favicon-48.png'])assert.equal(png('icones/'+f).tipoCor,6,f+' deve ter alfa real');
 assert.deepEqual([png('icones/compendio-logo-96.png').w,png('icones/compendio-logo-96.png').h],[96,96]);
 for(const [f,l] of [['compendio-favicon-16.png',16],['compendio-favicon-32.png',32],['compendio-favicon-48.png',48]])assert.deepEqual([png('icones/'+f).w,png('icones/'+f).h],[l,l],f);
 for(const [f,l] of [['compendio-app-192.png',192],['compendio-app-512.png',512],['compendio-maskable-192.png',192],['compendio-maskable-512.png',512],['compendio-apple-touch.png',180]]){const i=png('icones/'+f);assert.deepEqual([i.w,i.h],[l,l],f);assert.notEqual(i.tipoCor,6,f+' deve ser opaco');}
});
test('manifest declara ícones any e maskable existentes e cores iguais às das páginas',()=>{
 const m=JSON.parse(ler('manifest.json'));
 assert.ok(m.icons.some(i=>i.purpose==='any'&&i.sizes==='512x512')&&m.icons.some(i=>i.purpose==='maskable'&&i.sizes==='512x512'));
 for(const i of m.icons)assert.ok(fs.existsSync(path.join(root,i.src)),i.src);
 const bg=/--bg:\s*(#[0-9a-fA-F]{6})/.exec(ler('css/estilo.css'))[1].toLowerCase();
 assert.equal(m.theme_color.toLowerCase(),bg);assert.equal(m.background_color.toLowerCase(),'#000000');
});
test('todas as páginas têm o mesmo bloco de manifest, favicons, apple-touch e theme-color',()=>{
 for(const p of PAGINAS){const h=ler(p);
  assert.equal((h.match(/rel="manifest"/g)||[]).length,1,p);assert.equal((h.match(/rel="apple-touch-icon"/g)||[]).length,1,p);
  assert.match(h,/<meta name="theme-color" content="#101820">/,p);assert.match(h,/href="icones\/compendio-favicon-32.png"/,p);assert.match(h,/src="js\/navegacao.js"/,p);}
});
test('service worker: tudo que ele pré-guarda existe, inclusive logotipo, ícones e magias offline',()=>{
 const s=ler('sw.js'),lista=eval(/const ESSENCIAIS = (\[.*?\]);/s.exec(s)[1]);
 for(const f of lista)if(f!=='./')assert.ok(fs.existsSync(path.join(root,f)),'pré-cache aponta para arquivo inexistente: '+f);
 for(const f of ['icones/compendio-logo-96.png','icones/compendio-app-512.png','icones/compendio-maskable-512.png','icones/compendio-apple-touch.png','icones/compendio-logo-192.png','js/splash.js','dados/magias.json','manifest.json','css/identidade.css','css/fichas.css','css/magias.css','js/navegacao.js','vendor/supabase/supabase.js'])assert.ok(lista.includes(f),f+' deveria estar no pré-cache');
 assert.match(s,/cache: "no-cache"/);          // com internet, sempre revalida; sem internet, usa o guardado
});
test('o registro do service worker é único (navegacao.js), com atualização fora do cache HTTP e aviso sem recarregar sozinho',()=>{
 assert.match(ler('js/navegacao.js'),/register\('sw.js',\{updateViaCache:'none'\}\)/);
 for(const p of ['js/app.js','js/conta.js'])assert.ok(!/serviceWorker\.register/.test(ler(p)),p+' não deve registrar de novo');
 const n=ler('js/navegacao.js');assert.match(n,/nova-versao/);
 assert.equal((n.match(/location\.reload\(\)/g)||[]).length,2,'só o aviso (clique) e a troca de conta recarregam');
 assert.match(n,/\.onclick=\(\)=>location\.reload\(\)/);
});
test('cabeçalho usa o logotipo transparente pequeno e o avatar da conta é circular e discreto',()=>{
 const n=ler('js/navegacao.js'),css=ler('css/identidade.css');
 assert.match(n,/<img src="icones\/compendio-logo-96.png" width="32" height="32"/);assert.match(n,/<span>Compêndio 5e<\/span>/);
 assert.match(css,/\.appmarca img \{ width:32px; height:32px;/);assert.match(css,/\.appavatar \{[^}]*width:34px; height:34px; border-radius:50%/);
});
test('controles compactos da campanha preservam o convite e a troca de código no Grupo',()=>{
 const ui=ler('js/campanhas-ui.js'),c=ler('js/campanha.js'),css=ler('css/identidade.css');
 for(const nome of ['Abrir lista de campanhas','Compartilhar código de convite','Entrar em campanha','Mais opções'])assert.ok(ui.includes(nome));
 assert.match(ler('css/grupo-personagens.css'),/justify-content:flex-end/);
 assert.ok(!/id="copiar-cod">Copiar</.test(c));assert.match(c,/convite-cod/);
 const conv=c.slice(c.indexOf('async function mostrarConvite'),c.indexOf('/* ---------- ações'));assert.ok(!conv.includes('novo-cod'),'Trocar código saiu do topo');
 const grupo=c.slice(c.indexOf('function abaMembros'),c.indexOf('async function desenhar'));assert.match(grupo,/mestre\(\)/);assert.match(grupo,/id="novo-cod"/);
 assert.match(c,/Gerar um novo código\? O código antigo deixa de valer/);     // confirmação preservada
});
test('o SDK oficial é carregado antes do cliente em todas as páginas e a cópia tem licença e procedência',()=>{
 for(const p of PAGINAS){const h=ler(p);if(!/js\/nuvem\.js/.test(h))continue;assert.ok(h.indexOf('vendor/supabase/supabase.js')>=0&&h.indexOf('vendor/supabase/supabase.js')<h.indexOf('js/nuvem.js'),p);}
 assert.ok(fs.existsSync(path.join(root,'vendor/supabase/LICENSE')));assert.match(ler('vendor/supabase/LEIA-ME.md'),/2\.118\.0/);
});

test('offline: o service worker serve a cópia guardada mesmo com outra busca na URL (iniciativa.html?aba=...) e nunca devolve "nada"',async()=>{
 const {vm}=require('./helpers.cjs');
 const guardado={'https://x.invalid/iniciativa.html':'INICIATIVA','https://x.invalid/index.html':'INDEX'};
 const caches={match:async(req,op)=>{const u=typeof req==='string'?'https://x.invalid/'+req:req.url;if(guardado[u])return guardado[u];if(op&&op.ignoreSearch){const b=u.split('?')[0];return guardado[b]||undefined;}return undefined;},open:async()=>({put(){}}),keys:async()=>[],delete:async()=>true};
 const ouvintes={};const ctx=vm.createContext({self:{addEventListener:(n,f)=>ouvintes[n]=f,skipWaiting(){},clients:{claim(){}}},caches,location:{origin:'https://x.invalid'},fetch:async()=>{throw new Error('sem rede');},Request:class{},Response:{error:()=>'ERRO'},URL});
 vm.runInContext(ler('sw.js'),ctx);
 const pedir=async(url,mode)=>{let r;ouvintes.fetch({request:{url,method:'GET',mode},respondWith:p=>{r=p;}});return r;};
 assert.equal(await pedir('https://x.invalid/iniciativa.html?aba=iniciativa','navigate'),'INICIATIVA');
 assert.equal(await pedir('https://x.invalid/iniciativa.html','navigate'),'INICIATIVA');
 assert.equal(await pedir('https://x.invalid/pagina-que-nao-existe.html','navigate'),'INDEX');
 assert.equal(await pedir('https://x.invalid/js/inexistente.js?v=3','no-cors'),'ERRO');
});
