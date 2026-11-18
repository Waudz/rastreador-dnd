const {test}=require('node:test');
const assert=require('node:assert/strict');
const {vm,ler,armazenamento}=require('./helpers.cjs');

const base={key:'base',name:'Dragon',document:{key:'srd-2014'}};
const pessoal={key:'pessoal',name:'Meu Monstro',custom:true,document:{key:'srd-2014'}};

function fixture({administrador=true,existente=null,conflito=false}={}){
 const chamadas=[],uploads=[];
 const registro=existente||{atualizado_em:'2026-01-01T00:00:00Z',dados:{globais:{}}};
 const nuvem={
  usuario:()=>({id:'adm'}),
  get:async caminho=>{
   if(caminho.includes('select=atualizado_em'))return [{atualizado_em:registro.atualizado_em}];
   return [registro];
  },
  enviarArquivo:async(path,blob,bucket)=>{uploads.push({path,blob,bucket});},
  rpc:async (nome,args)=>{
   chamadas.push({nome,args});
   if(conflito)throw Error('O catálogo mudou em outro dispositivo.');
   return {tipo:args.p_tipo,chave:args.p_chave,dados:args.p_dados,
    versao:args.p_versao+1,imagem:null,imagemDefinida:args.p_alterar_imagem,excluido:args.p_excluido};
  }
 };
 const window={ACESSO:{admin:()=>administrador,pronto:Promise.resolve(true)},
  FEEDBACK:{mostrar(){}},NUVEM_CONFIG:{url:'https://example.supabase.co'},addEventListener(){},dispatchEvent(){}};
 const contexto=vm.createContext({window,nuvem,Blob,atob,Uint8Array,crypto:require("node:crypto").webcrypto,localStorage:armazenamento(),CustomEvent:class {constructor(tipo){this.type=tipo;}}});
 vm.runInContext(ler('js/catalogo.js'),contexto);
 return {C:window.CATALOGO,chamadas,uploads};
}

test('usuário sem permissão administrativa não altera o catálogo global',async()=>{
 const f=fixture({administrador:false});
 await assert.rejects(f.C.salvar('monstro','base',base),/Somente administradores/);
 assert.equal(f.chamadas.length,0);
});

test('sincronizar somente monstros personalizados não grava no catálogo global',async()=>{
 const f=fixture();
 await f.C.atualizar({registros:[pessoal],nomes:{'meu monstro':'Pessoal'}});
 assert.equal(f.chamadas.length,0);
});

test('administrador grava monstro público por RPC versionada sem publicar personalizados',async()=>{
 const f=fixture();
 await f.C.atualizar({registros:[base,pessoal],nomes:{dragon:'Dragão','meu monstro':'Pessoal'}});
 assert.equal(f.chamadas.length,1);
 assert.equal(f.chamadas[0].nome,'salvar_catalogo_global');
 assert.equal(f.chamadas[0].args.p_tipo,'monstro');
 assert.equal(f.chamadas[0].args.p_chave,'base');
 assert.equal(f.chamadas[0].args.p_versao,0);
 assert.equal(f.chamadas[0].args.p_dados.nomeCatalogo,'Dragão');
});

test('conflito de versão não é apresentado como gravação bem-sucedida',async()=>{
 const f=fixture({conflito:true});
 await assert.rejects(f.C.salvar('monstro','base',base),/mudou em outro dispositivo/);
 assert.equal(f.chamadas.length,1);
});

const criacaoCompartilhada={...pessoal,custom:false,criacaoPublicada:true};
const registroCompartilhado=(excluido=false)=>({atualizado_em:'2026-01-01',dados:{globais:{'monstro:pessoal':{tipo:'monstro',chave:'pessoal',dados:criacaoCompartilhada,versao:3,excluido}}}});

test('publicação é explícita, administrativa e não modifica a criação privada',async()=>{
 const f=fixture();const antes=JSON.stringify(pessoal);
 await f.C.publicarMonstro(pessoal);
 assert.equal(JSON.stringify(pessoal),antes);
 assert.equal(f.chamadas[0].args.p_dados.custom,false);
 assert.equal(f.chamadas[0].args.p_dados.criacaoPublicada,true);
 assert.equal(f.chamadas[0].args.p_excluido,false);
 const jogador=fixture({administrador:false});
 await assert.rejects(jogador.C.publicarMonstro(pessoal),/Somente administradores/);
 assert.equal(jogador.chamadas.length,0);
 await assert.rejects(f.C.publicarMonstro({...pessoal,cat:'player'}),/criação própria/);
});

test('compartilhar não duplica a criação e um jogador recebe a ficha para leitura',async()=>{
 const f=fixture({administrador:false,existente:registroCompartilhado()});await f.C.carregar();
 const lista=f.C.monstros([base,pessoal]);
 assert.equal(lista.length,2);
 assert.equal(lista.filter(m=>m.key==='pessoal').length,1);
 const m=lista.find(m=>m.key==='pessoal');assert.equal(m.global,true);assert.equal(m.custom,false);
 await assert.rejects(f.C.salvar('monstro',m.key,m),/Somente administradores/);
 // Dados de combate e cópias do consumidor não alteram o registro compartilhado.
 m.name='Alteração no combate';assert.equal(f.C.registro('monstro','pessoal').dados.name,pessoal.name);
});

test('ocultar retira do catálogo do jogador, mantém a criação gerenciável pelo admin e pode desocultar',async()=>{
 for(const administrador of [true,false]){
  const f=fixture({administrador,existente:registroCompartilhado(true)});await f.C.carregar();
  assert.equal(f.C.monstros([base,pessoal]).some(m=>m.key==='pessoal'),administrador);
 }
 const f=fixture({existente:registroCompartilhado(true)});await f.C.carregar();
 await f.C.salvar('monstro','pessoal',{...criacaoCompartilhada,name:'Novo nome'});
 assert.equal(f.chamadas[0].args.p_excluido,true,'editar não desoculta');
 await f.C.salvar('monstro','pessoal',null,{excluido:false});
 assert.equal(f.chamadas[1].args.p_excluido,false);assert.equal(f.chamadas[1].args.p_versao,3);
});

test('compartilhar uma criação envia a foto ao Storage e publica só o caminho validado',async()=>{
 const f=fixture();await f.C.publicarMonstro({...pessoal,photo:'privada'},'data:image/jpeg;base64,/9j/');
 assert.equal(f.uploads.length,1);assert.equal(f.uploads[0].bucket,'catalogos');
 assert.match(f.uploads[0].path,/^monstros\/[0-9a-f-]{36}\.jpg$/);
 const args=f.chamadas[0].args;
 assert.equal(args.p_alterar_imagem,true);assert.equal(args.p_imagem,f.uploads[0].path);
 assert.equal(args.p_dados.photo,undefined);assert.equal(args.p_dados.imagem,undefined);
});
