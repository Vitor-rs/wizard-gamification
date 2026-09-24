"""
🎮 WIZARD GAMES HUB — Servidor do Painel Universal
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Servidor local ultraleve (Python Standard Library, sem dependências externas)
Centraliza todos os jogos e ferramentas do monorepo WIZARD_GAMIFICATION.
Abre automaticamente no navegador padrão com 1 clique (zero atrito cognitivo).
"""

import http.server
import io
import json
import mimetypes
import os
import socket
import subprocess
import sys
import threading
import time
import urllib.parse
import webbrowser
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
HUB_DIR = Path(__file__).resolve().parent

# Adiciona site-packages do two-truths caso qrcode não esteja no python global
venv_site = ROOT_DIR / "apps/two-truths/.venv/Lib/site-packages"
if venv_site.exists():
    sys.path.insert(0, str(venv_site))

try:
    import qrcode
    HAS_QRCODE = True
except Exception:
    HAS_QRCODE = False

# Registra MIME types adicionais para compatibilidade Windows
mimetypes.init()
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("image/x-icon", ".ico")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("application/javascript", ".js")

# Garante streams válidos no Windows (pythonw.exe)
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w", encoding="utf-8")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w", encoding="utf-8")

# Configura encoding de terminal seguro para Windows
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

PORT = 7000
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
HUB_DIR = Path(__file__).resolve().parent

# Registro de Jogos & Aplicativos
APPS = {
    "stroop": {
        "id": "stroop",
        "order": 1,
        "name": "Stroop Color Effect",
        "subtitle": "Cores & Palavras (Agilidade Mental)",
        "badge": "Efeito Stroop • Aquecimento Dinâmico",
        "tag": "1º Jogo Principal",
        "port": 3000,
        "admin_path": "/",
        "display_path": "/display",
        "student_path": None,
        "script": "scripts/start-stroop.ps1",
        "bat": "apps/stroop-color/start.bat",
        "description": "Desafio cognitivo de alta energia. O aluno deve falar a cor da tinta da palavra e não o nome que está escrito. Desenvolve foco e fluência imediata.",
        "features": ["Multi-tela via WebSocket", "Controle de Tempo (Timer)", "Modos Prática & Desafio", "Projetor Fullscreen"]
    },
    "two-truths": {
        "id": "two-truths",
        "order": 2,
        "name": "Two Truths & A Lie",
        "subtitle": "Duas Verdades e Uma Mentira (Multiplayer)",
        "badge": "Multiplayer Wi-Fi • Comunicação Oral",
        "tag": "2º Jogo Principal",
        "port": 8000,
        "admin_path": "/admin",
        "display_path": "/display",
        "student_path": "/student",
        "qr_path": "/qr",
        "script": "scripts/start-two-truths.ps1",
        "bat": "apps/two-truths/start.bat",
        "description": "Dinâmica social clássica gamificada. Cada aluno cria 2 verdades e 1 mentira no celular; a sala vota e tenta descobrir o blefe pelo projetor.",
        "features": ["Entrada via QR Code (Zero Login)", "Votação Instantânea no Celular", "Pódio e Ranking Animado", "Detector de Mentiras em Tempo Real"]
    },
    "doot": {
        "id": "doot",
        "order": 3,
        "name": "Doot Games",
        "subtitle": "Jogos Rápidos e Desenho em Grupo",
        "badge": "Jackbox-Style • Criatividade",
        "tag": "Dinâmica em Grupo",
        "port": 4000,
        "admin_path": "/",
        "display_path": "/",
        "student_path": "/",
        "script": "scripts/start-doot.ps1",
        "bat": "apps/doot/start.bat",
        "description": "Plataforma interativa de jogos rápidos com desenho e adivinhações na sala de aula pelos celulares.",
        "features": ["Desenho ao Vivo", "Multiplayer Local", "Diversão em Equipe"]
    },
    "paperclickers": {
        "id": "paperclickers",
        "order": 4,
        "name": "PaperClickers Web",
        "subtitle": "Respostas com Cartões Impressos (100% Offline)",
        "badge": "Zero Celular • Leitura por Câmera",
        "tag": "Sem Necessidade de Wi-Fi",
        "port": 4500,
        "admin_path": "/",
        "display_path": "/",
        "student_path": None,
        "script": "scripts/start-paperclickers.ps1",
        "bat": "apps/paperclickers/start.bat",
        "description": "Alternativa ao Plickers. Os alunos levantam cartões de papel (A/B/C/D) e o professor escaneia todos em segundos usando a câmera do notebook.",
        "features": ["Funciona sem internet/Wi-Fi", "Scanner Instantâneo por Visão Computacional", "Relatório de Acertos"]
    },
    "quizzle": {
        "id": "quizzle",
        "order": 5,
        "name": "Quizzle",
        "subtitle": "Quiz Escolar Ágil (Alternativa ao Kahoot)",
        "badge": "PWA Leve • Sem Login",
        "tag": "Quiz Interativo",
        "port": 5000,
        "admin_path": "/",
        "display_path": "/",
        "student_path": "/",
        "script": "scripts/start-quizzle.ps1",
        "bat": "apps/quizzle/start.bat",
        "description": "Sistema de perguntas e respostas competitivo para fixação de gramática e vocabulário com pódio e streaks.",
        "features": ["Importação de Quizzes da IA", "Interface Rápida", "Suporte a Mobile e Desktop"]
    },
    "darkhold": {
        "id": "darkhold",
        "order": 6,
        "name": "Darkhold",
        "subtitle": "Batalhas de Equipe com Streaks e Vidas",
        "badge": "Competição Épica • Batalha",
        "tag": "Gameficado",
        "port": 8181,
        "admin_path": "/",
        "display_path": "/",
        "student_path": "/",
        "script": "scripts/start-darkhold.ps1",
        "bat": "apps/darkhold/start.bat",
        "description": "Modo de batalha escolar onde times defendem sua pontuação respondendo a desafios da lição sob pressão de tempo.",
        "features": ["Batalhas em Time", "Sistema de Streaks", "Feedback Imediato"]
    }
}


