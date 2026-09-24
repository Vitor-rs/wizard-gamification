/**
 * 🎮 WIZARD GAMES HUB — CLIENT JAVASCRIPT
 * Sistema de Abas de Navegador Real (Browser Tabs):
 *  - Cada aba aberta é o próprio jogo interativo (embarcado sem sair do aplicativo)
 *  - Suporte a Drag-and-Drop Tear-Off (arrastar a aba para fora para destacar em janela inteira)
 *  - Suporte a re-acoplamento da janela de volta à aba
 *  - Menu lateral flutuante e auto-hide de 15 segundos
 */

let hubState = {
  ip: "127.0.0.1",
  apps: {},
  statuses: {},
  running_apps: [],
  open_windows: {}
};

// Registro de Abas Abertas no Navegador
// chave: "appId:route" (ex: "stroop:admin") -> { key, appId, route, title, url, detached, openedAt }
const openTabs = {};

// Aba atualmente selecionada ("hub" ou "appId:route")
let currentActiveTabKey = "hub";

// ─── ELEMENTOS DOM ──────────────────────────────────────────
const wifiIpText = document.getElementById("wifiIpText");
const sidebarWifiIpText = document.getElementById("sidebarWifiIpText");
const toastEl = document.getElementById("hubToast");
const toastMsg = document.getElementById("toastMsg");
const qrModal = document.getElementById("qrModal");
const qrImg = document.getElementById("qrImg");
const qrLinkInput = document.getElementById("qrLinkInput");

// Elementos da Barra de Abas do Navegador
const dynamicBrowserTabs = document.getElementById("dynamicBrowserTabs");
const openWindowsCount = document.getElementById("openWindowsCount");
const tabHub = document.getElementById("tab-hub");
const browserTabsTrack = document.getElementById("browserTabsTrack");
const browserTabsBar = document.getElementById("browserTabsBar");

// Viewports das Abas
const viewportHub = document.getElementById("viewport-hub");
const dynamicTabsViewports = document.getElementById("dynamicTabsViewports");

// Elementos do Sidebar Flutuante
const floatingMenuBtn = document.getElementById("floatingMenuBtn");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const floatingSidebar = document.getElementById("floatingSidebar");
const sidebarRunningGamesContainer = document.getElementById("sidebarRunningGamesContainer");
const sidebarTimerBar = document.getElementById("sidebarTimerBar");

// ─── TIMER DE AUTO-CLOSE (15s DE INATIVIDADE NO SIDEBAR) ─────
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

// ─── ABRIR JOGO EM UMA NOVA ABA (O JOGO É A PRÓPRIA PÁGINA) ──
async function openGameTab(appId, target = "admin") {
  const appConfig = (hubState.apps && hubState.apps[appId]) || {};
  const appName = appConfig.name || (appId === 'stroop' ? 'Stroop Color' : appId === 'two-truths' ? 'Two Truths' : appId);
  const routeLabel = target === "display" ? "Projetor" : "Professor";
  const key = `${appId}:${target}`;

  // Se a aba já estiver aberta, apenas foca nela
  if (openTabs[key]) {
    selectBrowserTab(key);
    showToast(`🔍 Alternado para a aba: ${appName} (${routeLabel})`);
    return;
  }

  showToast(`⚡ Inicializando ${appName} em uma nova aba...`);

  try {
    // 1. Inicia processo em segundo plano (se ainda não ativo)
    await fetch(`/api/start?app=${encodeURIComponent(appId)}`);

    // 2. Determina URL do jogo
    await fetchStatus();
    const appStatus = hubState.statuses[appId] || {};
    let url = target === "display" ? appStatus.display_url : appStatus.admin_url;

    if (!url) {
      const port = appStatus.port || appConfig.port || 3000;
      url = target === "display" ? `http://localhost:${port}/display` : `http://localhost:${port}/admin`;
    }

    const title = `${appName} • ${routeLabel}`;

    // 3. Registra na estrutura de abas
    openTabs[key] = {
      key,
      appId,
      route: target,
      title,
      url,
      detached: false,
      openedAt: Date.now()
    };

    // 4. Cria o Viewport do jogo contendo o iframe interativo
    createTabViewport(key, url, title, appId, target);

    // 5. Renderiza a barra de abas no header
    renderBrowserTabs();

    // 6. Seleciona a nova aba como ativa
    selectBrowserTab(key);

    showToast(`🚀 ${title} carregado na aba! Arraste-a para fora para criar uma janela inteira.`);

  } catch (err) {
    showToast(`❌ Falha ao abrir aba: ${err.message}`);
  }
}

