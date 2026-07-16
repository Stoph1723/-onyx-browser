<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'

interface Props {
  modelValue: string
  options: Array<{ value: string | number; label: string; disabled?: boolean; icon?: string; description?: string }>
  placeholder?: string
  disabled?: boolean
  required?: boolean
  error?: string
  label?: string
  description?: string
  searchable?: boolean
  clearable?: boolean
  size?: 'sm' | 'md' | 'lg'
  id?: string
  name?: string
  'onUpdate:modelValue'?: (value: string | number) => void
  'onFocus'?: () => void
  'onBlur'?: () => void
  'onChange'?: (value: string | number) => void
}

const props = withDefaults(defineProps<Props>(), {
  options: () => [],
  disabled: false,
  required: false,
  searchable: false,
  clearable: false,
  size: 'md',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  focus: []
  blur: []
  change: [value: string | number]
}>()

const selectRef = ref<HTMLDivElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const optionsRef = ref<HTMLDivElement | null>(null)
const open = ref(false)
const focused = ref(false)
const searchQuery = ref('')
const highlightedIndex = ref(-1)
const inputId = `select-${Math.random().toString(36).slice(2, 9)}`

const selectedOption = computed(() => 
  props.options.find(o => o.value === props.modelValue)
)

const filteredOptions = computed(() => {
  if (!props.searchable) return props.options
  const query = searchQuery.value.toLowerCase()
  return props.options.filter(o => 
    o.label.toLowerCase().includes(query) ||
    String(o.value).toLowerCase().includes(query) ||
    (o.description && o.description.toLowerCase().includes(query))
  )
}

const handleClickOutside = (event: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    close()
  }
}

const openDropdown = () => {
  if (props.disabled) return
  open.value = true
  focused.value = true
  highlightedIndex.value = filteredOptions.value.findIndex(o => o.value === props.modelValue)
  emit('focus')
  nextTick(() => {
    scrollToHighlighted()
  })
}

const close = () => {
  open.value = false
  searchQuery.value = ''
  highlightedIndex.value = -1
  emit('blur')
}

const toggle = () => {
  if (open.value) close()
  else openDropdown()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!open.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      openDropdown()
    }
    return
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredOptions.value.length - 1)
      scrollToHighlighted()
      break
    case 'ArrowUp':
      event.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
      scrollToHighlighted()
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (highlightedIndex.value >= 0) {
        selectOption(filteredOptions.value[highlightedIndex.value])
      }
      break
    case 'Escape':
      close()
      break
    case 'Tab':
      close()
      break
    default:
      if (props.searchable && event.key.length === 1) {
        searchQuery.value += event.key.toLowerCase()
        highlightedIndex.value = 0
      }
  }
}

const handleInputKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Backspace' && searchQuery.value) {
    searchQuery.value = searchQuery.value.slice(0, -1)
    highlightedIndex.value = 0
  }
}

const scrollToHighlighted = () => {
  const optionEl = optionsRef.value?.querySelector(`[data-index="${highlightedIndex.value}"]`)
  if (optionEl) {
    optionEl.scrollIntoView({ block: 'nearest' })
  }
}

const selectOption = (option: typeof props.options[0]) => {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
  close()
}

const handleClickOutside = (event: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    close()
  }
}

const openDropdown = () => {
  if (props.disabled) return
  open.value = true
  focused.value = true
  highlightedIndex.value = filteredOptions.value.findIndex(o => o.value === props.modelValue)
  emit('focus')
  nextTick(() => {
    scrollToHighlighted()
  })
}

const close = () => {
  open.value = false
  searchQuery.value = ''
  highlightedIndex.value = -1
  emit('blur')
}

const toggle = () => {
  if (open.value) close()
  else openDropdown()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!open.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      openDropdown()
    }
    return
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredOptions.value.length - 1)
      scrollToHighlighted()
      break
    case 'ArrowUp':
      event.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
      scrollToHighlighted()
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (highlightedIndex.value >= 0) {
        selectOption(filteredOptions.value[highlightedIndex.value])
      }
      break
    case 'Escape':
      close()
      break
    case 'Tab':
      close()
      break
    default:
      if (props.searchable && event.key.length === 1) {
        searchQuery.value += event.key.toLowerCase()
        highlightedIndex.value = 0
      }
  }
}

const handleInputKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Backspace' && searchQuery.value) {
    searchQuery.value = searchQuery.value.slice(0, -1)
    highlightedIndex.value = 0
  }
}

