/**
 * Wizard PaperClickers Web
 * Real-time TopCodes scanner & Quiz projection application.
 */

// Application State
const state = {
  currentQuiz: null,
  currentQuestionIndex: 0,
  isAnswerRevealed: false,
  isScanning: false,
  studentResponses: {}, // { [codeId]: 'A' | 'B' | 'C' | 'D' }
  detectionHistory: {}, // { [codeId]: { answer: 'A', count: 2 } }
  availableQuizzes: [],
  printablePDFs: []
};

// DOM Elements
const elements = {
  quizSelect: document.getElementById('quiz-select'),
  btnPrev: document.getElementById('btn-prev'),
  btnNext: document.getElementById('btn-next'),
  btnReveal: document.getElementById('btn-reveal'),
  btnReset: document.getElementById('btn-reset'),
  btnCameraToggle: document.getElementById('btn-camera-toggle'),
  btnProjector: document.getElementById('btn-projector'),
  btnExitProjector: document.getElementById('btn-exit-projector'),
  uploadInput: document.getElementById('upload-json-input'),

  // Question UI
  questionMeta: document.getElementById('question-meta'),
  questionText: document.getElementById('question-text'),
  optionsContainer: document.getElementById('options-container'),
  feedbackCard: document.getElementById('feedback-card'),
  feedbackText: document.getElementById('feedback-text'),

  // Scanner & Stats UI
  cameraBadge: document.getElementById('camera-badge'),
  cameraDot: document.getElementById('camera-dot'),
  cameraPlaceholder: document.getElementById('camera-placeholder'),
  answersCount: document.getElementById('answers-count'),
  rosterChips: document.getElementById('roster-chips'),
  
  // Bars
  barA: document.getElementById('bar-fill-a'),
  barB: document.getElementById('bar-fill-b'),
  barC: document.getElementById('bar-fill-c'),
  barD: document.getElementById('bar-fill-d'),
  countA: document.getElementById('bar-count-a'),
  countB: document.getElementById('bar-count-b'),
  countC: document.getElementById('bar-count-c'),
  countD: document.getElementById('bar-count-d'),

  // Tabs
  tabQuiz: document.getElementById('tab-quiz'),
  tabCards: document.getElementById('tab-cards'),
  tabGuide: document.getElementById('tab-guide'),
  paneQuiz: document.getElementById('pane-quiz'),
  paneCards: document.getElementById('pane-cards'),
  paneGuide: document.getElementById('pane-guide'),
  cardsList: document.getElementById('cards-list')
};

// Mapping Angles to A, B, C, D
function mapAngleToAnswer(angle) {
  // TopCodes scanner angle is in radians.
  // Because the video canvas is horizontally mirrored (scale -1, 1),
  // we normalize angle into [0, 2*PI):
  let a = (-angle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  
  if (a > 0.25 * Math.PI && a <= 0.75 * Math.PI) {
    return 'D';
  } else if (a > 0.75 * Math.PI && a <= 1.25 * Math.PI) {
    return 'C';
  } else if (a > 1.25 * Math.PI && a <= 1.75 * Math.PI) {
    return 'B';
  } else {
    return 'A';
  }
}

// Color lookup
const ANSWER_COLORS = {
  A: '#EF4444',
  B: '#3B82F6',
  C: '#10B981',
  D: '#F59E0B'
};

// Initialize Application
async function init() {
  setupNavigation();
  setupEventListeners();
  await loadAvailableQuizzes();
  await loadPrintablePDFs();
  setupScannerCallback();
}

// Navigation Tabs
function setupNavigation() {
  const tabs = [
    { btn: elements.tabQuiz, pane: elements.paneQuiz },
    { btn: elements.tabCards, pane: elements.paneCards },
    { btn: elements.tabGuide, pane: elements.paneGuide }
  ];

  tabs.forEach(t => {
    t.btn.addEventListener('click', () => {
      tabs.forEach(x => {
        x.btn.classList.remove('active');
        x.pane.classList.remove('active');
      });
      t.btn.classList.add('active');
      t.pane.classList.add('active');
    });
  });
}

// Event Listeners
function setupEventListeners() {
  elements.quizSelect.addEventListener('change', (e) => {
    if (e.target.value) {
      fetchQuizFile(e.target.value);
    }
  });

  elements.btnPrev.addEventListener('click', prevQuestion);
  elements.btnNext.addEventListener('click', nextQuestion);
  elements.btnReveal.addEventListener('click', toggleRevealAnswer);
  elements.btnReset.addEventListener('click', resetCurrentAnswers);
  elements.btnCameraToggle.addEventListener('click', toggleCameraScan);

  // Fullscreen Projector
  elements.btnProjector.addEventListener('click', () => {
    document.body.classList.add('fullscreen-projector');
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  });

  elements.btnExitProjector.addEventListener('click', () => {
    document.body.classList.remove('fullscreen-projector');
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  });

  // Custom JSON Upload
  elements.uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        loadQuizData(data, file.name);
      } catch (err) {
        alert("Erro ao processar JSON: " + err.message);
      }
    };
    reader.readAsText(file);
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (e.code === 'Space') {
      e.preventDefault();
      toggleRevealAnswer();
    } else if (e.code === 'ArrowRight') {
      nextQuestion();
    } else if (e.code === 'ArrowLeft') {
      prevQuestion();
    } else if (e.code === 'KeyC') {
      toggleCameraScan();
    } else if (e.code === 'KeyR') {
      resetCurrentAnswers();
    } else if (e.code === 'KeyF') {
      document.body.classList.toggle('fullscreen-projector');
    } else if (e.code === 'Escape') {
      document.body.classList.remove('fullscreen-projector');
    }
  });
}

