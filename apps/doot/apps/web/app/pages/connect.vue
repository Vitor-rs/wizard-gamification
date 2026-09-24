<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from '../composables/useI18n'

const { t, locale } = useI18n()

// Active model tab: 'claude' | 'chatgpt' | 'cursor' | 'gemini' | 'local'
const activeTab = ref<'claude' | 'chatgpt' | 'cursor' | 'gemini' | 'local'>('claude')

// Claude specific sub-mode: 'app' (claude.ai) | 'code' (CLI)
const claudeKind = ref<'app' | 'code'>('app')

// Base URLs
const origin = ref('https://doot.games')
onMounted(() => {
  if (typeof window !== 'undefined') {
    origin.value = window.location.origin
  }
  fetchToken()
})

const mcpEndpoint = computed(() => `${origin.value}/mcp`)
const openapiEndpoint = computed(() => `${origin.value}/api/llm/openapi.json`)
const claudeCodeCmd = computed(() => `claude mcp add --transport http doot ${mcpEndpoint.value}`)

// User authentication and personal token state
const isAuthenticated = ref(false)
const userToken = ref<string | null>(null)
const isTokenVisible = ref(false)
const isGeneratingToken = ref(false)
const copiedField = ref<string | null>(null)

async function fetchToken() {
  try {
    const res = await fetch('/api/user/token')
    if (res.ok) {
      const data = await res.json()
      isAuthenticated.value = true
      userToken.value = data.token
    } else {
      isAuthenticated.value = false
      userToken.value = null
    }
  } catch {
    isAuthenticated.value = false
  }
}

async function generateNewToken() {
  isGeneratingToken.value = true
  try {
    const res = await fetch('/api/user/token', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      userToken.value = data.token
      isAuthenticated.value = true
      flashCopied('token')
    }
  } catch {
    /* ignore */
  } finally {
    isGeneratingToken.value = false
  }
}

function copyText(textToCopy: string, fieldId: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(textToCopy)
    flashCopied(fieldId)
  }
}

function flashCopied(fieldId: string) {
  copiedField.value = fieldId
  setTimeout(() => {
    if (copiedField.value === fieldId) copiedField.value = null
  }, 2200)
}

// Config snippets dynamically populated with the user's token
const effectiveToken = computed(() => userToken.value || 'SUA_CHAVE_AQUI')

const cursorConfigSnippet = computed(() =>
  JSON.stringify(
    {
      mcpServers: {
        doot: {
          url: mcpEndpoint.value,
          headers: {
            Authorization: `Bearer ${effectiveToken.value}`,
          },
        },
      },
    },
    null,
    2,
  ),
)

const claudeDesktopSnippet = computed(() =>
  JSON.stringify(
    {
      mcpServers: {
        doot: {
          url: mcpEndpoint.value,
          headers: {
            Authorization: `Bearer ${effectiveToken.value}`,
          },
        },
      },
    },
    null,
    2,
  ),
)

const samplePrompt = computed(() =>
  locale.value === 'pt-BR'
    ? 'Crie um jogo de perguntas e respostas no Doot sobre expressões idiomáticas em inglês para alunos da Wizard, com 5 rodadas no formato guess, tema wizard e salve na minha conta.'
    : 'Make a Doot trivia game about 90s movies, five rounds, mix the types with wizard theme, and save it to my account.',
)

useHead({ title: computed(() => t('connect.title')) })
</script>