const scrollToHighlighted = () => {
  const optionEl = optionsRef.value?.querySelector(`[data-index="${highlightedIndex.value}"]`)
  if (optionEl) {
    optionEl.scrollIntoView({ block: 'nearest' })
  }
}

const selectOption = (option: typeof props.options[0]) => {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
  close()
}

const handleClickOutside = (event: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    close()
  }
}

const open = () => {
  if (!props.disabled) openDropdown()
}

const close = () => {
  open.value = false
  searchQuery.value = ''
  highlightedIndex.value = -1
  emit('blur')
}

const toggle = () => {
  if (open.value) close()
  else openDropdown()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!open.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      openDropdown()
    }
    return
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredOptions.value.length - 1)
      scrollToHighlighted()
      break
    case 'ArrowUp':
      event.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
      scrollToHighlighted()
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (highlightedIndex.value >= 0) {
        selectOption(filteredOptions.value[highlightedIndex.value])
      }
      break
    case 'Escape':
      close()
      break
    case 'Tab':
      close()
      break
    default:
      if (props.searchable && event.key.length === 1) {
        searchQuery.value += event.key.toLowerCase()
        highlightedIndex.value = 0
      }
  }
}

const handleInputKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Backspace' && searchQuery.value) {
    searchQuery.value = searchQuery.value.slice(0, -1)
    highlightedIndex.value = 0
  }
}

const scrollToHighlighted = () => {
  const optionEl = optionsRef.value?.querySelector(`[data-index="${highlightedIndex.value}"]`)
  if (optionEl) {
    optionEl.scrollIntoView({ block: 'nearest' })
  }
}

const selectOption = (option: typeof props.options[0]) => {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
  close()
}

const handleClickOutside = (event: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    close()
  }
}

const open = () => {
  if (!props.disabled) openDropdown()
}

const close = () => {
  open.value = false
  searchQuery.value = ''
  highlightedIndex.value = -1
  emit('blur')
}

const toggle = () => {
  if (open.value) close()
  else openDropdown()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!open.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      openDropdown()
    }
    return
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredOptions.value.length - 1)
      scrollToHighlighted()
      break
    case 'ArrowUp':
      event.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
      scrollToHighlighted()
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (highlightedIndex.value >= 0) {
        selectOption(filteredOptions.value[highlightedIndex.value])
      }
      break
    case 'Escape':
      close()
      break
    case 'Tab':
      close()
      break
    default:
      if (props.searchable && event.key.length === 1) {
        searchQuery.value += event.key.toLowerCase()
        highlightedIndex.value = 0
      }
  }
}

const handleInputKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Backspace' && searchQuery.value) {
    searchQuery.value = searchQuery.value.slice(0, -1)
    highlightedIndex.value = 0
  }
}

const scrollToHighlighted = () => {
  const optionEl = optionsRef.value?.querySelector(`[data-index="${highlightedIndex.value}"]`)
  if (optionEl) {
    optionEl.scrollIntoView({ block: 'nearest' })
  }
}

const selectOption = (option: typeof props.options[0]) => {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
  close()
}

const handleClickOutside = (event: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    close()
  }
}

const open = () => {
  if (!props.disabled) openDropdown()
}

const close = () => {
  open.value = false
  searchQuery.value = ''
  highlightedIndex.value = -1
  emit('blur')
}

const toggle = () => {
  if (open.value) close()
  else openDropdown()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!open.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      openDropdown()
    }
    return
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredOptions.value.length - 1)
      scrollToHighlighted()
      break
    case 'ArrowUp':
      event.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
      scrollToHighlighted()
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (highlightedIndex.value >= 0) {
        selectOption(filteredOptions.value[highlightedIndex.value])
      }
      break
    case 'Escape':
      close()
      break
    case 'Tab':
      close()
      break
    default:
      if (props.searchable && event.key.length === 1) {
        searchQuery.value += event.key.toLowerCase()
        highlightedIndex.value = 0
      }
  }
}

const handleInputKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Backspace' && searchQuery.value) {
    searchQuery.value = searchQuery.value.slice(0, -1)
    highlightedIndex.value = 0
  }
}

const scrollToHighlighted = () => {
  const optionEl = optionsRef.value?.querySelector(`[data-index="${highlightedIndex.value}"]`)
  if (optionEl) {
    optionEl.scrollIntoView({ block: 'nearest' })
  }
}

const selectOption = (option: typeof props.options[0]) => {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
  close()
}

const handleClickOutside = (event: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    close()
  }
}

const open = () => {
  if (!props.disabled) openDropdown()
}

const close = () => {
  open.value = false
  searchQuery.value = ''
  highlightedIndex.value = -1
  emit('blur')
}

