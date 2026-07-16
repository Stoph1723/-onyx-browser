<script setup lang="ts">
interface Props {
  icon: string
  name: string
  desc: string
  color: string
}

const props = defineProps<Props>()
</script>

<template>
  <button 
    class="container-type"
    :style="{ '--container-color': color }"
    @click="$emit('click')"
  >
    <div class="type-icon" :style="{ backgroundColor: color }">
      <span v-html="icon"></span>
    </div>
    <span class="type-name">{{ name }}</div>
    <span class="type-desc">{{ desc }}</div>
  </button>
</template>

<style scoped>
.container-type {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.container-type:hover {
  border-color: var(--container-color);
  box-shadow: 0 4px 20px -4px var(--container-color);
  transform: translateY(-2px);
}

.type-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  font-size: 24px;
}

.type-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-primary);
}

.type-desc {
  font-size: 11px;
  color: var(--fg-tertiary);
  line-height: 1.4;
}
</style>