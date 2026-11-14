/* Ambiente demonstrativo isolado: nenhuma sessão, persistência ou requisição à nuvem. */
if (!new URLSearchParams(location.search).has('id')) {
  history.replaceState(null, '', location.pathname + '?id=demonstracao');
}
/* catálogo global simulado: só a imagem do Bastão, para conferir que a imagem do catálogo aparece no inventário */
window.CATALOGO = { iniciar() {}, carregar: async () => ({}), registro: () => null, registros: () => [], imagem: (tipo, chave) => (tipo === 'item' && chave === 'srd51:item/quarterstaff' ? "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#7a4"/><text x="8" y="40" font-size="28">BT</text></svg>') : undefined) };
window.nuvem = (() => {
  const personagem = {
    id: 'demonstracao', nome: 'Aldric, o Errante', campanha_id: 'demo', dono_id: 'demo',
    pv_atual: 32, pv_max: 42, pv_temp: 0, ca: 18, versao: 1,
    inventario: [
      /* itens de demonstração ligados ao catálogo (uid próprio); a imagem do Bastão vem do CATALOGO simulado abaixo */
      {uid:'d1',catId:'srd51:item/longsword',ref:'srd51:item/longsword',nome:'Espada longa',qtd:1,peso:1.5,tipo:'equipamento',origem:{tipo:'inicial'},propriedades:{}},
      {uid:'d2',catId:'srd51:item/quarterstaff',ref:'srd51:item/quarterstaff',nome:'Bastão',qtd:1,peso:2,tipo:'equipamento',origem:{tipo:'mestre'},propriedades:{}},
      {uid:'d3',catId:'srd51:item/dagger',ref:'srd51:item/dagger',nome:'Adaga',qtd:1,peso:0.5,tipo:'equipamento',origem:{tipo:'jogo'},propriedades:{}},
      {uid:'d4',catId:'srd51:item/dagger',ref:'srd51:item/dagger',nome:'Adaga',qtd:1,peso:0.5,tipo:'equipamento',origem:{tipo:'jogo'},propriedades:{}},
      {uid:'d5',catId:'srd51:item/chain-mail',ref:'srd51:item/chain-mail',nome:'Cota de malha',qtd:1,peso:27.5,tipo:'equipamento',origem:{tipo:'inicial'},propriedades:{}},
      {uid:'d6',catId:'srd51:item/leather-armor',ref:'srd51:item/leather-armor',nome:'Armadura de couro',qtd:1,peso:5,tipo:'equipamento',origem:{tipo:'jogo'},propriedades:{}},
      {uid:'d7',catId:'srd51:item/shield',ref:'srd51:item/shield',nome:'Escudo',qtd:1,peso:3,tipo:'equipamento',origem:{tipo:'inicial'},propriedades:{}},
      {uid:'d8',nome:'Mochila',qtd:1,peso:2.5,tipo:'equipamento',origem:{tipo:'inicial'},propriedades:{}}],
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
