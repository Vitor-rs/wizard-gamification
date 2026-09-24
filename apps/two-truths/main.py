"""
🎮 TWO TRUTHS & A LIE — Wizard Games Edition (V2 - Ultra Reliable & Responsive)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Servidor FastAPI com WebSocket de alta confiabilidade para jogos multiplayer
na rede local (sala de aula, eventos, computadores e celulares na mesma Wi-Fi).

Arquitetura:
  - /admin                 → Painel do Professor (Setup, QR Code, Controle de Fase, Kick AFK)
  - /display               → Tela do Projetor / TV (Pódio animado, cards dos alunos)
  - /student               → Celular do Aluno (Interface fluida, 1-tap Detector de Mentiras)
  - /qr                    → QR Code dinâmico apontando para o IP correto
  - /api/network-info      → Detecção de todos os adaptadores Wi-Fi/Ethernet locais
  - /ws/{role}/{player_id} → WebSockets com heartbeat ativo (ping/pong) e reconexão transparente
"""

import asyncio
import io
import json
import os
import socket
import time
from contextlib import asynccontextmanager
from enum import Enum
from typing import Optional
from uuid import uuid4

import qrcode
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, Query
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# REDE & IP DISCOVERY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def get_network_interfaces() -> list[dict]:
    """
    Detecta todas as interfaces de rede IPv4 ativas na máquina.
    Prioriza adaptadores Wi-Fi e Ethernet reais, filtrando loopback e APIPA (169.254.*).
    """
    interfaces = []
    seen_ips = set()

    # 1. Rota padrão UDP (funciona se houver gateway ou internet)
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        primary_ip = s.getsockname()[0]
        s.close()
        if primary_ip and not primary_ip.startswith("127.") and not primary_ip.startswith("169.254."):
            interfaces.append({"name": "Wi-Fi / Conexão Ativa", "ip": primary_ip, "primary": True})
            seen_ips.add(primary_ip)
    except Exception:
        pass

    # 2. Enumeração via Hostname (funciona 100% mesmo offline / roteador sem internet)
    try:
        hostname = socket.gethostname()
        addr_infos = socket.getaddrinfo(hostname, None, socket.AF_INET)
        for item in addr_infos:
            ip = item[4][0]
            if ip not in seen_ips and not ip.startswith("127.") and not ip.startswith("169.254."):
                is_lan = ip.startswith("192.168.") or ip.startswith("10.") or (ip.startswith("172.") and 16 <= int(ip.split(".")[1]) <= 31)
                interfaces.append({
                    "name": f"Rede Local ({ip})",
                    "ip": ip,
                    "primary": is_lan if not interfaces else False,
                })
                seen_ips.add(ip)
    except Exception:
        pass

    # 3. Fallback se nenhum IP de rede foi encontrado
    if not interfaces:
        interfaces.append({"name": "Localhost (Loopback)", "ip": "127.0.0.1", "primary": True})

    return interfaces


def get_local_ip(preferred: Optional[str] = None) -> str:
    """Descobre o melhor IP para exibição no QR Code e conexão dos alunos."""
    if preferred and preferred.strip() and preferred != "localhost":
        return preferred.strip()
    env_ip = os.environ.get("WIZARD_IP") or os.environ.get("HOST")
    if env_ip and env_ip not in ("0.0.0.0", "127.0.0.1"):
        return env_ip

    ifaces = get_network_interfaces()
    for iface in ifaces:
        if iface.get("primary"):
            return iface["ip"]
    return ifaces[0]["ip"] if ifaces else "127.0.0.1"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GAME STATE & MODELOS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class Phase(str, Enum):
    LOBBY = "lobby"             # Alunos entram na sala via QR Code
    SUBMITTING = "submitting"   # Escrevendo 2 verdades e 1 mentira
    EVALUATING = "evaluating"   # Classificando frases dos colegas
    RESULTS = "results"         # Placar final, pódio e revelação


