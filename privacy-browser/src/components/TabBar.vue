<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Tab } from '../types';

interface Props {
  tabs: Tab[];
  activeTabId: string | undefined;
}

interface Emits {
  'new-tab': [url?: string];
  'close-tab': [tabId: string];
  'activate-tab': [tabId: string];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const hoverCloseTabId = ref<string | null>(null);
const dragTabId = ref<string | null>(null);
const dragOverTabId = ref<string | null>(null);

const handleClose = (tabId: string, e: MouseEvent) => {
  e.stopPropagation();
  emit('close-tab', tabId);
};

const handleActivate = (tabId: string) => {
  emit('activate-tab', tabId);
};

const handleNewTabClick = () => {
  emit('new-tab');
};

const handleDragStart = (e: DragEvent, tabId: string) => {
  dragTabId.value = tabId;
  e.dataTransfer?.setData('text/plain', tabId);
  e.dataTransfer!.effectAllowed = 'move';
};

const handleDragOver = (e: DragEvent, tabId: string) => {
  e.preventDefault();
  e.dataTransfer!.dropEffect = 'move';
  if (tabId !== dragTabId.value) {
    dragOverTabId.value = tabId;
  }
};

const handleDragLeave = () => {
  dragOverTabId.value = null;
};

const handleDrop = (e: DragEvent, targetTabId: string) => {
  e.preventDefault();
  const sourceTabId = dragTabId.value;
  dragTabId.value = null;
  dragOverTabId.value = null;

  if (sourceTabId && sourceTabId !== targetTabId) {
    // Reorder would be handled by parent
  }
};

const handleDragEnd = () => {
  dragTabId.value = null;
  dragOverTabId.value = null;
};

const getFavicon = (tab: Tab) => {
  if (tab.favicon) return tab.favicon;
  try {
    const url = new URL(tab.url);
    return `https://www.google.com/s2/favicons?sz=32&domain=${url.hostname}`;
  } catch {
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌐</text></svg>';
  }
};

const getTitle = (tab: Tab) => {
  if (tab.title) return tab.title;
  try {
    const url = new URL(tab.url);
    return url.hostname;
  } catch {
    return 'New Tab';
  }
};

const truncatedTitle = (tab: Tab) => {
  const title = getTitle(tab);
  const maxLen = tab.pinned ? 0 : (tab.isPrivate ? 20 : 25);
  return maxLen > 0 && title.length > maxLen ? title.slice(0, maxLen - 1) + '…' : title;
};
</script>

<template>
  <div class="tab-bar" role="tablist">
    <div class="tab-strip" ref="tabStrip">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="tab"
        :class="{
          'tab-active': tab.id === activeTabId,
          'tab-loading': tab.loading,
          'tab-pinned': tab.pinned,
          'tab-muted': tab.muted,
          'tab-private': tab.isPrivate,
          'tab-drag-over': dragOverTabId === tab.id,
          'tab-dragging': dragTabId === tab.id,
        }"
        :draggable="!tab.pinned"
        @dragstart="(e) => handleDragStart(e, tab.id)"
        @dragover="(e) => handleDragOver(e, tab.id)"
        @dragleave="handleDragLeave"
        @drop="(e) => handleDrop(e, tab.id)"
        @dragend="handleDragEnd"
        @click="handleActivate(tab.id)"
        @mousedown.middle="(e) => handleClose(tab.id, e)"
        @contextmenu="(e) => e.preventDefault()"
        role="tab"
        :aria-selected="tab.id === activeTabId"
        :aria-label="getTitle(tab)"
      >
        <div class="tab-favicon">
          <img
            :src="getFavicon(tab)"
            :alt="''"
            width="16"
            height="16"
            @error="(e) => { e.target.style.display = 'none'; }"
          />
          <span v-if="tab.loading" class="tab-loading-indicator"></span>
        </div>

        <span v-if="!tab.pinned" class="tab-title">{{ truncatedTitle(tab) }}</span>

        <div class="tab-indicators">
          <span v-if="tab.pinned" class="tab-indicator" title="Pinned">📌</span>
          <span v-if="tab.muted" class="tab-indicator" title="Muted">🔇</span>
          <span v-if="tab.isPrivate" class="tab-indicator tab-indicator-private" title="Private">🕵️</span>
        </div>

        <button
          v-if="hoverCloseTabId === tab.id || tab.id === activeTabId"
          class="tab-close"
          @click="handleClose(tab.id, $event)"
          :aria-label="'Close ' + getTitle(tab)"
          title="Close tab"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <button class="new-tab-btn" @click="handleNewTabClick" aria-label="New tab (Ctrl+T)" title="New tab">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>

    <div class="tab-bar-spacer"></div>
  </div>
