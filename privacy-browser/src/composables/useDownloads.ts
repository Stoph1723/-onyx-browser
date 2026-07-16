import { ref, computed, onMounted, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'

export interface Download {
  id: string
  url: string
  filename: string
  path?: string
  totalBytes: number
  receivedBytes: number
  progress: number
  state: 'pending' | 'progressing' | 'completed' | 'cancelled' | 'interrupted' | 'failed'
  mimeType: string
  referrer: string
  userAgent: string
  startedAt: string
  completedAt?: string
  error?: string
  canResume: boolean
  referrerPolicy?: string
}

interface DownloadSettings {
  defaultPath: string
  askForLocation: boolean
  openWhenDone: boolean
  autoOpenFile: boolean
  notifyWhenDone: boolean
  removeCompletedAfterDays: number
  maxConcurrentDownloads: number
  speedLimit: number // bytes per second, 0 = unlimited
}

interface DownloadStats {
  totalDownloads: number
  activeDownloads: number
  completedDownloads: number
  failedDownloads: number
  totalBytesDownloaded: number
  totalSize: number
  averageSpeed: number
}

interface DownloadFilters {
  state: 'all' | 'active' | 'completed' | 'failed' | 'cancelled'
  searchQuery: string
  sortBy: 'startedAt' | 'completedAt' | 'filename' | 'size' | 'speed'
  sortDirection: 'asc' | 'desc'
}

export function useDownloads() {
  const downloads = ref<Download[]>([])
  const settings = ref<DownloadSettings>({
    defaultPath: '',
    askForLocation: false,
    openWhenDone: false,
    autoOpenFile: false,
    notifyWhenDone: true,
    removeCompletedAfterDays: 30,
    maxConcurrentDownloads: 3,
    speedLimit: 0,
  })
  
  const filters = ref<DownloadFilters>({
    state: 'all',
    searchQuery: '',
    sortBy: 'startedAt',
    sortDirection: 'desc',
  }
  
  const isLoading = ref(false)
  const isPaused = ref(false)
  const selectedDownloads = ref<string[]>([])
  const showSettingsDialog = ref(false)
  const showHistoryDialog = ref(false)
  const downloadPath = ref('')

  const filteredDownloads = computed(() => {
    let result = downloads.value
    
    if (filters.value.state !== 'all') {
      result = result.filter(d => d.state === filters.value.state)
    }
    
    if (filters.value.searchQuery) {
      const q = filters.value.searchQuery.toLowerCase()
      result = result.filter(d => 
        d.filename.toLowerCase().includes(q) ||
        d.url.toLowerCase().includes(q)
      )
    }
    
    result.sort((a, b) => {
      let aVal: any = a[filters.value.sortBy]
      let bVal: any = b[filters.value.sortBy]
      
      if (filters.value.sortBy === 'startedAt' || filters.value.sortBy === 'completedAt') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      }
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }
      
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return filters.value.sortDirection === 'asc' ? comparison : -comparison
    })
    
    return result
  })

  const activeDownloads = computed(() => 
    downloads.value.filter(d => ['progressing', 'pending'].includes(d.state))
  )

  const completedDownloads = computed(() => 
    downloads.value.filter(d => d.state === 'completed')
  )

  const failedDownloads = computed(() => 
    downloads.value.filter(d => d.state === 'failed')
  )

  const stats = computed<DownloadStats>(() => {
    return {
      totalDownloads: downloads.value.length,
      activeDownloads: activeDownloads.value.length,
      completedDownloads: completedDownloads.value.length,
      failedDownloads: failedDownloads.value.length,
      totalBytesDownloaded: downloads.value.reduce((sum, d) => sum + d.receivedBytes, 0),
      totalSize: downloads.value.reduce((sum, d) => sum + d.totalBytes, 0),
      averageSpeed: activeDownloads.value.reduce((sum, d) => sum + (d.progress > 0 ? d.receivedBytes / ((Date.now() - new Date(d.startedAt).getTime()) / 1000) : 0), 0),
    }
  )

  const loadDownloads = async () => {
    try {
      const [loadedDownloads, loadedSettings] = await Promise.all([
        invoke<Download[]>('get_downloads'),
        invoke<any>('get_download_settings'),
      ])
      downloads.value = loadedDownloads
      settings.value = { ...settings.value, ...loadedSettings }
    } catch (err) {
      console.error('Failed to load downloads:', err)
    }
  }

  const startDownload = async (url: string, options?: { 
    filename?: string; 
    path?: string; 
    referrer?: string;
    headers?: Record<string, string>;
  }) => {
    try {
      const download = await invoke<Download>('start_download', { 
        url, 
        ...options 
      })
      downloads.value.unshift(download)
      return download
    } catch (err) {
      console.error('Failed to start download:', err)
      throw err
    }
  }

  const cancelDownload = async (id: string) => {
    try {
      await invoke('cancel_download', { id })
      const download = downloads.value.find(d => d.id === id)
      if (download) download.state = 'cancelled'
    } catch (err) {
      console.error('Failed to cancel download:', err)
    }
  }

  const pauseDownload = async (id: string) => {
    try {
      await invoke('pause_download', { id })
      const download = downloads.value.find(d => d.id === id)
      if (download) download.state = 'interrupted'
    } catch (err) {
      console.error('Failed to pause download:', err)
    }
  }

  const resumeDownload = async (id: string) => {
    try {
      await invoke('resume_download', { id })
      const download = downloads.value.find(d => d.id === id)
      if (download) download.state = 'pending'
    } catch (err) {
      console.error('Failed to resume download:', err)
    }
  }

  const retryDownload = async (id: string) => {
    try {
      const download = downloads.value.find(d => d.id === id)
      if (!download) return
      
      await invoke('retry_download', { id })
      download.state = 'pending'
      download.progress = 0
      download.receivedBytes = 0
      download.error = undefined
    } catch (err) {
      console.error('Failed to retry download:', err)
    }
  }

  const removeDownload = async (id: string) => {
    try {
      await invoke('remove_download', { id })
      downloads.value = downloads.value.filter(d => d.id !== id)
    } catch (err) {
      console.error('Failed to remove download:', err)
    }
  }

  const clearCompleted = async () => {
    if (!confirm('Remove all completed downloads from history?')) return
    
    try {
      const ids = completedDownloads.value.map(d => d.id)
      await invoke('clear_completed_downloads', { ids })
      downloads.value = downloads.value.filter(d => d.state !== 'completed')
    } catch (err) {
      console.error('Failed to clear completed downloads:', err)
    }
  }

  const clearAll = async () => {
    if (!confirm('Remove ALL downloads from history? This cannot be undone.')) return
    
    try {
      await invoke('clear_all_downloads')
      downloads.value = []
    } catch (err) {
      console.error('Failed to clear all downloads:', err)
    }
  }

  const pauseAll = async () => {
    for (const download of activeDownloads.value) {
      await pauseDownload(download.id)
    }
    isPaused.value = true
  }

  const resumeAll = async () => {
    for (const download of downloads.value) {
      if (download.state === 'interrupted') {
        await resumeDownload(download.id)
      }
    }
    isPaused.value = false
  }

  const cancelAll = async () => {
    for (const download of activeDownloads.value) {
      await cancelDownload(download.id)
    }
  }

  const openFile = async (id: string) => {
    try {
      await invoke('open_download_file', { id })
    } catch (err) {
      console.error('Failed to open file:', err)
    }
  }

  const showInFolder = async (id: string) => {
    try {
      await invoke('show_download_in_folder', { id })
    } catch (err) {
      console.error('Failed to show in folder:', err)
    }
  }

  const copyDownloadLink = async (id: string) => {
    const download = downloads.value.find(d => d.id === id)
    if (download) {
      await navigator.clipboard.writeText(download.url)
    }
  }

  const saveSettings = async () => {
    try {
      await invoke('save_download_settings', { settings: settings.value })
    } catch (err) {
      console.error('Failed to save download settings:', err)
    }
  }

  const loadSettings = async () => {
    try {
      const loaded = await invoke<any>('get_download_settings')
      settings.value = { ...settings.value, ...loaded }
    } catch (err) {
      console.error('Failed to load download settings:', err)
    }
  }

  const selectDownloadPath = async () => {
    try {
      const path = await invoke<string>('select_download_directory')
      if (path) {
        settings.value.downloadPath = path
        downloadPath.value = path
        await saveSettings()
      }
    } catch (err) {
      console.error('Failed to select download path:', err)
    }
  }

  const openDownloadFolder = async () => {
    try {
      const path = settings.value.defaultPath || await invoke<string>('get_default_download_path')
      await invoke('open_folder', { path })
    } catch (err) {
      console.error('Failed to open download folder:', err)
    }
  }

  const clearHistory = async () => {
    if (!confirm('Clear entire download history? This cannot be undone.')) return
    
    try {
      await invoke('clear_download_history')
      downloads.value = []
    } catch (err) {
      console.error('Failed to clear history:', err)
    }
  }

  const exportHistory = async () => {
    try {
      const data = await invoke<string>('export_download_history')
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `download-history-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export history:', err)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  const formatSpeed = (bytesPerSecond: number) => {
    return `${formatBytes(bytesPerSecond)}/s`
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`
  }

  const getStateColor = (state: Download['state']) => {
    switch (state) {
      case 'completed': return 'success'
      case 'failed': return 'error'
      case 'progressing': return 'primary'
      case 'pending': return 'warning'
      case 'cancelled': return 'secondary'
      case 'interrupted': return 'warning'
      default: return 'default'
    }
  }

  const getStateLabel = (state: Download['state']) => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      progressing: 'Downloading',
      completed: 'Completed',
      cancelled: 'Cancelled',
      interrupted: 'Paused',
      failed: 'Failed',
    }
    return labels[state] || state
  }

  onMounted(async () => {
    await loadDownloads()
  })

  return {
    downloads,
    settings,
    filters,
    isLoading,
    isPaused,
    selectedDownloads,
    showSettingsDialog,
    showHistoryDialog,
    downloadPath,
    filteredDownloads,
    activeDownloads,
    completedDownloads,
    failedDownloads,
    stats,
    loadDownloads,
    startDownload,
    cancelDownload,
    pauseDownload,
    resumeDownload,
    retryDownload,
    removeDownload,
    clearCompleted,
    clearAll,
    pauseAll,
    resumeAll,
    cancelAll,
    openFile,
    showInFolder,
    copyDownloadLink,
    saveSettings,
    loadSettings,
    selectDownloadPath,
    openDownloadFolder,
    clearHistory,
    exportHistory,
    formatBytes,
    formatSpeed,
    formatTime,
    getStateColor,
    getStateLabel,
  }
}