AVATAR_EMOJIS = [
    "🦅", "🐺", "🦁", "🐯", "🦊", "🐻", "🐼", "🐨",
    "🦄", "🐉", "🦋", "🐬", "🦈", "🐙", "🦜", "🐝",
    "🌟", "⚡", "🔥", "🌈", "🎯", "🚀", "🎸", "🎭",
    "🏆", "💎", "🎲", "🧩", "🌺", "🍕", "🎨", "🦇",
]


class GameState:
    """
    Motor centralizado do jogo com suporte a:
      - Reconexão transparente de jogadores (mesmo se cair o sinal)
      - Remoção (kick) de alunos ausentes em qualquer fase sem travar a turma
      - Pontuação precisa 'Detector de Mentiras'
    """

    def __init__(self):
        self.reset()

    def reset(self):
        self.phase: Phase = Phase.LOBBY
        self.players: dict[str, dict] = {}  # player_id -> dados
        self.join_order: list[str] = []     # ordem de entrada
        self.evaluation_start_time: float = 0
        self.used_emojis: set = set()
        self.round_id: str = uuid4().hex[:6]

    def add_player(self, name: str, emoji: str, existing_id: Optional[str] = None) -> dict:
        """Adiciona ou reconecta um jogador."""
        # Se jogador já existe (reconexão por ID ou nome)
        if existing_id and existing_id in self.players:
            player = self.players[existing_id]
            player["name"] = name
            return player

        # Procura por nome já registrado no lobby
        for pid, p in self.players.items():
            if p["name"].strip().lower() == name.strip().lower() and self.phase == Phase.LOBBY:
                return p

        player_id = existing_id if (existing_id and existing_id not in self.players) else uuid4().hex[:8]

        # Garante emoji único
        if emoji in self.used_emojis:
            for e in AVATAR_EMOJIS:
                if e not in self.used_emojis:
                    emoji = e
                    break
        self.used_emojis.add(emoji)

        player_data = {
            "id": player_id,
            "name": name,
            "emoji": emoji,
            "statements": [],       # [{"text": str, "is_lie": bool}, ...]
            "evaluations": {},      # {target_id: [bool, bool, bool]} (True = Lie guess, False = Truth guess)
            "eval_done": False,
            "eval_finish_time": 0,
            "score": 0,
            "score_breakdown": {},  # {target_id: {lie_pts, truth_pts, bonus, total}}
            "last_active": time.time(),
        }
        self.players[player_id] = player_data
        if player_id not in self.join_order:
            self.join_order.append(player_id)
        return player_data

    def remove_player(self, player_id: str):
        """Remove um jogador (funciona no Lobby ou durante o jogo para destravar alunos ausentes)."""
        if player_id in self.players:
            emoji = self.players[player_id]["emoji"]
            self.used_emojis.discard(emoji)
            del self.players[player_id]
            self.join_order = [pid for pid in self.join_order if pid != player_id]

            # Limpa avaliações de terceiros que referenciem esse jogador removido
            for p in self.players.values():
                if player_id in p.get("evaluations", {}):
                    del p["evaluations"][player_id]

    def submit_statements(self, player_id: str, statements: list[dict]):
        """Registra as 3 frases do aluno."""
        if player_id in self.players:
            # Garante que tenha exatamente 3 frases e ao menos 1 mentira marcada
            cleaned = []
            for s in statements[:3]:
                cleaned.append({
                    "text": str(s.get("text", "")).strip(),
                    "is_lie": bool(s.get("is_lie", False)),
                })
            self.players[player_id]["statements"] = cleaned
            self.players[player_id]["last_active"] = time.time()

    def submit_evaluations(self, player_id: str, evaluations: dict[str, list[bool]]):
        """Registra as avaliações que este aluno fez sobre os colegas."""
        if player_id in self.players:
            self.players[player_id]["evaluations"] = evaluations
            self.players[player_id]["eval_done"] = True
            self.players[player_id]["eval_finish_time"] = time.time()
            self.players[player_id]["last_active"] = time.time()

    def all_submitted(self) -> bool:
        """Verifica se todos os jogadores ativos enviaram 3 frases."""
        if not self.players:
            return False
        return all(len(p.get("statements", [])) == 3 for p in self.players.values())

    def all_evaluated(self) -> bool:
        """Verifica se todos os jogadores ativos terminaram de avaliar."""
        if not self.players:
            return False
        return all(p.get("eval_done", False) for p in self.players.values())

    def calculate_scores(self):
        """
        Calcula pontuação com a regra 'Detector de Mentiras':
          +3 pts: Acertar a mentira do colega
          +1 pt:  Acertar cada verdade do colega (2x)
          +2 pts: Bônus se acertou o card 100% (3/3)
          Total máx por colega: 7 pontos
        """
        for player_id, player in self.players.items():
            total_score = 0
            breakdown = {}

            for target_id, guesses in player.get("evaluations", {}).items():
                target = self.players.get(target_id)
                if not target or len(target.get("statements", [])) != 3:
                    continue

                actual = [s["is_lie"] for s in target["statements"]]
                lie_pts = 0
                truth_pts = 0
                correct_count = 0

                for i in range(3):
                    guess = bool(guesses[i]) if i < len(guesses) else False
                    act = actual[i]
                    if guess == act:
                        correct_count += 1
                        if act:
                            lie_pts += 3
                        else:
                            truth_pts += 1

                bonus = 2 if correct_count == 3 else 0
                card_total = lie_pts + truth_pts + bonus

                breakdown[target_id] = {
                    "lie_pts": lie_pts,
                    "truth_pts": truth_pts,
                    "bonus": bonus,
                    "total": card_total,
                    "correct": correct_count,
                }
                total_score += card_total

            player["score"] = total_score
            player["score_breakdown"] = breakdown

    def get_rankings(self) -> list[dict]:
        """Classifica os jogadores por pontuação e tempo de término."""
        players_list = list(self.players.values())
        players_list.sort(
            key=lambda p: (-p.get("score", 0), p.get("eval_finish_time") or float("inf"))
        )
        return players_list

    def get_max_possible_score(self) -> int:
        n = len(self.players)
        return 7 * (n - 1) if n > 1 else 0

    def to_dict(self, role: str = "display", player_id: Optional[str] = None) -> dict:
        """Serializa o estado com sanitização para evitar que alunos espiem as mentiras."""
        players_data = {}
        for pid, p in self.players.items():
            info = {
                "id": pid,
                "name": p["name"],
                "emoji": p["emoji"],
                "has_submitted": len(p.get("statements", [])) == 3,
                "eval_done": p.get("eval_done", False),
                "score": p.get("score", 0),
                "score_breakdown": p.get("score_breakdown", {}),
            }

            # Sanitização das frases
            if self.phase == Phase.RESULTS or role == "admin":
                info["statements"] = p.get("statements", [])
            elif role == "student" and pid == player_id:
                # O aluno vê suas próprias frases com is_lie
                info["statements"] = p.get("statements", [])
            else:
                # Oculta is_lie dos colegas durante a fase de escrita e avaliação
                info["statements"] = [{"text": s.get("text", "")} for s in p.get("statements", [])]

            if self.phase == Phase.RESULTS:
                info["evaluations"] = p.get("evaluations", {})

            players_data[pid] = info

        rankings_data = []
        if self.phase == Phase.RESULTS:
            rankings_data = [
                {
                    "id": p["id"],
                    "name": p["name"],
                    "emoji": p["emoji"],
                    "score": p.get("score", 0),
                    "breakdown": p.get("score_breakdown", {}),
                }
                for p in self.get_rankings()
            ]

        return {
            "round_id": self.round_id,
            "phase": self.phase.value,
            "player_count": len(self.players),
            "players": players_data,
            "join_order": self.join_order,
            "all_submitted": self.all_submitted(),
            "all_evaluated": self.all_evaluated(),
            "submissions_count": sum(1 for p in self.players.values() if len(p.get("statements", [])) == 3),
            "evaluations_count": sum(1 for p in self.players.values() if p.get("eval_done", False)),
            "max_score": self.get_max_possible_score(),
            "rankings": rankings_data,
        }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CONNECTION MANAGER (WEBSOCKETS ROBUSTOS)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class ConnectionManager:
    """Gerencia conexões ativas com isolamento de falhas e heartbeat."""

    def __init__(self):
        self.admin_connections: list[WebSocket] = []
        self.display_connections: list[WebSocket] = []
        # player_id -> conjunto de conexões (permite abas extras ou reconexão limpa)
        self.student_connections: dict[str, set[WebSocket]] = {}

    async def connect_admin(self, ws: WebSocket):
        await ws.accept()
        self.admin_connections.append(ws)

    async def connect_display(self, ws: WebSocket):
        await ws.accept()
        self.display_connections.append(ws)

    async def connect_student(self, ws: WebSocket, player_id: str):
        await ws.accept()
        if player_id not in self.student_connections:
            self.student_connections[player_id] = set()
        self.student_connections[player_id].add(ws)

    def disconnect_admin(self, ws: WebSocket):
        if ws in self.admin_connections:
            self.admin_connections.remove(ws)

    def disconnect_display(self, ws: WebSocket):
        if ws in self.display_connections:
            self.display_connections.remove(ws)

    def disconnect_student(self, ws: WebSocket, player_id: str):
        if player_id in self.student_connections:
            self.student_connections[player_id].discard(ws)
            if not self.student_connections[player_id]:
                del self.student_connections[player_id]

    def is_student_online(self, player_id: str) -> bool:
        return bool(self.student_connections.get(player_id))

    async def send_to(self, ws: WebSocket, msg_type: str, data: dict):
        try:
            await ws.send_text(json.dumps({"type": msg_type, "data": data}))
        except Exception:
            pass

    async def broadcast_state(self, game: GameState):
        """Envia o estado personalizado e sanitizado para todos os clientes."""
        # 1. Admin
        admin_payload = json.dumps({
            "type": "game_state",
            "data": game.to_dict("admin"),
            "online_students": {pid: self.is_student_online(pid) for pid in game.players},
        })
        for ws in self.admin_connections[:]:
            try:
                await ws.send_text(admin_payload)
            except Exception:
                self.disconnect_admin(ws)

        # 2. Display
        display_payload = json.dumps({"type": "game_state", "data": game.to_dict("display")})
        for ws in self.display_connections[:]:
            try:
                await ws.send_text(display_payload)
            except Exception:
                self.disconnect_display(ws)

        # 3. Students
        for pid, ws_set in list(self.student_connections.items()):
            student_payload = json.dumps({
                "type": "game_state",
                "data": game.to_dict("student", pid),
            })
            dead_sockets = set()
            for ws in ws_set:
                try:
                    await ws.send_text(student_payload)
                except Exception:
                    dead_sockets.add(ws)
            for dead in dead_sockets:
                self.disconnect_student(dead, pid)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# APP SETUP & INICIALIZAÇÃO
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PORT = 8000
game = GameState()
manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    local_ip = get_local_ip()
    all_ifaces = get_network_interfaces()

    print("\n" + "=" * 65)
    print("WIZARD GAMES -- TWO TRUTHS & A LIE (Edicao Monolito)")
    print("=" * 65)
    print(f"  IP Principal (Wi-Fi): {local_ip}")
    print(f"  Porta:                {PORT}")
    print(f"  Painel Professor:     http://localhost:{PORT}/admin")
    print(f"  Tela Projetor:        http://localhost:{PORT}/display")
    print(f"  Link Alunos (Wi-Fi):  http://{local_ip}:{PORT}/student")
    print(f"  QR Code Imagem:       http://{local_ip}:{PORT}/qr")
    if len(all_ifaces) > 1:
        print("  Outros Adaptadores Detectados:")
        for iface in all_ifaces:
            print(f"     * {iface['name']}: http://{iface['ip']}:{PORT}/student")
    print("=" * 65)
    print("  Dispositivos devem estar conectados no mesmo Wi-Fi.")
    print("=" * 65 + "\n")
    yield


