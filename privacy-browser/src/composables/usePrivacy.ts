import { ref, computed, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { BrowserSettings, PrivacySettings } from '@/types'

const STORAGE_KEY = 'onyx-browser-settings'

const defaultSettings: BrowserSettings = {
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
  homepage: 'https://duckduckgo.com',
  searchEngine: 'duckduckgo',
  theme: 'dark',
  verticalTabs: false,
  showBookmarksBar: false,
  compactMode: false,
  accentColor: '#00d4aa',
  startupBehavior: 'newtab',
  searchSuggestions: true,
  downloadPath: '',
  askDownloadLocation: false,
}

const settings = ref<BrowserSettings>(loadSettings())

function loadSettings(): BrowserSettings {
  try {
    const stored = localStorage.getItem('onyx-browser-settings')
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) }
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
  return defaultSettings
}

function saveSettings() {
  try {
    localStorage.setItem('onyx-browser-settings', JSON.stringify(settings.value))
    invoke('update_settings', { settings: settings.value }).catch(console.error)
  } catch (error) {
    console.error('Failed to save settings:', error)
  }
}

watch(settings, saveSettings, { deep: true })

export function usePrivacy() {
  const toggleSetting = <K extends keyof BrowserSettings>(
    key: K,
    value?: BrowserSettings[K]
  ) => {
    if (value !== undefined) {
      ;(settings.value[key] as any) = value
    } else if (typeof settings.value[key] === 'boolean') {
      ;(settings.value[key] as any) = !(settings.value[key] as any)
    }
  }

  const resetSettings = () => {
    settings.value = defaultSettings
  }

  const exportSettings = () => {
    return JSON.stringify(settings.value, null, 2)
  }

  const importSettings = (json: string) => {
    try {
      const imported = JSON.parse(json)
      settings.value = { ...defaultSettings, ...imported }
    } catch (error) {
      console.error('Failed to import settings:', error)
      throw error
    }
  }

  const privacySettings = computed(() => settings.value.privacy)

  const updatePrivacySetting = <K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K]
  ) => {
    settings.value.privacy[key] = value
  }

  const getBlocklistStatus = async () => {
    try {
      return await invoke<{
        ads: number
        trackers: number
        malware: number
        fingerprinting: number
      }>('get_blocklist_stats')
    } catch (error) {
      console.error('Failed to get blocklist stats:', error)
      return { ads: 0, trackers: 0, malware: 0, fingerprinting: 0 }
    }
  }

  const updateBlocklists = async () => {
    try {
      await invoke('update_blocklists')
    } catch (error) {
      console.error('Failed to update blocklists:', error)
      throw error
    }
  }

  const clearBrowsingData = async (options: {
    cookies?: boolean
    cache?: boolean
    history?: boolean
    localStorage?: boolean
    downloads?: boolean
    formData?: boolean
  }) => {
    try {
      await invoke('clear_browsing_data', { options })
    } catch (error) {
      console.error('Failed to clear browsing data:', error)
      throw error
    }
  }

  return {
    settings,
    privacySettings,
    toggleSetting,
    resetSettings,
    exportSettings,
    importSettings,
    updatePrivacySetting,
    getBlocklistStatus,
    updateBlocklists,
    clearBrowsingData,
    saveSettings,
  }
}

const defaultSettings: BrowserSettings = {
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
  homepage: 'https://duckduckgo.com',
  searchEngine: 'duckduckgo',
  theme: 'dark',
  verticalTabs: false,
  showBookmarksBar: false,
  compactMode: false,
  accentColor: '#00d4aa',
  startupBehavior: 'newtab',
  searchSuggestions: true,
  downloadPath: '',
  askDownloadLocation: false,
}

interface BrowserSettings {
  privacy: PrivacySettings
  homepage: string
  searchEngine: string
  theme: 'light' | 'dark' | 'system'
  verticalTabs: boolean
  showBookmarksBar: boolean
  compactMode: boolean
  accentColor: string
  startupBehavior: 'newtab' | 'restore' | 'homepage'
  searchSuggestions: boolean
  downloadPath: string
  askDownloadLocation: boolean
}

interface PrivacySettings {
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

interface BrowserSettings {
  privacy: PrivacySettings
  homepage: string
  searchEngine: string
  theme: 'light' | 'dark' | 'system'
  verticalTabs: boolean
  showBookmarksBar: boolean
  compactMode: boolean
  accentColor: string
  startupBehavior: 'newtab' | 'restore' | 'homepage'
  searchSuggestions: boolean
  downloadPath: string
  askDownloadLocation: boolean
}