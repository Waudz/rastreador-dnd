const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const {vm,executar,documentoFalso,armazenamento,tick,ler,root}=require('./helpers.cjs');

/* ---------- endereço de volta: só páginas do próprio aplicativo ---------- */
function nuvemReal(location){
  const window={NUVEM_CONFIG:{url:'https://x.supabase.invalid',chave:'k'},supabase:{createClient:()=>({auth:{onAuthStateChange(){return {data:{}};}}})}};
  executar('js/nuvem.js',vm.createContext({window,localStorage:armazenamento(),fetch(){},location,history:{replaceState(){}},document:{hidden:false,addEventListener(){}},URLSearchParams,setTimeout,clearTimeout,encodeURIComponent,navigator:{}}));
  return window.nuvem;
}
test('o endereço de volta só aceita páginas do aplicativo',()=>{
  const n=nuvemReal({hash:'',search:'',pathname:'/campanha.html'});
  for(const ok of ['campanha.html?id=a1b2-c3','conta.html','personagem.html?id=7f&x=1','iniciativa.html?aba=magias'])assert.equal(n.destinoSeguro(ok),ok,ok);
  for(const ruim of ['https://evil.example/','//evil.example','javascript:alert(1)','../conta.html','admin.html','campanha.html#x','conta.html?x=<script>','conta.html?a=b c','','entrar.html'])assert.equal(n.destinoSeguro(ruim),'',ruim);
});
test('quem não está logado vai para a entrada e volta para onde estava',()=>{
  assert.equal(nuvemReal({hash:'',search:'?id=a1',pathname:'/campanha.html'}).entradaUrl(),'entrar.html?voltar=campanha.html%3Fid%3Da1');
  assert.equal(nuvemReal({hash:'',search:'',pathname:'/'}).entradaUrl(),'entrar.html');
  assert.equal(nuvemReal({hash:'',search:'',pathname:'/entrar.html'}).entradaUrl(),'entrar.html');
});