</template>

<style scoped>
@import '../styles/design-tokens.css';

.tab-bar {
  display: flex;
  align-items: center;
  height: var(--space-tabbar-height);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  user-select: none;
  position: relative;
  z-index: var(--z-tabbar);
}

.tab-strip {
  display: flex;
  align-items: stretch;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border-primary) transparent;
}

.tab-strip::-webkit-scrollbar {
  height: 4px;
}

.tab-strip::-webkit-scrollbar-track {
  background: transparent;
}

.tab-strip::-webkit-scrollbar-thumb {
  background: var(--border-primary);
  border-radius: var(--radius-full);
}

.tab {
  display: flex;
  align-items: center;
  height: 100%;
  min-width: var(--tab-min-width);
  max-width: var(--tab-max-width);
  padding: 0 var(--space-tab-padding-x) 0 var(--space-tab-padding-y);
  gap: var(--space-2);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--fg-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: var(--transition-colors), background-color var(--transition-fast);
  white-space: nowrap;
  position: relative;
}

.tab:hover:not(.tab-active) {
  background: var(--bg-tertiary);
  color: var(--fg-primary);
}

.tab-active {
  color: var(--fg-primary);
  border-bottom-color: var(--color-brand-500);
  background: var(--bg-primary);
}

.tab-pinned {
  min-width: var(--tab-pinned-width);
  max-width: var(--tab-pinned-width);
  padding: 0 var(--space-2);
}

.tab-pinned .tab-title,
.tab-pinned .tab-close {
  display: none;
}

.tab-private {
  border-bottom-color: var(--color-accent-500);
}

.tab-private.tab-active {
  border-bottom-color: var(--color-accent-500);
}

.tab .tab-favicon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--tab-favicon-size);
  height: var(--tab-favicon-size);
  flex-shrink: 0;
  position: relative;
}

.tab .tab-favicon img {
  border-radius: var(--radius-xs);
}

.tab-loading-indicator {
  position: absolute;
  inset: 0;
  border: 2px solid var(--color-brand-500);
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin var(--duration-slow) linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.tab-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-indicators {
  display: flex;
  gap: var(--space-1);
  flex-shrink: 0;
}

.tab-indicator {
  font-size: 10px;
}

.tab-indicator-private {
  color: var(--color-accent-500);
}

.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--tab-close-size);
  height: var(--tab-close-size);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--fg-secondary);
  cursor: pointer;
  opacity: 0;
  transition: var(--transition-colors), opacity var(--transition-fast), background-color var(--transition-fast);
  flex-shrink: 0;
}

.tab:hover .tab-close,
.tab-active .tab-close {
  opacity: 1;
}

.tab-close:hover {
  background: var(--color-brand-500);
  color: white;
}

.new-tab-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 100%;
  min-width: 36px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--fg-secondary);
  cursor: pointer;
  transition: var(--transition-colors), border-color var(--transition-fast);
  flex-shrink: 0;
}

.new-tab-btn:hover {
  background: var(--bg-tertiary);
  color: var(--fg-primary);
  border-bottom-color: var(--color-brand-500);
}

.tab-bar-spacer {
  width: 120px;
  flex-shrink: 0;
}

.tab-drag-over {
  box-shadow: inset 0 0 0 2px var(--color-brand-500);
}

.tab-dragging {
  opacity: 0.5;
}
</style>