// Fetch Quizzes from Server API
async function loadAvailableQuizzes() {
  try {
    const res = await fetch('/api/quizzes');
    if (!res.ok) return;
    const quizzes = await res.json();
    state.availableQuizzes = quizzes;

    elements.quizSelect.innerHTML = '<option value="">-- Selecione um Quiz Wizard --</option>';

    // Prioritize Universal JSONs
    const universals = quizzes.filter(q => q.isUniversal);
    const others = quizzes.filter(q => !q.isUniversal);

    universals.forEach(q => {
      const opt = document.createElement('option');
      opt.value = q.filename;
      opt.textContent = `⭐ ${q.title} (${q.questionCount} questões)`;
      elements.quizSelect.appendChild(opt);
    });

    if (others.length > 0) {
      const group = document.createElement('optgroup');
      group.label = "Outros formatos";
      others.forEach(q => {
        const opt = document.createElement('option');
        opt.value = q.filename;
        opt.textContent = `${q.filename} (${q.questionCount} q)`;
        group.appendChild(opt);
      });
      elements.quizSelect.appendChild(group);
    }

    // Auto-load first quiz if available
    if (universals.length > 0) {
      elements.quizSelect.value = universals[0].filename;
      fetchQuizFile(universals[0].filename);
    }
  } catch (err) {
    console.error("Erro carregando lista de quizzes:", err);
  }
}

// Fetch Quiz Content
async function fetchQuizFile(filename) {
  try {
    const res = await fetch(`/quizzes/${filename}`);
    if (!res.ok) throw new Error("Falha ao carregar quiz");
    let text = await res.text();
    text = text.replace(/^\uFEFF/, '');
    const data = JSON.parse(text);
    loadQuizData(data, filename);
  } catch (err) {
    console.error("Erro ao carregar arquivo de quiz:", err);
    alert("Não foi possível carregar o quiz selecionado.");
  }
}

// Load Quiz into State
function loadQuizData(data, name) {
  // Normalize format
  let questions = [];
  if (Array.isArray(data)) {
    questions = data;
  } else if (Array.isArray(data.questions)) {
    questions = data.questions;
  }

  if (questions.length === 0) {
    alert("O arquivo selecionado não contém questões válidas.");
    return;
  }

  state.currentQuiz = {
    title: data.title || name,
    book: data.book || '',
    unit: data.unit || '',
    level: data.level || '',
    questions: questions
  };

  state.currentQuestionIndex = 0;
  renderQuestion();
}

// Render Current Question
function renderQuestion() {
  if (!state.currentQuiz) return;
  const q = state.currentQuiz.questions[state.currentQuestionIndex];
  if (!q) return;

  // Reset state for new question
  state.isAnswerRevealed = false;
  state.studentResponses = {};
  state.detectionHistory = {};
  updateStatsDisplay();

  // Question Meta
  const total = state.currentQuiz.questions.length;
  elements.questionMeta.textContent = `${state.currentQuiz.book || 'Wizard'} | ${state.currentQuiz.unit || ''} • Questão ${state.currentQuestionIndex + 1} de ${total}`;
  elements.btnPrev.disabled = (state.currentQuestionIndex === 0);
  elements.btnNext.disabled = (state.currentQuestionIndex === total - 1);

  // Question Text
  elements.questionText.textContent = q.question || q.title || "Pergunta sem texto";

  // Options
  elements.optionsContainer.innerHTML = '';
  const options = q.options || [];
  const letters = ['A', 'B', 'C', 'D'];

  options.forEach((optText, idx) => {
    const letter = letters[idx] || String(idx + 1);
    const box = document.createElement('div');
    box.className = `option-box opt-${letter.toLowerCase()}`;
    box.id = `opt-box-${letter}`;

    box.innerHTML = `
      <div class="option-letter">${letter}</div>
      <div class="option-text">${optText}</div>
    `;
    elements.optionsContainer.appendChild(box);
  });

  // Teacher Feedback Card
  elements.feedbackCard.classList.remove('show');
  elements.feedbackText.textContent = q.explanation || "Sem comentários pedagógicos adicionais.";
  elements.btnReveal.innerHTML = '👁️ Revelar Resposta <span style="font-size: 0.75rem; opacity: 0.7;">[Espaço]</span>';
  elements.btnReveal.classList.remove('btn-success');
  elements.btnReveal.classList.add('btn-primary');
}

