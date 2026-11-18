/* Ambientação original separada das regras. Uma descrição própria sempre prevalece. */
(function(raiz){
 'use strict';
 function criar(catalogo={}){
  function obter(monstro){
   if(!monstro||typeof monstro!=='object')return null;
   for(const campo of ['descricao','description','desc'])if(typeof monstro[campo]==='string'&&monstro[campo].trim())return {texto:monstro[campo].trim(),origem:'Descrição cadastrada na ficha'};
   if(monstro.custom)return null;
   const reg=Object.prototype.hasOwnProperty.call(catalogo,monstro.key)?catalogo[monstro.key]:null;
   return typeof reg?.texto==='string'&&reg.texto.trim()?{texto:reg.texto,origem:'Compêndio 5e · descrição original de ambientação'}:null;
  }
  return {obter};
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={criar};return;}
 let catalogo={};
 const api={obter:m=>criar(catalogo).obter(m)};
 api.pronto=fetch('dados/descricoes-monstros-2014.json').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();}).then(d=>{catalogo=d.monstros||{};return true;}).catch(()=>false);
 raiz.DESCRICOES_MONSTROS=api;
})(typeof window!=='undefined'?window:this);
