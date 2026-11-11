const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,executar,armazenamento}=require('./helpers.cjs');
/* Cliente de login com um fetch falso: nenhuma rede, nenhuma senha ou token reais. */
function fixture({hash='',respostas=[]}={}){
  const chamadas=[],fila=[...respostas],localStorage=armazenamento(),trocas=[];
  const fetch=async(url,opt={})=>{chamadas.push({url:String(url),metodo:opt.method||'GET',corpo:opt.body?JSON.parse(opt.body):null,auth:(opt.headers||{}).Authorization||''});
    const r=fila.shift()||{status:200,json:{}};return {ok:r.status<400,status:r.status,statusText:'x',text:async()=>JSON.stringify(r.json??null)};};
  const window={NUVEM_CONFIG:{url:'https://projeto.supabase.invalid',chave:'chave-publica-de-teste'}};
  const ctx=vm.createContext({window,localStorage,fetch,location:{hash,href:'https://site.invalid/conta.html',pathname:'/conta.html',search:''},history:{replaceState:(a,b,c)=>trocas.push(c)},document:{hidden:false,addEventListener(){}},URLSearchParams,setTimeout,clearTimeout,encodeURIComponent,navigator:{}});
  executar('js/nuvem.js',ctx);
  return {nuvem:window.nuvem,chamadas,localStorage,trocas};
}
const sessao=(extra={})=>({status:200,json:{access_token:'tok-acesso',refresh_token:'tok-renova',expires_in:3600,user:{id:'u1',email:'ana@example.invalid',user_metadata:{nome:'Ana'}},...extra}});
const FORTE='Cavalo-Azul-2026';

