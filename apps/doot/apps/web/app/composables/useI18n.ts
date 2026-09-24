/**
 * Lightweight reactive i18n composable for Doot.
 * Supports switching between English (default) and Português do Brasil (pt-BR).
 * Persisted in localStorage ('doot:locale').
 */
import { computed, ref, watch } from 'vue'

export type Locale = 'pt-BR' | 'en'

const STORAGE_KEY = 'doot:locale'

const translations: Record<Locale, Record<string, string>> = {
  'pt-BR': {
    // Navigation & Shell
    'nav.home': 'Início',
    'nav.explore': 'Explorar',
    'nav.create': 'Criar',
    'nav.decks': 'Baralhos',
    'nav.yourGames': 'Seus Jogos',
    'nav.saved': 'Salvos',
    'nav.support': 'Suporte',
    'nav.theme': 'tema',
    'nav.language': 'idioma',
    'nav.login': 'Entrar',
    'nav.signup': 'Cadastrar',
    'nav.logout': 'Sair',

    // Hero / Home Page
    'hero.tag': 'Projete na TV, jogue pelo celular',
    'hero.titlePre': 'Coloque o jogo no ',
    'hero.titleHighlight': 'telão.',
    'hero.titlePost': ' Todos jogam pelo celular.',
    'hero.lead': 'O Doot traz dinâmicas interativas para qualquer turma. Faça trivias, desenhos rápidos, enquetes e jogos Jackbox em sala. Sem aplicativo para instalar, sem necessidade de login para os alunos jogarem.',
    'hero.codePlaceholder': 'CÓDIGO',
    'hero.joinBtn': 'Entrar',
    'hero.browseBtn': 'Ver jogos',
    'hero.hostedBy': 'Usado por professores, alunos e turmas Wizard',
    'home.flagships': 'Destaques para Turmas',
    'home.flagshipsLead': 'Jogos prontos para dinamizar sua aula: trivia, desenho, blefe e cooperação.',
    'home.freshCreators': 'Criados pela Comunidade',
    'home.featured': 'Destaque',
    'home.by': 'por',
    'home.plays': 'partidas',
    'home.exploreAll': 'Ver todos os jogos →',

    // Player Join / Gate
    'join.roomCode': 'Código da sala',
    'join.codePlaceholder': 'ex: ABCD',
    'join.yourName': 'Seu nome',
    'join.namePlaceholder': 'Como quer ser chamado?',
    'join.joinGame': 'Entrar no jogo',
    'join.justWatch': 'Apenas assistir (plateia)',
    'join.enterCodeErr': 'Digite o código de 4 letras da sala.',
    'join.enterNameErr': 'Escolha um nome para participar.',
    'join.checking': 'Verificando sala…',
    'join.roomFullTitle': 'A sala está cheia',
    'join.roomFullDesc': 'Esta sala atingiu o limite de participantes. Mas você ainda pode assistir como plateia!',
    'join.watchAudience': 'Assistir como plateia',
    'join.nameTakenTitle': 'Já existe alguém usando esse nome',
    'join.nameTakenDesc': 'Se você se desconectou, toque em Reconectar. Caso contrário, escolha outro nome.',
    'join.reconnect': 'Reconectar com este nome',
    'join.pickDifferent': 'Escolher outro nome',
    'join.reconnecting': 'Reconectando… suas respostas estão salvas.',
    'join.hostGone': 'A tela do professor foi desconectada. Aguardando retorno…',
    'join.notFound': 'Não encontramos a sala {code}',
    'join.notFoundDesc': 'Confira o código no telão ou verifique se a partida já terminou.',
    'join.backToStart': 'Voltar ao início',
    'join.joiningRoom': 'Entrando na sala {code}…',

    // Player In-Game
    'player.youAreIn': 'Você entrou!',
    'player.waitingHost': 'Aguardando o professor iniciar a partida.',
    'player.pickTeam': 'Escolha sua equipe',
    'player.yourTeam': 'Sua equipe',
    'player.mcBadge': 'Você é o MC',
    'player.mcLead': 'Você comanda esta rodada. Inicie quando todos estiverem prontos.',
    'player.startGame': 'Iniciar jogo →',
    'player.lockItIn': 'Confirmar resposta',
    'player.lockedIn': 'Confirmado!',
    'player.waitingOthers': 'Aguardando os outros alunos…',
    'player.watchScreen': 'Olhe para o telão',
    'player.answersOpen': 'Respostas abertas!',
    'player.answersLocked': 'Respostas encerradas!',
    'player.resultsUp': 'Resultados na tela!',
    'player.roundOf': 'Rodada {current} de {total}',
    'player.finalResults': 'Placar final no telão!',

    // Host Controls
    'host.roundOf': 'Rodada {current} / {total}',
    'host.round': 'Rodada',
    'host.lockedIn': 'responderam',
    'host.allIn': 'todos responderam ✓',
    'host.startGame': 'Iniciar Jogo',
    'host.nextRound': 'Próxima Rodada',
    'host.next': 'Próximo →',
    'host.openVoting': 'Abrir votação',
    'host.collectAnswers': 'Coletar respostas',
    'host.lockAnswers': 'Encerrar respostas',
    'host.lockVoting': 'Encerrar votação',
    'host.startVote': 'Iniciar a votação →',
    'host.reveal': 'Revelar Resposta',
    'host.showScores': 'Ver Placar',
    'host.finalResults': 'Resultados Finais',
    'host.playAgain': 'Jogar Novamente',
    'host.newRoom': 'Nova Sala',
    'host.pickAnother': 'Escolher Outro Jogo',
    'host.home': 'Início',
    'host.playAgainHint': 'Jogar Novamente mantém a turma e zera o placar. Nova Sala cria um novo grupo.',
    'host.joinInstructions': 'Entre pelo celular em',
    'host.orScan': 'ou aponte a câmera para o QR Code',
    'host.teams': 'Equipes',
    'host.playInTeams': 'Jogar em equipes',
    'host.autoBalance': 'Equilibrar equipes',
    'host.teamNote': 'Alunos escolhem uma equipe no celular, ou toque em Equilibrar para dividir igualmente.',
    'host.inTheRoom': 'Na sala',
    'host.joined': 'conectados',
    'host.watching': 'assistindo',
    'host.adjustTonight': 'Ajustes para a partida',
    'host.limitJoin': 'Limitar quantidade de participantes',
    'host.turnOffTimers': 'Desativar cronômetro das rodadas',
    'host.autoAdvance': 'Avançar assim que todos responderem',
    'host.sfx': 'Efeitos sonoros nesta tela',
    'host.whoDrives': 'Quem comanda o jogo',
    'host.justMe': 'Apenas eu (professor)',
    'host.firstDrives': 'Primeiro aluno a entrar comanda',
    'host.lateJoinNote': 'Alunos que entrarem após o início jogam a partir da rodada em que entraram.',
    'host.takeBack': 'Retomar controle',
    'host.isDriving': '{name} está comandando pelo celular',
    'host.howScoringWorks': 'Como funciona a pontuação',
    'host.playersInLobby': 'Alunos conectados',
    'host.getReady': 'Prepare-se',
    'host.votingOpen': 'Votação aberta',
    'host.answersOpen': 'Respostas abertas',
    'host.votingClosed': 'Votação encerrada',
    'host.answersIn': 'Respostas enviadas',
    'host.results': 'Resultados',

    // Connect with Any AI / LLM
    'connect.title': 'Conectar com Qualquer IA',
    'connect.kicker': 'Crie com Inteligência Artificial',
    'connect.lead': 'Conecte sua IA favorita (Claude, ChatGPT, Cursor, Windsurf, Gemini ou modelos locais) ao Doot via Model Context Protocol (MCP) ou OpenAPI. Ela cria jogos interativos e salva direto na sua conta.',
    'connect.tokenSectionTitle': 'Chave de Acesso Pessoal (API Key)',
    'connect.tokenSectionDesc': 'Use esta chave Bearer para autenticar Cursor, Windsurf, ChatGPT Actions, Gemini ou ferramentas locais sem precisar de login popup.',
    'connect.tokenGenerated': 'Sua chave de acesso:',
    'connect.generateToken': 'Gerar Nova Chave',
    'connect.copyToken': 'Copiar Chave',
    'connect.tokenCopied': 'Chave copiada!',
    'connect.loginToGetToken': 'Faça login com sua conta para gerar sua chave de API pessoal.',
    'connect.tabClaude': 'Claude',
    'connect.tabChatGPT': 'ChatGPT / OpenAI',
    'connect.tabCursor': 'Cursor & Windsurf',
    'connect.tabGemini': 'Gemini',
    'connect.tabLocal': 'Modelos Locais & Outros',
    'connect.step1': '1. Conectar a IA ao Doot',
    'connect.step2': '2. Peça para a IA criar o jogo',
    'connect.step3': '3. Pronto para jogar na sala',
    'connect.step2Desc': 'Diga o que você quer em linguagem natural. A IA lê o formato do Doot, cria as rodadas com o tema escolhido e envia direto para sua conta.',
    'connect.step3Desc': 'O jogo fica salvo na sua conta com link direto para apresentar no telão ou editar no estúdio.',
    'connect.examplePromptLabel': 'Exemplo de comando:',
    'connect.examplePromptText': 'Crie um jogo de perguntas e respostas no Doot sobre expressões idiomáticas em inglês para alunos da Wizard, com 5 rodadas no formato guess, tema wizard e salve na minha conta.',
    'connect.note': 'Sua própria IA faz o trabalho no formato nativo do Doot, então os jogos ficam prontos para jogar na hora. Você pode revogar o acesso a qualquer momento.',
    'create.buildWithAi': 'Criar com IA (Qualquer LLM)',
    'create.buildWithAiDesc': 'Conecte Claude, ChatGPT, Cursor, Gemini ou qualquer IA para escrever o jogo para você.',
  },
  'en': {
    // Navigation & Shell
    'nav.home': 'Home',
    'nav.explore': 'Explore',
    'nav.create': 'Create',
    'nav.decks': 'Decks',
    'nav.yourGames': 'Your Games',
    'nav.saved': 'Saved',
    'nav.support': 'Support',
    'nav.theme': 'theme',
    'nav.language': 'language',
    'nav.login': 'Log in',
    'nav.signup': 'Sign up',
    'nav.logout': 'Log out',

    // Hero / Home Page
    'hero.tag': 'Host on a screen, play on your phone',
    'hero.titlePre': 'Put a game on the ',
    'hero.titleHighlight': 'big screen.',
    'hero.titlePost': ' Everyone joins from their phone.',
    'hero.lead': 'Doot runs party games for any room. Host trivia at the bar, guess characters at a con panel, run a live poll in class, or start something silly on the TV. No app to install, no account to play.',
    'hero.codePlaceholder': 'ENTER CODE',
    'hero.joinBtn': 'Join',
    'hero.browseBtn': 'Browse games',
    'hero.hostedBy': 'Hosted by teachers, students, and friends',
    'home.flagships': 'Party Flagships',
    'home.flagshipsLead': 'Turnkey games for any room: trivia, drawing, party bluffing, and co-op arcade.',
    'home.freshCreators': 'Fresh from creators',
    'home.featured': 'Featured',
    'home.by': 'by',
    'home.plays': 'plays',
    'home.exploreAll': 'Explore all games →',

    // Player Join / Gate
    'join.roomCode': 'Room code',
    'join.codePlaceholder': 'e.g. ABCD',
    'join.yourName': 'Your name',
    'join.namePlaceholder': 'What should we call you?',
    'join.joinGame': 'Join game',
    'join.justWatch': 'Just watch (audience)',
    'join.enterCodeErr': 'Enter the 4-character room code.',
    'join.enterNameErr': 'Pick a name so others know who you are.',
    'join.checking': 'Checking room…',
    'join.roomFullTitle': 'Room is full',
    'join.roomFullDesc': 'This room has reached its player cap. You can still watch as audience!',
    'join.watchAudience': 'Watch as audience',
    'join.nameTakenTitle': 'Someone is already using that name',
    'join.nameTakenDesc': 'If you got disconnected, tap Reconnect. Otherwise pick another name.',
    'join.reconnect': 'Reconnect as this name',
    'join.pickDifferent': 'Pick a different name',
    'join.reconnecting': 'Reconnecting… your answers are safe.',
    'join.hostGone': "The host's screen went away. Waiting for them to come back…",
    'join.notFound': "Can't find room {code}",
    'join.notFoundDesc': 'Double-check the code with the host, or the room may have ended.',
    'join.backToStart': 'Back to start',
    'join.joiningRoom': 'Joining room {code}…',

    // Player In-Game
    'player.youAreIn': 'You are in!',
    'player.waitingHost': 'Waiting for the host to start.',
    'player.pickTeam': 'Pick your team',
    'player.yourTeam': 'Your team',
    'player.mcBadge': "You're the MC",
    'player.mcLead': "You're the MC. Kick it off when everyone's in.",
    'player.startGame': 'Start game →',
    'player.lockItIn': 'Lock it in',
    'player.lockedIn': 'Locked in!',
    'player.waitingOthers': 'Waiting for everyone else…',
    'player.watchScreen': 'Watch the big screen',
    'player.answersOpen': 'Answers open!',
    'player.answersLocked': 'Answers are locked!',
    'player.resultsUp': 'Results are up!',
    'player.roundOf': 'Round {current} of {total}',
    'player.finalResults': 'Final results are up!',

    // Host Controls
    'host.roundOf': 'Round {current} / {total}',
    'host.round': 'Round',
    'host.lockedIn': 'locked in',
    'host.allIn': 'in ✓',
    'host.startGame': 'Start Game',
    'host.nextRound': 'Next Round',
    'host.next': 'Next →',
    'host.openVoting': 'Open voting',
    'host.collectAnswers': 'Collect answers',
    'host.lockAnswers': 'Lock answers',
    'host.lockVoting': 'Lock voting',
    'host.startVote': 'Start the vote →',
    'host.reveal': 'Reveal Answer',
    'host.showScores': 'Show Standings',
    'host.finalResults': 'Final Results',
    'host.playAgain': 'Play Again',
    'host.newRoom': 'New Room',
    'host.pickAnother': 'Pick Another Game',
    'host.home': 'Home',
    'host.playAgainHint': 'Play again keeps this crowd and resets scores. New room starts a fresh group.',
    'host.joinInstructions': 'Join on your phone at',
    'host.orScan': 'or scan the QR code',
    'host.teams': 'Teams',
    'host.playInTeams': 'Play in teams',
    'host.autoBalance': 'Auto-balance',
    'host.teamNote': 'Players pick a team on their phones, or tap Auto-balance to split them evenly.',
    'host.inTheRoom': 'In the room',
    'host.joined': 'joined',
    'host.watching': 'watching',
    'host.adjustTonight': 'Adjust for tonight',
    'host.limitJoin': 'Limit how many can join',
    'host.turnOffTimers': 'Turn off round timers',
    'host.autoAdvance': 'Advance as soon as everyone has answered',
    'host.sfx': 'Sound effects on this screen',
    'host.whoDrives': 'Who drives the game',
    'host.justMe': 'Just me (host)',
    'host.firstDrives': 'Let the first to join drive',
    'host.lateJoinNote': 'Players who join after you start can only play rounds from when they joined.',
    'host.takeBack': 'Take back',
    'host.isDriving': '{name} is driving from their phone',
    'host.howScoringWorks': 'How scoring works',
    'host.playersInLobby': 'Players in the room',
    'host.getReady': 'Get ready',
    'host.votingOpen': 'Voting open',
    'host.answersOpen': 'Answers open',
    'host.votingClosed': 'Voting closed',
    'host.answersIn': 'Answers in',
    'host.results': 'Results',

    // Connect with Any AI / LLM
    'connect.title': 'Connect Any AI / LLM',
    'connect.kicker': 'Build with AI',
    'connect.lead': 'Link your favorite AI to Doot via Model Context Protocol (MCP) or OpenAPI. It builds games for you, validates rules, and saves them straight to your account, with zero inference cost to Doot.',
    'connect.tokenSectionTitle': 'Personal Access Token (API Key)',
    'connect.tokenSectionDesc': 'Use this Bearer token to connect Cursor, Windsurf, ChatGPT Actions, Gemini, or local tools without needing browser popups.',
    'connect.tokenGenerated': 'Your access token:',
    'connect.generateToken': 'Generate New Key',
    'connect.copyToken': 'Copy Key',
    'connect.tokenCopied': 'Key copied!',
    'connect.loginToGetToken': 'Sign in with your account to view and generate your personal API key.',
    'connect.tabClaude': 'Claude',
    'connect.tabChatGPT': 'ChatGPT / OpenAI',
    'connect.tabCursor': 'Cursor & Windsurf',
    'connect.tabGemini': 'Gemini',
    'connect.tabLocal': 'Local LLMs & Others',
    'connect.step1': '1. Connect your AI to Doot',
    'connect.step2': '2. Ask the AI to build a game',
    'connect.step3': '3. Ready to host in the room',
    'connect.step2Desc': 'Tell the model what you want in plain text. It reads Doot\'s format, writes the rounds with your chosen theme, and saves straight to your account.',
    'connect.step3Desc': 'The game is saved to your account with direct links to host on the big screen or tweak in the studio.',
    'connect.examplePromptLabel': 'Example prompt:',
    'connect.examplePromptText': 'Make a Doot trivia game about 90s movies, five rounds, mix the types with wizard theme, and save it to my account.',
    'connect.note': 'Your own AI model does the work against Doot\'s real game format, so what it builds is ready to host. You can revoke access anytime.',
    'create.buildWithAi': 'Build with AI (Any LLM)',
    'create.buildWithAiDesc': 'Connect Claude, ChatGPT, Cursor, Gemini, or any LLM and it writes the game for you, free.',
  },
}

function getInitialLocale(): Locale {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'pt-BR' || saved === 'en') return saved
    } catch {
      /* ignore */
    }
  }
  return 'pt-BR'
}

export function useI18n() {
  const currentLocale = useState<Locale>('doot-locale', getInitialLocale)

  function setLocale(newLocale: Locale) {
    currentLocale.value = newLocale
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, newLocale)
      } catch {
        /* ignore */
      }
    }
  }

  function toggleLocale() {
    setLocale(currentLocale.value === 'pt-BR' ? 'en' : 'pt-BR')
  }

  function t(key: string, params?: Record<string, string | number>): string {
    const dict = translations[currentLocale.value] || translations['pt-BR']
    let text = dict[key] ?? translations['en'][key] ?? key

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
      }
    }
    return text
  }

  return {
    locale: computed(() => currentLocale.value),
    setLocale,
    toggleLocale,
    t,
  }
}
