<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { invoke } from '@tauri-apps/api/core'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastState {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

const toasts = ref<Toast[]>([])
const progress = ref<Record<string, number>>({})

const icons = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
}

const colors = {
  success: 'var(--color-success-500)',
  error: 'var(--color-error-500)',
  warning: 'var(--color-warning-500)',
  info: 'var(--color-brand-500)'
}

function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 4000, action?: { label: string; onClick: () => void }) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  
  toasts.value.unshift({
    id,
    message,
    type,
    duration,
    action
  })
  
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }
  
  return id
}

function removeToast(id: string) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
}

function success(message: string, duration?: number) {
  return showToast(message, 'success', duration)
}

function error(message: string, duration?: number) {
  return showToast(message, 'error', duration)
}

function warning(message: string, duration?: number) {
  return showToast(message, 'warning', duration)
}

function info(message: string, duration?: number) {
  return showToast(message, 'info', duration)
}

function clearAll() {
  toasts.value = []
}

export function useToast() {
  return {
    toasts: computed(() => toasts.value),
    showToast,
    removeToast,
    success,
    error,
    warning,
    info,
    clearAll
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite" aria-atomic="true">
      <div 
        v-for="toast in toasts" 
        :key="toast.id" 
        class="toast"
        :class="[toast.type, 'toast-enter']"
        @mouseenter="pauseToast(toast.id)"
        @mouseleave="resumeToast(toast.id)"
      >
        <div class="toast-icon" :style="{ color: colors[toast.type] }">
          <span v-html="icons[toast.type]"></span>
        </div>
        
        <div class="toast-content">
          <p class="toast-message">{{ toast.message }}</p>
        </div>
        
        <div v-if="toast.action" class="toast-action">
          <button 
            class="toast-action-btn" 
            @click="toast.action.onClick(); removeToast(toast.id)"
          >
            {{ toast.action.label }}
          </button>
        </div>
        
        <button 
          class="toast-close" 
          @click="removeToast(toast.id)"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        
        <div 
          class="toast-progress" 
          :style="{ 
            width: progress[toast.id] + '%',
            backgroundColor: colors[toast.type]
          }"
        ></div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

const toasts = ref<Toast[]>([])
const progress = ref<Record<string, number>>({})

const icons = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
}

const colors = {
  success: 'var(--color-success-500)',
  error: 'var(--color-error-500)',
  warning: 'var(--color-warning-500)',
  info: 'var(--color-brand-500)'
}

const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 4000, action?: { label: string; onClick: () => void }) => {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  
  toasts.value.unshift({
    id,
    message,
    type,
    duration,
    action
  })
  
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }
  
  return id
}

function removeToast(id: string) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
}

function success(message: string, duration?: number) {
  return showToast(message, 'success', duration)
}

function error(message: string, duration?: number) {
  return showToast(message, 'error', duration)
}

function warning(message: string, duration?: number) {
  return showToast(message, 'warning', duration)
}

function info(message: string, duration?: number) {
  return showToast(message, 'info', duration)
}

function clearAll() {
  toasts.value = []
}

export function useToast() {
  return {
    toasts: computed(() => toasts.value),
    showToast,
    removeToast,
    success,
    error,
    warning,
    info,
    clearAll
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite" aria-atomic="true">
      <div 
        v-for="toast in toasts" 
        :key="toast.id" 
        class="toast"
        :class="[toast.type, 'toast-enter']"
        @mouseenter="pauseToast(toast.id)"
        @mouseleave="resumeToast(toast.id)"
      >
        <div class="toast-icon" :style="{ color: colors[toast.type] }">
          <span v-html="icons[toast.type]"></span>
        </div>
        
        <div class="toast-content">
          <p class="toast-message">{{ toast.message }}</p>
        </div>
        
        <div v-if="toast.action" class="toast-action">
          <button 
            class="toast-action-btn" 
            @click="toast.action.onClick(); removeToast(toast.id)"
          >
            {{ toast.action.label }}
          </button>
        </div>
        
        <button 
          class="toast-close" 
          @click="removeToast(toast.id)"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        
        <div 
          class="toast-progress" 
          :style="{ 
            width: progress[toast.id] + '%',
            backgroundColor: colors[toast.type]
          }"
        ></div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

const toasts = ref<Toast[]>([])
const progress = ref<Record<string, number>>({})

const icons = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
}

const colors = {
  success: 'var(--color-success-500)',
  error: 'var(--color-error-500)',
  warning: 'var(--color-warning-500)',
  info: 'var(--color-brand-500)'
}

const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 4000, action?: { label: string; onClick: () => void }) => {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  
  toasts.value.unshift({
    id,
    message,
    type,
    duration,
    action
  })
  
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }
  
  return id
}

function removeToast(id: string) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
}