def get_local_ip() -> str:
    """Detecta o IP local ativo (Wi-Fi/Ethernet) ignorando loopback e APIPA."""
    # 1. Rota UDP rápida
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and not ip.startswith("127.") and not ip.startswith("169.254."):
            return ip
    except Exception:
        pass

    # 2. Hostname fallback
    try:
        hostname = socket.gethostname()
        for item in socket.getaddrinfo(hostname, None, socket.AF_INET):
            candidate = item[4][0]
            if candidate and not candidate.startswith("127.") and not candidate.startswith("169.254."):
                if candidate.startswith("192.168.") or candidate.startswith("10."):
                    return candidate
    except Exception:
        pass

    return "127.0.0.1"


def is_port_open(port: int, host: str = "127.0.0.1") -> bool:
    """Verifica se uma porta TCP está respondendo."""
    if not port:
        return False
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.3)
        res = s.connect_ex((host, port))
        s.close()
        return res == 0
    except Exception:
        return False


SPAWNED_PROCESSES = []
SPAWNED_PROCESSES_BY_APP = {}
OPEN_WINDOWS = {}


def kill_port(port: int):
    """Finaliza qualquer processo escutando na porta especificada."""
    if not port:
        return
    if sys.platform == "win32":
        try:
            cmd = f'powershell.exe -NoProfile -Command "Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {{ Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }}"'
            subprocess.run(cmd, shell=True, creationflags=0x08000000)
        except Exception:
            pass


