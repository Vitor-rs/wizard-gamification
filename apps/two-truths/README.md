# 🦅 Wizard Games — Two Truths & A Lie

**Jogo multiplayer local para aulas de idiomas na Wizard by Pearson.**

Duas Verdades e Uma Mentira, versão digital, jogado na rede Wi-Fi da sala de aula.
O professor controla pelo notebook, os alunos jogam pelo celular via QR Code,
e o projetor exibe o andamento do jogo.

---

## 🎮 Como Funciona

### Três Painéis
| Painel | Dispositivo | URL |
|--------|-------------|-----|
| **Admin** | Notebook do professor | `http://IP:8000/admin` |
| **Display** | Projetor | `http://IP:8000/display` |
| **Student** | Celular do aluno | `http://IP:8000/student` (via QR Code) |

### Fluxo do Jogo
1. **Lobby** — Alunos escaneiam o QR Code e entram na sala
2. **Submissão** — Cada aluno escreve 2 verdades e 1 mentira (marca qual é a mentira)
3. **Classificação** — Cada aluno avalia os cards dos colegas (Kanban: pendentes → classificados)
4. **Resultados** — Ranking final com pontuação detalhada

### Sistema de Pontuação (Detector de Mentiras)
Para cada card de colega avaliado:
- **+3 pts** → Acertar a MENTIRA (mais difícil, 1/3 de chance)
- **+1 pt cada** → Acertar cada VERDADE (2/3 de chance)
- **+2 bônus** → Acertar TUDO no card (3/3 corretos)
- **Máximo por card: 7 pontos**
- **Desempate**: quem terminou a avaliação mais rápido

---

## 🚀 Instalação (Windows)

### Pré-requisitos
- **Python 3.11+** instalado → [python.org](https://www.python.org/downloads/)
- **uv** instalado → `pip install uv` ou `winget install astral-sh.uv`

### Passo a Passo

```powershell
# 1. Navegue até a pasta do projeto
cd apps\two-truths

# 2. Inicialize o projeto com uv (se ainda não tiver o pyproject.toml)
#    Se já copiou os arquivos, pule este passo.

# 3. Instale as dependências
uv sync

# 4. Inicie o servidor
uv run python main.py
```

O terminal vai mostrar:
```
============================================================
🦅  WIZARD GAMES — Two Truths & A Lie
============================================================
  📍 IP Local:  192.168.1.XXX
  🌐 Porta:     8000
  👨‍🏫 Admin:     http://192.168.1.XXX:8000/admin
  📺 Display:   http://192.168.1.XXX:8000/display
  📱 Alunos:    http://192.168.1.XXX:8000/student
  🔗 QR Code:   http://192.168.1.XXX:8000/qr
============================================================
  Todos devem estar na MESMA rede Wi-Fi!
============================================================
```

### Abrindo os Painéis
1. No **notebook**: abra o navegador em `http://localhost:8000/admin`
2. No **projetor**: abra `http://IP:8000/display` (fullscreen com F11)
3. Os **alunos**: escaneiam o QR Code mostrado no admin/display

---

## 📁 Estrutura do Projeto

```
two_truths_and_one_lie/
├── pyproject.toml          # Configuração do projeto (uv)
├── main.py                 # Servidor FastAPI + WebSocket + lógica do jogo
├── README.md               # Este arquivo
├── templates/
│   ├── admin.html          # Painel do professor
│   ├── display.html        # Tela do projetor
│   └── student.html        # Interface mobile do aluno
└── static/
    └── css/
        └── wizard-ds.css   # Design System da Wizard Games
```

---

## 🔧 Configuração

### Porta
Por padrão o servidor roda na porta `8000`. Para mudar, edite a variável `PORT` em `main.py`.

### Firewall
Se os alunos não conseguirem conectar, pode ser necessário liberar a porta no Firewall do Windows:

```powershell
# PowerShell como Administrador
netsh advfirewall firewall add rule name="Wizard Games" dir=in action=allow protocol=TCP localport=8000
```

Para remover depois:
```powershell
netsh advfirewall firewall delete rule name="Wizard Games"
```

---

## 🎨 Design System

O projeto usa a identidade visual da Wizard by Pearson:
- **Azul Marinho** (`#1A2B4A`) — Cor principal
- **Laranja Eagle** (`#F37021`) — Cor de destaque
- **Tipografia**: Poppins (display) + Inter (corpo)
- **12 cores** para diferenciar cards dos alunos

---

## 📱 Requisitos de Rede

- Todos os dispositivos devem estar na **mesma rede Wi-Fi**
- O notebook do professor deve ter um **IP fixo ou estável** na rede
- Recomendado: rede Wi-Fi da sala de aula ou roteador dedicado

---

## 🛠️ Desenvolvimento Futuro

- [ ] Modo 2 (Anonymous) — Cards anônimos com adivinhação de dono
- [ ] Persistência de partidas (SQLite)
- [ ] Sons e efeitos sonoros
- [ ] Timer configurável para cada fase
- [ ] Exportar resultados em PDF/Excel
- [ ] PWA (Progressive Web App) para alunos