// Compatibilidade com cliques nos botões dos cards
window.launchApp = openGameTab;

// ─── CRIAR VIEWPORT DO JOGO COM IFRAME E TOOLBAR ────────────
function createTabViewport(key, url, title, appId, target) {
  if (!dynamicTabsViewports) return;

  // Remove viewport existente com mesma chave se houver
  const existing = document.getElementById(`viewport-${key}`);
  if (existing) existing.remove();

  const panel = document.createElement("div");
  panel.className = "game-viewport-panel";
  panel.id = `viewport-${key}`;

  panel.innerHTML = `
    <!-- Barra de Ferramentas da Aba -->
    <div class="tab-viewport-toolbar">
      <div class="tab-viewport-url-info">
        <span class="url-badge">WIZARD LOCAL</span>
        <span class="url-text">${url}</span>
      </div>

      <div class="tab-viewport-actions">
        <button class="btn-tab-tool popout" onclick="detachTabToWindow('${key}')" title="Destacar esta aba em uma janela inteira separada (ideal para projetor / 2ª tela)">
          🗗 Destacar Janela
        </button>
        <button class="btn-tab-tool" onclick="reloadTabFrame('${key}')" title="Recarregar esta tela">
          🔄 Recarregar
        </button>
        <button class="btn-tab-tool close" onclick="closeBrowserTab('${key}')" title="Fechar esta aba">
          ✕ Fechar
        </button>
      </div>
    </div>

    <!-- Área do Iframe Interativo do Jogo -->
    <div class="tab-iframe-wrapper" id="frame-wrap-${key}">
      <iframe src="${url}" 
              id="iframe-${key}" 
              class="tab-game-iframe" 
              allow="camera; microphone; autoplay; fullscreen; display-capture"
              title="${title}">
      </iframe>
    </div>
  `;

  dynamicTabsViewports.appendChild(panel);
}

