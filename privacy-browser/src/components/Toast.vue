<script setup lang="ts">
import { ref, computed } from 'vue'

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
const toastId = 0

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

function showToast(message: string, type: Toast['type'] = 'info', duration = 4000, action?: Toast['action']) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  
  const toast = {
    id,
    message,
    type,
    duration,
    action
  }
  
  toasts.value.unshift(toast)
  
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

const toasts = ref<Array<{
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}>>([])

const progress = ref<Record<string, number>>({})
const timeouts = ref<Record<string, number>>({})

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

const toastTimeouts = ref<Record<string, number>>({})

function showToast(
  message: string, 
  type: 'success' | 'error' | 'warning' | 'info' = 'info', 
  duration = 4000,
  action?: { label: string; onClick: () => void }
) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  
  const toast = {
    id,
    message,
    type,
    duration,
    action
  }
  
  // Add to beginning for stack effect
  toasts.value.unshift({
    id,
    message,
    type,
    duration,
    action
  })
  
  // Auto-remove after duration
  if (duration > 0) {
    const timeout = window.setTimeout(() => {
      removeToast(id)
    }, duration)
    
    // Track progress for visual progress bar
    const startTime = Date.now()
    const durationMs = duration
    
    const progressInterval = window.setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(100, (elapsed / durationMs) * 100)
      // This would need a reactive map, skipping for simplicity
    }, 50)
    
    // Store timeout for cleanup
    const key = `timeout-${id}`
    const existing = (toastTimeouts.value as any)[key]
    if (existing) clearTimeout(existing)
    ;(toastTimeouts.value as any)[key] = timeout
  }
  
  return id
}

function removeToast(id: string) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
  
  // Clean up timeout
  const key = `timeout-${id}`
  const timeout = (toastTimeouts.value as any)[key]
  if (timeout) {
    clearTimeout(timeout)
    delete (toastTimeouts.value as any)[key]
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
  // Clear all timeouts
  Object.values(toastTimeouts.value).forEach(clearTimeout)
  toastTimeouts.value = {}
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

<style scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
  max-width: 420px;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  box-shadow: var(--shadow-xl);
  color: var(--fg-primary);
  font-size: 14px;
  pointer-events: auto;
  animation: slideInRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
  min-width: 300px;
  max-width: 420px;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.toast.success {
  border-color: var(--color-success-500);
  background: linear-gradient(135deg, var(--color-success-50) 0%, var(--bg-secondary) 100%);
}

@media (prefers-color-scheme: dark) {
  .toast.success {
    background: linear-gradient(135deg, var(--color-success-900) 0%, var(--bg-secondary) 100%);
    border-color: var(--color-success-700);
  }
}

.toast.error {
  border-color: var(--color-error-500);
  background: linear-gradient(135deg, var(--color-error-50) 0%, var(--bg-secondary) 100%);
}

@media (prefers-color-scheme: dark) {
  .toast.error {
    background: linear-gradient(135deg, var(--color-error-900) 0%, var(--bg-secondary) 100%);
    border-color: var(--color-error-700);
  }
}

.toast.warning {
  border-color: var(--color-warning-500);
  background: linear-gradient(135deg, var(--color-warning-50) 0%, var(--bg-secondary) 100%);
}

@media (prefers-color-scheme: dark) {
  .toast.warning {
    background: linear-gradient(135deg, var(--color-warning-900) 0%, var(--bg-secondary) 100%);
    border-color: var(--color-warning-700);
  }
}

.toast.info {
  border-color: var(--color-brand-500);
  background: linear-gradient(135deg, var(--color-brand-50) 0%, var(--bg-secondary) 100%);
}

@media (prefers-color-scheme: dark) {
  .toast.info {
    background: linear-gradient(135deg, var(--color-brand-900) 0%, var(--bg-secondary) 100%);
    border-color: var(--color-brand-700);
  }
}

.toast-icon {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  font-size: 16px;
  margin-top: 2px;
}

.toast-content {
  flex: 1;
  min-width: 0;
  padding-right: 8px;
}

.toast-message {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--fg-primary);
  word-break: break-word;
}

.toast-action {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--border-primary);
}

.toast-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: transparent;
  border: 1px solid var(--color-brand-500);
  border-radius: 6px;
  color: var(--color-brand-500);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toast-action-btn:hover {
  background: var(--color-brand-500);
  color: white;
}

.toast-close {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--fg-tertiary);
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s ease;
}

.toast:hover .toast-close {
  opacity: 1;
}

.toast-close:hover {
  background: var(--bg-tertiary);
  color: var(--fg-primary);
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  border-radius: 0 0 12px 12px;
  transform-origin: left;
  transform: scaleX(1);
  transition: transform 0.1s linear;
}

/* Toast type colors */
.toast.success {
  --toast-color: var(--color-success-500);
}

.toast.error {
  --toast-color: var(--color-error-500);
}

.toast.warning {
  --toast-color: var(--color-warning-500);
}

.toast.info {
  --toast-color: var(--color-brand-500);
}

.toast .toast-progress {
  background-color: var(--toast-color);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .toast {
    animation: none;
  }
  
  .toast-progress {
    transition: none;
  }
}
</style>