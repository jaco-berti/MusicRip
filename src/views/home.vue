<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import MusicCard from '../components/MusicCard.vue'
import Panel from '../components/Panel.vue'
import Popup from '../components/Popup.vue'

const text = ref('')
const busy = ref(false)
const errorMessage = ref('')
const status = ref('stopped')
const track = ref(null)
const queue = ref([])
const loopEnabled = ref(false)
const lyricsVisible = ref(false)
const lyricsChoicesVisible = ref(false)
const lyricsChoices = ref([])
const lyricsText = ref('')
const lyricsLoading = ref(false)
const lyricsError = ref('')
const infoVisible = ref(false)
const lyricLines = computed(() => lyricsText.value ? lyricsText.value.split('\n') : [])
const lyricProgress = computed(() => {
  if (!track.value?.duration || !lyricLines.value.length) return 0
  return Math.min(lyricLines.value.length, Math.max(0, track.value.position / track.value.duration * lyricLines.value.length))
})
let disposed = false
const searchInput = ref(null)

function handleKeydown(event) {
  if (event.code !== 'Space' || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return
  const target = event.target
  if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, [role="textbox"]'))) return
  if (!track.value || !['playing', 'paused'].includes(status.value)) return
  event.preventDefault()
  if (!event.repeat) togglePause()
}

function submitOnEnter(event) {
  if (event.isComposing || event.repeat) return
  submit()
}

onMounted(() => window.addEventListener('keydown', handleKeydown))

const unsubscribe = window.desktop?.onAudioState(state => {
  if (disposed) return
  const previousTitle = track.value?.title
  status.value = state.status
  busy.value = state.status === 'loading' || state.status === 'buffering'
  if (state.status === 'playing' || state.status === 'paused' || (track.value && state.status === 'buffering')) {
    const nextTitle = state.title || previousTitle
    if (previousTitle && nextTitle && previousTitle !== nextTitle) {
      lyricsVisible.value = false
      lyricsChoicesVisible.value = false
      lyricsText.value = ''
      lyricsError.value = ''
    }
    track.value = { title: nextTitle, thumbnail: state.thumbnail, duration: state.duration, position: state.position || 0 }
  }
  if (state.status === 'error') errorMessage.value = state.message
  if (['stopped', 'ended', 'error'].includes(state.status)) {
    track.value = null
    lyricsVisible.value = false
    lyricsChoicesVisible.value = false
    lyricsText.value = ''
    lyricsError.value = ''
  }
})

const unsubscribeQueue = window.desktop?.onQueueState(state => {
  if (disposed) return
  if (Array.isArray(state?.queue)) queue.value = state.queue
  if (state && Object.prototype.hasOwnProperty.call(state, 'enabled')) {
    loopEnabled.value = Boolean(state.enabled)
  }
})

async function stopAudio() {
  try { await window.desktop?.stopAudio() }
  catch { errorMessage.value = 'Impossibile interrompere la riproduzione.' }
}

async function closeCurrentTrack() {
  try {
    if (queue.value.length) {
      await window.desktop?.nextAudio()
      return
    }
    await stopAudio()
  } catch {
    errorMessage.value = 'Impossibile chiudere la canzone in riproduzione.'
  }
}

async function togglePause() {
  try { await window.desktop?.togglePauseAudio() }
  catch { errorMessage.value = 'Impossibile cambiare lo stato della riproduzione.' }
}

async function openLyricsSearch() {
  if (!track.value || lyricsLoading.value) return
  lyricsError.value = ''
  lyricsChoices.value = []
  lyricsChoicesVisible.value = true
  lyricsLoading.value = true
  try {
    if (!window.desktop?.searchGeniusLyrics) throw new Error('Ricerca lyrics non disponibile nell’app desktop.')
    lyricsChoices.value = await window.desktop.searchGeniusLyrics(track.value.title)
  } catch (error) {
    lyricsError.value = error.message || 'Impossibile cercare il testo su Genius.'
  } finally {
    lyricsLoading.value = false
  }
}

async function selectLyrics(choice) {
  if (lyricsLoading.value) return
  lyricsLoading.value = true
  lyricsError.value = ''
  try {
    if (!window.desktop?.fetchGeniusLyrics) throw new Error('Lettura lyrics non disponibile nell’app desktop.')
    lyricsText.value = await window.desktop.fetchGeniusLyrics(choice.url)
    lyricsVisible.value = true
    lyricsChoicesVisible.value = false
  } catch (error) {
    lyricsError.value = error.message || 'Impossibile leggere il testo da Genius.'
  } finally {
    lyricsLoading.value = false
  }
}

function closeLyricsChoices() {
  lyricsChoicesVisible.value = false
}

onBeforeUnmount(() => {
  disposed = true
  window.removeEventListener('keydown', handleKeydown)
  unsubscribe?.()
  unsubscribeQueue?.()
  stopAudio()
})

async function toggleLoop() {
  try {
    const enabled = await window.desktop?.toggleLoopAudio()
    loopEnabled.value = Boolean(enabled)
  } catch (error) {
    errorMessage.value = 'Impossibile aggiornare il loop.'
  }
}

async function submit() {
  const query = text.value.trim()
  if (!query || busy.value) return
  busy.value = true
  searchInput.value?.blur()
  errorMessage.value = ''

  const shouldKeepLyrics = Boolean(track.value && ['playing', 'paused', 'buffering'].includes(status.value))
  if (!shouldKeepLyrics) {
    lyricsVisible.value = false
    lyricsChoicesVisible.value = false
    lyricsChoices.value = []
    lyricsText.value = ''
    lyricsError.value = ''
  }

  try {
    if (!window.desktop) throw new Error('Apri questa pagina nell’app desktop per ascoltare la musica.')
    const result = await window.desktop.playAudio(query)
    if (result?.queued) {
      busy.value = false
      return
    }
  } catch (error) {
    if (disposed) return
    errorMessage.value = error.message || 'Impossibile riprodurre questo brano.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="content">
    <div class="home-layout" :class="{ 'lyrics-open': lyricsVisible }">
      <div class="home-stack">
        <form class="central-form" @submit.prevent="submit">
          <div class="form-heading">
            <h1>Search music</h1>
            <button class="info-button" type="button" aria-label="Informazioni sull'app" title="Informazioni" @click="infoVisible = true">
              <span class="material-symbols-outlined" aria-hidden="true">info</span>
            </button>
          </div>
          <div class="search-row">
            <input ref="searchInput" v-model="text" class="input" type="text" aria-label="Titolo o artista" placeholder="Titolo o artista…" @keydown.enter.prevent="submitOnEnter" />
            <button type="submit" :disabled="busy" :aria-busy="busy" aria-label="Cerca canzone" title="Cerca">
              <span class="material-symbols-outlined" aria-hidden="true">search</span>
            </button>
          </div>
          <p v-if="busy" role="status">Caricamento del brano…</p>
          <p v-if="errorMessage" role="alert">{{ errorMessage }}</p>
          <button v-if="busy && !track" class="cancel-search" type="button" @click="stopAudio">Annulla</button>
        </form>
        <MusicCard v-if="track" :track="track" :status="status" :loop-enabled="loopEnabled" @toggle="togglePause" @close="closeCurrentTrack" @lyrics="openLyricsSearch" @loop="toggleLoop" />
        <Panel v-if="queue.length" variant="queue" label="CODA" aria-label="Coda di riproduzione">
          <div class="queue-list">
            <div v-for="(queuedTrack, index) in queue" :key="`${queuedTrack.title}-${index}`" class="queue-card" :class="{ 'queue-current': index === 0 }">
              <div class="queue-thumb">
                <img v-if="queuedTrack.thumbnail" :src="queuedTrack.thumbnail" alt="" />
                <span v-else class="material-symbols-outlined" aria-hidden="true">music_note</span>
              </div>
              <div class="queue-details">
                <span class="queue-title">{{ queuedTrack.title }}</span>
              </div>
            </div>
          </div>
        </Panel>
      </div>
      <Panel v-if="lyricsVisible && track" variant="lyrics" :title="track.title" label="TESTO DELLA CANZONE" aria-label="Testo della canzone">
        <template #header>
          <div>
            <p class="panel-label">TESTO DELLA CANZONE</p>
            <h2>{{ track.title }}</h2>
          </div>
          <button class="close-lyrics" type="button" aria-label="Chiudi testo della canzone" title="Chiudi" @click="lyricsVisible = false">
            <span class="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </template>
        <div class="lyrics-content">
          <span
            v-for="(line, index) in lyricLines"
            :key="`${index}-${line}`"
            class="lyrics-line"
            :class="{ 'is-empty': !line }"
            :style="{ '--line-fill': `${Math.min(1, Math.max(0, lyricProgress - index))}` }"
          >{{ line || '\u00a0' }}</span>
        </div>
      </Panel>
    </div>
    <Popup v-if="lyricsChoicesVisible" label="RICERCA SU GENIUS" title="Scegli la canzone" description="Seleziona uno dei primi risultati trovati su Genius." aria-label="Selezione del testo della canzone" @close="closeLyricsChoices">
        <div v-if="lyricsLoading" class="modal-status" role="status">Caricamento…</div>
        <p v-else-if="lyricsError" class="modal-error" role="alert">{{ lyricsError }}</p>
        <div v-else class="lyrics-choice-list">
          <button v-for="choice in lyricsChoices" :key="choice.url" class="lyrics-choice" type="button" @click="selectLyrics(choice)">
            <span class="choice-title">{{ choice.title }}</span>
            <span class="choice-artist">{{ choice.artist }}</span>
          </button>
        </div>
    </Popup>
    <Popup v-if="infoVisible" label="INFORMAZIONI" title="About this app" aria-label="Informazioni sull'app" @close="infoVisible = false">
      <p class="info-text">The songs are sourced from YouTube, and some are unavailable. The app is still under development, so please be patient if you encounter any bugs.</p>
    </Popup>
  </main>
</template>

<style scoped>
.home-layout { width: min(100%, 1160px); display: grid; grid-template-columns: minmax(0, 560px); justify-content: center; align-items: stretch; gap: 22px; transition: grid-template-columns 0.3s ease; }
.home-layout.lyrics-open { grid-template-columns: minmax(0, 560px) minmax(280px, 380px); }
.home-stack { width: 100%; display: flex; flex-direction: column; gap: 22px; min-height: 0; }
.central-form { position: relative; width: 100%; gap: 28px; padding: 38px; }
.form-heading { position: relative; }
.info-button { position: absolute; top: 50%; right: -18px; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; border: 0; background: transparent; box-shadow: none; color: #a8b0a9; line-height: 0; transform: translateY(-50%); }
.info-button:hover { background: #ffffff0d; color: #fff; }
.info-button:hover { transform: translateY(-50%); }
.info-button:active { transform: translateY(-50%) scale(0.98); }
.info-button .material-symbols-outlined { display: block; width: 1.65rem; height: 1.65rem; font-size: 1.65rem; line-height: 1; font-variation-settings: 'FILL' 0, 'wght' 350, 'GRAD' 0, 'opsz' 24; }
.search-row { display: flex; align-items: center; gap: 14px; }
.search-row .input { padding: 0 18px; }
.search-row button { flex-shrink: 0; }
p { margin: 0; text-align: center; font-size: 0.85rem; overflow-wrap: anywhere; }
[role='alert'] { color: #fca5a5; }
.cancel-search { width: auto; height: auto; padding: 6px 16px; border-radius: 12px; background: transparent; box-shadow: none; font-size: 0.8rem; }
.lyrics-card { min-width: 0; height: min(78vh, 680px); display: flex; flex-direction: column; padding: 26px; border: 1px solid #ffffff1a; border-radius: 24px; background: linear-gradient(135deg, #19221be8, #171916ed); box-shadow: 0 18px 50px #0005; backdrop-filter: blur(18px); animation: lyrics-in 0.3s ease both; }
.lyrics-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding-bottom: 20px; border-bottom: 1px solid #ffffff14; }
.lyrics-label { margin: 0 0 8px; font-size: 0.6rem; letter-spacing: 0.16em; color: #99b59f; }
.lyrics-header h2 { margin: 0; font-size: 1rem; font-weight: 500; line-height: 1.5; overflow-wrap: anywhere; }
.close-lyrics { width: 30px; height: 30px; flex-shrink: 0; border: 0; background: transparent; box-shadow: none; color: #a8b0a9; }
.close-lyrics:hover { background: #ffffff0d; color: #fff; }
.lyrics-content { flex: 1; min-width: 0; overflow-y: auto; overflow-x: hidden; padding-top: 24px; color: #e7e5e4; font-size: 0.95rem; line-height: 2; white-space: pre-wrap; overflow-wrap: anywhere; scrollbar-width: none; }
.lyrics-line { display: block; color: color-mix(in srgb, #b7bd83 calc(var(--line-fill) * 100%), #e7e5e4); transition: color 0.15s linear; }
.lyrics-line.is-empty { min-height: 1em; }
.lyrics-content::-webkit-scrollbar { display: none; }
.lyrics-modal-backdrop { position: fixed; inset: 0; z-index: 10; display: grid; place-items: center; padding: 24px; background: rgb(0 0 0 / 58%); backdrop-filter: blur(6px); }
.lyrics-modal { position: relative; width: min(100%, 520px); max-height: min(76vh, 620px); display: flex; flex-direction: column; padding: 30px; border: 1px solid #ffffff1a; border-radius: 24px; background: linear-gradient(135deg, #19221bf7, #171916f7); box-shadow: 0 24px 80px #0009, inset 0 1px #ffffff12; }
.modal-close { position: absolute; top: 12px; right: 12px; }
.lyrics-modal h2 { margin: 0 0 8px; color: #f5f5f4; font-size: 1.4rem; font-weight: 600; }
.modal-description { margin: 0 0 20px; color: #a8a29e; font-size: 0.82rem; text-align: left; }
.modal-status, .modal-error { padding: 22px 0; text-align: center; font-size: 0.85rem; }
.modal-error { color: #fca5a5; }
.lyrics-choice-list { display: flex; flex-direction: column; gap: 8px; overflow-y: auto; padding-right: 4px; }
.lyrics-choice { width: 100%; height: auto; min-height: 66px; display: flex; flex-direction: column; align-items: flex-start; gap: 3px; padding: 12px 16px; border: 1px solid #ffffff14; border-radius: 14px; background: #ffffff08; box-shadow: none; text-align: left; }
.lyrics-choice:hover { border-color: #608b68; background: #608b681c; transform: translateY(-1px); }
.choice-title { color: #f5f5f4; font-size: 0.9rem; font-weight: 500; }
.choice-artist { color: #99b59f; font-size: 0.75rem; }
.info-text { margin: 0; color: #e7e5e4; font-size: 0.9rem; line-height: 1.7; text-align: left; }
@keyframes lyrics-in { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: translateX(0); } }
@media (max-width: 900px) { .home-layout.lyrics-open { grid-template-columns: minmax(0, 1fr) minmax(240px, 0.7fr); } }
@media (max-width: 680px) { .content { padding: 16px; } .home-layout, .home-layout.lyrics-open { grid-template-columns: 1fr; } .lyrics-card { height: min(62vh, 520px); } }
@media (max-width: 480px) { .central-form { padding: 26px 20px; } }
@media (prefers-reduced-motion: reduce) { .home-layout { transition: none; } .lyrics-card { animation: none; } .lyrics-line { transition: none; } }

.queue-panel { width: 100%; flex: 1 1 auto; display: flex; flex-direction: column; gap: 12px; padding: 18px 18px 10px; border: 1px solid #ffffff1a; border-radius: 20px; background: linear-gradient(135deg, rgba(19, 24, 21, 0.9), rgba(22, 24, 22, 0.95)); box-shadow: 0 14px 34px rgba(0,0,0,0.2); min-height: 0; }
.queue-header { display: flex; align-items: center; justify-content: space-between; }
.queue-list { display: flex; flex-direction: column; gap: 10px; max-height: 220px; overflow-y: auto; padding-right: 4px; }
.queue-card { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 14px; border: 1px solid #ffffff14; background: rgba(255,255,255,0.04); opacity: 0.65; }
.queue-card.queue-current { opacity: 1; border-color: rgba(145, 179, 115, 0.8); }
.queue-thumb { width: 52px; height: 52px; border-radius: 12px; overflow: hidden; display: grid; place-items: center; background: #29392f; flex-shrink: 0; }
.queue-thumb img { width: 100%; height: 100%; object-fit: cover; }
.queue-thumb span { color: #a3b8a7; }
.queue-details { min-width: 0; }
.queue-title { display: block; color: #f5f5f4; font-size: 0.8rem; line-height: 1.35; overflow-wrap: anywhere; }
.queue-list::-webkit-scrollbar { width: 6px; }
.queue-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 999px; }
</style>
