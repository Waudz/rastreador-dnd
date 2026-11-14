const {test}=require('node:test');
const assert=require('node:assert/strict');
const {vm,ler,armazenamento}=require('./helpers.cjs');

const base={key:'base',name:'Dragon',document:{key:'srd-2014'}};
const pessoal={key:'pessoal',name:'Meu Monstro',custom:true,document:{key:'srd-2014'}};

function fixture({administrador=true,existente=null,conflito=false}={}){
 const chamadas=[];
 const registro=existente||{atualizado_em:'2026-01-01T00:00:00Z',dados:{globais:{}}};
 const nuvem={
  usuario:()=>({id:'adm'}),
  get:async caminho=>{
   if(caminho.includes('select=atualizado_em'))return [{atualizado_em:registro.atualizado_em}];
   return [registro];
  },
  rpc:async (nome,args)=>{
   chamadas.push({nome,args});
   if(conflito)throw Error('O catálogo mudou em outro dispositivo.');
   return {tipo:args.p_tipo,chave:args.p_chave,dados:args.p_dados,
    versao:args.p_versao+1,imagem:null,imagemDefinida:args.p_alterar_imagem,excluido:args.p_excluido};
  }
 };
 const window={ACESSO:{admin:()=>administrador,pronto:Promise.resolve(true)},
  FEEDBACK:{mostrar(){}},NUVEM_CONFIG:{url:'https://example.supabase.co'},addEventListener(){},dispatchEvent(){}};
 const contexto=vm.createContext({window,nuvem,localStorage:armazenamento(),CustomEvent:class {constructor(tipo){this.type=tipo;}}});
 vm.runInContext(ler('js/catalogo.js'),contexto);
 return {C:window.CATALOGO,chamadas};
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