// ─── RENDERIZAR ABAS DE NAVEGADOR NO HEADER ─────────────────
function renderBrowserTabs() {
  const tabEntries = Object.entries(openTabs);
  const totalWindows = 1 + tabEntries.length; // Hub + N abas abertas

  // 1. Atualiza contador no canto direito
  if (openWindowsCount) {
    openWindowsCount.textContent = `${totalWindows} ${totalWindows === 1 ? 'aba ativa' : 'abas ativas'}`;
  }

  // 2. Se a aba ativa não existe mais, volta para a aba do Hub
  if (currentActiveTabKey !== "hub" && !openTabs[currentActiveTabKey]) {
    currentActiveTabKey = "hub";
  }

  // 3. Atualiza estado ativo da aba fixa do Hub
  if (tabHub) {
    tabHub.classList.toggle("active", currentActiveTabKey === "hub");
  }

  // 4. Constrói HTML das abas dinâmicas com suporte a Drag & Drop
  if (!dynamicBrowserTabs) return;

  let tabsHtml = "";
  for (const [key, tab] of tabEntries) {
    const appConfig = (hubState.apps && hubState.apps[tab.appId]) || {};
    const appName = appConfig.name || (tab.appId === 'stroop' ? 'Stroop Color' : tab.appId === 'two-truths' ? 'Two Truths' : tab.appId);
    const icon = appConfig.icon || (tab.appId === "stroop" ? "🎨" : tab.appId === "two-truths" ? "🎭" : "🎮");
    const routeLabel = tab.route === "display" ? "Projetor" : tab.route === "admin" ? "Professor" : tab.route;
    const isActive = (currentActiveTabKey === key);

    tabsHtml += `
      <div class="browser-tab dynamic-tab ${isActive ? 'active' : ''} ${tab.detached ? 'detached' : ''}"
           id="tab-${key}"
           data-key="${key}"
           draggable="true"
           ondragstart="handleTabDragStart(event, '${key}')"
           ondragend="handleTabDragEnd(event, '${key}')"
           onclick="selectBrowserTab('${key}')"
           title="Clique para alternar. Arraste para fora para abrir como janela inteira: ${appName} (${routeLabel})">
        <span class="tab-favicon">${icon}</span>
        <span class="tab-route-pill ${tab.route}">${routeLabel}</span>
        <span class="tab-title">${appName}</span>
        ${tab.detached ? `<span class="tab-detached-badge" title="Aberta em janela separada">🗗 Janela</span>` : ''}

        <!-- Botão para Destacar em Janela Separada -->
        <button class="tab-popout-btn"
                onclick="detachTabToWindow('${key}', event)"
                title="${tab.detached ? 'Focar janela externa' : 'Destacar em janela inteira separada (ideal para projetor)'}"
                aria-label="Destacar janela">
          ${tab.detached ? '🔍' : '🗗'}
        </button>

        <!-- Botão Fechar Aba -->
        <button class="tab-close-btn"
                onclick="closeBrowserTab('${key}', event)"
                title="Fechar aba (✕)"
                aria-label="Fechar aba">✕</button>
      </div>
    `;
  }

  dynamicBrowserTabs.innerHTML = tabsHtml;
}

// ─── SELECIONAR ABA DO NAVEGADOR (TROCA DE CONTEÚDO) ────────
function selectBrowserTab(key) {
  currentActiveTabKey = key;

  // 1. Atualiza abas no header
  if (tabHub) {
    tabHub.classList.toggle("active", key === "hub");
  }

  document.querySelectorAll(".dynamic-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.key === key);
  });

  // 2. Atualiza viewports de exibição
  if (viewportHub) {
    viewportHub.classList.toggle("active", key === "hub");
  }

  document.querySelectorAll(".game-viewport-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === `viewport-${key}`);
  });

  // 3. Comportamento específico
  if (key === "hub") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    const tab = openTabs[key];
    if (tab && tab.detached) {
      focusDetachedWindow(key);
    }
  }
}

// ─── FECHAR ABA (REMOVE IFRAME E RESTAURA O HUB) ─────────────
async function closeBrowserTab(key, event) {
  if (event) event.stopPropagation();

  const tab = openTabs[key];
  const tabEl = document.getElementById(`tab-${key}`);
  if (tabEl) {
    tabEl.classList.add("closing");
  }

  // Se a aba estava destacada como janela externa, fecha a janela no Windows
  if (tab && tab.detached) {
    fetch(`/api/window?key=${encodeURIComponent(key)}&action=close`).catch(() => {});
  }

  setTimeout(() => {
    // Remove o painel do viewport do DOM
    const panelEl = document.getElementById(`viewport-${key}`);
    if (panelEl) panelEl.remove();

    // Remove do registro
    delete openTabs[key];

    // Se a aba fechada era a ativa, volta para a aba anterior ou para o Hub
    if (currentActiveTabKey === key) {
      const remainingKeys = Object.keys(openTabs);
      if (remainingKeys.length > 0) {
        selectBrowserTab(remainingKeys[remainingKeys.length - 1]);
      } else {
        selectBrowserTab("hub");
      }
    }

    renderBrowserTabs();
    showToast("✕ Aba fechada.");
  }, 200);
}

// ─── RECARREGAR IFRAME DA ABA ───────────────────────────────
function reloadTabFrame(key) {
  const tab = openTabs[key];
  const iframe = document.getElementById(`iframe-${key}`);
  if (tab && iframe) {
    iframe.src = tab.url;
    showToast("🔄 Tela recarregada.");
  }
}

