const {test}=require('node:test'),assert=require('node:assert/strict'),{ler}=require('./helpers.cjs'),gerar=require('./fixtures/campos-mestre.cjs');
const sql=ler('supabase/migrations/20261112171652_proteger_campos_mestre.sql');
test('catálogo autorizado no servidor corresponde às definições atuais dos itens do aplicativo',()=>{
 const {vm}=require('./helpers.cjs'),c=vm.createContext({window:{}});for(const n of ['regras','inventario','itens-efeitos'])vm.runInContext(ler('js/'+n+'.js'),c);
 const servidor=JSON.parse(sql.match(/\$catalogo\$(.*?)\$catalogo\$/s)[1]),cliente=Object.values(c.window.ITENS_EFEITOS.CATALOGO).map(m=>({ref:m.ref,tipo:m.tipo,propriedades:JSON.parse(JSON.stringify(m.propriedades))}));assert.deepEqual(servidor,cliente);
});
test('estados SQL de jogo vêm dos motores: concessão, edição, uso, cargas, sintonia, cura e descanso',()=>{
 const f=gerar();assert.equal(f.uso.ficha.magiasMestre[0].concessao.usos.usados,1);assert.equal(f.descanso.ficha.magiasMestre[0].concessao.usos.usados,0);assert.equal(f.carga.inventario[0].propriedades.cargas.atual,2);assert.equal(f.carga.inventario[0].propriedades.sintonia.sintonizado,true);assert.equal(f.consumo.pv_atual,19);assert.ok(!f.consumo.inventario.some(i=>i.ref==='srd51:item/potion-of-healing'));assert.equal(f.original.ficha.magiasMestre[0].concessao.usos.max,2);
});
test('migração não altera dados das campanhas e não cria RPC pública privilegiada',()=>{
 assert.doesNotMatch(sql,/\b(?:update|delete\s+from|truncate)\s+public\.(?:personagens|campanhas)\b/i);assert.doesNotMatch(sql,/create\s+(?:or replace\s+)?function\s+public\./i);assert.match(sql,/before insert or update on public.personagens/);assert.match(sql,/security definer set search_path=''/);assert.match(sql,/c\.mestre_id=ator/);assert.doesNotMatch(sql,/auth\.jwt\(|user_metadata/);assert.match(sql,/from public,anon,authenticated/);
});
