import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { invoke } from '@tauri-apps/api/core'

interface SidePanelState {
  isOpen: boolean
  activePanel: 'bookmarks' | 'history' | 'downloads' | 'extensions' | 'ai' | 'reading-list'
  width: number
  collapsedWidth: number
  position: 'left' | 'right'
  autoHide: boolean
}

interface SidePanelTab {
  id: string
  label: string
  icon: string
  component: string
  enabled: boolean
  badge?: number | string
}

export function useSidePanel() {
  const state = ref<SidePanelState>({
    isOpen: false,
    activePanel: 'bookmarks',
    width: 320,
    collapsedWidth: 48,
    position: 'right',
    autoHide: false,
  })

  const tabs = ref<SidePanelTab[]>([
    { id: 'bookmarks', label: 'Bookmarks', icon: '📚', component: 'BookmarksPanel', enabled: true },
    { id: 'history', label: 'History', icon: '🕐', component: 'HistoryPanel', enabled: true, badge: 0 },
    { id: 'downloads', label: 'Downloads', icon: '⬇️', component: 'DownloadsPanel', enabled: true, badge: 0 },
    { id: 'extensions', label: 'Extensions', icon: '🧩', component: 'ExtensionsPanel', enabled: true },
    { id: 'ai', label: 'AI Assistant', icon: '🤖', component: 'AIPanel', enabled: false },
    { id: 'notes', label: 'Notes', icon: '📝', component: 'NotesPanel', enabled: true },
    { id: 'reading-list', label: 'Reading List', icon: '📖', component: 'ReadingListPanel', enabled: true, badge: 0 },
  ])

  const isCollapsed = computed(() => !state.value.isOpen)
  const panelWidth = computed(() => state.value.isOpen ? state.value.width : state.value.collapsedWidth)
  const panelStyle = computed(() => ({
    width: `${panelWidth.value}px`,
    transform: state.value.position === 'right' ? 'translateX(0)' : 'translateX(0)',
  }))

  const bookmarks = ref<any[]>([])
  const history = ref<any[]>([])
  const downloads = ref<any[]>([])
  const readingList = ref<any[]>([])
  const notes = ref<any[]>([])

  const isLoading = ref(false)

  const openPanel = (panelId?: string) => {
    state.value.isOpen = true
    if (panelId && tabs.value.find(t => t.id === panelId)) {
      state.value.activePanel = panelId as any
    }
  }

  const closePanel = () => {
    state.value.isOpen = false
  }

  const togglePanel = () => {
    state.value.isOpen = !state.value.isOpen
  }

  const setActivePanel = (panelId: string) => {
    if (tabs.value.find(t => t.id === panelId)) {
      state.value.activePanel = panelId as any
      state.value.isOpen = true
    }
  }

  const setPosition = (position: 'left' | 'right') => {
    state.value.position = position
  }

  const setWidth = (width: number) => {
    state.value.width = Math.max(240, Math.min(600, width))
  }

  const toggleAutoHide = () => {
    state.value.autoHide = !state.value.autoHide
  }

  const startResize = (e: MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = state.value.width
    const position = state.value.position
    
    const handleMouseMove = (e: MouseEvent) => {
      let newWidth = startWidth
      if (position === 'left') {
        newWidth = startWidth + (e.clientX - startX)
      } else {
        newWidth = startWidth - (e.clientX - startX)
      }
      setWidth(newWidth)
    }
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const loadPanelData = async (panelId: string) => {
    isLoading.value = true
    try {
      switch (panelId) {
        case 'bookmarks':
          bookmarks.value = await invoke<any[]>('get_bookmarks')
          break
        case 'history':
          history.value = await invoke<any[]>('get_history')
          break
        case 'downloads':
          downloads.value = await invoke<any[]>('get_downloads')
          break
        case 'reading-list':
          readingList.value = await invoke<any[]>('get_reading_list')
          break
        case 'notes':
          notes.value = await invoke<any[]>('get_notes')
          break
      }
    } catch (err) {
      console.error(`Failed to load ${panelId}:`, err)
    } finally {
      isLoading.value = false
    }
  }

  const addBookmark = async (bookmark: { title: string; url: string; folder?: string }) => {
    try {
      await invoke('add_bookmark', { bookmark })
      await loadPanelData('bookmarks')
    } catch (err) {
      console.error('Failed to add bookmark:', err)
    }
  }

  const removeBookmark = async (id: string) => {
    try {
      await invoke('remove_bookmark', { id })
      await loadPanelData('bookmarks')
    } catch (err) {
      console.error('Failed to remove bookmark:', err)
    }
  }

  const addToReadingList = async (url: string, title: string) => {
    try {
      await invoke('add_to_reading_list', { url, title })
      await loadPanelData('reading-list')
    } catch (err) {
      console.error('Failed to add to reading list:', err)
    }
  }

  const removeFromReadingList = async (id: string) => {
    try {
      await invoke('remove_from_reading_list', { id })
      await loadPanelData('reading-list')
    } catch (err) {
      console.error('Failed to remove from reading list:', err)
    }
  }

  const addNote = async (note: { title: string; content: string; tags?: string[] }) => {
    try {
      await invoke('add_note', { note })
      await loadPanelData('notes')
    } catch (err) {
      console.error('Failed to add note:', err)
    }
  }

  const updateNote = async (id: string, note: { title: string; content: string; tags?: string[] }) => {
    try {
      await invoke('update_note', { id, note })
      await loadPanelData('notes')
    } catch (err) {
      console.error('Failed to update note:', err)
    }
  }

  const deleteNote = async (id: string) => {
    try {
      await invoke('delete_note', { id })
      await loadPanelData('notes')
    } catch (err) {
      console.error('Failed to delete note:', err)
    }
  }

  const clearHistory = async () => {
    if (!confirm('Clear all browsing history?')) return
    try {
      await invoke('clear_history')
      await loadPanelData('history')
    } catch (err) {
      console.error('Failed to clear history:', err)
    }
  }

  const clearDownloads = async () => {
    if (!confirm('Clear all downloads history?')) return
    try {
      await invoke('clear_downloads')
      await loadPanelData('downloads')
    } catch (err) {
      console.error('Failed to clear downloads:', err)
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && state.value.isOpen) {
      closePanel()
    } else if (e.ctrlKey && e.shiftKey && e.key === 'B') {
      togglePanel()
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown)
    loadPanelData(state.value.activePanel)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })

  watch(() => state.value.activePanel, (newPanel) => {
    loadPanelData(newPanel)
  })

  return {
    state,
    tabs,
    bookmarks,
    history,
    downloads,
    readingList,
    notes,
    isLoading,
    isCollapsed: computed(() => !state.value.isOpen),
    panelWidth: computed(() => state.value.isOpen ? state.value.width : state.value.collapsedWidth),
    activeTabs: computed(() => tabs.value.filter(t => t.enabled)),
    openPanel,
    closePanel,
    togglePanel,
    setActivePanel,
    setPosition,
    setWidth,
    toggleAutoHide,
    startResize,
    loadPanelData,
    addBookmark,
    removeBookmark,
    addToReadingList,
    removeFromReadingList,
    addNote,
    updateNote,
    deleteNote,
    clearHistory,
    clearDownloads,
  }
}