import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { invoke } from '@tauri-apps/api/core';

export interface ReaderModeState {
  isActive: boolean;
  content: string;
  title: string;
  author: string;
  publishedDate: string;
  readingTime: number;
  language: string;
  excerpt: string;
  wordCount: number;
}

export interface ReaderModeSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  theme: 'light' | 'dark' | 'sepia' | 'auto';
  maxWidth: number;
  showImages: boolean;
  showLinks: boolean;
  scrollPosition: number;
}

export interface ArticleMetadata {
  title: string;
  author?: string;
  publishedDate?: string;
  excerpt?: string;
  wordCount: number;
  readingTime: number;
  language: string;
  images: string[];
  links: string[];
}

export function useReaderMode() {
  const isActive = ref(false);
  const articleContent = ref('');
  const articleMetadata = ref<ArticleMetadata>({
    title: '',
    wordCount: 0,
    readingTime: 0,
    language: 'en',
    images: [],
    links: [],
  });
  const settings = ref<ReaderModeSettings>({
    fontSize: 18,
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    lineHeight: 1.7,
    theme: 'auto',
    maxWidth: 800,
    showImages: true,
    showLinks: true,
    scrollPosition: 0,
  });
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const showToolbar = ref(true);
  const toolbarTimeout = ref<number | null>(null);

  const themes = {
    light: {
      background: '#ffffff',
      text: '#1a1a2e',
      link: '#2563eb',
      border: '#e2e8f0',
      codeBg: '#f1f5f9',
      blockquoteBorder: '#3b82f6',
      hr: '#e2e8f0',
    },
    dark: {
      background: '#0f172a',
      text: '#f1f5f9',
      link: '#60a5fa',
      border: '#334155',
      codeBg: '#1e293b',
      blockquoteBorder: '#60a5fa',
      hr: '#334155',
    },
    sepia: {
      background: '#fdf4e3',
      text: '#433422',
      link: '#b45309',
      border: '#e7d5b5',
      codeBg: '#f5e6c8',
      blockquoteBorder: '#b45309',
      hr: '#e7d5b5',
    },
  };

  const currentTheme = computed(() => {
    if (settings.value.theme !== 'auto') return settings.value.theme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const themeColors = computed(() => themes[currentTheme.value]);

  const readerModeStyles = computed(() => {
    const t = themeColors.value;
    return {
      '--reader-bg': t.background,
      '--reader-text': t.text,
      '--reader-link': t.link,
      '--reader-border': t.border,
      '--reader-code-bg': t.codeBg,
      '--reader-blockquote-border': t.blockquoteBorder,
      '--reader-hr': t.hr,
    };
  });

  const wordCount = computed(() => {
    if (!articleContent.value) return 0;
    return articleContent.value.trim().split(/\s+/).filter(Boolean).length;
  });

  const readingTime = computed(() => Math.max(1, Math.ceil(wordCount.value / 200)));

  const applySettings = () => {
    const root = document.documentElement;
    Object.entries(readerModeStyles.value).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  };

  const enterReaderMode = async (url?: string) => {
    isLoading.value = true;
    error.value = null;
    
    try {
      const result = await invoke<{
        content: string;
        metadata: ArticleMetadata;
      }>('enter_reader_mode', { url: url || window.location.href });
      
      articleContent.value = result.content;
      articleMetadata.value = result.metadata;
      isActive.value = true;
      settings.value.scrollPosition = 0;
      
      await nextTick();
      applySettings();
      
      // Save settings
      saveSettings();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to enter reader mode';
      console.error('Failed to enter reader mode:', err);
    } finally {
      isLoading.value = false;
    }
  };

  const exitReaderMode = () => {
    isActive.value = false;
    articleContent.value = '';
    articleMetadata.value = {
      title: '',
      wordCount: 0,
      readingTime: 0,
      language: 'en',
      images: [],
      links: [],
    };
    error.value = null;
    settings.value.scrollPosition = 0;
  };

  const toggleReaderMode = (url?: string) => {
    if (isActive.value) {
      exitReaderMode();
    } else {
      enterReaderMode();
    }
  };

  const updateSetting = <K extends keyof ReaderModeSettings>(key: K, value: ReaderModeSettings[K]) => {
    settings.value[key] = value;
    applySettings();
    saveSettings();
  };

  const setFontSize = (size: number) => {
    settings.value.fontSize = Math.max(12, Math.min(28, size));
    saveSettings();
  };

  const setTheme = (theme: ReaderModeSettings['theme']) => {
    settings.value.theme = theme;
    applySettings();
    saveSettings();
  };

  const setFontFamily = (font: string) => {
    settings.value.fontFamily = font;
    saveSettings();
  };

  const setLineHeight = (height: number) => {
    settings.value.lineHeight = Math.max(1.2, Math.min(2.5, height));
    saveSettings();
  };

  const setMaxWidth = (width: number) => {
    settings.value.maxWidth = Math.max(400, Math.min(1200, width));
    saveSettings();
  };

  const toggleImages = () => {
    settings.value.showImages = !settings.value.showImages;
    saveSettings();
  };

  const toggleLinks = () => {
    settings.value.showLinks = !settings.value.showLinks;
    saveSettings();
  };

  const increaseFontSize = () => setFontSize(settings.value.fontSize + 1);
  const decreaseFontSize = () => setFontSize(settings.value.fontSize - 1);

  const saveSettings = () => {
    try {
      localStorage.setItem('reader-mode-settings', JSON.stringify(settings.value));
    } catch (err) {
      console.error('Failed to save reader mode settings:', err);
    }
  };

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('reader-mode-settings');
      if (saved) {
        settings.value = { ...settings.value, ...JSON.parse(saved) };
      }
    } catch (err) {
      console.error('Failed to load reader mode settings:', err);
    }
  };

  const printArticle = () => {
    window.print();
  };

  const saveAsPDF = async () => {
    try {
      await invoke('reader_mode_save_pdf', {
        content: articleContent.value,
        metadata: articleMetadata.value,
        settings: settings.value,
      });
    } catch (err) {
      console.error('Failed to save as PDF:', err);
    }
  };

  const shareArticle = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: articleMetadata.value.title,
          text: articleMetadata.value.excerpt,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
  };

  const saveScrollPosition = () => {
    if (isActive.value) {
      settings.value.scrollPosition = window.scrollY;
    }
  };

  const restoreScrollPosition = () => {
    if (isActive.value && settings.value.scrollPosition > 0) {
      window.scrollTo(0, settings.value.scrollPosition);
    }
  };

  const showToolbarTemporarily = () => {
    showToolbar.value = true;
    if (toolbarTimeout.value) {
      clearTimeout(toolbarTimeout.value);
    }
    toolbarTimeout.value = window.setTimeout(() => {
      showToolbar.value = false;
    }, 3000);
  };

  const handleScroll = () => {
    saveScrollPosition();
    showToolbarTemporarily();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isActive.value) return;
    
    if (e.key === 'Escape') {
      exitReaderMode();
    } else if (e.key === '+' || (e.key === '=' && e.ctrlKey)) {
      e.preventDefault();
      increaseFontSize();
    } else if (e.key === '-' && e.ctrlKey) {
      e.preventDefault();
      decreaseFontSize();
    } else if (e.key === '0' && e.ctrlKey) {
      e.preventDefault();
      updateSetting('fontSize', 18);
    } else if (e.key === 't' && e.ctrlKey) {
      e.preventDefault();
      const themes: ReaderModeSettings['theme'][] = ['light', 'dark', 'sepia', 'auto'];
      const currentIndex = themes.indexOf(settings.value.theme);
      updateSetting('theme', themes[(currentIndex + 1) % themes.length]);
    }
  };

  onMounted(() => {
    loadSettings();
    applySettings();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousemove', showToolbarTemporarily);
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applySettings);
  });

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('mousemove', showToolbarTemporarily);
    window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', applySettings);
    
    if (toolbarTimeout.value) {
      clearTimeout(toolbarTimeout.value);
    }
  });

  watch(() => settings.value.theme, applySettings);
  watch(() => isActive.value, (active) => {
    if (active) {
      restoreScrollPosition();
    } else {
      saveScrollPosition();
    }
  });

  return {
    isActive,
    isLoading,
    error,
    articleContent,
    articleMetadata,
    settings,
    showToolbar,
    themes: ['light', 'dark', 'sepia', 'auto'] as const,
    currentTheme,
    themeColors,
    wordCount,
    readingTime,
    enterReaderMode,
    exitReaderMode,
    toggleReaderMode,
    updateSetting,
    setFontSize,
    setTheme,
    setFontFamily,
    setLineHeight,
    setMaxWidth,
    toggleImages,
    toggleLinks,
    increaseFontSize,
    decreaseFontSize,
    printArticle,
    saveAsPDF,
    shareArticle,
    copyLink,
    showToolbarTemporarily,
    applySettings,
  };
}