const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,ler}=require('./helpers.cjs');

function ESQ(){const w={};vm.runInContext(ler('js/esqueleto.js'),vm.createContext({window:w,setTimeout,clearTimeout}));return w.ESQ;}
const elemento=()=>{const attrs={},botoes=[];const el={innerHTML:'',setAttribute:(k,v)=>attrs[k]=v,removeAttribute:k=>delete attrs[k],hasAttribute:k=>k in attrs,attrs,
  querySelector:()=>{const b={};botoes.push(b);return b;},botoes};return el;};

/* ---------- o HTML estático e o esqueleto em JS são a mesma coisa ---------- */
test('o esqueleto que vem no HTML (primeira pintura) é idêntico ao gerado por js/esqueleto.js',()=>{
  const E=ESQ();
  const paginas={'campanha.html':[['abas'],['campanha']],'conta.html':[['campanhas',2],['personagens',3]],'index.html':[['campanhas',2],['personagens',3]],'personagem.html':[['ficha']],'criar-personagem.html':[['criador']]};
  for(const [pagina,tipos] of Object.entries(paginas)){
    const h=ler(pagina);
    for(const [tipo,n] of tipos){
      const m=h.match(new RegExp('<!--esq:'+tipo+'-->([\\s\\S]*?)<!--/esq-->'));
      assert.ok(m,pagina+' precisa do esqueleto '+tipo);assert.equal(m[1],E.html(tipo,n),pagina+' / '+tipo+' está fora de sincronia com js/esqueleto.js (regenere o bloco)');
    }
    assert.match(h,/src="js\/esqueleto\.js"/,pagina);
  }
});
test('só há esqueleto onde há espera de rede: iniciativa, monstros e magias (dados locais) não trazem esqueleto no HTML',()=>{
  assert.ok(!/<!--esq:/.test(ler('iniciativa.html')));assert.ok(!/<!--esq:/.test(ler('entrar.html')));
  assert.ok(!/\besq\b/.test(ler('js/iniciativa.js')+ler('js/magias-ui.js')+ler('js/catalogo.js')),'o combate e as consultas locais não usam esqueleto');
});

