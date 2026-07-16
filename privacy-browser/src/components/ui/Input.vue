import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { invoke } from '@tauri-apps/api/core'

interface Props {
  modelValue: string
  type?: 'text' | 'url' | 'search' | 'password' | 'email' | 'number'
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  error?: string
  label?: string
  description?: string
  leadingIcon?: string
  trailingIcon?: string
  clearable?: boolean
  size?: 'sm' | 'md' | 'lg'
  autocomplete?: string
  spellcheck?: boolean
  inputmode?: string
  id?: string
  name?: string
  'onUpdate:modelValue'?: (value: string) => void
  'onFocus'?: (event: FocusEvent) => void
  'onBlur'?: (event: FocusEvent) => void
  'onKeydown'?: (event: KeyboardEvent) => void
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  readonly: false,
  required: false,
  clearable: false,
  size: 'md',
  spellcheck: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
  keydown: [event: KeyboardEvent]
  clear: []
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const focused = ref(false)
const showClear = ref(false)
const inputId = computed(() => props.id || `input-${Math.random().toString(36).slice(2, 9)}`)
const describedBy = computed(() => {
  const ids: string[] = []
  if (props.description) ids.push(`${inputId.value}-description`)
  if (props.error) ids.push(`${inputId.value}-error`)
  return ids.length > 0 ? ids.join(' ') : undefined
})

const handleInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
}

const handleFocus = (event: FocusEvent) => {
  focused.value = true
  showClear.value = true
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  focused.value = false
  showClear.value = false
  emit('blur', event)
}

const handleKeydown = (event: KeyboardEvent) => {
  emit('keydown', event)
}

const handlePaste = (event: ClipboardEvent) => {
  // Handle paste if needed
}

const clear = () => {
  emit('update:modelValue', '')
  emit('clear')
  inputRef.value?.focus()
}

const handleLeadingClick = () => {
  // For leading icons like search
}

const handleTrailingClick = () => {
  // For trailing icons
}
</script>

<template>
  <div class="input-wrapper" :class="[
    'input-wrapper--' + size,
    { focused, 'input-error': error, 'input-disabled': disabled, 'input-readonly': readonly, 'input-has-leading': leadingIcon, 'input-has-trailing': trailingIcon || showClear }
  ]">
    <label v-if="label" :for="inputId" class="input-label">{{ label }}</label>

    <div class="input-container" @click="inputRef?.focus()">
      <span v-if="leadingIcon" class="input-icon input-icon-leading" @click="handleLeadingClick" aria-hidden="true">
        <component :is="leadingIcon" />
      </span>

      <input
        ref="inputRef"
        :id="inputId"
        :type="type"
        :value="modelValue"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
        @paste="handlePaste"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :aria-describedby="describedBy"
        :aria-invalid="!!error"
        :autocomplete="autocomplete"
        :spellcheck="spellcheck"
        :inputmode="inputmode"
        :name="name"
        class="input-field"
      />

      <span v-if="trailingIcon && !showClear" class="input-icon input-icon-trailing" @click="handleTrailingClick" aria-hidden="true">
        <component :is="trailingIcon" />
      </span>

      <button
        v-if="showClear"
        type="button"
        class="input-clear"
        @click.stop="clear"
        aria-label="Clear"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <span v-if="description" :id="`${inputId}-description`" class="input-description">{{ description }}</span>
    <span v-if="error" :id="`${inputId}-error`" class="input-error-message" role="alert">{{ error }}</span>
  </div>
</template>

<style scoped>
.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  width: 100%;
}

.input-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--fg-primary);
}

.input-container {
  position: relative;
  display: flex;
  align-items: center;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-input);
  transition: var(--transition-colors);
}

.input-container:hover:not(.input-disabled):not(.input-readonly):not(.input-focused) {
  border-color: var(--border-secondary);
}

.input-focused {
  border-color: var(--border-focus);
  box-shadow: var(--focus-ring);
}

.input-error {
  border-color: var(--border-error);
}

.input-error.input-focused {
  box-shadow: 0 0 0 2px var(--color-error-100);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    .input-error.input-focused {
      box-shadow: 0 0 0 2px var(--color-error-900);
    }
  }
}

.input-disabled,
.input-readonly {
  background-color: var(--bg-tertiary);
  opacity: 0.7;
}

.input-field {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--fg-primary);
  font-size: var(--text-sm);
  font-family: inherit;
  line-height: var(--leading-normal);
  padding: 0;
  width: 100%;
}

.input-field::placeholder {
  color: var(--fg-muted);
}

.input-field:disabled,
.input-field[readonly] {
  cursor: not-allowed;
}

.input-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  pointer-events: none;
}

.input-icon-leading {
  padding-left: var(--space-2);
}

.input-icon-trailing {
  padding-right: var(--space-2);
}

.input-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: var(--space-1);
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--fg-tertiary);
  cursor: pointer;
  transition: var(--transition-colors);
  flex-shrink: 0;
}

.input-clear:hover {
  background: var(--bg-secondary);
  color: var(--fg-secondary);
}

.input-clear:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.input-description {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  line-height: var(--leading-normal);
}

.input-error-message {
  font-size: var(--text-xs);
  color: var(--color-error-600);
  line-height: var(--leading-normal);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    .input-error-message {
      color: var(--color-error-400);
    }
  }
}

/* Sizes */
.input-wrapper--sm .input-container { height: 32px; }
.input-wrapper--sm .input-field { font-size: var(--text-xs); padding: 0 var(--space-2); }
.input-wrapper--sm .input-icon-leading { padding-left: var(--space-2); }
.input-wrapper--sm .input-icon-trailing { padding-right: var(--space-2); }
.input-wrapper--sm .input-clear { width: 24px; height: 24px; }

.input-wrapper--md .input-container { height: 40px; }
.input-wrapper--md .input-field { font-size: var(--text-sm); padding: 0 var(--space-3); }
.input-wrapper--md .input-icon-leading { padding-left: var(--space-3); }
.input-wrapper--md .input-icon-trailing { padding-right: var(--space-3); }
.input-wrapper--md .input-clear { width: 32px; height: 32px; }

.input-wrapper--lg .input-container { height: 48px; }
.input-wrapper--lg .input-field { font-size: var(--text-base); padding: 0 var(--space-4); }
.input-wrapper--lg .input-icon-leading { padding-left: var(--space-4); }
.input-wrapper--lg .input-icon-trailing { padding-right: var(--space-4); }
.input-wrapper--lg .input-clear { width: 36px; height: 36px; }

/* Adjust padding when icons present */
.input-has-leading .input-field { padding-left: 0; }
.input-has-trailing .input-field { padding-right: 0; }
.input-wrapper--sm.input-has-leading .input-field { padding-left: var(--space-2); }
.input-wrapper--sm.input-has-trailing .input-field { padding-right: var(--space-2); }
.input-wrapper--md.input-has-leading .input-field { padding-left: var(--space-3); }
.input-wrapper--md.input-has-trailing .input-field { padding-right: var(--space-3); }
.input-wrapper--lg.input-has-leading .input-field { padding-left: var(--space-4); }
.input-wrapper--lg.input-has-trailing .input-field { padding-right: var(--space-4); }
</style>