<script setup>
defineProps({
  title: { type: String, default: '' },
  label: { type: String, default: '' },
  description: { type: String, default: '' },
  ariaLabel: { type: String, default: 'Finestra di dialogo' },
})

const emit = defineEmits(['close'])
</script>

<template>
  <div class="popup-backdrop" role="presentation" @click.self="emit('close')">
    <section class="popup" role="dialog" aria-modal="true" :aria-label="ariaLabel">
      <button class="popup-close" type="button" aria-label="Chiudi" title="Chiudi" @click="emit('close')">
        <span class="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
      <p v-if="label" class="popup-label">{{ label }}</p>
      <h2 v-if="title">{{ title }}</h2>
      <p v-if="description" class="popup-description">{{ description }}</p>
      <div class="popup-content"><slot /></div>
    </section>
  </div>
</template>

<style scoped>
.popup-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(0 0 0 / 58%);
  backdrop-filter: blur(6px);
}
.popup {
  position: relative;
  width: min(100%, 520px);
  max-height: min(76vh, 620px);
  display: flex;
  flex-direction: column;
  padding: 30px;
  border: 1px solid #ffffff1a;
  border-radius: 24px;
  background: linear-gradient(135deg, #19221bf7, #171916f7);
  box-shadow: 0 24px 80px #0009, inset 0 1px #ffffff12;
}
.popup-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 30px;
  height: 30px;
  border: 0;
  background: transparent;
  box-shadow: none;
  color: #a8b0a9;
}
.popup-close:hover { background: #ffffff0d; color: #fff; }
.popup-label {
  margin: 0 0 8px;
  font-size: 0.6rem;
  letter-spacing: 0.16em;
  color: #99b59f;
}
.popup h2 {
  margin: 0 0 8px;
  color: #f5f5f4;
  font-size: 1.4rem;
  font-weight: 600;
}
.popup-description {
  margin: 0 0 20px;
  color: #a8a29e;
  font-size: 0.82rem;
  text-align: left;
}
.popup-content {
  min-height: 0;
  overflow-y: auto;
}
.modal-status, .modal-error {
  padding: 22px 0;
  text-align: center;
  font-size: 0.85rem;
}
.modal-error { color: #fca5a5; }
.lyrics-choice-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
}
.lyrics-choice {
  width: 100%;
  height: auto;
  min-height: 66px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 12px 16px;
  border: 1px solid #ffffff14;
  border-radius: 14px;
  background: #ffffff08;
  box-shadow: none;
  text-align: left;
}
.lyrics-choice:hover {
  border-color: #608b68;
  background: #608b681c;
  transform: translateY(-1px);
}
.choice-title { color: #f5f5f4; font-size: 0.9rem; font-weight: 500; }
.choice-artist { color: #99b59f; font-size: 0.75rem; }
</style>
