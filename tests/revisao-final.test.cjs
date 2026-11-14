const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ler}=require('./helpers.cjs');
test('Enter submete o formulário de login sem acionamento duplo',()=>{
 const html=ler('entrar.html'),js=ler('js/entrar.js');
 assert.match(html,/<button type="submit" form="form-login" class="primary" id="btn-login">/);
 assert.match(js,/form-login"\)\.addEventListener\("submit"/);
 assert.match(js,/btn-login"\)\.onclick =/);
});
test('catálogo global não restaura cache quando não há usuário autenticado',()=>{
 const js=ler('js/catalogo.js');
 assert.match(js,/const c=nuvem\.usuario\(\)\?/);
 /* visitante: o cache local é removido (uma vez) e nunca restaurado; o estado começa vazio */
 assert.match(js,/if\(!nuvem\.usuario\(\)\)\{if\(!visitanteLimpo\)\{visitanteLimpo=true;try\{localStorage\.removeItem\(CACHE\)/);
 assert.match(js,/let dados=\{globais:\{\}\}/);
});
test('migração não concede exclusão ou atualização de imagens globais',()=>{
 const sql=ler('supabase/catalogos-globais.sql');
 assert.match(sql,/drop policy if exists catalogos_apagar/);
 assert.doesNotMatch(sql,/create policy catalogos_apagar/);
 assert.doesNotMatch(sql,/create policy catalogos_atualizar/);
});
