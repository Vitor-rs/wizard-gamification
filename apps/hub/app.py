"""
🎮 WIZARD GAMES — DESKTOP APPLICATION WRAPPER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Executa a Central de Gamificação Wizard como um aplicativo Desktop independente:
- Sem terminal/console visível (executado via pythonw ou launcher silencioso).
- Wrapper nativo em Chromium App Mode (Microsoft Edge / Google Chrome).
- Janela própria e limpa, sem barra de navegação, sem abas de sites externos.
- Encerra automaticamente servidores filhos (Node.js/Python) ao fechar o app.
"""

import os
import sys
import time
import socket
import threading
import traceback
from pathlib import Path

# Garante streams válidos mesmo sob pythonw.exe
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w", encoding="utf-8")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w", encoding="utf-8")

HUB_DIR = Path(__file__).resolve().parent
ROOT_DIR = HUB_DIR.parent.parent
sys.path.insert(0, str(HUB_DIR))

import server

PORT = server.PORT


def log_debug(msg: str):
    try:
        log_path = Path(os.path.expandvars(r"%TEMP%\wizard_games_app.log"))
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}\n")
    except Exception:
        pass


def is_server_ready() -> bool:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.3)
        res = s.connect_ex(("127.0.0.1", PORT))
        s.close()
        return res == 0
    except Exception:
        return False


def start_http_server():
    server_address = ("0.0.0.0", PORT)
    try:
        httpd = server.http.server.ThreadingHTTPServer(server_address, server.HubRequestHandler)
        httpd.serve_forever()
    except Exception as e:
        log_debug(f"Erro no servidor HTTP: {e}")


def main():
    try:
        log_debug("Iniciando Wizard Games Desktop App Wrapper...")

        # 1. Se o servidor já estiver em execução em segundo plano, apenas abre a janela do app
        if is_server_ready():
            log_debug("Servidor já ativo na porta 7000. Abrindo janela...")
            server.open_in_app_mode(f"http://localhost:{PORT}")
            sys.exit(0)

        # 2. Inicia o servidor HTTP em thread separada
        server_thread = threading.Thread(target=start_http_server, daemon=True)
        server_thread.start()

        # 3. Aguarda o servidor estar pronto
        for _ in range(30):
            if is_server_ready():
                break
            time.sleep(0.1)

        log_debug("Servidor HTTP ativo. Abrindo janela nativa Chromium App...")

        # 4. Abre a janela do aplicativo Desktop
        app_proc = server.open_in_app_mode(f"http://localhost:{PORT}", window_size="1280,820")

        # 5. Se abriu um processo de app desktop, aguarda o usuário fechar a janela principal
        if app_proc:
            try:
                app_proc.wait()
            except KeyboardInterrupt:
                pass
            finally:
                log_debug("Janela principal fechada. Encerrando servidores filhos...")
                server.cleanup_spawned_processes()
                sys.exit(0)
        else:
            log_debug("Nenhum processo direto retornado. Mantendo em execução...")
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                server.cleanup_spawned_processes()
                sys.exit(0)

    except Exception as e:
        log_debug(f"Exceção fatal no main: {e}\n{traceback.format_exc()}")


if __name__ == "__main__":
    main()
