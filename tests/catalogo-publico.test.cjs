/* Imagens do catálogo para visitantes sem conta: caminhos públicos mínimos, nada em localStorage, sem quebrar se a função não existir. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,ler,armazenamento}=require('./helpers.cjs');
const UID='0b3c5a52-1c2d-4e7a-9a11-0123456789ab',UID2='1b3c5a52-1c2d-4e7a-9a11-0123456789ab';

function visitante({rpc,logado=false}={}){
  const eventos=[],chamadas=[],ls=armazenamento();
  const nuvem={usuario:()=>logado?{id:'u1'}:null,observar(){},
    catalogoImagensPublicas:rpc?async()=>{chamadas.push('rpc');return rpc();}:undefined,
    get:async c=>{chamadas.push('get:'+c);return [{atualizado_em:'2026-01-01T00:00:00Z',dados:{globais:{'item:srd51:item/dagger':{tipo:'item',chave:'srd51:item/dagger',imagem:'itens/'+UID+'.png',imagemDefinida:true}}}}];}};
  const ctx=vm.createContext({window:{NUVEM_CONFIG:{url:'https://projeto.supabase.co'},addEventListener(){},dispatchEvent:e=>eventos.push(e.type)},nuvem,localStorage:ls,CustomEvent:class{constructor(t){this.type=t;}},console});
  vm.runInContext(ler('js/catalogo.js'),ctx);
  return {C:ctx.window.CATALOGO,eventos,chamadas,ls};
}

test('visitante sem conta: as imagens do catálogo vêm da função pública e viram URLs do bucket público',async()=>{
  const v=visitante({rpc:()=>[{tipo:'item',chave:'srd51:item/dagger',imagem:'itens/'+UID+'.png'},{tipo:'monstro',chave:'goblin',imagem:'monstros/'+UID2+'.jpg'}]});
  await v.C.carregar(true);
  assert.equal(v.C.imagem('item','srd51:item/dagger'),'https://projeto.supabase.co/storage/v1/object/public/catalogos/itens/'+UID+'.png');
  assert.equal(v.C.imagem('monstro','goblin'),'https://projeto.supabase.co/storage/v1/object/public/catalogos/monstros/'+UID2+'.jpg');
  assert.equal(v.C.imagem('item','srd51:item/longsword'),undefined,'sem registro: ícone padrão');
  assert.ok(v.eventos.includes('catalogo:atualizado'),'as telas são avisadas para redesenhar');
  assert.ok(!v.chamadas.some(c=>c.startsWith('get:')),'o visitante não lê a tabela do catálogo');
});

test('visitante: nada vai para o armazenamento do navegador e dados que não são imagem pública são ignorados',async()=>{
  const v=visitante({rpc:()=>[
    {tipo:'item',chave:'ok',imagem:'itens/'+UID+'.webp'},
    {tipo:'item',chave:'ruim1',imagem:'../segredo/'+UID+'.png'},{tipo:'item',chave:'ruim2',imagem:'itens/'+UID+'.svg'},{tipo:'item',chave:'ruim3',imagem:'https://evil.test/x.png'},
    {tipo:'personagem',chave:'x',imagem:'itens/'+UID+'.png'},{tipo:'item',chave:'ruim4'},null,'texto']});
  await v.C.carregar(true);
  assert.ok(v.C.imagem('item','ok'));for(const k of ['ruim1','ruim2','ruim3','ruim4'])assert.equal(v.C.imagem('item',k),undefined,k);assert.equal(v.C.imagem('personagem','x'),undefined);
  assert.equal(v.ls.dados.size,0,'sem cache local para visitante');
  assert.ok(v.C.registros('item').every(r=>!r.dados),'só o caminho da imagem, nenhum dado do catálogo');
});

test('visitante: função ainda não instalada, erro de rede ou resposta inválida não quebram nada',async()=>{
  for(const rpc of [()=>{throw Object.assign(new Error('404'),{status:404});},()=>null,()=>({erro:true}),()=>'x']){
    const v=visitante({rpc});await v.C.carregar(true);assert.equal(v.C.imagem('item','srd51:item/dagger'),undefined);assert.equal(v.C.registros('item').length,0);
  }
  const sem=visitante({});await sem.C.carregar(true);assert.equal(sem.C.imagem('item','x'),undefined,'cliente sem o método também não quebra');
});

test('logado: o caminho antigo continua lendo o catálogo completo e não usa a função pública',async()=>{
  const v=visitante({logado:true,rpc:()=>[{tipo:'item',chave:'x',imagem:'itens/'+UID+'.png'}]});
  await v.C.carregar(true);
  assert.ok(v.chamadas.some(c=>c.startsWith('get:')),'lê catalogo_publicado');assert.ok(!v.chamadas.includes('rpc'));
  assert.equal(v.C.imagem('item','srd51:item/dagger'),'https://projeto.supabase.co/storage/v1/object/public/catalogos/itens/'+UID+'.png');
});

test('o cliente chama só a função mínima com a chave pública e a SQL proposta não abre tabelas',()=>{
  const nuvem=ler('js/nuvem.js');
  assert.match(nuvem,/catalogoImagensPublicas: \(\) => http\(`\$\{base\}\/rest\/v1\/rpc\/catalogo_imagens_publicas`, \{ method: "POST", headers: \{ apikey: C\.chave,/);
  const plano=ler('docs/PLANO-IMAGENS-PUBLICAS.md'),sql=plano.slice(plano.indexOf('```sql')+6,plano.indexOf('```',plano.indexOf('```sql')+6));
  assert.match(sql,/security definer set search_path=''/);assert.match(sql,/stable/);assert.match(sql,/grant execute on function public\.catalogo_imagens_publicas\(\) to anon, authenticated/);
  assert.ok(!/grant\s+(select|all|insert|update|delete)/i.test(sql),'nenhum grant em tabela');assert.ok(!/policy/i.test(sql),'nenhuma policy alterada');
  assert.match(sql,/imagemDefinida/);assert.match(sql,/excluido/);
  assert.ok(!/'nome'|'dados'|ficha|personagens/.test(sql.replace(/c\.dados->'globais'/,'')),'não devolve nomes, dados nem fichas');
  assert.match(ler('supabase/catalogos-globais.sql'),/revoke all on public\.catalogo_publicado from public, anon/,'a tabela continua fechada');
  assert.ok(!require('node:fs').existsSync(require('node:path').join(__dirname,'..','supabase/migrations/20261114130000_imagens_publicas.sql')),'o SQL fica em docs até a aprovação');
});

test('imagem indisponível volta ao ícone padrão na aba Itens; o service worker não intercepta o Storage',()=>{
  const it=ler('js/itens.js');
  assert.ok(it.includes('document.addEventListener("error"')&&it.includes('inv-thumb-img')&&it.includes('inv-det-img'));
  assert.ok(ler('sw.js').includes('u.origin !== location.origin'),'requisições do Supabase vão direto pela rede');
  for(const h of ['itens.html','iniciativa.html','index.html'])assert.match(ler(h),/img-src [^;]*https:/,h+': a CSP permite imagens https');
});

test('imagem removida de propósito (null) vale para o visitante; o SQL revisado filtra excluídos, tipo/caminho e não faz cast que possa falhar',async()=>{
  const v=visitante({rpc:()=>[{tipo:'monstro',chave:'goblin',imagem:null},{tipo:'item',chave:'a:b/c.d-e',imagem:'itens/'+UID+'.png'},{tipo:'item',chave:'tem espaço',imagem:'itens/'+UID+'.png'}]});
  await v.C.carregar(true);
  assert.equal(v.C.imagem('monstro','goblin'),null,'removida: não volta a foto padrão por engano de "indefinido"');
  assert.ok(v.C.imagem('item','a:b/c.d-e'));assert.equal(v.C.imagem('item','tem espaço'),undefined,'chave fora do formato é ignorada');
  const plano=ler('docs/PLANO-IMAGENS-PUBLICAS.md'),sql=plano.slice(plano.indexOf('```sql')+6,plano.indexOf('```',plano.indexOf('```sql')+6));
  assert.match(sql,/r\.value->'imagemDefinida'='true'::jsonb/);assert.match(sql,/coalesce\(r\.value->'excluido','false'::jsonb\)<>'true'::jsonb/);
  assert.match(sql,/case r\.value->>'tipo' when 'item' then 'itens' else 'monstros' end/);assert.match(sql,/jsonb_typeof\(c\.dados->'globais'\)='object'/);
  assert.ok(!/::boolean|::integer|::bigint/.test(sql),'sem cast que quebre com JSON inesperado');
  assert.match(sql,/from public\.catalogo_publicado c/);assert.ok(!/\bjoin\b[^;]*personagens|campanhas|membros|storage\./i.test(sql.replace('cross join lateral','')),'não toca em outras tabelas');
});

test('permissões explícitas da função (sem depender do padrão) e envio ao bucket só por administradores',()=>{
  const plano=ler('docs/PLANO-IMAGENS-PUBLICAS.md'),sql=plano.slice(plano.indexOf('```sql')+6,plano.indexOf('```',plano.indexOf('```sql')+6));
  assert.match(sql,/revoke all on function public\.catalogo_imagens_publicas\(\) from public, anon, authenticated;/);
  assert.ok(sql.indexOf('revoke all')<sql.indexOf('grant execute'),'zera antes de conceder');
  assert.equal((sql.match(/grant execute/g)||[]).length,1);assert.ok(!/to public\b|to service_role/i.test(sql));
  const g=ler('supabase/catalogos-globais.sql');
  assert.match(g,/create policy catalogos_enviar on storage\.objects for insert to authenticated\s*with check\(bucket_id='catalogos' and \(select private\.conta_admin\(\)\)/);
  assert.match(g,/drop policy if exists catalogos_apagar/);assert.match(g,/drop policy if exists catalogos_atualizar/);
  assert.ok(!/create policy [^;]*for (update|delete)[^;]*catalogos/.test(g),'o bucket não aceita alteração nem remoção');
});

test('proposta SQL: arquivo único igual ao plano, teste SQL do §8 e passo no CI de banco descartável; nada em migrations',()=>{
  const plano=ler('docs/PLANO-IMAGENS-PUBLICAS.md'),bloco=plano.slice(plano.indexOf('```sql')+6,plano.indexOf('```',plano.indexOf('```sql')+6)).trim();
  const arq=ler('supabase/propostas/catalogo-imagens-publicas.sql'),corpo=arq.slice(arq.indexOf('begin;')).trim();
  const norm=t=>t.replace(/\r\n/g,'\n').replace(/\s+/g,' ');
  assert.equal(norm(corpo),norm(bloco),'o arquivo da proposta é idêntico ao SQL do plano');
  assert.match(arq,/^-- PROPOSTA — NÃO aplicada/);
  assert.match(ler('supabase/propostas/catalogo-imagens-publicas.rollback.sql'),/drop function if exists public\.catalogo_imagens_publicas\(\);/);
  const t=ler('tests/catalogo-imagens-publicas.test.sql');
  for(const c of ['set role anon','set role authenticated','insufficient_privilege','globais array','globais texto','sem a linha 2014','prosecdef','search_path=""','has_function_privilege','routine_privileges','rollback não removeu','SEGREDO'])assert.ok(t.includes(c),c);
  assert.match(t,/\i supabase\/propostas\/catalogo-imagens-publicas\.rollback\.sql/);
  const wf=ler('.github/workflows/validar.yml');
  assert.match(wf,/supabase\/propostas\/catalogo-imagens-publicas\.sql/);assert.match(wf,/tests\/catalogo-imagens-publicas\.test\.sql/);
  assert.ok(wf.indexOf('tests/admin.test.sql')<wf.indexOf('catalogo-imagens-publicas.test.sql'),'roda depois da criação de catalogo_publicado e do admin.test');
  assert.ok(!require('node:fs').readdirSync(require('node:path').join(__dirname,'..','supabase/migrations')).some(n=>/imagens_publicas|catalogo_imagens/.test(n)),'nenhuma migração de produção foi criada');
});
