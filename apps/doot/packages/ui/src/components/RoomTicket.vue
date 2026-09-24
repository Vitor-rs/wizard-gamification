<script setup lang="ts">
/**
 * The lobby join ticket. This is the single most important thing on the big
 * screen: a room full of strangers has to figure out how to get in, fast, from
 * across the room. So it spells out the WHERE (the domain), the WHAT (the code),
 * and the shortcut (scan the QR) - plus a Copy link button for remote rooms
 * (Discord/Zoom) where nobody can scan a shared screen.
 */
import { computed, inject, ref, type Ref } from 'vue'
import QrCode from './QrCode.vue'

const props = withDefaults(defineProps<{ code: string; url: string; showQr?: boolean }>(), {
  showQr: true,
})

const injectedJoinUrl = inject<((code: string) => string) | Ref<string> | null>('dootJoinUrl', null)
const injectedBaseUrl = inject<Ref<string> | string | null>('dootBaseUrl', null)

const effectiveUrl = computed(() => {
  let target = props.url
  if (injectedJoinUrl) {
    if (typeof injectedJoinUrl === 'function') target = injectedJoinUrl(props.code)
    else if (typeof (injectedJoinUrl as any).value === 'function') target = (injectedJoinUrl as any).value(props.code)
    else if (typeof (injectedJoinUrl as any).value === 'string') target = (injectedJoinUrl as any).value
  }

  if (typeof window !== 'undefined') {
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|::1)(:\d+)?/i.test(target)
    if (isLocalhost) {
      const base =
        (typeof injectedBaseUrl === 'string' ? injectedBaseUrl : injectedBaseUrl?.value) ||
        (window as any).__DOOT_BASE_URL__
      if (base) {
        target = target.replace(/^https?:\/\/[^/]+/i, base.replace(/\/+$/, ''))
      }
    }
  }

  return target
})

// Show the friendly domain as the where-to-go, and a clean
// no-protocol deep link as the copyable/typeable address.
const parsed = computed(() => {
  try {
    return new URL(effectiveUrl.value)
  } catch {
    return null
  }
})
const domain = computed(() => (parsed.value?.host ?? '').replace(/^www\./, '') || effectiveUrl.value)
const displayUrl = computed(() =>
  parsed.value ? `${domain.value}${parsed.value.pathname}` : effectiveUrl.value,
)

const copied = ref(false)
async function copyLink() {
  try {
    await navigator.clipboard.writeText(effectiveUrl.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    /* clipboard blocked; the address is shown for manual copy */
  }
}
</script>

<template>
  <div class="ticket">
    <div class="ticket-main">
      <div class="join-where">
        Join at <b>{{ domain }}</b>
      </div>
      <div class="join-sub">and enter the code</div>
      <div class="big-code mono">{{ code }}</div>
      <div class="join-actions">
        <span class="url mono">{{ displayUrl }}</span>
        <button type="button" class="copy-btn" @click="copyLink">
          {{ copied ? 'Copied!' : 'Copy link' }}
        </button>
      </div>
    </div>
    <div v-if="showQr" class="ticket-qr">
      <QrCode :value="effectiveUrl" :size="168" />
      <div class="qr-label">Scan to join</div>
    </div>
  </div>
</template>

<style scoped>
.ticket {
  display: flex;
  align-items: center;
  gap: 28px;
  flex-wrap: wrap;
  justify-content: center;
}
.ticket-main {
  min-width: 0;
}
.join-where {
  font-size: clamp(18px, 2.4vw, 26px);
  font-weight: 700;
  color: var(--ink);
}
.join-where b {
  color: var(--primary);
}
.join-sub {
  font-size: clamp(13px, 1.4vw, 16px);
  color: var(--ink-soft);
  font-weight: 600;
  margin-top: 2px;
}
.big-code {
  font-weight: 700;
  font-size: clamp(56px, 11vw, 120px);
  letter-spacing: 0.16em;
  color: var(--primary);
  line-height: 1.05;
  padding-left: 0.16em;
  margin-top: 4px;
}
.join-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.url {
  font-size: 14px;
  color: var(--ink-soft);
  word-break: break-all;
}
.copy-btn {
  border: var(--bd) solid var(--line-soft);
  background: var(--surface);
  color: var(--ink);
  font-family: inherit;
  font-weight: 700;
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  white-space: nowrap;
}
.copy-btn:hover {
  border-color: var(--line);
}
.ticket-qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.qr-label {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-soft);
  font-weight: 600;
}
</style>
