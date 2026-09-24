import express from "express";
import { createServer } from "http";
import { fileURLToPath } from "url";
import path from "path";
import os from "os";
import { WebSocketServer, WebSocket } from "ws";
import { generateRound } from "./shared/colors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);

// Estado centralizado do jogo no servidor
const gameState = {
  round: generateRound(6),
  mode: "practice", // "practice" | "challenge"
  visible: false,
  status: "wait",   // "wait" | "show" | "hide"
  timerTotal: 10,
  timerLeft: 0,
};

// WebSocket Server
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

function broadcast(data, excludeWs = null) {
  const payload = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (err) {}
    }
  }
}

wss.on("connection", (ws) => {
  // Envia estado atual imediatamente ao conectar (Display ou Admin)
  ws.send(JSON.stringify({
    type: "sync_state",
    state: gameState,
    clientsCount: wss.clients.size,
  }));

  // Notifica todos sobre o número de telas conectadas
  broadcast({ type: "clients_count", count: wss.clients.size });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw);
      const { type } = msg;

      if (type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
        return;
      }

      if (type === "new_round") {
        const count = Math.min(Math.max(parseInt(msg.count) || 6, 4), 10);
        gameState.round = msg.round || generateRound(count);
        gameState.mode = "practice";
        gameState.visible = false;
        gameState.status = "wait";
        broadcast({ type: "wait", round: gameState.round, mode: gameState.mode });
        broadcast({ type: "sync_state", state: gameState });
        return;
      }

      if (type === "show") {
        gameState.visible = true;
        gameState.status = "show";
        if (msg.round) gameState.round = msg.round;
        if (msg.mode) gameState.mode = msg.mode;
        broadcast({ type: "show", round: gameState.round, mode: gameState.mode });
        broadcast({ type: "sync_state", state: gameState });
        return;
      }

      if (type === "toggle") {
        gameState.mode = gameState.mode === "practice" ? "challenge" : "practice";
        if (gameState.visible) {
          broadcast({ type: "show", round: gameState.round, mode: gameState.mode });
        }
        broadcast({ type: "sync_state", state: gameState });
        return;
      }

      if (type === "hide") {
        gameState.visible = false;
        gameState.status = "hide";
        broadcast({ type: "hide", round: gameState.round, mode: gameState.mode });
        broadcast({ type: "sync_state", state: gameState });
        return;
      }

      if (type === "timer") {
        gameState.timerTotal = msg.total;
        gameState.timerLeft = msg.left;
        broadcast({ type: "timer", total: msg.total, left: msg.left });
        return;
      }

      if (type === "timer-end") {
        gameState.timerLeft = 0;
        broadcast({ type: "timer-end" });
        return;
      }
    } catch (err) {
      console.error("Erro no processamento da mensagem WebSocket:", err);
    }
  });

  ws.on("close", () => {
    broadcast({ type: "clients_count", count: wss.clients.size });
  });
});

// Arquivos Estáticos & Rotas HTTP
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_, res) => res.sendFile(path.join(__dirname, "public/admin/index.html")));
app.get("/admin", (_, res) => res.sendFile(path.join(__dirname, "public/admin/index.html")));
app.get("/display", (_, res) => res.sendFile(path.join(__dirname, "public/display/index.html")));

app.get("/api/state", (_, res) => {
  res.json({
    state: gameState,
    clientsCount: wss.clients.size,
    ip: getLocalIp(),
    port: PORT,
  });
});

function getLocalIp() {
  const candidates = [];
  for (const [name, ifaces] of Object.entries(os.networkInterfaces())) {
    if (/vEthernet|Virtual|Loopback|WSL/i.test(name)) continue;
    for (const iface of ifaces) {
      if (iface.family === "IPv4" && !iface.internal && !iface.address.startsWith("169.254.")) {
        if (/Wi-Fi|Ethernet/i.test(name) || iface.address.startsWith("192.168.") || iface.address.startsWith("10.")) {
          return iface.address;
        }
        candidates.push(iface.address);
      }
    }
  }
  return candidates[0] || "127.0.0.1";
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, "0.0.0.0", () => {
  const ip = getLocalIp();
  console.log("\n============================================================");
  console.log(" WIZARD GAMES -- STROOP COLOR EFFECT (WebSocket Multi-Tela)");
  console.log("============================================================");
  console.log("  Painel Admin:        http://localhost:" + PORT + "/");
  console.log("  Display (Projetor):  http://" + ip + ":" + PORT + "/display");
  console.log("============================================================\n");
});
