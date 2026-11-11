const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,executar,armazenamento}=require('./helpers.cjs');
/* Cliente de login sobre o SDK oficial, com um SDK falso: nenhuma rede, nenhuma senha ou token reais. */
const USUARIO={id:'u1',email:'ana@example.invalid',user_metadata:{nome:'Ana'}};
const SESSAO={access_token:'tok-acesso',refresh_token:'tok-renova',expires_at:Math.floor(Date.now()/1000)+3600,user:USUARIO};
const FORTE='Cavalo-Azul-2026';
function fixture({guardada,antiga,hash='',search='',config={},online=true,sessaoSdk}={}){
  const localStorage=armazenamento(),chamadas=[],ouvintes=[],criacoes=[],urls=[],trocas=[];
  if(guardada)localStorage.setItem('nuvem_sessao_sdk',JSON.stringify(guardada));
  if(antiga)localStorage.setItem('nuvem_sessao',JSON.stringify(antiga));
  localStorage.setItem('dnd5e_initiative_tracker_v1',JSON.stringify({combatants:[{name:'Orc'}]}));   // dado local que NUNCA pode sumir
  const est={sessao:sessaoSdk===undefined?guardada||null:sessaoSdk,resp:{}};
  const emitir=(e,s)=>ouvintes.forEach(f=>f(e,s));
  const pega=(nome,padrao)=>async(...a)=>{chamadas.push([nome,...a]);const r=est.resp[nome];return typeof r==='function'?r(...a):(r!==undefined?r:padrao);};
  const auth={
    onAuthStateChange:(fn)=>{ouvintes.push(fn);return {data:{subscription:{unsubscribe(){}}}};},
    getSession:async()=>{chamadas.push(['getSession']);const r=est.resp.getSession;return r?r():{data:{session:est.sessao},error:null};},
    signUp:pega('signUp',{data:{user:USUARIO,session:null},error:null}),
    signInWithPassword:async(a)=>{chamadas.push(['signInWithPassword',a]);const r=est.resp.signInWithPassword;if(r)return r(a);est.sessao=SESSAO;return {data:{user:USUARIO,session:SESSAO},error:null};},
    resend:pega('resend',{data:{},error:null}),resetPasswordForEmail:pega('resetPasswordForEmail',{data:{},error:null}),signInWithOtp:pega('signInWithOtp',{data:{},error:null}),
    setSession:async(a)=>{chamadas.push(['setSession',a]);const r=est.resp.setSession;if(r)return r(a);est.sessao={...SESSAO,...a};return {data:{session:est.sessao},error:null};},
    signOut:async(a)=>{chamadas.push(['signOut',a]);const r=est.resp.signOut;if(r)return r(a);est.sessao=null;return {error:null};},
    updateUser:pega('updateUser',{data:{user:USUARIO},error:null}),reauthenticate:pega('reauthenticate',{data:{},error:null}),refreshSession:pega('refreshSession',{data:{session:SESSAO},error:null})
  };
  const supabase={createClient:(u,k,o)=>{criacoes.push({u,k,o});return {auth};}};
  const fetch=async(url,opt={})=>{urls.push({url:String(url),auth:(opt.headers||{}).Authorization||''});const r=est.fetch?est.fetch(String(url)):{status:200,json:[]};return {ok:r.status<400,status:r.status,statusText:'x',text:async()=>JSON.stringify(r.json)};};
  const window={NUVEM_CONFIG:{url:'https://projeto.supabase.invalid',chave:'chave-publica-de-teste',...config},supabase};
  const ctx=vm.createContext({window,localStorage,fetch,location:{hash,search,href:'https://site.invalid/conta.html',pathname:'/conta.html'},history:{replaceState:(a,b,c)=>trocas.push(c)},document:{hidden:false,addEventListener(){}},URLSearchParams,setTimeout,clearTimeout,encodeURIComponent,navigator:{onLine:online}});
  executar('js/nuvem.js',ctx);
  return {nuvem:window.nuvem,chamadas,criacoes,emitir,est,localStorage,urls,trocas,chamou:(n)=>chamadas.filter(c=>c[0]===n)};
}

