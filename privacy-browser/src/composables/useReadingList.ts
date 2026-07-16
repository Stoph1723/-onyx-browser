<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { invoke } from '@tauri-apps/api/core';

interface ReadingListItem {
  id: string;
  url: string;
  title: string;
  excerpt: string;
  favicon: string;
  addedAt: number;
  read: boolean;
  readingTime: number;
  tags: string[];
  archived: boolean;
}

interface ReadingProgress {
  itemId: string;
  scrollPosition: number;
  totalScrollHeight: number;
  progressPercent: number;
  lastReadAt: number;
}

interface ReadingStats {
  totalItems: number;
  unreadItems: number;
  readItems: number;
  archivedItems: number;
  totalReadingTime: number;
  averageReadingTime: number;
  itemsThisWeek: number;
  itemsThisMonth: number;
}

interface ReaderViewState {
  isOpen: boolean;
  itemId: string | null;
  fontSize: number;
  lineHeight: number;
  theme: 'light' | 'dark' | 'sepia' | 'auto';
  fontFamily: string;
  maxWidth: number;
  showImages: boolean;
  showLinks: boolean;
  scrollPosition: number;
  readingMode: 'scroll' | 'paginate';
}

export function useReadingList() {
  const items = ref<ReadingListItem[]>([]);
  const progress = ref<Map<string, ReadingProgress>>(new Map());
  const stats = ref<ReadingStats>({
    totalItems: 0,
    unreadItems: 0,
    readItems: 0,
    archivedItems: 0,
    totalReadingTime: 0,
    averageReadingTime: 0,
    itemsThisWeek: 0,
    itemsThisMonth: 0,
  });

  const readerView = ref<ReaderViewState>({
    isOpen: false,
    itemId: null,
    fontSize: 18,
    lineHeight: 1.7,
    theme: 'auto',
    fontFamily: 'Georgia, serif',
    maxWidth: 800,
    showImages: true,
    showLinks: true,
    scrollPosition: 0,
    readingMode: 'scroll',
  });

  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const searchQuery = ref('');
  const filter = ref<'all' | 'unread' | 'read' | 'archived'>('all');
  const sortBy = ref<'addedAt' | 'readingTime' | 'progress' | 'title'>('addedAt');
  const sortOrder = ref<'asc' | 'desc'>('desc');

  const filteredItems = computed(() => {
    let result = items.value;

    // Filter
    if (filter.value === 'unread') {
      result = result.filter(item => !item.read);
    } else if (filter.value === 'read') {
      result = result.filter(item => item.read);
    } else if (filter.value === 'archived') {
      result = result.filter(item => item.archived);
    }

    // Search
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.excerpt.toLowerCase().includes(query) ||
        item.url.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy.value) {
        case 'addedAt':
          comparison = b.addedAt - a.addedAt;
          break;
        case 'readingTime':
          comparison = b.readingTime - a.readingTime;
          break;
        case 'progress':
          const aProgress = progress.value.get(a.id)?.progressPercent || 0;
          const bProgress = progress.value.get(b.id)?.progressPercent || 0;
          comparison = bProgress - aProgress;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
      }
      return sortOrder.value === 'asc' ? comparison : -comparison;
    });

    return result;
  };

  const unreadItems = computed(() => items.value.filter(i => !i.read && !i.archived));
  const readItems = computed(() => items.value.filter(i => i.read && !i.archived));
  const archivedItems = computed(() => items.value.filter(i => i.archived));

  const addToReadingList = async (options: {
    url: string;
    title?: string;
    excerpt?: string;
    favicon?: string;
    tags?: string[];
  }) => {
    try {
      const item = await invoke<ReadingListItem>('add_to_reading_list', {
        url: options.url,
        title: options.title,
        excerpt: options.excerpt,
        favicon: options.favicon,
        tags: options.tags || [],
      });
      
      items.value.unshift(item);
      updateStats();
      return item;
    } catch (err) {
      console.error('Failed to add to reading list:', err);
      throw err;
    }
  };

  const addCurrentPage = async () => {
    // This would be called from the browser context
    try {
      const item = await invoke<ReadingListItem>('add_current_page_to_reading_list');
      items.value.unshift(item);
      updateStats();
      return item;
    } catch (err) {
      console.error('Failed to add current page:', err);
      throw err;
    }
  };

  const removeFromReadingList = async (itemId: string) => {
    try {
      await invoke('remove_from_reading_list', { itemId });
      items.value = items.value.filter(item => item.id !== itemId);
      updateStats();
    } catch (err) {
      console.error('Failed to remove from reading list:', err);
      throw err;
    }
  };

  const markAsRead = async (itemId: string, read: boolean = true) => {
    const item = items.value.find(i => i.id === itemId);
    if (!item) return;

    try {
      await invoke('mark_reading_list_item', { itemId, read });
      item.read = read;
      updateStats();
    } catch (err) {
      console.error('Failed to mark as read:', err);
      throw err;
    }
  };

  const toggleRead = async (itemId: string) => {
    const item = items.value.find(i => i.id === itemId);
    if (item) {
      await markAsRead(itemId, !item.read);
    }
  };

  const archiveItem = async (itemId: string, archived: boolean = true) => {
    const item = items.value.find(i => i.id === itemId);
    if (!item) return;

    try {
      await invoke('archive_reading_list_item', { itemId, archived });
      item.archived = archived;
      updateStats();
    } catch (err) {
      console.error('Failed to archive item:', err);
      throw err;
    }
  };

  const addTags = async (itemId: string, tags: string[]) => {
    const item = items.value.find(i => i.id === itemId);
    if (!item) return;

    try {
      await invoke('add_reading_list_tags', { itemId, tags });
      item.tags = [...new Set([...item.tags, ...tags])];
    } catch (err) {
      console.error('Failed to add tags:', err);
      throw err;
    }
  };

  const removeTag = async (itemId: string, tag: string) => {
    const item = items.value.find(i => i.id === itemId);
    if (!item) return;

    try {
      await invoke('remove_reading_list_tag', { itemId, tag });
      item.tags = item.tags.filter(t => t !== tag);
    } catch (err) {
      console.error('Failed to remove tag:', err);
      throw err;
    }
  };

  const updateProgress = async (itemId: string, scrollPosition: number, totalHeight: number) => {
    const progressPercent = totalHeight > 0 ? Math.min(100, Math.round((scrollPosition / totalHeight) * 100)) : 0;
    
    const progressData: ReadingProgress = {
      itemId,
      scrollPosition,
      totalScrollHeight: totalHeight,
      progressPercent,
      lastReadAt: Date.now(),
    };

    progress.value.set(itemId, progressData);

    // Debounce save
    saveProgressDebounced(itemId, progressData);
  };

  const saveProgressDebounced = (() => {
    let timeoutId: number | null = null;
    return (itemId: string, progressData: ReadingProgress) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = window.setTimeout(async () => {
        try {
          await invoke('save_reading_progress', { itemId, progress: progressData });
        } catch (err) {
          console.error('Failed to save progress:', err);
        }
      }, 1000);
    };
  })();

  const getProgress = (itemId: string): ReadingProgress | undefined => {
    return progress.value.get(itemId);
  };

  const openInReader = async (itemId: string) => {
    try {
      const item = items.value.find(i => i.id === itemId);
      if (!item) return;

      const content = await invoke<string>('get_reading_list_content', { itemId });
      
      readerView.value = {
        ...readerView.value,
        isOpen: true,
        itemId,
        scrollPosition: 0,
      };

      // Mark as read when opening
      if (!items.value.find(i => i.id === itemId)?.read) {
        await markAsRead(itemId, true);
      }

      return content;
    } catch (err) {
      console.error('Failed to open in reader:', err);
      throw err;
    }
  };

  const closeReader = () => {
    if (readerView.value.itemId) {
      // Save progress before closing
      const progress = progress.value.get(readerView.value.itemId!);
      if (progress) {
        await invoke('save_reading_progress', { itemId: readerView.value.itemId, progress });
      }
    }
    
    readerView.value = {
      ...readerView.value,
      isOpen: false,
      itemId: null,
      scrollPosition: 0,
    };
  };

  const updateReaderSettings = (settings: Partial<ReaderViewState>) => {
    readerView.value = { ...readerView.value, ...settings };
    saveReaderSettings();
  };

  const saveReaderSettings = () => {
    try {
      localStorage.setItem('reader-settings', JSON.stringify(readerView.value));
    } catch (err) {
      console.error('Failed to save reader settings:', err);
    }
  };

  const loadReaderSettings = () => {
    try {
      const saved = localStorage.getItem('reader-settings');
      if (saved) {
        readerView.value = { ...readerView.value, ...JSON.parse(saved) };
      }
    } catch (err) {
      console.error('Failed to load reader settings:', err);
    }
  };

  const exportReadingList = async (format: 'json' | 'html' | 'markdown' = 'json') => {
    try {
      const data = await invoke<string>('export_reading_list', { format });
      
      const blob = new Blob([data], { 
        type: format === 'json' ? 'application/json' : format === 'html' ? 'text/html' : 'text/markdown' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reading-list-${Date.now()}.${format === 'json' ? 'json' : format === 'html' ? 'html' : 'md'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export reading list:', err);
      throw err;
    }
  };

  const importReadingList = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.items || !Array.isArray(data.items)) {
        throw new Error('Invalid reading list format');
      }

      let imported = 0;
      for (const item of data.items) {
        try {
          await invoke('add_to_reading_list', {
            url: item.url,
            title: item.title,
            excerpt: item.excerpt,
            favicon: item.favicon,
            tags: item.tags || [],
          });
          imported++;
        } catch (err) {
          console.error('Failed to import item:', err);
        }
      }

      await loadItems();
      return imported;
    } catch (err) {
      console.error('Failed to import reading list:', err);
      throw err;
    }
  };

  const getReadingStats = async () => {
    try {
      stats.value = await invoke<ReadingStats>('get_reading_stats');
    } catch (err) {
      console.error('Failed to get reading stats:', err);
    }
  };

  const searchItems = async (query: string) => {
    try {
      return await invoke<ReadingListItem[]>('search_reading_list', { query });
    } catch (err) {
      console.error('Failed to search:', err);
      return [];
    }
  };

  const getRecommendations = async (limit = 10) => {
    try {
      return await invoke<ReadingListItem[]>('get_reading_recommendations', { limit });
    } catch (err) {
      console.error('Failed to get recommendations:', err);
      return [];
    }
  };

  const syncReadingList = async () => {
    try {
      await invoke('sync_reading_list');
      await loadItems();
      await getReadingStats();
    } catch (err) {
      console.error('Failed to sync reading list:', err);
      throw err;
    }
  };

  const updateStats = () => {
    stats.value = {
      totalItems: items.value.length,
      unreadItems: items.value.filter(i => !i.read && !i.archived).length,
      readItems: items.value.filter(i => i.read && !i.archived).length,
      archivedItems: items.value.filter(i => i.archived).length,
      totalReadingTime: items.value.reduce((sum, i) => sum + i.readingTime, 0),
      averageReadingTime: items.value.length > 0 
        ? items.value.reduce((sum, i) => sum + i.readingTime, 0) / items.value.length 
        : 0,
      itemsThisWeek: items.value.filter(i => i.addedAt > Date.now() - 7 * 24 * 60 * 60 * 1000).length,
      itemsThisMonth: items.value.filter(i => i.addedAt > Date.now() - 30 * 24 * 60 * 60 * 1000).length,
    };
  };

  const loadItems = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      const [loadedItems, loadedProgress] = await Promise.all([
        invoke<ReadingListItem[]>('get_reading_list_items'),
        invoke<Record<string, ReadingProgress>>('get_reading_progress'),
      ]);

      items.value = loadedItems;
      progress.value = new Map(Object.entries(loadedProgress));
      updateStats();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load reading list';
      console.error('Failed to load items:', err);
    } finally {
      isLoading.value = false;
    }
  };

  const formatReadingTime = (ms: number) => {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.round((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  const getProgressColor = (progress: number) => {
    if (progress === 0) return 'var(--fg-tertiary)';
    if (progress < 25) return 'var(--color-error-500)';
    if (progress < 50) return 'var(--color-warning-500)';
    if (progress < 75) return 'var(--color-brand-500)';
    return 'var(--color-success-500)';
  };

  onMounted(async () => {
    await loadItems();
    await getReadingStats();
    loadReaderSettings();
  });

  onUnmounted(() => {
    // Cleanup
  });

  return {
    items,
    progress,
    stats,
    readerView,
    isLoading,
    error,
    searchQuery,
    filter,
    sortBy,
    sortOrder,
    filteredItems,
    unreadItems,
    readItems,
    archivedItems,
    addToReadingList,
    addCurrentPage,
    removeFromReadingList,
    markAsRead,
    toggleRead,
    archiveItem,
    addTags,
    removeTag,
    updateProgress,
    getProgress,
    openInReader,
    closeReader,
    updateReaderSettings,
    exportReadingList,
    importReadingList,
    getReadingStats,
    searchItems,
    getRecommendations,
    syncReadingList,
    formatReadingTime,
    formatDate,
    getProgressColor,
    readerView,
    items,
    progress,
    stats,
  };
}