/* ---------- comportamento ---------- */
test('esqueleto é invisível para leitores de tela e anuncia o carregamento uma vez',()=>{
  const E=ESQ(),el=elemento();E.mostrar(el,'campanhas','Carregando suas campanhas…');
  assert.equal(el.attrs['aria-busy'],'true');assert.match(el.innerHTML,/<span class="sr-only" role="status">Carregando suas campanhas…<\/span>/);
  assert.ok(!/aria-hidden="true"/.test(el.innerHTML.split('</span>')[0]));assert.match(el.innerHTML,/aria-hidden="true"/);
  E.pronto(el);assert.ok(!('aria-busy' in el.attrs));
  for(const t of ['campanha','campanhas','personagens','ficha','criador','lista','linhas'])assert.match(E.html(t,2),/aria-hidden="true"/,t);
});
test('erro e lentidão: o esqueleto sai, a mensagem é clara e há "Tentar novamente"; nada de desconectar',async()=>{
  const E=ESQ(),el=elemento();let tentou=0;
  E.erro(el,'Sem conexão com a internet.',()=>tentou++);
  assert.match(el.innerHTML,/role="alert"/);assert.match(el.innerHTML,/Sem conexão com a internet\./);assert.match(el.innerHTML,/Tentar novamente/);assert.match(el.innerHTML,/continua conectada e nada foi apagado/);
  assert.ok(!/class="esq /.test(el.innerHTML));el.botoes[0].onclick();assert.equal(tentou,1);
  const lento=elemento();E.mostrar(lento,'ficha');const cancelar=E.vigiar(lento,()=>{},20,'A conexão está lenta.');
  await new Promise(r=>setTimeout(r,60));assert.match(lento.innerHTML,/A conexão está lenta\./);assert.match(lento.innerHTML,/Tentar novamente/);
  const rapido=elemento();E.mostrar(rapido,'ficha');const c2=E.vigiar(rapido,()=>{},20);c2();await new Promise(r=>setTimeout(r,60));assert.match(rapido.innerHTML,/class="esq /);   // dados chegaram a tempo: a vigia some
  const local=elemento();E.erro(local,'Não consegui carregar o catálogo 2014.',()=>{},' Seus dados locais continuam intactos.');assert.ok(!/conta continua/.test(local.innerHTML));
});
test('movimento reduzido e identidade: animação suave, desligada quando o sistema pede',()=>{
  const c=ler('css/identidade.css');
  assert.match(c,/@media \(prefers-reduced-motion:reduce\) \{ \.esq \{ animation:none;/);assert.match(c,/@keyframes esq-brilho/);assert.match(c,/\.sr-only \{/);
  assert.match(c,/--esq-a:#[0-9A-Fa-f]{6}/);
});
test('cada página trata erro e lentidão sem desconectar: usa js/esqueleto.js com nova tentativa',()=>{
  for(const [f,re] of [['js/campanha.js',/ESQ\.erro\(area, e\.message, abrir\)/],['js/campanha.js',/ESQ\.vigiar\(area, abrir, 20000/],['js/personagem.js',/ESQ\.erro\(\$\("#ficha"\), e\.message, recarregar\)/],['js/criador.js',/ESQ\.erro\(/],['js/conta.js',/ESQ\.erro\(\$\("#campanhas"\), texto, mostrarArea\)/],['js/campanha-ini.js',/ESQ\.erro\(\$\("#ci-lista"\)/],['js/app.js',/ESQ\.erro\(\$\("#blist"\)/]])
    assert.match(ler(f),re,f+' '+re);
  const semSessao=/nuvem\.(sair|sairDeTodos)|(?<!PAINEL\?\.)encerrar\(|localStorage\.clear|removeItem\("nuvem/;
  for(const f of ['js/campanha.js','js/personagem.js','js/criador.js'])assert.ok(!semSessao.test(ler(f)),f+' não mexe na sessão em falha de rede');
  const c=ler('js/conta.js');assert.ok(!semSessao.test(c.slice(c.indexOf('const falhaAbertura'),c.indexOf('function mostrarLogin'))),'conta.js: falha de rede não mexe na sessão');
});
test('o esqueleto da abertura não reintroduz flicker: título/abas/conteúdo já nascem no HTML e a PWA o guarda para uso offline',()=>{
  const c=ler('campanha.html');assert.match(c,/id="titulo"><span class="esq esq-titulo">/);assert.match(c,/id="abas" aria-hidden="true">/);assert.match(c,/id="conteudo" aria-busy="true"/);
  assert.match(ler('sw.js'),/js\/esqueleto\.js/);assert.match(ler('conta.html'),/id="conta-abrindo" aria-busy="true"/);
});

test('trocar de aba da campanha não espera rede (usa dados já carregados), então não precisa de esqueleto nem pisca',()=>{
  const c=ler('js/campanha.js'),d=c.slice(c.indexOf('async function desenhar()'),c.indexOf('async function mostrarConvite'));
  assert.ok(!/await\s+nuvem\./.test(d)&&!/fetch\(/.test(d),'desenhar() só monta HTML com dados em memória');
  assert.match(c,/data-aba[\s\S]{0,200}return desenhar\(\)/);
  const r=c.slice(c.indexOf('async function recarregar()'),c.indexOf('async function recarregar()')+160);assert.match(r,/await carregar\(\); desenhar\(\)/);   // atualização posterior mantém o conteúdo até haver dado novo
});
test('admin.html só redireciona: sem dados assíncronos, sem esqueleto, e o redirecionamento roda antes da pintura',()=>{
  const h=ler('admin.html');assert.match(h,/<script src="js\/admin-redirecionar\.js"><\/script>/);assert.ok(!/esqueleto|esq/.test(h));
  assert.match(ler('js/admin-redirecionar.js'),/location\.replace\("conta\.html\?aba=conta#opcoes-admin"\)/);
});