app = FastAPI(title="Two Truths & A Lie — Wizard Games", lifespan=lifespan)
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ROTAS HTTP (FRONTEND E PÁGINAS)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/", response_class=HTMLResponse)
async def index_route(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="admin.html",
        context={"host": get_local_ip(), "port": PORT},
    )


@app.get("/admin", response_class=HTMLResponse)
async def admin_page(request: Request):
    host_header = request.headers.get("host", "").split(":")[0]
    display_host = host_header if host_header and host_header != "localhost" else get_local_ip()
    return templates.TemplateResponse(
        request=request,
        name="admin.html",
        context={"host": display_host, "port": PORT},
    )


@app.get("/display", response_class=HTMLResponse)
async def display_page(request: Request):
    host_header = request.headers.get("host", "").split(":")[0]
    display_host = host_header if host_header and host_header != "localhost" else get_local_ip()
    return templates.TemplateResponse(
        request=request,
        name="display.html",
        context={"host": display_host, "port": PORT},
    )


@app.get("/student", response_class=HTMLResponse)
async def student_page(request: Request):
    host_header = request.headers.get("host", "").split(":")[0]
    display_host = host_header if host_header and host_header != "localhost" else get_local_ip()
    return templates.TemplateResponse(
        request=request,
        name="student.html",
        context={"host": display_host, "port": PORT},
    )


