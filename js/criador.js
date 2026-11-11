/* Rascunho local: só altera a ficha depois da revisão e do salvamento confirmado. */
(async()=>{
 'use strict';
 const $=s=>document.querySelector(s),C=CRIADOR,R=REGRAS,esc=nuvem.esc,params=new URLSearchParams(location.search),id=params.get('id'),evolucao=params.get('modo')==='nivel';
 const etapas=['Classe e nível','Raça','Background','Point buy','Escolhas','Magias','Equipamento','Revisão'];
 let original,p,etapa=0,subiu=false,salvando=false;
 const chave=()=>`criador2014:${nuvem.usuario().id}:${id}:${evolucao?'nivel':'criacao'}`;
 const f=()=>p.ficha,st=()=>C.estado(f());
 const opc=(v,n,atual)=>`<option value="${esc(v)}" ${v===atual?'selected':''}>${esc(n)}</option>`;
 const seletor=(attr,lista,atual,vazio='Escolha…')=>`<select ${attr}>${opc('',vazio,atual)}${lista.map(([v,n])=>opc(v,n,atual)).join('')}</select>`;
 const bloco=(titulo,desc)=>`<details class="item"><summary>${esc(titulo)}</summary><p class="descricao-regra">${esc(desc||'Consulte os detalhes da característica na ficha.')}</p></details>`;
 const persistir=()=>{try{localStorage.setItem(chave(),JSON.stringify({versao:original.versao,p,etapa,subiu}));}catch(_){$('#aviso').textContent='Não foi possível guardar o rascunho neste aparelho.';}};
 function escolhas(grupos){return grupos.map(g=>`<section class="panel"><h3>${esc(g.titulo)}</h3><p class="muted">${g.selecionadas.length} de ${g.qtd} escolhidas${g.grants==='expertise'?' · Especialização dobra a proficiência':''}</p>${g.opts.length>12?'<input type="search" data-busca-escolhas placeholder="Filtrar opções desta lista" aria-label="Filtrar opções desta lista">':''}<div class="criador-opcoes">${g.opts.map(v=>{
  const marcado=g.selecionadas.includes(v),req=C.requisitos(f(),v),bloq=(g.bloqueadas||[]).includes(v)||req.length>0||!marcado&&g.selecionadas.length>=g.qtd,h=C.dados.features.find(h=>h.id===v),m=C.magiaPorId(v);
  return `<div class="escolha"><label><input type="checkbox" data-grupo="${esc(g.key)}" value="${esc(v)}" ${marcado?'checked':''} ${bloq?'disabled':''}>${esc(C.rotulo(v))}</label>${req.length?'<small>Requer: '+esc(req.join(', '))+'</small>':''}${(g.bloqueadas||[]).includes(v)?'<small>Já concedida por outra origem.</small>':''}${h||m?bloco('Ver benefícios',h?.descricao||h?.desc||m?.d):''}</div>`;
 }).join('')}</div>${!g.opts.length?'<p class="err">Não há opções no catálogo para esta escolha.</p>':''}</section>`).join('');}
 function resumoPericias(){const q=C.derivar(p).ficha,s=R.fontesPericias(q);return `<div class="panel"><h3>Perícias já concedidas</h3>${R.PERICIAS.filter(x=>s.basicas.includes(x[0])).map(x=>`<span class="chip">${esc(x[1])}${s.especializadas.includes(x[0])?' · especialização':''}</span>`).join('')||'Nenhuma ainda.'}<p class="muted">Cada proficiência é aplicada uma vez. Escolhas repetidas ficam indisponíveis.</p></div>`;}
 function classeHTML(){
  if(evolucao&&!subiu)return `<h2>Subir de nível</h2><p>Escolha a classe que vai evoluir. Seu inventário, moedas, foto e escolhas anteriores serão preservados.</p>${seletor('id="nivel-classe"',R.CLASSES.filter(c=>C.classe(c.id)).map(c=>[c.id,c.n+(f().classes.some(x=>x.c===c.id)?'':' · nova multiclasse')]),f().classes[0]?.c)}<label>PV do novo nível<select id="nivel-pv"><option value="media">Valor fixo do dado de vida</option><option value="rolagem">Informar rolagem</option></select></label><input type="number" id="nivel-rolagem" min="1" max="12" placeholder="Resultado do dado, sem Constituição"><button type="button" id="subir">Prévia do novo nível</button>`;
  return `<label>Nome<input data-nome maxlength="80" value="${esc(p.nome)}"></label>${f().classes.map((c,i)=>`<section class="panel"><h3>${i?'Multiclasse':'Classe inicial'}</h3>${seletor(`data-classe="${i}"`,R.CLASSES.filter(x=>C.classe(x.id)).map(x=>[x.id,x.n]),c.c)}<label>Nível<input type="number" data-nivel="${i}" min="1" max="20" value="${c.n}" ${evolucao?'disabled':''}></label>${c.c&&c.n>=C.nivelSub(c)?`<label>Subclasse${seletor(`data-sub="${i}"`,C.dados.subclasses.filter(s=>s.parent==='srd51:class/'+c.c.toLowerCase()).map(s=>[s.id,R.classe(c.c)?.subs.find(n=>C.subclasse({...c,sub:n})?.id===s.id)||s.id.split('/').pop()]),C.subclasse(c)?.id||'')}</label>`:''}${i&&!evolucao?`<button type="button" data-rm-classe="${i}">Remover classe</button>`:''}</section>`).join('')}${!evolucao?'<button type="button" id="multi">Adicionar classe (multiclasse)</button>':''}<h3>Ganhos até o nível escolhido</h3>${C.caracteristicas(f()).map(h=>bloco(h.nome||h.en,h.descricao||h.desc)).join('')}<details><summary>Progressão dos próximos níveis</summary>${f().classes.flatMap(c=>(C.classe(c.c)?.data.levels||[]).filter(l=>l.level>c.n).map(l=>`<p><b>${esc(R.classe(c.c).n)} · nível ${l.level}</b>: ${l.features.map(id=>esc(C.rotulo(id))).join(', ')||'Progressão dos recursos da classe.'}</p>`)).join('')}</details>`;
 }
 function racaHTML(){const r=R.racial(f().raca);return `<h2>Raça</h2>${seletor('data-raca',R.RACAS.map(r=>[r[0],r[0]]),f().raca)}${f().raca?`<p>Bônus raciais: ${esc(R.RACAS.find(r=>r[0]===f().raca)[2])}</p>`:''}${Array.from({length:r.atributos},(_,i)=>`<label>Atributo racial ${i+1}${seletor(`data-racial="${i}"`,R.ATR.filter(k=>!(k in r.bonus)).map(k=>[k,R.ATR_NOME[k]]),f().atrRaca?.[i])}</label>`).join('')}<h3>Traços raciais</h3>${R.tracosRaciais(f().raca).map(t=>bloco(t.nome,t.desc)).join('')}${escolhas(C.grupos(f()).filter(g=>g.source==='raca'))}${resumoPericias()}`;}
 function backgroundHTML(){const bg=C.origem(f());return `<h2>Background / origem</h2>${seletor('data-background',ORIGENS.map(b=>[b.id,b.nome]),f().backgroundId)}${bg?`<h3>${esc(bg.caracteristica)}</h3><p>${esc(bg.descricao)}</p><p>Perícias: ${bg.per.map(k=>esc(R.PERICIAS.find(x=>x[0]===k)?.[1]||k)).join(', ')||'Duas à escolha'} · ${bg.idiomas} idioma(s) · ${bg.ferrEscolhas} ferramenta(s) à escolha.</p><p>Equipamento: ${esc(bg.equip.join(', '))} · ${bg.ouro} PO.</p>`:''}${bg?.id==='personalizado'?`<label>Treinamento${seletor('data-bg-treino',[['idiomas','2 idiomas'],['ferramentas','2 ferramentas'],['misto','1 idioma e 1 ferramenta']],st().bgTreino||'idiomas')}</label><label>Benefício do background<textarea data-bg-desc>${esc(st().backgroundDescricao||'')}</textarea></label>`:''}${escolhas(C.grupos(f()).filter(g=>g.source==='background'))}${resumoPericias()}`;}
 function atributosHTML(){const q=C.derivar(p);return `<h2>Compra de atributos · 27 pontos</h2>${st().metodo==='preservado'?'<p>Esta ficha já possui atributos. Eles foram preservados.</p>':`<p class="pontos">${27-C.custo(st().base)} pontos restantes</p><p>Valores base de 8 a 15. Comprar 14 custa 7 pontos; 15 custa 9. Bônus raciais e melhorias são somados depois.</p>`}<div class="criador-atributos">${R.ATR.map(k=>`<label>${R.ATR_NOME[k]}${st().metodo==='pointbuy'?seletor(`data-base="${k}"`,Object.keys(C.CUSTOS).map(n=>[Number(n),n+' · '+C.CUSTOS[n]+' pontos']),st().base[k]):''}<strong>${q.ficha.atributos?.[k]||10}</strong><small>Modificador ${R.mod(q.ficha.atributos?.[k]||10)}</small></label>`).join('')}</div>${R.melhoriasDisponiveis(f().classes).map(m=>`<section class="panel"><h3>${esc(m.classe)} · nível ${m.n}</h3><p>Dois +1, inclusive no mesmo atributo, até 20. Ou registre um talento.</p>${[0,1].map(i=>seletor(`data-asi="${esc(m.id)}" data-i="${i}"`,R.ATR.map(k=>[k,R.ATR_NOME[k]]),f().melhorias?.[m.id]?.[i])).join('')}<label>Talento (opcional)<input data-talento="${esc(m.id)}" value="${esc(st().talentos?.[m.id]?.nome||'')}"></label></section>`).join('')}`;}
 function equipamentoHTML(){const d=C.classe(f().classes[0]?.c);if(!d)return 'Escolha uma classe.';if(st().equipAplicado||evolucao)return '<p>O inventário atual será preservado. Equipamento inicial não será concedido novamente.</p>';return `<h2>Equipamento inicial</h2>${(d.data.startingChoices||[]).map((g,i)=>`<section class="panel"><label>Escolha ${i+1}${seletor(`data-equip="op:${i}"`,g.options.map((o,j)=>[j,o.items.map(x=>x.item?C.rotulo(x.item)+' × '+(x.quantity||1):'Escolher '+(x.count||1)+' '+x.category).join(' + ')]),st().equipamento['op:'+i]===undefined?'':Number(st().equipamento['op:'+i]))}</label>${g.options[Number(st().equipamento['op:'+i])]?.items.map((x,j)=>x.category?Array.from({length:x.count||1},(_,k)=>seletor(`data-equip="item:${i}:${j}:${k}"`,C.itemCategoria(x.category).map(x=>[x.id,x.nome||x.en]),st().equipamento[`item:${i}:${j}:${k}`])).join(''):'').join('')||''}</section>`).join('')}<h3>Você receberá</h3><ul>${C.equipamento(p).itens.map(i=>`<li>${i.qtd} × ${esc(i.nome)}</li>`).join('')}</ul><p>${C.equipamento(p).ouro} PO do background.</p>`;}
 function revisaoHTML(){const q=C.derivar(p),erros=C.validar(q,{evolucao}),fontes=R.fontesPericias(q.ficha),dif=evolucao?C.diferenca(original,q):null;return `<h2>Revisão de ${esc(q.nome)}</h2><p>${esc(q.ficha.classe)} · ${esc(q.ficha.raca||'')} · ${esc(q.ficha.background||'')}</p>${dif?`<p>Nível ${dif.nivel.join(' → ')} · PV ${dif.pv.join(' → ')} · Proficiência ${dif.prof.join(' → ')}</p><h3>Novas características</h3>${dif.novas.map(h=>bloco(h.nome||h.en,h.descricao||h.desc)).join('')}`:''}<p>Perícias: ${R.PERICIAS.filter(x=>fontes.basicas.includes(x[0])).map(x=>esc(x[1])).join(', ')}</p><h3>Traços raciais</h3>${R.tracosRaciais(f().raca).map(t=>bloco(t.nome,t.desc)).join('')}<h3>Características de classe</h3>${C.caracteristicas(f()).map(h=>bloco(h.nome||h.en,h.descricao||h.desc)).join('')}${q.ficha.backgroundCaracteristica?bloco('Background · '+q.ficha.backgroundCaracteristica.nome,q.ficha.backgroundCaracteristica.desc):''}${erros.length?`<h3>Complete antes de salvar</h3>${erros.map(e=>`<p><button type="button" class="small" data-etapa="${e.etapa}">${esc(etapas[e.etapa])}</button> ${esc(e.texto)}</p>`).join('')}`:'<p>Todas as escolhas obrigatórias foram preenchidas.</p>'}<button type="button" id="salvar" class="primary" ${erros.length||evolucao&&!subiu?'disabled':''}>${evolucao?'Confirmar novo nível':'Concluir personagem'}</button><p class="muted">O rascunho só será aplicado depois desta confirmação.</p>`;}
 function desenhar(){
  $('#etapas').innerHTML=etapas.map((n,i)=>`<button type="button" data-etapa="${i}" class="small ${i===etapa?'on':''}">${i+1}. ${n}</button>`).join('');
  const gs=C.grupos(f());$('#criador-conteudo').innerHTML=[classeHTML,racaHTML,backgroundHTML,atributosHTML,()=>'<h2>Escolhas da classe</h2>'+resumoPericias()+escolhas(gs.filter(g=>g.source!=='raca'&&g.source!=='background'&&g.grants!=='spell')),()=>'<h2>Magias</h2><p class="muted">Ordenadas por círculo e nome. Os limites vêm da classe e do nível.</p>'+escolhas([...gs.filter(g=>g.grants==='spell'),...C.gruposMagias(C.derivar(p).ficha)])||'Sem escolhas de magia.',equipamentoHTML,revisaoHTML][etapa]();
  $('#anterior').disabled=etapa===0;$('#proximo').disabled=etapa===7;persistir();
 }
 async function salvar(){
  if(salvando)return;let q=C.derivar(p);const erros=C.validar(q,{evolucao});if(erros.length||evolucao&&!subiu)return;
  salvando=true;$('#salvar').disabled=true;$('#aviso').textContent='Salvando…';
  try{
   if(!evolucao&&!st().equipAplicado)q=C.aplicarEquipamento(q);
   if(!evolucao){let primeiro=true,pv=0;for(const c of q.ficha.classes){for(let n=1;n<=c.n;n++)pv+=Math.max(1,(primeiro&&n===1?R.classe(c.c).dv:Math.floor(R.classe(c.c).dv/2)+1)+R.mod(q.ficha.atributos.con)+(q.ficha.raca==='Anão (da Colina)'?1:0));primeiro=false;}q.pv_max=pv;q.pv_atual=pv;}
   q.ficha.tracosRaciais=R.tracosRaciais(q.ficha.raca);q.ficha.criacao.concluido=true;
   const dados={nome:q.nome,ficha:q.ficha,pv_max:q.pv_max,pv_atual:q.pv_atual,inventario:q.inventario,dinheiro:q.dinheiro};
   const rows=await nuvem.patch(`personagens?id=eq.${encodeURIComponent(id)}&versao=eq.${original.versao}`,dados);
   if(!rows?.length)throw Error('Esta ficha mudou em outro aparelho. Abra a ficha atual antes de aplicar o rascunho.');
   localStorage.removeItem(chave());location.href='personagem.html?id='+encodeURIComponent(id);
  }catch(e){$('#aviso').textContent=e.message;salvando=false;$('#salvar').disabled=false;}
 }
 document.addEventListener('input',e=>{if(e.target.hasAttribute('data-nome')){p.nome=e.target.value;persistir();}if(e.target.hasAttribute('data-busca-escolhas')){const normalizar=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();for(const el of e.target.parentElement.querySelectorAll('.escolha'))el.hidden=!normalizar(el.textContent).includes(normalizar(e.target.value));}});
 document.addEventListener('change',e=>{const t=e.target,d=t.dataset;
  if(d.classe!==undefined){f().classes[+d.classe]={c:t.value,n:1,sub:''};st().selecoes={};st().equipamento={};}
  if(d.nivel!==undefined)f().classes[+d.nivel].n=Math.max(1,Math.min(20,Number(t.value)||1));
  if(d.sub!==undefined)f().classes[+d.sub].sub=t.value;
  if(t.hasAttribute('data-raca')){f().raca=t.value;f().atrRaca=[];}
  if(d.racial!==undefined){f().atrRaca ||= [];f().atrRaca[+d.racial]=t.value;}
  if(t.hasAttribute('data-background'))f().backgroundId=t.value;
  if(t.hasAttribute('data-bg-treino'))st().bgTreino=t.value;
  if(t.hasAttribute('data-bg-desc'))st().backgroundDescricao=t.value;
  if(d.base)st().base[d.base]=Number(t.value);
  if(d.asi){f().melhorias ||= {};f().melhorias[d.asi] ||= [];f().melhorias[d.asi][+d.i]=t.value;}
  if(d.talento){st().talentos ||= {};if(t.value.trim()){st().talentos[d.talento]={nome:t.value.trim()};delete f().melhorias?.[d.talento];}else delete st().talentos[d.talento];}
  if(d.grupo){const gs=[...C.grupos(f()),...C.gruposMagias(C.derivar(p).ficha)],g=gs.find(g=>g.key===d.grupo);st().selecoes[d.grupo]=t.checked?[...new Set([...g.selecionadas,t.value])]:g.selecionadas.filter(v=>v!==t.value);}
  if(d.equip)st().equipamento[d.equip]=t.value;
  if(d.classe!==undefined||t.hasAttribute('data-raca')||t.hasAttribute('data-background'))$('#aviso').textContent='Confira novamente as escolhas dependentes da classe, raça e background.';
  desenhar();
 });
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.etapa!==undefined){etapa=+b.dataset.etapa;desenhar();}
  if(b.id==='anterior'||b.id==='proximo'){etapa+=b.id==='proximo'?1:-1;desenhar();}
  if(b.id==='multi'){f().classes.push({c:'',n:1,sub:''});desenhar();}
  if(b.dataset.rmClasse!==undefined){f().classes.splice(+b.dataset.rmClasse,1);desenhar();}
  if(b.id==='subir'){try{p=C.subir(p,$('#nivel-classe').value,$('#nivel-pv').value==='media'?'media':$('#nivel-rolagem').value);subiu=true;desenhar();}catch(err){$('#aviso').textContent=err.message;}}
  if(b.id==='salvar')salvar();
 });
 if(!nuvem.usuario()){location.replace('conta.html');return;}
 const [rows,d,magias]=await Promise.all([nuvem.get('personagens?select=*&id=eq.'+encodeURIComponent(id)),fetch('dados/criacao-srd2014.json').then(r=>{if(!r.ok)throw Error('Catálogo indisponível');return r.json();}),fetch('dados/magias.json').then(r=>r.json())]);
 if(!rows[0])throw Error('Personagem não encontrado ou sem acesso.');original=rows[0];C.configurar(d,magias.filter(EDICOES.permitida).sort((a,b)=>a.l-b.l||a.n.localeCompare(b.n,'pt-BR')));
 p=C.iniciar(original,evolucao?'nivel':'criacao');
 if((original.inventario||[]).length)st().equipAplicado=true;
 try{const draft=JSON.parse(localStorage.getItem(chave())||'null');if(draft?.versao===original.versao){p=draft.p;etapa=draft.etapa;subiu=draft.subiu;}}catch(_){}
 $('#voltar').href='personagem.html?id='+encodeURIComponent(id);desenhar();
})().catch(e=>{document.querySelector('#aviso').textContent=e.message;});
