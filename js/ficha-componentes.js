/* Componentes de apresentação. Os renderizadores mantêm os seus modelos e permissões. */
(() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const formas={defesa:'<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6z"/>',iniciativa:'<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>',deslocamento:'<path d="M6 3v6m0 0 3 4-2 7M17 4l-2 5 3 4-1 8M3 12h5m6 3h6"/>'};
  const icone=nome=>`<svg class="ficha-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${formas[nome]||formas.defesa}</svg>`;
  function estatistica({rotulo,valor,id='',tipo='defesa'}) {
    return `<div class="ficha-estatistica"><small>${icone(tipo)}${esc(rotulo)}</small><strong${id?` id="${esc(id)}"`:''}>${esc(valor)}</strong></div>`;
  }
  function atributo({sigla,valor,modificador,controle='',rolagem='',id=''}) {
    return `<div class="attr"><span class="attr-sigla">${esc(sigla)}</span><div class="mod"${id?` id="${esc(id)}"`:''}>${esc(modificador)}</div>${controle||`<span class="attr-valor">${esc(valor)}</span>`}${rolagem}</div>`;
  }
  // retrato e corpo são fragmentos já produzidos pelo renderizador proprietário.
  const cabecalho=({retrato,nome,subtitulo,meta='',tipo='Ficha'})=>`<header class="ficha-identidade">${retrato}<div><p class="eyebrow">${esc(tipo)}</p><h2 class="ficha-nome">${esc(nome)}</h2><p>${esc(subtitulo)}</p>${meta}</div></header>`;
  function vidaBase(valor,descricao='PV-base do bestiário') {
    return `<section class="panel vida-ficha vida-base"><div class="vida-cabecalho"><h3 class="panel-title">Pontos de vida</h3><strong>${esc(valor)} <small>PV</small></strong></div><div class="hp-track"><div class="hp-fill" style="width:100%"></div></div><p class="muted">${esc(descricao)} · os PV em combate pertencem a cada combatente.</p></section>`;
  }
  function espacos(total,usados) {
    return `<span class="espacos-magia" role="img" aria-label="${total-usados} de ${total} espaços disponíveis">${Array.from({length:total},(_,i)=>`<i class="espaco${i<total-usados?' disponivel':''}" aria-hidden="true"></i>`).join('')}</span>`;
  }
  window.FICHA_COMPONENTES={esc,icone,estatistica,atributo,cabecalho,vidaBase,espacos};
})();
