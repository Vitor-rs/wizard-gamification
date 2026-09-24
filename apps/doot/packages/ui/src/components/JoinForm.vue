<script setup lang="ts">
/** The player join form: room code + display name, with validation. */
import { isValidRoomCode } from '@doot-games/engine'
import { computed, onMounted, ref } from 'vue'
import DButton from './DButton.vue'

export interface JoinFormLabels {
  roomCode?: string
  roomCodePlaceholder?: string
  yourName?: string
  namePlaceholder?: string
  joinGame?: string
  checking?: string
  justWatch?: string
  roomFullMsg?: string
  watchInstead?: string
  tryAgain?: string
  nameTakenMsg?: string
  reconnect?: string
  pickDifferent?: string
  errCode?: string
  errName?: string
}

const defaultLabels: Required<JoinFormLabels> = {
  roomCode: 'Room code',
  roomCodePlaceholder: 'ABCD',
  yourName: 'Your name',
  namePlaceholder: 'e.g. Robin',
  joinGame: 'Join game',
  checking: 'Checking…',
  justWatch: 'Just watch instead',
  roomFullMsg: 'This room is full for players. You can still watch along.',
  watchInstead: 'Watch instead',
  tryAgain: 'Try to join again',
  nameTakenMsg: "That name is already in this room. Reconnect if it's you, or pick another.",
  reconnect: "It's me, reconnect",
  pickDifferent: 'Pick a different name',
  errCode: 'Enter the 4-character room code.',
  errName: 'Pick a name so others know who you are.',
}

const props = withDefaults(
  defineProps<{
    initialCode?: string
    initialName?: string
    labels?: Partial<JoinFormLabels>
    /**
     * Optional pre-join check supplied by the app (which owns the relay). Reports
     * whether this name is already live in the room (identity is derived from room
     * + name, so two people under one name would collide onto one identity), and
     * whether the room is at its host-set player cap. Must fail open (a flaky relay
     * should never block a join). Returns `{ present, full }`.
     */
    probe?: (code: string, name: string) => Promise<{ present: boolean; full?: boolean }>
  }>(),
  { initialCode: '', initialName: '', labels: () => ({}), probe: undefined },
)
const l = computed(() => ({ ...defaultLabels, ...props.labels }))
const emit = defineEmits<{
  join: [payload: { code: string; name: string }]
  /** Join as audience (just watch): no name needed, never counts toward the cap. */
  watch: [payload: { code: string }]
}>()

const code = ref(props.initialCode.toUpperCase())
const name = ref(props.initialName)
const error = ref('')
const checking = ref(false)
// A name that is already live in the room: we warn rather than silently colliding
// the two players onto one identity, but still let a genuine reconnect proceed.
const nameTaken = ref(false)
// The room is at the host's player cap (a reconnecting name still gets in).
const roomFull = ref(false)

// Land the cursor where the player actually needs to type: if they arrived via a
// QR scan / deep link the code is already filled, so jump straight to the name;
// otherwise focus the code field. Saves a tap in the most common (QR) path.
const codeInput = ref<HTMLInputElement | null>(null)
const nameInput = ref<HTMLInputElement | null>(null)
onMounted(() => {
  const target = isValidRoomCode(code.value) ? nameInput.value : codeInput.value
  target?.focus()
})

function validate(): { code: string; name: string } | null {
  const c = code.value.trim().toUpperCase()
  const n = name.value.trim()
  if (!isValidRoomCode(c)) {
    error.value = l.value.errCode
    return null
  }
  if (!n) {
    error.value = l.value.errName
    return null
  }
  error.value = ''
  return { code: c, name: n }
}

async function submit() {
  if (checking.value) return
  const v = validate()
  if (!v) return
  // No probe wired: join straight away (keeps the form usable on its own).
  if (!props.probe) {
    emit('join', v)
    return
  }
  checking.value = true
  let present = false
  let full = false
  try {
    const res = await props.probe(v.code, v.name)
    present = res.present
    full = !!res.full
  } catch {
    present = false // fail open: a relay hiccup must never stop someone joining
    full = false
  }
  checking.value = false
  if (full) {
    roomFull.value = true
    return
  }
  if (present) {
    nameTaken.value = true
    return
  }
  emit('join', v)
}

