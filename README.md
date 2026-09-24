# WIZARD GAMIFICATION MONOREPO

Monorepo centralizado com alternativas open-source e self-hosted ao Kahoot, Wayground e Plickers, acoplado ao motor proprio de geracao de questoes com IA e metodologia pedagogica da Wizard.

---

## 🚀 Inicialização Universal (Recomendado para Professores)

Para eliminar qualquer atrito cognitivo (sem precisar abrir terminal ou digitar portas):

1. Dê dois cliques em **`Wizard Games.bat`** na raiz do projeto.
2. O script cria automaticamente um atalho na sua **Área de Trabalho (`Wizard Games`)** com o ícone oficial da Wizard.
3. Seu navegador padrão abrirá imediatamente no **Wizard Games Hub** (`http://localhost:7000`):
   - **1º Stroop Color Effect** e **2º Two Truths & A Lie** em destaque principal.
   - Botões de **1 clique** para iniciar os servidores em segundo plano e abrir painéis.
   - Modal com **QR Code dinâmico** do seu IP Wi-Fi para os alunos escanearem.
   - Status em tempo real (Online/Offline) de todas as portas.
   - Botão para liberar o Firewall do Windows com 1 clique.

---

## Estrutura do Projeto

- **apps/hub**: Wizard Games Hub unificado (Porta 7000)
- **apps/stroop-color**: Desafio de cores de palavras (Efeito Stroop) para agilidade mental (Porta 3000)
- **apps/two-truths**: Duas Verdades e Uma Mentira multiplayer via WebSocket (Porta 8000)
- **apps/doot**: Jogos interativos, desenho e dinâmicas Jackbox-style (Porta 4000)
- **apps/paperclickers**: Sistema offline com cartões impressos em português (A/B/C/D) e Scanner Web ao vivo (Porta 4500)
- **apps/quizzle**: Quiz escolar leve, sem login para alunos, PWA (Porta 5000)
- **apps/darkhold**: Quiz competitivo com batalhas de equipe e streaks (Porta 8181)

- **packages/ai-quiz-engine**: Motor de geração de quizzes com IA
- **packages/syllabus-data**: Modelos de ementas pedagógicas Wizard (W2, W4, W6, etc.)
- **scripts/**: Scripts de automação PowerShell e inicializadores

---

## Como Iniciar Apps Individualmente

Cada aplicativo agora possui seu próprio arquivo `start.bat` isolado dentro de sua respectiva pasta:

- **Stroop Color**: `apps/stroop-color/start.bat` (Porta 3000)
- **Two Truths & A Lie**: `apps/two-truths/start.bat` (Porta 8000)
- **Doot Games**: `apps/doot/start.bat` (Porta 4000)
- **PaperClickers**: `apps/paperclickers/start.bat` (Porta 4500)
- **Quizzle**: `apps/quizzle/start.bat` (Porta 5000)
- **Darkhold**: `apps/darkhold/start.bat` (Porta 8181)

---

## Como Gerar Quizzes com a IA

```powershell
.\scripts\generate-quiz.ps1 -book "W4" -unit "Unit 5" -level "Teens" -target "all"
```

Arquivos exportados em `packages/ai-quiz-engine/output/`:
- `w4_unit_5_quizzle.json`: Importação no Quizzle
- `w4_unit_5_kahoot.csv`: Planilha padrão do Kahoot
- `w4_unit_5_paperclickers.html`: Folha de prova pronta para impressão com gabarito do professor
- `w4_unit_5_universal.json`: JSON universal estruturado (lido diretamente pelo PaperClickers Web)

---

## 💻 Transferência e Instalação em Novo Laptop (ex: Windows 11 / C:\Users\User)

Se você copiar esta pasta para outro computador (como `C:\Users\User\WIZARD_GAMIFICATION`):

### 1. Pré-requisitos (apenas 1 vez no novo computador):
Abra o **PowerShell** ou **Terminal do Windows** e instale o Node.js e o Python com o winget:
```powershell
winget install OpenJS.NodeJS.LTS
winget install Python.Python.3.12
```

### 2. Liberar portas no Firewall do Windows (Essencial para redes Wi-Fi):
Dê dois cliques no arquivo `liberar-firewall.bat` ou clique no botão **"Liberar Firewall"** no Wizard Games Hub.

### 3. Executar os Jogos:
Basta dar dois cliques no atalho **`Wizard Games`** na sua Área de Trabalho ou no arquivo `Wizard Games.bat` na raiz.

