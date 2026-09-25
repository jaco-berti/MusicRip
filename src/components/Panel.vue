<script setup>
defineProps({
  variant: { type: String, default: 'default' },
  label: { type: String, default: '' },
  title: { type: String, default: '' },
  ariaLabel: { type: String, default: undefined },
})
</script>

<template>
  <section class="panel" :class="`panel-${variant}`" :aria-label="ariaLabel">
    <header v-if="label || title || $slots.header" class="panel-header">
      <slot name="header">
        <div>
          <p v-if="label" class="panel-label">{{ label }}</p>
          <h2 v-if="title">{{ title }}</h2>
        </div>
      </slot>
    </header>
    <div class="panel-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #ffffff1a;
  border-radius: 24px;
  background: linear-gradient(135deg, #19221be8, #171916ed);
  box-shadow: 0 18px 50px #0005;
  backdrop-filter: blur(18px);
}
.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}
.panel-label {
  margin: 0 0 8px;
  font-size: 0.6rem;
  letter-spacing: 0.16em;
  color: #99b59f;
}
.panel-header h2 {
  margin: 0;
  color: #f5f5f4;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.panel-header :slotted(.panel-label) {
  margin: 0 0 8px;
  font-size: 0.6rem;
  letter-spacing: 0.16em;
  color: #99b59f;
}
.panel-header :slotted(h2) {
  margin: 0;
  color: #f5f5f4;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.close-lyrics {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  color: #a8b0a9;
}
.close-lyrics:hover { background: #ffffff0d; color: #fff; }
.panel-body { min-width: 0; }
.panel-lyrics {
  height: min(78vh, 680px);
  padding: 26px;
  animation: panel-in 0.3s ease both;
}
.panel-lyrics .panel-header {
  padding-bottom: 20px;
  border-bottom: 1px solid #ffffff14;
}
.panel-lyrics .panel-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-top: 24px;
  scrollbar-width: none;
}
.panel-lyrics .panel-body::-webkit-scrollbar { display: none; }
.lyrics-content {
  color: #e7e5e4;
  font-size: 0.95rem;
  line-height: 2;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.lyrics-line {
  display: block;
  color: color-mix(in srgb, #b7bd83 calc(var(--line-fill) * 100%), #e7e5e4);
  transition: color 0.15s linear;
}
.lyrics-line.is-empty { min-height: 1em; }
.panel-queue {
  flex: 1 1 auto;
  gap: 12px;
  padding: 18px 18px 10px;
  min-height: 0;
  border-radius: 20px;
  background: linear-gradient(135deg, rgb(19 24 21 / 90%), rgb(22 24 22 / 95%));
  box-shadow: 0 14px 34px rgb(0 0 0 / 20%);
}
.panel-queue .panel-header { align-items: center; }
.panel-queue .panel-body {
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}
.panel-queue .panel-body::-webkit-scrollbar { width: 6px; }
.panel-queue .panel-body::-webkit-scrollbar-thumb {
  background: rgb(255 255 255 / 12%);
  border-radius: 999px;
}
.queue-list { display: flex; flex-direction: column; gap: 10px; }
.queue-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #ffffff14;
  border-radius: 14px;
  background: rgb(255 255 255 / 4%);
  opacity: 0.65;
}
.queue-card.queue-current { opacity: 1; border-color: rgb(145 179 115 / 80%); }
.queue-thumb {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 12px;
  background: #29392f;
}
.queue-thumb img { width: 100%; height: 100%; object-fit: cover; }
.queue-thumb span { color: #a3b8a7; }
.queue-details { min-width: 0; }
.queue-title {
  display: block;
  color: #f5f5f4;
  font-size: 0.8rem;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
@keyframes panel-in {
  from { opacity: 0; transform: translateX(18px); }
  to { opacity: 1; transform: translateX(0); }
}
@media (prefers-reduced-motion: reduce) {
  .panel-lyrics { animation: none; }
}
@media (max-width: 680px) {
  .panel-lyrics { height: min(62vh, 520px); }
}
</style>