test('o SDK é configurado para sessão persistente, renovação automática e PKCE',()=>{
  const f=fixture();const o=f.criacoes[0];
  assert.equal(o.u,'https://projeto.supabase.invalid');assert.equal(o.k,'chave-publica-de-teste');
  const a=o.o.auth;assert.equal(a.persistSession,true);assert.equal(a.autoRefreshToken,true);assert.equal(a.flowType,'pkce');assert.equal(a.detectSessionInUrl,true);
  assert.equal(a.storageKey,'nuvem_sessao_sdk');assert.equal(typeof a.storage.getItem,'function');
});
test('reabrir o navegador ou a PWA: o usuário já está conhecido, sem rede e sem pedir login',()=>{
  const f=fixture({guardada:SESSAO,online:false});
  assert.equal(f.nuvem.usuario().id,'u1');assert.equal(f.nuvem.usuario().nome,'Ana');assert.equal(f.chamadas.length,0);
});
test('sem sessão guardada, o visitante fica sem usuário e nada é chamado',()=>{
  const f=fixture();assert.equal(f.nuvem.usuario(),null);assert.equal(f.chamadas.length,0);
});
test('regra de senha: 10 caracteres, com letras e números',()=>{
  const {nuvem}=fixture();
  for(const ruim of ['curta1','sóletrasmuitolongas','12345678901234','','         '])assert.equal(nuvem.validarSenha(ruim).ok,false,ruim);
  assert.equal(nuvem.validarSenha('abcdefghi1').ok,true);assert.equal(nuvem.validarSenha(FORTE).ok,true);
});
test('cadastro: senha fraca nem chega ao servidor; com confirmação obrigatória não abre sessão',async()=>{
  const f=fixture();
  await assert.rejects(()=>f.nuvem.cadastrar('ana@example.invalid','fraca1','Ana'),/10 caracteres/);assert.equal(f.chamadas.length,0);
  const r=await f.nuvem.cadastrar('ana@example.invalid',FORTE,'Ana','https://site.invalid/conta.html');
  assert.equal(r.confirmar,true);assert.equal(f.nuvem.usuario(),null);
  const a=f.chamou('signUp')[0][1];assert.equal(a.email,'ana@example.invalid');assert.equal(a.options.emailRedirectTo,'https://site.invalid/conta.html');assert.equal('captchaToken' in a.options,false);
  assert.ok(![...f.localStorage.dados.values()].some(v=>String(v).includes(FORTE)),'a senha nunca vai para o armazenamento local');
});
test('o token do CAPTCHA só é enviado quando existe (CAPTCHA desligado por padrão)',async()=>{
  const f=fixture();
  await f.nuvem.entrar('ana@example.invalid','senha-original-1');assert.equal('captchaToken' in f.chamou('signInWithPassword')[0][1].options,false);
  await f.nuvem.entrar('ana@example.invalid','senha-original-1','token-turnstile');assert.equal(f.chamou('signInWithPassword')[1][1].options.captchaToken,'token-turnstile');
  await f.nuvem.esqueciSenha('ana@example.invalid','https://site.invalid/conta.html','tt');assert.equal(f.chamou('resetPasswordForEmail')[0][2].captchaToken,'tt');
});
test('recuperação de senha: sem revelar se a conta existe; erro de servidor aparece',async()=>{
  const f=fixture();f.est.resp.resetPasswordForEmail={data:null,error:{status:400,message:'User not found'}};
  await assert.doesNotReject(()=>f.nuvem.esqueciSenha('naoexiste@example.invalid'));
  f.est.resp.resetPasswordForEmail={data:null,error:{status:500,message:'erro do servidor'}};await assert.rejects(()=>f.nuvem.esqueciSenha('x@example.invalid'));
});
test('link de recuperação: o SDK informa o evento e o tipo fica disponível; o login nada pede de novo',async()=>{
  const f=fixture({sessaoSdk:SESSAO});
  f.emitir('PASSWORD_RECOVERY',SESSAO);const u=await f.nuvem.retornoDoLink();
  assert.equal(f.nuvem.retornoTipo(),'recovery');assert.equal(u.id,'u1');
});
test('link antigo (tokens no endereço) ainda é aproveitado e o endereço é limpo',async()=>{
  const f=fixture({hash:'#access_token=tok-link&refresh_token=tok-r&type=recovery&expires_in=3600'});
  await f.nuvem.retornoDoLink();
  assert.equal(f.chamou('setSession')[0][1].access_token,'tok-link');assert.equal(f.nuvem.retornoTipo(),'recovery');assert.deepEqual(f.trocas,['/conta.html']);
});
test('link expirado ou já usado vira mensagem clara em português',async()=>{
  const f=fixture({hash:'#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'});
  await assert.rejects(()=>f.nuvem.retornoDoLink(),/expirou ou já foi usado/);
});
test('sessão da versão anterior é migrada uma vez para o SDK e removida',async()=>{
  const antiga={access_token:'tok-velho',refresh_token:'ren-velho',user:{id:'u1',email:'ana@example.invalid',nome:'Ana'}};
  const f=fixture({antiga});assert.equal(f.nuvem.usuario().id,'u1');          // já logado na primeira tela, sem esperar a rede
  await f.nuvem.retornoDoLink();
  assert.equal(f.chamou('setSession')[0][1].refresh_token,'ren-velho');assert.equal(f.localStorage.getItem('nuvem_sessao'),null);
});
test('migração sem internet mantém a sessão antiga para a próxima abertura',async()=>{
  const antiga={access_token:'tok-velho',refresh_token:'ren-velho',user:{id:'u1',email:'ana@example.invalid'}};
  const f=fixture({antiga});f.est.resp.setSession=()=>({data:{session:null},error:{name:'AuthRetryableFetchError',message:'Failed to fetch'}});
  await f.nuvem.retornoDoLink();assert.ok(f.localStorage.getItem('nuvem_sessao'));assert.equal(f.nuvem.usuario().id,'u1');
});
test('falha ao renovar por falta de internet NÃO desconecta e NÃO apaga dados locais',async()=>{
  const f=fixture({guardada:SESSAO});let avisos=0;f.nuvem.aoMudar(()=>avisos++);
  f.est.resp.getSession=()=>({data:{session:null},error:{name:'AuthRetryableFetchError',message:'Failed to fetch',status:0}});
  await assert.rejects(()=>f.nuvem.get('campanhas?select=id'),/Sem conexão/);
  assert.equal(f.nuvem.usuario().id,'u1');assert.equal(avisos,0);assert.ok(f.localStorage.getItem('nuvem_sessao_sdk'));
  assert.ok(f.localStorage.getItem('dnd5e_initiative_tracker_v1'));
});
test('sem internet, o pedido falha com aviso de conexão, nunca com "faça login"',async()=>{
  const f=fixture({guardada:SESSAO,online:false});
  f.est.resp.getSession=()=>({data:{session:null},error:{name:'AuthUnknownError',message:'fetch failed'}});
  await assert.rejects(()=>f.nuvem.rpc('eh_mestre',{c:'x'}),e=>/Sem conexão/.test(e.message)&&e.semRede===true);
});
test('sessão invalidada pelo servidor: sai da conta, avisa as telas e mantém os dados locais',()=>{
  const f=fixture({guardada:SESSAO});const vistos=[];f.nuvem.aoMudar(u=>vistos.push(u&&u.id));
  f.emitir('SIGNED_OUT',null);
  assert.equal(f.nuvem.usuario(),null);assert.deepEqual(vistos,[null]);assert.ok(f.localStorage.getItem('dnd5e_initiative_tracker_v1'));
});
test('várias abas: login e renovação em outra aba chegam aqui sem desconectar',()=>{
  const f=fixture();const vistos=[];f.nuvem.aoMudar(u=>vistos.push(u&&u.id));
  f.emitir('SIGNED_IN',SESSAO);assert.equal(f.nuvem.usuario().id,'u1');
  f.emitir('TOKEN_REFRESHED',{...SESSAO,access_token:'tok-novo'});assert.equal(f.nuvem.usuario().id,'u1');
  assert.deepEqual(vistos,['u1','u1']);                          // mesma conta: quem escuta (navegacao.js) não recarrega a página
  f.emitir('SIGNED_OUT',null);assert.equal(f.nuvem.usuario(),null);
});
test('sair é voluntário, só deste aparelho por padrão, e funciona até sem internet',async()=>{
  const f=fixture({guardada:SESSAO});f.est.resp.signOut=()=>({error:{name:'AuthRetryableFetchError',message:'Failed to fetch'}});
  await f.nuvem.sair();
  assert.equal(f.chamou('signOut')[0][1].scope,'local');assert.equal(f.nuvem.usuario(),null);assert.equal(f.localStorage.getItem('nuvem_sessao_sdk'),null);
  assert.ok(f.localStorage.getItem('dnd5e_initiative_tracker_v1'),'os dados do usuário no aparelho continuam');
});
test('sair de todos os aparelhos usa o escopo global',async()=>{
  const f=fixture({guardada:SESSAO});await f.nuvem.sairDeTodos();assert.equal(f.chamou('signOut')[0][1].scope,'global');assert.equal(f.nuvem.usuario(),null);
});
test('token vencido no meio do pedido: renova uma vez e repete',async()=>{
  const f=fixture({guardada:SESSAO});let n=0;
  f.est.fetch=()=>(++n===1?{status:401,json:{message:'JWT expired',code:'PGRST303'}}:{status:200,json:[{id:1}]});
  const r=await f.nuvem.get('campanhas?select=id');assert.equal(r[0].id,1);assert.equal(f.chamou('refreshSession').length,1);assert.equal(n,2);
});
test('troca de senha: a senha atual é conferida pelo servidor (sem CAPTCHA configurado) antes de qualquer alteração',async()=>{
  const f=fixture({guardada:SESSAO});f.est.resp.signInWithPassword=()=>({data:null,error:{status:400,message:'Invalid login credentials'}});
  await assert.rejects(()=>f.nuvem.trocarSenha(FORTE,'senha-errada-99'),/senha atual está incorreta/);assert.equal(f.chamou('updateUser').length,0);
});
test('troca de senha correta envia current_password; com CAPTCHA configurado o servidor decide (sem novo login)',async()=>{
  const f=fixture({guardada:SESSAO});await f.nuvem.trocarSenha(FORTE,'senha-original-1');
  assert.equal(f.chamou('signInWithPassword').length,1);const u=f.chamou('updateUser')[0][1];assert.equal(u.password,FORTE);assert.equal(u.current_password,'senha-original-1');
  const g=fixture({guardada:SESSAO,config:{turnstileSiteKey:'0xCHAVE-PUBLICA'}});await g.nuvem.trocarSenha(FORTE,'senha-original-1');
  assert.equal(g.chamou('signInWithPassword').length,0);assert.equal(g.chamou('updateUser')[0][1].current_password,'senha-original-1');
});
test('troca de senha: nova fraca, igual à atual ou sem a atual não chega ao servidor',async()=>{
  const f=fixture({guardada:SESSAO});
  await assert.rejects(()=>f.nuvem.trocarSenha('fraca','senha-original-1'),/10 caracteres/);
  await assert.rejects(()=>f.nuvem.trocarSenha(FORTE,FORTE),/diferente da atual/);
  await assert.rejects(()=>f.nuvem.trocarSenha(FORTE,''),/senha atual/);
  assert.equal(f.chamou('updateUser').length+f.chamou('signInWithPassword').length,0);
});
test('quando o servidor exige reautenticação, o código por e-mail vai como nonce',async()=>{
  const f=fixture({guardada:SESSAO});let n=0;
  f.est.resp.updateUser=()=>(++n===1?{data:null,error:{status:422,code:'reauthentication_needed',message:'Password update requires reauthentication'}}:{data:{user:USUARIO},error:null});
  let erro;try{await f.nuvem.trocarSenha(FORTE,'senha-original-1');}catch(e){erro=e;}
  assert.ok(erro&&erro.reautenticar===true);await f.nuvem.reautenticar();assert.equal(f.chamou('reauthenticate').length,1);
  await f.nuvem.trocarSenha(FORTE,'senha-original-1','123456');assert.equal(f.chamou('updateUser')[1][1].nonce,'123456');
});
test('definir a senha pelo link de recuperação não exige a senha antiga',async()=>{
  const f=fixture({guardada:SESSAO});await f.nuvem.trocarSenha(FORTE);const u=f.chamou('updateUser')[0][1];assert.equal(u.password,FORTE);assert.equal('current_password' in u,false);assert.equal(f.chamou('signInWithPassword').length,0);
});
test('senha fraca recusada pelo servidor vira mensagem em português',async()=>{
  const f=fixture();f.est.resp.signUp={data:null,error:{status:422,code:'weak_password',message:'Password is known to be weak and easy to guess'}};
  await assert.rejects(()=>f.nuvem.cadastrar('ana@example.invalid',FORTE,'Ana'),/Senha fraca/);
});
test('o armazenamento local guarda só a sessão do SDK, nunca a senha',async()=>{
  const f=fixture();await f.nuvem.entrar('ana@example.invalid','senha-original-1');
  assert.ok(![...f.localStorage.dados.values()].some(v=>String(v).includes('senha-original-1')));
});
