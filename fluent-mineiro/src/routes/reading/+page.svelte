<script lang="ts">
  interface ReadingPassage {
    title: string;
    level: string;
    text: string;
    questions: { question: string; options: string[]; correct: number; explanation: string }[];
    vocab: { word: string; meaning: string }[];
  }

  const passages: ReadingPassage[] = [
    {
      title: 'O Cafezinho Mineiro',
      level: 'A2',
      text: `Maria mora em Belo Horizonte e todo dia ela acorda às seis da manhã. A primeira coisa que ela faz é preparar um cafezinho bem forte. Em Minas Gerais, o café é muito importante — não é só uma bebida, é um jeito de mostrar carinho.

Quando alguém visita a casa de Maria, ela sempre oferece café com pão de queijo. "Cê quer um cafezinho?" ela pergunta, com um sorriso. Ninguém recusa, porque o café mineiro é o melhor do Brasil. Pelo menos, é o que os mineiros acham!

Depois do café, Maria vai trabalhar. Ela é professora em uma escola perto de casa. No caminho, ela passa pelo Mercado Central para comprar frutas frescas. "Bom dia, dona Maria!" dizem os vendedores. "Tudo bão?" ela responde, no jeito mineiro.`,
      questions: [
        { question: 'A que horas Maria acorda?', options: ['Cinco da manhã', 'Seis da manhã', 'Sete da manhã', 'Oito da manhã'], correct: 1, explanation: 'O texto diz: "todo dia ela acorda às seis da manhã".' },
        { question: 'O que Maria oferece aos visitantes?', options: ['Suco e bolo', 'Café com pão de queijo', 'Chá com biscoito', 'Água e fruta'], correct: 1, explanation: '"Ela sempre oferece café com pão de queijo."' },
        { question: 'Qual é a profissão de Maria?', options: ['Médica', 'Vendedora', 'Professora', 'Cozinheira'], correct: 2, explanation: '"Ela é professora em uma escola perto de casa."' },
        { question: 'O que "Tudo bão?" significa?', options: ['Tudo bom? (Mineiro)', 'Tudo bonito?', 'Tudo grande?', 'Tudo pronto?'], correct: 0, explanation: '"Bão" é a forma mineira de "bom". "Tudo bão?" = "Tudo bom?"' },
      ],
      vocab: [
        { word: 'cafezinho', meaning: 'small strong coffee' },
        { word: 'carinho', meaning: 'affection, care' },
        { word: 'recusa', meaning: 'refuses' },
        { word: 'vendedores', meaning: 'sellers, vendors' },
      ],
    },
    {
      title: 'Um Dia em Ouro Preto',
      level: 'A2',
      text: `Lucas e Ana decidiram visitar Ouro Preto no fim de semana. A cidade fica a duas horas de Belo Horizonte, nas montanhas de Minas Gerais. Ouro Preto é famosa pela arquitetura colonial e pela história do ouro.

Eles chegaram de manhã cedo e caminharam pelas ruas de pedra. "Nó, que cidade bonita!" disse Ana. As igrejas barrocas são impressionantes, especialmente a Igreja de São Francisco de Assis.

Na hora do almoço, eles foram a um restaurante típico. Lucas pediu feijão tropeiro com couve e arroz. Ana escolheu frango com quiabo. "Uai, a comida mineira é demais da conta!" disse Lucas.

Antes de voltar para BH, eles compraram doces artesanais na feira. Doce de leite, goiabada, e cocada. "Vamos ter que voltar outro dia," disse Ana. "Tem tanta coisa pra ver ainda!"`,
      questions: [
        { question: 'Quanto tempo leva de BH a Ouro Preto?', options: ['Uma hora', 'Duas horas', 'Três horas', 'Quatro horas'], correct: 1, explanation: '"A cidade fica a duas horas de Belo Horizonte."' },
        { question: 'Por que Ouro Preto é famosa?', options: ['Praias bonitas', 'Comida japonesa', 'Arquitetura colonial e ouro', 'Futebol'], correct: 2, explanation: '"Ouro Preto é famosa pela arquitetura colonial e pela história do ouro."' },
        { question: 'O que Lucas pediu para almoçar?', options: ['Pizza', 'Feijão tropeiro com couve', 'Sushi', 'Hambúrguer'], correct: 1, explanation: '"Lucas pediu feijão tropeiro com couve e arroz."' },
        { question: 'O que eles compraram na feira?', options: ['Roupas', 'Livros', 'Doces artesanais', 'Sapatos'], correct: 2, explanation: '"Eles compraram doces artesanais na feira."' },
      ],
      vocab: [
        { word: 'pedra', meaning: 'stone' },
        { word: 'impressionantes', meaning: 'impressive' },
        { word: 'couve', meaning: 'collard greens' },
        { word: 'artesanais', meaning: 'artisanal, handmade' },
      ],
    },
    {
      title: 'A Festa Junina',
      level: 'B1',
      text: `Todo mês de junho, o Brasil inteiro celebra as Festas Juninas. Em Minas Gerais, as festas são especialmente animadas. As cidades se enfeitam com bandeirinhas coloridas, e o cheiro de comida típica toma conta das ruas.

As comidas são a melhor parte: pamonha, curau, canjica, milho cozido, quentão, e vinho quente. Tudo feito com milho, que é colhido nessa época do ano. Os mineiros dizem que a pamonha de Minas é a melhor do Brasil — e ninguém discorda, pelo menos não na frente de um mineiro!

As pessoas se vestem de "caipira" — camisa xadrez, chapéu de palha, e dente pintado de preto. Há quadrilhas, que são danças tradicionais com casais que seguem os comandos de um narrador: "Olha a cobra! É mentira!"

Para muitos brasileiros, a Festa Junina é tão importante quanto o Carnaval. É uma celebração da cultura rural, da colheita, e da comunidade. Em Minas, especialmente, é quando o mineiro mostra o que faz de melhor: receber bem e alimentar todo mundo.`,
      questions: [
        { question: 'Em que mês acontecem as Festas Juninas?', options: ['Janeiro', 'Março', 'Junho', 'Dezembro'], correct: 2, explanation: '"Todo mês de junho, o Brasil inteiro celebra as Festas Juninas."' },
        { question: 'Qual ingrediente principal das comidas juninas?', options: ['Arroz', 'Trigo', 'Milho', 'Mandioca'], correct: 2, explanation: '"Tudo feito com milho, que é colhido nessa época do ano."' },
        { question: 'O que é uma "quadrilha" na Festa Junina?', options: ['Um grupo de bandidos', 'Uma dança tradicional', 'Uma comida típica', 'Um tipo de música'], correct: 1, explanation: '"Há quadrilhas, que são danças tradicionais com casais."' },
        { question: 'O texto compara a Festa Junina com qual outra celebração?', options: ['Natal', 'Carnaval', 'Páscoa', 'Ano Novo'], correct: 1, explanation: '"A Festa Junina é tão importante quanto o Carnaval."' },
      ],
      vocab: [
        { word: 'bandeirinhas', meaning: 'small flags, bunting' },
        { word: 'colhido', meaning: 'harvested' },
        { word: 'palha', meaning: 'straw' },
        { word: 'colheita', meaning: 'harvest' },
      ],
    },
    {
      title: 'Trabalho Remoto no Interior de Minas',
      level: 'B1',
      text: `Depois da pandemia, Rafael decidiu sair de São Paulo e se mudar para uma cidade pequena no interior de Minas Gerais. Ele trabalha como programador e pode fazer tudo pelo computador. "Não preciso mais ficar preso no trânsito de São Paulo," ele explica.

A cidade onde ele mora, São Thomé das Letras, tem apenas cinco mil habitantes. A internet é boa o suficiente para videochamadas, e o custo de vida é muito menor. O aluguel que ele pagava em São Paulo por um apartamento pequeno agora paga uma casa com quintal e vista para as montanhas.

Mas nem tudo é perfeito. Rafael sente falta dos amigos e da variedade de restaurantes e eventos culturais. "Aqui tem dois restaurantes e um bar," ele ri. "Mas a comida é caseira e muito mais gostosa."

O que ele mais gosta é a tranquilidade. "De manhã, eu tomo café olhando as montanhas. À noite, dá pra ver as estrelas. Em São Paulo, eu mal via o céu." Para Rafael, a troca valeu a pena. "Qualidade de vida não tem preço."`,
      questions: [
        { question: 'Por que Rafael pôde se mudar para o interior?', options: ['Ele se aposentou', 'Ele trabalha remotamente', 'Ele perdeu o emprego', 'Ele herdou uma fazenda'], correct: 1, explanation: '"Ele trabalha como programador e pode fazer tudo pelo computador."' },
        { question: 'Quantos habitantes tem São Thomé das Letras?', options: ['Mil', 'Cinco mil', 'Cinquenta mil', 'Quinhentos mil'], correct: 1, explanation: '"A cidade tem apenas cinco mil habitantes."' },
        { question: 'Do que Rafael sente falta?', options: ['Do trânsito', 'Dos amigos e da variedade cultural', 'Do trabalho presencial', 'Da poluição'], correct: 1, explanation: '"Rafael sente falta dos amigos e da variedade de restaurantes e eventos culturais."' },
        { question: 'O que Rafael diz sobre qualidade de vida?', options: ['É cara', 'Não tem preço', 'Não é importante', 'É igual em todo lugar'], correct: 1, explanation: '"Qualidade de vida não tem preço."' },
      ],
      vocab: [
        { word: 'preso no trânsito', meaning: 'stuck in traffic' },
        { word: 'quintal', meaning: 'backyard' },
        { word: 'caseira', meaning: 'homemade' },
        { word: 'valeu a pena', meaning: 'was worth it' },
      ],
    },
  ];

  let selectedPassage = $state<ReadingPassage | null>(null);
  let currentQuestion = $state(0);
  let selectedAnswer = $state<number | null>(null);
  let showResult = $state(false);
  let score = $state(0);
  let quizDone = $state(false);
  let showVocab = $state(false);

  function selectPassage(p: ReadingPassage) {
    selectedPassage = p;
    currentQuestion = 0;
    selectedAnswer = null;
    showResult = false;
    score = 0;
    quizDone = false;
    showVocab = false;
  }

  function answerQuestion(idx: number) {
    if (showResult) return;
    selectedAnswer = idx;
    showResult = true;
    if (idx === selectedPassage!.questions[currentQuestion].correct) {
      score++;
    }
  }

  function nextQuestion() {
    if (currentQuestion + 1 >= selectedPassage!.questions.length) {
      quizDone = true;
      return;
    }
    currentQuestion++;
    selectedAnswer = null;
    showResult = false;
  }

  function backToList() {
    selectedPassage = null;
  }
