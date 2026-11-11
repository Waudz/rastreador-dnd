const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,executar}=require('./helpers.cjs');
const elemento=(attributes={},labels=[])=>({attributes,labels,dataset:{},value:'valor original',textContent:'',getAttribute(k){return this.attributes[k]??null;},setAttribute(k,v){this.attributes[k]=String(v);},querySelector(){return this.erro?{}:null;}});
test('rótulos complementam campos sem sobrescrever rótulos e valores existentes',()=>{
 const sem=elemento({placeholder:'Nome do personagem'}),com=elemento({placeholder:'Outro nome','aria-label':'Nome correto'}),rotulado=elemento({placeholder:'Senha'},[{}]);
 const document={body:{},querySelector:()=>null,querySelectorAll:s=>s.startsWith('input')?[sem,com,rotulado]:[]};
 executar('js/interface.js',vm.createContext({document,MutationObserver:class{observe(){}}}));
 assert.equal(sem.attributes['aria-label'],'Nome do personagem');assert.equal(com.attributes['aria-label'],'Nome correto');assert.equal(rotulado.attributes['aria-label'],undefined);assert.equal(sem.value,'valor original');
});
test('indicador reflete salvando, falha e confirmação já emitidos pelo salvamento',()=>{
 const estado=elemento(),observers=[];estado.textContent='Salvando…';
 const document={body:{},querySelector:()=>estado,querySelectorAll:()=>[]};
 executar('js/interface.js',vm.createContext({document,MutationObserver:class{constructor(fn){observers.push(fn);}observe(){}}}));
 assert.equal(estado.dataset.estado,'salvando');assert.equal(estado.attributes['aria-busy'],'true');
 estado.textContent='Não salvou: conexão indisponível';estado.erro=true;observers[0]();assert.equal(estado.dataset.estado,'erro');
 estado.textContent='Salvo';estado.erro=false;observers[0]();assert.equal(estado.dataset.estado,'salvo');assert.equal(estado.attributes['aria-busy'],'false');
});
