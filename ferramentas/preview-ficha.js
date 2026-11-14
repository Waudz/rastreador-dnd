/* Ambiente demonstrativo isolado: nenhuma sessão, persistência ou requisição à nuvem. */
if (!new URLSearchParams(location.search).has('id')) {
  { const q = new URLSearchParams(location.search); q.set('id', 'demonstracao'); history.replaceState(null, '', location.pathname + '?' + q.toString()); }   // mantém ?mestre=1
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
      {uid:'d8',nome:'Mochila',qtd:1,peso:2.5,tipo:'equipamento',origem:{tipo:'inicial'},propriedades:{}},
      /* origens, lotes agrupados, histórico de transferência e textos longos (demonstração visual) */
      {uid:'d9',catId:'srd51:item/greatsword',ref:'srd51:item/greatsword',nome:'Espada grande',qtd:1,peso:3,tipo:'equipamento',origem:{tipo:'criacao',id:'classe:g0:srd51:item/greatsword',nota:'Criação — Equipamento de Bárbaro',texto:'Escolha de equipamento da classe · Grupo 1'},propriedades:{}},
      {uid:'d10',catId:'srd51:item/dart',ref:'srd51:item/dart',nome:'Dardo',qtd:10,peso:0.1,tipo:'equipamento',origem:{tipo:'criacao',id:'classe:fixo:srd51:item/dart',nota:'Criação — Equipamento de Monge',texto:'Equipamento inicial da classe Monge'},propriedades:{}},
      {uid:'d11',catId:'srd51:item/dart',ref:'srd51:item/dart',nome:'Dardo',qtd:5,peso:0.1,tipo:'equipamento',origem:{tipo:'compra',id:'compra:1',nota:'Daggerford',texto:'Compradas em Daggerford'},propriedades:{}},
      {uid:'d12',catId:'srd51:item/rations-1-day',ref:'srd51:item/rations-1-day',nome:'Rações (1 dia)',qtd:10,peso:1,tipo:'equipamento',origem:{tipo:'jogo',id:'pacote:srd51:item/explorers-pack',nota:'Pacote de Explorador',pacote:{id:'srd51:item/explorers-pack',nome:'Pacote de Explorador'}},propriedades:{}},
      {uid:'d13',nome:'Espada Encantada Flamejante de Aço Valiriano Forjada pelos Anões da Montanha Cinzenta',qtd:1,peso:1.5,tipo:'magico',desc:'Uma lâmina antiga e muito longa de descrever, com inscrições em runas anãs ao longo de toda a guarda. Concede +1 nas jogadas de ataque e dano e, uma vez por dia, envolve-se em chamas por um minuto, causando 1d6 de dano de fogo adicional em cada acerto, além de iluminar uma área de 6 metros.',origem:{tipo:'mestre',texto:'Recompensa de missão: a tumba dos reis esquecidos sob as montanhas do norte'},propriedades:{raridade:'Raro',cargas:{atual:2,max:3,recarga:'amanhecer'},efeitos:[{tipo:'cura',dados:{n:2,d:4,b:2}}]}},
      /* poções de cura (consumíveis mágicos do catálogo) e um item mágico do catálogo, para conferir a identidade visual */
      {uid:'p1',catId:'srd51:item/potion-of-healing-common',ref:'srd51:item/potion-of-healing-common',nome:'Poção de cura',qtd:2,peso:0.25,tipo:'consumivel',origem:{tipo:'jogo'},propriedades:{}},
      {uid:'p2',catId:'srd51:item/potion-of-healing-greater',ref:'srd51:item/potion-of-healing-greater',nome:'Poção de cura maior',qtd:1,peso:0.25,tipo:'consumivel',origem:{tipo:'jogo'},propriedades:{}},
      {uid:'p3',catId:'srd51:item/potion-of-healing-superior',ref:'srd51:item/potion-of-healing-superior',nome:'Poção de cura superior',qtd:1,peso:0.25,tipo:'consumivel',origem:{tipo:'jogo'},propriedades:{}},
      {uid:'p4',catId:'srd51:item/potion-of-healing-supreme',ref:'srd51:item/potion-of-healing-supreme',nome:'Poção de cura suprema',qtd:1,peso:0.25,tipo:'consumivel',origem:{tipo:'jogo'},propriedades:{}},
      {uid:'p5',catId:'srd51:item/staff-of-healing',ref:'srd51:item/staff-of-healing',nome:'Cajado de cura',qtd:1,peso:2,tipo:'magico',origem:{tipo:'mestre'},propriedades:{}},
      {uid:'p6',nome:'Relíquia antiga',qtd:1,peso:1,tipo:'magico',origem:{tipo:'mestre'},propriedades:{raridade:'Lendário'}},
      {uid:'p7',nome:'Coroa dos ecos',qtd:1,peso:1,tipo:'magico',origem:{tipo:'mestre'},propriedades:{raridade:'Artefato'}},
      {uid:'d14',nome:'Amuleto sem descrição',qtd:1,peso:0,tipo:'outro',origem:{tipo:'inicial'},propriedades:{}},
      {uid:'d15',catId:'srd51:item/quarterstaff',ref:'srd51:item/quarterstaff',nome:'Bastão',qtd:1,peso:2,tipo:'equipamento',origem:{tipo:'criacao',id:'classe:g0:q',nota:'Criação — Equipamento de Monge',texto:'Equipamento inicial da classe Monge'},propriedades:{},transferencias:[{quando:'2026-11-10T15:00:00.000Z',tipo:'transferencia',de:{tipo:'personagem',id:'p-pedro',nome:'Pedro'},para:{tipo:'personagem',id:'demonstracao',nome:'Aldric, o Errante'},qtd:1}]}],
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
    get: async q => structuredClone(q.startsWith('personagens') ? [personagem] : q.startsWith('campanhas') ? [{id:'demo',nome:'Ecos da Costa da Espada'}] : q.startsWith('membros') ? [{papel: new URLSearchParams(location.search).has('mestre') ? 'mestre' : 'jogador'}] : [{id:'demo',nome:'Demonstração'}]),
    patch: async (_q, dados) => { Object.assign(personagem, structuredClone(dados)); return [{versao:++personagem.versao}]; },
    apagar: async () => { throw Error('A exclusão está desativada na prévia.'); }
  };
})();