/* ---------- tela de entrada ---------- */
async function entrar({usuario=null,tipo='',search='',erroLink='',captcha,respostas={}}={}){
  const document=documentoFalso(),destinos=[],chamadas=[];let u=usuario;
  const nuvem={esc:s=>String(s??''),olhos(){},usuario:()=>u,retornoTipo:()=>tipo,SENHA_MIN:10,
    destinoSeguro:v=>/^(campanha|conta)\.html(\?[\w=&%.-]*)?$/.test(v||'')?v:'',
    validarSenha:s=>(String(s).length>=10&&/[A-Za-z]/.test(s)&&/\d/.test(s))?{ok:true}:{ok:false,erro:'A senha precisa ter pelo menos 10 caracteres.'},
    retornoDoLink:async()=>{if(erroLink)throw new Error(erroLink);},
    entrar:async(...a)=>{chamadas.push(['entrar',...a]);if(respostas.entrar)throw new Error(respostas.entrar);u={id:'u'};return u;},
    cadastrar:async(...a)=>{chamadas.push(['cadastrar',...a]);return respostas.cadastrar||{confirmar:true};},
    reenviarConfirmacao:async(...a)=>chamadas.push(['reenviar',...a]),esqueciSenha:async(...a)=>chamadas.push(['esqueci',...a]),linkMagico:async(...a)=>chamadas.push(['link',...a]),
    trocarSenha:async(...a)=>chamadas.push(['trocar',...a])};
  const window={nuvem,TURNSTILE:captcha?{obter:async()=>captcha}:undefined};
  const ctx=vm.createContext({window,document,nuvem,location:{search,origin:'https://site.invalid',pathname:'/entrar.html',replace:x=>destinos.push(x)},URLSearchParams,setTimeout,encodeURIComponent});
  executar('js/entrar.js',ctx);await tick();await tick();
  return {document,destinos,chamadas,el:id=>document.el(id)};
}
test('visitante vê o formulário de entrada; quem já está conectado não vê login de novo',async()=>{
  const v=await entrar();assert.equal(v.el('entrar').hidden,false);assert.deepEqual(v.destinos,[]);
  const l=await entrar({usuario:{id:'u1'}});assert.deepEqual(l.destinos,['conta.html']);        // reabrir o site ou trocar de página nunca pede login de novo
});
test('login leva ao destino pedido, quando é seguro',async()=>{
  const f=await entrar({search:'?voltar=campanha.html%3Fid%3Da1'});f.el('l-email').value='ana@example.invalid';f.el('l-senha').value='senha-qualquer-1';
  await f.el('btn-login').onclick();assert.equal(f.chamadas[0][0],'entrar');assert.deepEqual(f.destinos,['campanha.html?id=a1']);
  const g=await entrar({search:'?voltar=https%3A%2F%2Fevil.example%2F'});g.el('l-email').value='a@b.invalid';g.el('l-senha').value='senha-qualquer-1';await g.el('btn-login').onclick();assert.deepEqual(g.destinos,['conta.html']);
});
test('cadastro: senha fraca barrada, depois a orientação de confirmar o e-mail (sem entrar)',async()=>{
  const f=await entrar();f.el('aba-criar').onclick();f.el('l-email').value='ana@example.invalid';f.el('l-senha').value='fraca1';
  await f.el('btn-login').onclick();assert.equal(f.chamadas.length,0);assert.match(f.el('msg-login').innerHTML,/10 caracteres/);
  f.el('l-senha').value='Cavalo-Azul-2026';await f.el('btn-login').onclick();
  assert.equal(f.chamadas[0][0],'cadastrar');assert.equal(f.el('confirmar-email').hidden,false);assert.match(f.el('confirmar-texto').textContent,/ana@example\.invalid/);assert.equal(f.el('l-senha').value,'');assert.deepEqual(f.destinos,[]);
});
test('o link dos e-mails volta para a própria página de entrada, mantendo o destino',async()=>{
  const f=await entrar({search:'?voltar=conta.html'});f.el('aba-criar').onclick();f.el('l-email').value='ana@example.invalid';f.el('l-senha').value='Cavalo-Azul-2026';await f.el('btn-login').onclick();
  assert.equal(f.chamadas[0][4],'https://site.invalid/entrar.html?voltar=conta.html');
});
test('CAPTCHA: o token acompanha cadastro, login, reenvio, recuperação e link; sem CAPTCHA nada é enviado',async()=>{
  const f=await entrar({captcha:'tok-captcha'});f.el('l-email').value='ana@example.invalid';f.el('l-senha').value='senha-qualquer-1';
  await f.el('btn-login').onclick();assert.equal(f.chamadas[0][3],'tok-captcha');
  await f.el('btn-esqueci').onclick();assert.equal(f.chamadas.find(c=>c[0]==='esqueci')[3],'tok-captcha');
  await f.el('btn-link').onclick();assert.equal(f.chamadas.find(c=>c[0]==='link')[3],'tok-captcha');
  const s=await entrar();s.el('l-email').value='ana@example.invalid';s.el('l-senha').value='senha-qualquer-1';await s.el('btn-login').onclick();assert.equal(s.chamadas[0][3],undefined);
});
test('link de recuperação mostra a tela de nova senha e só aceita senha forte e igual nas duas caixas',async()=>{
  const f=await entrar({usuario:{id:'u1'},tipo:'recovery'});
  assert.equal(f.el('recuperar').hidden,false);assert.equal(f.el('entrar').hidden,true);assert.deepEqual(f.destinos,[]);
  f.el('r-senha').value='Cavalo-Azul-2026';f.el('r-senha2').value='outra-coisa-1';await f.el('btn-recuperar').onclick();assert.match(f.el('msg-recuperar').innerHTML,/não são iguais/);
  f.el('r-senha').value=f.el('r-senha2').value='fraca1';await f.el('btn-recuperar').onclick();assert.match(f.el('msg-recuperar').innerHTML,/10 caracteres/);assert.equal(f.chamadas.length,0);
  f.el('r-senha').value=f.el('r-senha2').value='Cavalo-Azul-2026';await f.el('btn-recuperar').onclick();assert.equal(f.chamadas[0][0],'trocar');assert.equal(f.chamadas[0].length,2);assert.deepEqual(f.destinos,['conta.html']);
});
test('link expirado mostra o erro e o formulário para pedir outro',async()=>{
  const f=await entrar({erroLink:'Este link expirou ou já foi usado. Peça um novo.'});assert.equal(f.el('entrar').hidden,false);assert.match(f.el('msg-login').innerHTML,/expirou/);
});

