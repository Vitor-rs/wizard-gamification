/**
 * 🎮 WIZARD GAMES HUB — CLIENT JAVASCRIPT
 * Atualiza status em tempo real, gerencia inicialização de jogos,
 * menu lateral flutuante com auto-close de 15s e controle individual de processos/janelas.
 */

let hubState = {
  ip: "127.0.0.1",
  apps: {},
  statuses: {},
  running_apps: [],
  open_windows: {}
};

// ─── ELEMENTOS DOM ──────────────────────────────────────────
const wifiIpText = document.getElementById("wifiIpText");
const sidebarWifiIpText = document.getElementById("sidebarWifiIpText");
const toastEl = document.getElementById("hubToast");
const toastMsg = document.getElementById("toastMsg");
const qrModal = document.getElementById("qrModal");
const qrImg = document.getElementById("qrImg");
const qrLinkInput = document.getElementById("qrLinkInput");

// Elementos do Sidebar Flutuante
const floatingMenuBtn = document.getElementById("floatingMenuBtn");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const floatingSidebar = document.getElementById("floatingSidebar");
const sidebarRunningGamesContainer = document.getElementById("sidebarRunningGamesContainer");
const sidebarTimerBar = document.getElementById("sidebarTimerBar");

// ─── TIMER DE AUTO-CLOSE (15s DE INATIVIDADE) ───────────────
const AUTO_CLOSE_MS = 15000;
let timerStartTs = 0;
let timerAnimId = null;

function startAutoCloseTimer() {
  stopAutoCloseTimer();
  timerStartTs = performance.now();

  function updateBar() {
    const elapsed = performance.now() - timerStartTs;
    const remainingFraction = Math.max(0, 1 - (elapsed / AUTO_CLOSE_MS));
    if (sidebarTimerBar) {
      sidebarTimerBar.style.transform = `scaleX(${remainingFraction})`;
    }

    if (elapsed >= AUTO_CLOSE_MS) {
      closeSidebar();
    } else {
      timerAnimId = requestAnimationFrame(updateBar);
    }
  }

  timerAnimId = requestAnimationFrame(updateBar);
}

function resetAutoCloseTimer() {
  if (floatingSidebar && floatingSidebar.classList.contains("active")) {
    startAutoCloseTimer();
  }
}

function stopAutoCloseTimer() {
  if (timerAnimId) {
    cancelAnimationFrame(timerAnimId);
    timerAnimId = null;
  }
  if (sidebarTimerBar) {
    sidebarTimerBar.style.transform = "scaleX(1)";
  }
}

// ─── CONTROLE DO SIDEBAR FLUTUANTE ──────────────────────────
function toggleSidebar() {
  if (floatingSidebar && floatingSidebar.classList.contains("active")) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

function openSidebar() {
  if (floatingMenuBtn) floatingMenuBtn.classList.add("active");
  if (sidebarBackdrop) sidebarBackdrop.classList.add("active");
  if (floatingSidebar) floatingSidebar.classList.add("active");
  fetchStatus();
  startAutoCloseTimer();
}

function closeSidebar() {
  if (floatingMenuBtn) floatingMenuBtn.classList.remove("active");
  if (sidebarBackdrop) sidebarBackdrop.classList.remove("active");
  if (floatingSidebar) floatingSidebar.classList.remove("active");
  stopAutoCloseTimer();
}

// ─── NOTIFICAÇÕES TOAST ─────────────────────────────────────
function showToast(msg, duration = 3500) {
  if (!toastMsg || !toastEl) return;
  toastMsg.textContent = msg;
  toastEl.classList.add("active");
  clearTimeout(window._toastTimeout);
  window._toastTimeout = setTimeout(() => {
    toastEl.classList.remove("active");
  }, duration);
}

// ─── COPIAR PARA ÁREA DE TRANSFERÊNCIA ──────────────────────
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("📋 Copiado para a área de transferência!");
  } catch (err) {
    const input = document.createElement("input");
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    showToast("📋 Copiado com sucesso!");
  }
}

// ─── ATUALIZAR STATUS DO HUB E DOS JOGOS ────────────────────
async function fetchStatus() {
  try {
    const res = await fetch("/api/status");
    if (!res.ok) return;
    const data = await res.json();
    hubState = data;

    // 1. Atualiza IP no topo da navbar
    if (wifiIpText) {
      wifiIpText.textContent = data.ip ? `Wi-Fi: ${data.ip}` : "Wi-Fi: Conectado";
    }

    // 2. Atualiza IP no Sidebar de Configurações Fixas
    if (sidebarWifiIpText) {
      sidebarWifiIpText.textContent = data.ip || "127.0.0.1";
    }

    // 3. Atualiza badges dos cards principais da tela
    for (const [appId, status] of Object.entries(data.statuses || {})) {
      const badgeEl = document.getElementById(`badge-${appId}`);
      if (!badgeEl) continue;

      if (status.active) {
        badgeEl.className = "card-status-badge online";
        badgeEl.innerHTML = `<span class="dot"></span> Online (Porta ${status.port})`;
      } else {
        badgeEl.className = "card-status-badge offline";
        badgeEl.innerHTML = `<span class="dot"></span> Pronto para Iniciar`;
      }
    }

    // 4. Renderiza seção de jogos ativos no Sidebar
    renderRunningGames(data);

  } catch (err) {
    console.error("Erro ao sincronizar status do hub:", err);
  }
}

