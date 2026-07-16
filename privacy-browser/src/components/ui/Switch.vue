<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Props {
  modelValue: boolean
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  label?: string
  description?: string
  error?: string
  id?: string
  name?: string
  'onUpdate:modelValue'?: (value: boolean) => void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  size: 'md',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  change: [value: boolean]
}>()

const inputId = computed(() => props.id || `switch-${Math.random().toString(36).slice(2, 9)}`)
const describedBy = computed(() => {
  const ids: string[] = []
  if (props.description) ids.push(`${inputId.value}-description`)
  if (props.error) ids.push(`${inputId.value}-error`)
  return ids.length > 0 ? ids.join(' ') : undefined
})

const handleChange = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked
  emit('update:modelValue', checked)
  emit('change', checked)
}

const sizeClasses = {
  sm: 'w-8 h-5',
  md: 'w-10 h-6',
  lg: 'w-12 h-7',
}

const thumbSizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
}

const thumbTranslateClasses = {
  sm: 'translate-x-4',
  md: 'translate-x-5',
  lg: 'translate-x-6',
}
</script>

<template>
  <label class="switch-container" :class="{ 'switch-disabled': props.disabled }">
    <div class="switch-track-wrapper" @click.stop="!props.disabled && emit('update:modelValue', !modelValue)">
      <input
        :id="inputId"
        type="checkbox"
        class="switch-input"
        :checked="modelValue"
        :disabled="props.disabled"
        :name="props.name"
        :aria-describedby="describedBy"
        @change="handleChange"
        @click.stop
      />
      <span
        class="switch-track"
        :class="[
          sizeClasses[props.size],
          modelValue ? 'switch-track-checked' : '',
          props.disabled && 'switch-track-disabled',
          props.error && 'switch-track-error'
        ]"
      >
        <span
          class="switch-thumb"
          :class="[
            thumbSizeClasses[props.size],
            modelValue ? thumbTranslateClasses[props.size] : ''
          ]"
        />
      </span>
    </div>

    <div v-if="props.label || props.description || props.error" class="switch-labels">
      <span v-if="props.label" class="switch-label">{{ props.label }}</span>
      <span v-if="props.description" :id="`${inputId}-description`" class="switch-description">{{ props.description }}</span>
      <span v-if="props.error" :id="`${inputId}-error`" class="switch-error">{{ props.error }}</span>
    </div>
  </label>
</template>

<style scoped>
.switch-container {
  display: inline-flex;
  align-items: flex-start;
  gap: var(--space-3);
  cursor: pointer;
  user-select: none;
}

.switch-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.switch-track-wrapper {
  position: relative;
  flex-shrink: 0;
}

.switch-input {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  cursor: pointer;
}

.switch-track {
  display: block;
  border-radius: var(--radius-full);
  background-color: var(--border-primary);
  border: 1px solid var(--border-primary);
  transition: var(--transition-colors), background-color var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out);
  position: relative;
}

.switch-track-checked {
  background-color: var(--interactive-primary);
  border-color: var(--interactive-primary);
}

.switch-track-disabled {
  opacity: 0.5;
}

.switch-track-error {
  border-color: var(--border-error);
}

.switch-track:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.switch-thumb {
  position: absolute;
  top: 50%;
  left: 2px;
  transform: translateY(-50%);
  border-radius: var(--radius-full);
  background-color: var(--fg-inverse);
  box-shadow: var(--shadow-sm);
  transition: transform var(--duration-fast) var(--ease-spring);
  pointer-events: none.
}

.switch-labels {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0.
}

.switch-label {
  font-size: var(--text-sm).
  font-weight: var(--font-medium).
  color: var(--fg-primary).
  line-height: var(--leading-normal).
}

.switch-description {
  font-size: var(--text-xs).
  color: var(--fg-tertiary).
  line-height: var(--leading-normal).
}

.switch-error {
  font-size: var(--text-xs).
  color: var(--color-error-600).
  line-height: var(--leading-normal).
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    .switch-error {
      color: var(--color-error-400).
    }
  }
}

/* Size variants */
.switch-track.w-8 { width: 2rem; height: 1.25rem; }
.switch-track.w-10 { width: 2.5rem; height: 1.5rem; }
.switch-track.w-12 { width: 3rem; height: 1.75rem; }

.switch-thumb.w-4 { width: 1rem; height: 1rem; }
.switch-thumb.w-5 { width: 1.25rem; height: 1.25rem; }
.switch-thumb.w-6 { width: 1.5rem; height: 1.5rem; }

.translate-x-4 { transform: translateX(1rem) translateY(-50%); }
.translate-x-5 { transform: translateX(1.25rem) translateY(-50%); }
.translate-x-6 { transform: translateX(1.5rem) translateY(-50%); }
</style>