const toggle = () => {
  if (open.value) close()
  else openDropdown()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!open.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      openDropdown()
    }
    return
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredOptions.value.length - 1)
      scrollToHighlighted()
      break
    case 'ArrowUp':
      event.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
      scrollToHighlighted()
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (highlightedIndex.value >= 0) {
        selectOption(filteredOptions.value[highlightedIndex.value])
      }
      break
    case 'Escape':
      close()
      break
    case 'Tab':
      close()
      break
    default:
      if (props.searchable && event.key.length === 1) {
        searchQuery.value += event.key.toLowerCase()
        highlightedIndex.value = 0
      }
  }
}

const handleInputKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Backspace' && searchQuery.value) {
    searchQuery.value = searchQuery.value.slice(0, -1)
    highlightedIndex.value = 0
  }
}

const scrollToHighlighted = () => {
  const optionEl = optionsRef.value?.querySelector(`[data-index="${highlightedIndex.value}"]`)
  if (optionEl) {
    optionEl.scrollIntoView({ block: 'nearest' })
  }
}

const selectOption = (option: typeof props.options[0]) => {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
  close()
}

const handleClickOutside = (event: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    close()
  }
}

const open = () => {
  if (!props.disabled) openDropdown()
}

const close = () => {
  open.value = false
  searchQuery.value = ''
  highlightedIndex.value = -1
  emit('blur')
}

const toggle = () => {
  if (open.value) close()
  else openDropdown()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!open.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      openDropdown()
    }
    return
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredOptions.value.length - 1)
      scrollToHighlighted()
      break
    case 'ArrowUp':
      event.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
      scrollToHighlighted()
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (highlightedIndex.value >= 0) {
        selectOption(filteredOptions.value[highlightedIndex.value])
      }
      break
    case 'Escape':
      close()
      break
    case 'Tab':
      close()
      break
    default:
      if (props.searchable && event.key.length === 1) {
        searchQuery.value += event.key.toLowerCase()
        highlightedIndex.value = 0
      }
  }
}

const handleInputKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Backspace' && searchQuery.value) {
    searchQuery.value = searchQuery.value.slice(0, -1)
    highlightedIndex.value = 0
  }
}

const scrollToHighlighted = () => {
  const optionEl = optionsRef.value?.querySelector(`[data-index="${highlightedIndex.value}"]`)
  if (optionEl) {
    optionEl.scrollIntoView({ block: 'nearest' })
  }
}

const selectOption = (option: typeof props.options[0]) => {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
  close()
}

const handleClickOutside = (event: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    close()
  }
}

const open = () => {
  if (!props.disabled) openDropdown()
}

const close = () => {
  open.value = false
  searchQuery.value = ''
  highlightedIndex.value = -1
  emit('blur')
}

const toggle = () => {
  if (open.value) close()
  else openDropdown()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!open.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      openDropdown()
    }
    return
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredOptions.value.length - 1)
      scrollToHighlighted()
      break
    case 'ArrowUp':
      event.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
      scrollToHighlighted()
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (highlightedIndex.value >= 0) {
        selectOption(filteredOptions.value[highlightedIndex.value])
      }
      break
    case 'Escape':
      close()
      break
    case 'Tab':
      close()
      break
    default:
      if (props.searchable && event.key.length === 1) {
        searchQuery.value += event.key.toLowerCase()
        highlightedIndex.value = 0
      }
  }
}

const handleInputKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Backspace' && searchQuery.value) {
    searchQuery.value = searchQuery.value.slice(0, -1)
    highlightedIndex.value = 0
  }
}

const scrollToHighlighted = () => {
  const optionEl = optionsRef.value?.querySelector(`[data-index="${highlightedIndex.value}"]`)
  if (optionEl) {
    optionEl.scrollIntoView({ block: 'nearest' })
  }
}

const selectOption = (option: typeof props.options[0]) => {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
  close()
}

const handleClickOutside = (event: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    close()
  }
}

const open = () => {
  if (!props.disabled) openDropdown()
}

const close = () => {
  open.value = false
  searchQuery.value = ''
  highlightedIndex.value = -1
  emit('blur')
}

const toggle = () => {
  if (open.value) close()
  else openDropdown()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!open.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      openDropdown()
    }
    return
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredOptions.value.length - 1)
      scrollToHighlighted()
      break
    case 'ArrowUp':
      event.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
      scrollToHighlighted()
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (highlightedIndex.value >= 0) {
        selectOption(filteredOptions.value[highlightedIndex.value])
      }
      break
    case 'Escape':
      close()
      break
    case 'Tab':
      close()
      break
    default:
      if (props.searchable && event.key.length === 1) {
        searchQuery.value += event.key.toLowerCase()
        highlightedIndex.value = 0
      }
  }
}

const handleInputKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Backspace' && searchQuery.value) {
    searchQuery.value = searchQuery.value.slice(0, -1)
    highlightedIndex.value = 0
  }
}

const scrollToHighlighted = () => {
  const optionEl = optionsRef.value?.querySelector(`[data-index="${highlightedIndex.value}"]`)
  if (optionEl) {
    optionEl.scrollIntoView({ block: 'nearest' })
  }
}

const selectOption = (option: typeof props.options[0]) => {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
  close()
}

const handleClickOutside = (event: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    close()
  }
}

const open = () => {
  if (!props.disabled) openDropdown()
}

const close = () => {
  open.value = false
  searchQuery.value = ''
  highlightedIndex.value = -1
  emit('blur')
}

const toggle = () => {
  if (open.value) close()
  else openDropdown()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!open.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      openDropdown()
    }
    return
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredOptions.value.length - 1)
      scrollToHighlighted()
      break
    case 'ArrowUp':
      event.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
      scrollToHighlighted()
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (highlightedIndex.value >= 0) {
        selectOption(filteredOptions.value[highlightedIndex.value])
      }
      break
    case 'Escape':
      close()
      break
    case 'Tab':
      close()
      break
    default:
      if (props.searchable && event.key.length === 1) {
        searchQuery.value += event.key.toLowerCase()
        highlightedIndex.value = 0
      }
  }
}

const handleInputKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Backspace' && searchQuery.value) {
    searchQuery.value = searchQuery.value.slice(0, -1)
    highlightedIndex.value = 0
  }
}

const scrollToHighlighted = () => {
  const optionEl = optionsRef.value?.querySelector(`[data-index="${highlightedIndex.value}"]`)
  if (optionEl) {
    optionEl.scrollIntoView({ block: 'nearest' })
  }
}

const selectOption = (option: typeof props.options[0]) => {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
  close()
}

const handleClickOutside = (event: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    close()
  }
}
</script>

<template>
  <div
    ref="selectRef"
    class="select-wrapper"
    :class="[
      'select-wrapper--' + size,
      { 'select-open': open, 'select-focused': focused, 'select-error': error, 'select-disabled': disabled }
    ]"
    @click="toggle"
  >
    <label v-if="label" :for="inputId" class="select-label">{{ label }}</label>

    <div class="select-trigger" :aria-expanded="open" :aria-haspopup="listbox" :aria-labelledby="label ? undefined : inputId" tabindex="0" @keydown.space.prevent @keydown.enter.prevent>
      <span class="select-value">
        <span v-if="selectedOption" class="select-selected-text">
          <span v-if="selectedOption.icon" class="select-icon" v-html="selectedOption.icon" />
          {{ selectedOption.label }}
        </span>
        <span v-else class="select-placeholder">{{ placeholder }}</span>
      </span>

      <span v-if="clearable && modelValue != null && !disabled" class="select-clear" @click.stop="emit('update:modelValue', null); emit('change', null)" aria-label="Clear selection">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </span>

      <svg class="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" aria-hidden="true">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>

    <div v-if="open" class="select-dropdown" role="listbox" aria-label="Options" ref="optionsRef">
      <div v-if="searchable" class="select-search">
        <input
          ref="inputRef"
          type="text"
          :placeholder="placeholder"
          v-model="searchQuery"
          class="select-search-input"
          @keydown="handleInputKeydown"
          @click.stop
          @focus.stop="focused = true"
          aria-autocomplete="list"
          aria-controls="select-options"
          autocomplete="off"
          spellcheck="false"
        />
      </div>

      <div id="select-options" class="select-options" role="listbox">
        <div
          v-for="(option, index) in filteredOptions"
          :key="option.value"
          :data-index="index"
          class="select-option"
          :class="{
            'select-option--selected': option.value === modelValue,
            'select-option--highlighted': index === highlightedIndex,
            'select-option--disabled': option.disabled,
          }"
          role="option"
          :aria-selected="option.value === modelValue"
          :aria-disabled="option.disabled"
          @click.stop="selectOption(option)"
          @mousemove="highlightedIndex = index"
        >
          <span v-if="option.icon" class="select-option-icon" v-html="option.icon" />
          <div class="select-option-content">
            <span class="select-option-label">{{ option.label }}</span>
            <span v-if="option.description" class="select-option-description">{{ option.description }}</span>
          </div>
          <svg v-if="option.value === modelValue" class="select-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <div v-if="filteredOptions.length === 0" class="select-empty">
          No options match your search
        </div>
      </div>
    </div>
  </div>

  <span v-if="description" class="select-description">{{ description }}</span>
  <span v-if="error" class="select-error-message" role="alert">{{ error }}</span>