def stop_app_process(app_id: str) -> dict:
    """Encerra o processo do aplicativo e libera a porta."""
    app = APPS.get(app_id)
    if not app:
        return {"error": "Aplicativo não encontrado"}

    port = app.get("port")

    # 1. Encerra processos filhos rastreados
    if app_id in SPAWNED_PROCESSES_BY_APP:
        for proc in SPAWNED_PROCESSES_BY_APP[app_id]:
            try:
                if proc.poll() is None:
                    proc.terminate()
            except Exception:
                pass
        del SPAWNED_PROCESSES_BY_APP[app_id]

    # 2. Fecha janelas de rotas associadas a este app
    for key in list(OPEN_WINDOWS.keys()):
        if OPEN_WINDOWS[key].get("app_id") == app_id:
            try:
                proc = OPEN_WINDOWS[key].get("proc")
                if proc and proc.poll() is None:
                    proc.terminate()
            except Exception:
                pass
            del OPEN_WINDOWS[key]

    # 3. Mata processo residual na porta
    if port:
        kill_port(port)

    # 4. Aguarda porta liberar
    for _ in range(8):
        time.sleep(0.25)
        if not is_port_open(port):
            break

    return {"status": "stopped", "app": app_id, "active": is_port_open(port), "port": port}


def stop_all_apps() -> dict:
    """Encerra todos os jogos ativos de uma vez e limpa a memória."""
    for app_id in list(APPS.keys()):
        stop_app_process(app_id)
    cleanup_spawned_processes()
    return {"status": "all_stopped"}


def window_action(key: str, action: str) -> dict:
    """Executa ação em janela aberta (focar, minimizar ou fechar) com suporte a abas de navegador."""
    # Ação especial para a aba Hub
    if key == "hub":
        if action in ("focus", "restore") and sys.platform == "win32":
            ps_hub = 'powershell.exe -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $hub = Get-Process msedge, chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like \'*Wizard Games*\' -or $_.MainWindowTitle -like \'*Central de Gamificação*\' } | Select-Object -First 1; if ($hub) { $ws.AppActivate($hub.Id) }"'
            try:
                subprocess.Popen(ps_hub, shell=True, creationflags=0x08000000)
            except Exception:
                pass
        return {"status": "hub_focused"}

    win = OPEN_WINDOWS.get(key)
    if not win:
        return {"error": "Janela não encontrada", "key": key}

    url = win.get("url")
    proc = win.get("proc")
    title = win.get("title", "")
    app_id = win.get("app_id", "")
    route = win.get("route", "")

    # Mapeamento de palavras-chave para identificar janelas pelo título HTML
    kw_map = {
        "stroop": "Stroop",
        "two-truths": "Two Truths",
        "paperclickers": "PaperClickers",
        "quizzle": "Quizzle",
        "darkhold": "Darkhold"
    }
    kw_app = kw_map.get(app_id, app_id)
    kw_route = "Admin" if route == "admin" else "Display" if route == "display" else ""

    if action == "close":
        # 1. Encerra o processo direto se ativo
        if proc and proc.poll() is None:
            try:
                proc.terminate()
            except Exception:
                pass

        # 2. No Windows, fecha a janela do Edge/Chrome pelo título amigavelmente
        if sys.platform == "win32":
            conds = []
            if kw_app:
                conds.append(f"$_.MainWindowTitle -like '*{kw_app}*'")
            if kw_route:
                conds.append(f"$_.MainWindowTitle -like '*{kw_route}*'")

            if conds:
                cond_str = " -and ".join(conds)
                ps_close = f'powershell.exe -NoProfile -Command "Get-Process msedge, chrome -ErrorAction SilentlyContinue | Where-Object {{ {cond_str} }} | ForEach-Object {{ $_.CloseMainWindow() }}"'
                try:
                    subprocess.Popen(ps_close, shell=True, creationflags=0x08000000)
                except Exception:
                    pass

        if key in OPEN_WINDOWS:
            del OPEN_WINDOWS[key]
        return {"status": "closed", "key": key}

    elif action == "minimize":
        win["minimized"] = True
        if sys.platform == "win32":
            conds = []
            if kw_app:
                conds.append(f"$_.MainWindowTitle -like '*{kw_app}*'")
            if kw_route:
                conds.append(f"$_.MainWindowTitle -like '*{kw_route}*'")

            if conds:
                cond_str = " -and ".join(conds)
                ps_min = f'powershell.exe -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $target = Get-Process msedge, chrome -ErrorAction SilentlyContinue | Where-Object {{ {cond_str} }} | Select-Object -First 1; if ($target) {{ $ws.AppActivate($target.Id); Start-Sleep -Milliseconds 100; [System.Windows.Forms.SendKeys]::SendWait(\'% {{SPACE}}n\') }}"'
                try:
                    subprocess.Popen(ps_min, shell=True, creationflags=0x08000000)
                except Exception:
                    pass
        return {"status": "minimized", "key": key}

    elif action in ("focus", "restore"):
        win["minimized"] = False
        focused = False

        # 1. No Windows, tenta ativar a janela existente pelo título
        if sys.platform == "win32":
            conds = []
            if kw_app:
                conds.append(f"$_.MainWindowTitle -like '*{kw_app}*'")
            if kw_route:
                conds.append(f"$_.MainWindowTitle -like '*{kw_route}*'")

            if conds:
                cond_str = " -and ".join(conds)
                ps_focus = f'powershell.exe -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $target = Get-Process msedge, chrome -ErrorAction SilentlyContinue | Where-Object {{ {cond_str} }} | Select-Object -First 1; if ($target) {{ $ws.AppActivate($target.Id); exit 0 }} else {{ exit 1 }}"'
                try:
                    res = subprocess.run(ps_focus, shell=True, creationflags=0x08000000)
                    focused = (res.returncode == 0)
                except Exception:
                    focused = False

        # 2. Se a janela não estava mais aberta, reabre em modo Desktop App
        if not focused and url:
            new_proc = open_in_app_mode(url, window_size=win.get("size", "1200,800"))
            if new_proc:
                win["proc"] = new_proc

        return {"status": "focused", "key": key}

    return {"error": "Ação inválida"}


