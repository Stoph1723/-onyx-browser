import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useTabs } from '../composables/useTabs'
import { useAdBlock } from '../composables/useAdBlock'
import { usePrivacy } from '../composables/usePrivacy'
import TabBar from './TabBar.vue'
import AddressBar from './AddressBar.vue'
import WebView from './WebView.vue'
import Sidebar from './Sidebar.vue'
import SettingsPanel from './SettingsPanel.vue'
import CommandPalette from './CommandPalette.vue'
import Onboarding from './Onboarding.vue'
import ToastContainer from './ui/Toast.vue'

const { tabs, activeTab, createTab, closeTab, setActiveTab, updateTab, navigateTab, goBack, goForward, reloadTab } = useTabs()
const { isEnabled: adBlockEnabled, toggleAdBlock } = useAdBlock()
const { settings, toggleSetting, loadSettings } = usePrivacy()

const showSidebar = ref(false)
const showSettings = ref(false)
const showOnboarding = ref(false)
const showCommandPalette = ref(false)
const sidebarWidth = ref(300)
const isFullscreen = ref(false)
const activeSidePanel = ref<'bookmarks' | 'history' | 'downloads' | 'extensions' | 'ai' | 'reading-list'>('bookmarks')
const showCommandPalette = ref(false)

const currentWebview = computed(() => activeTab.value?.webviewId)

const handleNewTab = async (url?: string) => {
  const homepage = settings.value?.general?.homepage || 'https://duckduckgo.com'
  await createTab(url || homepage)
}

const handleNavigate = async (url: string) => {
  if (!activeTab.value) return
  await navigateTab(activeTab.value.id, url)
}

const handleGoBack = async () => {
  if (activeTab.value) await goBack(activeTab.value.id)
}

const handleGoForward = async () => {
  if (activeTab.value) await goForward(activeTab.value.id)
}

const handleReload = async () => {
  if (activeTab.value) await reloadTab(activeTab.value.id)
}

const handleCloseTab = async (tabId: string) => {
  await closeTab(tabId)
}

const handleTabActivate = async (tabId: string) => {
  await setActiveTab(tabId)
}

const toggleFullscreen = async () => {
  const window = getCurrentWebviewWindow()
  isFullscreen.value = !isFullscreen.value
  await window.setFullscreen(isFullscreen.value)
}

const minimizeWindow = async () => {
  const window = getCurrentWebviewWindow()
  await window.minimize()
}

const maximizeWindow = async () => {
  const window = getCurrentWebviewWindow()
  const isMaximized = await window.isMaximized()
  if (isMaximized) {
    await window.unmaximize()
  } else {
    await window.maximize()
  }
}

const closeWindow = async () => {
  const window = getCurrentWebviewWindow()
  await window.close()
}

const toggleCommandPalette = () => {
  showCommandPalette.value = !showCommandPalette.value
}

const handleKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    showCommandPalette.value = !showCommandPalette.value
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 't') {
    e.preventDefault()
    handleNewTab()
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
    e.preventDefault()
    if (activeTab.value) handleCloseTab(activeTab.value.id)
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
    e.preventDefault()
    ;(document.getElementById('address-input') as HTMLInputElement)?.focus()
  }
  if (e.key === 'F11') {
    e.preventDefault()
    toggleFullscreen()
  }
}
</script>

