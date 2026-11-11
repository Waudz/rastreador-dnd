
/* Backgrounds de 2014: dados mecânicos e resumos próprios. Não concedem bônus de atributo. */
window.ORIGENS = [
 {id:"acolito",nome:"Acólito",per:["intuicao","religiao"],idiomas:2,ferrEscolhas:0,ferr:[],ouro:15,caracteristica:"Abrigo dos fiéis",descricao:"Sua comunidade religiosa oferece acolhimento e apoio básico a você e aos companheiros, respeitando a sua ligação com a fé.",equip:["Símbolo sagrado","Livro de preces","Incenso (5 varetas)","Vestes","Roupas comuns","Algibeira"]},
 {id:"artesao",ferrTipo:"artesao",nome:"Artesão de guilda",per:["intuicao","persuasao"],idiomas:1,ferrEscolhas:1,ferr:[],ouro:15,caracteristica:"Membro de guilda",descricao:"Sua guilda fornece contatos e apoio profissional. Os deveres e a contribuição à guilda continuam fazendo parte dessa relação.",equip:["Carta de apresentação da guilda","Roupas de viajante","Algibeira"]},
 {id:"artista",nome:"Artista",per:["acrobacia","atuacao"],idiomas:0,ferrEscolhas:1,ferrTipo:"instrumento",ferr:["Kit de disfarce"],ouro:15,caracteristica:"Pela demanda popular",descricao:"Você costuma obter alimentação e alojamento modestos ao se apresentar em locais que apreciam seu trabalho.",equip:["Lembrança de admirador","Traje de apresentação","Algibeira"]},
 {id:"charlatao",nome:"Charlatão",per:["enganacao","prestidigitacao"],idiomas:0,ferrEscolhas:0,ferr:["Kit de disfarce","Kit de falsificação"],ouro:15,caracteristica:"Identidade falsa",descricao:"Você mantém uma segunda identidade, com documentos e relações de apoio, e sabe produzir falsificações que sustentam seus golpes.",equip:["Roupas finas","Adereços para golpes","Algibeira"]},
 {id:"criminoso",nome:"Criminoso",per:["enganacao","furtividade"],idiomas:0,ferrEscolhas:1,ferrTipo:"jogo",ferr:["Ferramentas de ladrão"],ouro:15,caracteristica:"Contato criminal",descricao:"Você dispõe de um contato confiável que pode transmitir mensagens e conectar você ao submundo local.",equip:["Pé de cabra","Roupas comuns escuras com capuz","Algibeira"]},
 {id:"eremita",nome:"Eremita",per:["medicina","religiao"],idiomas:1,ferrEscolhas:0,ferr:["Kit de herbalismo"],ouro:5,caracteristica:"Descoberta",descricao:"Seu isolamento revelou um conhecimento importante. Defina a descoberta e seus efeitos na história com o mestre.",equip:["Estojo de pergaminhos com anotações","Cobertor","Roupas comuns","Algibeira"]},
 {id:"forasteiro",nome:"Forasteiro",per:["atletismo","sobrevivencia"],idiomas:1,ferrEscolhas:1,ferrTipo:"instrumento",ferr:[],ouro:10,caracteristica:"Andarilho",descricao:"Você se orienta bem por mapas e terreno e consegue procurar alimento e água para o grupo onde o ambiente oferece esses recursos.",equip:["Bordão","Armadilha de caça","Troféu de animal","Roupas de viajante","Algibeira"]},
 {id:"heroi",ferrTipo:"artesao",nome:"Herói do povo",per:["adestrar","sobrevivencia"],idiomas:0,ferrEscolhas:1,ferr:["Veículos terrestres"],ouro:10,caracteristica:"Hospitalidade rústica",descricao:"Pessoas comuns costumam oferecer abrigo e ajuda, inclusive para escondê-lo quando isso não as coloca em perigo imediato.",equip:["Pá","Panela de ferro","Roupas comuns","Algibeira"]},
 {id:"marinheiro",nome:"Marinheiro",per:["atletismo","percepcao"],idiomas:0,ferrEscolhas:0,ferr:["Ferramentas de navegador","Veículos aquáticos"],ouro:10,caracteristica:"Passagem de navio",descricao:"Seus contatos marítimos ajudam a conseguir passagem para você e seus companheiros, normalmente com trabalho a bordo.",equip:["Pino de amarração","Corda de seda (15 m)","Amuleto da sorte","Roupas comuns","Algibeira"]},
 {id:"nobre",nome:"Nobre",per:["historia","persuasao"],idiomas:1,ferrEscolhas:1,ferrTipo:"jogo",ferr:[],ouro:25,caracteristica:"Posição privilegiada",descricao:"Seu título abre portas na alta sociedade e facilita o acesso a pessoas de posição, conforme os costumes locais.",equip:["Roupas finas","Anel de sinete","Pergaminho de linhagem","Algibeira"]},
 {id:"orfao",nome:"Órfão",per:["prestidigitacao","furtividade"],idiomas:0,ferrEscolhas:0,ferr:["Kit de disfarce","Ferramentas de ladrão"],ouro:10,caracteristica:"Segredos da cidade",descricao:"Você conhece atalhos urbanos e consegue guiar o grupo por deslocamentos fora de combate com mais rapidez.",equip:["Faca pequena","Mapa da cidade natal","Rato de estimação","Lembrança da família","Roupas comuns","Algibeira"]},
 {id:"sabio",nome:"Sábio",per:["arcanismo","historia"],idiomas:2,ferrEscolhas:0,ferr:[],ouro:10,caracteristica:"Pesquisador",descricao:"Quando não conhece uma informação, você normalmente sabe onde procurar ou quem pode saber a resposta.",equip:["Frasco de tinta","Pena","Faca pequena","Carta de colega","Roupas comuns","Algibeira"]},
 {id:"soldado",nome:"Soldado",per:["atletismo","intimidacao"],idiomas:0,ferrEscolhas:1,ferrTipo:"jogo",ferr:["Veículos terrestres"],ouro:10,caracteristica:"Patente militar",descricao:"Sua antiga patente é reconhecida por aliados da organização militar e pode facilitar o uso de instalações e contatos.",equip:["Insígnia de patente","Troféu de inimigo","Roupas comuns","Algibeira"]},
 {id:"personalizado",nome:"Background personalizado",per:[],perEscolhas:2,idiomas:2,ferrEscolhas:0,ferr:[],ouro:0,caracteristica:"Característica personalizada",descricao:"Escolha duas perícias e uma combinação de dois idiomas ou ferramentas. Combine a característica e o equipamento com o mestre.",equip:[]}
];
window.TRACOS_2014 = {
 "visao no escuro":"Na penumbra, enxerga como se houvesse luz plena; na escuridão, como penumbra. Nessa escuridão distingue tons de cinza, e não cores.",
 "resiliencia ana":"Vantagem nas salvaguardas contra veneno e resistência a dano de veneno.",
 "robustez ana":"Seu máximo de PV aumenta em 1, e aumenta mais 1 para cada nível adquirido. Esse bônus entra no cálculo automático de PV.",
 "treinamento com armaduras":"Proficiência com armaduras leves e médias.",
 "ancestral feerico":"Vantagem nas salvaguardas contra ser enfeitiçado. Magia não pode fazer você dormir.",
 "sentidos agucados":"Proficiência na perícia Percepção. O bônus de proficiência não é somado novamente se outra origem conceder a mesma perícia.",
 "transe":"Em vez de dormir, medita por 4 horas, permanecendo semiconsciente. Essa meditação substitui o sono exigido pelo descanso.",
 "esperteza gnomica":"Vantagem em salvaguardas de Inteligência, Sabedoria e Carisma contra magia.",
 "sortudo":"Ao obter 1 natural em um d20 de ataque, teste de atributo ou salvaguarda, pode rolar o dado novamente e deve usar o novo resultado.",
 "corajoso":"Vantagem nas salvaguardas contra ficar amedrontado.",
 "resiliencia dos robustos":"Vantagem nas salvaguardas contra veneno e resistência a dano de veneno.",
 "resistencia implacavel":"Ao cair a 0 PV sem morrer imediatamente, pode ficar com 1 PV. Recupera o uso após um descanso longo.",
 "ataques selvagens":"Em um acerto crítico com arma corpo a corpo, rola um dado de dano da arma adicional.",
 "versatilidade em pericias":"Escolha duas perícias diferentes para receber proficiência. O criador controla as escolhas disponíveis.",
 "atleta natural":"Proficiência em Atletismo.",
 "passo ligeiro":"Seu deslocamento de caminhada é 10,5 m.",
 "mascara da natureza":"Pode tentar se esconder quando estiver apenas levemente obscurecido por fenômenos naturais.",
 "furtividade natural":"Pode tentar se esconder usando como cobertura uma criatura de tamanho maior que o seu.",
 "sensibilidade a luz solar":"Sob luz solar direta, tem desvantagem nos ataques e nos testes de Percepção que dependem da visão, nas condições desse traço."
};
