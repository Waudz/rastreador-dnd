// Fotografias e transcrição privadas não entram no repositório. Executar com FICHAS_REAIS_JSON.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');const {vm,ler}=require('./helpers.cjs');
const casos=process.env.FICHAS_REAIS_JSON?JSON.parse(fs.readFileSync(process.env.FICHAS_REAIS_JSON,'utf8')):[];
if(!casos.length)test('fichas reais: dados privados opcionais',{skip:'Defina FICHAS_REAIS_JSON para testar a transcrição privada'},()=>{});
for(const dado of casos)test('foto parcial: '+dado.nome+' — apenas atributos legíveis, sem reconstruir dados ausentes',()=>{const c=vm.createContext({window:{}});for(const n of ['regras','recursos','jogo'])vm.runInContext(ler('js/'+n+'.js'),c);const {REGRAS:R,JOGO:J,RECURSOS:RC}=c.window,antes=JSON.stringify(dado);for(const [k,n] of Object.entries(dado.atributos))assert.equal(R.mod(n),dado.modificadores[k]);
 if(dado.nome==='Lydia Farwind'){const p={pv_atual:27,pv_max:27,pv_temp:0,ficha:{classes:[{c:'Fighter',n:4}],atributos:{...dado.atributos},caracteristicas:[{nome:'Duelista',origem:'classe'},{nome:'Luta às Cegas',origem:'mestre'}]}};J.aplicarCondicao(p,'Cego');J.dano(p,5);J.cura(p,3);assert.equal(p.pv_atual,25);assert.ok(J.temCondicao(p.ficha,'Cego'));assert.equal(p.ficha.caracteristicas.length,2,'não apagar o estilo extra ao manipular PV');assert.equal(RC.achar(p.ficha,'surto-acao').max,1);}
 if(dado.nome==='Sofia Romanov')assert.equal(RC.achar({classes:[{c:'Barbarian',n:4}],atributos:dado.atributos},'furia').max,3);
 if(dado.nome==='Pedro')assert.equal(RC.achar({classes:[{c:'Monk',n:2}],atributos:dado.atributos},'ki').max,2,'cenário condicional ao nível escrito, não correção da ficha');
 assert.equal(JSON.stringify(dado),antes,'transcrição de origem permanece intacta');});