test('regra de senha: 10 caracteres, com letras e números',()=>{
  const {nuvem}=fixture();
  assert.equal(nuvem.SENHA_MIN,10);
  for(const ruim of ['curta1','sóletrasmuitolongas','12345678901234','','         '])assert.equal(nuvem.validarSenha(ruim).ok,false,ruim);
  assert.equal(nuvem.validarSenha('abcdefghi1').ok,true);assert.equal(nuvem.validarSenha(FORTE).ok,true);
  assert.match(nuvem.validarSenha('abc').erro,/10 caracteres/);
});
test('cadastro: senha fraca nem chega ao servidor',async()=>{
  const f=fixture();
  await assert.rejects(()=>f.nuvem.cadastrar('ana@example.invalid','fraca1','Ana'),/10 caracteres/);
  assert.equal(f.chamadas.length,0);
});
test('cadastro com confirmação obrigatória: sem sessão, pede o e-mail e não guarda nada',async()=>{
  const f=fixture({respostas:[{status:200,json:{id:'u1',email:'ana@example.invalid',confirmation_sent_at:'2026-11-11T00:00:00Z'}}]});
  const r=await f.nuvem.cadastrar('ana@example.invalid',FORTE,'Ana','https://site.invalid/conta.html');
  assert.equal(r.confirmar,true);assert.equal(f.nuvem.usuario(),null);assert.equal(f.localStorage.getItem('nuvem_sessao'),null);
  assert.match(f.chamadas[0].url,/\/auth\/v1\/signup\?redirect_to=https%3A%2F%2Fsite\.invalid%2Fconta\.html$/);
  assert.equal(f.chamadas[0].corpo.password,FORTE);          // a senha só vai ao Supabase, nunca para o armazenamento local
  assert.ok(!JSON.stringify([...f.localStorage.dados.values()]).includes(FORTE));
});
test('cadastro em projeto que ainda não exige confirmação devolve o usuário logado',async()=>{
  const f=fixture({respostas:[sessao()]});const u=await f.nuvem.cadastrar('ana@example.invalid',FORTE,'Ana');
  assert.equal(u.id,'u1');assert.equal(f.nuvem.usuario().id,'u1');
});
test('reenvio da confirmação usa o endpoint oficial',async()=>{
  const f=fixture();await f.nuvem.reenviarConfirmacao('ana@example.invalid','https://site.invalid/conta.html');
  assert.match(f.chamadas[0].url,/\/auth\/v1\/resend\?redirect_to=/);assert.deepEqual(JSON.parse(JSON.stringify(f.chamadas[0].corpo)),{type:'signup',email:'ana@example.invalid'});
});
test('recuperação de senha: não revela se o e-mail existe',async()=>{
  const f=fixture({respostas:[{status:200,json:{}}]});await f.nuvem.esqueciSenha('qualquer@example.invalid','https://site.invalid/conta.html');
  assert.match(f.chamadas[0].url,/\/auth\/v1\/recover\?redirect_to=/);
  const g=fixture({respostas:[{status:400,json:{msg:'User not found'}}]});await assert.doesNotReject(()=>g.nuvem.esqueciSenha('naoexiste@example.invalid'));
  const h=fixture({respostas:[{status:500,json:{msg:'erro do servidor'}}]});await assert.rejects(()=>h.nuvem.esqueciSenha('x@example.invalid'));
});
test('link de recuperação: guarda a sessão, informa o tipo e tira os tokens do endereço',async()=>{
  const hash='#access_token=tok-recuperacao&refresh_token=tok-renova&expires_in=3600&type=recovery';
  const f=fixture({hash,respostas:[{status:200,json:{id:'u1',email:'ana@example.invalid'}}]});
  const u=await f.nuvem.retornoDoLink();
  assert.equal(u.id,'u1');assert.equal(f.nuvem.retornoTipo(),'recovery');assert.deepEqual(f.trocas,['/conta.html']);   // endereço limpo
  assert.equal(f.chamadas[0].auth,'Bearer tok-recuperacao');
});
test('link expirado ou já usado vira mensagem clara em português',async()=>{
  const f=fixture({hash:'#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'});
  await assert.rejects(()=>f.nuvem.retornoDoLink(),/expirou ou já foi usado/);
});
test('troca de senha: a senha atual é conferida pelo servidor antes de qualquer alteração',async()=>{
  const f=fixture({respostas:[sessao(),{status:400,json:{msg:'Invalid login credentials'}}]});
  await f.nuvem.entrar('ana@example.invalid','senha-original-1');
  await assert.rejects(()=>f.nuvem.trocarSenha(FORTE,'senha-errada-99'),/senha atual está incorreta/);
  assert.ok(!f.chamadas.some(c=>c.metodo==='PUT'),'nenhuma alteração pode ser enviada');
});
test('troca de senha correta: reautentica no servidor e envia current_password',async()=>{
  const f=fixture({respostas:[sessao(),sessao(),{status:200,json:{}}]});
  await f.nuvem.entrar('ana@example.invalid','senha-original-1');
  await f.nuvem.trocarSenha(FORTE,'senha-original-1');
  const put=f.chamadas.find(c=>c.metodo==='PUT');
  assert.match(put.url,/\/auth\/v1\/user$/);assert.equal(put.corpo.password,FORTE);assert.equal(put.corpo.current_password,'senha-original-1');assert.ok(put.auth.startsWith('Bearer '));
  assert.ok(f.chamadas.some(c=>/grant_type=password/.test(c.url)&&c.corpo.password==='senha-original-1'),'a senha atual foi validada pelo servidor');
});
test('troca de senha: nova fraca, igual à atual ou sem a atual não chega ao servidor',async()=>{
  const f=fixture({respostas:[sessao()]});await f.nuvem.entrar('ana@example.invalid','senha-original-1');const antes=f.chamadas.length;
  await assert.rejects(()=>f.nuvem.trocarSenha('fraca','senha-original-1'),/10 caracteres/);
  await assert.rejects(()=>f.nuvem.trocarSenha(FORTE,FORTE),/diferente da atual/);
  await assert.rejects(()=>f.nuvem.trocarSenha(FORTE,''),/senha atual/);
  assert.equal(f.chamadas.length,antes);
});
test('quando o servidor exige reautenticação, o código por e-mail vai como nonce',async()=>{
  const f=fixture({respostas:[sessao(),sessao(),{status:422,json:{msg:'Password update requires reauthentication',error_code:'reauthentication_needed'}},{status:200,json:{}},sessao(),{status:200,json:{}}]});
  await f.nuvem.entrar('ana@example.invalid','senha-original-1');
  let erro;try{await f.nuvem.trocarSenha(FORTE,'senha-original-1');}catch(e){erro=e;}
  assert.ok(erro&&erro.reautenticar===true);
  await f.nuvem.reautenticar();assert.ok(f.chamadas.some(c=>/\/auth\/v1\/reauthenticate$/.test(c.url)&&c.metodo==='GET'));
  await f.nuvem.trocarSenha(FORTE,'senha-original-1','123456');
  const puts=f.chamadas.filter(c=>c.metodo==='PUT');assert.equal(puts.length,2);assert.equal(puts[1].corpo.nonce,'123456');
});
test('definir a senha pelo link de recuperação não exige a senha antiga',async()=>{
  const f=fixture({respostas:[sessao(),{status:200,json:{}}]});await f.nuvem.entrar('ana@example.invalid','senha-original-1');
  await f.nuvem.trocarSenha(FORTE);const put=f.chamadas.find(c=>c.metodo==='PUT');assert.equal(put.corpo.password,FORTE);assert.equal('current_password' in put.corpo,false);
});
test('senha fraca recusada pelo servidor também vira mensagem em português',async()=>{
  const f=fixture({respostas:[{status:422,json:{msg:'Password is known to be weak and easy to guess, please choose a different one.',error_code:'weak_password'}}]});
  await assert.rejects(()=>f.nuvem.cadastrar('ana@example.invalid',FORTE,'Ana'),/Senha fraca/);
});
test('sair apaga a sessão local e avisa o servidor',async()=>{
  const f=fixture({respostas:[sessao(),{status:204,json:null}]});await f.nuvem.entrar('ana@example.invalid','senha-original-1');
  assert.ok(f.localStorage.getItem('nuvem_sessao'));await f.nuvem.sair();
  assert.equal(f.nuvem.usuario(),null);assert.equal(f.localStorage.getItem('nuvem_sessao'),null);assert.ok(f.chamadas.some(c=>/\/auth\/v1\/logout$/.test(c.url)));
});
test('o armazenamento local guarda só a sessão, nunca a senha',async()=>{
  const f=fixture({respostas:[sessao()]});await f.nuvem.entrar('ana@example.invalid','senha-original-1');
  assert.deepEqual([...f.localStorage.dados.keys()],['nuvem_sessao']);assert.ok(!f.localStorage.getItem('nuvem_sessao').includes('senha-original-1'));
});
