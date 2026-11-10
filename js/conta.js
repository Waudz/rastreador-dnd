/* Minha conta: login, campanhas e personagens do usuário */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s), esc = nuvem.esc;
  const msg = (el, t, erro) => { el.innerHTML = t ? (erro ? `<span class="err">${esc(t)}</span>` : esc(t)) : ""; };
  let modoCriar = false;
  const alterna = (sel) => { const f = $(sel); f.hidden = !f.hidden; if (!f.hidden) { const i = f.querySelector("input"); if (i) i.focus(); } };

  /* ---------- login ---------- */
  function modo(criar) {
    modoCriar = criar;
    $("#aba-entrar").classList.toggle("on", !criar); $("#aba-criar").classList.toggle("on", criar);
    $("#campo-nome").hidden = !criar; $("#btn-login").textContent = criar ? "Criar conta" : "Entrar";
    $("#l-senha").autocomplete = criar ? "new-password" : "current-password";
    $("#l-senha").placeholder = criar ? "Mínimo 8 caracteres" : "";
    msg($("#msg-login"), "");
  }
  $("#aba-entrar").onclick = () => modo(false);
  $("#aba-criar").onclick = () => modo(true);

  async function enviarLogin() {
    const email = $("#l-email").value.trim(), senha = $("#l-senha").value, m = $("#msg-login");
    if (!email || !senha) { msg(m, "Informe o e-mail e a senha.", true); return; }
    if (senha.length < 8) { msg(m, "A senha precisa ter pelo menos 8 caracteres.", true); return; }
    $("#btn-login").disabled = true; msg(m, "Aguarde…");
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
    msg(m, "Enviando…");
    try { await nuvem.linkMagico(email, location.origin + location.pathname); msg(m, "Link enviado. Abra o e-mail neste aparelho."); }
    catch (e) { msg(m, e.message, true); }
  };

  /* ---------- área logada ---------- */
  const barraPV = (a, mx) => { const pct = mx > 0 ? Math.max(0, Math.min(100, (a / mx) * 100)) : 0; return `<div class="hpline"><div class="hp-top"><span>PV</span><strong>${a} / ${mx}</strong></div><div class="hp-track"><div class="hp-fill ${pct <= 25 ? "low" : pct <= 50 ? "mid" : ""}" style="width:${pct}%"></div></div></div>`; };

  async function carregar() {
    const u = nuvem.usuario(); if (!u) return;
    const [perfil, membros, pers] = await Promise.all([
      nuvem.get(`perfis?select=nome&id=eq.${u.id}`),
      nuvem.get(`membros?select=papel,campanha:campanhas(id,nome)&usuario_id=eq.${u.id}&order=entrou_em.desc`),
      nuvem.get(`personagens?select=id,nome,pv_atual,pv_max,ca,ficha,campanha:campanhas(id,nome)&dono_id=eq.${u.id}&order=nome`)
    ]);
    const nome = (perfil[0] && perfil[0].nome) || u.nome || u.email.split("@")[0];
    $("#quem").textContent = nome; $("#a-nome").value = nome;

    $("#campanhas").innerHTML = membros.length ? membros.map((m) => {
      const c = m.campanha || {};
      return `<a class="card" href="campanha.html?id=${encodeURIComponent(c.id)}"><b>${esc(c.nome)}</b> <span class="badge ${m.papel === "mestre" ? "" : "jog"}">${m.papel === "mestre" ? "Mestre" : "Jogador"}</span></a>`;
    }).join("") : '<span class="muted">Nenhuma campanha ainda.</span>';

    $("#p-camp").innerHTML = membros.filter(m=>m.papel==="jogador").map((m) => `<option value="${esc(m.campanha.id)}">${esc(m.campanha.nome)}</option>`).join("") || '<option value="">(sem campanhas)</option>';

    const campanhasJogador = new Set(membros.filter(m=>m.papel==="jogador").map(m=>m.campanha.id));
    const meusPersonagens = pers.filter(p=>!(p.ficha||{}).npc && campanhasJogador.has((p.campanha||{}).id));
    $("#personagens").innerHTML = meusPersonagens.length ? meusPersonagens.map((p) => {
      const f = p.ficha || {}, sub = [f.classe, f.nivel ? "nível " + f.nivel : ""].filter(Boolean).join(" · ");
      return `<a class="card" href="personagem.html?id=${encodeURIComponent(p.id)}"><b>${esc(p.nome)}</b><div class="meta">${esc(sub)}${sub ? " · " : ""}${esc((p.campanha || {}).nome || "")}</div>${barraPV(p.pv_atual, p.pv_max)}</a>`;
    }).join("") : '<span class="muted">Seus personagens como jogador aparecem aqui. Como mestre, acesse os personagens dentro da campanha.</span>';
  }

  async function mostrarArea() {
    $("#entrar").hidden = true; $("#area").hidden = false;
    try { await carregar(); } catch (e) { $("#campanhas").innerHTML = `<span class="err">${esc(e.message)}</span>`; }
  }
  function mostrarLogin() { $("#entrar").hidden = false; $("#area").hidden = true; }

  $("#btn-sair").onclick = async () => { await nuvem.sair(); mostrarLogin(); };
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
      location.href = `personagem.html?id=${encodeURIComponent(r[0].id)}`;
    } catch (err) { msg(m, err.message, true); }
  });

  $("#btn-nome").onclick = async () => {
    const m = $("#msg-conta"), nome = $("#a-nome").value.trim(); if (!nome) return;
    try { await nuvem.patch(`perfis?id=eq.${nuvem.usuario().id}`, { nome }); msg(m, "Nome salvo."); await carregar(); } catch (e) { msg(m, e.message, true); }
  };
  $("#btn-senha").onclick = async () => {
    const m = $("#msg-conta"), s = $("#a-senha").value;
    if (s.length < 8) { msg(m, "A senha precisa ter pelo menos 8 caracteres.", true); return; }
    try { await nuvem.trocarSenha(s); $("#a-senha").value = ""; msg(m, "Senha trocada."); } catch (e) { msg(m, e.message, true); }
  };

  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(()=>{});


  $("#backup-conta").onchange=async e=>{
    const f=e.target.files[0];if(!f)return; const m=$("#msg-backup");e.target.disabled=true;
    try{const n=await acervo.importar(JSON.parse(await f.text()));msg(m,n+" criações salvas na sua conta, com fotos e traduções. Abra a campanha e use Importar do bestiário.");}
    catch(err){msg(m,err.message,true);}finally{e.target.disabled=false;e.target.value="";}
  };
  /* ---------- início ---------- */
  (async () => {
    nuvem.olhos();
    try { await nuvem.retornoDoLink(); } catch (e) { mostrarLogin(); msg($("#msg-login"), e.message, true); return; }
    if (nuvem.usuario()) await mostrarArea(); else mostrarLogin();
  })();
})();
