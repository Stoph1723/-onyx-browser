import { ref, computed, onMounted, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { Tab, BrowserSettings } from '@/types'
import { usePrivacy } from './usePrivacy'

const tabs = ref<Tab[]>([])
const activeTabId = ref<string | null>(null)
const nextTabId = ref(1)
const { settings } = usePrivacy()

const generateTabId = () => `tab-${nextTabId.value++}`

const createTab = async (url?: string, isPrivate = false): Promise<Tab> => {
  const homepage = settings.value?.general?.homepage || 'https://duckduckgo.com'
  const tabUrl = url || homepage
  
  const webviewId = `webview-${generateTabId()}`
  
  const tab: Tab = {
    id: generateTabId(),
    title: 'New Tab',
    url: tabUrl,
    favicon: '',
    loading: true,
    canGoBack: false,
    canGoForward: false,
    isPrivate,
    webviewId,
  }
  
  tabs.value.push(tab)
  activeTabId.value = tab.id
  
  try {
    await invoke('create_webview', { 
      webviewId, 
      url: tabUrl,
      isPrivate,
    })
  } catch (error) {
    console.error('Failed to create webview:', error)
    tabs.value = tabs.value.filter(t => t.id !== tab.id)
    if (activeTabId.value === tab.id) {
      activeTabId.value = tabs.value[tabs.value.length - 1]?.id || null
    }
    throw error
  }
  
  return tab
}

const closeTab = async (tabId: string) => {
  const index = tabs.value.findIndex(t => t.id === tabId)
  if (index === -1) return
  
  const tab = tabs.value[index]
  
  try {
    await invoke('destroy_webview', { webviewId: tab.webviewId })
  } catch (error) {
    console.error('Failed to destroy webview:', error)
  }
  
  tabs.value.splice(index, 1)
  
  if (activeTabId.value === tabId) {
    if (tabs.value.length > 0) {
      const newIndex = Math.min(index, tabs.value.length - 1)
      activeTabId.value = tabs.value[newIndex].id
    } else {
      activeTabId.value = null
    }
  }
}

const setActiveTab = async (tabId: string) => {
  const tab = tabs.value.find(t => t.id === tabId)
  if (!tab) return
  
  activeTabId.value = tabId
  
  try {
    await invoke('focus_webview', { webviewId: tab.webviewId })
  } catch (error) {
    console.error('Failed to focus webview:', error)
  }
}

const updateTab = (tabId: string, updates: Partial<Tab>) => {
  const tab = tabs.value.find(t => t.id === tabId)
  if (tab) {
    Object.assign(tab, updates)
  }
}

const navigateTab = async (tabId: string, url: string) => {
  const tab = tabs.value.find(t => t.id === tabId)
  if (!tab) return
  
  let finalUrl = url
  try {
    new URL(url)
  } catch {
    const searchEngine = settings.value?.searchEngine || 'duckduckgo'
    const searchUrl = getSearchUrl(searchEngine, url)
    finalUrl = searchUrl
  }
  
  try {
    await invoke('navigate_webview', { webviewId: tab.webviewId, url: finalUrl })
    updateTab(tabId, { url: finalUrl, loading: true })
  } catch (error) {
    console.error('Failed to navigate:', error)
  }
}

const getSearchUrl = (engine: string, query: string): string => {
  const encodedQuery = encodeURIComponent(query)
  const engines: Record<string, string> = {
    duckduckgo: `https://duckduckgo.com/?q=${encodedQuery}`,
    google: `https://www.google.com/search?q=${encodedQuery}`,
    brave: `https://search.brave.com/search?q=${encodedQuery}`,
    startpage: `https://www.startpage.com/sp/search?q=${encodedQuery}`,
    searx: `https://searx.be/search?q=${encodedQuery}`,
  }
  return engines[engine] || engines.duckduckgo
}

const goBack = async (tabId: string) => {
  const tab = tabs.value.find(t => t.id === tabId)
  if (!tab || !tab.canGoBack) return
  
  try {
    await invoke('webview_go_back', { webviewId: tab.webviewId })
  } catch (error) {
    console.error('Failed to go back:', error)
  }
}

const goForward = async (tabId: string) => {
  const tab = tabs.value.find(t => t.id === tabId)
  if (!tab || !tab.canGoForward) return
  
  try {
    await invoke('webview_go_forward', { webviewId: tab.webviewId })
  } catch (error) {
    console.error('Failed to go forward:', error)
  }
}

const reloadTab = async (tabId: string, force = false) => {
  const tab = tabs.value.find(t => t.id === tabId)
  if (!tab) return
  
  try {
    await invoke('webview_reload', { webviewId: tab.webviewId, force })
  } catch (error) {
    console.error('Failed to reload:', error)
  }
}

const duplicateTab = async (tabId: string) => {
  const tab = tabs.value.find(t => t.id === tabId)
  if (!tab) return
  
  await createTab(tab.url, tab.isPrivate)
}

const moveTab = (tabId: string, newIndex: number) => {
  const index = tabs.value.findIndex(t => t.id === tabId)
  if (index === -1) return
  
  const [tab] = tabs.value.splice(index, 1)
  const targetIndex = Math.max(0, Math.min(newIndex, tabs.value.length))
  tabs.value.splice(targetIndex, 0, tab)
}

const pinTab = (tabId: string) => {
  const tab = tabs.value.find(t => t.id === tabId)
  if (tab) {
    tab.pinned = !tab.pinned
  }
}

const muteTab = (tabId: string) => {
  const tab = tabs.value.find(t => t.id === tabId)
  if (tab) {
    tab.muted = !tab.muted
    invoke('webview_set_audio_muted', { 
      webviewId: tab.webviewId, 
      muted: tab.muted 
    }).catch(console.error)
  }
}

const getTab = (tabId: string) => tabs.value.find(t => t.id === tabId)

const activeTab = computed(() => tabs.value.find(t => t.id === activeTabId.value) || null)

const normalTabs = computed(() => tabs.value.filter(t => !t.pinned))
const pinnedTabs = computed(() => tabs.value.filter(t => t.pinned))

const tabCount = computed(() => tabs.value.length)

const canGoBack = computed(() => activeTab.value?.canGoBack || false)
const canGoForward = computed(() => activeTab.value?.canGoForward || false)

export function useTabs() {
  return {
    tabs,
    activeTabId,
    activeTab,
    normalTabs,
    pinnedTabs,
    tabCount,
    canGoBack,
    canGoForward,
    createTab,
    closeTab,
    setActiveTab,
    updateTab,
    navigateTab,
    goBack,
    goForward,
    reloadTab,
    duplicateTab,
    moveTab,
    pinTab,
    muteTab,
    getTab,
  }
}