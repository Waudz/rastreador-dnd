    (() => {
      const STORAGE_KEY = "dnd5e_initiative_tracker_v1";
      const $ = (id) => document.getElementById(id);

      let combatants = [];
      let currentId = null;
      let round = 1;
      let nextOrder = 0;
      let editId = null;

      function save() {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ combatants, currentId, round, nextOrder }));
        } catch (_) {
          // O preview incorporado pode bloquear armazenamento local; o rastreador continua funcionando nesta sessão.
        }
      }

      function load() {
        try {
          const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
          if (!saved || !Array.isArray(saved.combatants)) return;
          combatants = saved.combatants;
          currentId = saved.currentId || null;
          round = Number(saved.round) > 0 ? Number(saved.round) : 1;
          nextOrder = Number(saved.nextOrder) || combatants.length;
        } catch (_) {
          combatants = [];
        }
      }

      function sorted() {
        return [...combatants].sort((a, b) =>
          Number(b.initiative) - Number(a.initiative) || a.order - b.order
        );
      }

      function escapeText(value) {
        return String(value).replace(/[&<>"']/g, (char) => ({
          "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[char]);
      }

      function editTpl(c) {
        const f = (k, l, t, v) => `<div><label>${l}</label><input data-f="${k}" type="${t}" value="${escapeText(v)}"></div>`;
        return `<article class="combatant editing">${f("name", "Nome", "text", c.name)}${f("initiative", "Iniciativa", "number", Number(c.initiative))}${f("ac", "CA", "number", Number(c.ac))}${f("hp", "PV", "number", Number(c.hp))}${f("maxHp", "PV máx.", "number", Number(c.maxHp))}<div class="row-actions" style="align-self:end"><button class="small primary" type="button" data-save="${c.id}">Salvar</button><button class="small subtle" type="button" data-cancel="1">Cancelar</button></div></article>`;
      }

      function render() {
        const list = $("combatants");
        const ordered = sorted();
        $("round").textContent = round;

        const active = combatants.find((c) => c.id === currentId);
        $("current-turn").innerHTML = active
          ? `Vez de: <strong>${escapeText(active.name)}</strong>`
          : "Nenhum turno ativo. Comece o combate quando estiver pronto.";

        $("start").disabled = ordered.length === 0;
        $("previous").disabled = ordered.length < 2 || !currentId;
        $("next").disabled = ordered.length < 2 || !currentId;
        $("reset").disabled = !currentId;

        if (!ordered.length) {
          list.innerHTML = `<div class="empty"><strong>O campo de batalha está vazio.</strong>Cadastre os personagens e inimigos para montar a ordem de iniciativa.</div>`;
          save();
          return;
        }

        list.innerHTML = ordered.map((c) => {
          if (c.id === editId) return editTpl(c);
          const isActive = c.id === currentId;
          const isDefeated = Number(c.hp) <= 0;
          const pct = Math.max(0, Math.min(100, (Number(c.hp) / Number(c.maxHp)) * 100));
          const hpClass = pct <= 25 ? "low" : pct <= 50 ? "mid" : "";
          return `
            <article class="combatant ${isActive ? "active" : ""} ${isDefeated ? "defeated" : ""}" data-key="${escapeText(c.key || "")}">
              <div class="initiative">${Number(c.initiative)}</div>
              <div>
                <div class="name">${window.__ini && window.__ini.avatar ? window.__ini.avatar(c.key, c.name, 34) : ""}${escapeText(c.name)}${isActive ? " <span aria-label='turno atual'>◀</span>" : ""}</div>
                <div class="kind">${escapeText(c.kind)}${isDefeated ? " · Inconsciente/derrotado" : ""}</div>
              </div>
              <div class="stat">CA<strong>${Number(c.ac)}</strong></div>
              <div class="stat">PV<strong>${Number(c.hp)}</strong></div>
              <div class="stat">Máx. PV<strong>${Number(c.maxHp)}</strong></div>
              <div class="hp-block">
                <div class="hp-top"><span>Pontos de vida</span><strong>${Number(c.hp)} / ${Number(c.maxHp)}</strong></div>
                <div class="hp-track"><div class="hp-fill ${hpClass}" style="width:${pct}%"></div></div>
                <div class="hp-controls">
                  <input type="number" min="1" step="1" value="1" aria-label="Quantidade de PV para alterar" data-amount="${c.id}">
                  <button class="small danger" type="button" data-damage="${c.id}">− Dano</button>
                  <button class="small" type="button" data-heal="${c.id}">＋ Cura</button>
                </div>
              </div>
              <div class="row-actions">
                <button class="small subtle" type="button" data-edit="${c.id}">Editar</button>
                <button class="small subtle" type="button" data-remove="${c.id}" aria-label="Remover ${escapeText(c.name)}">Remover</button>
              </div>
            </article>`;
        }).join("");

        save();
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
          initiative: Number($("initiative").value) || 0,
          hp: Math.min(hp, maxHp),
          maxHp,
          ac: Math.max(0, Number($("ac").value) || 0),
          order: nextOrder++,
          key: (window.__ini && window.__ini.pending) || ""
        });
        if (window.__ini) window.__ini.pending = "";

        $("name").value = "";
        $("name").focus();
        render();
      });

      $("combatants").addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button) return;

        if (button.dataset.edit) { editId = button.dataset.edit; render(); return; }
        if (button.dataset.cancel) { editId = null; render(); return; }
        if (button.dataset.save) {
          const p = combatants.find((c) => c.id === button.dataset.save);
          const g = (k) => document.querySelector(`#combatants [data-f="${k}"]`).value;
          const maxHp = Number(g("maxHp")), hp = Number(g("hp"));
          if (p && g("name").trim() && Number.isFinite(maxHp) && maxHp >= 1 && Number.isFinite(hp) && hp >= 0) {
            p.name = g("name").trim(); p.initiative = Number(g("initiative")) || 0; p.ac = Math.max(0, Number(g("ac")) || 0);
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
          person.hp = button.dataset.damage
            ? Math.max(0, Number(person.hp) - amount)
            : Math.min(Number(person.maxHp), Number(person.hp) + amount);
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

      $("start").addEventListener("click", () => {
        const first = sorted()[0];
        if (!first) return;
        currentId = first.id;
        round = 1;
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
        if (direction > 0 && nextIndex === 0) round++;
        if (direction < 0 && index === 0 && round > 1) round--;
        currentId = ordered[nextIndex].id;
        render();
      }

      $("reset").addEventListener("click", () => {
        if (round > 1 && !confirm("Encerrar o combate na rodada " + round + "?")) return;
        currentId = null;
        round = 1;
        render();
      });

      window.__ini = {
        pending: "",
        render: () => render(),
        list: () => combatants,
        add: (c) => { combatants.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), order: nextOrder++, ...c }); render(); }
      };
      load();
      render();
    })();
