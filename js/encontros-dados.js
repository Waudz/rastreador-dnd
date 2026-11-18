/* Encontros da campanha: regras da árvore (pastas, encontros, salas) e camada de dados.
   Hierarquia: pasta -> pasta | encontro (raiz ou qualquer pasta, sem limite de profundidade); encontro -> sala (opcional).
   Funções puras (testáveis) + repositório com dois destinos: o banco (tabela public.encontros_nos, só o mestre; ver supabase/migrations/20261118120000_encontros.sql)
   ou, enquanto a tabela ainda não existe no banco, este aparelho (localStorage), com aviso claro. Nada é apagado de vez sem confirmação (lixeira). */
(() => {
  "use strict";
  const sem = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const agora = () => new Date().toISOString();
  const uuid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); }));
  const TIPOS = { pasta: "Pasta", encontro: "Encontro", sala: "Sala" };
  const ESTADOS = { rascunho: "Rascunho", preparado: "Preparado" };
  const MODOS = { aleatorio: "Encontro aleatório", salas: "Encontro com salas" };

  /* ---------- consultas na lista plana de nós ---------- */
  const vivo = (n) => !n.excluido_em;
  const cmp = (a, b) => (a.ordem - b.ordem) || sem(a.nome).localeCompare(sem(b.nome), "pt-BR") || String(a.id).localeCompare(String(b.id));
  const porId = (nos, id) => nos.find((n) => n.id === id) || null;
  const filhos = (nos, paiId, incluirExcluidos = false) => nos.filter((n) => (n.pai_id || null) === (paiId || null) && (incluirExcluidos || vivo(n))).sort(cmp);
  function descendentes(nos, id) {
    const out = new Set(), fila = [id];
    while (fila.length) { const x = fila.shift(); for (const n of nos) if (n.pai_id === x && !out.has(n.id)) { out.add(n.id); fila.push(n.id); } }
    return out;
  }
  function caminho(nos, id) {
    const out = []; let n = porId(nos, id), guarda = 0;
    while (n && guarda++ < 10000) { out.unshift(n); n = n.pai_id ? porId(nos, n.pai_id) : null; }
    return out;
  }
  function arvore(nos, paiId = null) { return filhos(nos, paiId).map((n) => ({ no: n, filhos: arvore(nos, n.id) })); }
  const contar = (nos, id) => { const d = descendentes(nos, id); let enc = 0, salas = 0, pastas = 0; for (const x of d) { const n = porId(nos, x); if (!n || !vivo(n)) continue; if (n.tipo === "encontro") enc++; else if (n.tipo === "sala") salas++; else pastas++; } return { encontros: enc, salas, pastas }; };

  /* ---------- regras de criação e movimento ---------- */
  const nomeValido = (nome) => { const t = String(nome || "").replace(/\s+/g, " ").trim(); return t.length >= 1 && t.length <= 120 ? t : null; };
  function paiPermitido(tipo, pai) {
    if (tipo === "sala") return !!pai && pai.tipo === "encontro";
    return !pai || pai.tipo === "pasta";
  }
  const proximaOrdem = (nos, paiId) => { const f = filhos(nos, paiId, true); return f.length ? Math.max(...f.map((n) => n.ordem)) + 1 : 0; };
  /* tipo do encontro: "aleatorio" (sem salas) ou "salas". Encontros antigos não têm o campo e continuam como "salas" (nada some). */
  const modoDe = (no) => (no && no.dados && no.dados.modo === "aleatorio" ? "aleatorio" : "salas");
  function dadosPadrao(tipo, modo) {
    if (tipo === "encontro") return { descricao: "", modo: modo === "aleatorio" ? "aleatorio" : "salas", estado: "rascunho", concluido: false, historico: [] };
    if (tipo === "sala") return { descricao: "", explorada: false };
    return { descricao: "" };
  }
  function novoNo(nos, { tipo, nome, paiId = null, campanhaId, modo }) {
    const n = nomeValido(nome); if (!n) return { erro: "Informe um nome (até 120 caracteres)." };
    if (!TIPOS[tipo]) return { erro: "Tipo inválido." };
    const pai = paiId ? porId(nos, paiId) : null;
    if (paiId && (!pai || !vivo(pai))) return { erro: "O destino não existe mais." };
    if (!paiPermitido(tipo, pai)) return { erro: tipo === "sala" ? "Uma sala precisa estar dentro de um encontro." : "Pastas e encontros só entram em pastas ou na raiz." };
    if (tipo === "sala" && modoDe(pai) === "aleatorio") return { erro: "Encontros aleatórios não têm salas. Mude o tipo do encontro para usar salas." };
    const dados = dadosPadrao(tipo, modo); if (tipo === "encontro") dados.historico.push({ quando: agora(), texto: "Encontro criado." });
    return { no: { id: uuid(), campanha_id: campanhaId, pai_id: paiId || null, tipo, nome: n, ordem: proximaOrdem(nos, paiId), dados, excluido_em: null, criado_em: agora(), atualizado_em: agora(), versao: 1 } };
  }
  /* "Mover para": vale para pastas e encontros; nunca para dentro de si mesmo ou de um descendente; salas não se movem */
  function podeMover(nos, id, destinoId) {
    const n = porId(nos, id); if (!n) return { ok: false, erro: "Item não encontrado." };
    if (n.tipo === "sala") return { ok: false, erro: "Salas ficam no próprio encontro." };
    const destino = destinoId ? porId(nos, destinoId) : null;
    if (destinoId && (!destino || !vivo(destino))) return { ok: false, erro: "Destino inexistente." };
    if (!paiPermitido(n.tipo, destino)) return { ok: false, erro: "Destino inválido." };
    if (destinoId === id || (destinoId && descendentes(nos, id).has(destinoId))) return { ok: false, erro: "Não dá para mover uma pasta para dentro dela mesma ou de uma pasta descendente." };
    return { ok: true };
  }
  function destinos(nos, id) {            // pastas válidas, com o caminho por extenso (a raiz vem primeiro)
    const lista = [{ id: null, rotulo: "Raiz (sem pasta)" }];
    const visita = (paiId, prefixo) => { for (const f of filhos(nos, paiId)) if (f.tipo === "pasta") { const rotulo = prefixo + f.nome; if (podeMover(nos, id, f.id).ok) lista.push({ id: f.id, rotulo }); visita(f.id, rotulo + " › "); } };
    visita(null, ""); return lista;
  }
  function mover(nos, id, destinoId) {
    const v = podeMover(nos, id, destinoId); if (!v.ok) return v;
    return { ok: true, campos: { pai_id: destinoId || null, ordem: proximaOrdem(nos, destinoId) } };
  }
  /* ordenação manual: troca de lugar com o irmão de cima (delta -1) ou de baixo (+1); devolve as novas ordens de todo o grupo */
  function reordenar(nos, id, delta) {
    const n = porId(nos, id); if (!n) return null;
    const grupo = filhos(nos, n.pai_id), i = grupo.findIndex((x) => x.id === id), j = i + delta;
    if (i < 0 || j < 0 || j >= grupo.length) return null;
    const nova = grupo.slice(); [nova[i], nova[j]] = [nova[j], nova[i]];
    return nova.map((x, k) => ({ id: x.id, ordem: k })).filter((x) => porId(nos, x.id).ordem !== x.ordem);
  }
  /* várias salas de uma vez: um nome por linha (ou separados por vírgula/ponto e vírgula); ignora vazios e repetidos */
  function nomesEmLote(texto) {
    const vistos = new Set(), out = [];
    for (const t of String(texto || "").split(/[\n;,]+/)) { const n = nomeValido(t); if (n && !vistos.has(sem(n))) { vistos.add(sem(n)); out.push(n); } }
    return out;
  }
  /* duplicar um encontro (e suas salas) dentro da mesma campanha: cópia independente, em rascunho, sem conclusão nem exploração */
  function duplicar(nos, id) {
    const orig = porId(nos, id); if (!orig || orig.tipo !== "encontro") return { erro: "Só encontros podem ser duplicados." };
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const copia = { ...clone(orig), id: uuid(), nome: nomeValido((orig.nome + " (cópia)").slice(0, 120)), ordem: orig.ordem + 0.5, criado_em: agora(), atualizado_em: agora(), versao: 1, excluido_em: null };
    copia.dados.estado = "rascunho"; copia.dados.concluido = false; copia.dados.historico = [{ quando: agora(), texto: "Duplicado de “" + orig.nome + "”." }];
    const salas = filhos(nos, id).map((s) => { const c = { ...clone(s), id: uuid(), pai_id: copia.id, criado_em: agora(), atualizado_em: agora(), versao: 1, excluido_em: null }; c.dados.explorada = false; return c; });
    const irmaos = filhos(nos, orig.pai_id), pos = irmaos.findIndex((x) => x.id === orig.id), ordenados = irmaos.slice(); ordenados.splice(pos + 1, 0, copia);
    const reord = ordenados.map((x, k) => ({ id: x.id, ordem: k }));
    copia.ordem = reord.find((x) => x.id === copia.id).ordem;
    return { novos: [copia, ...salas], reordenar: reord.filter((x) => x.id !== copia.id && porId(nos, x.id) && porId(nos, x.id).ordem !== x.ordem) };
  }
  /* lixeira: excluir marca o item e tudo dentro dele; restaurar volta o grupo (para a raiz se o pai original também foi para a lixeira) */
  const idsDoGrupo = (nos, id) => [id, ...descendentes(nos, id)];
  function restaurar(nos, id) {
    const n = porId(nos, id); if (!n) return null;
    const pai = n.pai_id ? porId(nos, n.pai_id) : null, paiVivo = !pai || vivo(pai);
    const campos = {}; if (!paiVivo) { if (n.tipo === "sala") return { erro: "Restaure primeiro o encontro desta sala." }; campos.pai_id = null; campos.ordem = proximaOrdem(nos, null); }
    return { ids: idsDoGrupo(nos, id).filter((x) => { const m = porId(nos, x); return m && m.excluido_em === n.excluido_em; }), campos };
  }
  /* Converter "com salas" em "aleatório" sem perder nada: o conteúdo das salas (descrição e monstros; elementos e loot entram aqui nas próximas etapas)
     passa para o encontro e as salas vão para a lixeira (restauráveis). Devolve o plano; quem chama grava e pede a confirmação. */
  function planoParaAleatorio(nos, id) {
    const enc = porId(nos, id); if (!enc || enc.tipo !== "encontro") return { erro: "Encontro não encontrado." };
    const salas = filhos(nos, id), dados = JSON.parse(JSON.stringify(enc.dados)); dados.modo = "aleatorio";
    const monstros = Array.isArray(dados.monstros) ? dados.monstros : []; let movidos = 0, textos = [];
    for (const s of salas) {
      const ms = Array.isArray(s.dados.monstros) ? s.dados.monstros : []; monstros.push(...JSON.parse(JSON.stringify(ms))); movidos += ms.length;
      if (s.dados.descricao && String(s.dados.descricao).trim()) textos.push("**" + s.nome + "**\n" + String(s.dados.descricao).trim());
    }
    if (monstros.length) dados.monstros = monstros;
    if (textos.length) dados.descricao = (String(dados.descricao || "").trim() ? dados.descricao.trim() + "\n\n" : "") + textos.join("\n\n");
    dados.historico = (Array.isArray(dados.historico) ? dados.historico : []).concat([{ quando: agora(), texto: salas.length ? "Convertido para encontro aleatório: " + salas.length + " sala(s) (" + salas.map((s) => s.nome).join(", ") + ") foram para a lixeira e o conteúdo veio para o encontro." : "Convertido para encontro aleatório." }]);
    return { dados, salas: salas.map((s) => s.id), resumo: { salas: salas.length, monstros: movidos, descricoes: textos.length } };
  }
  /* busca por nome (pastas, encontros e salas; os monstros e elementos entram nas próximas etapas) */
  function buscar(nos, termo) {
    const t = sem(termo).trim(); if (!t) return [];
    return nos.filter((n) => vivo(n) && sem(n.nome).includes(t)).sort(cmp);
  }
  /* formatação simples das descrições: **negrito** e [cor]texto[/cor] (vermelho, laranja, dourado, verde, azul, roxo, cinza) */
  const CORES = { vermelho: "#e07a7a", laranja: "#e0a05a", dourado: "#d4ae72", verde: "#7fc79a", azul: "#7aa8e0", roxo: "#b48ae0", cinza: "#9aa7b3" };
  function formatar(texto) {
    let h = String(texto || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    h = h.replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>");
    h = h.replace(/\[(vermelho|laranja|dourado|verde|azul|roxo|cinza)\]([\s\S]*?)\[\/\1\]/g, (_, c, t) => `<span style="color:${CORES[c]}">${t}</span>`);
    return h.replace(/\n/g, "<br>");
  }

  /* ---------- repositório ---------- */
  const chaveLocal = (c) => "compendio:encontros:" + c;
  const ausente = (e) => /42P01|PGRST205|PGRST200|schema cache|does not exist|Could not find the table|encontros_nos/i.test(String((e && (e.message || "")) + JSON.stringify((e && e.detalhe) || "")));
  function criarRepositorio(campanhaId, nuvem, storage) {
    const st = storage || (typeof localStorage !== "undefined" ? localStorage : null);
    let modo = "nuvem";
    const lerLocal = () => { try { const v = JSON.parse(st.getItem(chaveLocal(campanhaId)) || "[]"); return Array.isArray(v) ? v : []; } catch (_) { return []; } };
    const gravarLocal = (l) => { try { st.setItem(chaveLocal(campanhaId), JSON.stringify(l)); } catch (e) { throw new Error("Não foi possível guardar neste aparelho (armazenamento cheio ou bloqueado)."); } };
    const q = encodeURIComponent(campanhaId);
    async function tentar(fnNuvem, fnLocal) {
      if (modo === "nuvem") { try { return await fnNuvem(); } catch (e) { if (!ausente(e)) throw e; modo = "local"; } }
      return fnLocal();
    }
    return {
      get modo() { return modo; },
      /* itens guardados só neste aparelho (antes da tabela existir): contar e enviar para a conta, pais antes dos filhos; só limpa o local se tudo foi aceito */
      locais: () => (st ? lerLocal() : []),
      async enviarLocais() {
        if (modo !== "nuvem") throw new Error("A conta ainda não tem a tabela de encontros.");
        const l = lerLocal(), ids = new Set(l.map((n) => n.id)), prof = (n) => { let d = 0, x = n; while (x && x.pai_id && d < 1000) { x = l.find((y) => y.id === x.pai_id); d++; } return d; };
        const jaNaConta = new Set(((await nuvem.get(`encontros_nos?campanha_id=eq.${q}&select=id`)) || []).map((n) => n.id));
        const ordem = l.filter((n) => !jaNaConta.has(n.id)).sort((a, b) => prof(a) - prof(b));
        for (const n of ordem) { const { atualizado_em, versao, ...campos } = n; if (campos.pai_id && !ids.has(campos.pai_id) && !jaNaConta.has(campos.pai_id)) campos.pai_id = null; await nuvem.post("encontros_nos", campos); }
        try { st.removeItem(chaveLocal(campanhaId)); } catch (_) { /* mantém a cópia local */ }
        return ordem.length;
      },
      listar: () => tentar(async () => (await nuvem.get(`encontros_nos?campanha_id=eq.${q}&select=*&order=ordem`)) || [], () => lerLocal()),
      inserir: (nos) => tentar(async () => { for (const n of nos) await nuvem.post("encontros_nos", n); return nos; }, () => { gravarLocal(lerLocal().concat(nos)); return nos; }),
      atualizar: (id, campos) => tentar(async () => { const r = await nuvem.patch(`encontros_nos?id=eq.${encodeURIComponent(id)}&campanha_id=eq.${q}`, campos); if (!r || !r[0]) throw new Error("A alteração não foi aceita pelo banco."); return r[0]; },
        () => { const l = lerLocal(), i = l.findIndex((n) => n.id === id); if (i < 0) throw new Error("Item não encontrado."); l[i] = { ...l[i], ...campos, atualizado_em: agora(), versao: (l[i].versao || 1) + 1 }; gravarLocal(l); return l[i]; }),
      apagar: (ids) => tentar(async () => { for (const id of ids) await nuvem.apagar(`encontros_nos?id=eq.${encodeURIComponent(id)}&campanha_id=eq.${q}`); return true; },
        () => { const s = new Set(ids); gravarLocal(lerLocal().filter((n) => !s.has(n.id))); return true; }),
    };
  }

  window.ENCONTROS_DADOS = { MODOS, modoDe, planoParaAleatorio, TIPOS, ESTADOS, CORES, sem, vivo, porId, filhos, descendentes, caminho, arvore, contar, nomeValido, paiPermitido, proximaOrdem, dadosPadrao, novoNo, podeMover, destinos, mover, reordenar, nomesEmLote, duplicar, idsDoGrupo, restaurar, buscar, formatar, criarRepositorio, ausente, agora };
})();
