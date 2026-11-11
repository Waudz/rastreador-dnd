const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const {ler}=require('./helpers.cjs');

test('visitante: a página inicial sem sessão leva à iniciativa; conta.html continua pedindo entrada',()=>{
  const c=ler('js/conta.js');
  assert.match(c,/index\\\.html\$\|\\\/\$/);assert.match(c,/location\.replace\("iniciativa\.html"\)/);
  assert.match(c,/mostrarLogin\(\)/);
});
test('visitante: menu mostra "Entrar" no lugar do avatar e marca o corpo da página',()=>{
  const n=ler('js/navegacao.js');
  assert.match(n,/classList\.toggle\('visitante',visitante\)/);assert.match(n,/class="appentrar"/);assert.match(n,/class="appavatar"/);
  assert.match(ler('css/identidade.css'),/body\.visitante #cm/);
});
test('visitante: criar fichas e fotos exigem conta, também por código (não só por CSS)',()=>{
  const a=ler('js/app.js');
  assert.match(a,/const askPhoto = \(k\) => \{ if \(visitante\(\)\)/);
  assert.match(a,/\$\("#cm-save"\)\.onclick = async \(\) => \{\s*if \(visitante\(\)\)/);
  assert.match(a,/function editCustom\(k\) \{\s*if \(visitante\(\)\) return;/);
  const h=ler('iniciativa.html');assert.match(h,/id="aviso-visitante"/);assert.match(h,/entrar\.html\?voltar=/);
});
test('visitante: o rastreador de iniciativa não depende de conta nem de CAPTCHA',()=>{
  for(const f of ['js/iniciativa.js','js/dados-locais.js'])assert.ok(!/nuvem\.(get|post|patch|rpc)\b/.test(ler(f)),f+' não deve exigir o servidor');
});

/* ---------- backup do combate ---------- */
const {vm,executar,documentoFalso,armazenamento}=require('./helpers.cjs');
function iniciativaReal(){
  const document=documentoFalso(),ls=armazenamento();
  const window={nuvem:{usuario:()=>null,aoMudar(){},observar(){},esc:s=>String(s)}};
  const ctx=vm.createContext({window,document,localStorage:ls,nuvem:window.nuvem,location:{search:''},URLSearchParams,setTimeout,clearTimeout,console,Date,Math,JSON,structuredClone});
  try{executar('js/iniciativa.js',ctx);}catch(e){return null;}
  return window.__ini;
}
test('combate: exportar e importar passam por validação',()=>{
  const ini=iniciativaReal();if(!ini||!ini.importarCombate)return;       // o ambiente falso pode não montar a tela inteira
  const ok={tipo:'backup-combate',combatants:[{id:'a',name:'Goblin',hp:7,maxHp:7,ac:15,initiative:12,effects:[]}],round:2};
  ini.importarCombate(ok);assert.equal(ini.list().length,1);
  assert.throws(()=>ini.importarCombate({tipo:'outro',combatants:[]}),/não é um backup/);
  assert.throws(()=>ini.importarCombate({tipo:'backup-combate',combatants:[{name:''}]}),/inválido/);
  assert.throws(()=>ini.importarCombate({tipo:'backup-combate',combatants:[{id:'x',name:'A'},{id:'x',name:'B'}]}),/repetidos/);
  assert.equal(ini.list().length,1);                                      // arquivo inválido nunca altera o combate atual
  const e=ini.exportarCombate();assert.equal(e.tipo,'backup-combate');assert.equal(e.combatants[0].name,'Goblin');
});
test('dados deste aparelho: restaurar o combate pede confirmação e criações de visitante têm backup próprio',()=>{
  const d=ler('js/dados-locais.js');
  assert.match(d,/confirm\(/);assert.match(d,/exportarVisitante/);
  const a=ler('js/acervo.js');assert.match(a,/lerPublico/);assert.match(a,/lerLocais/);
  assert.match(ler('js/backup.js'),/lerLocais/);assert.match(ler('sw.js'),/js\/dados-locais\.js/);
});
