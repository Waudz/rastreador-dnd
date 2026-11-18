const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,executar,armazenamento,documentoFalso}=require('./helpers.cjs');
const item=(uid,qtd=1,tipo='jogo')=>({uid,nome:'Item '+uid,qtd,origem:{tipo}});
function ambiente(storage=armazenamento()){
 const document=documentoFalso(),contexto=vm.createContext({window:{localStorage:storage,nuvem:{usuario:()=>({id:'u'})},addEventListener(){}},document});
 executar('js/inventario-avisos.js',contexto);const A=contexto.window.AVISOS_INVENTARIO;
 return {A,storage,document,criar:(op={})=>A.criar({conta:'u',campanha:'c',personagem:'p',storage,...op})};
}
test('primeira abertura considera todos os itens uma base, sem notificar equipamento inicial',()=>{
 const f=ambiente(),a=f.criar(),itens=[item('espada',1,'criacao'),item('corda',1,'inicial'),item('legado',2)];
 assert.equal(a.atualizar(itens,1).length,0);assert.equal(a.atualizar(itens,2).length,0);
});
test('recebimento novo é contado por entrada, com unidades informadas; não se repete ao redesenhar',()=>{
 const a=ambiente().criar();a.atualizar([],1);const itens=[item('pocao',3),item('espada')];
 assert.equal(a.atualizar(itens,2).length,2);assert.equal(a.atualizar(itens,2)[0].qtd,3);assert.equal(a.atualizar(itens,3)[0].qtd,3);
});
test('recebimento empilhado usa apenas o incremento; consumir, equipar e renomear não criam avisos',()=>{
 const a=ambiente().criar();a.atualizar([item('p',2)],1);assert.equal(a.atualizar([item('p',5)],2)[0].qtd,3);a.marcarVistos(['p']);
 assert.equal(a.atualizar([{...item('p',4),equipado:true,nome:'Renomeado'}],3).length,0);
});
test('novos equipamentos de criação não notificam, mas transferência do equipamento inicial notifica',()=>{
 const a=ambiente().criar();a.atualizar([],1);assert.equal(a.atualizar([item('pacote',2,'criacao')],2).length,0);
 const transferido={...item('recebido',1,'criacao'),transferencias:[{de:{id:'outro'},para:{id:'p'}}]};
 assert.equal(a.atualizar([item('pacote',2,'criacao'),transferido],3)[0].uid,'recebido');
});
test('marcar um item preserva outras novidades; reabertura e marcação total persistem',()=>{
 const f=ambiente(),a=f.criar(),itens=[item('a'),item('b')];a.atualizar([],1);a.atualizar(itens,2);a.marcarVistos(['a']);
 const b=f.criar();assert.equal(b.atualizar(itens,2).length,1);assert.equal(b.atualizar(itens,2)[0].uid,'b');b.marcarVistos(['b']);assert.equal(f.criar().atualizar(itens,3).length,0);
});
test('conta, campanha e personagem não compartilham estado',()=>{
 const f=ambiente(),a=f.criar();a.atualizar([],1);a.atualizar([item('novo')],2);
 for(const op of [{conta:'outra'},{campanha:'outra'},{personagem:'outro'}])assert.equal(f.criar(op).atualizar([item('novo')],2).length,0);
 assert.equal(a.atualizar([item('novo')],2).length,1);
});
test('versão antiga de outra guia não remove nem duplica recebimentos já observados',()=>{
 const f=ambiente(),a=f.criar(),b=f.criar();a.atualizar([],1);b.atualizar([],1);a.atualizar([item('novo')],3);
 assert.equal(b.atualizar([],2).length,0);assert.equal(a.atualizar([item('novo')],3).length,1);b.marcarVistos(['novo']);assert.equal(a.atualizar([item('novo')],3).length,0);
});
test('itens retirados não deixam avisos fantasmas e quantidades são limitadas ao estoque',()=>{
 const a=ambiente().criar();a.atualizar([],1);a.atualizar([item('a',4),item('b')],2);const n=a.atualizar([item('a',2)],3);assert.equal(n.length,1);assert.equal(n[0].qtd,2);assert.equal(a.atualizar([],4).length,0);
});
test('sem localStorage ou com estado inválido não impede a ficha nem altera os itens',()=>{
 const f=ambiente({getItem(){throw Error('bloqueado');},setItem(){throw Error('bloqueado');}}),a=f.criar(),itens=[item('a')],antes=JSON.stringify(itens);
 a.atualizar([],1);assert.equal(a.atualizar(itens,2).length,1);assert.equal(JSON.stringify(itens),antes);
 const s=armazenamento(),b=ambiente(s).criar();s.setItem(b.chave,'{inválido');assert.equal(b.atualizar(itens,1).length,0);
});
test('sino permanece visível sem novidades apenas para o dono; contador aparece só com pendências',()=>{
 const f=ambiente(),p={id:'p',campanha_id:'c',dono_id:'u',versao:1,inventario:[]};f.A.renderizar(p);assert.equal(f.document.el('avisos-inventario').hidden,false);assert.ok(!f.document.el('avisos-inventario').innerHTML.includes('inv-novidades-contador'));
 p.versao=2;p.inventario=[{...item('x'),nome:'<img src=x onerror=alert(1)>'}];f.A.renderizar(p);assert.equal(f.document.el('avisos-inventario').hidden,false);assert.match(f.document.el('[data-ficha-aba="inventario"]').innerHTML,/contador[^>]*[^]*>1</);
 f.A.renderizar({...p,dono_id:'outro'});assert.equal(f.document.el('avisos-inventario').hidden,true);f.A.renderizar(p,{somenteLeitura:true});assert.equal(f.document.el('avisos-inventario').hidden,true);
});

test('histórico mantém recebimentos lidos e nunca inclui equipamento da criação',()=>{
 const f=ambiente(),a=f.criar();a.atualizar([item('espada',1,'criacao')],1);assert.equal(a.historico().length,0);a.atualizar([item('espada',1,'criacao'),item('pocao',2)],2);assert.equal(a.historico().length,1);a.marcarVistos(['pocao']);assert.equal(a.historico()[0].lido,true);assert.equal(a.atualizar([item('espada',1,'criacao'),item('pocao',2)],2).length,0);assert.equal(f.criar().historico().length,1);
});
test('histórico guarda as últimas trinta entradas, inclusive de itens retirados',()=>{
 const a=ambiente().criar();a.atualizar([],0);for(let v=1;v<=35;v++)a.atualizar([item('item'+v)],v);assert.equal(a.historico().length,30);assert.equal(a.historico()[0].uid,'item6');assert.equal(a.historico().at(-1).uid,'item35');assert.equal(a.historico()[0].lido,true);
});
