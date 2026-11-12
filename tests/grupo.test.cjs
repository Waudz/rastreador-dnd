const {test}=require('node:test'),assert=require('node:assert/strict');
const {ler}=require('./helpers.cjs');
test('grupo: a função do banco devolve só foto, nome, jogador, PV e CA, só para membros, sem NPCs nem criaturas, e não mexe nas políticas',()=>{
  const sql=ler('supabase/migrations/20261112210000_grupo_basico.sql');
  assert.match(sql,/returns table\(id uuid,nome text,dono_id uuid,pv_atual integer,pv_max integer,pv_temp integer,ca integer,foto text\)/);
  assert.match(sql,/public\.eh_membro\(p_campanha\)/);assert.match(sql,/'npc'/);assert.match(sql,/'origem'/);
  assert.ok(!/(create|drop|alter)\s+policy/i.test(sql),'nenhuma política é alterada');assert.ok(!/inventario|dinheiro|ficha\s*,|p\.ficha\s*[,;]/.test(sql.replace(/p\.ficha->>'[a-z]+'/g,'')),'não devolve ficha, inventário nem dinheiro');
  assert.match(sql,/revoke all on function public\.grupo_basico\(uuid\) from public,anon/);
});
test('grupo completo: a função devolve a ficha sem notas, movimentos nem diário; inventário e dinheiro nunca são lidos; só membros; sem mudar políticas',()=>{
  const sql=ler('supabase/migrations/20261112230000_grupo_fichas.sql');
  assert.match(sql,/\(p\.ficha - 'notas' - 'movimentos' - 'diario'\)/);assert.match(sql,/public\.eh_membro\(p_campanha\)/);assert.match(sql,/'npc'/);assert.match(sql,/'origem'/);
  assert.ok(!/p\.inventario|p\.dinheiro/.test(sql),'inventário e dinheiro não são lidos');assert.ok(!/(create|drop|alter)\s+policy/i.test(sql));
  assert.match(sql,/revoke all on function public\.grupo_fichas\(uuid\) from public,anon/);
});
test('grupo: a aba é só de jogadores, mostra o mestre, abre a ficha em leitura (também pelo leitor lateral) e a visão não grava',()=>{
  const c=ler('js/campanha.js'),p=ler('js/personagem.js'),l=ler('js/leitor-fichas.js');
  assert.match(c,/\[\["grupo", "Grupo"\]\]/);assert.match(c,/rpc\("grupo_fichas"/);assert.match(c,/rpc\("grupo_basico"/);assert.match(c,/Mestre da campanha/);assert.match(c,/&grupo=\$\{encodeURIComponent\(id\)\}/);
  assert.match(l,/url\.searchParams\.get\('grupo'\)/,'o leitor lateral repassa o grupo');assert.match(l,/&grupo='\+encodeURIComponent\(grupo\)/);
  assert.match(p,/function agendar\(campos\) \{ if \(soLeitura\) return;/);assert.match(p,/if \(soLeitura \|\| !pend \|\| salvando\) return;/);
  assert.match(p,/for \(const k of \["inventario", "notas"\]\)/);assert.match(p,/if \(!visivel\) \{ await visaoGrupo/);
});