def cleanup_spawned_processes():
    """Encerra todos os servidores de jogos iniciados em segundo plano."""
    for proc in list(SPAWNED_PROCESSES):
        try:
            if proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=1.5)
                except Exception:
                    proc.kill()
        except Exception:
            pass
    SPAWNED_PROCESSES.clear()
    SPAWNED_PROCESSES_BY_APP.clear()
    OPEN_WINDOWS.clear()


def find_app_browser() -> str | None:
    """Localiza executável do Edge, Chrome ou Brave para execução em modo Desktop App."""
    candidates = [
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
    ]
    for p in candidates:
        if os.path.isfile(p):
            return p
    return None


def open_in_app_mode(url: str, window_size: str = "1280,820") -> subprocess.Popen | None:
    """Abre URL em janela de aplicativo Desktop nativo (sem abas, sem barra de URLs)."""
    browser = find_app_browser()
    if not browser:
        webbrowser.open(url)
        return None

    profile_dir = Path(os.path.expandvars(r"%LocalAppData%\WizardGames\AppData"))
    profile_dir.mkdir(parents=True, exist_ok=True)

    cmd = [
        browser,
        f"--app={url}",
        f"--user-data-dir={profile_dir}",
        f"--window-size={window_size}",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        "--disable-sync",
        "--app-auto-launched"
    ]

    creation_flags = 0
    if sys.platform == "win32":
        creation_flags = 0x08000000  # CREATE_NO_WINDOW: zero consoles

    try:
        proc = subprocess.Popen(cmd, creationflags=creation_flags)
        return proc
    except Exception as e:
        print(f"Erro ao abrir janela de app: {e}")
        webbrowser.open(url)
        return None