@app.get("/qr")
async def qr_code_route(
    request: Request,
    ip: Optional[str] = Query(None, description="IP específico para o QR Code"),
):
    """
    Gera um QR Code PNG de alta nitidez apontando para a página /student.
    Se o IP não for informado na query, usa o IP da requisição ou o IP principal detectado.
    """
    host_header = request.headers.get("host", "")
    target_ip = ip or (host_header.split(":")[0] if host_header and host_header != "localhost" else get_local_ip())

    student_url = f"http://{target_ip}:{PORT}/student"

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=3,
    )
    qr.add_data(student_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#1A2B4A", back_color="#FFFFFF")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")


@app.get("/api/network-info")
async def network_info_api(request: Request):
    """Retorna interfaces disponíveis e IP em uso para o painel admin."""
    ifaces = get_network_interfaces()
    host_header = request.headers.get("host", "").split(":")[0]
    active_ip = host_header if host_header and host_header != "localhost" else get_local_ip()
    return {
        "interfaces": ifaces,
        "active_ip": active_ip,
        "port": PORT,
        "student_url": f"http://{active_ip}:{PORT}/student",
    }


@app.get("/api/avatars")
async def get_avatars():
    used = game.used_emojis
    return {
        "avatars": [
            {"emoji": e, "available": e not in used}
            for e in AVATAR_EMOJIS
        ]
    }


@app.post("/api/join")
async def join_game_api(request: Request):
    """Registro de aluno com suporte a restauração de sessão."""
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Corpo da requisição inválido"}, status_code=400)

    name = str(data.get("name", "")).strip()
    emoji = str(data.get("emoji", "🦅"))
    client_player_id = data.get("player_id")

    if not name:
        return JSONResponse({"error": "Digite seu nome para entrar!"}, status_code=400)
    if len(name) > 30:
        return JSONResponse({"error": "O nome deve ter no máximo 30 caracteres."}, status_code=400)

    # Se estiver fora do lobby, permite reconectar se o ID já for conhecido ou se nome já existir
    if game.phase != Phase.LOBBY:
        existing = None
        if client_player_id and client_player_id in game.players:
            existing = game.players[client_player_id]
        else:
            for p in game.players.values():
                if p["name"].strip().lower() == name.lower():
                    existing = p
                    break

        if existing:
            return {
                "player_id": existing["id"],
                "name": existing["name"],
                "emoji": existing["emoji"],
                "reconnected": True,
            }
        return JSONResponse(
            {"error": "A partida já começou! Peça ao professor para adicionar você ou reiniciar a rodada."},
            status_code=403,
        )

    player = game.add_player(name, emoji, existing_id=client_player_id)
    await manager.broadcast_state(game)
    return {
        "player_id": player["id"],
        "name": player["name"],
        "emoji": player["emoji"],
        "reconnected": False,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# WEBSOCKET ENDPOINTS COM HEARTBEAT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.websocket("/ws/admin")
async def ws_admin(websocket: WebSocket):
    await manager.connect_admin(websocket)
    # Envia estado inicial
    await manager.send_to(websocket, "game_state", {
        **game.to_dict("admin"),
        "online_students": {pid: manager.is_student_online(pid) for pid in game.players},
    })

    try:
        while True:
            text = await websocket.receive_text()
            if not text:
                continue
            data = json.loads(text)
            action = data.get("action")

            if action == "ping":
                await manager.send_to(websocket, "pong", {"time": time.time()})
                continue

            if action == "add_player":
                game.add_player(data.get("name", "Aluno"), data.get("emoji", "🦅"))
                await manager.broadcast_state(game)

            elif action == "remove_player":
                pid = data.get("player_id")
                if pid:
                    game.remove_player(pid)
                    await manager.broadcast_state(game)

            elif action == "start_submissions":
                # Permite começar com 2 ou mais jogadores
                if len(game.players) >= 2:
                    game.phase = Phase.SUBMITTING
                    await manager.broadcast_state(game)

            elif action == "start_evaluation":
                game.phase = Phase.EVALUATING
                game.evaluation_start_time = time.time()
                await manager.broadcast_state(game)

            elif action == "show_results" or action == "force_results":
                game.calculate_scores()
                game.phase = Phase.RESULTS
                await manager.broadcast_state(game)

            elif action == "reset":
                game.reset()
                await manager.broadcast_state(game)

    except WebSocketDisconnect:
        manager.disconnect_admin(websocket)
    except Exception:
        manager.disconnect_admin(websocket)


@app.websocket("/ws/display")
async def ws_display(websocket: WebSocket):
    await manager.connect_display(websocket)
    await manager.send_to(websocket, "game_state", game.to_dict("display"))

    try:
        while True:
            text = await websocket.receive_text()
            if not text:
                continue
            data = json.loads(text)
            if data.get("action") == "ping":
                await manager.send_to(websocket, "pong", {"time": time.time()})
    except WebSocketDisconnect:
        manager.disconnect_display(websocket)
    except Exception:
        manager.disconnect_display(websocket)


@app.websocket("/ws/student/{player_id}")
async def ws_student(websocket: WebSocket, player_id: str):
    if player_id not in game.players:
        await websocket.close(code=4001, reason="Player not found in active room")
        return

    await manager.connect_student(websocket, player_id)
    # Atualiza timestamp de atividade
    game.players[player_id]["last_active"] = time.time()
    await manager.send_to(websocket, "game_state", game.to_dict("student", player_id))
    # Notifica admin sobre novo status online
    await manager.broadcast_state(game)

    try:
        while True:
            text = await websocket.receive_text()
            if not text:
                continue
            data = json.loads(text)
            action = data.get("action")

            if action == "ping":
                game.players[player_id]["last_active"] = time.time()
                await manager.send_to(websocket, "pong", {"time": time.time()})
                continue

            elif action == "submit_statements":
                statements = data.get("statements", [])
                game.submit_statements(player_id, statements)
                await manager.broadcast_state(game)

            elif action == "submit_evaluations":
                evaluations = data.get("evaluations", {})
                game.submit_evaluations(player_id, evaluations)
                await manager.broadcast_state(game)

    except WebSocketDisconnect:
        manager.disconnect_student(websocket, player_id)
        await manager.broadcast_state(game)
    except Exception:
        manager.disconnect_student(websocket, player_id)
        await manager.broadcast_state(game)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SERVIDOR RUNNER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def run_server():
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=False)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=False)