// Toggle Reveal Answer
function toggleRevealAnswer() {
  if (!state.currentQuiz) return;
  const q = state.currentQuiz.questions[state.currentQuestionIndex];
  if (!q) return;

  state.isAnswerRevealed = !state.isAnswerRevealed;
  const letters = ['A', 'B', 'C', 'D'];

  // Resolve correct letter
  let correctLetter = 'A';
  if (typeof q.correct_answer === 'number') {
    correctLetter = letters[q.correct_answer] || 'A';
  } else if (typeof q.correct_answer === 'string') {
    correctLetter = q.correct_answer.toUpperCase();
  }

  letters.forEach(let => {
    const box = document.getElementById(`opt-box-${let}`);
    if (!box) return;

    if (state.isAnswerRevealed) {
      if (let === correctLetter) {
        box.classList.add('correct');
        box.classList.remove('dimmed');
      } else {
        box.classList.remove('correct');
        box.classList.add('dimmed');
      }
    } else {
      box.classList.remove('correct');
      box.classList.remove('dimmed');
    }
  });

  if (state.isAnswerRevealed) {
    elements.feedbackCard.classList.add('show');
    elements.btnReveal.innerHTML = '🔒 Ocultar Resposta <span style="font-size: 0.75rem; opacity: 0.7;">[Espaço]</span>';
    elements.btnReveal.classList.remove('btn-primary');
    elements.btnReveal.classList.add('btn-success');
  } else {
    elements.feedbackCard.classList.remove('show');
    elements.btnReveal.innerHTML = '👁️ Revelar Resposta <span style="font-size: 0.75rem; opacity: 0.7;">[Espaço]</span>';
    elements.btnReveal.classList.remove('btn-success');
    elements.btnReveal.classList.add('btn-primary');
  }
}

// Question Navigation
function prevQuestion() {
  if (state.currentQuestionIndex > 0) {
    state.currentQuestionIndex--;
    renderQuestion();
  }
}

function nextQuestion() {
  if (state.currentQuiz && state.currentQuestionIndex < state.currentQuiz.questions.length - 1) {
    state.currentQuestionIndex++;
    renderQuestion();
  }
}

function resetCurrentAnswers() {
  state.studentResponses = {};
  state.detectionHistory = {};
  updateStatsDisplay();
}

// Camera Scanner Handling
function toggleCameraScan() {
  if (typeof TopCodes === 'undefined') {
    alert("Biblioteca TopCodes ainda não foi carregada.");
    return;
  }

  state.isScanning = !state.isScanning;

  if (state.isScanning) {
    elements.cameraPlaceholder.style.display = 'none';
    elements.cameraDot.classList.add('active');
    elements.cameraBadge.innerHTML = '<div class="camera-dot active"></div> Scanner Ativo';
    elements.btnCameraToggle.innerHTML = '📷 Parar Câmera <span style="font-size: 0.75rem; opacity: 0.7;">[C]</span>';
    elements.btnCameraToggle.classList.replace('btn-secondary', 'btn-primary');
    TopCodes.startVideoScan('scanner-canvas');
  } else {
    elements.cameraPlaceholder.style.display = 'flex';
    elements.cameraDot.classList.remove('active');
    elements.cameraBadge.innerHTML = '<div class="camera-dot"></div> Câmera Pausada';
    elements.btnCameraToggle.innerHTML = '📷 Ligar Câmera <span style="font-size: 0.75rem; opacity: 0.7;">[C]</span>';
    elements.btnCameraToggle.classList.replace('btn-primary', 'btn-secondary');
    TopCodes.stopVideoScan('scanner-canvas');
  }
}

