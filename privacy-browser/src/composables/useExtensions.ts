import { ref, computed, onMounted, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'

export interface Extension {
  id: string
  name: string
  version: string
  description: string
  author: string
  homepage?: string
  enabled: boolean
  permissions: string[]
  path: string
  manifest: Record<string, any>
  installDate: string
  updateDate?: string
  size: number
  type: 'manifest_v2' | 'manifest_v3' | 'theme' | 'user_script'
}

export interface ExtensionSettings {
  autoUpdate: boolean
  devMode: boolean
  allowIncognito: boolean
  allowFileAccess: boolean
  allowLocalStorage: boolean
  customCss: string
  customJs: string
}

export interface ExtensionStore {
  extensions: Extension[]
  categories: string[]
  featured: string[]
  searchQuery: string
  selectedCategory: string
}

export function useExtensions() {
  const extensions = ref<Extension[]>([])
  const settings = ref<ExtensionSettings>({
    autoUpdate: true,
    devMode: false,
    allowIncognito: false,
    allowFileAccess: false,
    allowLocalStorage: true,
    customCss: '',
    customJs: ''
  })
  const store = ref<ExtensionStore>({
    extensions: [],
    categories: ['All', 'Productivity', 'Privacy', 'Security', 'Shopping', 'Social', 'Developer Tools', 'Accessibility', 'Entertainment'],
    featured: [],
    searchQuery: '',
    selectedCategory: 'All',
  })
  
  const isLoading = ref(false)
  const isInstalling = ref(false)
  const installProgress = ref(0)
  const selectedExtension = ref<Extension | null>(null)
  const showDetailsDialog = ref(false)
  const showInstallDialog = ref(false)
  const installUrl = ref('')

  const filteredExtensions = computed(() => 
    extensions.value.filter(e => 
      e.name.toLowerCase().includes(store.value.searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(store.value.searchQuery.toLowerCase())
    ).filter(e => 
      store.value.selectedCategory === 'All' || e.category === store.value.selectedCategory
    )
  )

  const enabledExtensions = computed(() => extensions.value.filter(e => e.enabled))
  const disabledExtensions = computed(() => extensions.value.filter(e => !e.enabled))

  const loadExtensions = async () => {
    try {
      extensions.value = await invoke<Extension[]>('get_extensions')
    } catch (err) {
      console.error('Failed to load extensions:', err)
    }
  }

  const installExtension = async (urlOrPath: string, options?: { force?: boolean }) => {
    isInstalling.value = true
    try {
      const extension = await invoke<Extension>('install_extension', { 
        urlOrPath, 
        force: options?.force || false 
      })
      extensions.value.push(extension)
      return extension
    } catch (err) {
      console.error('Failed to install extension:', err)
      throw err
    } finally {
      isInstalling.value = false
    }
  }

  const uninstallExtension = async (id: string) => {
    const ext = extensions.value.find(e => e.id === id)
    if (!ext) return
    
    if (!confirm(`Uninstall "${ext.name}"? This cannot be undone.`)) return
    
    try {
      await invoke('uninstall_extension', { id })
      extensions.value = extensions.value.filter(e => e.id !== id)
    } catch (err) {
      console.error('Failed to uninstall extension:', err)
      throw err
    }
  }

  const updateExtension = async (id: string) => {
    const ext = extensions.value.find(e => e.id === id)
    if (!ext) return
    
    try {
      const updated = await invoke<Extension>('update_extension', { id })
      Object.assign(ext, updated)
    } catch (err) {
      console.error('Failed to update extension:', err)
      throw err
    }
  }

  const checkForUpdates = async () => {
    try {
      const results = await invoke<{ id: string; updateAvailable: boolean; newVersion?: string }[]>('check_extension_updates')
      results.forEach(r => {
        const ext = extensions.value.find(e => e.id === r.id)
        if (ext) {
          ext.updateAvailable = r.updateAvailable
          if (r.newVersion) ext.newVersion = r.newVersion
        }
      })
    } catch (err) {
      console.error('Failed to check for updates:', err)
    }
  }

  const reloadExtension = async (id: string) => {
    try {
      await invoke('reload_extension', { id })
    } catch (err) {
      console.error('Failed to reload extension:', err)
      throw err
    }
  }

  const openExtensionOptions = async (id: string) => {
    try {
      await invoke('open_extension_options', { id })
    } catch (err) {
      console.error('Failed to open extension options:', err)
    }
  }

  const toggleDevMode = async () => {
    settings.value.devMode = !settings.value.devMode
    await saveSettings()
  }

  const addSearchEngine = async (engine: { id: string; name: string; url: string; suggestUrl?: string; iconUrl?: string; isDefault: boolean; isCustom: boolean }) => {
    store.value.searchEngines.push(engine)
    await saveStore()
  }

  const removeSearchEngine = async (id: string) => {
    if (store.value.searchEngines.some(e => e.id === id && e.isDefault)) {
      throw new Error('Cannot remove default search engine')
    }
    store.value.searchEngines = store.value.searchEngines.filter(e => e.id !== id)
    await saveStore()
  }

  const setDefaultSearchEngine = async (id: string) => {
    for (const engine of store.value.searchEngines) {
      engine.isDefault = engine.id === id
    }
    await saveStore()
  }

  const getExtensions = () => extensions.value

  const getExtensionById = (id: string) => extensions.value.find(e => e.id === id)

  const addExtension = async (extension: Extension) => {
    extensions.value.push(extension)
    await saveExtensions()
  }

  const removeExtension = async (id: string) => {
    extensions.value = extensions.value.filter(e => e.id !== id)
    await saveExtensions()
  }

  const toggleExtension = async (id: string, enabled: boolean) => {
    const ext = extensions.value.find(e => e.id === id)
    if (ext) {
      ext.enabled = enabled
      await saveExtensions()
    }
  }

  const exportExtensions = () => {
    return JSON.stringify({
      extensions: extensions.value,
      settings: settings.value,
      store: store.value,
      exportedAt: new Date().toISOString()
    }, null, 2)
  }

  const importExtensions = async (json: string) => {
    try {
      const data = JSON.parse(json)
      if (data.extensions) {
        extensions.value = data.extensions
      }
      if (data.settings) {
        settings.value = { ...settings.value, ...data.settings }
      }
      if (data.store) {
        store.value = { ...store.value, ...data.store }
      }
      await saveExtensions()
      await saveStore()
      await saveSettings()
    } catch (err) {
      console.error('Failed to import extensions:', err)
      throw err
    }
  }

  const resetToDefaults = async () => {
    extensions.value = []
    settings.value = ExtensionSettingsDefault
    store.value = ExtensionStoreDefault
    await saveExtensions()
    await saveSettings()
    await saveStore()
  }

  const saveExtensions = async () => {
    try {
      await invoke('save_extensions', { extensions: extensions.value })
    } catch (err) {
      console.error('Failed to save extensions:', err)
    }
  }

  const saveSettings = async () => {
    try {
      await invoke('save_extension_settings', { settings: settings.value })
    } catch (err) {
      console.error('Failed to save settings:', err)
    }
  }

  const saveStore = async () => {
    try {
      await invoke('save_extension_store', { store: store.value })
    } catch (err) {
      console.error('Failed to save store:', err)
    }
  }

  const loadExtensionSettings = async () => {
    try {
      const loaded = await invoke<ExtensionSettings>('get_extension_settings')
      settings.value = { ...settings.value, ...loaded }
    } catch (err) {
      console.error('Failed to load extension settings:', err)
    }
  }

  const loadExtensionStore = async () => {
    try {
      const loaded = await invoke<ExtensionStore>('get_extension_store')
      store.value = { ...store.value, ...loaded }
    } catch (err) {
      console.error('Failed to load extension store:', err)
    }
  }

  onMounted(async () => {
    await loadExtensions()
    await loadExtensionSettings()
    await loadExtensionStore()
  })

  return {
    extensions,
    settings,
    store,
    isLoading,
    isInstalling,
    installProgress,
    selectedExtension,
    showDetailsDialog,
    showInstallDialog,
    installUrl,
    filteredExtensions,
    enabledExtensions,
    disabledExtensions,
    loadExtensions,
    installExtension,
    uninstallExtension,
    updateExtension,
    checkForUpdates,
    reloadExtension,
    openExtensionOptions,
    toggleDevMode,
    addSearchEngine,
    removeSearchEngine,
    setDefaultSearchEngine,
    getExtensions,
    getExtensionById,
    addExtension,
    removeExtension,
    toggleExtension,
    exportExtensions,
    importExtensions,
    resetToDefaults,
    saveExtensions,
    saveSettings,
    saveStore,
    loadExtensionSettings,
    loadExtensionStore,
  }
}

const ExtensionSettingsDefault: ExtensionSettings = {
  autoUpdate: true,
  devMode: false,
  allowIncognito: false,
  allowFileAccess: false,
  allowLocalStorage: true,
  customCss: '',
  customJs: '',
}

const ExtensionStoreDefault: ExtensionStore = {
  extensions: [],
  categories: ['All', 'Productivity', 'Privacy', 'Security', 'Shopping', 'Social', 'Developer Tools', 'Accessibility', 'Entertainment'],
  featured: [],
  searchQuery: '',
  selectedCategory: 'All',
}