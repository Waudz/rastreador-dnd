const {test}=require("node:test"),assert=require("node:assert/strict");
const {executar,ler,vm}=require("./helpers.cjs");
const c=vm.createContext({window:{}});executar("js/edicoes.js",c);const E=c.window.EDICOES;
test("2014 é padrão e 2024 permanece desabilitado",()=>{
  assert.equal(E.padrao,"2014");assert(E.permitida({document:{key:"srd-2014"}}));assert.equal(E.permitida({document:{key:"srd-2024"}}),false);
  assert.equal(E.permitida({key:"srd-2024"}),false);assert.equal(E.permitida({e:"2024"}),false);assert.equal(E.permitida({document:{display_name:"SRD 5.2"}}),false);
});
test("criações pessoais e conteúdo do livro pessoal permanecem",()=>{assert(E.permitida({custom:true,key:"meu-heroi-2024"}));assert(E.permitida({document:{key:"ldj"}}));});
test("consulta aceita o catálogo 2014 e adições do administrador; exclui outras fontes",()=>{assert(E.catalogo2014({document:{key:'srd-2014'}}));assert(E.catalogo2014({document:{key:'admin-2014'}}));assert(E.catalogo2014({custom:true,key:'criacao'}));assert.equal(E.catalogo2014({document:{key:'srd-2024'}}),false);assert.equal(E.catalogo2014({document:{key:'outro-livro'}}),false);});
test("consulta não oferece download externo nem ferramenta de dados",()=>{const html=ler('iniciativa.html'),app=ler('js/app.js');for(const id of ['dl-open','docs-wrap','packs','mais','bk-imp','tr-imp','synctop'])assert.ok(!html.includes('id="'+id+'"'),id);assert.ok(!app.includes('https://api.open5e.com'));assert.ok(!app.includes('data-online='));});
