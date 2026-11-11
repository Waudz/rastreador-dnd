/* Ambiente demonstrativo isolado: nenhuma sessão, persistência ou requisição à nuvem. */
if (!new URLSearchParams(location.search).has('id')) {
  history.replaceState(null, '', location.pathname + '?id=demonstracao');
}
window.nuvem = (() => {
  const personagem = {
    id: 'demonstracao', nome: 'Aldric, o Errante', campanha_id: 'demo', dono_id: 'demo',
    pv_atual: 32, pv_max: 42, pv_temp: 0, ca: 18, versao: 1,
    inventario: [{nome:'Espada longa',qtd:1,peso:1.5},{nome:'Mochila',qtd:1,peso:2.5}],
    dinheiro: {pc:12,pp:5,po:48},
    ficha: {
      raca: 'Humano', background: 'Soldado', deslocamento: 9,
      classes: [{c:'Fighter',n:5,sub:'Campeão'}],
      atributos: {for:16,des:14,con:14,int:10,sab:12,car:8},
      caAuto:false, pvAuto:false, idiomas:['Comum'],
      ataques:[{nome:'Espada longa',atr:'for',dado:'1d8',tipo:'cortante',prof:true}],
      notas:'Uma velha promessa me trouxe de volta à estrada.\n\nPróxima sessão: investigar as ruínas ao norte.'
    }
  };
  return {
    esc: s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
    usuario:()=>({id:'demo'}), retornoDoLink:async()=>{}, observar(){},
    get: async q => structuredClone(q.startsWith('personagens') ? [personagem] : q.startsWith('campanhas') ? [{id:'demo',nome:'Ecos da Costa da Espada'}] : q.startsWith('membros') ? [{papel:'jogador'}] : [{id:'demo',nome:'Demonstração'}]),
    patch: async (_q, dados) => { Object.assign(personagem, structuredClone(dados)); return [{versao:++personagem.versao}]; },
    apagar: async () => { throw Error('A exclusão está desativada na prévia.'); }
  };
})();
