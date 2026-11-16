const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ler=p=>fs.readFileSync(p,'utf8');
test('a janela mantém a borda padrão e somente a imagem recebe cor de raridade',()=>{
 const css=ler('css/itens.css');
 for(const rar of ['mundano','comum','incomum','rara','muito-rara','lendaria','artefato']){
   assert.match(css,new RegExp('\\.itens-modal\\.raridade-'+rar+' \\.inv-det-img'));
   assert.doesNotMatch(css,new RegExp('\\.itens-modal\\.raridade-'+rar+'\\{border-color'));
 }
});
test('ataque vinculado deriva bonus do item tanto para resumo quanto para rolagens',()=>{
 const js=ler('js/personagem.js');
 assert.ok(js.includes('function ataqueComEncantamento(a)'));
 assert.ok(js.includes('const magico = window.ITEM_ENCANTADO?.bonus(it) || 0'));
 assert.ok(js.includes('a = ataqueComEncantamento(a)'));
 assert.ok(js.includes('ataqueComEncantamento(ATQ()[+k])'));
 assert.ok(js.includes('readonly title='));
 new vm.Script(js);
});