</template>

<style scoped>
.select-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  width: 100%;
  position: relative;
  z-index: var(--z-dropdown);
}

.select-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--fg-primary);
}

.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  background-color: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-input);
  padding: 0 var(--space-3);
  color: var(--fg-primary);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  cursor: pointer;
  transition: var(--transition-colors);
  min-height: 40px;
}

.select-trigger:hover:not(.select-disabled):not(.select-open) {
  border-color: var(--border-secondary);
}

.select-focused .select-trigger,
.select-open .select-trigger {
  border-color: var(--border-focus);
  box-shadow: var(--focus-ring);
}

.select-error .select-trigger {
  border-color: var(--border-error);
}

.select-error.select-focused .select-trigger {
  box-shadow: 0 0 0 2px var(--color-error-100);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    .select-error.select-focused .select-trigger {
      box-shadow: 0 0 0 2px var(--color-error-900);
    }
  }
}

.select-disabled .select-trigger {
  background-color: var(--bg-tertiary);
  opacity: 0.6;
  cursor: not-allowed;
}

.select-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.select-placeholder {
  color: var(--fg-muted);
}

.select-selected-text {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--fg-tertiary);
  flex-shrink: 0;
}

.select-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  background: transparent;
  border: none;
  color: var(--fg-tertiary);
  cursor: pointer;
  flex-shrink: 0;
  transition: var(--transition-colors);
}

.select-clear:hover {
  background: var(--bg-secondary);
  color: var(--fg-secondary);
}

.select-chevron {
  color: var(--fg-tertiary);
  flex-shrink: 0;
  transition: transform var(--duration-fast) var(--ease-out);
}

.select-open .select-chevron {
  transform: rotate(180deg);
}

.select-dropdown {
  position: absolute;
  top: calc(100% + var(--space-1));
  left: 0;
  right: 0;
  background-color: var(--bg-elevated);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-dropdown);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  max-height: 320px;
  display: flex;
  flex-direction: column;
  animation: dropdown-enter var(--duration-fast) var(--ease-out);
}

@keyframes dropdown-enter {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.select-search {
  padding: var(--space-2);
  border-bottom: 1px solid var(--border-primary);
}

.select-search-input {
  width: 100%;
  height: 32px;
  padding: 0 var(--space-3);
  background-color: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-input);
  color: var(--fg-primary);
  font-size: var(--text-sm);
  outline: none;
  transition: var(--transition-colors);
}

.select-search-input:focus {
  border-color: var(--border-focus);
  box-shadow: var(--focus-ring);
}

.select-search-input::placeholder {
  color: var(--fg-muted);
}

.select-options {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-1);
}

.select-option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition-colors);
}

.select-option:hover:not(.select-option--disabled) {
  background: var(--bg-hover);
}

.select-option--highlighted {
  background: var(--bg-hover);
}

.select-option--selected {
  background: var(--accent-muted);
  color: var(--interactive-primary);
}

.select-option--selected:hover {
  background: var(--color-brand-100);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    .select-option--selected:hover {
      background: var(--color-brand-900);
    }
  }
}

.select-option--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.select-option-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--fg-tertiary);
  flex-shrink: 0.
}

.select-option-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px.
}

.select-option-label {
  font-size: var(--text-sm).
  font-weight: var(--font-normal).
  color: var(--fg-primary).
  white-space: nowrap.
  overflow: hidden.
  text-overflow: ellipsis.
}

.select-option-description {
  font-size: var(--text-xs).
  color: var(--fg-tertiary).
  white-space: nowrap.
  overflow: hidden.
  text-overflow: ellipsis.
}

.select-option-check {
  display: flex.
  align-items: center.
  justify-content: center.
  flex-shrink: 0.
  color: var(--interactive-primary).
}

.select-empty {
  padding: var(--space-6).
  text-align: center.
  color: var(--fg-tertiary).
  font-size: var(--text-sm).
}

/* Sizes */
.select-wrapper--sm .select-trigger { height: 32px; font-size: var(--text-xs); padding: 0 var(--space-2); }
.select-wrapper--md .select-trigger { height: 40px; font-size: var(--text-sm); padding: 0 var(--space-3); }
.select-wrapper--lg .select-trigger { height: 48px; font-size: var(--text-base); padding: 0 var(--space-4); }
</style>