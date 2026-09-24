# WIZARD GAMIFICATION MONOREPO

Monorepo centralizado com alternativas open-source e self-hosted ao Kahoot, Wayground e Plickers, acoplado ao motor proprio de geracao de questoes com IA e metodologia pedagogica da Wizard.

---

## Estrutura do Projeto

- **apps/quizzle**: Quiz escolar leve, sem login para alunos, PWA (Porta 5000)
- **apps/darkhold**: Quiz competitivo com batalhas de equipe e streaks (Porta 8181)
- **apps/doot**: Jogos interativos, desenho e dinamicas Jackbox-style (Porta 4000)
- **apps/paperclickers**: Sistema offline com cartoes impressos em portugues (A/B/C/D) e Scanner Web ao vivo (Porta 4500)
- **apps/two-truths**: Duas Verdades e Uma Mentira multiplayer via WebSocket (Porta 8000)
- **apps/stroop-color**: Desafio de cores de palavras (Efeito Stroop) para agilidade mental (Porta 3000)

- **packages/ai-quiz-engine**: Motor de geracao de quizzes
  - generator.py: CLI para geracao de questoes
  - adapters/: Conversores para Quizzle, Kahoot CSV, PaperClickers Web e Impressao
  - prompts/: Prompts pedagogicos e analise de erros de falantes de portugues
  - output/: Arquivos gerados prontos para importar ou imprimir
- **packages/syllabus-data**: Modelos de ementas Wizard (W2, W4, W6, etc.)

- **docker/**: Orquestracao via Docker Compose
- **scripts/**: Scripts de inicializacao rapida no Windows (PowerShell / BAT)

---

## Como Iniciar Cada Plataforma

### 1. Quizzle (Porta 5000)
```powershell
.\scripts\start-quizzle.ps1
```
Acesse no navegador: http://localhost:5000

### 2. Doot Games (Porta 4000)
```powershell
.\scripts\start-doot.ps1
```
Acesse no navegador: http://localhost:4000

### 3. Darkhold (Porta 8181)
```powershell
.\scripts\start-darkhold.ps1
```
Acesse no navegador: http://localhost:8181

### 4. PaperClickers Web & Cartoes (Porta 4500)
```powershell
.\scripts\start-paperclickers.ps1
```
Acesse no navegador: http://localhost:4500 (Scanner de camera em tempo real, projetor de perguntas e gerenciador de cartoes).

### 5. Two Truths & A Lie (Porta 8000)
```powershell
.\scripts\start-two-truths.ps1
```
Ou dê dois cliques em `start-two-truths.bat`.
Acesse no navegador:
- Professor (Admin): http://localhost:8000/admin
- Projetor (Display): http://localhost:8000/display
- Alunos (Wi-Fi): http://<SEU-IP>:8000/student

### 6. Stroop Color (Porta 3000)
```powershell
.\scripts\start-stroop.ps1
```
Ou dê dois cliques em `start-stroop.bat`.
Acesse no navegador:
- Painel Admin: http://localhost:3000/
- Projetor / Tela: http://<SEU-IP>:3000/display

---

## Como Gerar Quizzes com a IA

```powershell
.\scripts\generate-quiz.ps1 -book "W4" -unit "Unit 5" -level "Teens" -target "all"
```

Arquivos exportados em packages/ai-quiz-engine/output/:
- w4_unit_5_quizzle.json: Importacao no Quizzle
- w4_unit_5_kahoot.csv: Planilha padrao do Kahoot
- w4_unit_5_paperclickers.html: Folha de prova pronta para impressao com gabarito do professor
- w4_unit_5_universal.json: JSON universal estruturado (lido diretamente pelo PaperClickers Web)

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
Dê dois cliques no arquivo:
```cmd
liberar-firewall.bat
```
*(Ele solicitará permissão de Administrador e liberará as portas 8000, 3000 e 4000 para que os celulares dos alunos consigam conectar à rede sem bloqueios).*

### 3. Executar os Jogos:
Basta dar dois cliques no executável de cada jogo:
- `start-two-truths.bat` (Two Truths & A Lie)
- `start-stroop.bat` (Stroop Color Effect)
- `start-doot.bat` (Doot Games)

