// Suporte duplo: WebSocket de rede real (Projetor/Wi-Fi) + BroadcastChannel local
const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${wsProto}//${window.location.host}/ws`;
let ws = null;
let pingInterval = null;

let bc = null;
try {
  bc = new BroadcastChannel("stroop_channel");
} catch (e) {}

const screenWait  = document.getElementById("screenWait");
const screenGame  = document.getElementById("screenGame");
const screenHide  = document.getElementById("screenHide");
const wordList    = document.getElementById("wordList");
const modeLabel   = document.getElementById("modeLabel");
const timerBar        = document.getElementById("timerOverlay");
const displayTimer    = document.getElementById("displayTimer");
const displayTimerNum = document.getElementById("displayTimerNum");
const modeBadge       = document.getElementById("modeBadge");
const btnFs           = document.getElementById("btnFullscreen");

// ─── Helpers de Tela ────────────────────────────────────────
function showScreen(name) {
  if (screenWait) {
    screenWait.classList.toggle("hidden", name !== "wait");
    screenWait.style.display = (name === "wait") ? "flex" : "none";
  }
  if (screenGame) {
    screenGame.style.display = (name === "game") ? "flex" : "none";
  }
  if (screenHide) {
    screenHide.style.display = (name === "hide") ? "flex" : "none";
  }
}

function renderWords(words, inks) {
  if (!wordList) return;
  wordList.innerHTML = words.map((w, i) =>
    `<div class="word" style="color:${inks[i]}">${w.en}</div>`
  ).join("");
}

function handleEvent(data) {
  if (!data) return;
  const { type, round, mode } = data;

  if (type === "wait") {
    showScreen("wait");
    if (displayTimer) displayTimer.classList.add("hidden");
    if (modeBadge) {
      modeBadge.className = "";
      modeBadge.textContent = "Aguardando...";
    }
    if (timerBar) {
      timerBar.style.transform = "scaleX(0)";
      timerBar.classList.remove("urgent");
    }
    return;
  }

  if (type === "show" && round) {
    const isPractice = mode === "practice";
    // Na prática: a cor do texto é o próprio nome da cor (congruente)
    // No desafio: a cor do texto é diferente do nome da cor (incongruente / Stroop)
    const inks = isPractice
      ? round.words.map(w => w.hex)
      : round.inks;

    renderWords(round.words, inks);

    if (modeLabel) {
      modeLabel.textContent = isPractice ? "Modo Prática (Diga a cor que lê)" : "Modo Desafio (Diga a cor da TINTA!)";
      modeLabel.className   = isPractice ? "practice" : "challenge";
    }
    if (modeBadge) {
      modeBadge.className   = isPractice ? "practice" : "challenge";
      modeBadge.textContent = isPractice ? "Prática" : "Desafio";
    }

    showScreen("game");
    return;
  }

  if (type === "hide") {
    showScreen("hide");
    if (displayTimer) displayTimer.classList.add("hidden");
    if (modeBadge) {
      modeBadge.className   = "hidden";
      modeBadge.textContent = "Oculto";
    }
    return;
  }

  // Timer
  if (type === "timer") {
    if (displayTimer && displayTimerNum) {
      displayTimer.classList.remove("hidden");
      displayTimerNum.textContent = data.left.toFixed(1);
      displayTimer.classList.toggle("urgent", data.left <= 3.0);
    }
    if (timerBar) {
      const pct = data.left / data.total;
      timerBar.style.transform = `scaleX(${pct})`;

      const inv = 1 - pct;
      const r = Math.round(46  + (231 - 46)  * inv);
      const g = Math.round(204 + (76  - 204) * inv);
      const b = Math.round(113 + (60  - 113) * inv);
      timerBar.style.background = `rgb(${r},${g},${b})`;
      timerBar.style.boxShadow  = `0 0 ${12 + inv * 40}px ${2 + inv * 14}px rgb(${r},${g},${b})`;

      timerBar.classList.remove("warm", "hot", "urgent");
      if      (pct < 0.15) timerBar.classList.add("urgent");
      else if (pct < 0.35) timerBar.classList.add("hot");
      else if (pct < 0.55) timerBar.classList.add("warm");
    }
    return;
  }

  if (type === "timer-end") {
    if (displayTimer) displayTimer.classList.add("hidden");
    if (timerBar) {
      timerBar.style.transform = "scaleX(0)";
      timerBar.classList.remove("warm", "hot", "urgent");
    }
    return;
  }

  // Sincronização inicial quando conecta
  if (type === "sync_state" && data.state) {
    const s = data.state;
    if (s.visible && s.round) {
      handleEvent({ type: "show", round: s.round, mode: s.mode });
    } else if (s.status === "hide") {
      handleEvent({ type: "hide" });
    } else {
      handleEvent({ type: "wait" });
    }
  }
}

// ─── Conexão WebSocket ──────────────────────────────────────
function connectWS() {
  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      startHeartbeat();
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        handleEvent(data);
      } catch (err) {}
    };

    ws.onclose = () => {
      clearInterval(pingInterval);
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

// ─── BroadcastChannel Fallback ──────────────────────────────
if (bc) {
  bc.addEventListener("message", ({ data }) => {
    handleEvent(data);
  });
}

// ─── Botão Tela Cheia & Gestão de Tela Cheia ────────────────
function getFullscreenElement() {
  return document.fullscreenElement ||
         document.webkitFullscreenElement ||
         document.mozFullScreenElement ||
         document.msFullscreenElement || null;
}

async function toggleFullScreen() {
  const docEl = document.documentElement;
  const isFs = !!getFullscreenElement();

  try {
    if (!isFs) {
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        await docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      } else {
        showToast("💡 Dica: Pressione F11 no teclado para tela cheia!");
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        await document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      }
    }
  } catch (err) {
    console.warn("Fullscreen toggle warning:", err);
    showToast("💡 Pressione F11 no teclado para tela cheia!");
  }
  updateFullscreenUI();
}

function updateFullscreenUI() {
  const isFs = !!getFullscreenElement();
  if (btnFs) {
    btnFs.innerHTML = isFs ? "🗗 Sair da Tela Cheia" : "⛶ Tela Cheia";
    btnFs.style.background = isFs ? "var(--wiz-red)" : "rgba(255, 255, 255, 0.08)";
    btnFs.style.borderColor = isFs ? "var(--wiz-red)" : "rgba(255, 255, 255, 0.2)";
    btnFs.style.boxShadow = isFs ? "0 0 15px rgba(231, 0, 34, 0.5)" : "none";
  }
}

if (btnFs) {
  btnFs.addEventListener("click", toggleFullScreen);
}

["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"].forEach(evt => {
  document.addEventListener(evt, updateFullscreenUI);
});

// Atalho de teclado 'F' ou 'F11'
document.addEventListener("keydown", (e) => {
  if ((e.key === "f" || e.key === "F") && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
    e.preventDefault();
    toggleFullScreen();
  }
});

function showToast(msg) {
  let t = document.getElementById("fsToast");
  if (!t) {
    t = document.createElement("div");
    t.id = "fsToast";
    t.style.cssText = "position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:rgba(5,8,30,0.95);border:2px solid #E70022;color:#fff;padding:12px 28px;border-radius:9999px;font-size:15px;font-weight:700;box-shadow:0 8px 30px rgba(231,0,34,0.5);z-index:1000;display:none;pointer-events:none;font-family:'Work Sans',sans-serif;";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = "block";
  setTimeout(() => { if (t) t.style.display = "none"; }, 3500);
}
