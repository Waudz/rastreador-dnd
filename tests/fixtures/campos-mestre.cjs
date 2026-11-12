/* Fixtures sintéticas, produzidas pelos motores reais. Também gera SQL para o PostgreSQL do CI. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),root=path.resolve(__dirname,'../..');
function gerar(){const c=vm.createContext({window:{}});for(const n of ['origens','regras','inventario','magias-jogo','itens-efeitos','recursos','jogo','subclasses-2014','criador-regras'])vm.runInContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'),c);const {CRIADOR:C,MAGIAS_JOGO:M,ITENS_EFEITOS:E,INVENTARIO:I,JOGO:J}=c.window;C.configurar(JSON.parse(fs.readFileSync(path.join(root,'dados/criacao-srd2014.json'))),JSON.parse(fs.readFileSync(path.join(root,'dados/magias.json'))));
 let p={id:'f6200000-0000-0000-0000-000000000001',nome:'Caso sintético servidor',pv_atual:12,pv_max:20,pv_temp:0,inventario:[],dinheiro:{po:50},ficha:{classes:[{c:'Wizard',n:3}],atributos:{for:10,des:12,con:14,int:16,sab:10,car:8},raca:'Humano',backgroundId:'soldado',notas:'Preservar'}};
 M.concederMestre(p,{n:'Concessão sintética',en:'QA Master Spell',l:1,d:'Texto aprovado pelo mestre'},'Teste',{modo:'uso-limitado',usos:2,recarga:'longo'});
 M.concederMestre(p,{n:'Grimório sintético',en:'QA Spellbook',l:1,d:'Texto aprovado'},'Teste',{modo:'grimorio'});
 I.adicionar(I.conteinerDe(p),I.novoItem({uid:'custom-mestre',ref:null,nome:'Item do mestre',tipo:'magico',qtd:1,propriedades:{cargas:{atual:3,max:3,recarga:'manual'},custoCarga:1,consumo:'carga',sintonia:{requer:true,sintonizado:false},efeitos:[{tipo:'manual',texto:'Aprovado pelo mestre'}]}}));
 for(const k of ['pocao-cura','varinha-misseis','anel-protecao'])I.adicionar(I.conteinerDe(p),E.itemDoCatalogo(k));
 const copia=x=>JSON.parse(JSON.stringify(x)),out={original:copia(p)};
 p=C.derivar(C.iniciar(p,'criacao'));out.derivado=copia(p);
 M.usarConcedida(p.ficha,p.ficha.magias.find(m=>m.en==='QA Master Spell'));out.uso=copia(p);
 I.sintonizar(I.conteinerDe(p),'custom-mestre',true);I.usarCarga(I.conteinerDe(p),'custom-mestre',1);out.carga=copia(p);
 const uid=p.inventario.find(i=>i.ref==='srd51:item/potion-of-healing').uid;const uso=E.usar(p,uid,{rolagens:{0:7}});if(!uso.ok)throw Error(uso.motivos.join(';'));out.consumo=copia(p);
 J.descansoLongo(p);out.descanso=copia(p);
 I.adicionar(I.conteinerDe(p),E.itemDoCatalogo('pocao-cura-maior'));out.catalogo=copia(p);
 out.insert_jogador={...copia(p),ficha:{classes:[{c:'Fighter',n:1}],magias:[]},inventario:[I.novoItem({nome:'Mochila'}),I.criarPergaminho({en:'Light',n:'Luz',l:0}),E.itemDoCatalogo('pocao-cura')]};
 return out;
}
module.exports=gerar;
if(require.main===module){const q=s=>"'"+s.replaceAll("'","''")+"'";console.log('create temporary table qa_estados(nome text primary key,p jsonb);');for(const [n,p] of Object.entries(gerar()))console.log('insert into qa_estados values('+q(n)+','+q(JSON.stringify(p))+'::jsonb);');console.log('grant select on qa_estados to authenticated;');}
