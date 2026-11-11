/* Apresentação compartilhada de magias. Recebe valores calculados; não altera regras ou dados. */
(() => {
  const C=window.FICHA_COMPONENTES,esc=C.esc;
  const selos=({ritual,concentracao})=>(ritual?'<span class="magia-selo">Ritual</span>':'')+(concentracao?'<span class="magia-selo magia-selo-concentracao">Concentração</span>':'');
  const circulo=n=>n===0?'Truque':n==null?'':n+'º círculo';
  function propriedades(campos){
    const preenchidos=(campos||[]).filter(([,v])=>v!==undefined&&v!==null&&v!=='');
    return preenchidos.length?'<dl class="magia-propriedades">'+preenchidos.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')+'</dl>':'';
  }
  function camposCabecalho(texto){
    if(!texto)return [];
    const partes=String(texto).split(/\s+·\s+/);
    return partes.map((p,i)=>{const m=p.match(/^([^:]+):\s*(.*)$/);return m?[m[1],m[2]]:[partes.length===1?'Informações':i===0?'Escola':i===1?'Tempo de conjuração':'Informações',p];});
  }
  const paragrafos=texto=>String(texto||'').trim().split(/\n\s*\n/).filter(Boolean).map(p=>`<p>${esc(p)}</p>`).join('');
  function slot({titulo,subtitulo='',total,usados,chave}){
    const livres=total-usados;
    return `<article class="magia-slot"><div class="magia-slot-cabecalho"><div><h4>${esc(titulo)}</h4>${subtitulo?`<small>${esc(subtitulo)}</small>`:''}</div><span class="magia-slot-quantidade">${livres} de ${total} disponíveis</span></div><div class="magia-slot-indicadores">${C.espacos(total,usados)}</div><div class="magia-slot-acoes"><button type="button" class="small" data-slot="${esc(chave)}" data-d="1" ${livres<=0?'disabled':''} aria-label="Gastar espaço: ${esc(titulo)}">Gastar</button><button type="button" class="small" data-slot="${esc(chave)}" data-d="-1" ${usados<=0?'disabled':''} aria-label="Recuperar espaço: ${esc(titulo)}">Recuperar</button></div></article>`;
  }
  function conjurador({classe,atributo,cd,ataque,preparar}){
    return `<section class="magia-conjurador"><h3>${esc(classe)}</h3>${propriedades([['Atributo',atributo],['CD de magia',cd],['Ataque mágico',ataque],...(preparar==null?[]:[['Preparar até',preparar+' magias']])])}</section>`;
  }
  function resultado({chave,nome,original,nivel,escola,tempo,alcance,ritual,concentracao,fonte,alias}){
    return `<button type="button" class="magia-resultado" data-spopen="${esc(chave)}"><span class="magia-resultado-topo"><span class="magia-resultado-nome"><strong>${esc(nome)}</strong>${original&&original!==nome?`<small>${esc(original)}</small>`:''}</span><span class="magia-circulo">${esc(circulo(nivel)||'Magia')}</span></span><span class="magia-resultado-escola">${esc(escola||fonte||'')}</span>${tempo||alcance?`<span class="magia-resultado-propriedades">${tempo?`<span><small>Conjuração</small>${esc(tempo)}</span>`:''}${alcance?`<span><small>Alcance</small>${esc(alcance)}</span>`:''}</span>`:''}<span class="magia-selos">${selos({ritual,concentracao})}</span>${alias?`<span class="magia-resultado-alias">No LDJ: ${esc(alias)}</span>`:''}<span class="magia-resultado-abrir">Ver detalhes <span aria-hidden="true">›</span></span></button>`;
  }
  function detalhes({nome,original,meta,descricao,materiais,nota,originalTexto,concentracao}){
    const valor=k=>(meta.find(([n])=>n===k)||[])[1]||'';
    const campos=meta.filter(([k])=>!['Círculo','Escola','Ritual','Fonte'].includes(k));
    return `<article class="magia-detalhe"><header class="magia-detalhe-cabecalho"><p class="eyebrow">Magia · D&D 2014</p><h3>${esc(nome)}</h3>${original&&original!==nome?`<p class="magia-nome-original">${esc(original)}</p>`:''}<div class="magia-selos">${valor('Círculo')?`<span class="magia-circulo">${esc(valor('Círculo'))}</span>`:''}${valor('Escola')?`<span class="magia-escola">${esc(valor('Escola'))}</span>`:''}${selos({ritual:valor('Ritual')==='Sim',concentracao})}</div></header>${propriedades(campos)}${nota?`<p class="magia-nota">${esc(nota)}</p>`:''}<section class="magia-texto"><h4>Efeito da magia</h4>${paragrafos(descricao)}</section>${materiais?`<section class="magia-texto magia-materiais"><h4>Materiais</h4>${paragrafos(materiais)}</section>`:''}${originalTexto?`<details class="magia-original"><summary>Texto original</summary><div class="magia-texto">${paragrafos(originalTexto)}</div></details>`:''}${valor('Fonte')?`<footer class="magia-fonte">${esc(valor('Fonte'))}</footer>`:''}</article>`;
  }
  const vazio=(titulo,texto)=>`<div class="magia-vazio"><strong>${esc(titulo)}</strong><p>${esc(texto)}</p></div>`;
  window.MAGIAS_UI={slot,conjurador,resultado,detalhes,propriedades,camposCabecalho,paragrafos,selos,vazio};
})();
