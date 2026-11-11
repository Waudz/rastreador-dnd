/* Rolagens compartilhadas pela ficha completa e pelo modo lateral. */
(() => {
  function rolar(expressao, bonus = 0, aleatorio = Math.random) {
    const m = String(expressao).replace(/\s/g,'').match(/^(\d{1,2})d(\d{1,4})([+-]\d{1,4})?$/i);
    if(!m || +m[1]<1 || +m[1]>50 || +m[2]<2 || +m[2]>1000 || !Number.isFinite(bonus)) throw Error('Use uma expressão como 1d20 ou 2d6+3.');
    const dados=Array.from({length:+m[1]},()=>1+Math.floor(aleatorio()*+m[2]));
    const modificador=+(m[3]||0)+bonus;
    return {dados,modificador,total:dados.reduce((a,b)=>a+b,0)+modificador};
  }
  window.ROLAGENS={rolar};
})();
