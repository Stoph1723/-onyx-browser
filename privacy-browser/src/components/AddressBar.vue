<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';

interface Props {
  modelValue: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  secure: boolean;
}

interface Emits {
  'update:modelValue': [value: string];
  navigate: [url: string];
  'go-back': [];
  'go-forward': [];
  reload: [];
  focus: [];
  blur: [];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const focused = ref(false);
const showSuggestions = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

const handleInput = (e: Event) => {
  const value = (e.target as HTMLInputElement).value;
  emit('update:modelValue', value);
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    const url = normalizeUrl(props.modelValue);
    emit('navigate', url);
    focused.value = false;
    showSuggestions.value = false;
  } else if (e.key === 'Escape') {
    focused.value = false;
    showSuggestions.value = false;
    inputRef.value?.blur();
  }
};

const handleFocus = () => {
  focused.value = true;
  showSuggestions.value = true;
  inputRef.value?.select();
  emit('focus');
};

const handleBlur = () => {
  setTimeout(() => {
    focused.value = false;
    showSuggestions.value = false;
    emit('blur');
  }, 150);
};

const handleGoBack = () => emit('go-back');
const handleGoForward = () => emit('go-forward');
const handleReload = () => emit('reload');

const normalizeUrl = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return 'https://duckduckgo.com';

  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    if (trimmed.includes('.') && !trimmed.includes(' ')) {
      return `https://${trimmed}`;
    }
    return `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`;
  }
};

const handlePaste = async (e: ClipboardEvent) => {
  const text = e.clipboardData?.getData('text') || '';
  const url = normalizeUrl(text);
  emit('navigate', url);
  focused.value = false;
};
</script>

<template>
  <div class="address-bar" :class="{ focused, loading: props.loading }">
    <div class="nav-buttons">
      <button class="nav-btn" @click="handleGoBack" :disabled="!props.canGoBack" title="Back (Alt+Left)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      </button>
      <button class="nav-btn" @click="handleGoForward" :disabled="!props.canGoForward" title="Forward (Alt+Right)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
      <button class="nav-btn reload-btn" @click="handleReload" :class="{ spinning: props.loading }" title="Reload (Ctrl+R)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </button>
    </div>

    <div class="security-indicator" @click="handleFocus">
      <svg v-if="props.secure" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="secure">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        <line x1="12" y1="17" x2="12" y2="11" />
      </svg>
      <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="insecure">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </div>

    <input
      ref="inputRef"
      type="text"
      class="url-input"
      :value="props.modelValue"
      @input="handleInput"
      @keydown="handleKeydown"
      @focus="handleFocus"
      @blur="handleBlur"
      @paste="handlePaste"
      placeholder="Search or enter address"
      spellcheck="false"
      autocomplete="off"
      id="address-input"
    />

    <div v-if="props.loading" class="loading-progress"></div>

    <div v-if="focused && !props.loading" class="actions">
      <button class="action-btn" @click="handleReload" title="Stop">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
      </button>
      <button class="action-btn" @click="focused = false" title="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
@import '../styles/design-tokens.css';

.address-bar {
  display: flex;
  align-items: center;
  height: 36px;
  padding: 0 var(--space-2);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  gap: var(--space-2);
  transition: var(--transition-colors);
}

.address-bar.focused {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 2px var(--color-brand-200);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    .address-bar.focused {
      box-shadow: 0 0 0 2px var(--color-brand-800);
    }
  }
}

.nav-buttons {
  display: flex;
  gap: var(--space-1);
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--fg-secondary);
  cursor: pointer;
  transition: var(--transition-colors);
}

.nav-btn:hover:not(:disabled) {
  background: var(--bg-secondary);
  color: var(--fg-primary);
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.reload-btn.spinning svg {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.security-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: var(--fg-secondary);
  cursor: pointer;
}

.security-indicator .secure {
  color: var(--color-success-500);
}

.security-indicator .insecure {
  color: var(--color-error-500);
}

.url-input {
  flex: 1;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--fg-primary);
  font-size: var(--text-sm);
  font-family: inherit;
}

.url-input::placeholder {
  color: var(--fg-secondary);
}

.loading-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  width: 100%;
  background: linear-gradient(90deg, var(--color-brand-500), var(--color-brand-400));
  animation: progress 1s infinite;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

@keyframes progress {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.actions {
  display: flex;
  gap: var(--space-1);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--fg-secondary);
  cursor: pointer;
  transition: var(--transition-colors);
}

.action-btn:hover {
  background: var(--bg-secondary);
  color: var(--fg-primary);
}
</style>