<template>
  <main>
    <div class="wrap connect">
      <div class="c-head">
        <span class="kicker">{{ t('connect.kicker') }}</span>
        <h1>{{ t('connect.title') }}</h1>
        <p class="lead">
          {{ t('connect.lead') }}
        </p>
      </div>

      <!-- Token / API Key Card -->
      <section class="token-card" aria-label="Personal Access Token">
        <div class="token-card-header">
          <div class="token-title-group">
            <span class="token-icon">🔑</span>
            <div>
              <h3>{{ t('connect.tokenSectionTitle') }}</h3>
              <p class="token-sub">{{ t('connect.tokenSectionDesc') }}</p>
            </div>
          </div>
          <div v-if="isAuthenticated" class="token-actions">
            <button type="button" class="btn-sm" :disabled="isGeneratingToken" @click="generateNewToken">
              {{ isGeneratingToken ? '…' : t('connect.generateToken') }}
            </button>
          </div>
        </div>

        <div v-if="isAuthenticated" class="token-display">
          <div class="token-input-box">
            <span class="token-value mono">
              {{ isTokenVisible ? (userToken || '—') : (userToken ? '••••••••••••••••••••••••••••••••' : 'Nenhuma chave gerada ainda') }}
            </span>
            <div class="token-buttons">
              <button
                v-if="userToken"
                type="button"
                class="btn-icon"
                :title="isTokenVisible ? 'Ocultar' : 'Mostrar'"
                @click="isTokenVisible = !isTokenVisible"
              >
                {{ isTokenVisible ? '👁️' : '🔒' }}
              </button>
              <button
                v-if="userToken"
                type="button"
                class="btn-copy"
                :class="{ copied: copiedField === 'token' }"
                @click="copyText(userToken, 'token')"
              >
                {{ copiedField === 'token' ? t('connect.tokenCopied') : t('connect.copyToken') }}
              </button>
            </div>
          </div>
        </div>

        <div v-else class="token-anon">
          <p>{{ t('connect.loginToGetToken') }}</p>
          <NuxtLink to="/login" class="btn-login">{{ t('nav.login') }} →</NuxtLink>
        </div>
      </section>

      <!-- LLM Model Selector Tabs -->
      <div class="llm-tabs" role="tablist" aria-label="Select AI Model or Client">
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'claude'"
          :class="{ active: activeTab === 'claude' }"
          @click="activeTab = 'claude'"
        >
          <span class="tab-badge">Anthropic</span>
          {{ t('connect.tabClaude') }}
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'chatgpt'"
          :class="{ active: activeTab === 'chatgpt' }"
          @click="activeTab = 'chatgpt'"
        >
          <span class="tab-badge">OpenAI</span>
          {{ t('connect.tabChatGPT') }}
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'cursor'"
          :class="{ active: activeTab === 'cursor' }"
          @click="activeTab = 'cursor'"
        >
          <span class="tab-badge">IDE</span>
          {{ t('connect.tabCursor') }}
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'gemini'"
          :class="{ active: activeTab === 'gemini' }"
          @click="activeTab = 'gemini'"
        >
          <span class="tab-badge">Google</span>
          {{ t('connect.tabGemini') }}
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'local'"
          :class="{ active: activeTab === 'local' }"
          @click="activeTab = 'local'"
        >
          <span class="tab-badge">Open-Source</span>
          {{ t('connect.tabLocal') }}
        </button>
      </div>

      <!-- Tab Content: Claude -->
      <div v-if="activeTab === 'claude'" class="tab-panel">
        <ol class="steps">
          <li>
            <span class="step-n">1</span>
            <div class="step-b">
              <h3>{{ t('connect.step1') }}</h3>
              <p>Escolha como você usa o Claude (claude.ai ou linha de comando):</p>
              <div class="seg" role="group" aria-label="Which Claude are you using?">
                <button type="button" :aria-pressed="claudeKind === 'app'" :class="{ on: claudeKind === 'app' }" @click="claudeKind = 'app'">Claude App (claude.ai)</button>
                <button type="button" :aria-pressed="claudeKind === 'code'" :class="{ on: claudeKind === 'code' }" @click="claudeKind = 'code'">Claude Code (CLI)</button>
              </div>
              <template v-if="claudeKind === 'app'">
                <p>Em <b>claude.ai</b> ou aplicativo desktop, acesse <i>Configurações</i> &rarr; <i>Connectors</i> &rarr; <i>Add custom connector</i> e cole:</p>
                <div class="cmd-wrap">
                  <pre class="cmd">{{ mcpEndpoint }}</pre>
                  <button type="button" class="btn-cmd-copy" @click="copyText(mcpEndpoint, 'claude-url')">
                    {{ copiedField === 'claude-url' ? t('connect.tokenCopied') : 'Copiar' }}
                  </button>
                </div>
              </template>
              <template v-else>
                <p>No terminal, execute o comando:</p>
                <div class="cmd-wrap">
                  <pre class="cmd">{{ claudeCodeCmd }}</pre>
                  <button type="button" class="btn-cmd-copy" @click="copyText(claudeCodeCmd, 'claude-cmd')">
                    {{ copiedField === 'claude-cmd' ? t('connect.tokenCopied') : 'Copiar' }}
                  </button>
                </div>
              </template>
              <p class="hint">O Claude abrirá o Doot no navegador para autorizar a conexão OAuth com sua conta.</p>
            </div>
          </li>
          <li>
            <span class="step-n">2</span>
            <div class="step-b">
              <h3>{{ t('connect.step2') }}</h3>
              <p>{{ t('connect.step2Desc') }}</p>
              <div class="prompt-box">
                <span class="prompt-label">{{ t('connect.examplePromptLabel') }}</span>
                <p class="prompt-quote">"{{ samplePrompt }}"</p>
                <button type="button" class="btn-sm" @click="copyText(samplePrompt, 'sample-p1')">
                  {{ copiedField === 'sample-p1' ? t('connect.tokenCopied') : 'Copiar comando' }}
                </button>
              </div>
            </div>
          </li>
          <li>
            <span class="step-n">3</span>
            <div class="step-b">
              <h3>{{ t('connect.step3') }}</h3>
              <p>{{ t('connect.step3Desc') }} Encontre seus jogos em <NuxtLink to="/mine">Seus Jogos</NuxtLink>.</p>
            </div>
          </li>
        </ol>
      </div>

      <!-- Tab Content: ChatGPT / OpenAI -->
      <div v-else-if="activeTab === 'chatgpt'" class="tab-panel">
        <ol class="steps">
          <li>
            <span class="step-n">1</span>
            <div class="step-b">
              <h3>Criar uma Action no ChatGPT (Custom GPT)</h3>
              <p>No ChatGPT Plus/Team/Enterprise, vá em <b>Explore GPTs</b> &rarr; <b>Create a GPT</b> &rarr; aba <b>Configure</b> &rarr; <b>Create new action</b>.</p>
              <p>Cole esta URL do esquema OpenAPI no campo <i>Import from URL</i>:</p>
              <div class="cmd-wrap">
                <pre class="cmd">{{ openapiEndpoint }}</pre>
                <button type="button" class="btn-cmd-copy" @click="copyText(openapiEndpoint, 'gpt-openapi')">
                  {{ copiedField === 'gpt-openapi' ? t('connect.tokenCopied') : 'Copiar URL' }}
                </button>
              </div>
              <p>Em <b>Authentication</b>, selecione <b>API Key</b>, tipo <b>Bearer</b> e cole sua Chave de Acesso Pessoal (acima).</p>
            </div>
          </li>
          <li>
            <span class="step-n">2</span>
            <div class="step-b">
              <h3>{{ t('connect.step2') }}</h3>
              <p>Peça ao ChatGPT para criar jogos diretamente pelo chat:</p>
              <div class="prompt-box">
                <span class="prompt-label">{{ t('connect.examplePromptLabel') }}</span>
                <p class="prompt-quote">"{{ samplePrompt }}"</p>
                <button type="button" class="btn-sm" @click="copyText(samplePrompt, 'sample-p2')">
                  {{ copiedField === 'sample-p2' ? t('connect.tokenCopied') : 'Copiar comando' }}
                </button>
              </div>
            </div>
          </li>
          <li>
            <span class="step-n">3</span>
            <div class="step-b">
              <h3>{{ t('connect.step3') }}</h3>
              <p>O ChatGPT validará o jogo e chamará a API para salvar na sua conta. Ele responderá com o link da partida pronto para abrir!</p>
            </div>
          </li>
        </ol>
      </div>

      <!-- Tab Content: Cursor & Windsurf -->
      <div v-else-if="activeTab === 'cursor'" class="tab-panel">
        <ol class="steps">
          <li>
            <span class="step-n">1</span>
            <div class="step-b">
              <h3>Configurar MCP no Cursor / Windsurf</h3>
              <p>No seu projeto, crie ou edite o arquivo <code>.cursor/mcp.json</code> (ou configure em <i>Settings &rarr; Features &rarr; MCP</i>):</p>
              <div class="cmd-wrap code-block">
                <pre class="cmd">{{ cursorConfigSnippet }}</pre>
                <button type="button" class="btn-cmd-copy" @click="copyText(cursorConfigSnippet, 'cursor-cfg')">
                  {{ copiedField === 'cursor-cfg' ? t('connect.tokenCopied') : 'Copiar Config' }}
                </button>
              </div>
              <p class="hint">Sua chave de acesso já vem preenchida automaticamente no bloco acima!</p>
            </div>
          </li>
          <li>
            <span class="step-n">2</span>
            <div class="step-b">
              <h3>Peça no Composer do Cursor</h3>
              <p>No chat do Cursor (Ctrl+L / Cmd+L) ou Composer (Ctrl+I):</p>
              <div class="prompt-box">
                <span class="prompt-label">{{ t('connect.examplePromptLabel') }}</span>
                <p class="prompt-quote">"Usando a ferramenta doot MCP, crie um quiz de 5 rodadas com tema wizard e salve na minha conta."</p>
                <button type="button" class="btn-sm" @click="copyText('Usando a ferramenta doot MCP, crie um quiz de 5 rodadas com tema wizard e salve na minha conta.', 'sample-p3')">
                  {{ copiedField === 'sample-p3' ? t('connect.tokenCopied') : 'Copiar comando' }}
                </button>
              </div>
            </div>
          </li>
        </ol>
      </div>

      <!-- Tab Content: Gemini -->
      <div v-else-if="activeTab === 'gemini'" class="tab-panel">
        <ol class="steps">
          <li>
            <span class="step-n">1</span>
            <div class="step-b">
              <h3>Google Gemini & Google AI Studio</h3>
              <p>Você pode conectar o Gemini via <b>Function Calling / Extensions</b> usando a especificação OpenAPI do Doot ou via MCP:</p>
              <div class="cmd-wrap">
                <pre class="cmd">OpenAPI Spec: {{ openapiEndpoint }}</pre>
                <button type="button" class="btn-cmd-copy" @click="copyText(openapiEndpoint, 'gemini-url')">
                  {{ copiedField === 'gemini-url' ? t('connect.tokenCopied') : 'Copiar' }}
                </button>
              </div>
              <p>Ou conecte diretamente ao endpoint MCP com sua Chave de Acesso Pessoal:</p>
              <pre class="cmd">Endpoint MCP: {{ mcpEndpoint }}&#10;Authorization: Bearer {{ effectiveToken }}</pre>
            </div>
          </li>
          <li>
            <span class="step-n">2</span>
            <div class="step-b">
              <h3>{{ t('connect.step2') }}</h3>
              <p>O Gemini gera o markdown do jogo, valida as rodadas e envia para sua conta no Doot.</p>
            </div>
          </li>
        </ol>
      </div>

      <!-- Tab Content: Local LLMs & Other Clients -->
      <div v-else class="tab-panel">
        <ol class="steps">
          <li>
            <span class="step-n">1</span>
            <div class="step-b">
              <h3>Ollama, LM Studio, LibreChat & Open WebUI</h3>
              <p>Ferramentas de IA locais com suporte a MCP podem se conectar ao Doot pelo protocolo padrão Streamable HTTP:</p>
              <div class="config-grid">
                <div>
                  <span class="cg-label">URL do Endpoint MCP:</span>
                  <div class="cmd-wrap">
                    <pre class="cmd">{{ mcpEndpoint }}</pre>
                    <button type="button" class="btn-cmd-copy" @click="copyText(mcpEndpoint, 'local-url')">
                      {{ copiedField === 'local-url' ? t('connect.tokenCopied') : 'Copiar' }}
                    </button>
                  </div>
                </div>
                <div>
                  <span class="cg-label">Cabeçalho de Autenticação:</span>
                  <div class="cmd-wrap">
                    <pre class="cmd">Authorization: Bearer {{ effectiveToken }}</pre>
                    <button type="button" class="btn-cmd-copy" @click="copyText(`Bearer ${effectiveToken}`, 'local-auth')">
                      {{ copiedField === 'local-auth' ? t('connect.tokenCopied') : 'Copiar' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </li>
          <li>
            <span class="step-n">2</span>
            <div class="step-b">
              <h3>Claude Desktop (claude_desktop_config.json)</h3>
              <p>Se você usa o Claude Desktop tradicional, adicione ao seu arquivo de configuração:</p>
              <div class="cmd-wrap code-block">
                <pre class="cmd">{{ claudeDesktopSnippet }}</pre>
                <button type="button" class="btn-cmd-copy" @click="copyText(claudeDesktopSnippet, 'claude-desktop-cfg')">
                  {{ copiedField === 'claude-desktop-cfg' ? t('connect.tokenCopied') : 'Copiar' }}
                </button>
              </div>
            </div>
          </li>
        </ol>
      </div>

      <div class="note">
        {{ t('connect.note') }}
      </div>
    </div>
  </main>
</template>

<style scoped>
.connect {
  max-width: 820px;
}
.c-head {
  text-align: center;
  padding: 40px 0 16px;
}
.c-head h1 {
  font-size: clamp(32px, 6vw, 46px);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-top: 8px;
}
.lead {
  font-size: 18px;
  color: var(--ink-soft);
  margin-top: 12px;
  margin-inline: auto;
  max-width: 64ch;
  line-height: 1.5;
}

/* Personal Token Card */
.token-card {
  margin: 20px 0 28px;
  background: var(--surface);
  border: var(--bd) solid var(--line);
  border-radius: var(--radius-lg);
  padding: 22px 24px;
  box-shadow: var(--shadow-sm);
}
.token-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.token-title-group {
  display: flex;
  align-items: center;
  gap: 14px;
}
.token-icon {
  font-size: 28px;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--surface-2);
}
.token-card h3 {
  font-size: 18px;
  font-weight: 800;
  margin-bottom: 3px;
}
.token-sub {
  font-size: 14px;
  color: var(--ink-soft);
}
.token-display {
  margin-top: 16px;
}
.token-input-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: var(--surface-2);
  border: var(--bd) solid var(--line-soft);
  border-radius: 12px;
  padding: 10px 14px;
}
.token-value {
  font-size: 14px;
  color: var(--ink);
  word-break: break-all;
  font-family: ui-monospace, monospace;
}
.token-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.btn-icon {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  padding: 6px 8px;
  border-radius: 8px;
  transition: background 0.15s;
}
.btn-icon:hover {
  background: var(--surface);
}
.btn-copy {
  border: none;
  background: var(--primary);
  color: var(--primary-ink);
  font: 700 13px/1 inherit;
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
}
.btn-copy:hover {
  opacity: 0.9;
}
.btn-copy.copied {
  background: #00911c;
  color: #fff;
}
.btn-sm {
  border: var(--bd) solid var(--line-soft);
  background: var(--surface);
  color: var(--ink);
  font: 700 13px/1 inherit;
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.btn-sm:hover {
  background: var(--surface-2);
  border-color: var(--line);
}
.token-anon {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--ink-soft);
  font-size: 14px;
}
.btn-login {
  color: var(--primary);
  font-weight: 700;
  text-decoration: none;
}
.btn-login:hover {
  text-decoration: underline;
}

