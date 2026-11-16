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
 assert.match(js,/function ataqueComEncantamento\\(a\\)/);
 assert.match(js,/const magico = window\\.ITEM_ENCANTADO\\?\\.bonus\\(it\\) \\|\\| 0/);
 assert.match(js,/a = ataqueComEncantamento\\(a\\)/);
 assert.match(js,/ataqueComEncantamento\\(ATQ\\(\\)\\[\\+k\\]\\)/);
 assert.match(js,/readonly title=/);
 new vm.Script(js);
});
