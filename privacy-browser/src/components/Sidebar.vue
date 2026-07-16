import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useSidePanel } from '../composables/useSidePanel'

interface Props {
  activePanel: 'bookmarks' | 'history' | 'downloads' | 'extensions' | 'ai' | 'reading-list'
  width: number
}

interface Emits {
  close: []
  'update:width': [width: number]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const activePanel = ref(props.activePanel)
const searchQuery = ref('')

const bookmarks = ref<Bookmark[]>([])
const history = ref<HistoryEntry[]>([])
const downloads = ref<Download[]>([])
const extensions = ref<Extension[]>([])

interface Bookmark {
  id: string
  title: string
  url: string
  folder?: string
  createdAt: number
}

interface HistoryEntry {
  id: string
  title: string
  url: string
  visitedAt: number
  visitCount: number
}

interface Download {
  id: string
  filename: string
  url: string
  progress: number
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted'
  totalBytes: number
  receivedBytes: number
}

interface Extension {
  id: string
  name: string
  version: string
  enabled: boolean
  description: string
  permissions: string[]
}

const loadData = async () => {
  try {
    [bookmarks.value, history.value, downloads.value, extensions.value] = await Promise.all([
      invoke<Bookmark[]>('get_bookmarks'),
      invoke<HistoryEntry[]>('get_history'),
      invoke<Download[]>('get_downloads'),
      invoke<Extension[]>('get_extensions'),
    ])
  } catch (error) {
    console.error('Failed to load sidebar data:', error)
  }
}

const filteredBookmarks = computed(() => 
  bookmarks.value.filter(b => 
    b.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    b.url.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)

const filteredHistory = computed(() =>
  history.value.filter(h =>
    h.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    h.url.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)

const openBookmark = (bookmark: Bookmark) => {
  window.dispatchEvent(new CustomEvent('sidebar-navigate', { detail: bookmark.url }))
}

const openHistory = (entry: HistoryEntry) => {
  window.dispatchEvent(new CustomEvent('sidebar-navigate', { detail: entry.url }))
}

const removeBookmark = async (id: string) => {
  try {
    await invoke('remove_bookmark', { id })
    loadData()
  } catch (error) {
    console.error('Failed to remove bookmark:', error)
  }
}

const clearHistory = async () => {
  try {
    await invoke('clear_history')
    loadData()
  } catch (error) {
    console.error('Failed to clear history:', error)
  }
}

const toggleExtension = async (extension: Extension) => {
  try {
    await invoke('toggle_extension', { id: extension.id, enabled: !extension.enabled })
    loadData()
  } catch (error) {
    console.error('Failed to toggle extension:', error)
  }
}

const handleResize = (e: MouseEvent) => {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = props.width
  
  const onMouseMove = (moveEvent: MouseEvent) => {
    const newWidth = Math.max(240, Math.min(480, startWidth + (moveEvent.clientX - startX)))
    emit('update:width', newWidth)
  }
  
  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
  
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const formatUrl = (url: string) => {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return date.toLocaleDateString()
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const cancelDownload = async (id: string) => {
  try {
    await invoke('cancel_download', { id })
    loadData()
  } catch (error) {
    console.error('Failed to cancel download:', error)
  }
}

const openDownload = async (id: string) => {
  try {
    await invoke('open_download', { id })
  } catch (error) {
    console.error('Failed to open download:', error)
  }
}

const panels = [
  { id: 'bookmarks', label: 'Bookmarks', icon: BookmarksIcon },
  { id: 'history', label: 'History', icon: HistoryIcon },
  { id: 'downloads', label: 'Downloads', icon: DownloadsIcon },
  { id: 'extensions', label: 'Extensions', icon: ExtensionsIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon }
] as const

function BookmarksIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function HistoryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

function DownloadsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function ExtensionsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="2" y="2" width="20" height="20" rx="2" ry="2"/>
      <path d="M15 15v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4"/>
      <polyline points="10 9 14 9 14 5"/>
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

const activePanelLabel = computed(() => {
  const panel = panels.find(p => p.id === activePanel.value)
  return panel?.label || ''
}

const filteredBookmarks = computed(() => 
  bookmarks.value.filter(b => 
    b.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    b.url.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)

const filteredHistory = computed(() =>
  history.value.filter(h =>
    h.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    h.url.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)

const filteredDownloads = computed(() => 
  downloads.value.filter(d => 
    d.filename.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    d.url.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)

const filteredExtensions = computed(() => 
  extensions.value.filter(e => 
    e.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    e.description.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)

const formatUrl = (url: string) => {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return date.toLocaleDateString()
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const cancelDownload = async (id: string) => {
  try {
    await invoke('cancel_download', { id })
    loadData()
  } catch (error) {
    console.error('Failed to cancel download:', error)
  }
}

const openDownload = async (id: string) => {
  try {
    await invoke('open_download', { id })
  } catch (error) {
    console.error('Failed to open download:', error)
  }
}

const clearHistory = async () => {
  try {
    await invoke('clear_history')
    loadData()
  } catch (error) {
    console.error('Failed to clear history:', error)
  }
}

const toggleExtension = async (extension: Extension) => {
  try {
    await invoke('toggle_extension', { id: extension.id, enabled: !extension.enabled })
    loadData()
  } catch (error) {
    console.error('Failed to toggle extension:', error)
  }
}

const loadData = async () => {
  try {
    [bookmarks.value, history.value, downloads.value, extensions.value] = await Promise.all([
      invoke<Bookmark[]>('get_bookmarks'),
      invoke<HistoryEntry[]>('get_history'),
      invoke<Download[]>('get_downloads'),
      invoke<Extension[]>('get_extensions'),
    ])
  } catch (error) {
    console.error('Failed to load sidebar data:', error)
  }
}

const handleResize = (e: MouseEvent) => {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = props.width
  
  const onMouseMove = (moveEvent: MouseEvent) => {
    const newWidth = Math.max(240, Math.min(480, startWidth + (moveEvent.clientX - startX)))
    emit('update:width', newWidth)
  }
  
  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
  
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const panels = [
  { id: 'bookmarks', label: 'Bookmarks', icon: BookmarksIcon },
  { id: 'history', label: 'History', icon: HistoryIcon },
  { id: 'downloads', label: 'Downloads', icon: DownloadsIcon },
  { id: 'extensions', label: 'Extensions', icon: ExtensionsIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
] as const

onMounted(() => {
  loadData()
  window.addEventListener('sidebar-open', loadData)
})

onUnmounted(() => {
  window.removeEventListener('sidebar-open', loadData)
})

const Bookmark = ({ bookmark, onRemove }: { bookmark: Bookmark; onRemove: (id: string) => void }) => (
  <div class="bookmark-item" onClick={() => window.dispatchEvent(new CustomEvent('sidebar-navigate', { detail: bookmark.url }))}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
    <span class="bookmark-title">{bookmark.title}</span>
    <button class="remove-btn" onClick={(e) => { e.stopPropagation(); onRemove(bookmark.id) }} title="Remove">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  </div>
)

const BookmarkFolder = ({ folder, bookmarks, onOpen, onRemove }: { folder: { name: string; bookmarks: Bookmark[] }; bookmarks: Bookmark[]; onOpen: (bookmark: Bookmark) => void; onRemove: (id: string) => void }) => {
  const [expanded, setExpanded] = useState(true)
  return (
    <div class="bookmark-folder">
      <div class="bookmark-folder-header" onClick={() => setExpanded(!expanded)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="folder-icon" className={expanded ? 'folder-icon-open' : ''}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <span>{folder.name}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" className="folder-chevron">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
      <div className={expanded ? 'bookmark-folder-content' : 'bookmark-folder-content hidden'}>
        {bookmarks.map(bookmark => (
          <Bookmark key={bookmark.id} bookmark={bookmark} onRemove={onRemove} />
        ))}
      </div>
    </div>
  )
}

const HistoryEntry = ({ entry, onOpen }: { entry: HistoryEntry; onOpen: (entry: HistoryEntry) => void }) => (
  <div className="history-item" onClick={() => onOpen(entry)}>
    <div className="history-info">
      <span className="history-title">{entry.title}</span>
      <span className="history-url">{formatUrl(entry.url)}</span>
    </div>
    <span className="history-time">{formatTime(entry.visitedAt)}</span>
  </div>
)

const DownloadItem = ({ download, onCancel, onOpen }: { download: Download; onCancel: (id: string) => void; onOpen: (id: string) => void }) => (
  <div className="download-item">
    <div className="download-info">
      <div className="download-filename">{download.filename}</div>
      <div className="download-url">{download.url}</div>
      <div className="download-progress" style={{ display: download.state === 'progressing' ? 'flex' : 'none' }}>
        <div className="progress-bar" style={{ width: download.progress + '%' }}></div>
        <span className="progress-text">{formatBytes(download.receivedBytes)} / {formatBytes(download.totalBytes)}</span>
      </div>
      <div className="download-status" style={{ display: download.state !== 'progressing' ? 'block' : 'none' }}>{download.state}</div>
    </div>
    {download.state === 'progressing' && <button className="cancel-btn" onClick={() => onCancel(download.id)}>Cancel</button>}
    {download.state === 'completed' && <button className="open-btn" onClick={() => onOpen(download.id)}>Open</button>}
  </div>
)

const ExtensionItem = ({ ext, onToggle }: { ext: Extension; onToggle: (ext: Extension) => void }) => (
  <div className="extension-item">
    <div className="extension-info">
      <h4>{ext.name}</h4>
      <p>{ext.description}</p>
      <span className="extension-version">v{ext.version}</span>
    </div>
    <label className="toggle-switch">
      <input type="checkbox" checked={ext.enabled} onChange={() => onToggle(ext)} />
      <span className="toggle-slider" />
    </label>
  </div>
)
</script>

<template>
  <div class="sidebar" :style="{ width: props.width + 'px' }">
    <div class="sidebar-header">
      <h2>Sidebar</h2>
      <button class="close-btn" @click="emit('close')" aria-label="Close sidebar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    
    <div class="sidebar-tabs">
      <button
        v-for="panel in panels"
        :key="panel.id"
        class="sidebar-tab"
        :class="{ active: activePanel === panel.id }"
        @click="activePanel = panel.id"
      >
        <component :is="panel.icon" />
        <span>{{ panel.label }}</span>
      </button>
    </div>
    
    <div class="sidebar-search">
      <input
        type="text"
        v-model="searchQuery"
        :placeholder="'Search ' + activePanelLabel + '...'"
        class="search-input"
      >
    </div>
    
    <div class="sidebar-content">
      <!-- Bookmarks Panel -->
      <div v-if="activePanel === 'bookmarks'" class="panel">
        <div class="panel-header">
          <h3>Bookmarks</h3>
          <button class="add-btn" @click="addBookmark" title="Add bookmark (Ctrl+D)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
        <div class="bookmarks-tree">
          <BookmarkFolder
            v-for="folder in getBookmarkFolders()"
            :key="folder.name"
            :folder="folder"
            :bookmarks="getBookmarksInFolder(folder.name)"
            @open="openBookmark"
            @remove="removeBookmark"
          />
          <div v-for="bookmark in getRootBookmarks()" :key="bookmark.id" class="bookmark-item" @click="openBookmark(bookmark)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            <span class="bookmark-title">{{ bookmark.title }}</span>
            <button class="remove-btn" @click.stop="removeBookmark(bookmark.id)" title="Remove">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <!-- History Panel -->
      <div v-if="activePanel === 'history'" class="panel">
        <div class="panel-header">
          <h3>History</h3>
          <button class="clear-btn" @click="clearHistory" title="Clear history">Clear</button>
        </div>
        <div class="history-list">
          <div 
            v-for="entry in filteredHistory" 
            :key="entry.id" 
            class="history-item"
            @click="openHistory(entry)"
          >
            <div class="history-info">
              <span class="history-title">{{ entry.title }}</span>
              <span class="history-url">{{ formatUrl(entry.url) }}</span>
            </div>
            <span class="history-time">{{ formatTime(entry.visitedAt) }}</span>
          </div>
        </div>
      </div>
      
      <!-- Downloads Panel -->
      <div v-if="activePanel === 'downloads'" class="panel">
        <div class="panel-header">
          <h3>Downloads</h3>
        </div>
        <div class="downloads-list">
          <DownloadItem 
            v-for="download in downloads" 
            :key="download.id" 
            :download="download"
            @cancel="cancelDownload"
            @open="openDownload"
          />
        </div>
      </div>
      
      <!-- Extensions Panel -->
      <div v-if="activePanel === 'extensions'" class="panel">
        <div class="panel-header">
          <h3>Extensions</h3>
        </div>
        <div class="extensions-list">
          <ExtensionItem 
            v-for="ext in extensions" 
            :key="ext.id" 
            :ext="ext"
            @toggle="toggleExtension"
          />
        </div>
      </div>
    </div>
    
    <div class="resize-handle" @mousedown="handleResize" title="Resize sidebar"></div>
  </div>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-primary);
  position: relative;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 12px;
  border-bottom: 1px solid var(--border-primary);
}

.sidebar-header h2 {
  font-size: 14px;
  font-weight: 600;
  color: var(--fg-primary);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--fg-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--fg-primary);
}

.sidebar-tabs {
  display: flex;
  padding: 4px;
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-tertiary);
}

.sidebar-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--fg-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.sidebar-tab:hover {
  background: var(--bg-secondary);
  color: var(--fg-primary);
}

.sidebar-tab.active {
  background: var(--bg-primary);
  color: var(--color-brand-500);
}

.sidebar-search {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-primary);
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--fg-primary);
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s;
}

.search-input:focus {
  border-color: var(--border-focus);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-primary);
}

.panel-header h3 {
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-primary);
}

.add-btn, .clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--fg-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}

.add-btn:hover, .clear-btn:hover {
  background: var(--color-brand-500);
  color: white;
}

.bookmarks-tree {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bookmark-folder {
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  overflow: hidden;
}

.bookmark-folder-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  cursor: pointer;
  user-select: none;
}

.bookmark-folder-header:hover {
  background: var(--bg-primary);
}

.bookmark-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 4px;
  color: var(--fg-primary);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.bookmark-item:hover {
  background: var(--bg-tertiary);
}

.bookmark-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: transparent.
  color: var(--fg-secondary).
  cursor: pointer.
  opacity: 0.
  transition: all 0.15s.
  flex-shrink: 0.
}

.bookmark-item:hover .remove-btn {
  opacity: 1.
}

.remove-btn:hover {
  background: var(--color-brand-500).
  color: white.
}

.history-list, .downloads-list, .extensions-list {
  display: flex.
  flex-direction: column.
  gap: 4px.
}

.history-item {
  display: flex.
  align-items: center.
  justify-content: space-between.
  padding: 8px 12px.
  border-radius: 6px.
  cursor: pointer.
  transition: background 0.15s.
}

.history-item:hover {
  background: var(--bg-tertiary).
}

.history-info {
  flex: 1.
  min-width: 0.
  display: flex.
  flex-direction: column.
  gap: 2px.
}

.history-title {
  font-size: 13px.
  font-weight: 500.
  color: var(--fg-primary).
  overflow: hidden.
  text-overflow: ellipsis.
  white-space: nowrap.
}

.history-url {
  font-size: 11px.
  color: var(--fg-secondary).
  overflow: hidden.
  text-overflow: ellipsis.
  white-space: nowrap.
}

.history-time {
  font-size: 11px.
  color: var(--fg-secondary).
  flex-shrink: 0.
  margin-left: 12px.
}

.download-item {
  display: flex.
  align-items: center.
  justify-content: space-between.
  padding: 10px 12px.
  border-radius: 6px.
  background: var(--bg-tertiary).
}

.download-info {
  flex: 1.
  min-width: 0.
}

.download-filename {
  font-size: 13px.
  font-weight: 500.
  color: var(--fg-primary).
  overflow: hidden.
  text-overflow: ellipsis.
  white-space: nowrap.
}

.download-url {
  font-size: 11px.
  color: var(--fg-secondary).
  overflow: hidden.
  text-overflow: ellipsis.
  white-space: nowrap.
}

.download-progress {
  display: flex.
  align-items: center.
  gap: 8px.
  margin-top: 6px.
}

.progress-bar {
  flex: 1.
  height: 4px.
  background: var(--bg-primary).
  border-radius: 2px.
  overflow: hidden.
}

.progress-bar::after {
  content: ''.
  display: block.
  width: 100%.
  height: 100%.
  background: var(--color-brand-500).
}

.progress-text {
  font-size: 11px.
  color: var(--fg-secondary).
}

.download-status {
  font-size: 11px.
  color: var(--fg-secondary).
  margin-top: 6px.
}

.cancel-btn, .open-btn {
  padding: 6px 12px.
  border: none.
  border-radius: 4px.
  background: var(--color-brand-500).
  color: white.
  font-size: 11px.
  font-weight: 500.
  cursor: pointer.
  transition: opacity 0.15s.
}

.cancel-btn:hover, .open-btn:hover {
  opacity: 0.9.
}

.extension-item {
  display: flex.
  align-items: center.
  justify-content: space-between.
  padding: 12px.
  border-radius: 8px.
  background: var(--bg-tertiary).
}

.extension-info h4 {
  font-size: 13px.
  font-weight: 600.
  color: var(--fg-primary).
  margin-bottom: 4px.
}

.extension-info p {
  font-size: 11px.
  color: var(--fg-secondary).
  margin-bottom: 4px.
}

.extension-version {
  font-size: 10px.
  color: var(--fg-tertiary).
}

.toggle-switch {
  position: relative.
  width: 44px.
  height: 24px.
}

.toggle-switch input {
  opacity: 0.
  width: 0.
  height: 0.
}

.toggle-slider {
  position: absolute.
  inset: 0.
  background: var(--border-primary).
  border-radius: 12px.
  transition: 0.3s.
}

.toggle-slider:before {
  content: ''.
  position: absolute.
  width: 18px.
  height: 18px.
  left: 3px.
  top: 3px.
  background: white.
  border-radius: 50%.
  transition: 0.3s.
  box-shadow: 0 2px 4px rgba(0,0,0,0.2).
}

.toggle-switch input:checked + .toggle-slider {
  background: var(--color-brand-500).
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(20px).
}

.toggle-switch input:focus-visible + .toggle-slider {
  outline: 2px solid var(--color-brand-500).
  outline-offset: 2px.
}

.resize-handle {
  position: absolute.
  top: 0.
  right: 0.
  width: 4px.
  height: 100%.
  cursor: col-resize.
  background: transparent.
}

.resize-handle:hover {
  background: var(--color-brand-500).
}
</style>