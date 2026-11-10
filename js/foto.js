    window.recortarFoto = function(file) {
      return new Promise((ok, no) => {
        const url = URL.createObjectURL(file), im = new Image();
        im.onerror = () => { URL.revokeObjectURL(url); no(new Error("imagem inválida")); };
        im.onload = () => {
          const S = 260, base = S / Math.min(im.width, im.height);
          let zoom = 1, ox = 0, oy = 0;
          const ov = document.createElement("div"); ov.className = "crop-ov";
          ov.innerHTML = `<div class="crop-box" role="dialog" aria-label="Ajustar foto">
            <h3>Ajustar foto</h3>
            <canvas class="crop-stage" width="${S}" height="${S}"></canvas>
            <div class="crop-zoom"><span>−</span><input type="range" min="1" max="4" step="0.01" value="1" aria-label="Zoom"><span>+</span></div>
            <div class="crop-prev"><span class="muted">Como vai aparecer:</span><canvas width="72" height="72"></canvas><canvas width="34" height="34"></canvas></div>
            <p class="muted" style="font-size:11px;margin:6px 0 10px">Arraste a imagem para posicionar. Use o controle ou a roda do mouse para o zoom.</p>
            <div class="row" style="justify-content:flex-end;margin:0"><button type="button" class="small" data-c="center">Centralizar</button><button type="button" class="small subtle" data-c="no">Cancelar</button><button type="button" class="small primary" data-c="ok">Usar foto</button></div></div>`;
          document.body.appendChild(ov);
          const stage = ov.querySelector(".crop-stage"), [p72, p34] = ov.querySelectorAll(".crop-prev canvas"), rg = ov.querySelector("input");
          const clamp = () => { const sc = base * zoom, mx = Math.max(0, (im.width * sc - S) / 2), my = Math.max(0, (im.height * sc - S) / 2); ox = Math.max(-mx, Math.min(mx, ox)); oy = Math.max(-my, Math.min(my, oy)); };
          const paint = (cv, size) => { const c = cv.getContext("2d"), k = size / S, sc = base * zoom; c.clearRect(0, 0, size, size); c.fillStyle = "#000"; c.fillRect(0, 0, size, size); c.drawImage(im, (S / 2 + ox - im.width * sc / 2) * k, (S / 2 + oy - im.height * sc / 2) * k, im.width * sc * k, im.height * sc * k); };
          const draw = () => {
            clamp(); paint(stage, S);
            const c = stage.getContext("2d"); c.save(); c.fillStyle = "rgba(10,9,14,.62)"; c.beginPath(); c.rect(0, 0, S, S); c.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2, true); c.fill("evenodd");
            c.strokeStyle = "#9f7940"; c.lineWidth = 2; c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); c.stroke(); c.restore();
            for (const [cv, sz] of [[p72, 72], [p34, 34]]) { paint(cv, sz); const c2 = cv.getContext("2d"); c2.globalCompositeOperation = "destination-in"; c2.beginPath(); c2.arc(sz / 2, sz / 2, sz / 2, 0, Math.PI * 2); c2.fill(); c2.globalCompositeOperation = "source-over"; }
          };
          let drag = null;
          stage.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, ox, oy }; stage.setPointerCapture(e.pointerId); });
          stage.addEventListener("pointermove", (e) => { if (!drag) return; const r = stage.getBoundingClientRect(), k = S / r.width; ox = drag.ox + (e.clientX - drag.x) * k; oy = drag.oy + (e.clientY - drag.y) * k; draw(); });
          stage.addEventListener("pointerup", () => { drag = null; }); stage.addEventListener("pointercancel", () => { drag = null; });
          const setZoom = (z) => { zoom = Math.max(1, Math.min(4, z)); rg.value = zoom; draw(); };
          rg.addEventListener("input", () => setZoom(+rg.value));
          stage.addEventListener("wheel", (e) => { e.preventDefault(); setZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08)); }, { passive: false });
          const fim = (data) => { document.removeEventListener("keydown", esc, true); ov.remove(); URL.revokeObjectURL(url); ok(data); };
          const esc = (e) => { if (e.key === "Escape") { e.stopPropagation(); fim(null); } };
          document.addEventListener("keydown", esc, true);
          ov.addEventListener("click", (e) => {
            const b = e.target.closest("[data-c]"); if (!b) return;
            if (b.dataset.c === "no") return fim(null); if(b.dataset.c === "center"){ox=oy=0;setZoom(1);return;}
            const out = document.createElement("canvas"); out.width = out.height = 192; paint(out, 192); fim(out.toDataURL("image/jpeg", 0.85));
          });
          draw();
        };
        im.src = url;
      });
    }
