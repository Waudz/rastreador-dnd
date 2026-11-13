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
  /* resultado da pesquisa de magias: a mesma linha compacta da pesquisa de monstros (.res: círculo no lugar do retrato, nome, uma linha de dados e o botão Ver) */
  function resultado({chave,nome,original,nivel,escola,tempo,alcance,ritual,concentracao,fonte,alias}){
    const circ=circulo(nivel),selo=nivel===0?'T':nivel==null?'M':nivel+'º';
    const dados=['Magia',circ,escola,tempo,alcance,ritual?'Ritual':'',concentracao?'Concentração':'',fonte,alias?'No LDJ: '+alias:''].filter(Boolean);
    return `<div class="res res-magia" data-spopen="${esc(chave)}"><span class="lft"><span class="av av0 magia-selo-circulo" style="width:40px;height:40px" aria-hidden="true">${esc(selo)}</span><span><b>${esc(nome)}</b>${original&&original!==nome?` <span class="muted">(${esc(original)})</span>`:''}<br><span class="muted">${dados.map(esc).join(' · ')}</span></span></span><span class="acts"><button type="button" class="small" data-spopen="${esc(chave)}" aria-label="Ver ${esc(nome)}">Ver</button></span></div>`;
  }
  function detalhes({nome,original,meta,descricao,materiais,nota,originalTexto,concentracao}){
    const valor=k=>(meta.find(([n])=>n===k)||[])[1]||'';
    const campos=meta.filter(([k])=>!['Círculo','Escola','Ritual','Fonte'].includes(k));
    return `<article class="magia-detalhe"><header class="magia-detalhe-cabecalho"><p class="eyebrow">Magia · D&D 2014</p><h3>${esc(nome)}</h3>${original&&original!==nome?`<p class="magia-nome-original">${esc(original)}</p>`:''}<div class="magia-selos">${valor('Círculo')?`<span class="magia-circulo">${esc(valor('Círculo'))}</span>`:''}${valor('Escola')?`<span class="magia-escola">${esc(valor('Escola'))}</span>`:''}${selos({ritual:valor('Ritual')==='Sim',concentracao})}</div></header>${propriedades(campos)}${nota?`<p class="magia-nota">${esc(nota)}</p>`:''}<section class="magia-texto"><h4>Efeito da magia</h4>${paragrafos(descricao)}</section>${materiais?`<section class="magia-texto magia-materiais"><h4>Materiais</h4>${paragrafos(materiais)}</section>`:''}${originalTexto?`<details class="magia-original"><summary>Texto original</summary><div class="magia-texto">${paragrafos(originalTexto)}</div></details>`:''}${valor('Fonte')?`<footer class="magia-fonte">${esc(valor('Fonte'))}</footer>`:''}</article>`;
  }
  const vazio=(titulo,texto)=>`<div class="magia-vazio"><strong>${esc(titulo)}</strong><p>${esc(texto)}</p></div>`;
  window.MAGIAS_UI={slot,conjurador,resultado,detalhes,propriedades,camposCabecalho,paragrafos,selos,vazio};
})();
