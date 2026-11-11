const {test}=require("node:test"),assert=require("node:assert/strict");
const {vm,executar}=require("./helpers.cjs");
const ctx=vm.createContext({window:{}});executar("js/regras.js",ctx);executar("js/personagens-dados.js",ctx);const D=ctx.window.PERSONAGENS_DADOS,R=ctx.window.REGRAS;
test("importação reconhece classe em descrições e não inventa multiclasse",()=>{
  assert.equal(D.classeDaDescricao("Anã, Clériga"),"Cleric");assert.equal(D.classeDaDescricao("Meio Elfo, Mago"),"Wizard");assert.equal(D.classeDaDescricao("Guerreiro 4"),"Fighter");assert.equal(D.classeDaDescricao("Guerreiro / Mago"),"");assert.equal(D.classeDaDescricao("Mercador"),"");
});
test("importação preserva atributos, habilidades, notas, nível e foto",()=>{
  const f=D.fichaDe({key:"heroi",cat:"player",subtitle:"Meio Elfo, Mago",level:4,ability_scores:{intelligence:18},traits:[{name:"Ancestral feérico",desc:"Descrição"}],spells:["Light"]},false,"data:image/png;base64,FOTO",R);
  assert.equal(f.classes.length,1);assert.equal(f.classes[0].c,"Wizard");assert.equal(f.classes[0].n,4);assert.equal(f.raca,"Meio-elfo");assert.equal(f.atributos.int,18);assert.equal(f.foto,"data:image/png;base64,FOTO");assert.match(f.notas,/Light/);assert.equal(f.caracteristicas[0].nome,"Ancestral feérico");
});
test("foto do navegador prevalece sobre cópia antiga do backup",()=>{assert.equal(D.fotoDaCriacao({key:"a",photo:"antiga"},{a:"nova"}),"nova");assert.equal(D.fotoDaCriacao({key:"a",photo:"antiga"},{}),"antiga");});
test("atribuição só informa sucesso se o banco confirmar o responsável",async()=>{
  const api={patch:async()=>[{dono_id:"jogador"}]};assert.equal((await D.atribuirDono(api,"id","jogador")).dono_id,"jogador");
  await assert.rejects(D.atribuirDono({patch:async()=>[]},"id","jogador"),/não foi confirmada/);
  await assert.rejects(D.atribuirDono({patch:async()=>[{dono_id:"mestre"}]},"id","jogador"),/não foi confirmada/);
});
test("recuperação de foto preserva alterações recentes da ficha",async()=>{
  let enviado,consulta;const api={get:async()=>[{id:"id",versao:7,ficha:{notas:"Edição recente",classe:"Mago"}}],patch:async(q,d)=>{consulta=q;enviado=d;return[{...d,id:"id"}];}};
  await D.atualizarFoto(api,"id","foto");assert.match(consulta,/versao=eq.7/);assert.equal(enviado.ficha.notas,"Edição recente");assert.equal(enviado.ficha.foto,"foto");
});
test("conflito ao atualizar foto refaz a leitura antes de gravar",async()=>{
  let v=1,chamadas=0,ultimo;const api={get:async()=>[{versao:v++,ficha:{notas:"versão "+v}}],patch:async(q,d)=>{chamadas++;ultimo=d;return chamadas===1?[]:[d];}};
  await D.atualizarFoto(api,"id","foto");assert.equal(chamadas,2);assert.equal(ultimo.ficha.notas,"versão 3");
});
test("conflito persistente ou falta de acesso não gera falso sucesso",async()=>{
  await assert.rejects(D.atualizarFoto({get:async()=>[],patch:async()=>[]},"id","foto"),/não encontrado/);
  await assert.rejects(D.atualizarFoto({get:async()=>[{versao:1}],patch:async()=>[]},"id","foto"),/ficha mudou/);
});
