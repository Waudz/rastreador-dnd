    (() => {
      const perguntar = (m, o) => (typeof CONFIRMAR === "function" ? CONFIRMAR(m, o) : Promise.resolve(window.confirm(m)));
      const STORAGE_KEY = "dnd5e_initiative_tracker_v1";   // chave antiga (sem campanha); cada campanha ativa usa a sua: STORAGE_KEY + ":" + id
      const $ = (id) => document.getElementById(id);
      let contexto = "";                                   // id da campanha ativa; "" = rastreador avulso
      const chaveAtual = () => (contexto ? STORAGE_KEY + ":" + contexto : STORAGE_KEY);

      let combatants = [];
      let currentId = null;
      let round = 1;
      let nextOrder = 0;
      let editId = null;
      let stats = {};
      let report = null, relatorioLegado = null, grupoPV = null, seqDesfazer = 0;
      let selecao={qtd:0,preparar:null},iniciando=false;
      let edicaoIniciativa = null;const ouvintes=[];
      const notificar=()=>ouvintes.forEach(fn=>fn());

      function save() {
        try {
          localStorage.setItem(chaveAtual(), JSON.stringify({ combatants, currentId, round, nextOrder, stats, report:relatorioLegado }));
        } catch (_) {
          // O preview incorporado pode bloquear armazenamento local; o rastreador continua funcionando nesta sessão.
        }
      }

      /* primeira vez numa campanha: traz do rastreador antigo só o que é desta campanha ou não tem campanha; o resto fica onde estava */
      function adotarEstadoAntigo() {
        try {
          if (localStorage.getItem(chaveAtual()) !== null) return;
          const antigo = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
          if (!antigo || !Array.isArray(antigo.combatants)) return;
          const meus = antigo.combatants.filter((c) => !c.campanhaId || c.campanhaId === contexto), outros = antigo.combatants.filter((c) => c.campanhaId && c.campanhaId !== contexto);
          localStorage.setItem(chaveAtual(), JSON.stringify({ ...antigo, combatants: meus, currentId: meus.some((c) => c.id === antigo.currentId) ? antigo.currentId : null }));
          if (outros.length) localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...antigo, combatants: outros, currentId: outros.some((c) => c.id === antigo.currentId) ? antigo.currentId : null }));
          else localStorage.removeItem(STORAGE_KEY);
        } catch (_) {}
      }
      function zerar() { grupoPV = null; combatants = []; currentId = null; round = 1; nextOrder = 0; editId = null; stats = {}; report = null; relatorioLegado = null; edicaoIniciativa = null; }
      /* troca a campanha ativa: guarda o combate atual na chave da campanha antiga e carrega o da nova, sem misturar */
      function trocarContexto(novo) {
        novo = novo || "";
        if (novo === contexto) return;
        save(); contexto = novo; selecao={qtd:0,preparar:null}; zerar(); load(); render(); notificar();
      }

      function load() {
        try {
          if (contexto) adotarEstadoAntigo();
          const saved = JSON.parse(localStorage.getItem(chaveAtual()) || "null");
          if (!saved || !Array.isArray(saved.combatants)) return;
          combatants = saved.combatants;
          currentId = saved.currentId || null;
          round = Number(saved.round) > 0 ? Number(saved.round) : 1;
          nextOrder = Number(saved.nextOrder) || combatants.length;
          stats = saved.stats || {};
          report = null; relatorioLegado = saved.report || null;
        } catch (_) {
          combatants = [];
        }
      }

      /* quem não pode atacar nem agir (2014): a 0 PV (inconsciente/derrotado), estável, morto ou com condição que incapacita. Devolve o motivo ou "" */
      const CONDICOES_INCAPACITANTES = ["unconscious", "paralyzed", "stunned"];
      function incapaz(c) {
        if (!c) return "";
        if (c.morto) return "morto";
        if (Number(c.hp) <= 0) return c.estavel ? "estável, inconsciente" : "inconsciente";
        const e = (c.effects || []).find((x) => CONDICOES_INCAPACITANTES.includes(x.type));
        return e ? e.name.toLowerCase() + " (incapacitado)" : "";
      }
      const pendente = c => c.initiative == null || c.initiative === "" || !Number.isFinite(Number(c.initiative));
      /* empate de iniciativa entre personagens: quem tem mais Destreza (ficha) fica acima; sem Destreza conhecida, ou se ainda empatar, vale a ordem de adição */
      const agilidade = (c) => { const h = window.__ini && window.__ini.agilidadeDe; const v = c.kind === "Personagem" && h ? h(c) : null; return Number.isFinite(v) ? v : null; };
      function sorted() {
        const base = [...combatants].sort((a, b) => Number(pendente(a)) - Number(pendente(b)) || (pendente(a) ? 0 : Number(b.initiative) - Number(a.initiative)) || a.order - b.order);
        /* em cada grupo empatado, só os personagens com Destreza conhecida trocam de lugar entre si (nas posições que já ocupavam); o resto mantém a ordem de adição */
        for (let i = 0; i < base.length;) {
          let j = i + 1; while (j < base.length && !pendente(base[i]) && !pendente(base[j]) && Number(base[j].initiative) === Number(base[i].initiative)) j++;
          if (j - i > 1) { const pos = []; for (let k = i; k < j; k++) if (agilidade(base[k]) !== null) pos.push(k); const ord = pos.map((k) => base[k]).sort((x, y) => agilidade(y) - agilidade(x) || x.order - y.order); pos.forEach((k, n) => { base[k] = ord[n]; }); }
          i = j;
        }
        return base;
      }

      function escapeText(value) {
        return String(value).replace(/[&<>"']/g, (char) => ({
          "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[char]);
      }

      /* salvaguardas contra a morte (personagem a 0 PV): 3 sucessos estabilizam, 3 falhas matam; cura a partir de 0 PV zera tudo */
      function moreTpl(c) {
        const m = c.morte || { s: 0, f: 0 }, pips = (n, cls, rot) => `<span class="trilha ${cls}" role="img" aria-label="${n} de 3 ${rot}">${[0, 1, 2].map((k) => `<i class="pip${k < n ? " cheio" : ""}"></i>`).join("")}</span>`;
        if (c.morto) return `<div class="morte-linha"><span class="estado-chip morto">Morto</span><button class="small" type="button" data-morto="${c.id}|0">Reviver (1 PV)</button></div>`;
        if (c.estavel) return `<div class="morte-linha"><span class="estado-chip estavel">Estável</span><span class="muted">inconsciente, a 0 PV, sem salvaguardas</span><button class="small subtle" type="button" data-morto="${c.id}|1">Marcar morto</button></div>`;
        return `<div class="morte-linha morte-ativa"><div class="morte-estado"><span class="estado-chip inconsciente">Inconsciente</span><span class="trilha-rot">Sucessos</span>${pips(m.s, "ok", "sucessos")}<span class="trilha-rot">Falhas</span>${pips(m.f, "ko", "falhas")}</div>
          <div class="morte-reg"><label class="inline">Resultado do d20<input type="number" min="1" max="20" step="1" class="num" data-morte-d20="${c.id}" placeholder="1 a 20" aria-label="Resultado natural do d20 da salvaguarda contra a morte de ${escapeText(c.name)}"></label><button class="small primary" type="button" data-morte-reg="${c.id}" title="10 a 19 sucesso; 2 a 9 falha; 1 duas falhas; 20 volta a 1 PV">Registrar</button>${rolagemAuto() ? `<button class="small" type="button" data-morte-rolar="${c.id}" aria-label="Rolar o d20 da salvaguarda contra a morte">${ico("d20")}Rolar</button>` : ""}</div>
          <div class="morte-acoes"><button class="small" type="button" data-estab="${c.id}" title="Estabilizar (Medicina CD 10 ou Poupar os Moribundos)">Estabilizar</button><button class="small subtle" type="button" data-morto="${c.id}|1">Marcar morto</button>
            <details class="morte-manual"><summary>Registrar sem d20</summary><span class="morte-manual-botoes"><button class="small" type="button" data-morte="${c.id}|s">Sucesso</button><button class="small danger" type="button" data-morte="${c.id}|f">Falha</button><button class="small danger" type="button" data-morte="${c.id}|f2" title="Natural 1: duas falhas">Nat. 1</button><button class="small" type="button" data-morte="${c.id}|n20" title="Natural 20: volta a 1 PV">Nat. 20</button></span></details></div></div>`;
      }
      /* monstro ou NPC a 0 PV: inconsciente/derrotado até ser marcado morto (o turno pula os dois; só o morto não recebe cura) */
      function derrotadoTpl(c) {
        return c.morto ? `<div class="morte-linha"><span class="estado-chip morto">Morto</span><button class="small" type="button" data-morto="${c.id}|0">Reviver (1 PV)</button></div>` : `<div class="morte-linha"><span class="estado-chip inconsciente">Inconsciente</span><span class="muted">derrotado, fora do turno</span><button class="small subtle" type="button" data-morto="${c.id}|1">Marcar morto</button></div>`;
      }
      /* recursos de classe e espaços de magia (ficha vinculada): o consumo é contado no combate e só vai para a ficha se o combatente grava */
      function recursosTpl(c) {
        const d = c.pid && window.__ini.recursosDe ? window.__ini.recursosDe(c) : null; if (!d) return "";
        const usado = (id, base) => Math.max(Number(base) || 0, Number((c.usos || {})[id]) || 0);
        const rec = (d.recursos || []).filter((r) => r.max != null && r.id !== "furia").map((r) => { const u = usado(r.id, r.usados), resta = Math.max(0, r.max - u); return `<span class="rec-item">${escapeText(r.nome.replace(/ \(.*$/, ""))} <b>${resta}/${r.max}</b> <button class="small subtle" type="button" data-rec="${c.id}|${r.id}" ${resta <= 0 ? "disabled" : ""} aria-label="Usar ${escapeText(r.nome)}">Usar</button></span>`; });
        const esp = (d.slots || []).map((total, i) => { if (!total) return ""; const u = Math.max(Number((d.usadosSlots || [])[i]) || 0, Number((c.slots || {})[i + 1]) || 0), resta = Math.max(0, total - u); return `<span class="rec-item">${i + 1}º <b>${resta}/${total}</b> <button class="small subtle" type="button" data-esp="${c.id}|${i + 1}" ${resta <= 0 ? "disabled" : ""} aria-label="Gastar espaço de ${i + 1}º círculo">−1</button></span>`; }).filter(Boolean);
        if (!rec.length && !esp.length) return "";
        return `<div class="recursos-combate"><b>Recursos e espaços${c.sync ? " (grava na ficha)" : " (teste)"}</b>${rec.length ? `<div class="rec-linha">${rec.join("")}</div>` : ""}${esp.length ? `<div class="rec-linha"><span class="muted">Espaços de magia:</span>${esp.join("")}</div>` : ""}</div>`;
      }
      function usarRecurso(id, rid) {
        const p = combatants.find((c) => c.id === id), d = p && window.__ini.recursosDe ? window.__ini.recursosDe(p) : null, r = d && (d.recursos || []).find((x) => x.id === rid); if (!p || !r || r.max == null) return false;
        const u = Math.max(Number(r.usados) || 0, Number((p.usos || {})[rid]) || 0); if (u >= r.max) { aviso(`${p.name}: sem usos de ${r.nome}.`); return false; }
        guardarDesfazer(`${p.name} ${r.nome}`, [p.id]); p.usos = p.usos || {}; p.usos[rid] = u + 1;
        if (p.sync && window.__ini.registrarUso) window.__ini.registrarUso(p, rid, u + 1); render(); return true;
      }
      /* espaço de magia gasto no combate; vai para a ficha só se o combatente grava (combate de teste não altera a ficha) */
      async function usarEspaco(id, circ) {
        const p = combatants.find((c) => c.id === id), d = p && window.__ini.recursosDe ? window.__ini.recursosDe(p) : null; if (!p || !d) return { ok: false, msg: "Sem ficha vinculada." };
        const total = (d.slots || [])[circ - 1] || 0, u = Math.max(Number((d.usadosSlots || [])[circ - 1]) || 0, Number((p.slots || {})[circ]) || 0);
        if (u >= total) return { ok: false, msg: `Sem espaços de ${circ}º círculo disponíveis para ${p.name}.` };
        guardarDesfazer(`${p.name} espaço ${circ}º`, [p.id]); p.slots = p.slots || {}; p.slots[circ] = u + 1;
        let texto = `Gastou 1 espaço de ${circ}º círculo (${u + 1} de ${total} usados).`;
        if (p.sync && window.__ini.gastarEspaco) { const r = await window.__ini.gastarEspaco(p.pid, circ); if (!r.ok) texto += ` Não gravou na ficha: ${r.msg}`; else texto += " Gravado na ficha."; }
        render(); return { ok: true, msg: texto };
      }
      /* texto do que está ativo para o próximo dano (tipo, crítico, responsável); vazio = padrão */
      function danoAtivo(c) {
        const o = opcoesDano[c.id]; if (!o) return "";
        const t = o.tipo && (TIPOS_DANO.find((x) => x[1] === o.tipo) || [o.tipo])[0], r = o.quem === "__nenhum" ? "sem responsável" : o.quem && (combatants.find((x) => x.id === o.quem) || {}).name;
        return [t, o.crit ? "crítico" : "", r ? "por " + r : ""].filter(Boolean).join(" · ");
      }
      function atacarBtn(c, vez) {
        const m = incapaz(c);
        return `<button class="small ${vez ? "primary" : ""}" type="button" data-atacar="${c.id}" ${m ? `disabled title="${escapeText(c.name)} está ${escapeText(m)} e não pode atacar"` : `title="Abre os ataques de ${escapeText(c.name)}${vez ? "" : " (fora do turno: ataque de oportunidade, reação ou ataque preparado)"}"`}>${ico("swords")}Atacar</button>`;
      }
      /* Mais opções (um único nível): o que se usa menos durante o combate */
      function maisTpl(c, vez) {
        const o = opcoesDano[c.id] || {}, outros = combatants.filter((x) => x.id !== c.id);
        return `<div class="mais-opcoes" role="group" aria-label="Mais opções de ${escapeText(c.name)}">
          <label class="pv-tipo"><span>Tipo de dano (opcional)</span><select data-tipo="${c.id}" aria-label="Tipo de dano do próximo dano. Afeta só o Dano" title="Aplica resistências, imunidades e vulnerabilidades; limpo depois de aplicar"><option value="">Sem tipo</option>${TIPOS_DANO.map((t) => `<option value="${t[1]}" ${o.tipo === t[1] ? "selected" : ""}>${t[0]}</option>`).join("")}</select></label>
          <label class="pv-tipo"><span>Dano causado por</span><select data-quem="${c.id}" aria-label="Quem causou o próximo dano (para o relatório do combate)" title="Padrão: quem está na vez. Vale só para o próximo dano"><option value="">${currentId ? "Quem está na vez (padrão)" : "Ninguém (combate não iniciado)"}</option><option value="__nenhum" ${o.quem === "__nenhum" ? "selected" : ""}>Sem responsável (ambiente)</option>${outros.map((x) => `<option value="${x.id}" ${o.quem === x.id ? "selected" : ""}>${escapeText(x.name)}</option>`).join("")}</select></label>
          <label class="inline crit-rotulo" title="Só no Dano: acerto crítico (a 0 PV vale 2 falhas na salvaguarda contra a morte)"><input type="checkbox" data-crit="${c.id}" ${o.crit ? "checked" : ""} style="width:auto;height:auto"> Crítico</label>
          <button class="small" type="button" data-temp="${c.id}" title="Soma a quantidade como PV temporários (não se acumulam, vale o maior)">PV temp.</button>
          ${vez ? "" : atacarBtn(c, false)}
          ${window.__ini && window.__ini.temFuria && window.__ini.temFuria(c) ? `<button class="small" type="button" data-furia="${c.id}" aria-pressed="${c.furia ? "true" : "false"}">${c.furia ? "Encerrar fúria" : "Fúria"}</button>` : ""}
          <button class="small" type="button" data-conc="${c.id}">Concentração</button>
          ${c.pid && window.__ini && window.__ini.papel && window.__ini.papel() === "mestre" ? `<button class="small" type="button" data-sync="${c.id}" aria-pressed="${c.sync ? "true" : "false"}">${c.sync ? "Parar de gravar na ficha" : "Gravar na ficha"}</button>` : ""}
          <button class="small" type="button" data-reroll="${c.id}" ${rolagemAuto() ? "" : "disabled"} title="${rolagemAuto() ? "Rolar a iniciativa de novo (d20 + modificador)" : "Rolagem automática desligada: digite a iniciativa no campo"}">${ico("d20")}Rolar iniciativa de novo</button>
          <button class="small" type="button" data-edit="${c.id}">Editar</button>
          <button class="small danger" type="button" data-remove="${c.id}" aria-label="Remover ${escapeText(c.name)}">Remover</button>
          ${recursosTpl(c)}
        </div>`;
      }
      function maisOpcoes(id, aberto) { if (aberto) abertos.add(id); else abertos.delete(id); render(); }
      function editTpl(c) {
        const f = (k, l, t, v) => `<div><label>${l}</label><input data-f="${k}" type="${t}" value="${escapeText(v)}"></div>`;
        return `<article class="combatant editing">${f("name", "Nome", "text", c.name)}${f("initiative", "Iniciativa", "number", pendente(c) ? "" : Number(c.initiative))}${f("ac", "CA", "number", Number(c.ac))}${f("hp", "PV", "number", Number(c.hp))}${f("maxHp", "PV máx.", "number", Number(c.maxHp))}<div class="row-actions" style="align-self:end"><button class="small primary" type="button" data-save="${c.id}">Salvar</button><button class="small subtle" type="button" data-cancel="1">Cancelar</button></div></article>`;
      }

      /* efeitos (condições, fogo, gelo…) */
      const FX = [
        ["fire", "Queimando", "#e5533d"], ["ice", "Congelado", "#5ec8f2"], ["poison", "Envenenado", "#7bc043"],
        ["paralyzed", "Paralisado", "#e8c33c"], ["stunned", "Atordoado", "#c79bff"], ["frightened", "Amedrontado", "#9b8cff"],
        ["charmed", "Enfeitiçado", "#ff7eb6"], ["blinded", "Cego", "#a0a0b0"], ["deafened", "Surdo", "#a0a0b0"],
        ["prone", "Caído", "#b08a5a"], ["restrained", "Contido", "#b8b8c8"], ["grappled", "Agarrado", "#d49a5a"],
        ["invisible", "Invisível", "#9ad7ff"], ["unconscious", "Inconsciente", "#6c7bd6"], ["bless", "Abençoado", "#f2d36b"],
        ["curse", "Amaldiçoado", "#a64ca6"], ["slow", "Lento", "#7fb0a0"], ["haste", "Acelerado", "#5fd3a0"],
        ["conc", "Concentrando", "#d7ad65"], ["custom", "Personalizado…", "#d7ad65"]
      ];
      const FXI = {
        fire: '<path d="M12 2c1 3.5 5 5.5 5 10.5a5 5 0 0 1-10 0c0-2 1-3.2 2.2-4.2.2 1.8 1 2.7 2 2.7 0-3-.8-5.5.8-9z"/>',
        ice: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9.5 3.8L12 6l2.5-2.2M9.5 20.2L12 18l2.5 2.2"/>',
        poison: '<path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
        paralyzed: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
        stunned: '<path d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/>',
        frightened: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
        charmed: '<path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z"/>',
        blinded: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/><path d="M3 3l18 18"/>',
        deafened: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>',
        prone: '<path d="M12 4v15M6 13l6 7 6-7"/>',
        restrained: '<path d="M9.5 14.5l5-5M8 11l-2 2a3.5 3.5 0 0 0 5 5l2-2M16 13l2-2a3.5 3.5 0 0 0-5-5l-2 2"/>',
        grappled: '<path d="M6 10h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M9 10V6M12 10V5M15 10V6"/>',
        invisible: '<path d="M5 21V11a7 7 0 0 1 14 0v10l-3-2-2 2-2-2-2 2-2-2z"/><path d="M9 11h.01M15 11h.01"/>',
        unconscious: '<path d="M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10z"/>',
        bless: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
        curse: '<path d="M12 3a8 8 0 0 0-5 14v3h10v-3a8 8 0 0 0-5-14z"/><path d="M9 12h.01M15 12h.01M10 20v-3M14 20v-3"/>',
        slow: '<path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/>',
        haste: '<path d="M5 6l6 6-6 6M12 6l6 6-6 6"/>',
        conc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
        custom: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'
      };
      const fxIcon = (t) => `<svg class="fxi" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${FXI[t] || FXI.custom}</svg>`;
      let fxFor = null;
      const fxNote = document.createElement("div");
      fxNote.className = "fx-note";
      $("current-turn").after(fxNote);

      function fxRing(effects) {
        if (!effects || !effects.length) return "";
        if (effects.length === 1) return effects[0].color;
        const n = effects.length;
        return `conic-gradient(${effects.map((e, i) => `${e.color} ${(i * 100 / n).toFixed(1)}% ${((i + 1) * 100 / n).toFixed(1)}%`).join(",")})`;
      }

      const FXD = {
        fire: "Sofre dano de fogo no início ou no fim do turno (o valor depende da fonte do fogo). Apagar as chamas costuma gastar uma ação.",
        ice: "Preso no gelo: deslocamento 0 e desvantagem em ataques e testes de Destreza até o gelo ser quebrado ou derreter (o Mestre pode ajustar).",
        poison: "Desvantagem em jogadas de ataque e em testes de atributo.",
        paralyzed: "Incapacitado, não se move nem fala. Falha automática em salvaguardas de Força e Destreza. Ataques contra ele têm vantagem, e acertos a 1,5 m são críticos.",
        stunned: "Incapacitado, não se move e só fala de forma hesitante. Falha automática em salvaguardas de Força e Destreza. Ataques contra ele têm vantagem.",
        frightened: "Desvantagem em testes de atributo e ataques enquanto a fonte do medo estiver à vista. Não pode se aproximar dela por vontade própria.",
        charmed: "Não pode atacar quem o enfeitiçou nem mirá-lo com efeitos nocivos. Quem o enfeitiçou tem vantagem em testes sociais contra ele.",
        blinded: "Não enxerga: falha em testes que dependem da visão. Ataques contra ele têm vantagem e os ataques dele têm desvantagem.",
        deafened: "Não ouve e falha automaticamente em testes que dependem da audição.",
        prone: "Só se move rastejando. Desvantagem nos próprios ataques. Ataques corpo a corpo contra ele têm vantagem; à distância, desvantagem.",
        restrained: "Deslocamento 0. Ataques contra ele têm vantagem, os dele têm desvantagem, e tem desvantagem em salvaguardas de Destreza.",
        grappled: "Deslocamento 0. O efeito termina se quem agarra ficar incapacitado ou se ele for afastado.",
        invisible: "Ataques contra ele têm desvantagem e os dele têm vantagem. Só pode ser percebido por magia ou sentidos especiais.",
        unconscious: "Incapacitado, caído, solta o que segura e não percebe nada. Falha automática em salvaguardas de Força e Destreza. Ataques contra ele têm vantagem, e acertos a 1,5 m são críticos.",
        bless: "Soma 1d4 às jogadas de ataque e às salvaguardas.",
        curse: "Sofre a penalidade definida pela maldição (a critério do Mestre).",
        slow: "Deslocamento pela metade, −2 na CA e nas salvaguardas de Destreza, e não pode usar reações.",
        haste: "Deslocamento dobrado, +2 na CA, vantagem em salvaguardas de Destreza e uma ação adicional limitada.",
        conc: "Mantém uma magia de concentração. Ao sofrer dano, faz salvaguarda de Constituição (CD 10 ou metade do dano, o que for maior) para não perdê-la.",
        custom: "Efeito personalizado."
      };
      const fxTip = (e) => `${e.name} — ${e.rounds == null ? "sem duração definida" : e.rounds + (e.rounds === 1 ? " rodada restante" : " rodadas restantes")}. ${FXD[e.type] || FXD.custom}`;
      function fxLeft(e) { return e.rounds == null ? "∞" : e.rounds; }
      function fxFormTpl(c) {
        return `<div class="fx-form"><select data-fxsel="${c.id}">${FX.map((f) => `<option value="${f[0]}">${f[1]}</option>`).join("")}</select>
          <input type="text" maxlength="24" placeholder="Nome do efeito" data-fxname="${c.id}" hidden>
          <input type="number" min="1" step="1" placeholder="Rodadas (vazio = sem fim)" data-fxr="${c.id}">
          <button class="small primary" type="button" data-fxadd="${c.id}">Adicionar</button><button class="small subtle" type="button" data-fxcancel="1">Cancelar</button></div>`;
      }

      /* dano a um combatente (botão Dano, painel Atacar): reduz PV, conta dano causado/sofrido e abates; quemId opcional atribui o dano a outro atacante */
      /* chave "Rolagem automática de dados" (guardada no aparelho): ligada = os botões rolam; desligada = o usuário digita todos os valores */
      const CHAVE_ROLAGEM = "ini_rolagem_auto";
      const rolagemAuto = () => { try { return localStorage.getItem(CHAVE_ROLAGEM) !== "0"; } catch (_) { return true; } };
      function aplicarRolagemAuto() {
        const on = rolagemAuto(), caixa = $("rolagem-auto"), est = $("rolagem-auto-estado");
        if (caixa) caixa.checked = on; if (est) est.textContent = on ? "ligada" : "desligada";
        const dica = $("rolagem-auto-dica"); if (dica) dica.textContent = on ? "Ligada: os botões d20 e de ataque rolam os dados." : "Desligada: você digita todos os valores (iniciativa, d20 e dano).";   // mostra só a explicação do estado atual
        if (document.body && document.body.classList && document.body.classList.toggle) document.body.classList.toggle("rolagem-manual", !on);
      }
      if ($("rolagem-auto")) $("rolagem-auto").addEventListener("change", () => {
        try { localStorage.setItem(CHAVE_ROLAGEM, $("rolagem-auto").checked ? "1" : "0"); } catch (_) {}
        aplicarRolagemAuto(); render(true);
        if (window.dispatchEvent && typeof CustomEvent === "function") window.dispatchEvent(new CustomEvent("ini:rolagem"));
      });
      /* PV rápidos: registrar dano/cura sem simular ataque. Cada alteração guarda um estado para "Desfazer" (só o que ela mexeu). */
      const sincronizarMorte = (c) => { if (c && c.sync && c.pid && window.__ini.registrarMorte) window.__ini.registrarMorte(c); };   // só combatentes marcados para gravar
      const desfazer = [], quantidades = {}, abertos = new Set(), opcoesDano = {}; let ultimaVez = currentId;   // abertos: cartões com Mais opções abertas (sobrevive ao redesenho e ao avanço do turno); opcoesDano: tipo, responsável e crítico escolhidos (limpos após aplicar)   // quantidades: o que foi digitado em cada cartão (o redesenho não apaga)
      const copiaEstado = (c) => ({ slots: c.slots ? JSON.parse(JSON.stringify(c.slots)) : null, usos: c.usos ? { ...c.usos } : null, furia: !!c.furia, hp: c.hp, temp: c.temp || 0, morte: c.morte ? { ...c.morte } : null, estavel: !!c.estavel, morto: !!c.morto, conc: c.conc || null });
      function guardarDesfazer(rotulo, ids) {
        const estados = {}; for (const id of ids) { const c = combatants.find((x) => x.id === id); if (c) estados[id] = copiaEstado(c); }
        const entrada = { rotulo, estados, stats: JSON.parse(JSON.stringify(stats)), seq: ++seqDesfazer, deltas: [] }; desfazer.push(entrada); if (desfazer.length > 30) desfazer.shift();
        const b = $("desfazer"); if (b) { b.disabled = false; b.title = "Desfazer: " + rotulo; }
        return entrada;
      }
      /* ---- Desfazer do aviso (acumulado): alterações de PV seguidas no MESMO combatente, enquanto o aviso estiver ativo, viram um grupo.
         O grupo guarda o estado antes da primeira alteração (snap) e depois da última (fim). Desfazer o grupo devolve o PV ao valor inicial e só
         reverte os demais campos (morte, concentração, usos...) que continuam como estavam no fim do grupo; o que o mestre mudou nesse meio tempo é mantido. ---- */
      const GRUPO_PV_MS = 7000;
      const igualJSON = (a, b) => JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
      function registrarPV(alvo, entrada, extra) {
        const agora = Date.now();
        if (!(grupoPV && grupoPV.id === alvo.id && agora < grupoPV.expira)) grupoPV = { id: alvo.id, snap: entrada.estados[alvo.id], entradas: [] };
        grupoPV.entradas.push(entrada); grupoPV.fim = copiaEstado(alvo); grupoPV.expira = agora + GRUPO_PV_MS;
        mostrarGrupo(alvo, extra);
      }
      const resumoGrupo = (alvo) => { const l = Number(grupoPV.snap.hp) - Number(alvo.hp); return `${alvo.name}: ${l > 0 ? "−" + l : l < 0 ? "+" + (-l) : "±0"} PV (${grupoPV.snap.hp} → ${alvo.hp}).`; };
      function mostrarGrupo(alvo, extra) { if (window.FEEDBACK) window.FEEDBACK.mostrar(`${resumoGrupo(alvo)} ${extra || ""}`.trim(), { acao: { rotulo: "Desfazer", fn: () => desfazerGrupoPV() } }); }
      function desfazerGrupoPV() {
        const g = grupoPV; grupoPV = null; if (!g) return false;
        const c = combatants.find((x) => x.id === g.id); if (!c) return false;
        if (Number(c.hp) !== Number(g.fim.hp)) { aviso(`O PV de ${c.name} mudou depois do aviso; use o botão Desfazer geral.`); return false; }
        const primeira = Math.min(...g.entradas.map((e) => e.seq)), deltas = g.entradas.flatMap((e) => e.deltas || []);
        for (const e of g.entradas) { const i = desfazer.indexOf(e); if (i >= 0) desfazer.splice(i, 1); }          // o histórico geral não guarda mais esses passos
        for (const d of deltas) { const st = stats[d.id]; if (st) st[d.campo] = Math.max(0, (st[d.campo] || 0) - d.valor); }     // estatísticas do relatório voltam junto
        for (const e of desfazer) if (e.seq > primeira) for (const d of deltas) { const st = e.stats && e.stats[d.id]; if (st) st[d.campo] = Math.max(0, (st[d.campo] || 0) - d.valor); }
        const antesUsos = c.usos || {}, atual = copiaEstado(c);
        c.hp = g.snap.hp;
        for (const k of ["temp", "morte", "estavel", "morto", "conc", "usos", "slots", "furia"]) if (igualJSON(atual[k], g.fim[k])) c[k] = g.snap[k] === null || g.snap[k] === undefined ? (k === "temp" ? 0 : null) : JSON.parse(JSON.stringify(g.snap[k]));   // só o que o grupo mexeu e ninguém mais
        if (Number(c.hp) > 0) { c.morte = null; c.estavel = false; }                                                      // com PV acima de 0 não há salvaguarda contra a morte em andamento
        if (c.sync && window.__ini.registrarUso) for (const k of new Set([...Object.keys(antesUsos), ...Object.keys(c.usos || {})])) { const novo = (c.usos || {})[k] || 0; if ((antesUsos[k] || 0) !== novo) window.__ini.registrarUso(c, k, novo); }
        sincronizarMorte(c);
        { const b = $("desfazer"); if (b) { b.disabled = !desfazer.length; b.title = desfazer.length ? "Desfazer: " + desfazer[desfazer.length - 1].rotulo : "Nada para desfazer"; } }
        render(); if (window.FEEDBACK) window.FEEDBACK.mostrar(`${c.name}: voltou a ${c.hp} PV.`); return true;
      }
      function desfazerUltimo() {
        const u = desfazer.pop(); if (!u) return false;
        for (const [id, e] of Object.entries(u.estados)) {
          const c = combatants.find((x) => x.id === id); if (!c) continue; const antes = c.usos || {};
          Object.assign(c, e, { morte: e.morte, conc: e.conc, usos: e.usos, slots: e.slots });
          if (c.sync && window.__ini.registrarUso) for (const k of new Set([...Object.keys(antes), ...Object.keys(e.usos || {})])) { const novo = (e.usos || {})[k] || 0; if ((antes[k] || 0) !== novo) window.__ini.registrarUso(c, k, novo); }   // desfazer também devolve o uso na ficha
          sincronizarMorte(c);
        }
        stats = u.stats; const b = $("desfazer"); if (b) { b.disabled = !desfazer.length; b.title = desfazer.length ? "Desfazer: " + desfazer[desfazer.length - 1].rotulo : "Nada para desfazer"; }
        grupoPV = null; render(); if (window.FEEDBACK) window.FEEDBACK.mostrar("Desfeito: " + u.rotulo); return true;
      }
      const aviso = (t) => { grupoPV = null; if (window.FEEDBACK) window.FEEDBACK.mostrar(t); };   // outro aviso substitui o do PV: o grupo acaba

      /* tipo de dano é opcional no cartão (registro rápido continua sem escolher nada); quando informado, aplica resistência, imunidade e vulnerabilidade, inclusive a da Fúria */
      const TIPOS_DANO = [["cortante", "slashing"], ["perfurante", "piercing"], ["contundente", "bludgeoning"], ["fogo", "fire"], ["frio", "cold"], ["ácido", "acid"], ["elétrico", "lightning"], ["trovejante", "thunder"], ["necrótico", "necrotic"], ["psíquico", "psychic"], ["radiante", "radiant"], ["venenoso", "poison"], ["energia", "force"]];
      function defesasDoCombatente(c) {
        const h = window.__ini || {}; const base = c && c.pid && h.defesasPersonagem ? h.defesasPersonagem(c.pid) : c && c.key && h.defesasDe ? h.defesasDe(c.key) : null;
        if (!(c && c.furia)) return base;                                  // em fúria (2014): resistência a contundente, perfurante e cortante
        const x = base || { resistencias: [], imunidades: [], vulnerabilidades: [], naoMagico: false };
        return { ...x, resistencias: [...new Set([...(x.resistencias || []), "bludgeoning", "piercing", "slashing"])] };
      }
      function ajustarPorDefesas(alvo, n, tipo) {
        const d = defesasDoCombatente(alvo) || {}; let v = n, motivo = "";
        if ((d.imunidades || []).includes(tipo)) { v = 0; motivo = "imunidade"; }
        else { if ((d.resistencias || []).includes(tipo)) { v = Math.floor(v / 2); motivo = "resistência"; } if ((d.vulnerabilidades || []).includes(tipo)) { v *= 2; motivo = motivo ? "resistência e vulnerabilidade" : "vulnerabilidade"; } }
        return { valor: v, motivo };
      }
      /* Habilidades que mudam a queda a 0 PV (Resistência Implacável, Fúria Implacável, Fortitude dos Mortos-Vivos...) vêm da ficha ou do monstro pelo gancho __ini.habilidadesQueda,
         sem exceções fixas. Automática: aplica sozinha (Desfazer reverte). Com salvaguarda: pergunta o resultado do dado. O uso fica no combatente e, se ele grava na ficha, na ficha. */
      function tentarQueda(alvo, dano, opcoes) {
        const lista = (window.__ini.habilidadesQueda && window.__ini.habilidadesQueda(alvo)) || [];
        alvo.usos = alvo.usos || {}; let falhas = "";
        const registrar = (id, valor) => { alvo.usos[id] = valor; if (alvo.sync && window.__ini.registrarUso) window.__ini.registrarUso(alvo, id, valor); };   // um único registro por ativação
        for (const h of lista) {
          if (h.requer === "furia" && !alvo.furia) continue;                          // só vale com a condição da regra (em fúria)
          if (h.excecoes && (opcoes.critico || opcoes.tipo === "radiant")) continue;     // Fortitude dos Mortos-Vivos: não vale com dano radiante nem acerto crítico (2014)
          const usado = Math.max(Number(h.usado) || 0, Number(alvo.usos[h.id]) || 0);
          if (h.tipo === "auto") {
            if (usado >= (h.limite || 1)) continue;
            registrar(h.id, usado + 1); alvo.hp = 1;
            return falhas + `${h.nome}: ${alvo.name} fica com 1 PV em vez de cair a 0 (uso registrado; volta no descanso longo). `;
          }
          const cd = h.cdPorDano ? h.cdBase + dano : h.cdBase + (h.incremento || 0) * usado;
          const ok = window.confirm(`${h.nome}: ${alvo.name} cairia a 0 PV.\nSalvaguarda de Constituição CD ${cd}${h.excecoes ? " (não vale se o dano for radiante ou de acerto crítico)" : ""}.\nPassou na salvaguarda? OK = sim (fica com 1 PV), Cancelar = não.`);
          if (h.limite == null || usado < h.limite) registrar(h.id, usado + 1);
          if (ok) { alvo.hp = 1; return falhas + `${h.nome}: ${alvo.name} passou na salvaguarda (CD ${cd}) e fica com 1 PV. `; }
          falhas += `${h.nome}: ${alvo.name} falhou na salvaguarda (CD ${cd}). `;     // a falha não impede outra habilidade que ainda esteja disponível
        }
        return falhas;
      }
      /* dano a um combatente: absorvido primeiro pelos PV temporários; a 0 PV encerra a concentração; personagem a 0 PV que sofre dano soma uma falha na salvaguarda contra a morte (2014) */
      function aplicarDano(id, amount, quemId, opcoes = {}) {
        const alvo = combatants.find((c) => c.id === id); let n = Math.max(0, Math.floor(Number(amount) || 0));
        if (!alvo || !n) return false;
        if (alvo.morto) { aviso(`${alvo.name} já está morto. Use Reviver se for preciso corrigir.`); return false; }
        let ajuste = ""; if (opcoes.tipo && !opcoes.jaAjustado) { const a = ajustarPorDefesas(alvo, n, opcoes.tipo); if (a.motivo) { ajuste = `${a.motivo} a ${(TIPOS_DANO.find((t) => t[1] === opcoes.tipo) || [opcoes.tipo])[0]}: ${n} → ${a.valor}. `; n = a.valor; } }
        if (!n) {                                                          // imunidade: nada muda; se há um grupo ativo no mesmo combatente, ele continua com o Desfazer
          if (grupoPV && grupoPV.id === alvo.id && Date.now() < grupoPV.expira) { grupoPV.expira = Date.now() + GRUPO_PV_MS; mostrarGrupo(alvo, `${ajuste || ""}sem dano.`); } else aviso(`${alvo.name}: ${ajuste || "nenhum dano"}sem dano.`);
          return false;
        }
        const antes = Number(alvo.hp), c = quemId && combatants.find((x) => x.id === quemId), semResp = quemId === "__nenhum", quem = c ? { id: c.id, name: c.name } : attacker();
        const entrada = guardarDesfazer(`${alvo.name} −${n} PV`, [alvo.id]);
        const absorvido = Math.min(Number(alvo.temp) || 0, n), resto = n - absorvido; alvo.temp = (Number(alvo.temp) || 0) - absorvido;
        alvo.hp = Math.max(0, antes - resto);
        if (!semResp) { const a = statOf(quem.id, quem.name); a.dealt += n; entrada.deltas.push({ id: quem.id, campo: "dealt", valor: n }); if (antes > 0 && alvo.hp === 0) { a.kills++; entrada.deltas.push({ id: quem.id, campo: "kills", valor: 1 }); } }   // "sem responsável" (dano ambiental) não entra nas estatísticas de quem causou
        statOf(alvo.id, alvo.name).taken += n; entrada.deltas.push({ id: alvo.id, campo: "taken", valor: n });
        let msg = (ajuste || "") + (absorvido ? `${absorvido} absorvido pelos PV temporários. ` : "");
        if (antes > 0 && alvo.hp === 0) { const sobraQueda = resto - antes; if (!(alvo.kind === "Personagem" && sobraQueda >= Number(alvo.maxHp))) msg += tentarQueda(alvo, resto, opcoes); }   // habilidades que deixam 1 PV (se sobreviver, hp > 0 e o ramo de 0 PV abaixo não roda)
        if (antes > 0 && alvo.hp === 0) {
          if (alvo.conc) { msg += `${alvo.name} perdeu a concentração em ${alvo.conc}. `; alvo.conc = null; }
          if (alvo.kind === "Personagem") {
            alvo.morte = { s: 0, f: 0 }; alvo.estavel = false;
            const sobra = resto - antes;                                       // dano que passou de 0 PV
            if (sobra >= Number(alvo.maxHp)) { alvo.morto = true; msg += `Dano massivo (${sobra} além de 0 PV, PV máximo ${alvo.maxHp}): ${alvo.name} morreu na hora. `; }
            else msg += `${alvo.name} caiu a 0 PV, inconsciente. `;
          } else msg += `${alvo.name} caiu a 0 PV (inconsciente/derrotado; marque Morto se for o caso). `;
        }
        else if (antes === 0 && resto > 0 && alvo.kind === "Personagem") {      // dano a 0 PV: 1 falha (2 se crítico); dano igual ou maior que o PV máximo mata na hora
          alvo.morte = alvo.morte || { s: 0, f: 0 }; alvo.estavel = false;
          if (resto >= Number(alvo.maxHp)) { alvo.morto = true; msg += `Dano a 0 PV igual ou maior que o PV máximo: ${alvo.name} morreu na hora. `; }
          else { const falhas = opcoes.critico ? 2 : 1; alvo.morte.f = Math.min(3, alvo.morte.f + falhas); msg += `Dano a 0 PV${opcoes.critico ? " (crítico)" : ""}: ${falhas} falha(s) na salvaguarda contra a morte (${alvo.morte.f}/3). `; if (alvo.morte.f >= 3) { alvo.morto = true; msg += `${alvo.name} morreu. `; } }
        }
        else if (alvo.conc && resto > 0 && alvo.hp > 0) msg += `Concentração de ${alvo.name} (${alvo.conc}): salvaguarda de Constituição, CD ${Math.max(10, Math.floor(resto / 2))}. `;
        if (antes <= 0 || alvo.hp <= 0) sincronizarMorte(alvo);
        render(); registrarPV(alvo, entrada, msg);
        return true;
      }
      function curar(id, amount) {
        const alvo = combatants.find((c) => c.id === id), n = Math.max(0, Math.floor(Number(amount) || 0)); if (!alvo || !n) return false;
        if (alvo.morto) { aviso(`${alvo.name} está morto: cura comum não revive. Use Reviver.`); return false; }
        const entrada = guardarDesfazer(`${alvo.name} +${n} PV`, [alvo.id]);
        const antes = Number(alvo.hp); alvo.hp = Math.min(Number(alvo.maxHp), antes + n);
        const quem = attacker(); if (alvo.hp > antes) { statOf(quem.id, quem.name).healed += alvo.hp - antes; entrada.deltas.push({ id: quem.id, campo: "healed", valor: alvo.hp - antes }); }
        if (antes === 0 && alvo.hp > 0) { alvo.morte = null; alvo.estavel = false; sincronizarMorte(alvo); }
        render(); registrarPV(alvo, entrada, ""); return true;
      }
      /* salvaguarda contra a morte registrada à mão (dado físico): sucesso, falha, natural 1 (2 falhas) ou natural 20 (volta a 1 PV) */
      /* quantidade de PV (inteiro positivo, padrão 1); o botão clicado decide se é dano, cura ou PV temporário */
      const lerQuantidade = (txt) => { const m = String(txt == null ? "" : txt).trim().match(/^(\d{1,5})$/); return m ? Number(m[1]) : 0; };
      function aplicarPV(id, acao) {
        const person = combatants.find((c) => c.id === id); if (!person) return false;
        const amountInput = document.querySelector(`[data-amount="${id}"]`), n = lerQuantidade(amountInput ? amountInput.value : quantidades[id] ?? 1);
        if (!(n >= 1)) { aviso("Digite uma quantidade de PV maior que zero."); if (amountInput && amountInput.focus) amountInput.focus(); return false; }
        delete quantidades[id];                                          // a quantidade volta a 1 depois de cada aplicação (evita repetir por engano)
        const o = opcoesDano[id] || {}; delete opcoesDano[id];           // tipo, responsável e crítico valem só para este dano
        if (acao === "dano") return aplicarDano(id, n, o.quem || undefined, { critico: !!o.crit, tipo: o.tipo || undefined });
        if (acao === "cura") return curar(id, n); return darTemp(id, n);
      }
      function salvaMorte(id, tipo) {
        const p = combatants.find((c) => c.id === id); if (!p || p.morto || Number(p.hp) > 0) return false;
        if (p.estavel) { aviso(`${p.name} está estável e não faz salvaguarda contra a morte (só volta a fazer se sofrer dano).`); return false; }
        guardarDesfazer(`${p.name} contra a morte`, [p.id]);
        p.morte = p.morte || { s: 0, f: 0 }; p.estavel = false;
        if (tipo === "n20") { p.hp = 1; p.morte = null; aviso(`${p.name}: 20 natural, volta a 1 PV.`); sincronizarMorte(p); render(); return true; }
        if (tipo === "s") p.morte.s = Math.min(3, p.morte.s + 1); else p.morte.f = Math.min(3, p.morte.f + (tipo === "f2" ? 2 : 1));
        if (p.morte.s >= 3) { p.estavel = true; aviso(`${p.name} estabilizou.`); }
        if (p.morte.f >= 3) { p.morto = true; aviso(`${p.name} morreu.`); }
        sincronizarMorte(p); render(); return true;
      }
      /* d20 da salvaguarda contra a morte (2014): 20 = volta a 1 PV; 10 a 19 = sucesso; 2 a 9 = falha; 1 = duas falhas */
      function salvaMorteD20(id, d20) {
        const v = Math.floor(Number(d20)); if (!(v >= 1 && v <= 20)) return false;
        return salvaMorte(id, v === 20 ? "n20" : v === 1 ? "f2" : v >= 10 ? "s" : "f");
      }
      function estabilizar(id) {
        const p = combatants.find((c) => c.id === id); if (!p || p.morto || Number(p.hp) > 0) return false;
        guardarDesfazer(`${p.name} estabilizado`, [p.id]); p.estavel = true; p.morte = { s: 0, f: 0 }; sincronizarMorte(p); render(); aviso(`${p.name} está estável (inconsciente, a 0 PV; recupera 1 PV em 1d4 horas se ninguém curar).`); return true;
      }
      /* morto x inconsciente (monstros e NPCs a 0 PV ficam "inconscientes/derrotados" até serem marcados mortos); reviver volta a 1 PV */
      function marcarMorto(id, morto) {
        const p = combatants.find((c) => c.id === id); if (!p) return false;
        guardarDesfazer(`${p.name} ${morto ? "morto" : "revivido"}`, [p.id]);
        if (morto) { p.morto = true; p.conc = null; } else { p.morto = false; p.estavel = false; p.morte = null; if (Number(p.hp) <= 0) p.hp = 1; }
        sincronizarMorte(p); render(); return true;
      }
      function darTemp(id, amount) {
        const alvo = combatants.find((c) => c.id === id), n = Math.max(0, Math.floor(Number(amount) || 0)); if (!alvo || !n) return false;
        guardarDesfazer(`${alvo.name} PV temp.`, [alvo.id]);
        const antes = Number(alvo.temp) || 0; alvo.temp = Math.max(antes, n);                    // 2014: PV temporários não se acumulam; vale o maior
        render(); aviso(alvo.temp > antes ? `${alvo.name}: ${alvo.temp} PV temporários.` : `${alvo.name} já tem ${antes} PV temporários (não se acumulam; vale o maior).`);
        return true;
      }
      function statOf(id, name) {
        return (stats[id] = stats[id] || { name, dealt: 0, taken: 0, healed: 0, kills: 0 });
      }

      function attacker() {
        const id = currentId;
        const c = combatants.find((x) => x.id === id);
        return c ? { id: c.id, name: c.name } : { id: "_none", name: "Sem atribuição" };
      }

      function renderReport() {
        const box = $("report");
        if (!report) { box.hidden = true; box.innerHTML = ""; return; }
        const rows = report.rows;
        const top = rows[0];
        box.hidden = false;
        box.innerHTML = `
          <div class="report-head">
            <div>
              <h3>Relatório do combate</h3>
              <div class="muted">${report.rounds} ${report.rounds === 1 ? "rodada" : "rodadas"}${top && top.dealt > 0 ? ` · Maior dano causado: <strong style="color:var(--gold)">${escapeText(top.name)}</strong> (${top.dealt})` : ""}</div>
            </div>
            <button class="small subtle" type="button" id="report-close">Fechar</button>
          </div>
          <div class="tbl"><table>
            <tr><th>Combatente</th><th>Dano causado</th><th>Dano sofrido</th><th>Cura feita</th><th>Abates</th></tr>
            ${rows.map((r, i) => `<tr class="${i === 0 && r.dealt > 0 ? "top" : ""}"><td>${escapeText(r.name)}</td><td>${r.dealt}</td><td>${r.taken}</td><td>${r.healed}</td><td>${r.kills}</td></tr>`).join("")}
          </table></div>
          <p class="muted" style="font-size:11px;margin:8px 0 0">O dano é atribuído a quem estava na vez, ou ao responsável escolhido em “Mais opções” do combatente que recebeu o dano.</p>`;
      }

      function buildReport() {
        const rows = Object.values(stats).filter((r) => r.dealt || r.taken || r.healed || r.kills)
          .sort((a, b) => b.dealt - a.dealt || b.kills - a.kills || a.name.localeCompare(b.name));
        return rows.length ? { rounds: round, rows } : null;
      }

      function render(force=false) {
        if(!force&&document.activeElement?.matches?.('#combatants [data-iniciativa]')){save();return;}
        const list = $("combatants");
        { const av = $("aviso-gravacao"), ficha = combatants.filter((c) => c.pid), grava = ficha.filter((c) => c.sync);     // um aviso único, fora dos cartões
          if (av) { av.hidden = !ficha.length; av.textContent = !ficha.length ? "" : grava.length ? `Gravando nas fichas: ${grava.map((c) => c.name).join(", ")}.${grava.length < ficha.length ? " Os demais personagens estão em teste." : ""}` : "Combate de teste: PV, espaços e recursos dos personagens não são gravados nas fichas."; } }
        const ordered = sorted();
        const posVez = currentId ? ordered.findIndex((c) => c.id === currentId) : -1;
        const exibicao = posVez > 0 ? [...ordered.slice(posVez), ...ordered.slice(0, posVez)] : ordered;   // lista rotacionada: vez primeiro, quem acabou de jogar por último
        $("round").textContent = round;
        document.querySelector(".round-box").hidden = !currentId;
        renderReport();

        const active = combatants.find((c) => c.id === currentId);
        $("current-turn").innerHTML = active
          ? `Vez de: <strong>${escapeText(active.name)}</strong>`
          : "Nenhum turno ativo. Comece o combate quando estiver pronto.";

        atualizarInicio(ordered);
        $("previous").disabled = ordered.length < 2 || !currentId;
        $("next").disabled = ordered.length < 2 || !currentId;
        $("reset").disabled = !currentId;
        $("limpar-ini").disabled = !combatants.length;

        if (!ordered.length) {
          list.innerHTML = `<div class="empty"><strong>O campo de batalha está vazio.</strong>Cadastre os personagens e inimigos para montar a ordem de iniciativa.</div>`;
          save();notificar();
          return;
        }

        list.innerHTML = exibicao.map((c, posicao) => {
          if (c.id === editId) return editTpl(c);
          const isActive = c.id === currentId;
          const isDefeated = Number(c.hp) <= 0 || !!c.morto;
          const pct = Math.max(0, Math.min(100, (Number(c.hp) / Number(c.maxHp)) * 100));
          const hpClass = pct <= 25 ? "low" : pct <= 50 ? "mid" : "";
          return `
            <article class="combatant ${isActive ? "active" : ""} ${currentId && posicao === 1 ? "proximo" : ""} ${isDefeated ? "defeated" : ""} ${c.morto ? "estado-morto" : c.estavel ? "estado-estavel" : Number(c.hp) <= 0 ? "estado-inconsciente" : ""}" aria-current="${isActive?'step':'false'}" data-key="${escapeText(c.key || "")}" data-pid="${escapeText(c.pid || "")}">
              <input class="initiative iniciativa-valor" type="number" step="1" data-iniciativa="${c.id}" value="${pendente(c) ? "" : Number(c.initiative)}" placeholder=" " aria-label="Iniciativa de ${escapeText(c.name)}" title="Iniciativa pendente: informe o resultado da rolagem, já com o modificador">
              <div class="id-bloco">
                <span class="avfx">${window.__ini && window.__ini.avatar ? window.__ini.avatar(c.key, c.name, 40, c.foto) : ""}</span>
                <div class="id-texto">
                <div class="name"><span class="nome-texto">${escapeText(c.name)}</span>${isActive ? ` <span aria-label="turno atual" class="turn-mark">${ico("turn")}</span>` : ""}</div>
                <div class="kind">${isActive?'<span class="turno-badge">Turno atual</span> · ':currentId && posicao === 1 ? '<span class="proximo-badge">Próximo</span> · ':''}${escapeText(c.kind)}${isDefeated ? (c.morto ? " · Morto" : c.kind === "Personagem" ? (c.estavel ? " · Estável (0 PV)" : " · Inconsciente (0 PV)") : " · Inconsciente/derrotado") : ""}${pendente(c) ? " · iniciativa pendente" : ""}</div>
                ${c.effects && c.effects.length ? `<div class="fxbar">${c.effects.map((e) => `<span class="fxchip" style="--c:${e.color}" data-fxtip="${escapeText(fxTip(e))}">${fxIcon(e.type)}${escapeText(e.name)} <b>${fxLeft(e)}</b><button type="button" data-fxdel="${c.id}|${e.id}" aria-label="Remover ${escapeText(e.name)}">${ico("x")}</button></span>`).join("")}</div>` : ""}
              </div>
              </div>
              <div class="stats-linha">
                <div class="stat">CA<strong>${Number(c.ac)}</strong></div>
                <div class="stat">PV<strong>${Number(c.hp)}</strong></div>
                <div class="stat">Máx. PV<strong>${Number(c.maxHp)}</strong></div>
              </div>
              <div class="hp-block">
                <div class="hp-barra">
                  <div class="hp-top"><span>Pontos de vida</span><strong>${Number(c.hp)} / ${Number(c.maxHp)}${Number(c.temp) > 0 ? ` <span class="pv-temp">+${Number(c.temp)} temp.</span>` : ""}</strong></div>
                  <div class="hp-track"><div class="hp-fill ${hpClass}" style="width:${pct}%"></div></div>
                </div>
                <div class="hp-controls pv-ctl">
                  <button class="small danger" type="button" data-damage="${c.id}" title="Tira a quantidade dos PV${danoAtivo(c) ? " (" + danoAtivo(c) + ")" : ""}">${ico("minus")}Dano</button>
                  <input type="number" min="1" max="99999" step="1" inputmode="numeric" value="${escapeText(quantidades[c.id] ?? 1)}" aria-label="Quantidade de PV de ${escapeText(c.name)}" title="Quantidade (volta a 1 depois de aplicar)" data-amount="${c.id}">
                  <button class="small" type="button" data-heal="${c.id}" title="Devolve a quantidade aos PV">${ico("plus")}Cura</button>
                </div>
              </div>
              <div class="row-actions">
                <button class="small subtle" type="button" data-fxopen="${c.id}">${ico("sparkles")}Efeitos</button>
                <button class="small subtle" type="button" data-ficha="${c.id}" ${c.key || c.pid ? `title="Abre a ficha de ${escapeText(c.name)} no painel lateral"` : `disabled title="Sem ficha vinculada"`}>Ficha</button>
                ${isActive ? atacarBtn(c, true) : ""}
                <button class="small subtle" type="button" data-mais="${c.id}" aria-expanded="${abertos.has(c.id) ? "true" : "false"}">Mais opções</button>
              </div>
              ${danoAtivo(c) ? `<div class="conc-linha"><span class="conc-chip dano-chip" title="Vale só para o próximo dano e depois é limpo">Próximo dano: ${escapeText(danoAtivo(c))}</span><button class="small subtle" type="button" data-dano-limpar="${c.id}">Limpar</button></div>` : ""}
              ${c.furia ? `<div class="conc-linha"><span class="conc-chip">Em fúria: resistência a contundente, perfurante e cortante</span></div>` : ""}
              ${c.conc ? `<div class="conc-linha"><span class="conc-chip">Concentrando: ${escapeText(c.conc)}</span><button class="small subtle" type="button" data-conc-fim="${c.id}">Encerrar</button></div>` : ""}
              ${(Number(c.hp) <= 0 || c.morto) ? (c.kind === "Personagem" ? moreTpl(c) : derrotadoTpl(c)) : ""}
              ${abertos.has(c.id) ? maisTpl(c, isActive) : ""}
              ${fxFor === c.id ? fxFormTpl(c) : ""}
            </article>`;
        }).join("");

        save();notificar();
        seguirTurno();
      }

      $("add-form").addEventListener("submit", (event) => {
        event.preventDefault();
        const name = $("name").value.trim();
        const maxHp = Number($("maxHp").value);
        const hp = Number($("hp").value);
        if (!name || !Number.isFinite(maxHp) || maxHp < 1 || !Number.isFinite(hp) || hp < 0) return;

        combatants.push({
          id: (Date.now().toString(36) + Math.random().toString(36).slice(2, 7)),
          name,
          kind: $("kind").value,
          initiative: $("initiative").value.trim() === "" ? null : Number($("initiative").value),   // resultado final (d20 + modificador); em branco fica pendente
          hp: Math.min(hp, maxHp),
          maxHp,
          ac: Math.max(0, Number($("ac").value) || 0),
          order: nextOrder++,
          key: (window.__ini && window.__ini.pending) || ""
        });
        if (window.__ini) window.__ini.pending = "";
        $("ini-mod").value = 0; $("initiative").value = "";

        $("name").value = "";
        $("name").focus();
        render();
      });

      $("combatants").addEventListener("click", async (event) => {
        const button = event.target.closest("button");
        if (!button) return;

        if (button.dataset.fxopen) { fxFor = fxFor === button.dataset.fxopen ? null : button.dataset.fxopen; render(); return; }
        if (button.dataset.fxcancel) { fxFor = null; render(); return; }
        if (button.dataset.fxadd) {
          const id = button.dataset.fxadd, p = combatants.find((c) => c.id === id);
          const q = (a) => document.querySelector(`#combatants [data-${a}="${id}"]`);
          const f = FX.find((x) => x[0] === q("fxsel").value) || FX[0];
          const nome = f[0] === "custom" ? (q("fxname").value.trim() || "Efeito") : f[1];
          const r = Math.floor(Number(q("fxr").value));
          if (p) { (p.effects = p.effects || []).push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), type: f[0], name: nome, color: f[2], rounds: r > 0 ? r : null }); }
          fxFor = null; render(); return;
        }
        if (button.dataset.fxdel) {
          const [cid, eid] = button.dataset.fxdel.split("|"), p = combatants.find((c) => c.id === cid);
          if (p) p.effects = (p.effects || []).filter((e) => e.id !== eid);
          render(); return;
        }
        if (button.dataset.edit) { editId = button.dataset.edit; render(); return; }
        if (button.dataset.cancel) { editId = null; render(); return; }
        if (button.dataset.save) {
          const p = combatants.find((c) => c.id === button.dataset.save);
          const g = (k) => document.querySelector(`#combatants [data-f="${k}"]`).value;
          const maxHp = Number(g("maxHp")), hp = Number(g("hp"));
          if (p && g("name").trim() && Number.isFinite(maxHp) && maxHp >= 1 && Number.isFinite(hp) && hp >= 0) {
            p.name = g("name").trim(); p.initiative = g("initiative").trim()==="" ? null : Number(g("initiative")); p.ac = Math.max(0, Number(g("ac")) || 0);
            p.maxHp = maxHp; p.hp = Math.min(hp, maxHp); editId = null; render();
          }
          return;
        }

        if (button.dataset.reroll) {                          // re-rolar: d20 + modificador do combatente; a ordem é recalculada e o turno atual não muda
          const alvo = combatants.find((c) => c.id === button.dataset.reroll); if (!alvo || !rolagemAuto()) return;
          const mod = Math.round(Number(window.__ini.bonusIniciativaDe && window.__ini.bonusIniciativaDe(alvo)) || 0), r = window.ROLAGENS.rolar("1d20", mod);
          alvo.initiative = r.total; render();
          window.FEEDBACK && window.FEEDBACK.mostrar(`${alvo.name}: d20 ${r.dados[0]} ${mod >= 0 ? "+" : "-"} ${Math.abs(mod)} = ${r.total}`);
          return;
        }

        if (button.dataset.atacar) { const q = combatants.find((c) => c.id === button.dataset.atacar), m = incapaz(q); if (m) { aviso(`${q.name} está ${m} e não pode atacar.`); return; }
           window.dispatchEvent?.(new CustomEvent("ini:atacar", { detail: { id: button.dataset.atacar } })); return; }

        if (button.dataset.mais) { maisOpcoes(button.dataset.mais, !abertos.has(button.dataset.mais)); return; }
        if (button.dataset.ficha) { abrirFichaDe(button.dataset.ficha); return; }
        if (button.dataset.danoLimpar) { delete opcoesDano[button.dataset.danoLimpar]; render(); return; }
        if (button.dataset.damage || button.dataset.heal || button.dataset.temp) { aplicarPV(button.dataset.damage || button.dataset.heal || button.dataset.temp, button.dataset.damage ? "dano" : button.dataset.heal ? "cura" : "temp"); return; }

        if (button.dataset.sync) {                       // escolha explícita de gravar (ou parar de gravar) PV na ficha real
          const p = combatants.find((c) => c.id === button.dataset.sync); if (!p) return;
          if (!p.sync && !(await perguntar(`Passar a gravar os PV e PV temporários de ${p.name} na ficha real?`, { titulo: "Gravar na ficha", ok: "Gravar" }))) return;
          p.sync = !p.sync; render(); aviso(p.sync ? `${p.name}: PV gravados na ficha.` : `${p.name}: modo teste, a ficha não muda.`); return;
        }
        if (button.dataset.morte) { const [id, tipo] = button.dataset.morte.split("|"); salvaMorte(id, tipo); return; }
        if (button.dataset.morteReg) { const inp = document.querySelector(`[data-morte-d20="${button.dataset.morteReg}"]`), v = Math.floor(Number(inp && inp.value)); if (!(v >= 1 && v <= 20)) { aviso("Digite o resultado do d20 (1 a 20)."); if (inp && inp.focus) inp.focus(); return; } salvaMorteD20(button.dataset.morteReg, v); return; }
        if (button.dataset.morteRolar) { if (!rolagemAuto()) return; const r = window.ROLAGENS.rolar("1d20", 0); const p = combatants.find((c) => c.id === button.dataset.morteRolar); aviso(`${p ? p.name : ""}: d20 ${r.total} contra a morte.`); salvaMorteD20(button.dataset.morteRolar, r.total); return; }
        if (button.dataset.rec) { const [id, rid] = button.dataset.rec.split("|"); usarRecurso(id, rid); return; }
        if (button.dataset.esp) { const [id, circ] = button.dataset.esp.split("|"); usarEspaco(id, Number(circ)).then((r) => { if (!r.ok) aviso(r.msg); }); return; }
        if (button.dataset.estab) { estabilizar(button.dataset.estab); return; }
        if (button.dataset.morto) { const [id, v] = button.dataset.morto.split("|"); marcarMorto(id, v === "1"); return; }
        if (button.dataset.conc) {
          const p = combatants.find((c) => c.id === button.dataset.conc); if (!p) return;
          const nome = window.prompt(`Concentração de ${p.name}: qual magia ou efeito?`, p.conc || ""); if (nome === null) return;
          guardarDesfazer(`${p.name} concentração`, [p.id]); p.conc = nome.trim().slice(0, 40) || null; render(); return;
        }
        if (button.dataset.furia) {
          const p = combatants.find((c) => c.id === button.dataset.furia); if (!p) return;
          if (!p.furia) {                                                  // entrar em fúria gasta um uso (contado no combate e, se grava, na ficha)
            const info = window.__ini.usosRecurso && window.__ini.usosRecurso(p, "furia"), usado = Math.max(info ? info.usados : 0, (p.usos && p.usos.furia) || 0);
            if (info && info.max != null && usado >= info.max && !(await perguntar(`${p.name} já usou todas as ${info.max} fúrias desde o último descanso. Entrar em fúria mesmo assim?`, { titulo: "Fúrias esgotadas", ok: "Entrar em fúria" }))) return;
            guardarDesfazer(`${p.name} fúria`, [p.id]); p.usos = p.usos || {}; p.usos.furia = usado + 1; p.furia = true;
            if (p.sync && window.__ini.registrarUso) window.__ini.registrarUso(p, "furia", usado + 1);
            aviso(`${p.name} entrou em fúria (uso ${usado + 1}${info && info.max != null ? " de " + info.max : ""}).`);
          } else { guardarDesfazer(`${p.name} fúria`, [p.id]); p.furia = false; aviso(`${p.name} saiu da fúria.`); }
          render(); return;
        }
        if (button.dataset.concFim) { const p = combatants.find((c) => c.id === button.dataset.concFim); if (!p) return; guardarDesfazer(`${p.name} concentração`, [p.id]); p.conc = null; render(); return; }

        if (button.dataset.remove) {
          const id = button.dataset.remove;
          const ordered = sorted();
          const oldIndex = ordered.findIndex((c) => c.id === id);
          const wasCurrent = currentId === id;
          combatants = combatants.filter((c) => c.id !== id);
          if (wasCurrent) {
            const remaining = sorted();
            currentId = remaining.length ? remaining[Math.min(oldIndex, remaining.length - 1)].id : null;
            if (!currentId) round = 1;
          }
          render();
        }
      });

      /* opções do próximo dano (tipo, responsável, crítico): guardadas por combatente, evidentes no cartão e limpas depois de aplicar */
      $("combatants").addEventListener("change", (e) => {
        const t = e.target, d = (t && t.dataset) || {}, id = d.tipo || d.quem || d.crit; if (!id) return;
        const o = (opcoesDano[id] = opcoesDano[id] || {});
        if (d.tipo) o.tipo = t.value || undefined; else if (d.quem) o.quem = t.value || undefined; else o.crit = !!t.checked;
        if (!o.tipo && !o.quem && !o.crit) delete opcoesDano[id]; render();
      });
      $("combatants").addEventListener("change", (e) => {
        const id = e.target.dataset && e.target.dataset.fxsel;
        if (!id) return;
        const nm = document.querySelector(`#combatants [data-fxname="${id}"]`);
        nm.hidden = e.target.value !== "custom";
        if (!nm.hidden) nm.focus();
      });

      $("combatants").addEventListener("focusin",e=>{
        if(!e.target.dataset.iniciativa)return;
        const c=combatants.find(c=>c.id===e.target.dataset.iniciativa);if(!c)return;
        edicaoIniciativa={id:c.id,original:c.initiative,cancelar:false};e.target.select?.();
      });
      $("combatants").addEventListener("change",e=>{
        const id=e.target.dataset.iniciativa;if(!id)return;
        const c=combatants.find(c=>c.id===id);if(!c)return;
        if(edicaoIniciativa?.id===id&&edicaoIniciativa.cancelar){edicaoIniciativa=null;render(true);return;}
        const valor=e.target.value.trim();if(valor!==""&&!Number.isFinite(Number(valor)))return;
        c.initiative=valor===""?null:Number(valor);edicaoIniciativa=null;render(true);
      });
      $("combatants").addEventListener("keydown",e=>{
        const id=e.target.dataset.iniciativa;if(!id)return;
        if(e.key==="Escape"){e.preventDefault();e.stopPropagation?.();const c=combatants.find(c=>c.id===id);e.target.value=c?.initiative==null?"":String(c.initiative);if(edicaoIniciativa)edicaoIniciativa.cancelar=true;e.target.blur();edicaoIniciativa=null;render(true);}
        else if(e.key==="Enter"){e.preventDefault();e.target.blur();}
      });
      function atualizarInicio(ordered=sorted()){
        const pendentes=ordered.some(pendente),vazio=!ordered.length&&!selecao.qtd;
        $('start').disabled=iniciando||pendentes||vazio;
        $('start').title=pendentes?'Preencha as iniciativas após as rolagens.':vazio?'Selecione ou adicione combatentes.':'';
        const aviso=$('inicio-aviso');if(aviso)aviso.textContent=pendentes?'Preencha as iniciativas pendentes antes de iniciar.':vazio?'Selecione os personagens abaixo ou adicione um combatente.':selecao.qtd?selecao.qtd+' selecionado(s); suas iniciativas serão roladas ao iniciar.':'';
      }
      $('start').addEventListener('click',async()=>{
        if(iniciando||combatants.some(pendente))return;const campanhaInicial=contexto;
        iniciando=true;let erroInicio="";atualizarInicio();
        try{if(selecao.qtd&&selecao.preparar&&await selecao.preparar()===false)return;
          if(contexto!==campanhaInicial||combatants.some(pendente))return;
          const first=sorted()[0];if(!first)return;
          currentId=first.id;round=1;stats={};report=null;fxNote.textContent='';render();
        }catch(e){erroInicio=e.message;if(window.FEEDBACK)window.FEEDBACK.mostrar(e.message,{erro:true});else $('inicio-aviso').textContent=e.message;}
        finally{iniciando=false;atualizarInicio();if(erroInicio)$('inicio-aviso').textContent=erroInicio;}
      });

      if ($("desfazer")) $("desfazer").addEventListener("click", () => desfazerUltimo());
      document.addEventListener("input", (e) => { const t = e.target; if (t && t.dataset && t.dataset.amount) quantidades[t.dataset.amount] = t.value; });
      $("next").addEventListener("click", () => moveTurn(1));
      $("expandir-tudo").addEventListener("click", () => { combatants.forEach((c) => abertos.add(c.id)); render(); });
      $("recolher-tudo").addEventListener("click", () => { abertos.clear(); render(); });
      /* Ficha: usa o mesmo caminho do clique no cartão, que já abre o painel lateral (criatura do bestiário ou personagem da campanha) */
      function abrirFichaDe(id) { const b = document.querySelector(`[data-ficha="${id}"]`), art = b && b.closest && b.closest(".combatant"), alvo = art && art.querySelector && art.querySelector(".nome-texto"); if (alvo && alvo.click) alvo.click(); }
      /* opção: o painel lateral acompanha o turno (desligada por padrão; guardada neste aparelho) */
      const lerSeguir = () => { try { return localStorage.getItem("ini_seguir_turno") === "1"; } catch (e) { return false; } };
      { const cx = $("seguir-turno"); if (cx) { cx.checked = lerSeguir(); cx.addEventListener("change", () => { try { localStorage.setItem("ini_seguir_turno", cx.checked ? "1" : "0"); } catch (e) {} }); } }
      function seguirTurno() { if (currentId === ultimaVez) return; ultimaVez = currentId; if (!currentId || !lerSeguir()) return; if (document.body && document.body.dataset && document.body.dataset.painel === "empilhado") return; abrirFichaDe(currentId); }
      /* atalho N = próximo turno; nunca dentro de campos de texto, listas, editores nem com Ctrl/Alt/Meta, e só quando o botão está habilitado */
      document.addEventListener("keydown", (e) => {
        if ((e.key !== "n" && e.key !== "N") || e.ctrlKey || e.altKey || e.metaKey || e.repeat || e.defaultPrevented) return;
        const t = e.target || {}, tag = String(t.tagName || "").toUpperCase();
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable || (t.closest && t.closest("[role=dialog],dialog"))) return;
        if ($("next").disabled) return; e.preventDefault(); moveTurn(1);
      });
      $("previous").addEventListener("click", () => moveTurn(-1));

      function moveTurn(direction) {
        const ordered = sorted();
        if (ordered.length < 2 || !currentId) return;
        let index = ordered.findIndex((c) => c.id === currentId);
        if (index < 0) index = 0;
        /* monstros e NPCs a 0 PV não jogam (personagens a 0 PV jogam: salvaguarda contra a morte); mortos também ficam de fora */
        const joga = (c) => !c.morto && !(Number(c.hp) <= 0 && c.kind !== "Personagem");
        let nextIndex = (index + direction + ordered.length) % ordered.length, voltas = 0, tentativas = 0;
        const passou = (de, para) => (direction > 0 ? para <= de : para >= de);
        if (passou(index, nextIndex)) voltas++;
        while (!joga(ordered[nextIndex]) && tentativas < ordered.length) { const anterior = nextIndex; nextIndex = (nextIndex + direction + ordered.length) % ordered.length; if (passou(anterior, nextIndex)) voltas++; tentativas++; }
        if (!joga(ordered[nextIndex])) { nextIndex = (index + direction + ordered.length) % ordered.length; voltas = passou(index, nextIndex) ? 1 : 0; }   // todos derrotados: segue a ordem normal
        fxNote.textContent = "";
        const atual = ordered[index];
        if (direction > 0 && atual && atual.effects && atual.effects.length) {
          const fim = [];
          atual.effects = atual.effects.filter((e) => { if (e.rounds == null) return true; e.rounds--; if (e.rounds <= 0) { fim.push(e.name); return false; } return true; });
          if (fim.length) fxNote.textContent = `Terminou em ${atual.name}: ${fim.join(", ")}.`;
        }
        if (direction > 0) round += voltas; else if (round > 1) round = Math.max(1, round - voltas);
        currentId = ordered[nextIndex].id;
        { const nx = ordered[nextIndex]; if (nx.kind === "Personagem" && Number(nx.hp) <= 0 && !nx.morto && !nx.estavel) aviso(`Vez de ${nx.name}, a 0 PV: faça a salvaguarda contra a morte (d20).`); }
        render();
      }

      $("reset").addEventListener("click", async () => {
        if (round > 1 && !(await perguntar("Encerrar o combate na rodada " + round + "?", { titulo: "Encerrar combate", ok: "Encerrar" }))) return;
        report = null;
        currentId = null;
        round = 1;
        stats = {};
        render();
      });

      /* remove todos os combatentes e deixa a iniciativa pronta para um novo encontro; não toca em fichas, bestiário, campanhas nem no relatório legado já salvo */
      async function limparIniciativa() {
        if (!combatants.length) return false;
        if (!(await perguntar("Deseja remover todos os combatentes da iniciativa? Essa ação não excluirá as fichas dos personagens ou monstros.", { titulo: "Limpar iniciativa", ok: "Limpar", perigo: true }))) return false;
        grupoPV = null; combatants = []; currentId = null; round = 1; nextOrder = 0; editId = null; stats = {}; report = null; edicaoIniciativa = null; fxFor = null;
        abertos.clear(); for (const k of Object.keys(opcoesDano)) delete opcoesDano[k]; for (const k of Object.keys(quantidades)) delete quantidades[k];
        desfazer.length = 0; { const b = $("desfazer"); if (b) { b.disabled = true; b.title = "Nada para desfazer"; } }
        ultimaVez = null; if (fxNote) fxNote.textContent = "";
        render(); aviso("Iniciativa limpa. Fichas, bestiário e campanhas continuam intactos."); return true;
      }
      $("limpar-ini").addEventListener("click", limparIniciativa);
      $("report").addEventListener("click", (e) => {
        if (e.target.id === "report-close") { report = null; render(); }
      });

      /* backup do combate (arquivo do usuário). A importação valida tudo e só substitui depois de quem chamou confirmar. */
      const CAMPOS = ["id", "name", "kind", "initiative", "hp", "maxHp", "ac", "order", "key", "pid", "campanhaId", "foto", "effects", "temp", "morte", "estavel", "morto", "conc", "sync", "usos", "furia"];
      function exportarCombate() { return { v: 1, tipo: "backup-combate", criadoEm: new Date().toISOString(), combatants, currentId, round, nextOrder, stats, report }; }
      function limparCombatente(c, i) {
        if (!c || typeof c !== "object" || typeof c.name !== "string" || !c.name.trim() || c.name.length > 120) throw new Error("Combatente inválido no arquivo (posição " + (i + 1) + ").");
        const o = {}; for (const k of CAMPOS) if (k in c) o[k] = c[k];
        o.id = typeof o.id === "string" && o.id ? o.id.slice(0, 60) : Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + i;
        for (const k of ["hp", "maxHp", "ac", "order"]) o[k] = Number.isFinite(Number(o[k])) ? Number(o[k]) : 0;
        if (o.initiative !== null && o.initiative !== undefined && o.initiative !== "") { if (!Number.isFinite(Number(o.initiative))) throw new Error("Iniciativa inválida no arquivo."); o.initiative = Number(o.initiative); } else o.initiative = null;
        if (o.foto && !/^data:image\//.test(String(o.foto))) o.foto = "";
        o.effects = Array.isArray(o.effects) ? o.effects.filter((e) => e && typeof e === "object" && typeof e.name === "string").slice(0, 40) : [];
        for (const k of ["kind", "key", "pid", "campanhaId"]) if (o[k] !== undefined) o[k] = String(o[k]).slice(0, 80);
        return o;
      }
      function importarCombate(d) {
        if (!d || typeof d !== "object" || d.tipo !== "backup-combate" || !Array.isArray(d.combatants)) throw new Error("O arquivo não é um backup de combate.");
        if (d.combatants.length > 300) throw new Error("O backup tem combatentes demais (máximo 300).");
        const lista = d.combatants.map(limparCombatente);
        if (new Set(lista.map((c) => c.id)).size !== lista.length) throw new Error("O arquivo tem combatentes repetidos.");
        combatants = lista; currentId = lista.some((c) => c.id === d.currentId) ? d.currentId : null;
        round = Number(d.round) > 0 ? Number(d.round) : 1; nextOrder = Math.max(Number(d.nextOrder) || 0, lista.length);
        stats = d.stats && typeof d.stats === "object" ? d.stats : {}; report = null; editId = null;
        save(); render(); notificar();
      }
      window.__ini = {
        pending: "",
        selecaoPendente:(qtd,preparar)=>{selecao={qtd,preparar};atualizarInicio();},
        exportarCombate,
        importarCombate,
        aoAlterar:fn=>ouvintes.push(fn),
        render: () => render(),
        rolagemAuto,
        list: () => combatants,
        atual: () => currentId,
        aplicarDano, curar, darTemp, aplicarPV, lerQuantidade, maisOpcoes, limparIniciativa, desfazerGrupoPV, estatisticas: () => stats, incapaz, salvaMorte, salvaMorteD20, estabilizar, marcarMorto, usarRecurso, usarEspaco, defesasDoCombatente, desfazerUltimo, moverTurno: moveTurn, rodada: () => round,
        trocarContexto,
        contexto: () => contexto,
        add: (c) => { combatants.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), order: nextOrder++, ...c }); render(); }
      };
      try { const q = new URLSearchParams(location.search).get("campanha"), u = window.nuvem && window.nuvem.usuario && window.nuvem.usuario(); contexto = u ? (q || (window.CAMPANHAS_UI && window.CAMPANHAS_UI.ativaId()) || "") : ""; } catch (_) { contexto = ""; }
      load();
      aplicarRolagemAuto();
      render();
    })();
