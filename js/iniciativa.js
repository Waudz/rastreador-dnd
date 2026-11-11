    (() => {
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
      let report = null;
      let edicaoIniciativa = null;const ouvintes=[];
      const notificar=()=>ouvintes.forEach(fn=>fn());

      function save() {
        try {
          localStorage.setItem(chaveAtual(), JSON.stringify({ combatants, currentId, round, nextOrder, stats, report }));
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
      function zerar() { combatants = []; currentId = null; round = 1; nextOrder = 0; editId = null; stats = {}; report = null; edicaoIniciativa = null; }
      /* troca a campanha ativa: guarda o combate atual na chave da campanha antiga e carrega o da nova, sem misturar */
      function trocarContexto(novo) {
        novo = novo || "";
        if (novo === contexto) return;
        save(); contexto = novo; zerar(); load(); render(); notificar();
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
          report = saved.report || null;
        } catch (_) {
          combatants = [];
        }
      }

      const pendente = c => c.initiative == null || c.initiative === "" || !Number.isFinite(Number(c.initiative));
      function sorted() {
        return [...combatants].sort((a, b) =>
          Number(pendente(a)) - Number(pendente(b)) || (pendente(a) ? 0 : Number(b.initiative) - Number(a.initiative)) || a.order - b.order
        );
      }

      function escapeText(value) {
        return String(value).replace(/[&<>"']/g, (char) => ({
          "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[char]);
      }

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

      function statOf(id, name) {
        return (stats[id] = stats[id] || { name, dealt: 0, taken: 0, healed: 0, kills: 0 });
      }

      function renderDmgBy(ordered) {
        const sel = $("dmg-by"), cur = sel.value;
        sel.innerHTML = '<option value="">Quem está na vez</option>' + ordered.map((c) => `<option value="${c.id}">${escapeText(c.name)}</option>`).join("");
        sel.value = ordered.some((c) => c.id === cur) ? cur : "";
      }

      function attacker() {
        const id = $("dmg-by").value || currentId;
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
          <p class="muted" style="font-size:11px;margin:8px 0 0">O dano é atribuído a quem estava na vez, ou a quem você escolher em “Dano causado por”.</p>`;
      }

      function buildReport() {
        const rows = Object.values(stats).filter((r) => r.dealt || r.taken || r.healed || r.kills)
          .sort((a, b) => b.dealt - a.dealt || b.kills - a.kills || a.name.localeCompare(b.name));
        return rows.length ? { rounds: round, rows } : null;
      }

      function render(force=false) {
        if(!force&&document.activeElement?.matches?.('#combatants [data-iniciativa]')){save();return;}
        const list = $("combatants");
        const ordered = sorted();
        $("round").textContent = round;
        document.querySelector(".round-box").hidden = !currentId;
        renderDmgBy(ordered);
        renderReport();

        const active = combatants.find((c) => c.id === currentId);
        $("current-turn").innerHTML = active
          ? `Vez de: <strong>${escapeText(active.name)}</strong>`
          : "Nenhum turno ativo. Comece o combate quando estiver pronto.";

        $("start").disabled = ordered.length === 0 || ordered.some(pendente);
        $("start").title = ordered.some(pendente) ? "Preencha as iniciativas após as rolagens." : "";
        $("previous").disabled = ordered.length < 2 || !currentId;
        $("next").disabled = ordered.length < 2 || !currentId;
        $("reset").disabled = !currentId;

        if (!ordered.length) {
          list.innerHTML = `<div class="empty"><strong>O campo de batalha está vazio.</strong>Cadastre os personagens e inimigos para montar a ordem de iniciativa.</div>`;
          save();notificar();
          return;
        }

        list.innerHTML = ordered.map((c) => {
          if (c.id === editId) return editTpl(c);
          const isActive = c.id === currentId;
          const isDefeated = Number(c.hp) <= 0;
          const pct = Math.max(0, Math.min(100, (Number(c.hp) / Number(c.maxHp)) * 100));
          const hpClass = pct <= 25 ? "low" : pct <= 50 ? "mid" : "";
          return `
            <article class="combatant ${isActive ? "active" : ""} ${isDefeated ? "defeated" : ""}" aria-current="${isActive?'step':'false'}" data-key="${escapeText(c.key || "")}" data-pid="${escapeText(c.pid || "")}">
              <input class="initiative iniciativa-valor" type="number" step="1" data-iniciativa="${c.id}" value="${pendente(c) ? "" : Number(c.initiative)}" placeholder=" " aria-label="Iniciativa de ${escapeText(c.name)}" title="Iniciativa pendente: informe o resultado da rolagem, já com o modificador">
              <div class="id-bloco">
                <span class="avfx">${window.__ini && window.__ini.avatar ? window.__ini.avatar(c.key, c.name, 40, c.foto) : ""}</span>
                <div class="id-texto">
                <div class="name"><span class="nome-texto">${escapeText(c.name)}</span>${isActive ? ` <span aria-label="turno atual" class="turn-mark">${ico("turn")}</span>` : ""}</div>
                <div class="kind">${isActive?'<span class="turno-badge">Turno atual</span> · ':''}${escapeText(c.kind)}${isDefeated ? " · Inconsciente/derrotado" : ""}${pendente(c) ? " · iniciativa pendente" : ""}</div>
                ${c.effects && c.effects.length ? `<div class="fxbar">${c.effects.map((e) => `<span class="fxchip" style="--c:${e.color}" data-fxtip="${escapeText(fxTip(e))}">${fxIcon(e.type)}${escapeText(e.name)} <b>${fxLeft(e)}</b><button type="button" data-fxdel="${c.id}|${e.id}" aria-label="Remover ${escapeText(e.name)}">${ico("x")}</button></span>`).join("")}</div>` : ""}
              </div>
              </div>
              <div class="stats-linha">
                <div class="stat">CA<strong>${Number(c.ac)}</strong></div>
                <div class="stat">PV<strong>${Number(c.hp)}</strong></div>
                <div class="stat">Máx. PV<strong>${Number(c.maxHp)}</strong></div>
              </div>
              <div class="hp-block">
                <div class="hp-top"><span>Pontos de vida</span><strong>${Number(c.hp)} / ${Number(c.maxHp)}</strong></div>
                <div class="hp-track"><div class="hp-fill ${hpClass}" style="width:${pct}%"></div></div>
                <div class="hp-controls">
                  <input type="number" min="1" step="1" value="1" aria-label="Quantidade de PV para alterar" data-amount="${c.id}">
                  <button class="small danger" type="button" data-damage="${c.id}">${ico("minus")}Dano</button>
                  <button class="small" type="button" data-heal="${c.id}">${ico("plus")}Cura</button>
                </div>
              </div>
              <div class="row-actions">
                <button class="small subtle" type="button" data-fxopen="${c.id}">${ico("sparkles")}Efeito</button>
                <button class="small subtle" type="button" data-edit="${c.id}">Editar</button>
                <button class="small subtle" type="button" data-remove="${c.id}" aria-label="Remover ${escapeText(c.name)}">Remover</button>
              </div>
              ${fxFor === c.id ? fxFormTpl(c) : ""}
            </article>`;
        }).join("");

        save();notificar();
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
          initiative: (Number($("initiative").value) || 0) + (Number($("ini-mod").value) || 0),   // d20 + modificador
          hp: Math.min(hp, maxHp),
          maxHp,
          ac: Math.max(0, Number($("ac").value) || 0),
          order: nextOrder++,
          key: (window.__ini && window.__ini.pending) || ""
        });
        if (window.__ini) window.__ini.pending = "";
        $("ini-mod").value = 0;

        $("name").value = "";
        $("name").focus();
        render();
      });

      $("combatants").addEventListener("click", (event) => {
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

        if (button.dataset.damage || button.dataset.heal) {
          const id = button.dataset.damage || button.dataset.heal;
          const person = combatants.find((c) => c.id === id);
          const amountInput = document.querySelector(`[data-amount="${id}"]`);
          const amount = Math.max(1, Math.floor(Number(amountInput?.value) || 1));
          if (!person) return;
          const antes = Number(person.hp), quem = attacker();
          person.hp = button.dataset.damage
            ? Math.max(0, antes - amount)
            : Math.min(Number(person.maxHp), antes + amount);
          if (button.dataset.damage) {
            const a = statOf(quem.id, quem.name); a.dealt += amount;
            if (antes > 0 && person.hp === 0) a.kills++;
            statOf(person.id, person.name).taken += amount;
          } else if (person.hp > antes) {
            statOf(quem.id, quem.name).healed += person.hp - antes;
          }
          render();
          return;
        }

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
      $("start").addEventListener("click", () => {
        if(combatants.some(pendente))return;
        const first = sorted()[0];
        if (!first) return;
        currentId = first.id;
        round = 1;
        stats = {};
        report = null;
        fxNote.textContent = "";
        render();
      });

      $("next").addEventListener("click", () => moveTurn(1));
      $("previous").addEventListener("click", () => moveTurn(-1));

      function moveTurn(direction) {
        const ordered = sorted();
        if (ordered.length < 2 || !currentId) return;
        let index = ordered.findIndex((c) => c.id === currentId);
        if (index < 0) index = 0;
        const nextIndex = (index + direction + ordered.length) % ordered.length;
        fxNote.textContent = "";
        const atual = ordered[index];
        if (direction > 0 && atual && atual.effects && atual.effects.length) {
          const fim = [];
          atual.effects = atual.effects.filter((e) => { if (e.rounds == null) return true; e.rounds--; if (e.rounds <= 0) { fim.push(e.name); return false; } return true; });
          if (fim.length) fxNote.textContent = `Terminou em ${atual.name}: ${fim.join(", ")}.`;
        }
        if (direction > 0 && nextIndex === 0) round++;
        if (direction < 0 && index === 0 && round > 1) round--;
        currentId = ordered[nextIndex].id;
        render();
      }

      $("reset").addEventListener("click", () => {
        if (round > 1 && !confirm("Encerrar o combate na rodada " + round + "?")) return;
        report = buildReport();
        currentId = null;
        round = 1;
        stats = {};
        render();
      });

      $("report").addEventListener("click", (e) => {
        if (e.target.id === "report-close") { report = null; render(); }
      });

      /* backup do combate (arquivo do usuário). A importação valida tudo e só substitui depois de quem chamou confirmar. */
      const CAMPOS = ["id", "name", "kind", "initiative", "hp", "maxHp", "ac", "order", "key", "pid", "campanhaId", "foto", "effects"];
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
        exportarCombate,
        importarCombate,
        aoAlterar:fn=>ouvintes.push(fn),
        render: () => render(),
        list: () => combatants,
        trocarContexto,
        contexto: () => contexto,
        add: (c) => { combatants.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), order: nextOrder++, ...c }); render(); }
      };
      try { const q = new URLSearchParams(location.search).get("campanha"), u = window.nuvem && window.nuvem.usuario && window.nuvem.usuario(); contexto = u ? (q || (window.CAMPANHAS_UI && window.CAMPANHAS_UI.ativaId()) || "") : ""; } catch (_) { contexto = ""; }
      load();
      render();
    })();
