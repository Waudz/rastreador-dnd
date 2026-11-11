/* Minha conta: login, campanhas e personagens do usuário */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s), esc = nuvem.esc, C=window.FICHA_COMPONENTES;
  const msg = (el, t, erro) => { el.innerHTML = t ? (erro ? `<span class="err">${esc(t)}</span>` : esc(t)) : ""; };
  let personagensConta=[],podeCriarPersonagem=false;
  const filtros={nome:'',classe:'',nivel:'',campanha:''};let filtroCampanhaIniciado=false;
  const alterna = (sel) => { const f = $(sel); f.hidden = !f.hidden; if (!f.hidden) { const i = f.querySelector("input"); if (i) i.focus(); } };

  /* ---------- área logada ---------- */
  const barraPV = (a, mx) => { const pct = mx > 0 ? Math.max(0, Math.min(100, (a / mx) * 100)) : 0; return `<div class="hpline"><div class="hp-top"><span>PV</span><strong>${a} / ${mx}</strong></div><div class="hp-track"><div class="hp-fill ${pct <= 25 ? "low" : pct <= 50 ? "mid" : ""}" style="width:${pct}%"></div></div></div>`; };
  function biblioteca(){
    const lista=C.filtrarPersonagens(personagensConta,filtros);
    $('#biblioteca-contagem').textContent=lista.length+' de '+personagensConta.length+' personagens';
    $('#personagens').innerHTML=lista.length?lista.map(p=>{
      const f=p.ficha||{},r=C.resumoPersonagem(f);
      return `<a class="card biblioteca-cartao" href="personagem.html?id=${encodeURIComponent(p.id)}"><div class="biblioteca-identidade">${C.retrato(p.nome,f.foto)}<div><h3>${esc(p.nome)}</h3><p>${esc([f.raca,r.classes].filter(Boolean).join(' · ')||'Ficha em criação')}</p>${r.nivel?`<span class="badge">Nível ${r.nivel}</span>`:''}</div></div><p class="biblioteca-campanha">${esc(p.campanha?.nome||'Campanha não informada')}</p>${barraPV(p.pv_atual,p.pv_max)}<span class="biblioteca-abrir">Abrir ficha <span aria-hidden="true">↗</span></span></a>`;
    }).join(''):personagensConta.length?'<div class="estado-vazio"><strong>Nenhum personagem corresponde aos filtros</strong><p>Altere a busca ou use Limpar filtros para ver sua biblioteca.</p></div>':`<div class="estado-vazio"><strong>Sua biblioteca de personagens</strong><p>Seus personagens como jogador aparecem aqui. Como mestre, acesse os personagens dentro da campanha.</p>${podeCriarPersonagem?'<button type="button" class="small primary" id="biblioteca-primeiro">Criar meu primeiro personagem</button>':'<a class="btnlike small" href="conta.html?aba=campanhas&gerenciar=1">Ver campanhas</a>'}</div>`;
    const primeiro=$('#biblioteca-primeiro');if(primeiro)primeiro.onclick=()=>{$('#form-pers').hidden=false;$('#p-nome').focus();};
  }
  for(const [id,k] of [['biblioteca-busca','nome'],['biblioteca-campanha','campanha'],['biblioteca-classe','classe'],['biblioteca-nivel','nivel']]){
    $('#'+id).addEventListener(k==='nome'?'input':'change',e=>{filtros[k]=e.target.value;biblioteca();});
  }
  $('#biblioteca-limpar').onclick=()=>{for(const [id,k] of [['biblioteca-busca','nome'],['biblioteca-campanha','campanha'],['biblioteca-classe','classe'],['biblioteca-nivel','nivel']]){filtros[k]='';$('#'+id).value='';}biblioteca();};

  const liberar = () => document.body.removeAttribute?.('data-entrada');   // mostra a página (ver CSS body[data-entrada])
  async function carregar() {
    const u = nuvem.usuario(); if (!u) return;
    const [perfil, membros, pers] = await Promise.all([
      nuvem.get(`perfis?select=nome&id=eq.${u.id}`),
      nuvem.get(`membros?select=papel,campanha:campanhas(id,nome)&usuario_id=eq.${u.id}&order=entrou_em.desc`),
      nuvem.get(`personagens?select=id,nome,pv_atual,pv_max,ca,ficha,campanha:campanhas(id,nome)&dono_id=eq.${u.id}&order=nome`)
    ]);
    if(nuvem.usuario()?.id !== u.id) return;
    const destino=window.CAMPANHAS_UI?.entrada(membros,location.search);
    if(destino){location.replace(destino);return;}
    liberar();
    const nome = (perfil[0] && perfil[0].nome) || u.nome || u.email.split("@")[0];
    $("#quem").textContent = nome; $("#a-nome").value = nome;

    $("#campanhas").innerHTML = membros.length ? membros.map((m) => {
      const c = m.campanha || {};
      return `<a class="card" href="campanha.html?id=${encodeURIComponent(c.id)}"><b>${esc(c.nome)}</b> <span class="badge ${m.papel === "mestre" ? "" : "jog"}">${m.papel === "mestre" ? "Mestre" : "Jogador"}</span></a>`;
    }).join("") : '<div class="estado-vazio"><strong>Sua próxima aventura começa aqui</strong><p>Crie uma campanha para mestrar ou entre com o código enviado pelo seu mestre. Use as ações acima para começar.</p></div>';
    const acao=new URLSearchParams(location.search||'').get('acao');
    if(acao==='criar')$('#form-camp').hidden=false;
    if(acao==='entrar')$('#form-entrar').hidden=false;

    $("#p-camp").innerHTML = membros.filter(m=>m.papel==="jogador" && m.campanha).map((m) => `<option value="${esc(m.campanha.id)}">${esc(m.campanha.nome)}</option>`).join("") || '<option value="">(sem campanhas)</option>';

    const campanhasJogador = new Set(membros.filter(m=>m.papel==="jogador"&&m.campanha).map(m=>m.campanha.id));
    const meusPersonagens = pers.filter(p=>!(p.ficha||{}).npc && campanhasJogador.has((p.campanha||{}).id));
    personagensConta=meusPersonagens;podeCriarPersonagem=campanhasJogador.size>0;$('#abre-pers').disabled=!podeCriarPersonagem;
    const ids=[...new Set(personagensConta.flatMap(p=>C.resumoPersonagem(p.ficha).ids))].sort();
    $('#biblioteca-classe').innerHTML='<option value="">Todas as classes</option>'+ids.map(k=>'<option value="'+esc(k)+'">'+esc(window.REGRAS.classe(k)?.n||k)+'</option>').join('');
    $('#biblioteca-nivel').innerHTML='<option value="">Todos os níveis</option>'+[...new Set(personagensConta.map(p=>C.resumoPersonagem(p.ficha).nivel).filter(Boolean))].sort((a,b)=>a-b).map(n=>'<option value="'+n+'">Nível '+n+'</option>').join('');
    /* a biblioteca começa na campanha ativa, para não misturar personagens de campanhas diferentes */
    const camps=[...new Map(personagensConta.filter(p=>p.campanha?.id).map(p=>[p.campanha.id,p.campanha.nome])).entries()];
    if(!filtroCampanhaIniciado){filtroCampanhaIniciado=true;const ativa=window.CAMPANHAS_UI?.ativaId?.()||'';filtros.campanha=camps.some(([cid])=>cid===ativa)?ativa:'';}
    else if(filtros.campanha&&!camps.some(([cid])=>cid===filtros.campanha))filtros.campanha='';
    $('#biblioteca-campanha').innerHTML='<option value="">Todas as campanhas</option>'+camps.map(([cid,nome])=>'<option value="'+esc(cid)+'">'+esc(nome)+'</option>').join('');$('#biblioteca-campanha').value=filtros.campanha;
    $('#biblioteca-classe').value=filtros.classe;$('#biblioteca-nivel').value=filtros.nivel;biblioteca();
  }

  async function sincronizarConta(){
    if(!nuvem.usuario()||!acervo.ativo())return;
    const b=$("#conta-sincronizar"),el=$("#conta-sync-status");b.disabled=true;el.textContent="Sincronizando com sua conta…";
    try{await acervo.sincronizar();el.textContent="Sincronizado com sua conta às "+new Date().toLocaleTimeString("pt-BR")+". Personagens e campanhas são salvos online.";}
    catch(e){el.textContent="Não foi possível sincronizar: "+e.message;}finally{b.disabled=false;}
  }
  $("#conta-sincronizar").onclick=sincronizarConta;
  async function mostrarArea() {
    $("#campanhas").innerHTML = '<p class="carregando" role="status">Carregando suas campanhas…</p>'; $("#personagens").innerHTML = '<p class="carregando" role="status">Carregando seus personagens…</p>';
    $("#area").hidden = false;
    try { await carregar(); if(acervo.ativo())await sincronizarConta(); } catch (e) { liberar();const erro=`<p class="err" role="alert">Não foi possível carregar seus dados: ${esc(e.message)}. Recarregue para tentar novamente.</p>`;$("#campanhas").innerHTML = erro;$('#personagens').innerHTML=erro; }
  }
  /* sem sessão: página de entrada; depois de sair por vontade própria: volta ao uso como visitante (os dados locais ficam) */
  function mostrarLogin(comoVisitante) {
    liberar(); personagensConta = []; podeCriarPersonagem = false; $("#area").hidden = true; $("#campanhas").innerHTML = ""; $("#personagens").innerHTML = ""; $("#quem").textContent = ""; $('#biblioteca-contagem').textContent = '';
    location.replace(comoVisitante ? "iniciativa.html" : (nuvem.entradaUrl ? nuvem.entradaUrl() : "entrar.html"));
  }

  $("#btn-sair").onclick = async () => { await nuvem.sair(); mostrarLogin(true); };     // sai só deste aparelho; seus dados locais continuam aqui
  $("#btn-sair-todos").onclick = async () => {
    if (!confirm("Sair da conta em todos os aparelhos? Você precisará entrar de novo em cada um. Seus dados locais não são apagados.")) return;
    await nuvem.sairDeTodos(); mostrarLogin(true);
  };
  $("#abre-camp").onclick = () => { $("#form-entrar").hidden = true; alterna("#form-camp"); };
  $("#abre-codigo").onclick = () => { $("#form-camp").hidden = true; alterna("#form-entrar"); };
  $("#abre-pers").onclick = () => alterna("#form-pers");

  $("#form-camp").addEventListener("submit", async (e) => {
    e.preventDefault(); const m = $("#msg-camp"), nome = $("#c-nome").value.trim(); if (!nome) return;
    try { await nuvem.rpc("criar_campanha", { p_nome: nome }); $("#c-nome").value = ""; $("#form-camp").hidden = true; msg(m, ""); await carregar(); }
    catch (err) { msg(m, err.message, true); }
  });
  $("#form-entrar").addEventListener("submit", async (e) => {
    e.preventDefault(); const m = $("#msg-camp"), cod = $("#e-codigo").value.trim(); if (!cod) return;
    try { await nuvem.rpc("entrar_na_campanha", { p_codigo: cod }); $("#e-codigo").value = ""; $("#form-entrar").hidden = true; msg(m, ""); await carregar(); }
    catch (err) { msg(m, err.message, true); }
  });
  $("#form-pers").addEventListener("submit", async (e) => {
    e.preventDefault(); const m = $("#msg-pers"), camp = $("#p-camp").value, nome = $("#p-nome").value.trim();
    if (!camp || !nome) { msg(m, "Escolha a campanha e informe o nome.", true); return; }
    try {
      const r = await nuvem.post("personagens", { campanha_id: camp, dono_id: nuvem.usuario().id, nome, pv_max: 10, pv_atual: 10 });
      location.href = `criar-personagem.html?id=${encodeURIComponent(r[0].id)}`;
    } catch (err) { msg(m, err.message, true); }
  });

  $("#btn-nome").onclick = async () => {
    const m = $("#msg-conta"), nome = $("#a-nome").value.trim(); if (!nome) return;
    try { await nuvem.patch(`perfis?id=eq.${nuvem.usuario().id}`, { nome }); msg(m, "Nome salvo."); await carregar(); } catch (e) { msg(m, e.message, true); }
  };
  async function trocarSenhaConta(codigo) {
    const m = $("#msg-conta"), atual = $("#a-atual").value, nova = $("#a-senha").value;
    try {
      await nuvem.trocarSenha(nova, atual, codigo);
      $("#a-atual").value = $("#a-senha").value = $("#a-codigo").value = ""; $("#linha-codigo").hidden = true; msg(m, "Senha trocada.");
    } catch (e) {
      if (e.reautenticar && !codigo) { try { await nuvem.reautenticar(); $("#linha-codigo").hidden = false; $("#a-codigo").focus(); msg(m, "Por segurança, enviamos um código ao seu e-mail. Digite-o e confirme a troca."); } catch (e2) { msg(m, e2.message, true); } return; }
      msg(m, e.message, true);
    }
  }
  $("#btn-senha").onclick = () => trocarSenhaConta();
  $("#btn-codigo").onclick = () => { const c = $("#a-codigo").value.trim(); if (!c) { msg($("#msg-conta"), "Digite o código recebido por e-mail.", true); return; } trocarSenhaConta(c); };



  /* ---------- início ---------- */
  (async () => {
    nuvem.olhos();
    try { await nuvem.retornoDoLink(); } catch (e) { mostrarLogin(); return; }
    if (nuvem.usuario() && nuvem.retornoTipo?.() === "recovery") { location.replace("entrar.html?recuperar=1"); return; }   // link de nova senha: a tela dele é a página de entrada
    const rapido = nuvem.usuario() ? window.CAMPANHAS_UI?.entradaRapida(location.search) : '';
    if (rapido) { location.replace(rapido); return; }
    if (nuvem.usuario()) { await mostrarArea(); return; }
    /* a página inicial do aplicativo (index.html / "./") para quem não tem conta é a iniciativa: ninguém é obrigado a entrar */
    if (/(^|\/)index\.html$|\/$/.test(String((window.location || location).pathname || ""))) { location.replace("iniciativa.html"); return; }
    mostrarLogin();
  })();
})();
