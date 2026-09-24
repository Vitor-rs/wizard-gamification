/**
 * 🎮 WIZARD GAMES HUB — CLIENT JAVASCRIPT
 * Atualiza status em tempo real, gerencia inicialização de jogos e exibição de QR Code
 */

let hubState = {
  ip: "127.0.0.1",
  apps: {},
  statuses: {}
};

// Elementos
const wifiIpText = document.getElementById("wifiIpText");
const toastEl = document.getElementById("hubToast");
const toastMsg = document.getElementById("toastMsg");
const qrModal = document.getElementById("qrModal");
const qrImg = document.getElementById("qrImg");
const qrLinkInput = document.getElementById("qrLinkInput");

// Exibir Toast
function showToast(msg, duration = 3500) {
  toastMsg.textContent = msg;
  toastEl.classList.add("active");
  clearTimeout(window._toastTimeout);
  window._toastTimeout = setTimeout(() => {
    toastEl.classList.remove("active");
  }, duration);
}

// Copiar para a área de transferência
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("📋 Link copiado para a área de transferência!");
  } catch (err) {
    // Fallback
    const input = document.createElement("input");
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    showToast("📋 Link copiado com sucesso!");
  }
}

// Atualizar status das portas e IP
async function fetchStatus() {
  try {
    const res = await fetch("/api/status");
    if (!res.ok) return;
    const data = await res.json();
    hubState = data;

    // Atualiza IP no topo
    if (wifiIpText) {
      wifiIpText.textContent = data.ip ? `Wi-Fi: ${data.ip}` : "Wi-Fi: Conectado";
    }

    // Atualiza badges de cada card
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
  } catch (err) {
    console.error("Erro ao sincronizar status do hub:", err);
  }
}

// Iniciar ou Abrir Jogo
async function launchApp(appId, target = "admin") {
  showToast(`⚡ Inicializando ${appId === 'stroop' ? 'Stroop Color' : appId === 'two-truths' ? 'Two Truths' : appId}...`);

  try {
    // 1. Chama a API de start
    const res = await fetch(`/api/start?app=${encodeURIComponent(appId)}`);
    const data = await res.json();

    if (data.error) {
      showToast(`❌ Erro: ${data.error}`);
      return;
    }

    // 2. Determina a URL de destino
    await fetchStatus();
    const appStatus = hubState.statuses[appId] || {};
    let url = target === "display" ? appStatus.display_url : appStatus.admin_url;

    if (!url) {
      const port = data.port || (hubState.apps[appId] && hubState.apps[appId].port);
      url = `http://localhost:${port}/`;
    }

    showToast(`🚀 Abrindo no seu navegador...`);

    // Abre a aba no navegador do usuário
    window.open(url, "_blank");

    // Também aciona o backend para garantir foco
    fetch(`/api/open?url=${encodeURIComponent(url)}`).catch(() => {});
  } catch (err) {
    showToast(`❌ Falha ao iniciar aplicativo: ${err.message}`);
  }
}

// Abrir Modal de QR Code para Alunos
function showStudentQr(appId) {
  const status = hubState.statuses[appId];
  const ip = hubState.ip || "127.0.0.1";
  const port = status ? status.port : 8000;
  const studentUrl = `http://${ip}:${port}/student`;
  const qrDirectUrl = `/api/qr?text=${encodeURIComponent(studentUrl)}`;

  qrLinkInput.value = studentUrl;
  qrImg.src = qrDirectUrl;

  qrModal.classList.add("active");

  // Garante que o jogo esteja em execução em segundo plano
  if (!status || !status.active) {
    fetch(`/api/start?app=${encodeURIComponent(appId)}`).catch(() => {});
  }
}

function closeStudentQr() {
  qrModal.classList.remove("active");
}

// Liberar Firewall
async function triggerFirewall() {
  showToast("🛡️ Abrindo configurador de Firewall do Windows...");
  try {
    await fetch("/api/firewall");
    showToast("🛡️ Permissões de firewall solicitadas! Confirme na tela do Windows.");
  } catch (err) {
    showToast("❌ Erro ao disparar script de firewall.");
  }
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  fetchStatus();
  setInterval(fetchStatus, 4000);

  // Fechar modal ao clicar fora
  qrModal.addEventListener("click", (e) => {
    if (e.target === qrModal) closeStudentQr();
  });
});
