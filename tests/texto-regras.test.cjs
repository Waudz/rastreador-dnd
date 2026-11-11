const {test}=require('node:test'),assert=require('node:assert/strict');const{vm,ler}=require('./helpers.cjs');
const c=vm.createContext({window:{}});vm.runInContext(ler('js/texto-regras.js'),c);const T=c.window.TEXTO_REGRAS;
test('títulos markdown são exibidos sem cerquilhas e com HTML seguro',()=>{const h=T.html('###Arquearia\nVocê recebe um bônus.\n<img src=x onerror=alert(1)>');assert.ok(!h.includes('###'));assert.ok(h.includes('class="regra-subtitulo"'));assert.ok(h.includes('&lt;img'));assert.ok(!h.includes('<img'));});
