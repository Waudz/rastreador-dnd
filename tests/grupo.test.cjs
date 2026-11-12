const {test}=require('node:test'),assert=require('node:assert/strict');
const {ler}=require('./helpers.cjs');
test('grupo: a função do banco devolve só foto, nome, jogador, PV e CA, só para membros, sem NPCs nem criaturas, e não mexe nas políticas',()=>{
  const sql=ler('supabase/migrations/20261112210000_grupo_basico.sql');
  assert.match(sql,/returns table\(id uuid,nome text,dono_id uuid,pv_atual integer,pv_max integer,pv_temp integer,ca integer,foto text\)/);
  assert.match(sql,/public\.eh_membro\(p_campanha\)/);assert.match(sql,/'npc'/);assert.match(sql,/'origem'/);
  assert.ok(!/(create|drop|alter)\s+policy/i.test(sql),'nenhuma política é alterada');assert.ok(!/inventario|dinheiro|ficha\s*,|p\.ficha\s*[,;]/.test(sql.replace(/p\.ficha->>'[a-z]+'/g,'')),'não devolve ficha, inventário nem dinheiro');
  assert.match(sql,/revoke all on function public\.grupo_basico\(uuid\) from public,anon/);
});
test('grupo: a aba é só de jogadores, abre a ficha em visão restrita e a visão do grupo não desenha a ficha completa',()=>{
  const c=ler('js/campanha.js'),p=ler('js/personagem.js');
  assert.match(c,/\[\["grupo", "Grupo"\]\]/);assert.match(c,/rpc\("grupo_basico"/);assert.match(c,/personagem\.html\?id=\$\{encodeURIComponent\(p\.id\)\}&grupo=/);
  const v=p.slice(p.indexOf('async function visaoGrupo'),p.indexOf('/* ---------- carregar ---------- */'));
  assert.ok(v.length>200&&!/desenhar\(\)|P = |personagens\?select=\*/.test(v),'a visão restrita não carrega nem desenha a ficha');
  assert.match(p,/if \(!visivel\) \{ await visaoGrupo/);
});