// ─── DESTAQUE DE ABA: TRANSFORMAR EM JANELA INTEIRA ─────────
async function detachTabToWindow(key, event) {
  if (event) event.stopPropagation();

  const tab = openTabs[key];
  if (!tab) return;

  if (tab.detached) {
    // Já está destacada: foca a janela externa
    focusDetachedWindow(key);
    return;
  }

  showToast(`🗗 Destacando ${tab.title} em janela inteira...`);

  tab.detached = true;
  const windowSize = tab.route === "display" ? "1280,720" : "1200,800";

  // 1. Abre como janela Desktop independente do Windows (Edge/Chrome App Mode)
  try {
    await fetch(`/api/open?url=${encodeURIComponent(tab.url)}&mode=app&size=${windowSize}&app=${encodeURIComponent(tab.appId)}&route=${encodeURIComponent(tab.route)}&title=${encodeURIComponent(tab.title)}`);
  } catch (e) {
    window.open(tab.url, "_blank");
  }

  // 2. Substitui o iframe pelo placeholder de janela destacada
  const wrap = document.getElementById(`frame-wrap-${key}`);
  if (wrap) {
    wrap.innerHTML = `
      <div class="tab-detached-placeholder">
        <div class="detached-icon">🗗</div>
        <h3>Tela Aberta em Janela Separada</h3>
        <p>
          Esta tela foi destacada para uma janela independente do Windows. 
          Você pode arrastá-la livremente para a TV ou projetor da sala (<kbd>Win + P</kbd>).
        </p>
        <div class="tab-detached-actions">
          <button class="btn-primary" onclick="focusDetachedWindow('${key}')">
            🔍 Focar Janela Externa
          </button>
          <button class="btn-secondary" onclick="reattachTab('${key}')">
            ↩ Acoplar de Volta nesta Aba
          </button>
        </div>
      </div>
    `;
  }

  // 3. Atualiza abas no topo
  renderBrowserTabs();
  showToast("🗗 Janela destacada com sucesso!");
}

// ─── FOCAR JANELA EXTERNA DESTACADA ─────────────────────────
async function focusDetachedWindow(key) {
  try {
    await fetch(`/api/window?key=${encodeURIComponent(key)}&action=focus`);
    const tab = openTabs[key];
    showToast(`🔍 Focando janela externa: ${tab ? tab.title : key}`);
  } catch (err) {
    console.error("Erro ao focar janela destacada:", err);
  }
}

// ─── ACOPLAR JANELA DE VOLTA NA ABA DO HUB ──────────────────
async function reattachTab(key) {
  const tab = openTabs[key];
  if (!tab) return;

  showToast(`↩ Acoplando ${tab.title} de volta ao Hub...`);

  // 1. Fecha a janela externa no Windows
  try {
    await fetch(`/api/window?key=${encodeURIComponent(key)}&action=close`);
  } catch (e) {}

  tab.detached = false;

  // 2. Restaura o iframe dentro do Hub
  const wrap = document.getElementById(`frame-wrap-${key}`);
  if (wrap) {
    wrap.innerHTML = `
      <iframe src="${tab.url}" 
              id="iframe-${key}" 
              class="tab-game-iframe" 
              allow="camera; microphone; autoplay; fullscreen; display-capture"
              title="${tab.title}">
      </iframe>
    `;
  }

  // 3. Atualiza estado e foca na aba
  renderBrowserTabs();
  selectBrowserTab(key);
  showToast("↩ Janela re-acoplada com sucesso!");
}

// ─── DRAG & DROP TEAR-OFF (ARRASTAR A ABA PARA FORA) ─────────
let draggedKey = null;

function handleTabDragStart(e, key) {
  draggedKey = key;
  e.dataTransfer.setData("text/plain", key);
  e.dataTransfer.effectAllowed = "move";

  const tabEl = document.getElementById(`tab-${key}`);
  if (tabEl) tabEl.classList.add("dragging");
}