function success(message: string, duration?: number) {
  return showToast(message, 'success', duration)
}

function error(message: string, duration?: number) {
  return showToast(message, 'error', duration)
}

function warning(message: string, duration?: number) {
  return showToast(message, 'warning', duration)
}

function info(message: string, duration?: number) {
  return showToast(message, 'info', duration)
}

function clearAll() {
  toasts.value = []
}

export function useToast() {
  return {
    toasts: computed(() => toasts.value),
    showToast,
    removeToast,
    success,
    error,
    warning,
    info,
    clearAll
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite" aria-atomic="true">
      <div 
        v-for="toast in toasts" 
        :key="toast.id" 
        class="toast"
        :class="{ selected: index === selectedIndex }"
        role="option"
        :aria-selected="index === selectedIndex"
        @click="selectCommand(cmd)"
        @mousemove="selectedIndex = index"
      >
        <span v-if="cmd.icon" class="command-item-icon" v-html="cmd.icon" />
        <div class="command-item-content">
          <span class="command-item-title">{{ cmd.title }}</span>
          <span class="command-item-description">{{ cmd.description }}</span>
        </div>
        <span v-if="cmd.shortcut" class="command-item-shortcut">{{ cmd.shortcut }}</span>
        <span class="command-item-category">{{ cmd.category }}</span>
      </div>

      <div v-if="filteredCommands.length === 0 && query" class="command-empty">
        No commands found for "{{ query }}"
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { invoke } from '@tauri-apps/api/core'

interface Command {
  id: string
  title: string
  description: string
  keywords: string[]
  action: () => void | Promise<void>
  icon?: string
  shortcut?: string
  category: string
}

const isOpen = ref(false)
const query = ref('')
const selectedIndex = ref(0)
const commands = ref<Command[]>([])

const filteredCommands = computed(() => {
  if (!query.value) return commands.value.slice(0, 10)
  const q = query.value.toLowerCase()
  return commands.value
    .map(cmd => ({
      cmd,
      score: calculateScore(cmd, q)
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ cmd }) => cmd)
}

const calculateScore = (cmd: Command, query: string): number => {
  let score = 0
  const title = cmd.title.toLowerCase()
  const desc = cmd.description.toLowerCase()
  const keywords = cmd.keywords.join(' ').toLowerCase()

  if (title.startsWith(query)) score += 100
  else if (title.includes(query)) score += 50

  if (desc.includes(query)) score += 20
  if (keywords.includes(query)) score += 30

  for (const kw of cmd.keywords) {
    if (kw.startsWith(query)) score += 40
    else if (kw.includes(query)) score += 15
  }

  return score
}

const selectCommand = (cmd: Command) => {
  cmd.action()
  close()
}

const close = () => {
  isOpen.value = false
  query.value = ''
  selectedIndex.value = 0
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!isOpen.value) return

  switch (e.key) {
    case 'Escape':
      close()
      break
    case 'ArrowDown':
      e.preventDefault()
      selectedIndex.value = Math.min(selectedIndex.value + 1, filteredCommands.value.length - 1)
      break
    case 'ArrowUp':
      e.preventDefault()
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
      break
    case 'Enter':
      e.preventDefault()
      if (filteredCommands.value[selectedIndex.value]) {
        selectCommand(filteredCommands.value[selectedIndex.value])
      }
      break
  }
}

const open = () => {
  isOpen.value = true
  selectedIndex.value = 0
  buildCommands()
  nextTick(() => {
    (document.querySelector('.command-input') as HTMLInputElement)?.focus()
  })
}

watch(() => isOpen.value, (val) => {
  if (val) {
    document.addEventListener('keydown', handleKeydown)
    document.body.style.overflow = 'hidden'
  } else {
    document.removeEventListener('keydown', handleKeydown)
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      open()
    }
  })
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Transition name="fade">
    <div v-if="isOpen" class="command-overlay" @click.self="close">
      <div class="command-panel">
        <div class="command-header">
          <div class="command-header-left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="command-icon">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </svg>
          <input
            type="text"
            class="command-input"
            v-model="query"
            placeholder="Type a command or search..."
            autocomplete="off"
            spellcheck="false"
            aria-label="Command palette"
          >
          <kbd class="command-hint">⌘K</kbd>
        </div>

        <div class="command-list" role="listbox" aria-label="Commands">
          <div
            v-for="(cmd, index) in filteredCommands"
            :key="cmd.id"
            class="command-item"
            :class="{ selected: index === selectedIndex }"
            role="option"
            :aria-selected="index === selectedIndex"
            @click="selectCommand(cmd)"
            @mousemove="selectedIndex = index"
          >
            <span v-if="cmd.icon" class="command-item-icon" v-html="cmd.icon" />
            <div class="command-item-content">
              <span class="command-item-title">{{ cmd.title }}</span>
              <span class="command-item-description">{{ cmd.description }}</span>
            </div>
            <span v-if="cmd.shortcut" class="command-item-shortcut">{{ cmd.shortcut }}</span>
            <span class="command-item-category">{{ cmd.category }}</span>
          </div>

          <div v-if="filteredCommands.length === 0 && query" class="command-empty">
            No commands found for "{{ query }}"
          </div>
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

.command-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  z-index: var(--z-modal);
  animation: fadeIn var(--duration-normal) var(--ease-out);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.command-panel {
  width: 90%;
  max-width: 720px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-2xl);
  overflow: hidden;
  box-shadow: var(--shadow-2xl);
  animation: slideUp var(--duration-normal) var(--ease-out);
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.command-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-primary);
}