// ─── RENDERIZAR JOGOS EM EXECUÇÃO NO SIDEBAR ────────────────
function renderRunningGames(data) {
  if (!sidebarRunningGamesContainer) return;

  const runningAppIds = [];
  for (const [appId, status] of Object.entries(data.statuses || {})) {
    if (status.active) {
      runningAppIds.push(appId);
    }
  }

  // Estado vazio caso nenhum jogo esteja ativo
  if (runningAppIds.length === 0) {
    sidebarRunningGamesContainer.innerHTML = `
      <div class="empty-running-games">
        <div class="empty-icon">🎮</div>
        <strong>Nenhum jogo em execução</strong>
        <p style="margin-top: 5px; font-size: 0.76rem; color: #94A3B8;">
          Inicie o Stroop Color ou Two Truths pelo painel principal.
        </p>
      </div>
    `;
    return;
  }

  let html = "";
  const openWindows = data.open_windows || {};

  for (const appId of runningAppIds) {
    const appConfig = (data.apps && data.apps[appId]) || {};
    const status = data.statuses[appId] || {};
    const title = appConfig.title || appId;
    const port = status.port || appConfig.port;
    const icon = appConfig.icon || "🎮";

    const adminKey = `${appId}:admin`;
    const displayKey = `${appId}:display`;
    const adminWin = openWindows[adminKey];
    const displayWin = openWindows[displayKey];

    html += `
      <div class="running-game-card">
        <div class="running-game-header">
          <div class="running-game-info">
            <span class="pulse-dot-green"></span>
            <span style="font-size: 1.1rem;">${icon}</span>
            <div style="overflow: hidden;">
              <div class="running-game-name" title="${title}">${title}</div>
            </div>
            <span class="running-game-port">:${port}</span>
          </div>
          <button class="btn-stop-game" onclick="stopGame('${appId}')" title="Encerrar processo do servidor e liberar a porta">
            ⛔ Encerrar Jogo
          </button>
        </div>

        <!-- Sublista indentada com rotas do jogo ativo -->
        <div class="sidebar-routes-sublist">
          <!-- Rota: Painel do Professor -->
          <div class="route-item-card">
            <div class="route-info">
              <span class="route-tag">PROFESSOR</span>
              <span class="route-title-text">Controle / Admin</span>
            </div>
            <div class="route-actions">
              <button class="btn-route-action focus" onclick="launchApp('${appId}', 'admin')" title="Focar ou reabrir janela de controle">
                🔍 Focar
              </button>
              ${adminWin ? `
              <button class="btn-route-action min" onclick="windowAction('${adminKey}', 'minimize')" title="Minimizar janela">
                _
              </button>
              <button class="btn-route-action close" onclick="windowAction('${adminKey}', 'close')" title="Fechar janela">
                ✕
              </button>
              ` : ''}
            </div>
          </div>

          <!-- Rota: Tela do Projetor -->
          <div class="route-item-card">
            <div class="route-info">
              <span class="route-tag" style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7;">PROJETOR</span>
              <span class="route-title-text">Display da Turma</span>
            </div>
            <div class="route-actions">
              <button class="btn-route-action focus" onclick="launchApp('${appId}', 'display')" title="Focar ou reabrir tela do projetor">
                🔍 Focar
              </button>
              ${displayWin ? `
              <button class="btn-route-action min" onclick="windowAction('${displayKey}', 'minimize')" title="Minimizar janela">
                _
              </button>
              <button class="btn-route-action close" onclick="windowAction('${displayKey}', 'close')" title="Fechar janela">
                ✕
              </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  sidebarRunningGamesContainer.innerHTML = html;
}

// ─── INICIALIZAR OU ABRIR JOGO ──────────────────────────────
async function launchApp(appId, target = "admin") {
  const appName = appId === 'stroop' ? 'Stroop Color' : appId === 'two-truths' ? 'Two Truths' : appId;
  showToast(`⚡ Inicializando ${appName}...`);

  try {
    // 1. Inicia processo em segundo plano (se ainda não ativo)
    const res = await fetch(`/api/start?app=${encodeURIComponent(appId)}`);
    const data = await res.json();

    if (data.error) {
      showToast(`❌ Erro: ${data.error}`);
      return;
    }

    // 2. Determina a URL
    await fetchStatus();
    const appStatus = hubState.statuses[appId] || {};
    let url = target === "display" ? appStatus.display_url : appStatus.admin_url;

    if (!url) {
      const port = data.port || (hubState.apps[appId] && hubState.apps[appId].port);
      url = target === "display" ? `http://localhost:${port}/display` : `http://localhost:${port}/admin`;
    }

    const windowSize = target === "display" ? "1280,720" : "1200,800";
    const windowTitle = `${appName} - ${target === 'display' ? 'Tela do Projetor' : 'Painel do Professor'}`;
    showToast(`🚀 Abrindo aplicativo Desktop (${target === 'display' ? 'Projetor' : 'Professor'})...`);

    // 3. Abre em modo Desktop App nativo registrando rota e título
    try {
      await fetch(`/api/open?url=${encodeURIComponent(url)}&mode=app&size=${windowSize}&app=${encodeURIComponent(appId)}&route=${encodeURIComponent(target)}&title=${encodeURIComponent(windowTitle)}`);
      await fetchStatus();
    } catch (e) {
      window.open(url, "_blank");
    }
  } catch (err) {
    showToast(`❌ Falha ao iniciar aplicativo: ${err.message}`);
  }
}

// ─── FINALIZAR UM JOGO ──────────────────────────────────────
async function stopGame(appId) {
  const appConfig = (hubState.apps && hubState.apps[appId]) || {};
  const appName = appConfig.title || appId;
  showToast(`🧹 Encerrando ${appName}...`);

  try {
    const res = await fetch(`/api/stop?app=${encodeURIComponent(appId)}`);
    const data = await res.json();
    await fetchStatus();
    showToast(`✅ ${appName} encerrado com sucesso!`);
  } catch (err) {
    showToast(`❌ Erro ao encerrar jogo: ${err.message}`);
  }
}

// ─── FINALIZAR TODOS OS JOGOS ───────────────────────────────
async function stopAllGames() {
  showToast("🧹 Encerrando todos os jogos ativos...");
  try {
    const res = await fetch("/api/stop_all");
    const data = await res.json();
    await fetchStatus();
    showToast("✅ Todos os jogos foram encerrados com sucesso!");
  } catch (err) {
    showToast(`❌ Erro ao encerrar jogos: ${err.message}`);
  }
}

// ─── AÇÕES DE JANELA (FOCAR, MINIMIZAR, FECHAR) ─────────────
async function windowAction(key, action) {
  try {
    const res = await fetch(`/api/window?key=${encodeURIComponent(key)}&action=${encodeURIComponent(action)}`);
    const data = await res.json();
    if (action === "close") {
      showToast("Janela fechada.");
    } else if (action === "minimize") {
      showToast("Janela minimizada.");
    } else {
      showToast("Janela restaurada.");
    }
    await fetchStatus();
  } catch (err) {
    console.error("Erro na ação de janela:", err);
  }
}

// ─── QR CODE PARA ALUNOS ────────────────────────────────────
function showStudentQr(appId) {
  const status = hubState.statuses[appId];
  const ip = hubState.ip || "127.0.0.1";
  const port = status ? status.port : 8000;
  const studentUrl = `http://${ip}:${port}/student`;
  const qrDirectUrl = `/api/qr?text=${encodeURIComponent(studentUrl)}`;

  qrLinkInput.value = studentUrl;
  qrImg.src = qrDirectUrl;
  qrModal.classList.add("active");

  // Inicia em segundo plano se offline
  if (!status || !status.active) {
    fetch(`/api/start?app=${encodeURIComponent(appId)}`).catch(() => {});
  }
}

function closeStudentQr() {
  qrModal.classList.remove("active");
}

// ─── LIBERAR FIREWALL ───────────────────────────────────────
async function triggerFirewall() {
  showToast("🛡️ Abrindo configurador de Firewall do Windows...");
  try {
    await fetch("/api/firewall");
    showToast("🛡️ Permissões de firewall solicitadas! Confirme na tela do Windows se necessário.");
  } catch (err) {
    showToast("❌ Erro ao disparar script de firewall.");
  }
}

// ─── INICIALIZAÇÃO E EVENTOS ────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  fetchStatus();
  setInterval(fetchStatus, 3500);

  // Fechar modal de QR Code ao clicar fora
  if (qrModal) {
    qrModal.addEventListener("click", (e) => {
      if (e.target === qrModal) closeStudentQr();
    });
  }

  // Interações no Sidebar resetam o timer de 15s de auto-hide
  if (floatingSidebar) {
    ["mousemove", "mousedown", "click", "keydown", "touchstart", "scroll"].forEach(evt => {
      floatingSidebar.addEventListener(evt, resetAutoCloseTimer, { passive: true });
    });
  }

  // Tecla Escape fecha o Sidebar ou modal de QR Code
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (floatingSidebar && floatingSidebar.classList.contains("active")) {
        closeSidebar();
      }
      if (qrModal && qrModal.classList.contains("active")) {
        closeStudentQr();
      }
    }
  });
});
