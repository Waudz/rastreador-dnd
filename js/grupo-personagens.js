/* Apresentação compacta do grupo e regras compartilhadas para sua entrada no combate. */
(() => {
  const C=window.FICHA_COMPONENTES,esc=C.esc;
  const icone=n=>window.ico?window.ico(n):'';
  function identidade(p,{resumo=false,jogador='',vida=false}={}){
    const f=p.ficha||{},r=C.resumoPersonagem(f),texto=[r.classes||f.classe,r.nivel?'Nível '+r.nivel:'', 'CA '+p.ca].filter(Boolean).join(' · ');
    const corpo=C.retrato(p.nome,f.foto,76)+'<span class="grupo-identidade-texto"><b>'+esc(p.nome)+'</b><small>'+esc(texto)+'</small>'+(jogador?'<small>'+esc(jogador)+'</small>':'')+(vida?'<small class="grupo-pv-resumo">PV '+p.pv_atual+'/'+p.pv_max+'</small>':'')+'</span>';
    return resumo?'<button type="button" class="ci-personagem grupo-identidade" data-ci-resumo="'+esc(p.id)+'" aria-label="Ver resumo de '+esc(p.nome)+'">'+corpo+'</button>':'<a class="grupo-identidade" href="personagem.html?id='+encodeURIComponent(p.id)+'">'+corpo+'</a>';
  }
  const checkbox=(p,selecionado,atributo='grupo-sel',disabled=false)=>'<label class="grupo-marcar"><input type="checkbox" data-'+atributo+'="'+esc(p.id)+'" aria-label="Selecionar '+esc(p.nome)+'" '+(selecionado?'checked ':'')+(disabled?'disabled':'')+'></label>';
  const barra=(prefixo,n)=>n>0?'<div class="grupo-selecao"><button type="button" class="small subtle" id="'+prefixo+'-todos">Selecionar todos</button><button type="button" class="small subtle" id="'+prefixo+'-nenhum">Desmarcar todos</button><span class="grow"></span><button type="button" class="small primary" id="'+prefixo+'-rolar" '+(n?'':'hidden')+'>'+(window.ico?window.ico('d20'):'')+'Rolar iniciativa ('+n+')</button><span class="sr-only" role="status">'+n+' selecionados</span></div>':'';
  function bonus(f={}){const des=Number(f.atributos?.des);return window.REGRAS.mod(Number.isFinite(des)?des:10)+window.REGRAS.bonusSemProf(f);}
  const rolarDetalhe=p=>{const r=window.ROLAGENS.rolar('1d20',bonus(p.ficha||{}));return {d20:(r.dados&&r.dados[0])??null,bonus:r.modificador??0,total:r.total};};
  const rolar=p=>rolarDetalhe(p).total;
  function destino(campanha,ids){const q=new URLSearchParams({aba:'iniciativa',campanha,personagens:[...new Set(ids)].join(','),rolar:'1'});return 'iniciativa.html?'+q;}
  window.GRUPO_PERSONAGENS={identidade,checkbox,barra,bonus,rolar,rolarDetalhe,destino,icone};
})();
