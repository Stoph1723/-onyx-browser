import { ref, computed, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { usePrivacy } from '../composables/usePrivacy'
import { useAdBlock } from '../composables/useAdBlock'
import { useTabs } from '../composables/useTabs'

interface Props {}
interface Emits {
  close: []
}

const emit = defineEmits<Emits>()
const { settings, toggleSetting, saveSettings } = usePrivacy()
const { isEnabled: adBlockEnabled, toggleAdBlock } = useAdBlock()

const tabs = ['privacy', 'appearance', 'general', 'shortcuts', 'about'] as const
type SettingsTab = typeof tabs[number]
const activeTab = ref<SettingsTab>('privacy')

const searchEngines = [
  { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s' },
  { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=%s' },
  { id: 'brave', name: 'Brave Search', url: 'https://search.brave.com/search?q=%s' },
  { id: 'startpage', name: 'Startpage', url: 'https://www.startpage.com/sp/search?q=%s' },
  { id: 'searx', name: 'SearXNG', url: 'https://searx.be/search?q=%s' },
]

const themes = ['light', 'dark', 'system'] as const

const themeLabels: Record<string, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

const close = () => emit('close')

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="settings-overlay" @click.self="close">
    <div class="settings-panel">
      <div class="settings-header">
        <h2>Settings</h2>
        <button class="close-btn" @click="close" aria-label="Close settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="settings-body">
        <nav class="settings-nav">
          <button
            v-for="tab in tabs"
            :key="tab"
            class="nav-item"
            :class="{ active: activeTab === tab }"
            @click="activeTab = tab"
          >
            <component :is="tabIcons[tab]" />
            <span>{{ tabLabels[tab] }}</span>
          </button>
        </nav>
        
        <div class="settings-content">
          <!-- Privacy Tab -->
          <div v-if="activeTab === 'privacy'" class="tab-content">
            <section class="settings-section">
              <h3>Tracking Protection</h3>
              <Switch
                v-model="settings.privacy.blockTrackers"
                title="Block Trackers"
                description="Prevent cross-site tracking cookies and scripts"
                @change="toggleSetting('blockTrackers')"
              />
              <Switch
                v-model="settings.privacy.blockFingerprinting"
                title="Block Fingerprinting"
                description="Randomize browser fingerprint to prevent identification"
                @change="toggleSetting('blockFingerprinting')"
              />
              <Switch
                v-model="settings.privacy.blockScripts"
                title="Block Scripts by Default"
                description="Block JavaScript on new sites (can break functionality)"
                @change="toggleSetting('blockScripts')"
              />
            </section>
            
            <section class="settings-section">
              <h3>Ad Blocking</h3>
              <Switch
                v-model="settings.privacy.blockAds"
                title="Block Ads"
                description="Block advertisements using filter lists"
                @change="toggleSetting('blockAds')"
              />
              <Switch
                v-model="settings.privacy.blockMalware"
                title="Block Malware Domains"
                description="Block known malware and phishing domains"
                @change="toggleSetting('blockMalware')"
              />
              <div class="setting-item">
                <label>Filter Lists</label>
                <button class="secondary-btn" @click="manageFilterLists">Manage Lists</button>
              </div>
            </section>
            
            <section class="settings-section">
              <h3>Privacy Features</h3>
              <Switch
                v-model="settings.privacy.httpsOnly"
                title="HTTPS Only Mode"
                description="Upgrade connections to HTTPS automatically"
                @change="toggleSetting('httpsOnly')"
              />
              <Switch
                v-model="settings.privacy.blockThirdPartyCookies"
                title="Block Third-Party Cookies"
                description="Prevent cross-site cookie tracking"
                @change="toggleSetting('blockThirdPartyCookies')"
              />
              <Switch
                v-model="settings.privacy.doNotTrack"
                title="Send Do Not Track"
                description="Request sites not to track your browsing"
                @change="toggleSetting('doNotTrack')"
              />
              <Switch
                v-model="settings.privacy.clearOnExit"
                title="Clear Data on Exit"
                description="Delete cookies, cache, and history when closing"
                @change="toggleSetting('clearOnExit')"
              />
            </section>
            
            <section class="settings-section">
              <h3>Advanced</h3>
              <Switch
                v-model="settings.privacy.disableWebRTC"
                title="Disable WebRTC"
                description="Prevent IP leaks via WebRTC (may break video calls)"
                @change="toggleSetting('disableWebRTC')"
              />
              <Switch
                v-model="settings.privacy.disablePrefetch"
                title="Disable Prefetching"
                description="Stop browser from preloading links"
                @change="toggleSetting('disablePrefetch')"
              />
              <div class="setting-item">
                <label>DNS over HTTPS</label>
                <select v-model="settings.privacy.dohProvider" class="select-input" @change="toggleSetting('dohProvider')">
                  <option value="cloudflare">Cloudflare (1.1.1.1)</option>
                  <option value="google">Google (8.8.8.8)</option>
                  <option value="quad9">Quad9 (9.9.9.9)</option>
                  <option value="nextdns">NextDNS</option>
                  <option value="custom">Custom Provider</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </section>
          </div>
          
          <!-- Appearance Tab -->
          <div v-if="activeTab === 'appearance'" class="tab-content">
            <section class="settings-section">
              <h3>Theme</h3>
              <div class="setting-item">
                <label>Color Scheme</label>
                <div class="theme-options">
                  <label v-for="theme in themes" :key="theme" class="theme-option">
                    <input type="radio" :value="theme" v-model="settings.appearance.theme" @change="toggleSetting('theme')">
                    <span class="theme-preview" :class="theme"></span>
                    <span>{{ themeLabels[theme] }}</span>
                  </label>
                </div>
              </div>
            </section>
            
            <section class="settings-section">
              <h3>Layout</h3>
              <Switch
                v-model="settings.appearance.verticalTabs"
                title="Vertical Tabs"
                description="Show tabs in a vertical sidebar"
                @change="toggleSetting('verticalTabs')"
              />
              <Switch
                v-model="settings.appearance.showBookmarksBar"
                title="Show Bookmarks Bar"
                description="Display bookmarks below address bar"
                @change="toggleSetting('showBookmarksBar')"
              />
              <Switch
                v-model="settings.appearance.compactMode"
                title="Compact Mode"
                description="Reduce UI padding and spacing"
                @change="toggleSetting('compactMode')"
              />
            </section>
            
            <section class="settings-section">
              <h3>Customization</h3>
              <div class="setting-item">
                <label>Accent Color</label>
                <input type="color" v-model="settings.appearance.accentColor" @change="toggleSetting('accentColor')" class="color-input">
              </div>
              <div class="setting-item">
                <label>Background Image</label>
                <input type="file" accept="image/*" @change="setBackground" class="file-input">
              </div>
            </section>
          </div>
          
          <!-- General Tab -->
          <div v-if="activeTab === 'general'" class="tab-content">
            <section class="settings-section">
              <h3>Startup</h3>
              <div class="setting-item">
                <label>On Startup</label>
                <select v-model="settings.general.startupBehavior" class="select-input" @change="toggleSetting('startupBehavior')">
                  <option value="newtab">Open New Tab</option>
                  <option value="restore">Restore Previous Session</option>
                  <option value="homepage">Open Homepage</option>
                </select>
              </div>
              <div class="setting-item">
                <label>Homepage</label>
                <input type="url" v-model="settings.general.homepage" @change="toggleSetting('homepage')" class="text-input" placeholder="https://...">
              </div>
            </section>
            
            <section class="settings-section">
              <h3>Search</h3>
              <div class="setting-item">
                <label>Default Search Engine</label>
                <select v-model="settings.general.searchEngine" class="select-input" @change="toggleSetting('searchEngine')">
                  <option v-for="engine in searchEngines" :key="engine.id" :value="engine.id">
                    {{ engine.name }}
                  </option>
                </select>
              </div>
              <Switch
                v-model="settings.general.searchSuggestions"
                title="Search Suggestions"
                description="Show search suggestions as you type"
                @change="toggleSetting('searchSuggestions')"
              />
            </section>
            
            <section class="settings-section">
              <h3>Downloads</h3>
              <div class="setting-item">
                <label>Download Location</label>
                <div class="path-input">
                  <input type="text" :value="settings.general.downloadPath" readonly class="text-input">
                  <button class="secondary-btn" @click="selectDownloadPath">Change</button>
                </div>
              </div>
              <Switch
                v-model="settings.general.askDownloadLocation"
                title="Ask Where to Save"
                description="Prompt for download location each time"
                @change="toggleSetting('askDownloadLocation')"
              />
            </section>
          </div>
          
          <!-- Shortcuts Tab -->
          <div v-if="activeTab === 'shortcuts'" class="tab-content">
            <section class="settings-section">
              <h3>Keyboard Shortcuts</h3>
              <div class="shortcuts-list">
                <ShortcutRow action="New Tab" shortcut="Ctrl+T" />
                <ShortcutRow action="New Private Window" shortcut="Ctrl+Shift+N" />
                <ShortcutRow action="Close Tab" shortcut="Ctrl+W" />
                <ShortcutRow action="Reopen Closed Tab" shortcut="Ctrl+Shift+T" />
                <ShortcutRow action="Focus Address Bar" shortcut="Ctrl+L" />
                <ShortcutRow action="Find in Page" shortcut="Ctrl+F" />
                <ShortcutRow action="Toggle Sidebar" shortcut="Ctrl+Shift+B" />
                <ShortcutRow action="Toggle Fullscreen" shortcut="F11" />
                <ShortcutRow action="Open Settings" shortcut="Ctrl+," />
                <ShortcutRow action="Open Downloads" shortcut="Ctrl+J" />
                <ShortcutRow action="Open History" shortcut="Ctrl+H" />
                <ShortcutRow action="Open Bookmarks" shortcut="Ctrl+Shift+O" />
                <ShortcutRow action="Next Tab" shortcut="Ctrl+Tab" />
                <ShortcutRow action="Previous Tab" shortcut="Ctrl+Shift+Tab" />
                <ShortcutRow action="Reload Page" shortcut="Ctrl+R" />
                <ShortcutRow action="Force Reload" shortcut="Ctrl+Shift+R" />
              </div>
            </section>
          </div>
          
          <!-- About Tab -->
          <div v-if="activeTab === 'about'" class="tab-content">
            <div class="about-content">
              <div class="app-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              </div>
              <h2>Onyx</h2>
              <p class="version">Version 1.0.0</p>
              <p class="description">A privacy-focused browser built with Tauri</p>
              
              <div class="about-links">
                <a href="https://github.com/onyx-browser" target="_blank" class="link-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </a>
                <a href="https://onyx-browser.org/privacy" target="_blank" class="link-btn">Privacy Policy</a>
                <a href="https://onyx-browser.org/license" target="_blank" class="link-btn">License</a>
              </div>
              
              <div class="credits">
                <h4>Built With</h4>
                <ul>
                  <li><a href="https://tauri.app" target="_blank">Tauri</a> - Framework</li>
                  <li><a href="https://vuejs.org" target="_blank">Vue 3</a> - Frontend</li>
                  <li><a href="https://vitejs.dev" target="_blank">Vite</a> - Build Tool</li>
                  <li><a href="https://github.com/brave/adblock-rust" target="_blank">adblock-rust</a> - Ad Blocking</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const tabLabels: Record<SettingsTab, string> = {
  privacy: 'Privacy & Security',
  appearance: 'Appearance',
  general: 'General',
  shortcuts: 'Shortcuts',
  about: 'About',
}

const tabIcons: Record<SettingsTab, any> = {
  privacy: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  appearance: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  ),
  general: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  shortcuts: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  about: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
}

const ShortcutRow = {
  props: ['action', 'shortcut'],
  setup(props) {
    return () => h('div', { class: 'shortcut-row' }, [
      h('span', { class: 'shortcut-action' }, props.action),
      h('kbd', { class: 'shortcut-key' }, props.shortcut),
    ])
  }
}

const h = require('vue').h
</script>

<style scoped>
.settings-overlay {
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

.settings-panel {
  width: 90%;
  max-width: 720px;
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

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-primary);
}

.settings-header h2 {
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

.settings-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.settings-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  width: 200px;
  padding: var(--space-3);
  border-right: 1px solid var(--border-primary);
  background: var(--bg-tertiary);
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--fg-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  text-align: left;
  cursor: pointer;
  transition: var(--transition-colors);
}

.nav-item:hover {
  background: var(--bg-secondary);
  color: var(--fg-primary);
}

.nav-item.active {
  background: var(--color-brand-500);
  color: white;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6);
}

.tab-content {
  animation: fadeIn var(--duration-normal) var(--ease-out);
}

.settings-section {
  margin-bottom: var(--space-8);
}

.settings-section h3 {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--fg-secondary);
  margin-bottom: var(--space-4);
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border-primary);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--fg-primary);
  min-width: 200px;
}

