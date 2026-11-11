/* Progressões adicionais de 2014. Resumos mecânicos próprios em português. */
window.SUBCLASSES_2014=(()=>{
 const extras=[];
 const sub=(classe,id,nome,descricao,niveis)=>extras.push({classe,id,nome,descricao,niveis});
 sub('Bard','valor','Colégio da Bravura','Bardo marcial que combina inspiração, armas e conjuração.',[
 [3,'Proficiências Adicionais','Recebe proficiência com armaduras médias, escudos e armas marciais.'],
 [3,'Inspiração em Combate','Quem recebe sua Inspiração de Bardo pode somar o dado ao dano de uma arma, ou à CA contra um ataque usando uma reação, após ver a jogada e antes do resultado.'],
 [6,'Ataque Extra','Ao realizar a ação Atacar, pode fazer dois ataques. Ataques extras de diferentes classes não se acumulam.'],
 [14,'Magia de Batalha','Ao usar sua ação para conjurar uma magia de bardo, pode fazer um ataque com arma como ação bônus.']]);
 sub('Druid','moon','Círculo da Lua','Druida que aperfeiçoa a Forma Selvagem para o combate.',[
 [2,'Forma Selvagem de Combate','Pode usar Forma Selvagem como ação bônus. Transformado, pode gastar um espaço de magia como ação bônus para recuperar 1d8 PV por círculo do espaço.'],
 [2,'Formas do Círculo','Pode assumir bestas de ND até 1. A partir do nível 6, o limite é seu nível de druida dividido por 3, arredondado para baixo. As restrições de natação e voo da Forma Selvagem continuam válidas.'],
 [6,'Ataque Primitivo','Os ataques na forma de besta contam como mágicos para superar resistência e imunidade a dano e ataques não mágicos.'],
 [10,'Forma Selvagem Elemental','Pode gastar dois usos de Forma Selvagem de uma vez para assumir a forma de um elemental do ar, terra, fogo ou água.'],
 [14,'Mil Formas','Pode conjurar Alterar-se à vontade.']]);
 sub('Fighter','battle-master','Mestre de Batalha','Guerreiro que usa manobras e dados de superioridade.',[
 [3,'Superioridade em Combate','Começa com quatro dados d8 de superioridade, recuperados em descanso curto ou longo. Aprende três manobras; ganha duas nos níveis 7, 10 e 15. A CD é 8 + proficiência + Força ou Destreza.'],
 [3,'Estudante da Guerra','Escolha proficiência com uma ferramenta de artesão.'],
 [7,'Conheça seu Inimigo','Após observar ou interagir com alguém por um minuto fora de combate, pode comparar duas características com as suas, conforme essa característica. Ganha um quinto dado de superioridade.'],
 [10,'Superioridade Aprimorada','Seus dados de superioridade passam a d10.'],
 [15,'Incansável','Ao rolar iniciativa sem nenhum dado de superioridade, recupera um dado. Ganha um sexto dado de superioridade.'],
 [18,'Superioridade Máxima','Seus dados de superioridade passam a d12.']]);
 sub('Fighter','eldritch-knight','Cavaleiro Místico','Guerreiro com conjuração de mago baseada em Inteligência.',[
 [3,'Conjuração do Cavaleiro Místico','Aprende dois Truques e três magias de mago. Duas dessas magias iniciais devem ser de Abjuração ou Evocação. As escolhas livres aumentam nos níveis 8, 14 e 20. Usa Inteligência para conjurar.'],
 [3,'Vínculo com Arma','Pode vincular até duas armas por um ritual de uma hora. Enquanto não estiver incapacitado, não pode ser desarmado delas; pode chamar uma arma vinculada para a mão com uma ação bônus se estiver no mesmo plano.'],
 [7,'Magia de Guerra','Após usar a ação para conjurar um Truque, pode atacar uma vez com uma arma como ação bônus.'],
 [10,'Golpe Místico','Ao acertar com uma arma, o alvo tem desvantagem na próxima salvaguarda contra uma magia sua antes do fim do seu próximo turno.'],
 [15,'Investida Arcana','Ao usar Surto de Ação, pode se teleportar até 9 m para um espaço desocupado que enxergue, antes ou depois da ação adicional.'],
 [18,'Magia de Guerra Aprimorada','O ataque de ação bônus de Magia de Guerra também pode ser feito após conjurar uma magia de círculo com a ação.']]);
 sub('Rogue','assassin','Assassino','Ladino especializado em surpresa, disfarces e infiltração.',[
 [3,'Proficiências Adicionais','Recebe proficiência com Kit de Disfarce e Kit de Venenos.'],
 [3,'Assassinar','Tem vantagem contra criaturas que ainda não agiram no combate. Todo acerto contra uma criatura surpreendida é crítico; agir antes dela, por si só, não significa que ela está surpreendida.'],
 [9,'Especialista em Infiltração','Pode estabelecer uma identidade falsa em sete dias, gastando 25 PO. Não pode usar essa característica para copiar uma identidade que pertença a outra pessoa.'],
 [13,'Impostor','Após estudar alguém por três horas, pode imitar sua fala, escrita e comportamento. Tem vantagem em Enganação para sustentar essa imitação diante de suspeitas.'],
 [17,'Golpe Mortal','Ao acertar uma criatura surpreendida, ela faz salvaguarda de Constituição contra CD 8 + Destreza + proficiência. Se falhar, o dano do ataque é dobrado.']]);
 sub('Rogue','arcane-trickster','Trapaceiro Arcano','Ladino que combina furtividade com ilusão, encantamento e Mãos Mágicas.',[
 [3,'Conjuração do Trapaceiro Arcano','Aprende Mãos Mágicas, dois outros Truques e três magias de mago. Duas magias iniciais devem ser de Encantamento ou Ilusão. Usa Inteligência. As escolhas livres aumentam nos níveis 8, 14 e 20.'],
 [3,'Prestidigitação com Mãos Mágicas','Pode deixar a mão invisível e manipulá-la com a ação bônus da Ação Ardilosa. Ela pode guardar ou recuperar objetos e usar ferramentas de ladrão à distância.'],
 [9,'Emboscada Mágica','Quando conjura uma magia estando escondido de uma criatura, ela tem desvantagem nas salvaguardas contra essa magia nesse turno.'],
 [13,'Trapaceiro Versátil','Pode usar uma ação bônus para distrair uma criatura a até 1,5 m da mão mágica; tem vantagem nos ataques contra ela até o fim do turno.'],
 [17,'Ladrão de Magias','Uma vez por descanso longo, pode reagir a uma magia que o afete, forçando uma salvaguarda do conjurador contra sua CD. Em falha, nega o efeito sobre você; uma magia de círculo que você possa conjurar pode ser roubada por oito horas.']]);
 sub('Sorcerer','wild-magic','Magia Selvagem','Feiticeiro cuja magia pode produzir surtos imprevisíveis.',[
 [1,'Surto de Magia Selvagem','Depois de conjurar uma magia de feiticeiro de 1º círculo ou superior, o mestre pode pedir um d20. Com 1, role na tabela de Magia Selvagem de 2014. A tabela é resolvida com o mestre.'],
 [1,'Marés do Caos','Pode ganhar vantagem em um ataque, teste de atributo ou salvaguarda. Recupera o uso em descanso longo; o mestre também pode fazê-lo produzir um surto após uma magia de feiticeiro e recuperar esse uso.'],
 [6,'Dobrar a Sorte','Como reação, pode gastar dois pontos de feitiçaria para somar ou subtrair 1d4 do ataque, teste ou salvaguarda de outra criatura que veja a até 18 m, após a rolagem e antes do resultado.'],
 [14,'Caos Controlado','Ao rolar na tabela de Magia Selvagem, role duas vezes e escolha um dos resultados.'],
 [18,'Bombardeio de Magia','Uma vez por turno, se um dado de dano de uma magia mostrar seu valor máximo, role um desses dados novamente e acrescente o resultado ao dano.']]);
 sub('Barbarian','totem-warrior','Trilha do Guerreiro Totêmico','Bárbaro que escolhe espíritos animais para guiar sua fúria.',[
 [3,'Buscador de Espíritos','Pode conjurar Sentido Bestial e Falar com Animais como rituais.'],
 [3,'Espírito Totêmico','Escolha Urso, Águia ou Lobo para modificar os benefícios da Fúria.'],
 [6,'Aspecto da Besta','Escolha um aspecto animal. Ele pode ser diferente do espírito escolhido no nível 3.'],
 [10,'Andarilho Espiritual','Pode conjurar Comunhão com a Natureza como ritual; um espírito animal transmite as informações.'],
 [14,'Sintonia Totêmica','Escolha outro benefício animal, que pode ser de um animal diferente dos escolhidos anteriormente.']]);
 const manobras={
 'Ataque Ameaçador':'Pode amedrontar o alvo ao acertar.', 'Ataque de Empurrão':'Pode empurrar o alvo ao acertar.', 'Ataque de Finta':'Ação bônus: facilita seu próximo ataque próximo.', 'Ataque de Manobra':'Ajuda um aliado a se reposicionar.', 'Ataque de Precisão':'Soma o dado à jogada de ataque.', 'Ataque Desarmante':'Pode fazer o alvo soltar um objeto.', 'Ataque Distrativo':'Favorece o próximo ataque de um aliado.', 'Ataque Provocante':'Dificulta ataques do alvo contra seus aliados.', 'Ataque Trespassante':'Pode causar dano a outro alvo próximo.', 'Derrubar':'Pode deixar o alvo caído ao acertar.', 'Golpe do Comandante':'Permite a um aliado atacar com a reação.', 'Aparar':'Reação: reduz dano corpo a corpo.', 'Encontrão':'Move uma criatura voluntária sem atacar.', 'Investida':'Aumenta o alcance de um ataque corpo a corpo.', 'Movimentação Evasiva':'Soma o dado à CA enquanto se move.', 'Reagrupar':'Concede PV temporários a um aliado.', 'Ripostar':'Reação: contra-ataca após um erro corpo a corpo.'};
 function aplicar(d){
  const idc=c=>'srd51:class/'+c.toLowerCase();
  for(const x of extras){const sid='phb2014:subclass/'+x.id;if(d.subclasses.some(s=>s.id===sid))continue;const niveis=[];
   x.niveis.forEach(([level,nome,descricao],i)=>{const id='phb2014:feature/'+x.id+'-'+i;d.features.push({id,nome,descricao,en:nome,desc:descricao,effects:[],data:{class:idc(x.classe),subclass:sid,level}});let l=niveis.find(l=>l.level===level);if(!l)niveis.push(l={level,features:[]});l.features.push(id);});
   d.subclasses.push({id:sid,parent:idc(x.classe),nome:x.nome,descricao:x.descricao,data:{levels:niveis,spells:[],expanded:[]}});
  }
  const ferramentas={'alchemists-supplies':'Suprimentos de Alquimista','brewers-supplies':'Suprimentos de Cervejeiro','calligraphers-supplies':'Suprimentos de Calígrafo','carpenters-tools':'Ferramentas de Carpinteiro','cartographers-tools':'Ferramentas de Cartógrafo','cobblers-tools':'Ferramentas de Sapateiro','cooks-utensils':'Utensílios de Cozinheiro','glassblowers-tools':'Ferramentas de Vidraceiro','jewelers-tools':'Ferramentas de Joalheiro','leatherworkers-tools':'Ferramentas de Coureiro','masons-tools':'Ferramentas de Pedreiro','painters-supplies':'Suprimentos de Pintor','potters-tools':'Ferramentas de Oleiro','smiths-tools':'Ferramentas de Ferreiro','tinkers-tools':'Ferramentas de Funileiro','weavers-tools':'Ferramentas de Tecelão','woodcarvers-tools':'Ferramentas de Entalhador'};
  d.items.forEach(i=>{const n=ferramentas[i.id.split('/').pop()];if(n)i.nome=n;});
  const estudo=d.features.find(h=>h.id==='phb2014:feature/battle-master-1');if(estudo&&!estudo.effects.length)estudo.effects.push({type:'choice',id:'ferramenta',choose:1,grants:'proficiency',from:d.items.filter(i=>i.data.tool?.category==='artisans-tools').map(i=>i.id)});
  const mao=d.features.find(h=>h.id==="phb2014:feature/arcane-trickster-0");if(mao&&!mao.effects.length)mao.effects.push({type:"grantSpell",spell:"srd51:spell/mage-hand",minLevel:3});
  const escolhas=(subid,indice,qtd,opcoes,grants='trait')=>{const h=d.features.find(h=>h.id==='phb2014:feature/'+subid+'-'+indice);if(!h||h.effects.length)return;const from=[];for(const [i,[nome,descricao]]of opcoes.entries()){const id=h.id+'-opcao-'+i;from.push(id);d.features.push({id,parent:h.id,nome,descricao,en:nome,desc:descricao,effects:[],data:{...h.data}});}h.effects.push({type:'choice',id:'escolha',choose:qtd,grants,from,uniqueByName:subid==="battle-master",titulo:subid==='battle-master'?'Manobras de Combate · Nível '+h.data.level:h.nome});};
  escolhas('battle-master',0,3,Object.entries(manobras));
  for(const [indice,n]of [[2,7],[3,10],[4,15]])escolhas('battle-master',indice,2,Object.entries(manobras));
  escolhas('totem-warrior',1,1,[['Urso','Durante a Fúria, tem resistência a todo dano, exceto psíquico.'],['Águia','Na Fúria e sem armadura pesada, pode Disparar como ação bônus; ataques de oportunidade contra você têm desvantagem.'],['Lobo','Na Fúria, aliados têm vantagem em ataques corpo a corpo contra inimigos a até 1,5 m de você.']]);
  escolhas('totem-warrior',2,1,[['Urso','Dobra sua capacidade de carga; tem vantagem em testes de Força para empurrar, puxar, erguer e quebrar objetos.'],['Águia','Enxerga com precisão até cerca de 1,5 km; penumbra não impõe desvantagem em Percepção visual.'],['Lobo','Pode rastrear em ritmo rápido e mover-se furtivamente em ritmo normal de viagem.']]);
  escolhas('totem-warrior',4,1,[['Urso','Na Fúria, inimigos próximos têm desvantagem contra outros alvos, salvo criaturas imunes a medo ou que não percebam você.'],['Águia','Na Fúria, pode voar pelo seu deslocamento de caminhada durante o turno; cai ao encerrar o turno no ar sem outro apoio.'],['Lobo','Na Fúria, após acertar um ataque corpo a corpo pode usar ação bônus para derrubar uma criatura Grande ou menor.']]);
 }
 return{aplicar,extras};
})();