/* ---------- Turnstile ---------- */
function turnstile(chave,api){
  const injetados=[],janela={NUVEM_CONFIG:{turnstileSiteKey:chave},turnstile:api};
  const document={head:{appendChild:(s)=>{injetados.push(s);if(api!==undefined)return;setImmediate(()=>{janela.turnstile=apiFalsa.api;s.onload();});}},createElement:()=>({}),querySelector:()=>({id:'captcha'})};
  const apiFalsa={api:null};
  executar('js/turnstile.js',vm.createContext({window:janela,document,setTimeout,clearTimeout,setImmediate}));
  return {T:janela.TURNSTILE,injetados,janela,apiFalsa};
}
test('Turnstile desligado (sem chave): nenhum script, nenhum token',async()=>{
  const t=turnstile('');assert.equal(t.T.ativo(),false);assert.equal(await t.T.obter(),undefined);assert.equal(t.injetados.length,0);
});
test('Turnstile ligado: desafio só sob demanda, token novo a cada operação, erro vira mensagem clara',async()=>{
  const chamadas=[];let cb,errcb;
  const api={render:(el,o)=>{chamadas.push(['render',o.sitekey,o.execution,o.appearance]);cb=o.callback;errcb=o['error-callback'];return 'w1';},execute:()=>{chamadas.push(['execute']);setImmediate(()=>cb('token-'+chamadas.filter(c=>c[0]==='execute').length));},reset:()=>chamadas.push(['reset'])};
  const t=turnstile('0xCHAVE-PUBLICA',api);assert.equal(t.T.ativo(),true);
  assert.equal(await t.T.obter(),'token-1');assert.equal(await t.T.obter(),'token-2');
  assert.deepEqual(chamadas[0],['render','0xCHAVE-PUBLICA','execute','interaction-only']);          // invisível/automático; só interage se o Cloudflare exigir
  assert.ok(chamadas.some(c=>c[0]==='reset'));
  const t2=turnstile('0xCHAVE',{render:(el,o)=>{setImmediate(()=>o['error-callback']());return 'w';},execute(){},reset(){}});
  await assert.rejects(()=>t2.T.obter(),/verificação de segurança/);
});
test('o CAPTCHA existe só na página de entrada e está desligado por padrão',()=>{
  assert.match(ler('js/config-nuvem.js'),/turnstileSiteKey:\s*""/);
  for(const h of fs.readdirSync(root).filter(f=>f.endsWith('.html'))){
    const t=ler(h);if(h==='entrar.html'){assert.match(t,/src="js\/turnstile\.js"/);assert.match(t,/script-src 'self' https:\/\/challenges\.cloudflare\.com/);assert.match(t,/frame-src https:\/\/challenges\.cloudflare\.com/);continue;}
    assert.ok(!/challenges\.cloudflare\.com|turnstile/i.test(t),h+' não pode carregar nem liberar o CAPTCHA');
  }
  for(const f of ['js/iniciativa.js','js/app.js','js/campanha-ini.js','js/navegacao.js','js/nuvem.js','js/conta.js','js/campanha.js','js/personagem.js'])assert.ok(!/TURNSTILE|turnstile/.test(ler(f).replace(/turnstileSiteKey/g,'')),f);
});
test('a página de entrada tem política de segurança própria e não carrega o resto do aplicativo',()=>{
  const h=ler('entrar.html');
  assert.match(h,/connect-src 'self' https:\/\/pdjzahpxjrlbqqtzkfdr\.supabase\.co https:\/\/challenges\.cloudflare\.com/);
  assert.ok(!/unsafe-inline[^"]*script|script-src[^;]*unsafe-inline/.test(h));
  for(const proibido of ['js/app.js','js/iniciativa.js','js/acervo.js','js/campanha.js'])assert.ok(!h.includes(proibido),proibido);
  assert.match(h,/Continuar como visitante/);
});
