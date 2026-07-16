import { ref, computed, watch, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'

interface Bookmark {
  id: string
  title: string
  url: string
  folder?: string
  createdAt: number
  updatedAt: number
  favicon?: string
  tags?: string[]
}

interface BookmarkFolder {
  id: string
  name: string
  parentId?: string
  children: string[]
  createdAt: number
}

export function useBookmarks() {
  const bookmarks = ref<Bookmark[]>([])
  const folders = ref<BookmarkFolder[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const loadBookmarks = async () => {
    isLoading.value = true
    try {
      const [loadedBookmarks, loadedFolders] = await Promise.all([
        invoke<Bookmark[]>('get_bookmarks'),
        invoke<BookmarkFolder[]>('get_bookmark_folders')
      ])
      bookmarks.value = loadedBookmarks
      folders.value = loadedFolders
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load bookmarks'
      console.error('Failed to load bookmarks:', err)
    } finally {
      isLoading.value = false
    }
  }

  const getAllBookmarks = () => bookmarks.value

  const getBookmarksByFolder = (folderId?: string) => {
    if (!folderId) {
      return bookmarks.value.filter(b => !b.folder)
    }
    return bookmarks.value.filter(b => b.folder === folderId)
  }

  const getRootFolders = () => folders.value.filter(f => !f.parentId)

  const getChildFolders = (parentId: string) => 
    folders.value.filter(f => f.parentId === parentId)

  const getFolderTree = () => {
    const roots = getRootFolders()
    const buildTree = (folder: BookmarkFolder) => ({
      ...folder,
      children: getChildFolders(folder.id).map(buildTree)
    })
    return roots.map(buildTree)
  }

  const addBookmark = async (bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newBookmark: Bookmark = {
        ...bookmark,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      await invoke('add_bookmark', { bookmark: newBookmark })
      bookmarks.value.unshift(newBookmark)
      return newBookmark
    } catch (err) {
      console.error('Failed to add bookmark:', err)
      throw err
    }
  }

  const updateBookmark = async (id: string, updates: Partial<Bookmark>) => {
    try {
      const bookmark = bookmarks.value.find(b => b.id === id)
      if (!bookmark) throw new Error('Bookmark not found')
      
      Object.assign(bookmark, updates, { updatedAt: Date.now() })
      await invoke('update_bookmark', { id, updates })
      return bookmark
    } catch (err) {
      console.error('Failed to update bookmark:', err)
      throw err
    }
  }

  const removeBookmark = async (id: string) => {
    try {
      await invoke('remove_bookmark', { id })
      bookmarks.value = bookmarks.value.filter(b => b.id !== id)
    } catch (err) {
      console.error('Failed to remove bookmark:', err)
      throw err
    }
  }

  const addFolder = async (folder: Omit<BookmarkFolder, 'id' | 'createdAt'>) => {
    try {
      const newFolder: BookmarkFolder = {
        ...folder,
        id: crypto.randomUUID(),
        createdAt: Date.now()
      }
      await invoke('add_bookmark_folder', { folder: newFolder })
      folders.value.push(newFolder)
      return newFolder
    } catch (err) {
      console.error('Failed to add folder:', err)
      throw err
    }
  }

  const updateFolder = async (id: string, updates: Partial<BookmarkFolder>) => {
    try {
      const folder = folders.value.find(f => f.id === id)
      if (!folder) throw new Error('Folder not found')
      
      Object.assign(folder, updates)
      await invoke('update_bookmark_folder', { id, updates })
      return folder
    } catch (err) {
      console.error('Failed to update folder:', err)
      throw err
    }
  }

  const removeFolder = async (id: string) => {
    try {
      await invoke('remove_bookmark_folder', { id })
      folders.value = folders.value.filter(f => f.id !== id)
      // Also remove bookmarks in this folder
      bookmarks.value = bookmarks.value.filter(b => b.folder !== id)
    } catch (err) {
      console.error('Failed to remove folder:', err)
      throw err
    }
  }

  const moveBookmark = async (bookmarkId: string, folderId?: string) => {
    try {
      const bookmark = bookmarks.value.find(b => b.id === bookmarkId)
      if (!bookmark) throw new Error('Bookmark not found')
      
      bookmark.folder = folderId
      bookmark.updatedAt = Date.now()
      await invoke('move_bookmark', { bookmarkId, folderId })
    } catch (err) {
      console.error('Failed to move bookmark:', err)
      throw err
    }
  }

  const importBookmarks = async (bookmarks: Bookmark[]) => {
    try {
      let imported = 0
      for (const bookmark of bookmarks) {
        await addBookmark(bookmark)
        imported++
      }
      return imported
    } catch (err) {
      console.error('Failed to import bookmarks:', err)
      throw err
    }
  }

  const exportBookmarks = (): Bookmark[] => {
    return bookmarks.value
  }

  const searchBookmarks = (query: string): Bookmark[] => {
    const lowerQuery = query.toLowerCase()
    return bookmarks.value.filter(b => 
      b.title.toLowerCase().includes(lowerQuery) ||
      b.url.toLowerCase().includes(lowerQuery) ||
      b.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
  }

  onMounted(() => {
    loadBookmarks()
  })

  return {
    bookmarks,
    folders,
    isLoading,
    error,
    loadBookmarks,
    getAllBookmarks,
    getBookmarksByFolder,
    getRootFolders,
    getChildFolders,
    getFolderTree,
    addBookmark,
    updateBookmark,
    removeBookmark,
    addFolder,
    updateFolder,
    removeFolder,
    moveBookmark,
    importBookmarks,
    exportBookmarks,
    searchBookmarks
  }
}