/* Adaptador visual para monstros e fichas próprias/NPCs do acervo. Não escreve dados. */
(() => {
  const C=window.FICHA_COMPONENTES;
  function renderizar({monstro:m,nome,retrato,subtitulo,meta,velocidade,atributos,informacoes,acoes,tracos,magias,gerenciar}) {
    const tabs=[['principal','Principal'],['acoes','Ações'],['magias','Magias']];
    return `<div class="ficha-criatura" data-criatura="${C.esc(m.key)}">
      ${C.cabecalho({retrato,nome,subtitulo,meta,tipo:m.cat==='npc'?'Ficha de NPC':m.cat==='player'?'Ficha do acervo':'Bestiário · D&D 2014'})}
      <div class="ficha-destaques">${C.estatistica({rotulo:'CA',valor:m.armor_class})}${C.estatistica({rotulo:'Iniciativa',valor:(m.modifiers?.dexterity>=0?'+':'')+(m.modifiers?.dexterity??0),tipo:'iniciativa'})}${C.estatistica({rotulo:'Desloc.',valor:velocidade,tipo:'deslocamento'})}</div>
      ${C.vidaBase(m.hit_points,[m.hit_dice,'PV-base do bestiário'].filter(Boolean).join(' · '))}
      <nav class="ficha-abas" role="tablist" aria-label="Seções da criatura">${tabs.map(([k,n],i)=>`<button type="button" role="tab" id="criatura-aba-${k}" aria-controls="criatura-${k}" data-criatura-aba="${k}" aria-selected="${i===0}" tabindex="${i===0?0:-1}">${n}</button>`).join('')}</nav>
      <section role="tabpanel" id="criatura-principal" aria-labelledby="criatura-aba-principal" data-criatura-secao="principal"><h3 class="panel-title">Atributos</h3><div class="attrs">${atributos.map(a=>C.atributo(a)).join('')}</div><output class="rolagem-criatura" role="status" aria-live="polite"></output><section class="panel criatura-informacoes"><h3 class="panel-title">Defesas e sentidos</h3>${informacoes}</section>${tracos?`<section class="panel"><h3 class="panel-title">Características</h3>${tracos}</section>`:''}<details class="panel"><summary>Gerenciar ficha e retrato</summary><div class="row">${gerenciar}</div></details></section>
      <section role="tabpanel" id="criatura-acoes" aria-labelledby="criatura-aba-acoes" data-criatura-secao="acoes" hidden>${acoes||'<p class="estado-vazio">Não há ações cadastradas nesta ficha.</p>'}</section>
      <section role="tabpanel" id="criatura-magias" aria-labelledby="criatura-aba-magias" data-criatura-secao="magias" hidden>${magias||'<p class="estado-vazio">Esta criatura não tem magias cadastradas. Consulte também suas características de conjuração.</p>'}</section>
      <p class="ficha-fonte muted">Descrições traduzidas quando há tradução confiável. O texto original permanece disponível.</p></div>`;
  }
  function escolher(raiz,aba){
    raiz.querySelectorAll('[data-criatura-aba]').forEach(b=>{const on=b.dataset.criaturaAba===aba;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
    raiz.querySelectorAll('[data-criatura-secao]').forEach(p=>p.hidden=p.dataset.criaturaSecao!==aba);
  }
  if(typeof document!=='undefined'){
    document.addEventListener('click',e=>{
      const aba=e.target.closest('[data-criatura-aba]');if(aba){escolher(aba.closest('.ficha-criatura'),aba.dataset.criaturaAba);return;}
      const b=e.target.closest('[data-sheet-atributo]');if(!b)return;
      const r=window.ROLAGENS.rolar('1d20',Number(b.dataset.bonus)||0);
      b.closest('.ficha-criatura').querySelector('.rolagem-criatura').textContent=b.dataset.sheetAtributo+': '+r.total+' (d20 '+r.dados[0]+', modificador '+r.modificador+')';
    });
    document.addEventListener('keydown',e=>{
      const b=e.target.closest('[data-criatura-aba]');if(!b||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      e.preventDefault();const abas=[...b.closest('.ficha-criatura').querySelectorAll('[data-criatura-aba]')],i=abas.indexOf(b);
      const n=e.key==='Home'?0:e.key==='End'?abas.length-1:(i+(e.key==='ArrowRight'?1:-1)+abas.length)%abas.length;abas[n].click();abas[n].focus();
    });
  }
  window.FICHA_MONSTRO={renderizar};
})();
