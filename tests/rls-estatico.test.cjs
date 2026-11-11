const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {ler,root}=require('./helpers.cjs');
/* Análise estática do SQL e do código. NÃO substitui rodar o banco: as políticas reais são exercitadas por
   tests/supabase.test.sql e tests/supabase-permissoes.test.sql (CI) e pelas verificações do painel do Supabase (supabase/VALIDACAO.md). */
const sql=['supabase/01-schema.sql','supabase/02-acervos-e-transferencia.sql','supabase/03-administracao-conta.sql'].map(ler).join('\n');
const limpo=sql.replace(/--[^\n]*/g,'');
const tabelas=[...limpo.matchAll(/create table if not exists (public|private)\.(\w+)/g)].map(m=>m[1]+'.'+m[2]);

test('toda tabela criada tem segurança por linha (RLS) ligada',()=>{
  assert.ok(tabelas.length>=8,'tabelas: '+tabelas.join(', '));
  for(const t of tabelas)assert.match(limpo,new RegExp('alter table '+t.replace('.','\\.')+'\\s+enable row level security'),t);
});
test('o papel anônimo não recebe permissão em nenhuma tabela ou função do aplicativo',()=>{
  for(const m of limpo.matchAll(/grant [^;]*? to ([^;]*);/gi))assert.ok(!/\banon\b/.test(m[1]),'grant para anon: '+m[0].slice(0,80));
  assert.match(limpo,/revoke all on public\.perfis, public\.campanhas, public\.membros, public\.personagens, public\.documentos from anon/);
});
test('código de convite: coluna fora da lista de leitura e só funções do mestre o devolvem',()=>{
  assert.match(limpo,/grant select \(id, nome, mestre_id, criado_em\) on public\.campanhas to authenticated/);
  assert.ok(!/grant select[^;]*\bcodigo\b[^;]*on public\.campanhas/.test(limpo));
  assert.match(limpo,/if not public\.eh_mestre\(p_campanha\) then raise exception 'Só o mestre vê o código\.'/);
  assert.match(limpo,/if not public\.eh_mestre\(p_campanha\) then raise exception 'Só o mestre troca o código\.'/);
});
test('participantes só mudam por funções: sem permissão direta de inserir ou alterar membros',()=>{
  assert.match(limpo,/grant select, delete\s+on public\.membros\s+to authenticated/);
  assert.match(limpo,/insert into public\.membros \(campanha_id, usuario_id, papel\) values \(c\.id, auth\.uid\(\), 'jogador'\)/);   // convite entra sempre como jogador
});
test('administrador: tabela fora do alcance do navegador e papel dado só pelo servidor',()=>{
  assert.match(limpo,/revoke all on private\.administradores from public,anon,authenticated/);
  assert.ok(!/grant (insert|update|delete)[^;]*private\.administradores/.test(limpo));
  assert.ok(!/(insert into|update|delete from) private\.administradores/.test(ler('js/nuvem.js')+ler('js/conta.js')+ler('js/admin.js')));
  assert.match(limpo,/catalogo_admin on public\.catalogo_publicado for all to authenticated using \(\(select private\.conta_admin\(\)\)\)/);
});
test('funções com permissão elevada fixam o search_path e exigem usuário logado ou papel',()=>{
  const funcoes=limpo.split(/create or replace function /).slice(1).filter(f=>/security definer/i.test(f));
  assert.ok(funcoes.length>=8);
  for(const f of funcoes)assert.match(f.split(/\$\$/)[0],/set search_path\s*=\s*''/i,f.slice(0,60));
  for(const nome of ['criar_campanha','entrar_na_campanha','codigo_da_campanha','novo_codigo_da_campanha'])assert.match(limpo,new RegExp('revoke all on function[^;]*'+nome));
});
test('Storage: bucket privado, tipos e tamanho limitados, e arquivos seguem a campanha',()=>{
  assert.match(limpo,/values \('documentos', 'documentos', false, 10485760/);
  assert.match(limpo,/allowed_mime_types = array\['application\/pdf'/);
  assert.match(limpo,/create policy docs_ler on storage\.objects for select to authenticated\s+using \(bucket_id = 'documentos' and exists \(\s*select 1 from public\.documentos d\s+where d\.arquivo_path = storage\.objects\.name\s+and \(public\.eh_mestre\(d\.campanha_id\) or \(public\.eh_membro\(d\.campanha_id\) and d\.visivel\)\)\)\)/);
  for(const p of ['docs_enviar','docs_trocar','docs_apagar'])assert.match(limpo,new RegExp('create policy '+p+' on storage\\.objects[\\s\\S]*?eh_mestre\\(public\\.uuid_ou_nulo\\(\\(storage\\.foldername\\(name\\)\\)\\[1\\]\\)\\)'));
});
test('ficha: jogador só vê as próprias; dono e campanha não mudam por quem não é mestre',()=>{
  assert.match(limpo,/create policy personagens_ver on public\.personagens for select to authenticated\s+using \(dono_id = \(select auth\.uid\(\)\) or public\.eh_mestre\(campanha_id\)\)/);
  assert.match(limpo,/if not public\.eh_mestre\(old\.campanha_id\) then[\s\S]*?new\.campanha_id\s*:=\s*old\.campanha_id;\s*new\.dono_id\s*:=\s*old\.dono_id/);
});
test('nenhum segredo (senha, service_role, token ou chave privada) no código publicado',()=>{
  const arquivos=[];(function varre(d){for(const e of fs.readdirSync(path.join(root,d),{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory()){if(!['.git','node_modules','tests','docs'].includes(e.name))varre(p);}else if(/\.(js|html|json|sql|md|yml|cjs|py)$/.test(e.name))arquivos.push(p);}})('.');
  const padroes=[/sb_secret_[A-Za-z0-9_-]{10,}/,/github_pat_[A-Za-z0-9_]{20,}/,/ghp_[A-Za-z0-9]{30,}/,/BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/,/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/];
  for(const a of arquivos){const t=fs.readFileSync(path.join(root,a),'utf8');for(const p of padroes)assert.ok(!p.test(t),'possível segredo em '+a);}
  assert.ok(!/service_role/.test(ler('js/nuvem.js')+ler('js/config-nuvem.js')+ler('js/conta.js')));
});
test('o cliente de login só grava a sessão no navegador (pelo SDK) e nunca a senha',()=>{
  const n=ler('js/nuvem.js'),usos=[...n.matchAll(/localStorage\.setItem\(([^,]+),/g)].map(m=>m[1].trim());
  assert.deepEqual(usos,['k']);                                   // só o adaptador de armazenamento entregue ao SDK
  assert.ok(!/armazem\.setItem\(/.test(n),'o aplicativo não grava sessão por conta própria');
  assert.ok(!/sessionStorage|document\.cookie/.test(n));
  assert.ok(!/console\.(log|info|debug)\([^)]*(senha|password|token)/i.test(n));
  assert.match(n,/storageKey: CHAVE_SESSAO, storage: armazem/);
});
test('a política de segurança do site só permite o Supabase como destino de rede',()=>{
  for(const h of fs.readdirSync(root).filter(f=>f.endsWith('.html'))){const t=ler(h);if(!/Content-Security-Policy/.test(t))continue;
    assert.match(t,/connect-src 'self' https:\/\/pdjzahpxjrlbqqtzkfdr\.supabase\.co/,h);assert.match(t,/script-src 'self'/,h);assert.ok(!/script-src[^;]*unsafe-inline/.test(t),h);}
});