<template>
  <div class="app" :class="{ fullscreen: isFullscreen }">
    <div class="titlebar" @dblclick="maximizeWindow" :class="{ 'titlebar-fullscreen': isFullscreen }">
      <div class="titlebar-left">
        <button class="titlebar-btn" @click="goBack" :disabled="!activeTab?.canGoBack" aria-label="Back (Alt+Left)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <button class="titlebar-btn" @click="goForward" :disabled="!activeTab?.canGoForward" title="Forward (Alt+Right)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
        <button class="titlebar-btn" @click="reloadTab" title="Reload (Ctrl+R)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 2.13-9.36L1 10"/>
          </svg>
        </button>
        <AddressBar
          id="address-input"
          :url="activeTab?.url || ''"
          :loading="activeTab?.loading || false"
          :can-go-back="activeTab?.canGoBack || false"
          :can-go-forward="activeTab?.canGoForward || false"
          :secure="activeTab?.url?.startsWith('https://') || false"
          @navigate="handleNavigate"
        />
      </div>
      
      <TabBar
        :tabs="tabs"
        :active-tab-id="activeTabId"
        @new-tab="handleNewTab"
        @close-tab="handleCloseTab"
        @activate-tab="handleTabActivate"
      />
      
      <div class="titlebar-right">
        <button class="titlebar-btn" @click="showSidebar = !showSidebar" aria-label="Sidebar (Ctrl+Shift+B)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
        </button>
        <button class="titlebar-btn" @click="showSettings = !showSettings" title="Settings (Ctrl+,)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
        <button class="titlebar-btn" @click="minimizeWindow" title="Minimize">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button class="titlebar-btn" @click="maximizeWindow" title="Maximize">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          </svg>
        </button>
        <button class="titlebar-btn close-btn" @click="closeWindow" title="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
    
    <div class="main-content">
      <div class="titlebar" @dblclick="maximizeWindow" :class="{ 'titlebar-fullscreen': isFullscreen }">
        <div class="titlebar-left">
          <button class="titlebar-btn" @click="handleGoBack" :disabled="!activeTab?.canGoBack" aria-label="Back (Alt+Left)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <button class="titlebar-btn" @click="handleGoForward" :disabled="!activeTab?.canGoForward" title="Forward (Alt+Right)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
          <button class="titlebar-btn" @click="handleReload" title="Reload (Ctrl+R)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
            </svg>
          </button>
          <AddressBar
            id="address-input"
            :url="activeTab?.url || ''"
            :loading="activeTab?.loading || false"
            :can-go-back="activeTab?.canGoBack || false"
            :can-go-forward="activeTab?.canGoForward || false"
            :secure="activeTab?.url?.startsWith('https://') || false"
            @navigate="handleNavigate"
          />
        </div>
        
        <TabBar
          :tabs="tabs"
          :active-tab-id="activeTabId"
          @new-tab="handleNewTab"
          @close-tab="handleCloseTab"
          @activate-tab="handleTabActivate"
        />
        
        <div class="titlebar-right">
          <button class="titlebar-btn" @click="showSidebar = !showSidebar" aria-label="Sidebar (Ctrl+Shift+B)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          </button>
          <button class="titlebar-btn" @click="showSettings = !showSettings" title="Settings (Ctrl+,)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <button class="titlebar-btn" @click="minimizeWindow" title="Minimize">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <button class="titlebar-btn" @click="maximizeWindow" title="Maximize">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            </svg>
          </button>
          <button class="titlebar-btn close-btn" @click="closeWindow" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </header>

      <div class="main-content">
        <Sidebar v-if="showSidebar" :width="sidebarWidth" @close="showSidebar = false" />
        
        <div class="browser-content" :style="{ marginLeft: showSidebar ? `${sidebarWidth}px` : '0' }">
          <WebView
            v-for="tab in tabs"
            :key="tab.id"
            :tab="tab"
            :active="activeTabId === tab.id"
            @title-change="updateTab"
            @url-change="updateTab"
            @loading-change="updateTab"
            @favicon-change="updateTab"
            @can-go-back-change="updateTab"
            @can-go-forward-change="updateTab"
          />
        </div>
        
        <Sidebar v-if="showSidebar" :width="sidebarWidth" @close="showSidebar = false" />
        
        <div class="browser-content" :style="{ marginLeft: showSidebar ? `${sidebarWidth}px` : '0' }">
          <WebView
            v-for="tab in tabs"
            :key="tab.id"
            :tab="tab"
            :active="activeTabId === tab.id"
            @title-change="updateTab"
            @url-change="updateTab"
            @loading-change="updateTab"
            @favicon-change="updateTab"
            @can-go-back-change="updateTab"
            @can-go-forward-change="updateTab"
          />
        </div>
        
        <Sidebar v-if="showSidebar" :width="sidebarWidth" @close="showSidebar = false" />
        
        <SettingsPanel v-if="showSettings" @close="showSettings = false" />
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../styles/design-tokens.css';

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: var(--bg-primary);
  color: var(--fg-primary);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-app-region: drag;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: var(--bg-primary);
  color: var(--fg-primary);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-app-region: drag;
}

.app.fullscreen .titlebar {
  display: none;
}