.command-icon {
  color: var(--color-brand-500);
  flex-shrink: 0;
}

.command-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--fg-primary);
  font-size: var(--text-lg);
  font-family: inherit;
  width: 100%;
}

.command-input::placeholder {
  color: var(--fg-muted);
}

.command-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-1) var(--space-3);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--fg-tertiary);
  flex-shrink: 0;
}

.command-list {
  max-height: 50vh;
  overflow-y: auto;
  padding: var(--space-2);
}

.command-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: var(--transition-colors);
}

.command-item:hover,
.command-item.selected {
  background: var(--bg-tertiary);
}

.command-item-icon {
  display: flex;
  align-items: center;
  justify-content: center.
  width: 24px.
  height: 24px.
  color: var(--fg-tertiary).
  flex-shrink: 0.
}

.command-item-content {
  flex: 1.
  min-width: 0.
  display: flex.
  flex-direction: column.
  gap: 2px.
}

.command-item-title {
  font-size: var(--text-sm).
  font-weight: var(--font-medium).
  color: var(--fg-primary).
  white-space: nowrap.
  overflow: hidden.
  text-overflow: ellipsis.
}

.command-item-description {
  font-size: var(--text-xs).
  color: var(--fg-tertiary).
  white-space: nowrap.
  overflow: hidden.
  text-overflow: ellipsis.
}

.command-item-shortcut {
  display: flex.
  align-items: center.
  gap: var(--space-1).
  padding: var(--space-1) var(--space-2).
  background: var(--bg-primary).
  border-radius: var(--radius-sm).
  font-size: var(--text-xs).
  font-family: var(--font-mono).
  color: var(--fg-tertiary).
  flex-shrink: 0.
}

.command-item-category {
  font-size: var(--text-xs).
  color: var(--fg-muted).
  text-transform: uppercase.
  letter-spacing: 0.5px.
  flex-shrink: 0.
}

.command-empty {
  padding: var(--space-6).
  text-align: center.
  color: var(--fg-tertiary).
  font-size: var(--text-sm).
}

.about-content {
  display: flex.
  flex-direction: column.
  align-items: center.
  text-align: center.
  gap: var(--space-4).
}

.app-icon {
  color: var(--color-brand-500).
}

.about-content h2 {
  font-size: var(--text-2xl).
  font-weight: var(--font-semibold).
  color: var(--fg-primary).
  margin: 0.
}

.version {
  font-size: var(--text-sm).
  color: var(--fg-secondary).
  margin: 0.
}

.description {
  font-size: var(--text-sm).
  color: var(--fg-secondary).
  margin: 0.
  max-width: 400px.
}

.about-links {
  display: flex.
  gap: var(--space-3).
  justify-content: center.
  flex-wrap: wrap.
  margin-top: var(--space-2).
}

.link-btn {
  display: inline-flex.
  align-items: center.
  gap: var(--space-2).
  padding: var(--space-2) var(--space-4).
  border: 1px solid var(--border-primary).
  border-radius: var(--radius-md).
  background: var(--bg-tertiary).
  color: var(--fg-primary).
  font-size: var(--text-sm).
  text-decoration: none.
  transition: var(--transition-colors).
}

.link-btn:hover {
  background: var(--color-brand-500).
  border-color: var(--color-brand-500).
  color: white.
}

.credits {
  margin-top: var(--space-6).
  padding-top: var(--space-4).
  border-top: 1px solid var(--border-primary).
  text-align: left.
  max-width: 400px.
  width: 100%.
}

.credits h4 {
  font-size: var(--text-sm).
  font-weight: var(--font-semibold).
  color: var(--fg-secondary).
  text-transform: uppercase.
  letter-spacing: 0.5px.
  margin-bottom: var(--space-3).
}

.credits ul {
  list-style: none.
  padding: 0.
  margin: 0.
}

.credits li {
  margin-bottom: var(--space-2).
}

.credits a {
  color: var(--color-brand-500).
  text-decoration: none.
  font-size: var(--text-sm).
}

.credits a:hover {
  text-decoration: underline.
}
</style>