/** Just watch: join as audience. Needs only a valid room code (no name), and is
 *  never turned away by the player cap. */
function watchOnly() {
  const c = code.value.trim().toUpperCase()
  if (!isValidRoomCode(c)) {
    error.value = l.value.errCode
    return
  }
  error.value = ''
  emit('watch', { code: c })
}

/** Re-check after a "room is full" (in case someone has since left). */
function tryAgain() {
  roomFull.value = false
  void submit()
}

/** "That's me, reconnect": skip the warning and join under the same name. */
function reconnect() {
  const v = validate()
  if (v) emit('join', v)
}

/** "Pick a different name": clear the warning and let them retype. */
function pickAnother() {
  nameTaken.value = false
  nameInput.value?.focus()
  nameInput.value?.select()
}

/** Editing the name invalidates a prior "taken" warning; re-check on next submit. */
function onNameInput() {
  if (nameTaken.value) nameTaken.value = false
  if (roomFull.value) roomFull.value = false
}
</script>

<template>
  <form class="join-form" @submit.prevent="submit">
    <label class="fld">
      <span>{{ l.roomCode }}</span>
      <input
        ref="codeInput"
        v-model="code"
        class="input code mono"
        maxlength="4"
        autocapitalize="characters"
        autocorrect="off"
        spellcheck="false"
        autocomplete="off"
        :aria-label="l.roomCode"
        :placeholder="l.roomCodePlaceholder"
        @input="code = code.toUpperCase()"
      />
    </label>
    <label class="fld">
      <span>{{ l.yourName }}</span>
      <input
        ref="nameInput"
        v-model="name"
        class="input"
        maxlength="24"
        autocomplete="off"
        :aria-label="l.yourName"
        :placeholder="l.namePlaceholder"
        @input="onNameInput"
        @keyup.enter="submit"
      />
    </label>
    <template v-if="!nameTaken && !roomFull">
      <DButton variant="primary" type="submit" block :disabled="checking">
        {{ checking ? l.checking : l.joinGame }}
      </DButton>
      <button type="button" class="link-btn watch-link" @click="watchOnly">{{ l.justWatch }}</button>
    </template>
    <div v-if="roomFull" class="taken" role="alert">
      <p class="taken-msg">{{ l.roomFullMsg }}</p>
      <DButton variant="primary" type="button" block @click="watchOnly">{{ l.watchInstead }}</DButton>
      <button type="button" class="link-btn" :disabled="checking" @click="tryAgain">
        {{ checking ? l.checking : l.tryAgain }}
      </button>
    </div>
    <div v-if="nameTaken" class="taken" role="alert">
      <p class="taken-msg">{{ l.nameTakenMsg }}</p>
      <DButton variant="primary" type="button" block @click="reconnect">{{ l.reconnect }}</DButton>
      <button type="button" class="link-btn" @click="pickAnother">{{ l.pickDifferent }}</button>
    </div>
    <p v-if="error" class="err" role="alert">{{ error }}</p>
  </form>
</template>

<style scoped>
.join-form {
  display: grid;
  gap: 12px;
  text-align: left;
}
.fld span {
  display: block;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--mute);
  font-weight: 700;
  margin-bottom: 6px;
}
.input {
  width: 100%;
  background: var(--surface-2);
  border: var(--bd) solid var(--line-soft);
  color: var(--ink);
  border-radius: 11px;
  padding: 13px 14px;
  font-size: 16px;
  font-weight: 600;
  font-family: inherit;
}
.input:focus {
  outline: none;
  border-color: var(--primary);
}
.code {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 22px;
  text-align: center;
}
.err {
  text-align: center;
  font-size: 13px;
  color: var(--primary);
  margin: 0;
}
.taken {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: var(--bd) solid var(--line-soft);
  border-radius: 11px;
  background: var(--surface-2);
}
.taken-msg {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--ink);
  text-align: center;
}
.link-btn {
  background: none;
  border: none;
  color: var(--mute);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  padding: 2px;
}
.link-btn:hover {
  color: var(--ink);
}
.watch-link {
  justify-self: center;
  text-align: center;
}
</style>