def start_app_process(app_id: str) -> dict:
    """Inicia o processo do aplicativo em segundo plano sem abrir janelas de terminal."""
    app = APPS.get(app_id)
    if not app:
        return {"error": "Aplicativo não encontrado"}

    port = app.get("port")
    if is_port_open(port):
        return {"status": "already_running", "port": port}

    script_path = ROOT_DIR / app["script"]
    if not script_path.exists():
        # Fallback para o .bat local
        script_path = ROOT_DIR / app["bat"]

    if not script_path.exists():
        return {"error": f"Script de inicialização não encontrado: {script_path}"}

    # Comando de execução no Windows em janela separada
    if script_path.suffix == ".ps1":
        cmd = [
            "powershell.exe",
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-File", str(script_path)
        ]
    else:
        cmd = ["cmd.exe", "/c", str(script_path)]

    try:
        # Execução 100% invisível em segundo plano (sem janelas de prompt/PowerShell visíveis)
        creation_flags = 0
        if sys.platform == "win32":
            creation_flags = 0x08000000  # CREATE_NO_WINDOW

        proc = subprocess.Popen(
            cmd,
            cwd=str(ROOT_DIR),
            creationflags=creation_flags
        )
        SPAWNED_PROCESSES.append(proc)
        if app_id not in SPAWNED_PROCESSES_BY_APP:
            SPAWNED_PROCESSES_BY_APP[app_id] = []
        SPAWNED_PROCESSES_BY_APP[app_id].append(proc)

        # Aguarda até 6 segundos para a porta abrir
        for _ in range(12):
            time.sleep(0.5)
            if is_port_open(port):
                return {"status": "started", "port": port}

        return {"status": "launched", "port": port, "message": "Iniciando em segundo plano..."}
    except Exception as e:
        return {"error": str(e)}


class HubRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(HUB_DIR), **kwargs)

    def log_message(self, format, *args):
        # Modo silencioso: evita erros de stream fechado em pythonw.exe
        pass

    def end_headers(self):
        # Desabilita cache para a API e o Hub
        if self.path.startswith("/api"):
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
            self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # 1. API: Status de todas as portas, IP, janelas abertas e jogos ativos
        if path == "/api/status":
            local_ip = get_local_ip()
            statuses = {}
            for app_id, app in APPS.items():
                port = app.get("port")
                active = is_port_open(port)
                statuses[app_id] = {
                    "id": app_id,
                    "name": app.get("name"),
                    "subtitle": app.get("subtitle"),
                    "active": active,
                    "port": port,
                    "admin_url": f"http://localhost:{port}{app['admin_path']}" if port else None,
                    "display_url": f"http://{local_ip}:{port}{app['display_path']}" if (port and app.get('display_path')) else None,
                    "student_url": f"http://{local_ip}:{port}{app['student_path']}" if (port and app.get('student_path')) else None,
                    "qr_url": f"http://{local_ip}:{port}{app['qr_path']}" if (port and app.get('qr_path')) else None,
                }

            # OPEN_WINDOWS mantidas ativas até fechamento explícito pelo usuário ou encerramento do jogo

            open_win_data = {}
            for k, v in OPEN_WINDOWS.items():
                open_win_data[k] = {
                    "key": k,
                    "app_id": v.get("app_id"),
                    "route": v.get("route"),
                    "title": v.get("title"),
                    "url": v.get("url"),
                    "minimized": v.get("minimized", False)
                }

            running_apps = [aid for aid, st in statuses.items() if st["active"]]

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            resp = {
                "ip": local_ip,
                "hub_port": PORT,
                "apps": APPS,
                "statuses": statuses,
                "running_apps": running_apps,
                "open_windows": open_win_data
            }
            self.wfile.write(json.dumps(resp, ensure_ascii=False).encode("utf-8"))
            return

        # 2. API: Gerador de QR Code do Hub
        if path == "/api/qr":
            text = query.get("text", [None])[0]
            if not text:
                text = f"http://{get_local_ip()}:8000/student"

            try:
                import qrcode
                import qrcode.image.svg
                factory = qrcode.image.svg.SvgImage
                img = qrcode.make(text, image_factory=factory)
                svg_data = img.to_string()

                self.send_response(200)
                self.send_header("Content-Type", "image/svg+xml; charset=utf-8")
                self.send_header("Cache-Control", "public, max-age=60")
                self.end_headers()
                self.wfile.write(svg_data)
                return
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "text/plain")
                self.end_headers()
                self.wfile.write(str(e).encode())
                return

        # 2. API: Iniciar um jogo
        if path == "/api/start":
            app_id = query.get("app", [None])[0]
            if not app_id:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"error": "Parametro app obrigatorio"}')
                return

            result = start_app_process(app_id)
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode("utf-8"))
            return

        # 3. API: Abrir URL em modo Desktop App ou navegador
        if path == "/api/open":
            url = query.get("url", [None])[0]
            mode = query.get("mode", ["app"])[0]
            window_size = query.get("size", ["1200,800"])[0]
            app_id = query.get("app", [None])[0]
            route = query.get("route", ["main"])[0]
            title = query.get("title", ["Wizard Games"])[0]

            if url:
                try:
                    proc = None
                    if mode == "app":
                        proc = open_in_app_mode(url, window_size=window_size)
                    else:
                        webbrowser.open(url)

                    # Registra a janela aberta
                    window_key = f"{app_id}:{route}" if (app_id and route) else url
                    OPEN_WINDOWS[window_key] = {
                        "key": window_key,
                        "app_id": app_id,
                        "route": route,
                        "title": title,
                        "url": url,
                        "size": window_size,
                        "proc": proc,
                        "minimized": False,
                        "opened_at": time.time()
                    }

                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True, "key": window_key}).encode())
                    return
                except Exception as e:
                    self.send_response(500)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": str(e)}).encode())
                    return

        # 3.1 API: Encerrar um jogo em execução (Steam-style Hub)
        if path == "/api/stop":
            app_id = query.get("app", [None])[0]
            if not app_id:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"error": "Parametro app obrigatorio"}')
                return

            result = stop_app_process(app_id)
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode("utf-8"))
            return

        # 3.2 API: Encerrar todos os jogos ativos
        if path == "/api/stop_all":
            result = stop_all_apps()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode("utf-8"))
            return

        # 3.3 API: Ações em janelas de rotas (minimizar, focar, fechar)
        if path == "/api/window":
            key = query.get("key", [None])[0]
            action = query.get("action", ["focus"])[0]
            if not key:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"error": "Parametro key obrigatorio"}')
                return

            result = window_action(key, action)
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode("utf-8"))
            return

        # 4. API: Liberar Firewall
        if path == "/api/firewall":
            firewall_ps1 = ROOT_DIR / "scripts" / "liberar-firewall.ps1"
            if firewall_ps1.exists():
                subprocess.Popen([
                    "powershell.exe",
                    "-NoProfile",
                    "-ExecutionPolicy", "Bypass",
                    "-File", str(firewall_ps1),
                    "-Silent"
                ], cwd=str(ROOT_DIR), creationflags=0x08000000 if sys.platform == "win32" else 0)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"success": true, "message": "Executando configuracao de firewall..."}')
                return

        # 5. Redirecionamento de Favicon
        if path == "/favicon.ico":
            self.path = "/static/favicon.ico"
        elif path == "/favicon.svg":
            self.path = "/static/favicon.svg"
        elif path in ("/favicon.png", "/favicon-32x32.png"):
            self.path = f"/static{path}"

        # 6. Redirecionamento da raiz para index.html
        if self.path in ("", "/"):
            self.path = "/index.html"

        # Arquivos estáticos normais
        return super().do_GET()


def open_browser_after_delay():
    time.sleep(1.2)
    url = f"http://localhost:{PORT}"
    print(f" [OK] Abrindo aplicativo Desktop em: {url}")
    try:
        open_in_app_mode(url)
    except Exception:
        webbrowser.open(url)


def run_server():
    server_address = ("0.0.0.0", PORT)
    # Servidor multi-thread: atende requisições simultâneas sem travar
    httpd = http.server.ThreadingHTTPServer(server_address, HubRequestHandler)
    local_ip = get_local_ip()

    print("============================================================")
    print(" WIZARD GAMES -- CENTRAL DE GAMIFICACAO PEDAGOGICA (HUB)")
    print("============================================================")
    print(f"  Painel Principal: http://localhost:{PORT}")
    print(f"  Rede Wi-Fi:       http://{local_ip}:{PORT}")
    print("============================================================")
    print(" Pressione Ctrl+C para encerrar o painel.")
    print("============================================================\n")

    # Abre o navegador em thread separada
    threading.Thread(target=open_browser_after_delay, daemon=True).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrando o Wizard Games Hub...")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