</script>

<div class="max-w-3xl mx-auto p-6">
  {#if !selectedPassage}
    <!-- Passage Selection -->
    <h2 class="font-display text-2xl font-bold mb-2">📖 Leitura</h2>
    <p class="text-sm text-cafe-secondary mb-6">Leia textos em português e responda perguntas de compreensão</p>

    <div class="space-y-3">
      {#each passages as passage, i}
        <button
          onclick={() => selectPassage(passage)}
          class="w-full text-left p-4 bg-white border border-border rounded-xl hover:border-terracotta hover:-translate-y-0.5 hover:shadow-md transition-all duration-150"
        >
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold text-sm">{passage.title}</h3>
              <p class="text-xs text-cafe-muted mt-1">{passage.questions.length} perguntas · {passage.vocab.length} palavras novas</p>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-pedra-subtle {passage.level === 'A2' ? 'text-serra' : 'text-terracotta'}">{passage.level}</span>
          </div>
        </button>
      {/each}
    </div>

  {:else if !quizDone}
    <!-- Reading + Questions -->
    <div class="flex items-center gap-3 mb-4">
      <button onclick={backToList} class="text-cafe-muted hover:text-cafe transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div>
        <h2 class="font-display text-lg font-bold">{selectedPassage.title}</h2>
        <p class="text-xs text-cafe-muted">{selectedPassage.level} · Pergunta {currentQuestion + 1}/{selectedPassage.questions.length}</p>
      </div>
    </div>

    <!-- Vocab toggle -->
    <button
      onclick={() => showVocab = !showVocab}
      class="mb-3 text-xs px-3 py-1.5 border border-ouro/30 rounded-lg text-ouro hover:bg-ouro/10 transition-colors"
    >
      {showVocab ? '📕 Esconder vocabulário' : '📖 Mostrar vocabulário'}
    </button>

    {#if showVocab}
      <div class="mb-4 bg-ouro/10 border border-ouro/20 rounded-xl p-3">
        <div class="grid grid-cols-2 gap-2">
          {#each selectedPassage.vocab as v}
            <div class="text-xs">
              <span class="font-semibold text-cafe">{v.word}</span>
              <span class="text-cafe-muted"> — {v.meaning}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Text -->
    <div class="bg-white border border-border rounded-xl p-5 mb-6 text-sm leading-relaxed text-cafe whitespace-pre-line">
      {selectedPassage.text}
    </div>

    <!-- Question -->
    <div class="bg-white border border-border rounded-xl p-5">
      <p class="font-semibold text-sm mb-4">{selectedPassage.questions[currentQuestion].question}</p>
      <div class="space-y-2">
        {#each selectedPassage.questions[currentQuestion].options as option, idx}
          <button
            onclick={() => answerQuestion(idx)}
            disabled={showResult}
            class="w-full p-3 text-left border rounded-xl text-sm font-medium transition-colors
              {showResult && idx === selectedPassage.questions[currentQuestion].correct
                ? 'border-serra bg-serra/10 text-serra'
                : showResult && idx === selectedAnswer && idx !== selectedPassage.questions[currentQuestion].correct
                  ? 'border-error bg-error/10 text-error'
                  : 'border-border hover:border-terracotta'}"
          >
            {option}
          </button>
        {/each}
      </div>

      {#if showResult}
        <div class="mt-4 p-3 rounded-lg text-sm {selectedAnswer === selectedPassage.questions[currentQuestion].correct ? 'bg-serra/10 text-serra' : 'bg-error/10 text-error'}">
          <span class="font-bold">{selectedAnswer === selectedPassage.questions[currentQuestion].correct ? '✅ Correto!' : '❌ Incorreto.'}</span>
          <span class="ml-1">{selectedPassage.questions[currentQuestion].explanation}</span>
        </div>
        <button
          onclick={nextQuestion}
          class="mt-4 w-full py-2.5 bg-serra text-white font-semibold rounded-xl hover:bg-serra-dark transition-colors"
        >
          {currentQuestion + 1 >= selectedPassage.questions.length ? 'Ver resultado' : 'Próxima pergunta →'}
        </button>
      {/if}
    </div>

  {:else}
    <!-- Quiz Complete -->
    <div class="text-center py-12">
      <div class="text-5xl mb-4">📖</div>
      <h2 class="font-display text-2xl font-bold mb-2">Leitura completa!</h2>
      <p class="text-xl font-display font-bold mb-1 {score === selectedPassage.questions.length ? 'text-serra' : score >= selectedPassage.questions.length / 2 ? 'text-ouro' : 'text-error'}">
        {score}/{selectedPassage.questions.length} corretas
      </p>
      <p class="text-sm text-cafe-muted mb-6">
        {score === selectedPassage.questions.length ? 'Perfeito! Compreensão excelente.' : score >= selectedPassage.questions.length / 2 ? 'Bom trabalho! Continue praticando.' : 'Tente ler o texto novamente com mais atenção.'}
      </p>
      <div class="flex gap-3 justify-center">
        <button
          onclick={() => selectPassage(selectedPassage!)}
          class="px-6 py-2.5 border border-border font-semibold rounded-xl hover:bg-pedra-subtle transition-colors"
        >
          Tentar de novo
        </button>
        <button
          onclick={backToList}
          class="px-6 py-2.5 bg-terracotta text-white font-semibold rounded-xl hover:bg-terracotta-dark transition-colors"
        >
          Outro texto
        </button>
      </div>
    </div>
  {/if}
</div>