.setting-item .description {
  display: block;
  font-size: var(--text-xs);
  color: var(--fg-secondary);
  margin-top: var(--space-1);
  font-weight: var(--font-normal);
}

.toggle-item {
  align-items: center;
}

.toggle-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.select-input, .text-input {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--fg-primary);
  font-size: var(--text-sm);
  min-width: 200px;
  outline: none;
  transition: var(--transition-colors);
}

.select-input:focus, .text-input:focus {
  border-color: var(--border-focus);
}

.path-input {
  display: flex;
  gap: var(--space-2);
  flex: 1;
}

.path-input .text-input {
  flex: 1;
}

.secondary-btn {
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  color: var(--fg-primary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: var(--transition-colors).
}

.secondary-btn:hover {
  background: var(--bg-primary).
  border-color: var(--color-brand-500).
}

.color-input {
  width: 48px.
  height: 28px.
  border: none.
  border-radius: var(--radius-md).
  cursor: pointer.
}

.file-input {
  display: none.
}

.theme-options {
  display: flex.
  gap: var(--space-3).
  flex-wrap: wrap.
}

.theme-option {
  display: flex.
  align-items: center.
  gap: var(--space-2).
  cursor: pointer.
}

.theme-option input {
  display: none.
}

.theme-preview {
  width: 28px.
  height: 28px.
  border-radius: var(--radius-md).
  border: 2px solid transparent.
  transition: border-color var(--transition-fast).
}

.theme-preview.light { background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%); }
.theme-preview.dark { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); }
.theme-preview.system { background: linear-gradient(135deg, #f5f5f5 50%, #1a1a2e 50%); }

.theme-option input:checked + .theme-preview {
  border-color: var(--color-brand-500).
}

.shortcuts-list {
  display: flex.
  flex-direction: column.
  gap: var(--space-2).
}

.shortcut-row {
  display: flex.
  align-items: center.
  justify-content: space-between.
  padding: var(--space-2) var(--space-3).
  background: var(--bg-tertiary).
  border-radius: var(--radius-md).
}

.shortcut-action {
  font-size: var(--text-sm).
  color: var(--fg-primary).
}

.shortcut-key {
  display: flex.
  align-items: center.
  gap: var(--space-1).
  padding: var(--space-1) var(--space-2).
  background: var(--bg-primary).
  border-radius: var(--radius-sm).
  font-size: var(--text-xs).
  font-family: var(--font-mono).
  color: var(--fg-secondary).
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