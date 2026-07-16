<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  content: string
  trigger?: 'hover' | 'click' | 'focus'
  placement?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  trigger: 'hover',
  placement: 'top',
  delay: 200,
  disabled: false,
})

const show = ref(false)
const showTimeout = ref<number | null>(null)
const hideTimeout = ref<number | null>(null)
const tooltipRef = ref<HTMLElement | null>(null)

const showTooltip = () => {
  if (props.disabled) return
  if (hideTimeout.value) {
    clearTimeout(hideTimeout.value)
    hideTimeout.value = null
  }
  showTooltip.value = setTimeout(() => {
    show.value = true
  }, props.delay)
}

const hideTooltip = () => {
  if (showTooltip.value) {
    clearTimeout(showTooltip.value)
    showTooltip.value = null
  }
  hideTimeout.value = setTimeout(() => {
    show.value = false
  }, 100)
}

const computedPlacement = computed(() => {
  const placements: Record<string, string> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
  }
  return placements[props.placement] || 'bottom'
}
</script>

<template>
  <div class="tooltip-wrapper" ref="tooltipRef">
    <slot name="trigger">
      <span class="tooltip-trigger" :class="{ 'tooltip-disabled': disabled }">
        <slot />
      </slot>
    </slot>

    <Transition name="fade">
      <div
        v-if="show"
        class="tooltip"
        :class="[placement]"
        role="tooltip"
        :style="tooltipStyle"
      >
        <div class="tooltip-arrow"></div>
        <div class="tooltip-content">{{ content }}</div>
      </Transition>
    </Transition>
  </div>
</template>

<style scoped>
.tooltip-wrapper {
  position: relative;
  display: inline-flex;
}

.tooltip-trigger {
  display: inline-flex;
}

.tooltip-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.tooltip {
  position: absolute;
  z-index: var(--z-tooltip);
  max-width: 280px;
  padding: var(--space-2) var(--space-3);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--fg-primary);
  box-shadow: var(--shadow-lg);
  white-space: normal;
  animation: fadeIn var(--duration-fast) var(--ease-out);
}

.tooltip::before {
  content: '';
  position: absolute;
  width: 0;
  height: 0;
  border: 6px solid transparent;
}

.tooltip-top {
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
}

.tooltip-top::before {
  bottom: -12px;
  left: 50%;
  margin-left: -6px;
  border-top-color: var(--bg-tertiary);
  border-bottom: 0;
}

.tooltip-bottom {
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
}

.tooltip-bottom::before {
  top: -12px;
  left: 50%;
  margin-left: -6px;
  border-bottom-color: var(--bg-tertiary);
  border-top: 0;
}

.tooltip-left {
  right: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
}

.tooltip-left::before {
  left: 100%;
  top: 50%;
  margin-top: -6px;
  border-left-color: var(--bg-tertiary);
  border-right: 0;
}

.tooltip-right {
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
}

.tooltip-right::before {
  right: 100%;
  top: 50%;
  margin-top: -6px;
  border-right-color: var(--bg-tertiary);
  border-left: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--duration-fast) var(--ease-out);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}
</style>