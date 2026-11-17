/* Janela de dados do personagem (computador com mouse): conteúdo NATIVO no mesmo estilo dos painéis da página, sem iframe, sem menus do site e sem tela de celular.
   Só leitura (PV, atributos, perícias, ataques, magias, inventário); para editar, "Ficha completa" abre a página inteira na janela principal.
   Celular, toque e telas pequenas continuam usando a ficha em quadro, como antes (ver js/leitor-fichas.js). */
(() => {
  "use strict";
  /* as dependências (regras.js, ficha-componentes.js) podem carregar depois deste arquivo: são lidas só na hora de abrir */
  let R, C, esc;
  const deps = () => { R = window.REGRAS; C = window.FICHA_COMPONENTES; esc = C && C.esc; return !!(R && C && esc && window.nuvem); };
  const fm = (n) => (n >= 0 ? "+" : "") + n, num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const ATR = [["for", "FOR"], ["des", "DES"], ["con", "CON"], ["int", "INT"], ["sab", "SAB"], ["car", "CAR"]];
  const disponivel = () => deps() && innerWidth >= 900 && !!(window.matchMedia && matchMedia("(pointer:fine)").matches);
  let atual = null, timer = null;
  const seguro = (fn, vazio = "") => { try { return fn(); } catch (_) { return vazio; } };

  function secao(titulo, corpo, extra = "") { return corpo ? `<section class="panel fj-secao ${extra}"><h3 class="panel-title">${esc(titulo)}</h3>${corpo}</section>` : ""; }
  function html(P) {
    deps();
    const f = P.ficha || {}, cls = Array.isArray(f.classes) ? f.classes : [], nivel = seguro(() => R.nivelTotal(cls), 1) || 1, prof = seguro(() => R.prof(nivel), 2);
    const mod = (k) => seguro(() => R.mod(R.atributoEf(f, k)), 0), atr = f.atributos || {};
    const desc = seguro(() => R.resumoClasses(cls).descricao, "") || "Classe não definida", subs = cls.map((c) => c.sub).filter(Boolean).join(" · ");
    const mestre = seguro(() => R.resumoMestre(f), null);
    const pvMax = Math.max(0, num(P.pv_max)), pv = num(P.pv_atual), temp = num(P.pv_temp), pct = pvMax ? Math.max(0, Math.min(100, Math.round((pv / pvMax) * 100))) : 0;
    const cab = `<section class="panel fj-cab"><div class="fj-id">${seguro(() => C.retrato(P.nome, f.foto, 72, f), "")}<div><p class="eyebrow">Personagem · D&amp;D 2014</p><h2 class="fj-nome">${esc(P.nome)}</h2><p>${esc(f.raca || "Raça não definida")} · ${esc(desc)}</p>${subs ? `<p>${esc(subs)}</p>` : ""}<p class="fj-meta"><span class="badge">Nível ${nivel}</span> Proficiência ${fm(prof)} · ${esc(f.background || "Origem não definida")}</p></div></div>
      <div class="ficha-destaques">${C.estatistica({ rotulo: "CA", valor: P.ca })}${C.estatistica({ rotulo: "Iniciativa", valor: fm(mod("des") + seguro(() => R.bonusSemProf(f), 0)), tipo: "iniciativa" })}${C.estatistica({ rotulo: "Desloc.", valor: String(num(f.deslocamento, 9)).replace(".", ",") + " m", tipo: "deslocamento" })}${mestre ? C.estatistica({ rotulo: "Perc. passiva", valor: mestre.passiva }) : ""}</div></section>`;
    const vida = `<section class="panel fj-secao fj-pv"><div class="vida-cabecalho"><h3 class="panel-title">Pontos de vida</h3><strong>${pv} <small>/ ${pvMax} PV</small></strong></div><div class="hp-track"><div class="hp-fill" style="width:${pct}%"></div></div>${temp ? `<p class="muted">PV temporários: <b>${temp}</b></p>` : ""}${f.morte && f.morte.morto ? '<p class="err">Personagem morto.</p>' : ""}</section>`;
    const atrs = secao("Atributos", `<div class="fj-atributos">${ATR.map(([k, s]) => C.atributo({ sigla: s, valor: num(atr[k], 10), modificador: fm(mod(k)) })).join("")}</div>`);
    const per = mestre && mestre.pericias.length ? secao("Perícias com proficiência", `<ul class="fj-lista fj-duas">${mestre.pericias.map((p) => `<li><span>${esc(p.nome)}${p.especializada ? " ★" : ""}</span><b>${fm(num(p.valor))}</b></li>`).join("")}</ul>`) : "";
    const atq = mestre && mestre.ataques.length ? secao("Ataques", `<ul class="fj-lista">${mestre.ataques.map((a) => `<li><span>${esc(a.nome)}</span><b>${fm(num(a.ataque))} · ${esc(a.dado || "")}${num(a.dano) ? fm(num(a.dano)) : ""} ${esc(a.tipo || "")}</b></li>`).join("")}</ul>`) : "";
    const mag = Array.isArray(f.magias) && f.magias.length ? (() => { const g = {}; for (const m of f.magias) { if (m.ativa === false) continue; (g[num(m.l)] = g[num(m.l)] || []).push(m.n || m.en); } return secao("Magias", Object.keys(g).sort((a, b) => a - b).map((l) => `<p><b>${Number(l) ? l + "º círculo" : "Truques"}:</b> ${esc(g[l].join(", "))}</p>`).join("")); })() : "";
    const inv = Array.isArray(P.inventario) && P.inventario.length ? secao("Inventário", `<ul class="fj-lista fj-duas">${P.inventario.slice(0, 40).map((i) => `<li><span>${esc(i.nome || "Item")}</span><b>×${num(i.qtd, 1)}</b></li>`).join("")}</ul>${P.inventario.length > 40 ? `<p class="muted">E mais ${P.inventario.length - 40} itens na ficha completa.</p>` : ""}`) : "";
    const car = Array.isArray(f.caracteristicas) && f.caracteristicas.length ? secao("Características", `<p>${f.caracteristicas.slice(0, 30).map((c) => esc(c.nome || c.n || "")).filter(Boolean).join(" · ")}</p>`) : "";
    return `<div class="fj">${cab}${vida}${atrs}${per}${atq}${mag}${inv}${car}<div class="row fj-rodape"><a class="btnlike small" href="personagem.html?id=${encodeURIComponent(P.id)}" target="_top">Ficha completa (editar)</a><button type="button" class="small" data-fj-atualizar>Atualizar</button></div></div>`;
  }
  async function buscar(id) { const r = await nuvem.get(`personagens?select=*&id=eq.${encodeURIComponent(id)}`); if (!r || !r[0]) throw new Error("Personagem não encontrado ou sem acesso."); return r[0]; }
  async function atualizar(corpo, id) {
    try { const P = await buscar(id); if (atual !== id || !corpo.isConnected) return; const topo = corpo.scrollTop; corpo.innerHTML = html(P); corpo.scrollTop = topo; }
    catch (e) { if (atual === id) corpo.innerHTML = `<div class="fj"><section class="panel"><p class="err">${esc(e.message || "Não foi possível carregar a ficha.")}</p><button type="button" class="small" data-fj-atualizar>Tentar novamente</button></section></div>`; }
  }
  function abrir(id, corpo) {
    deps();
    atual = id; clearInterval(timer); corpo.classList.add("fj-corpo"); corpo.innerHTML = '<div class="fj"><section class="panel"><p class="muted" role="status">Carregando a ficha…</p></section></div>';
    corpo.onclick = (e) => { if (e.target.closest("[data-fj-atualizar]")) atualizar(corpo, id); };
    atualizar(corpo, id);
    timer = setInterval(() => { if (!corpo.isConnected || atual !== id || document.hidden || corpo.closest("[hidden]")) return; atualizar(corpo, id); }, 10000);   // PV e dados acompanham a ficha enquanto a janela está aberta
  }
  function limpar(corpo) { atual = null; clearInterval(timer); if (corpo) { corpo.classList.remove("fj-corpo"); corpo.onclick = null; } }
  window.FICHA_JANELA = { disponivel, abrir, limpar, html };
})();
