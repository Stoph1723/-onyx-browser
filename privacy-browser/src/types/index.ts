import { ref, computed, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'

export interface Tab {
  id: string
  title: string
  url: string
  favicon: string
  loading: boolean
  canGoBack: boolean
  canGoForward: boolean
  isPrivate: boolean
  pinned?: boolean
  muted?: boolean
  groupId?: string
  groupName?: string
  groupColor?: string
  containerId?: string
  webviewId: string
  createdAt: string
  updatedAt: string
  lastAccessedAt: number
}

export interface BrowserSettings {
  privacy: PrivacySettings
  appearance: AppearanceSettings
  general: GeneralSettings
  shortcuts: ShortcutSettings
}

export interface PrivacySettings {
  blockAds: boolean
  blockTrackers: boolean
  blockFingerprinting: boolean
  blockScripts: boolean
  blockMalware: boolean
  httpsOnly: boolean
  blockThirdPartyCookies: boolean
  doNotTrack: boolean
  clearOnExit: boolean
  disableWebRTC: boolean
  disablePrefetch: boolean
  dohProvider: 'cloudflare' | 'google' | 'quad9' | 'nextdns' | 'custom' | 'disabled'
  customDohUrl: string
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system'
  accentColor: string
  verticalTabs: boolean
  showBookmarksBar: boolean
  compactMode: boolean
}

export interface GeneralSettings {
  startupBehavior: 'newtab' | 'restore' | 'homepage'
  homepage: string
  searchEngine: string
  searchSuggestions: boolean
  downloadPath: string
  askDownloadLocation: boolean
}

export interface ShortcutSettings {
  [action: string]: string
}

export interface Bookmark {
  id: string
  title: string
  url: string
  folder?: string
  createdAt: number
}

export interface HistoryEntry {
  id: string
  title: string
  url: string
  visitedAt: number
  visitCount: number
}

export interface Download {
  id: string
  filename: string
  url: string
  progress: number
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted' | 'failed'
  totalBytes: number
  receivedBytes: number
  startedAt: string
  completedAt?: string
}

export interface Extension {
  id: string
  name: string
  version: string
  description: string
  enabled: boolean
  permissions: string[]
  path: string
  manifest: Record<string, any>
}

export interface BlocklistStats {
  ads: number
  trackers: number
  malware: number
  fingerprinting: number
  total: number
}

export interface AdBlockRule {
  id: string
  rule: string
  domain?: string
  type: 'block' | 'allow' | 'redirect'
  enabled: boolean
}

export interface SearchEngine {
  id: string
  name: string
  url: string
  icon?: string
}

export interface WebviewEvent {
  type: 'navigation' | 'title-change' | 'favicon-change' | 'load-start' | 'load-end' | 'error' | 'console-message' | 'permission-request' | 'download-start' | 'download-progress' | 'download-complete' | 'find-result'
  payload: any
  webviewId: string
}

export interface SearchEngine {
  id: string
  name: string
  url: string
  suggestUrl?: string
  icon?: string
}

export const DEFAULT_SETTINGS: BrowserSettings = {
  privacy: {
    blockAds: true,
    blockTrackers: true,
    blockFingerprinting: true,
    blockScripts: false,
    blockMalware: true,
    httpsOnly: true,
    blockThirdPartyCookies: true,
    doNotTrack: true,
    clearOnExit: false,
    disableWebRTC: false,
    disablePrefetch: true,
    dohProvider: 'cloudflare',
    customDohUrl: '',
  },
  appearance: {
    theme: 'system',
    accentColor: '#00d4aa',
    verticalTabs: false,
    showBookmarksBar: true,
    compactMode: false,
  },
  general: {
    startupBehavior: 'newtab',
    homepage: 'https://duckduckgo.com',
    searchEngine: 'duckduckgo',
    searchSuggestions: true,
    downloadPath: '',
    askDownloadLocation: false,
  },
  shortcuts: {
    'new-tab': 'Ctrl+T',
    'new-private-window': 'Ctrl+Shift+N',
    'close-tab': 'Ctrl+W',
    'reopen-closed-tab': 'Ctrl+Shift+T',
    'focus-address-bar': 'Ctrl+L',
    'find-in-page': 'Ctrl+F',
    'toggle-sidebar': 'Ctrl+Shift+B',
    'toggle-fullscreen': 'F11',
    'open-settings': 'Ctrl+,',
    'open-downloads': 'Ctrl+J',
    'open-history': 'Ctrl+H',
    'open-bookmarks': 'Ctrl+Shift+O',
    'next-tab': 'Ctrl+Tab',
    'previous-tab': 'Ctrl+Shift+Tab',
    'reload': 'Ctrl+R',
    'force-reload': 'Ctrl+Shift+R',
  },
}

export const DEFAULT_SEARCH_ENGINES: SearchEngine[] = [
  { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s' },
  { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=%s' },
  { id: 'brave', name: 'Brave Search', url: 'https://search.brave.com/search?q=%s' },
  { id: 'startpage', name: 'Startpage', url: 'https://www.startpage.com/sp/search?q=%s' },
  { id: 'searx', name: 'SearXNG', url: 'https://searx.be/search?q=%s' },
]

export const DEFAULT_SHORTCUTS: ShortcutSettings = {
  'new-tab': 'Ctrl+T',
  'new-private-window': 'Ctrl+Shift+N',
  'close-tab': 'Ctrl+W',
  'reopen-closed-tab': 'Ctrl+Shift+T',
  'focus-address-bar': 'Ctrl+L',
  'find-in-page': 'Ctrl+F',
  'toggle-sidebar': 'Ctrl+Shift+B',
  'toggle-fullscreen': 'F11',
  'open-settings': 'Ctrl+,',
  'open-downloads': 'Ctrl+J',
  'open-history': 'Ctrl+H',
  'open-bookmarks': 'Ctrl+Shift+O',
  'next-tab': 'Ctrl+Tab',
  'previous-tab': 'Ctrl+Shift+Tab',
  'reload': 'Ctrl+R',
  'force-reload': 'Ctrl+Shift+R',
  'toggle-devtools': 'F12',
  'toggle-adblock': 'Ctrl+Shift+A',
  'new-private-tab': 'Ctrl+Shift+P',
}