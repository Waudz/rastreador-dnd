/* Interface compartilhada da ficha completa e da ficha embutida; o motor é a única fonte de regras. */
(() => {
  'use strict';
  const J = window.JOGO, RC = window.RECURSOS;
  const campo = id => document.querySelector('#'+id)?.value;
  const botao = (acao, texto, valor='', desabilitado=false) => `<button type="button" class="small" data-jogo="${acao}" data-valor="${valor}" ${desabilitado?'disabled':''}>${texto}</button>`;
  function html(P, esc) {
    const f=P.ficha, m=f.morte||{}, efeitos=f.efeitosAtivos||[], pend=f.testesConcentracao||[];
    const recursos=RC.calcular(f).map(r=>`<div class="item"><b>${esc(r.nome)}</b> · ${r.max===null?'Ilimitado':r.restante+' / '+r.max}<p class="muted">${esc(r.nota||'')} · recarga: descanso ${r.recarga}</p><div class="row">${r.id==='recuperacao-arcana'?'':botao('recurso','Usar 1',r.id,r.restante===0)}${botao('restaurar','Corrigir uso (−1)',r.id,!r.usados)}</div></div>`).join('');
    const cond=efeitos.filter(e=>e.tipo==='condicao').map(e=>`<div class="item"><b>${esc(e.nome||e.condicao)}</b><p class="muted">${esc(J.CONDICOES[e.nome||e.condicao]?.texto||'')}</p>${botao('remover-condicao','Remover',esc(e.id))}</div>`).join('');
    return `<details class="panel" open><summary class="panel-title">Estado de jogo</summary>
      <p>Deslocamento efetivo: <b>${J.deslocamentoEfetivo(f,f.deslocamento??9)} m</b> · PV máximo efetivo: <b>${J.pvMaxEf(P)}</b></p>
      ${P.pv_atual===0||m.morto?`<div class="item"><h3>Salvaguardas contra a morte</h3><p>${m.morto?'Morto':m.estavel?'Estável':`${m.sucessos||0} sucessos · ${m.falhas||0} falhas`}</p>${!m.morto&&!m.estavel?`<div class="row"><input class="num" id="j-morte" type="number" min="1" max="20" placeholder="d20" aria-label="Resultado físico do d20 contra a morte">${botao('morte','Registrar d20')}${botao('morte-app','Rolar no app')}${botao('estabilizar','Estabilizar')}</div>`:''}</div>`:''}
      <div class="grade2"><div><h3>Condições e exaustão</h3>${cond}<div class="row"><label>Condição <select id="j-condicao"><option value="" selected>Selecionar…</option>${Object.keys(J.CONDICOES).map(n=>`<option>${esc(n)}</option>`).join('')}</select></label>${botao('condicao','Aplicar')}</div>
      <div class="row"><label>Exaustão <select id="j-exaustao">${J.EXAUSTAO.map((t,i)=>`<option value="${i}" ${Number(f.exaustao||0)===i?'selected':''}>${i}${t?' · '+esc(t):' · Nenhuma'}</option>`).join('')}</select></label>${botao('exaustao','Aplicar nível')}</div><p class="muted">Efeitos de exaustão são cumulativos. Vantagem/desvantagem e imunidades são resolvidas pelo jogador.</p>
      </div><div><h3>Concentração</h3><p>${f.concentracao?esc(f.concentracao.magia):'Nenhuma concentração ativa.'}</p>${f.concentracao?botao('encerrar','Encerrar concentração'):''}
      ${f.concentracao&&pend.length?`<p>Salvaguarda pendente: CD ${pend[0]} (${pend.length} teste(s))</p><div class="row"><input class="num" id="j-concentracao" type="number" aria-label="Total físico da salvaguarda de Constituição" placeholder="Total">${botao('concentracao-teste','Registrar total')}${botao('concentracao-app','Rolar no app')}</div>`:''}
      <h3>Recursos de classe</h3>${recursos||'<p class="muted">Nenhum recurso contado neste nível.</p>'}
      ${(f.classes||[]).some(c=>c.c==='Wizard')?`<details class="item"><summary>Recuperação Arcana, durante descanso curto</summary><p class="muted">Informe os círculos dos espaços gastos, separados por vírgula (ex.: 1, 1, 2). Uma vez por dia.</p><input id="j-arcana" aria-label="Círculos a recuperar" placeholder="1, 1, 2">${botao('arcana','Recuperar espaços')}</details>`:''}
      </div></div><details><summary>Diário de jogo</summary>${(f.diario||[]).slice().reverse().map(e=>`<p><small>${esc(new Date(e.quando).toLocaleString('pt-BR'))}</small> · ${esc(e.texto)}</p>`).join('')||'<p class="muted">Nenhum evento registrado.</p>'}</details></details>`;
  }
  function agir(P,b) {
    const f=P.ficha, a=b.dataset.jogo, v=b.dataset.valor;
    if(a==='recurso'){RC.usar(f,v);J.registrar(P,'recurso','Usou '+RC.achar(f,v).nome);}
    else if(a==='restaurar'){const r=RC.achar(f,v);if(!r)throw Error('Recurso não encontrado.');f.recursosUsados={...f.recursosUsados,[v]:Math.max(0,r.usados-1)};J.registrar(P,'recurso','Correção manual: '+r.nome);}
    else if(a==='condicao'){const nome=campo('j-condicao');if(!nome)throw Error('Selecione uma condição para aplicar.');J.aplicarCondicao(P,nome);}
    else if(a==='remover-condicao')J.removerCondicao(P,v);
    else if(a==='exaustao'){const n=Number(campo('j-exaustao'));if(n===6&&!confirm('Exaustão 6 causa morte. Continuar?'))return false;J.definirExaustao(P,n);}
    else if(a==='encerrar'){J.encerrarConcentracao(P,'manual');f.testesConcentracao=[];}
    else if(a==='concentrar'){const m=f.magias[Number(v)];if(!m||m.ativa===false)throw Error('Magia inativa.');J.iniciarConcentracao(P,m);f.testesConcentracao=[];}
    else if(a==='concentracao-teste'||a==='concentracao-app'){
      const cd=f.testesConcentracao?.[0];if(!cd)throw Error('Nenhuma salvaguarda pendente.');
      const txt=campo('j-concentracao');if(a==='concentracao-teste'&&!String(txt??'').trim())throw Error('Informe o total do teste.');
      J.testeConcentracao(P,cd,a==='concentracao-app'?1+Math.floor(Math.random()*20)+J.bonusSalvaguarda(f,'con'):Number(txt));f.testesConcentracao.shift();if(!f.concentracao)f.testesConcentracao=[];
    }
    else if(a==='morte'||a==='morte-app')J.salvaguardaMorte(P,a==='morte-app'?1+Math.floor(Math.random()*20):Number(campo('j-morte')));
    else if(a==='estabilizar')J.estabilizar(P);
    else if(a==='arcanum')J.usarArcanum(P,Number(v));
    else if(a==='arcana')J.recuperacaoArcana(P,String(campo('j-arcana')||'').split(',').map(x=>Number(x.trim())));
    else return false;
    if(!f.concentracao)f.testesConcentracao=[];
    return true;
  }
  window.JOGO_UI={html,agir};
})();
