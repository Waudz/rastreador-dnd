/* Minha conta: login, campanhas e personagens do usuário */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s), esc = nuvem.esc;
  const msg = (el, t, erro) => { el.innerHTML = t ? (erro ? `<span class="err">${esc(t)}</span>` : esc(t)) : ""; };
  let modoCriar = false;

  /* ---------- login ---------- */
  function modo(criar) {
    modoCriar = criar;
    $("#aba-entrar").classList.toggle("on", !criar); $("#aba-criar").classList.toggle("on", criar);
    $("#campo-nome").hidden = !criar; $("#btn-login").textContent = criar ? "Criar conta" : "Entrar";
    $("#ent-titulo").textContent = criar ? "Criar conta" : "Entrar";
    $("#l-senha").autocomplete = criar ? "new-password" : "current-password";
    msg($("#msg-login"), "");
  }
  $("#aba-entrar").onclick = () => modo(false);
  $("#aba-criar").onclick = () => modo(true);

  async function enviarLogin() {
    const email = $("#l-email").value.trim(), senha = $("#l-senha").value, m = $("#msg-login");
    if (!email || !senha) { msg(m, "Informe o e-mail e a senha.", true); return; }
    if (senha.length < 8) { msg(m, "A senha precisa ter pelo menos 8 caracteres.", true); return; }
    $("#btn-login").disabled = true; msg(m, modoCriar ? "Criando a conta…" : "Entrando…");
    try {
      if (modoCriar) await nuvem.cadastrar(email, senha, $("#l-nome").value.trim()); else await nuvem.entrar(email, senha);
      await mostrarArea();
    } catch (e) { msg(m, e.message, true); }
    $("#btn-login").disabled = false;
  }
  $("#btn-login").onclick = enviarLogin;
  $("#form-login").addEventListener("submit", (e) => { e.preventDefault(); enviarLogin(); });
  $("#btn-link").onclick = async () => {
    const email = $("#l-email").value.trim(), m = $("#msg-login");
    if (!email) { msg(m, "Informe o e-mail para receber o link.", true); return; }
    msg(m, "Enviando o link…");
    try { await nuvem.linkMagico(email, location.origin + location.pathname); msg(m, "Link enviado. Abra o e-mail neste aparelho e clique nele."); }
    catch (e) { msg(m, e.message, true); }
  };

  /* ---------- área logada ---------- */
  async function carregar() {
    const u = nuvem.usuario(); if (!u) return;
    const [perfil, membros, pers] = await Promise.all([
      nuvem.get(`perfis?select=nome&id=eq.${u.id}`),
      nuvem.get(`membros?select=papel,campanha:campanhas(id,nome)&usuario_id=eq.${u.id}&order=entrou_em.desc`),
      nuvem.get(`personagens?select=id,nome,pv_atual,pv_max,ca,campanha:campanhas(id,nome)&dono_id=eq.${u.id}&order=nome`)
    ]);
    const nome = (perfil[0] && perfil[0].nome) || u.nome || u.email.split("@")[0];
    $("#quem").textContent = `${nome} · ${u.email}`; $("#a-nome").value = nome;

    $("#campanhas").innerHTML = membros.length ? membros.map((m) => {
      const c = m.campanha || {};
      return `<div class="res"><span><b>${esc(c.nome)}</b> <span class="muted">· ${m.papel === "mestre" ? "Mestre" : "Jogador"}</span></span><a class="btnlike" href="campanha.html?id=${encodeURIComponent(c.id)}">Abrir</a></div>`;
    }).join("") : '<span class="muted">Você ainda não participa de nenhuma campanha. Crie uma ou entre com um código de convite.</span>';

    const sel = $("#p-camp");
    sel.innerHTML = membros.map((m) => `<option value="${esc(m.campanha.id)}">${esc(m.campanha.nome)}</option>`).join("") || '<option value="">(entre em uma campanha primeiro)</option>';

    $("#personagens").innerHTML = pers.length ? pers.map((p) =>
      `<div class="res"><span><b>${esc(p.nome)}</b> <span class="muted">· ${esc((p.campanha || {}).nome || "")} · PV ${p.pv_atual}/${p.pv_max} · CA ${p.ca}</span></span><a class="btnlike" href="personagem.html?id=${encodeURIComponent(p.id)}">Abrir</a></div>`
    ).join("") : '<span class="muted">Nenhum personagem ainda.</span>';
  }

  async function mostrarArea() {
    $("#entrar").hidden = true; $("#area").hidden = false;
    document.querySelector(".subtitle").textContent = "Suas campanhas e seus personagens.";
    try { await carregar(); } catch (e) { $("#campanhas").innerHTML = `<span class="err">${esc(e.message)}</span>`; }
  }
  function mostrarLogin() { $("#entrar").hidden = false; $("#area").hidden = true; }

  $("#btn-sair").onclick = async () => { await nuvem.sair(); mostrarLogin(); };

  $("#form-camp").addEventListener("submit", async (e) => {
    e.preventDefault(); const m = $("#msg-camp"), nome = $("#c-nome").value.trim(); if (!nome) return;
    try { const c = await nuvem.rpc("criar_campanha", { p_nome: nome }); $("#c-nome").value = ""; msg(m, `Campanha “${c.nome}” criada. Código de convite: ${c.codigo}`); await carregar(); }
    catch (err) { msg(m, err.message, true); }
  });
  $("#form-entrar").addEventListener("submit", async (e) => {
    e.preventDefault(); const m = $("#msg-camp"), cod = $("#e-codigo").value.trim(); if (!cod) return;
    try { const r = await nuvem.rpc("entrar_na_campanha", { p_codigo: cod }); const c = Array.isArray(r) ? r[0] : r; $("#e-codigo").value = ""; msg(m, `Você entrou na campanha “${c.nome}”.`); await carregar(); }
    catch (err) { msg(m, err.message, true); }
  });
  $("#form-pers").addEventListener("submit", async (e) => {
    e.preventDefault(); const m = $("#msg-pers"), camp = $("#p-camp").value, nome = $("#p-nome").value.trim();
    if (!camp || !nome) { msg(m, "Escolha a campanha e informe o nome.", true); return; }
    try { const r = await nuvem.post("personagens", { campanha_id: camp, dono_id: nuvem.usuario().id, nome, pv_max: 10, pv_atual: 10 }); $("#p-nome").value = ""; msg(m, `“${nome}” criado.`); await carregar(); }
    catch (err) { msg(m, err.message, true); }
  });

  $("#btn-nome").onclick = async () => {
    const m = $("#msg-conta"), nome = $("#a-nome").value.trim(); if (!nome) return;
    try { await nuvem.patch(`perfis?id=eq.${nuvem.usuario().id}`, { nome }); msg(m, "Nome salvo."); await carregar(); } catch (e) { msg(m, e.message, true); }
  };
  $("#btn-senha").onclick = async () => {
    const m = $("#msg-conta"), s = $("#a-senha").value;
    if (s.length < 8) { msg(m, "A nova senha precisa ter pelo menos 8 caracteres.", true); return; }
    try { await nuvem.trocarSenha(s); $("#a-senha").value = ""; msg(m, "Senha trocada."); } catch (e) { msg(m, e.message, true); }
  };

  /* ---------- início ---------- */
  (async () => {
    try { await nuvem.retornoDoLink(); } catch (e) { mostrarLogin(); msg($("#msg-login"), e.message, true); return; }
    if (nuvem.usuario()) await mostrarArea(); else mostrarLogin();
  })();
})();