function handleTabDragEnd(e, key) {
  const tabEl = document.getElementById(`tab-${key}`);
  if (tabEl) tabEl.classList.remove("dragging");

  // Se soltou fora da barra de abas (arrastou para baixo ou para a tela)
  const tabsBarRect = browserTabsBar ? browserTabsBar.getBoundingClientRect() : { bottom: 60 };
  const isOutsideTabsBar = (e.clientY > tabsBarRect.bottom + 15) || (e.clientY < 0) || (e.clientX < 0) || (e.clientX > window.innerWidth);

  if (isOutsideTabsBar) {
    detachTabToWindow(key);
  }

  draggedKey = null;
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

  for (const appId of runningAppIds) {
    const appConfig = (data.apps && data.apps[appId]) || {};
    const status = data.statuses[appId] || {};
    const title = appConfig.name || appConfig.title || appId;
    const port = status.port || appConfig.port;
    const icon = appConfig.icon || (appId === "stroop" ? "🎨" : appId === "two-truths" ? "🎭" : "🎮");

    const adminKey = `${appId}:admin`;
    const displayKey = `${appId}:display`;
    const adminTab = openTabs[adminKey];
    const displayTab = openTabs[displayKey];

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
              <button class="btn-route-action focus" onclick="openGameTab('${appId}', 'admin')" title="Abrir ou alternar para a aba do Professor">
                🔍 ${adminTab ? 'Aba Ativa' : 'Abrir'}
              </button>
              ${adminTab ? `
              <button class="btn-route-action close" onclick="closeBrowserTab('${adminKey}')" title="Fechar aba">
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
              <button class="btn-route-action focus" onclick="openGameTab('${appId}', 'display')" title="Abrir ou alternar para a aba do Projetor">
                🔍 ${displayTab ? 'Aba Ativa' : 'Abrir'}
              </button>
              ${displayTab ? `
              <button class="btn-route-action close" onclick="closeBrowserTab('${displayKey}')" title="Fechar aba">
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

// ─── FINALIZAR UM JOGO ──────────────────────────────────────
async function stopGame(appId) {
  const appConfig = (hubState.apps && hubState.apps[appId]) || {};
  const appName = appConfig.name || appConfig.title || appId;
  showToast(`🧹 Encerrando ${appName}...`);

  // Fecha todas as abas abertas pertencentes a este app
  for (const key of Object.keys(openTabs)) {
    if (key.startsWith(appId + ":")) {
      closeBrowserTab(key);
    }
  }

  try {
    const res = await fetch(`/api/stop?app=${encodeURIComponent(appId)}`);
    await res.json();
    await fetchStatus();
    showToast(`✅ ${appName} encerrado com sucesso!`);
  } catch (err) {
    showToast(`❌ Erro ao encerrar jogo: ${err.message}`);
  }
}

// ─── FINALIZAR TODOS OS JOGOS ───────────────────────────────
async function stopAllGames() {
  showToast("🧹 Encerrando todos os jogos ativos...");

  // Fecha todas as abas de jogos
  for (const key of Object.keys(openTabs)) {
    closeBrowserTab(key);
  }
  selectBrowserTab("hub");

  try {
    await fetch("/api/stop_all");
    await fetchStatus();
    showToast("✅ Todos os jogos foram encerrados com sucesso!");
  } catch (err) {
    showToast(`❌ Erro ao encerrar jogos: ${err.message}`);
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

  // Eventos globais de arrastar para fora (Tear-Off)
  document.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  document.addEventListener("drop", (e) => {
    const key = e.dataTransfer.getData("text/plain") || draggedKey;
    if (key && openTabs[key]) {
      const tabsBarRect = browserTabsBar ? browserTabsBar.getBoundingClientRect() : { bottom: 60 };
      if (e.clientY > tabsBarRect.bottom + 15) {
        e.preventDefault();
        detachTabToWindow(key);
      }
    }
  });
});
