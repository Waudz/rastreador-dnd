/* Monstros recentes da iniciativa: últimos 15 monstros efetivamente adicionados ao combate, sem duplicatas, do mais recente para o mais antigo.
   Guarda só o identificador estável do monstro (key do bestiário ou da criação própria) no armazenamento local do aparelho/conta (acervo.chave).
   Não sincroniza com o Supabase e não depende do combate: limpar ou encerrar a iniciativa não apaga o histórico. */
(() => {
  "use strict";
  const MAX = 15;
  /* registros corrompidos ou de outro formato viram lista válida: só textos não vazios, sem repetição, no máximo MAX */
  const normalizar = (lista) => { const out = []; for (const k of Array.isArray(lista) ? lista : []) if (typeof k === "string" && k && k.length <= 200 && !out.includes(k)) out.push(k); return out.slice(0, MAX); };
  const depositoPadrao = () => { try { return window.localStorage; } catch (_) { return null; } };
  function ler(chave, deposito) {
    const d = deposito || depositoPadrao(); if (!d) return [];
    try { return normalizar(JSON.parse(d.getItem(chave) || "[]")); } catch (_) { return []; }
  }
  function gravar(chave, lista, deposito) {
    const d = deposito || depositoPadrao(); if (!d) return false;
    try { d.setItem(chave, JSON.stringify(normalizar(lista))); return true; } catch (_) { return false; }
  }
  /* registra (ou sobe para o primeiro lugar) um monstro; devolve a lista atual */
  function registrar(chave, key, deposito) {
    const atual = ler(chave, deposito); if (typeof key !== "string" || !key) return atual;
    const nova = [key, ...atual.filter((k) => k !== key)].slice(0, MAX); gravar(chave, nova, deposito); return nova;
  }
  function remover(chave, key, deposito) { const nova = ler(chave, deposito).filter((k) => k !== key); gravar(chave, nova, deposito); return nova; }
  function limpar(chave, deposito) { const d = deposito || depositoPadrao(); if (d) try { d.removeItem(chave); } catch (_) {} return []; }
  window.RECENTES = { MAX, normalizar, ler, gravar, registrar, remover, limpar };
})();