.titlebar {
  display: flex;
  align-items: center;
  height: var(--space-toolbar-height);
  padding: 0 var(--space-3);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  -webkit-app-region: drag;
  z-index: 100;
}

.titlebar-fullscreen {
  display: none;
}

.titlebar-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  -webkit-app-region: no-drag;
  gap: var(--space-2);
}

.titlebar-right {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  -webkit-app-region: no-drag.
}

.tab-bar {
  flex: 1;
  display: flex;
  align-items: center.
  min-width: 0.
  -webkit-app-region: no-drag.
  overflow-x: auto.
  padding: 0 var(--space-1).
  gap: var(--tab-gap).
}

.tab-bar::-webkit-scrollbar {
  height: 4px.
}

.tab-bar::-webkit-scrollbar-track {
  background: transparent.
}

.tab-bar::-webkit-scrollbar-thumb {
  background: var(--border-primary).
  border-radius: 2px.
}

.tab {
  display: flex.
  align-items: center.
  height: 100%.
  min-width: var(--tab-min-width).
  max-width: var(--tab-max-width).
  padding: 0 var(--space-tab-padding-x) 0 var(--space-tab-padding-y).
  gap: var(--space-2).
  background: transparent.
  border: none.
  border-bottom: 2px solid transparent.
  color: var(--fg-secondary).
  font-size: var(--text-sm).
  font-weight: var(--font-medium).
  cursor: pointer.
  transition: var(--transition-colors).
  white-space: nowrap.
  position: relative.
}

.tab:hover:not(.active) {
  background: var(--bg-tertiary).
  color: var(--fg-primary).
}

.tab.active {
  color: var(--fg-primary).
  border-bottom-color: var(--color-brand-500).
  background: var(--bg-primary).
}

.tab.pinned {
  min-width: var(--tab-pinned-width).
  max-width: var(--tab-pinned-width).
  padding: 0 var(--space-2).
}

.tab.pinned .tab-title,
.tab.pinned .tab-close {
  display: none.
}

.tab .tab-favicon {
  width: 16px.
  height: 16px.
  flex-shrink: 0.
  border-radius: var(--radius-xs).
}

.tab-title {
  flex: 1.
  overflow: hidden.
  text-overflow: ellipsis.
  white-space: nowrap.
}

.tab-indicators {
  display: flex.
  align-items: center.
  gap: var(--space-2).
  flex-shrink: 0.
}

.tab-indicator {
  font-size: 10px.
  color: var(--fg-tertiary).
}

.tab-close {
  display: flex.
  align-items: center.
  justify-content: center.
  width: 20px.
  height: 20px.
  border: none.
  border-radius: var(--radius-sm).
  background: transparent.
  color: var(--fg-secondary).
  cursor: pointer.
  opacity: 0.
  transition: var(--transition-colors), opacity var(--duration-fast).
  flex-shrink: 0.
}

.tab:hover .tab-close,
.tab.active .tab-close {
  opacity: 1.
}

.tab-close:hover {
  background: var(--color-error-500).
  color: white.
}

.new-tab-btn {
  display: flex.
  align-items: center.
  justify-content: center.
  width: 36px.
  height: 100%.
  min-width: 36px.
  border: none.
  border-bottom: 2px solid transparent.
  background: transparent.
  color: var(--fg-secondary).
  cursor: pointer.
  transition: var(--transition-colors), border-color var(--duration-fast).
  flex-shrink: 0.
}

.new-tab-btn:hover {
  background: var(--bg-tertiary).
  color: var(--fg-primary).
  border-bottom-color: var(--color-brand-500).
}

@media (max-width: 768px) {
  .titlebar-left .titlebar-btn:not(:first-child):not(:last-child) {
    display: none.
  }
  
  .titlebar-left .titlebar-btn:not(:first-child):not(:last-child) {
    display: none.
  }
  
  .titlebar-left .titlebar-btn:not(:first-child):not(:last-child) {
    display: none.
  }
  
  .titlebar-left .titlebar-btn:not(:first-child):not(:last-child) {
    display: none.
  }
  
  .titlebar-left .titlebar-btn:not(:first-child):not(:last-child) {
    display: none.
  }
  
  .titlebar-left .titlebar-btn:not(:first-child):not(:last-child) {
    display: none.
  }
}
</style>