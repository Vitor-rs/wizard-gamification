import { generateRound } from "../../shared/colors.js";

// Suporte duplo: WebSocket de rede real (Projetor/Wi-Fi) + BroadcastChannel local
const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${wsProto}//${window.location.host}/ws`;
let ws = null;
let pingInterval = null;

let bc = null;
try {
  bc = new BroadcastChannel("stroop_channel");
} catch (e) {}

const btnShow        = document.getElementById("btnShow");
const btnToggle      = document.getElementById("btnToggle");
const btnHide        = document.getElementById("btnHide");
const btnNew         = document.getElementById("btnNew");
const stateBadge     = document.getElementById("stateBadge");
const netBadge       = document.getElementById("netBadge");
const colorCount     = document.getElementById("colorCount");
const timerInput     = document.getElementById("timerInput");
const btnTimerStart  = document.getElementById("btnTimerStart");
const btnTimerStop   = document.getElementById("btnTimerStop");
const countdownWrap  = document.getElementById("countdownWrap");
const countdownBar   = document.getElementById("countdownBar");
const countdownNum   = document.getElementById("countdownNum");
const prevLeft       = document.getElementById("prevLeft");
const prevRight      = document.getElementById("prevRight");
const displayLink    = document.getElementById("displayLink");

// Estado
let round   = null;
let mode    = "practice";   // "practice" | "challenge"
let visible = false;

// Timer
let timerInterval = null;
let timerTotal    = 0;
let timerLeft     = 0;

// ─── Conexão WebSocket ──────────────────────────────────────
function connectWS() {
  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      if (netBadge) {
        netBadge.className = "badge badge-show";
        netBadge.textContent = "● Servidor Conectado";
      }
      startHeartbeat();
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "pong") return;

        if (msg.type === "clients_count" && netBadge) {
          netBadge.textContent = `● Online (${msg.count} tela${msg.count > 1 ? 's' : ''})`;
        }

        if (msg.type === "sync_state") {
          const s = msg.state;
          if (s) {
            if (s.round) round = s.round;
            if (s.mode) mode = s.mode;
            visible = s.visible;
            renderPreview();
            updateUI();
          }
          if (msg.clientsCount && netBadge) {
            netBadge.textContent = `● Online (${msg.clientsCount} tela${msg.clientsCount > 1 ? 's' : ''})`;
          }
        }
      } catch (err) {}
    };

    ws.onclose = () => {
      clearInterval(pingInterval);
      if (netBadge) {
        netBadge.className = "badge badge-hide";
        netBadge.textContent = "● Reconectando...";
      }
      setTimeout(connectWS, 1500);
    };

    ws.onerror = () => ws.close();
  } catch (err) {
    setTimeout(connectWS, 2000);
  }
}

function startHeartbeat() {
  clearInterval(pingInterval);
  pingInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping" }));
    }
  }, 8000);
}

connectWS();

// ─── Broadcast via WebSocket e BroadcastChannel ─────────────
function broadcast(type, extra = {}) {
  const payload = { type, round, mode, ...extra };

  // 1. Envia via WebSocket para todos os computadores, projetores e celulares
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }

  // 2. Envia via BroadcastChannel para abas no mesmo navegador
  if (bc) {
    try {
      bc.postMessage(payload);
    } catch (e) {}
  }
}

// ─── Gera nova rodada ───────────────────────────────────────
function newRound() {
  const n = Math.min(Math.max(parseInt(colorCount.value) || 6, 4), 10);
  round   = generateRound(n);
  mode    = "practice";
  visible = false;
  renderPreview();
  broadcast("new_round", { count: n });
  updateUI();
}

// ─── UI State ───────────────────────────────────────────────
function updateUI() {
  btnShow.disabled   = !round || visible;
  btnToggle.disabled = !round || !visible;
  btnHide.disabled   = !round || !visible;

  if (!round) {
    setBadge("Aguardando", "");
  } else if (!visible) {
    setBadge("Oculto", "badge-hide");
  } else if (mode === "practice") {
    setBadge("Pratica", "badge-practice");
  } else {
    setBadge("Desafio", "badge-challenge");
  }

  btnToggle.textContent = mode === "practice" ? "Ir para Desafio" : "Voltar para Pratica";
}

function setBadge(text, cls) {
  stateBadge.textContent = text;
  stateBadge.className   = "badge " + cls;
}

// ─── Botoes de Controle ─────────────────────────────────────
btnNew.addEventListener("click", newRound);

btnShow.addEventListener("click", () => {
  if (!round) return;
  visible = true;
  broadcast("show");
  updateUI();
});

btnToggle.addEventListener("click", () => {
  if (!round || !visible) return;
  mode = mode === "practice" ? "challenge" : "practice";
  broadcast("show");
  updateUI();
});

btnHide.addEventListener("click", () => {
  if (!round) return;
  visible = false;
  broadcast("hide");
  updateUI();
});

// ─── Timer ──────────────────────────────────────────────────
btnTimerStart.addEventListener("click", () => {
  const secs = parseFloat(timerInput.value);
  if (!secs || secs <= 0) return;
  stopTimer();
  timerTotal = secs;
  timerLeft  = secs;
  countdownWrap.style.display = "";
  btnTimerStart.disabled = true;
  btnTimerStop.disabled  = false;

  const startedAt = performance.now();
  broadcast("timer", { total: timerTotal, left: timerLeft });

  timerInterval = setInterval(() => {
    const elapsed = (performance.now() - startedAt) / 1000;
    timerLeft = Math.max(0, timerTotal - elapsed);
    const pct = timerLeft / timerTotal;

    const r = Math.round(46  + (229 - 46)  * (1 - pct));
    const g = Math.round(204 * pct);
    const b = Math.round(113 * pct);
    countdownBar.style.width      = (pct * 100) + "%";
    countdownBar.style.background = `rgb(${r},${g},${b})`;
    countdownNum.textContent      = timerLeft.toFixed(1);
    countdownNum.style.color      = `rgb(${r},${g},${b})`;

    broadcast("timer", { total: timerTotal, left: timerLeft });

    if (timerLeft <= 0) {
      stopTimer();
      broadcast("timer-end");
    }
  }, 80);
});

btnTimerStop.addEventListener("click", stopTimer);

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  btnTimerStart.disabled = false;
  btnTimerStop.disabled  = true;
  countdownWrap.style.display = "none";
  broadcast("timer-end");
}

// ─── Preview ────────────────────────────────────────────────
function renderPreview() {
  if (!round) return;
  prevLeft.innerHTML  = round.words.map(w =>
    `<div class="pw" style="color:${w.hex}">${w.en}</div>`).join("");
  prevRight.innerHTML = round.words.map((w, i) =>
    `<div class="pw" style="color:${round.inks[i]}">${w.en}</div>`).join("");
}

// Configura link do display
if (displayLink) {
  displayLink.href = `${window.location.protocol}//${window.location.host}/display`;
}

// Inicializa rodada
newRound();
