<script setup>
import { computed, ref, watch } from 'vue'
const props = defineProps({
  track: { type: Object, required: true },
  status: String,
  loopEnabled: { type: Boolean, default: false },
})
const emit = defineEmits(['toggle', 'close', 'lyrics', 'loop'])
const imageFailed = ref(false)
watch(() => props.track.thumbnail, () => { imageFailed.value = false })
const progress = computed(() => props.track.duration > 0
  ? Math.min(100, props.track.position / props.track.duration * 100) : 0)
function time(seconds = 0) {
  const value = Math.max(0, Math.floor(seconds))
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
}
</script>

<template>
  <section class="music-card" aria-label="Brano in riproduzione">
    <button class="close-track" type="button" aria-label="Interrompi e chiudi il brano" title="Interrompi e chiudi" @click="emit('close')">
      <span class="material-symbols-outlined" aria-hidden="true">close</span>
    </button>
    <div class="artwork">
      <img v-if="track.thumbnail && !imageFailed" :src="track.thumbnail" alt="Copertina del video" @error="imageFailed = true" />
      <span v-else class="material-symbols-outlined" aria-hidden="true">music_note</span>
    </div>
    <div class="track-details">
      <p class="track-status">{{ status === 'paused' ? 'IN PAUSA' : status === 'buffering' ? 'CARICAMENTO…' : 'IN RIPRODUZIONE' }}</p>
      <h2 :title="track.title">{{ track.title }}</h2>
      <div class="playback-row">
        <button class="pause-track" type="button" :disabled="status === 'buffering'" :aria-label="status === 'paused' ? 'Riprendi' : 'Pausa'" @click="emit('toggle')">
          <span class="material-symbols-outlined" aria-hidden="true">{{ status === 'paused' ? 'play_arrow' : 'pause' }}</span>
        </button>
        <button class="loop-track" type="button" :class="{ 'loop-active': loopEnabled }" :aria-label="loopEnabled ? 'Disattiva riproduzione in loop' : 'Attiva riproduzione in loop'" title="Loop" @click="emit('loop')">
          <span class="material-symbols-outlined" aria-hidden="true">repeat</span>
        </button>
        <button class="lyrics-track" type="button" aria-label="Mostra il testo della canzone" title="Mostra testo" @click="emit('lyrics')">
          <span class="material-symbols-outlined" aria-hidden="true">lyrics</span>
        </button>
        <div class="timeline">
          <div class="progress-track" role="progressbar" aria-label="Avanzamento del brano" :aria-valuenow="Math.round(progress)" :aria-valuemin="0" :aria-valuemax="100" :aria-valuetext="`${time(track.position)} di ${time(track.duration)}`">
            <div class="progress-fill" :style="{ width: `${progress}%` }" />
          </div>
          <div class="time-labels"><span>{{ time(track.position) }}</span><span>{{ track.duration ? time(track.duration) : '—:—' }}</span></div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.music-card { position: relative; display: flex; align-items: center; gap: 22px; padding: 26px; border: 1px solid #ffffff1a; border-radius: 24px; background: linear-gradient(135deg, #19221be8, #171916ed); box-shadow: 0 18px 50px #0005; backdrop-filter: blur(18px); }
.artwork { width: 112px; height: 112px; flex-shrink: 0; display: grid; place-items: center; background: #29392f; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 20px #0005; }
.artwork img { width: 100%; height: 100%; object-fit: cover; }
.artwork > span { font-size: 38px; color: #a3b8a7; font-variation-settings: 'FILL' 0, 'wght' 350, 'GRAD' 0, 'opsz' 24; }
.track-details { min-width: 0; flex: 1; }
.track-status { margin: 0 28px 7px 0; font-size: 0.6rem; letter-spacing: 0.16em; color: #99b59f; }
h2 { margin: 0 22px 18px 0; font-size: 1rem; font-weight: 500; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
.close-track { position: absolute; top: 12px; right: 12px; width: 30px; height: 30px; border: 0; background: transparent; box-shadow: none; color: #a8b0a9; }
.close-track:hover { background: #ffffff0d; color: #fff; }
.playback-row { display: flex; align-items: center; gap: 16px; }
.pause-track, .lyrics-track, .loop-track { width: 42px; height: 42px; flex-shrink: 0; }
.pause-track .material-symbols-outlined,
.lyrics-track .material-symbols-outlined,
.loop-track .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 350, 'GRAD' 0, 'opsz' 24; }
.loop-track.loop-active { background: linear-gradient(120deg, #476f4d, #7d8d44, #8c6f3a); }
.timeline { flex: 1; min-width: 0; }
.progress-track { height: 5px; overflow: hidden; border-radius: 8px; background: #ffffff13; }
.progress-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #608b68, #b7bd83); transition: width 0.25s linear; }
.time-labels { margin-top: 8px; display: flex; justify-content: space-between; font-size: 0.65rem; color: #a0a69e; font-variant-numeric: tabular-nums; }
@media (max-width: 480px) { .music-card { padding: 20px 16px; gap: 14px; } .artwork { width: 74px; height: 74px; } .playback-row { gap: 10px; } .pause-track, .lyrics-track, .loop-track { width: 38px; height: 38px; } }
@media (prefers-reduced-motion: reduce) { .progress-fill { transition: none; } }
</style>
