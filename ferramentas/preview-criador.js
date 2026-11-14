/* Prévia local do criador (sem nuvem): ficha nova vazia, nada é enviado. */
if (!new URLSearchParams(location.search).has('id')) history.replaceState(null, '', location.pathname + '?id=demo');
window.nuvem = (() => {
  const p = { id: 'demo', nome: 'Pedro', campanha_id: 'c', dono_id: 'u', pv_atual: 10, pv_max: 10, versao: 1, inventario: [], dinheiro: {}, ficha: new URLSearchParams(location.search).has('padrao') ? { atributos: { for: 10, des: 10, con: 10, int: 10, sab: 10, car: 10 } } : {} };
  return { esc: s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), usuario: () => ({ id: 'u' }), observar() {}, entradaUrl: () => 'x',
    get: async q => structuredClone(q.startsWith('personagens') ? [p] : []), patch: async (_q, d) => { Object.assign(p, structuredClone(d)); return [{ versao: ++p.versao }]; } };
})();
