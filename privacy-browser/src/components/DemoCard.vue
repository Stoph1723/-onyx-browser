<script setup lang="ts">
interface Props {
  title: string
  description: string
  shortcut?: string
  icon?: string
  action?: () => void
  iconRightContent?: string
}

const props = defineProps<Props>()

const handleClick = () => {
  if (props.action) {
    props.action()
  }
}
</script>

<template>
  <button class="demo-card" @click="handleClick">
    <div class="card-header">
      <span v-if="props.icon" class="card-icon" v-html="props.icon"></span>
      <h4 class="card-title">{{ props.title }}</h4>
    </div>
    <p class="card-desc">{{ props.description }}</p>
    <div v-if="props.shortcut" class="card-shortcut">{{ props.shortcut }}</div>
    <div v-if="props.Content" class="card-content" v-html="props.Content"></div>
  </button>
</template>

<style scoped>
.demo-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
}

.demo-card:hover {
  border-color: var(--color-brand-500);
  background: var(--bg-tertiary);
  box-shadow: 0 4px 20px -4px var(--color-brand-500);
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--bg-tertiary);
  color: var(--color-brand-500);
  flex-shrink: 0;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-primary);
  margin: 0;
  flex: 1;
}

.card-desc {
  font-size: 12px;
  color: var(--fg-tertiary);
  line-height: 1.5;
  margin: 0;
}

.card-shortcut {
  font-size: 11px;
  font-family: var(--font-mono);
  background: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: 4px;
  color: var(--fg-tertiary);
  align-self: flex-start;
  font-weight: 500;
}
</style>