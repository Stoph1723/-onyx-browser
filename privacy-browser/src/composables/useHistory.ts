import { ref, computed, onMounted, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'

export interface HistoryEntry {
  id: string
  url: string
  title: string
  visitCount: number
  lastVisited: number
  firstVisited: number
  transition: string
}

interface HistoryFilters {
  query: string
  dateRange?: { start: number; end: number }
  domain?: string
}

export function useHistory() {
  const history = ref<HistoryEntry[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const filters = ref<HistoryFilters>({
    query: '',
    dateRange: undefined,
    domain: undefined
  })

  const filteredHistory = computed(() => {
    let result = history.value

    if (filters.value.query) {
      const query = filters.value.query.toLowerCase()
      result = result.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.url.toLowerCase().includes(query)
      )
    }

    if (filters.value.domain) {
      try {
        const domain = new URL(filters.value.domain).hostname
        result = result.filter(item => new URL(item.url).hostname === domain)
      } catch {}
    }

    if (filters.value.dateRange) {
      const { start, end } = filters.value.dateRange
      result = result.filter(item => 
        item.lastVisited >= start && item.lastVisited <= end
      )
    }

    return result.sort((a, b) => b.lastVisited - a.lastVisited)
  )

  const groupedByDate = computed(() => {
    const groups = new Map<string, HistoryEntry[]>()
    
    filteredHistory.value.forEach(entry => {
      const date = new Date(entry.lastVisited)
      const dateKey = date.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      
      if (!groups.has(dateKey)) {
        groups.set(dateKey, [])
      }
      groups.get(dateKey)!.push(entry)
    })
    
    return Array.from(groups.entries()).map(([date, entries]) => ({
      date,
      entries: entries.sort((a, b) => b.lastVisited - a.lastVisited)
    }))
  })

  const searchHistory = async (query: string) => {
    filters.value.query = query
    return filteredHistory.value
  }

  const clearHistory = async (options?: {
    startTime?: number
    endTime?: number
    domains?: string[]
  }) => {
    try {
      await invoke('clear_history', { options })
      await loadHistory()
    } catch (err) {
      console.error('Failed to clear history:', err)
      throw err
    }
  }

  const removeFromHistory = async (id: string) => {
    try {
      await invoke('remove_from_history', { id })
      history.value = history.value.filter(item => item.id !== id)
    } catch (err) {
      console.error('Failed to remove from history:', err)
      throw err
    }
  }

  const addVisit = async (url: string, title: string) => {
    try {
      await invoke('add_history_visit', { url, title })
      await loadHistory()
    } catch (err) {
      console.error('Failed to add visit:', err)
    }
  }

  const getVisitCount = (url: string): number => {
    return history.value.filter(item => item.url === url).reduce((sum, item) => sum + item.visitCount, 0)
  }

  const getMostVisited = (limit = 10): HistoryEntry[] => {
    return [...history.value]
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, limit)
  }

  const getRecentHistory = (limit = 50): HistoryEntry[] => {
    return [...history.value]
      .sort((a, b) => b.lastVisited - a.lastVisited)
      .slice(0, limit)
  }

  const getHistoryByDomain = (domain: string): HistoryEntry[] => {
    try {
      return history.value.filter(item => new URL(item.url).hostname === domain)
    } catch {
      return []
    }
  }

  const exportHistory = async (format: 'json' | 'html' | 'csv' = 'json'): Promise<string> => {
    try {
      return await invoke<string>('export_history', { format })
    } catch (err) {
      console.error('Failed to export history:', err)
      throw err
    }
  }

  const importHistory = async (data: string, format: 'json' | 'html' = 'json') => {
    try {
      await invoke('import_history', { data, format })
      await loadHistory()
    } catch (err) {
      console.error('Failed to import history:', err)
      throw err
    }
  }

  const getHistoryStats = () => {
    const totalVisits = history.value.reduce((sum, item) => sum + item.visitCount, 0)
    const uniqueUrls = history.value.length
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayVisits = history.value.filter(item => item.lastVisited >= today.getTime()).length
    const uniqueDomains = new Set(history.value.map(item => {
      try { return new URL(item.url).hostname } catch { return '' }
    })).size

    return {
      totalVisits,
      uniqueUrls,
      todayVisits,
      uniqueDomains
    }
  }

  const deleteOldHistory = async (daysOld: number) => {
    const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000
    await clearHistory({ endTime: cutoff })
  }

  const loadHistory = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      history.value = await invoke<HistoryEntry[]>('get_history')
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load history'
      console.error('Failed to load history:', err)
    } finally {
      isLoading.value = false
    }
  }

  onMounted(() => {
    loadHistory()
  })

  return {
    history,
    isLoading,
    error,
    filters,
    filteredHistory,
    groupedByDate,
    loadHistory,
    clearHistory,
    removeFromHistory,
    addVisit,
    getVisitCount,
    getMostVisited,
    getRecentHistory,
    getHistoryByDomain,
    exportHistory,
    importHistory,
    getHistoryStats,
    deleteOldHistory,
    searchHistory
  }
}