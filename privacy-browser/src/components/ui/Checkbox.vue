<script setup lang="ts">
import { ref, computed } from 'vue'

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

const inputId = computed(() => props.id || `checkbox-${Math.random().toString(36).slice(2, 9)}`)
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
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
}
</script>

<template>
  <label class="checkbox-container" :class="{ 'checkbox-disabled': disabled }">
    <input
      :id="inputId"
      type="checkbox"
      class="checkbox-input"
      :checked="modelValue"
      :disabled="disabled"
      :name="name"
      :aria-describedby="describedBy"
      @change="handleChange"
    />
    <span
      class="checkbox-box"
      :class="[
        sizeClasses[size],
        modelValue ? 'checkbox-checked' : '',
        disabled && 'checkbox-disabled',
        error && 'checkbox-error'
      ]"
    >
      <span class="checkmark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    </span>

    <div v-if="label || description || error" class="checkbox-labels">
      <span v-if="label" class="checkbox-label">{{ label }}</span>
      <span v-if="description" :id="`${inputId}-description`" class="checkbox-description">{{ description }}</span>
      <span v-if="error" :id="`${inputId}-error`" class="checkbox-error">{{ error }}</span>
    </div>
  </label>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

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

const inputId = computed(() => props.id || `checkbox-${Math.random().toString(36).slice(2, 9)}`)
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
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
}
</script>

<template>
  <label class="checkbox-container" :class="{ 'checkbox-disabled': disabled }">
    <input
      :id="inputId"
      type="checkbox"
      class="checkbox-input"
      :checked="modelValue"
      :disabled="disabled"
      :name="name"
      :aria-describedby="describedBy"
      @change="handleChange"
    />
    <span
      class="checkbox-box"
      :class="[
        sizeClasses[size],
        modelValue ? 'checkbox-checked' : '',
        disabled && 'checkbox-disabled',
        error && 'checkbox-error'
      ]"
    >
      <span class="checkmark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    </span>

    <div v-if="label || description || error" class="checkbox-labels">
      <span v-if="label" class="checkbox-label">{{ label }}</span>
      <span v-if="description" :id="`${inputId}-description`" class="checkbox-description">{{ description }}</span>
      <span v-if="error" :id="`${inputId}-error`" class="checkbox-error">{{ error }}</span>
    </div>
  </label>
</template>

<style scoped>
.checkbox-container {
  display: inline-flex;
  align-items: flex-start;
  gap: var(--space-3);
  cursor: pointer;
  user-select: none;
}

.checkbox-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.checkbox-input {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  cursor: pointer;
}

.checkbox-box {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: transparent;
  border: 1px solid var(--border-primary);
  transition: var(--transition-colors), background-color var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out);
  flex-shrink: 0;
}

.checkbox-box.w-4 { width: 1rem; height: 1rem; }
.checkbox-box.w-5 { width: 1.25rem; height: 1.25rem; }
.checkbox-box.w-6 { width: 1.5rem; height: 1.5rem; }

.checkbox-checked {
  background-color: var(--interactive-primary);
  border-color: var(--interactive-primary);
}

.checkbox-disabled {
  opacity: 0.5;
}

.checkbox-error {
  border-color: var(--border-error);
}

.checkmark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--fg-inverse);
  transform: scale(0);
  transition: transform var(--duration-fast) var(--ease-spring);
}

.checkbox-checked .checkmark {
  transform: scale(1);
}

.checkmark svg {
  width: 100%;
  height: 100%;
}

.checkbox-labels {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.checkbox-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--fg-primary);
  line-height: var(--leading-normal);
}

.checkbox-description {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  line-height: var(--leading-normal);
}

.checkbox-error {
  font-size: var(--text-xs);
  color: var(--color-error-600);
  line-height: var(--leading-normal);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    .checkbox-error {
      color: var(--color-error-400);
    }
  }
}
</style>