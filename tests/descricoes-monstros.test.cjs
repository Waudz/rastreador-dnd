const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,executar,ler}=require('./helpers.cjs');
const {criar}=require('../js/descricoes-monstros.js');
const dados=require('../dados/descricoes-monstros-2014.json'),pack=require('../dados/bestiario/srd-2014.json');
test('todas as 325 criaturas do pacote têm uma descrição associada à chave correta',()=>{
 const api=criar(dados.monstros);assert.equal(pack.monsters.length,325);assert.equal(Object.keys(dados.monstros).length,pack.monsters.length);
 for(const m of pack.monsters){const r=api.obter(m);assert.ok(r,m.name);assert.equal(dados.monstros[m.key].nome,m.name);assert.ok(r.texto.length>=140,m.name);assert.ok(r.texto.length<1500,m.name);assert.match(r.origem,/original/);assert.doesNotMatch(r.texto,/TODO|Lorem ipsum|undefined|\[object Object\]/);}
});
test('consultar a descrição não altera estatísticas, ações ou campos da criatura',()=>{
 const api=criar(dados.monstros),antes=JSON.stringify(pack.monsters);for(const m of pack.monsters)api.obter(m);assert.equal(JSON.stringify(pack.monsters),antes);
});
test('descrição personalizada prevalece, inclusive para uma criatura do SRD editada globalmente',()=>{
 const api=criar(dados.monstros),m=pack.monsters[0];
 for(const campo of ['descricao','description','desc'])assert.equal(api.obter({...m,[campo]:'  Minha descrição.  ',global:true}).texto,'Minha descrição.');
 assert.equal(api.obter({key:'custom_exemplo',custom:true,descricao:'Meu monstro.'}).texto,'Meu monstro.');
});
test('criaturas desconhecidas e personalizadas sem texto não recebem lore de outro monstro',()=>{
 const api=criar(dados.monstros);for(const m of [null,{}, {key:'inexistente'}, {key:pack.monsters[0].key,custom:true}, {name:pack.monsters[0].name,custom:true}])assert.equal(api.obter(m),null);
});
test('descrição aparece separada na aba Principal e texto de usuário é escapado',()=>{
 const window={DESCRICOES_MONSTROS:criar(dados.monstros)},c=vm.createContext({window});executar('js/ficha-componentes.js',c);executar('js/ficha-monstro.js',c);
 const html=window.FICHA_MONSTRO.renderizar({monstro:{...pack.monsters[0],descricao:'<script>alert(1)</script>\n\nOutro parágrafo.'},nome:'Teste',retrato:'',subtitulo:'',meta:'',velocidade:'9 m',atributos:[],informacoes:'',acoes:'ATAQUE ORIGINAL',tracos:'TRAÇO ORIGINAL',magias:'',gerenciar:''});
 assert.match(html,/criatura-descricao/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/<p>Outro parágrafo\.<\/p>/);assert.match(html,/ATAQUE ORIGINAL/);assert.match(html,/TRAÇO ORIGINAL/);assert.ok(html.indexOf('criatura-descricao')<html.indexOf('id="criatura-acoes"'));
});
test('falha ao carregar as descrições não interrompe o catálogo de regras',async()=>{
 const window={},c=vm.createContext({window,fetch:async()=>{throw Error('Sem rede');}});executar('js/descricoes-monstros.js',c);assert.equal(await window.DESCRICOES_MONSTROS.pronto,false);assert.equal(window.DESCRICOES_MONSTROS.obter(pack.monsters[0]),null);
});
test('o carregamento aguarda os textos e o service worker inclui o conteúdo offline',()=>{
 assert.match(ler('iniciativa.html'),/js\/descricoes-monstros\.js/);assert.match(ler('js/app.js'),/await window\.DESCRICOES_MONSTROS\?\.pronto/);for(const p of ['js/descricoes-monstros.js','dados/descricoes-monstros-2014.json'])assert.ok(ler('sw.js').includes(p));assert.equal(dados.licenca,'CC-BY-4.0');assert.match(dados.natureza,/originais/);
});
