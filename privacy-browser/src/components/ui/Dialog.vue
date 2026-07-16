<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  modelValue: boolean
  title?: string
  width?: string | number
  closable?: boolean
  closeOnOverlayClick?: boolean
  'onUpdate:modelValue'?: (value: boolean) => void
}

const props = withDefaults(defineProps<Props>(), {
  closable: true,
  closeOnOverlayClick: true,
  width: '500px',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const isOpen = ref(props.modelValue)

const handleClose = () => {
  if (props.closable) {
    emit('update:modelValue', false)
    emit('close')
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleClose()
  }
}

const handleOverlayClick = () => {
  if (props.closeOnOverlayClick) {
    handleClose()
  }
}

watch(() => props.modelValue, (val) => {
  isOpen.value = val
})

onMounted(() => {
  if (isOpen.value) {
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})

watch(isOpen, (val) => {
  if (val !== props.modelValue) {
    emit('update:modelValue', val)
  }
  if (val) {
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeydown)
  } else {
    document.body.style.overflow = ''
    document.removeEventListener('keydown', handleKeydown)
  }
})
</script>

<template>
  <Transition name="fade">
    <div v-if="modelValue" class="dialog-overlay" @click.self="handleOverlayClick">
      <div class="dialog-panel" :style="{ maxWidth: typeof width === 'number' ? width + 'px' : width }">
        <div class="dialog-header">
          <h2>{{ title }}</h2>
          <button v-if="closable" class="close-btn" @click="handleClose" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <div class="dialog-body">
          <slot />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--duration-normal) var(--ease-out);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal-backdrop);
  animation: fadeIn var(--duration-normal) var(--ease-out);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.dialog-panel {
  width: 90%;
  max-width: var(--width, 500px);
  max-height: 90vh;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-2xl);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp var(--duration-normal) var(--ease-out);
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-primary);
}

.dialog-header h2 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--fg-primary);
  margin: 0;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--fg-secondary);
  cursor: pointer;
  transition: var(--transition-colors);
}

.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--fg-primary);
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--border-primary);
}
</style>