// TopCodes Frame Callback
function setupScannerCallback() {
  if (typeof TopCodes === 'undefined') return;

  TopCodes.setVideoFrameCallback('scanner-canvas', (jsonString) => {
    if (!state.isScanning) return;
    try {
      const data = JSON.parse(jsonString);
      const codes = data.topcodes || [];
      processDetectedCodes(codes);
    } catch (e) {
      // frame parse error
    }
  });
}

// Process Detected Codes in Frame
function processDetectedCodes(codes) {
  if (!codes || codes.length === 0) return;

  const canvas = document.getElementById('scanner-canvas');
  const ctx = canvas.getContext('2d');

  codes.forEach(c => {
    const codeId = c.code;
    const angle = c.angle;
    const ans = mapAngleToAnswer(angle);

    // Frame debounce (consecutive confirmations)
    if (!state.detectionHistory[codeId]) {
      state.detectionHistory[codeId] = { answer: ans, streak: 1 };
    } else {
      if (state.detectionHistory[codeId].answer === ans) {
        state.detectionHistory[codeId].streak++;
      } else {
        state.detectionHistory[codeId] = { answer: ans, streak: 1 };
      }
    }

    // Register after 2 consecutive frames
    if (state.detectionHistory[codeId].streak >= 2) {
      state.studentResponses[codeId] = ans;
    }

    // Overlay visual indicator on canvas
    if (ctx && c.x && c.y && c.radius) {
      ctx.save();
      ctx.lineWidth = 4;
      ctx.strokeStyle = ANSWER_COLORS[ans] || '#10B981';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius + 6, 0, 2 * Math.PI);
      ctx.stroke();

      // Badge
      ctx.fillStyle = ANSWER_COLORS[ans] || '#10B981';
      ctx.beginPath();
      ctx.arc(c.x, c.y - c.radius - 12, 14, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ans, c.x, c.y - c.radius - 12);
      ctx.restore();
    }
  });

  updateStatsDisplay();
}

// Update Live Stats Display & Bar Chart
function updateStatsDisplay() {
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  const entries = Object.entries(state.studentResponses);

  entries.forEach(([id, ans]) => {
    if (counts[ans] !== undefined) {
      counts[ans]++;
    }
  });

  const total = entries.length;
  elements.answersCount.textContent = `${total} ${total === 1 ? 'resposta' : 'respostas'}`;

  // Update counts text
  elements.countA.textContent = counts.A;
  elements.countB.textContent = counts.B;
  elements.countC.textContent = counts.C;
  elements.countD.textContent = counts.D;

  // Max value for scaling
  const maxVal = Math.max(counts.A, counts.B, counts.C, counts.D, 1);

  elements.barA.style.height = `${(counts.A / maxVal) * 85}%`;
  elements.barB.style.height = `${(counts.B / maxVal) * 85}%`;
  elements.barC.style.height = `${(counts.C / maxVal) * 85}%`;
  elements.barD.style.height = `${(counts.D / maxVal) * 85}%`;

  // Student Roster Chips
  elements.rosterChips.innerHTML = '';
  entries.sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([id, ans]) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.style.backgroundColor = ANSWER_COLORS[ans] || '#64748B';
    chip.textContent = `Aluno #${id}: [${ans}]`;
    elements.rosterChips.appendChild(chip);
  });
}

// Load Printable PDFs
async function loadPrintablePDFs() {
  try {
    const res = await fetch('/api/topcodes');
    if (!res.ok) return;
    const list = await res.json();
    state.printablePDFs = list;

    elements.cardsList.innerHTML = '';

    list.forEach(item => {
      const card = document.createElement('div');
      card.className = 'pdf-card';

      let cleanName = item.name.replace('.pdf', '').replace(/_/g, ' ');
      let desc = `Layout: ${item.category || 'Padrão'}`;
      if (item.name.includes('1pp')) desc = '1 cartão grande por página (Ideal para salas grandes)';
      if (item.name.includes('2pp')) desc = '2 cartões médios por página (Econômico e prático)';
      if (item.name.includes('4pp')) desc = '4 cartões compactos por página (Máxima economia de papel)';

      card.innerHTML = `
        <div>
          <div class="pdf-icon">📄</div>
          <div class="pdf-title">${cleanName}</div>
          <div class="pdf-desc">${desc}</div>
        </div>
        <a href="${item.url}" target="_blank" class="btn btn-outline" style="text-decoration: none; justify-content: center;">
          🖨️ Abrir / Imprimir PDF
        </a>
      `;
      elements.cardsList.appendChild(card);
    });
  } catch (err) {
    console.error("Erro carregando PDFs:", err);
  }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', init);