/* LLM Tabs */
.llm-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 4px;
  margin-bottom: 22px;
  background: var(--surface-2);
  border: var(--bd) solid var(--line-soft);
  border-radius: 999px;
}
.llm-tabs button {
  flex: 1;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  border: none;
  background: transparent;
  border-radius: 999px;
  padding: 8px 16px;
  font: 800 14px/1.2 inherit;
  color: var(--ink-soft);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}
.tab-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.7;
}
.llm-tabs button.active {
  background: var(--primary);
  color: var(--primary-ink);
}
.llm-tabs button.active .tab-badge {
  opacity: 0.9;
}

/* Steps */
.steps {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.steps li {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  background: var(--surface);
  border: var(--bd) solid var(--line);
  border-radius: var(--radius-lg);
  padding: 22px 24px;
  box-shadow: var(--shadow-sm);
}
.step-n {
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-family: var(--font-display, inherit);
  color: var(--primary-ink);
  background: var(--primary);
}
.step-b {
  min-width: 0;
  flex: 1;
}
.step-b h3 {
  font-size: 19px;
  font-weight: 800;
  margin-bottom: 6px;
}
.step-b p {
  color: var(--ink-soft);
  line-height: 1.55;
  margin: 8px 0;
}
.hint {
  font-size: 13px !important;
  color: var(--ink-soft);
  opacity: 0.85;
}
.seg {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  margin: 6px 0 12px;
  border-radius: 999px;
  background: var(--surface-2);
  border: var(--bd) solid var(--line-soft);
}
.seg button {
  border: none;
  background: transparent;
  border-radius: 999px;
  padding: 7px 14px;
  font: 700 13px/1 inherit;
  color: var(--ink-soft);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.seg button.on {
  background: var(--primary);
  color: var(--primary-ink);
}
.cmd-wrap {
  position: relative;
  margin: 8px 0 10px;
}
.cmd {
  background: var(--surface-2);
  border: var(--bd) solid var(--line-soft);
  border-radius: 10px;
  padding: 12px 14px;
  padding-right: 80px;
  font: 13px/1.45 ui-monospace, monospace;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--ink);
  margin: 0;
}
.btn-cmd-copy {
  position: absolute;
  top: 8px;
  right: 8px;
  border: var(--bd) solid var(--line-soft);
  background: var(--surface);
  color: var(--ink);
  border-radius: 6px;
  padding: 5px 10px;
  font: 700 11px/1 inherit;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-cmd-copy:hover {
  background: var(--surface-2);
}
.code-block .cmd {
  padding-right: 14px;
}
.code-block .btn-cmd-copy {
  top: 10px;
  right: 10px;
}

/* Prompt Box */
.prompt-box {
  margin: 12px 0 6px;
  padding: 14px 16px;
  background: var(--surface-2);
  border: var(--bd) dashed var(--line-soft);
  border-radius: 12px;
}
.prompt-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--ink-soft);
  margin-bottom: 6px;
}
.prompt-quote {
  font-style: italic;
  color: var(--ink) !important;
  margin: 0 0 10px 0 !important;
  line-height: 1.45;
}

/* Config Grid */
.config-grid {
  display: grid;
  gap: 12px;
  margin-top: 10px;
}
.cg-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
}

.note {
  margin: 24px 0 48px;
  padding: 16px 18px;
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--primary) 6%, var(--surface));
  border: var(--bd) solid color-mix(in srgb, var(--primary) 30%, var(--line));
  color: var(--ink-soft);
  font-size: 14px;
  line-height: 1.55;
}

@media (max-width: 640px) {
  .llm-tabs {
    border-radius: 16px;
  }
  .token-card-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
