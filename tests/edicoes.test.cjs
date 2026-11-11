const {test}=require("node:test"),assert=require("node:assert/strict");
const {executar,ler,vm}=require("./helpers.cjs");
const c=vm.createContext({window:{}});executar("js/edicoes.js",c);const E=c.window.EDICOES;
test("2014 é padrão e 2024 permanece desabilitado",()=>{
  assert.equal(E.padrao,"2014");assert(E.permitida({document:{key:"srd-2014"}}));assert.equal(E.permitida({document:{key:"srd-2024"}}),false);
  assert.equal(E.permitida({key:"srd-2024"}),false);assert.equal(E.permitida({e:"2024"}),false);assert.equal(E.permitida({document:{display_name:"SRD 5.2"}}),false);
});
test("criações pessoais e conteúdo do livro pessoal permanecem",()=>{assert(E.permitida({custom:true,key:"meu-heroi-2024"}));assert(E.permitida({document:{key:"ldj"}}));});
test("pacotes, monstros, magias e habilidades passam pelo filtro de edição",()=>{
  const s=ler("js/app.js");for(const padrao of ['ALL = (await rq','SP = (await rq','CF = (await r.json()).filter(EDICOES.permitida)','PACKS = (await r.json()).filter(EDICOES.permitida)'])assert(s.includes(padrao),padrao);
});
