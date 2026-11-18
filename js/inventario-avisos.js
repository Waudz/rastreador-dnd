/* Avisos locais de recebimento. Não altera itens, ficha, permissões ou gravações na nuvem. */
(() => {
  "use strict";
  const PREFIXO = "dnd5e_inventario_avisos_v1:";
  const quantidade = n => Number.isFinite(Number(n)) ? Math.max(0, Number(n)) : 0;
  const mapa = a => new Map(Array.isArray(a) ? a.filter(x => Array.isArray(x) && typeof x[0] === "string" && Number.isFinite(x[1]) && x[1] >= 0) : []);
  function criar({ conta, campanha, personagem, storage }) {
    const chave = PREFIXO + [conta, campanha, personagem].map(encodeURIComponent).join(":");
    let memoria = null;
    function ler() {
      try { const texto = storage?.getItem(chave); if (texto) memoria = JSON.parse(texto); } catch (_) { /* armazenamento indisponível: mantém o estado desta página */ }
      return memoria?.v === 1 && Array.isArray(memoria.conhecidos) && Array.isArray(memoria.novos) ? memoria : null;
    }
    function guardar(conhecidos, novos, versao = memoria?.versao ?? null, historico = memoria?.historico || []) {
      memoria = { v: 1, versao, conhecidos: [...conhecidos], novos: [...novos], historico: historico.slice(-30) };
      try { const texto = JSON.stringify(memoria); if (storage?.getItem(chave) !== texto) storage?.setItem(chave, texto); } catch (_) { /* não impede o uso da ficha */ }
    }
    function atualizar(itens, versao = null) {
      const atuais = new Map((itens || []).filter(i => i && typeof i.uid === "string" && quantidade(i.qtd) > 0).map(i => [i.uid, i]));
      const salvo = ler(), conhecidos = mapa(salvo?.conhecidos), novos = mapa(salvo?.novos);
      const listar = () => [...novos].filter(([uid, qtd]) => qtd > 0 && atuais.has(uid)).map(([uid, qtd]) => ({ uid, qtd, nome: String(atuais.get(uid).nome || "Item sem nome") }));
      // Um quadro/guia antigo não pode apagar avisos de uma versão mais recente.
      if (salvo && Number.isFinite(versao) && Number.isFinite(salvo.versao) && versao <= salvo.versao) return listar();
      const historico = lerHistorico(salvo);
      // Primeira abertura: nenhum item antigo ou equipamento de criação vira novidade.
      if (salvo) for (const [uid, item] of atuais) {
        const ganho = quantidade(item.qtd) - (conhecidos.get(uid) || 0);
        const inicial = ["criacao", "inicial"].includes(item.origem?.tipo) && !item.transferencias?.length;
        if (ganho > 0 && !inicial) {
          novos.set(uid, (novos.get(uid) || 0) + ganho);
          historico.push({ uid, qtd: ganho, nome: String(item.nome || "Item sem nome"), quando: new Date().toISOString(), lido: false });
        }
      }
      for (const [uid, qtd] of novos) {
        if (!atuais.has(uid)) { novos.delete(uid); historico.filter(h => h.uid === uid).forEach(h => { h.lido = true; }); }
        else novos.set(uid, Math.min(qtd, quantidade(atuais.get(uid).qtd)));
      }
      guardar(new Map([...atuais].map(([uid, i]) => [uid, quantidade(i.qtd)])), novos, versao, historico);
      return listar();
    }
    function marcarVistos(ids) {
      const salvo = ler(); if (!salvo) return;
      const novos = mapa(salvo.novos); for (const uid of ids) novos.delete(uid);
      const vistos = new Set(ids), historico = lerHistorico(salvo).map(h => vistos.has(h.uid) ? { ...h, lido: true } : h);
      guardar(mapa(salvo.conhecidos), novos, salvo.versao, historico);
    }
    function lerHistorico(salvo) {
      return (Array.isArray(salvo?.historico) ? salvo.historico : []).filter(h => h && typeof h.uid === "string" && typeof h.nome === "string" && Number.isFinite(h.qtd) && h.qtd > 0 && Number.isFinite(Date.parse(h.quando))).slice(-30).map(h => ({ ...h }));
    }
    return { chave, atualizar, marcarVistos, historico: () => lerHistorico(ler()) };
  }

  let atual = null, janela = null;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  function membros(uid) { return atual?.grupos?.get(uid)?.membros?.map(i => i.uid) || [uid]; }
  function painelHTML() {
    const historico = atual?.tracker.historico() || [];
    if (!historico.length) return '<p>Nenhuma notificação ainda.</p><p class="muted">O equipamento inicial não gera notificações.</p>';
    const presentes = new Set((atual.p.inventario || []).map(i => i.uid));
    return '<p class="muted">Últimas notificações neste navegador. Itens vistos continuam no histórico.</p><ul class="inv-avisos-lista">' + historico.slice().reverse().map(h => `<li class="${h.lido ? 'inv-aviso-visto' : 'inv-aviso-novo'}"><strong>${esc(h.nome)}</strong><span>+${esc(h.qtd)} · ${h.lido ? 'Visto' : 'Novo'}</span><time datetime="${esc(h.quando)}">${esc(new Date(h.quando).toLocaleString('pt-BR', {dateStyle:'short',timeStyle:'short'}))}</time><div>${presentes.has(h.uid) ? `<button type="button" class="small" data-inv-aviso-ir="${esc(h.uid)}">Ver no inventário</button>` : '<span class="muted">Item não está mais no inventário.</span>'}${!h.lido ? `<button type="button" class="small subtle" data-inv-aviso-lido="${esc(h.uid)}">Marcar visto</button>` : ''}</div></li>`).join("") + '</ul>' + (atual.novos.length ? '<button type="button" class="small" data-inv-avisos-todos>Marcar todos como vistos</button>' : '');
  }
  function renderizar(p, { somenteLeitura = false, grupos } = {}) {
    const usuario = window.nuvem?.usuario?.()?.id;
    const slot = document.querySelector("#avisos-inventario");
    const aba = document.querySelector('[data-ficha-aba="inventario"]');
    if (!p || !usuario || p.dono_id !== usuario || somenteLeitura) {
      atual = null; if (slot) { slot.hidden = true; slot.innerHTML = ""; }
      if (aba) { aba.classList.toggle("tem-novidades", false); aba.removeAttribute?.("data-novidades"); aba.innerHTML = "Inventário"; }
      if (janela) janela.fechar(); return;
    }
    const chave = [usuario, p.campanha_id, p.id].join(":");
    if (!atual || atual.chave !== chave) {
      if (janela) janela.fechar();
      let storage; try { storage = window.PREVIA_FICHA ? undefined : window.localStorage; } catch (_) {}
      atual = { chave, p, grupos, tracker: criar({ conta: usuario, campanha: p.campanha_id, personagem: p.id, storage }), novos: [] };
    }
    atual.p = p; atual.grupos = grupos;
    atual.novos = atual.tracker.atualizar(p.inventario, p.versao);
    const total = atual.novos.length;
    if (slot) {
      slot.hidden = false;
      const anterior = slot.querySelector("button");
      if (!anterior || anterior.getAttribute("data-total") !== String(total)) slot.innerHTML = `<button type="button" class="small inv-sino${total ? ' tem-novidades' : ''}" data-inv-avisos data-total="${total}" aria-label="Notificações do inventário: ${total ? total + (total === 1 ? ' item com novidades' : ' itens com novidades') : 'nenhuma novidade'}" title="Notificações do inventário">${window.ico ? window.ico("bell") : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" fill="none" stroke="currentColor" stroke-width="2"/></svg>'}${total ? `<span aria-hidden="true" class="inv-novidades-contador">${total}</span>` : ""}</button>`;
    }
    if (aba) {
      aba.classList.toggle("tem-novidades", total > 0);
      aba.innerHTML = 'Inventário' + (total ? ` <span class="inv-novidades-contador" aria-label="${total} novidade${total === 1 ? '' : 's'}">${total}</span>` : '');
    }
    const porUid = new Map(atual.novos.map(n => [n.uid, n]));
    document.querySelectorAll('.item-inv[data-item-uid]').forEach(linha => {
      const uid = linha.dataset.itemUid, novidades = membros(uid).filter(u => porUid.has(u));
      linha.classList.toggle("inv-tem-novidade", novidades.length > 0);
      linha.querySelector(".inv-novo-aviso")?.remove();
      if (novidades.length) linha.querySelector(".inv-titulo")?.insertAdjacentHTML("beforeend", `<button type="button" class="small inv-novo-aviso" data-inv-aviso-lido="${esc(uid)}" aria-label="Marcar ${esc(linha.querySelector('.inv-nome-txt')?.textContent || 'item')} como visto">Novo · Marcar visto</button>`);
    });
    if (janela) janela.corpo.innerHTML = painelHTML();
  }
  if (typeof document !== "undefined") document.addEventListener("click", e => {
    if (!atual || atual.p.dono_id !== window.nuvem?.usuario?.()?.id) return;
    const b = e.target.closest?.('[data-inv-avisos],[data-inv-aviso-ir],[data-inv-aviso-lido],[data-inv-avisos-todos]');
    if (!b) return;
    if (b.hasAttribute("data-inv-avisos")) {
      if (janela || !window.COMP_JANELA) return;
      janela = window.COMP_JANELA.abrir({ titulo: "Notificações", largura: "pequena", conteudo: painelHTML(), aoFechar: () => { janela = null; } }); return;
    }
    if (b.hasAttribute("data-inv-aviso-ir")) {
      const uid = b.dataset.invAvisoIr;
      if (janela) janela.fechar();
      document.querySelector('[data-ficha-aba="inventario"]')?.click();
      const linha = [...document.querySelectorAll('.item-inv[data-item-uid]')].find(l => membros(l.dataset.itemUid).includes(uid));
      linha?.scrollIntoView({ block: "center", behavior: "smooth" }); linha?.querySelector('[data-inv-aviso-lido]')?.focus({ preventScroll: true }); return;
    }
    const ids = b.hasAttribute("data-inv-avisos-todos") ? atual.novos.map(n => n.uid) : membros(b.dataset.invAvisoLido);
    const naJanela = janela?.corpo.contains(b), retorno = b.closest(".item-inv")?.querySelector("[data-inv-detalhes]");
    atual.tracker.marcarVistos(ids);
    renderizar(atual.p, { grupos: atual.grupos });
    if (naJanela) (janela?.corpo.querySelector("button") || janela?.box.querySelector("button"))?.focus();
    else retorno?.focus({ preventScroll: true });
  });
  if (typeof window.addEventListener === "function") window.addEventListener("storage", e => {
    if (atual && e.key === atual.tracker.chave) renderizar(atual.p, { grupos: atual.grupos });
  });
  window.AVISOS_INVENTARIO = { criar, renderizar };
})();
