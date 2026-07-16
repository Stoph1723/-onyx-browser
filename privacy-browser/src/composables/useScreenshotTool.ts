import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { invoke } from '@tauri-apps/api/core';

interface ScreenshotOptions {
  type: 'visible' | 'full-page' | 'area' | 'element';
  format: 'png' | 'jpg' | 'webp';
  quality: number;
  includeUI: boolean;
  delay: number;
  filename?: string;
}

interface ScreenshotResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  format: string;
  timestamp: number;
  url: string;
  title: string;
}

interface Annotation {
  id: string;
  type: 'rect' | 'circle' | 'arrow' | 'line' | 'text' | 'blur' | 'highlight';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
}

interface ScreenshotHistoryItem {
  id: string;
  dataUrl: string;
  thumbnail: string;
  metadata: ScreenshotResult;
  annotations: Annotation[];
  createdAt: number;
}

export function useScreenshotTool() {
  const isCapturing = ref(false);
  const captureMode = ref<'visible' | 'full-page' | 'area' | 'element'>('visible');
  const isAnnotating = ref(false);
  const annotations = ref<Annotation[]>([]);
  const history = ref<ScreenshotHistoryItem[]>([]);
  const currentScreenshot = ref<ScreenshotResult | null>(null);
  const isAnnotated = ref(false);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const settings = ref({
    format: 'png' as 'png' | 'jpg' | 'webp',
    quality: 0.9,
    includeUI: false,
    delay: 0,
    autoSave: true,
    saveToDisk: true,
    copyToClipboard: true,
    showNotification: true,
    filenamePattern: 'screenshot-{timestamp}-{title}',
    maxHistory: 50,
    annotationColor: '#ef4444',
    annotationStrokeWidth: 2,
    defaultAnnotationType: 'rect' as Annotation['type'],
  });

  const annotationTools = [
    { type: 'rect', label: 'Rectangle', icon: '⬜' },
    { type: 'circle', label: 'Circle', icon: '⭕' },
    { type: 'arrow', label: 'Arrow', icon: '➡️' },
    { type: 'line', label: 'Line', icon: '➖' },
    { type: 'text', label: 'Text', icon: '📝' },
    { type: 'blur', label: 'Blur', icon: '🌫️' },
    { type: 'highlight', label: 'Highlight', icon: '🖍️' },
  ];

  const selectedTool = ref<Annotation['type']>('rect');
  const currentAnnotation = ref<Annotation | null>(null);
  const isDrawing = ref(false);
  const drawStart = ref<{ x: number; y: number } | null>(null);

  const recentScreenshots = computed(() => history.value.slice(0, 10));
  const totalScreenshots = computed(() => history.value.length);
  const totalStorage = computed(() => {
    return history.value.reduce((sum, item) => {
      const byteLength = item.dataUrl.length * 0.75; // base64 overhead
      return sum + byteLength;
    }, 0);
  });

  const captureScreenshot = async (options?: Partial<ScreenshotOptions>) => {
    isLoading.value = true;
    error.value = null;

    try {
      const opts: ScreenshotOptions = {
        type: captureMode.value,
        format: settings.value.format,
        quality: settings.value.quality,
        includeUI: settings.value.includeUI,
        delay: settings.value.delay,
        filename: settings.value.filenamePattern
          .replace('{timestamp}', new Date().toISOString().replace(/[:.]/g, '-'))
          .replace('{title}', document.title.replace(/[^a-zA-Z0-9]/g, '-')),
        ...options,
      };

      const result = await invoke<ScreenshotResult>('capture_screenshot', { options: opts });
      
      currentScreenshot.value = result;
      isAnnotated.value = false;

      // Add to history
      const historyItem: ScreenshotHistoryItem = {
        id: crypto.randomUUID(),
        dataUrl: result.dataUrl,
        thumbnail: await generateThumbnail(result.dataUrl),
        metadata: result,
        annotations: [],
        createdAt: Date.now(),
      };

      history.value.unshift(historyItem);
      
      // Trim history
      if (history.value.length > settings.value.maxHistory) {
        history.value = history.value.slice(0, settings.value.maxHistory);
      }

      // Auto-save
      if (settings.value.autoSave) {
        await saveToDisk(historyItem);
      }

      // Copy to clipboard
      if (settings.value.copyToClipboard) {
        await copyToClipboard(result.dataUrl);
      }

      // Show notification
      if (settings.value.showNotification) {
        showNotification('Screenshot captured', 'success');
      }

      // Enter annotation mode if requested
      if (options?.annotate) {
        enterAnnotationMode();
      }

      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Screenshot failed';
      console.error('Screenshot failed:', err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const captureVisible = () => captureScreenshot({ type: 'visible' });
  const captureFullPage = () => captureScreenshot({ type: 'full-page' });
  const captureArea = () => captureScreenshot({ type: 'area' });
  const captureElement = (selector: string) => captureScreenshot({ type: 'element', elementSelector: selector });

  const enterAnnotationMode = () => {
    isAnnotating.value = true;
    currentAnnotated.value = true;
    selectedTool.value = settings.value.defaultAnnotationType;
  };

  const exitAnnotationMode = () => {
    isAnnotating.value = false;
    currentAnnotated.value = false;
    currentAnnotation.value = null;
    isDrawing.value = false;
    drawStart.value = null;
  };

  const saveAnnotatedScreenshot = async () => {
    if (!currentScreenshot.value) return;

    try {
      // Apply annotations to the screenshot
      const annotatedDataUrl = await applyAnnotations(
        currentScreenshot.value.dataUrl,
        annotations.value
      );

      const result: ScreenshotResult = {
        ...currentScreenshot.value,
        dataUrl: annotatedDataUrl,
      };

      // Update current
      currentScreenshot.value = result;
      currentScreenshot.value.dataUrl = annotatedDataUrl;

      // Update history
      const historyIndex = history.value.findIndex(h => h.metadata.timestamp === currentScreenshot.value!.timestamp);
      if (historyIndex >= 0) {
        history.value[historyIndex].dataUrl = annotatedDataUrl;
        history.value[historyIndex].thumbnail = await generateThumbnail(annotatedDataUrl);
        history.value[historyIndex].annotations = [...annotations.value];
      }

      // Save to disk
      if (settings.value.autoSave) {
        await saveToDisk({
          ...history.value[historyIndex],
          dataUrl: annotatedDataUrl,
          metadata: result,
        });
      }

      // Copy to clipboard
      if (settings.value.copyToClipboard) {
        await copyToClipboard(annotatedDataUrl);
      }

      showNotification('Annotated screenshot saved', 'success');
      exitAnnotationMode();

      return result;
    } catch (err) {
      console.error('Failed to save annotated screenshot:', err);
      throw err;
    }
  };

  const discardAnnotations = () => {
    annotations.value = [];
    exitAnnotationMode();
  };

  const undoAnnotation = () => {
    if (annotations.value.length > 0) {
      annotations.value.pop();
    }
  };

  const clearAnnotations = () => {
    annotations.value = [];
  };

  const selectTool = (tool: Annotation['type']) => {
    selectedTool.value = tool;
  };

  const startDrawing = (e: MouseEvent) => {
    if (!isAnnotating.value) return;
    
    isDrawing.value = true;
    drawStart.value = { x: e.offsetX, y: e.offsetY };
    
    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      type: selectedTool.value,
      x: e.offsetX,
      y: e.offsetY,
      width: 0,
      height: 0,
      color: settings.value.annotationColor,
      strokeWidth: settings.value.annotationStrokeWidth,
    };

    currentAnnotation.value = newAnnotation;
    annotations.value.push(newAnnotation);
  };

  const updateDrawing = (e: MouseEvent) => {
    if (!isDrawing.value || !drawStart.value || !currentAnnotation.value) return;

    const x = e.offsetX;
    const y = e.offsetY;
    const startX = drawStart.value.x;
    const startY = drawStart.value.y;

    currentAnnotation.value.x = Math.min(startX, x);
    currentAnnotation.value.y = Math.min(startY, y);
    currentAnnotation.value.width = Math.abs(x - startX);
    currentAnnotation.value.height = Math.abs(y - startY);
  };

  const stopDrawing = () => {
    if (isDrawing.value && currentAnnotation.value) {
      // For text tool, prompt for text
      if (currentAnnotation.value.type === 'text') {
        const text = prompt('Enter text:');
        if (text) {
          currentAnnotation.value.text = text;
          currentAnnotation.value.fontSize = currentAnnotation.value.fontSize || 14;
          currentAnnotation.value.fontFamily = currentAnnotation.value.fontFamily || 'system-ui, sans-serif';
        } else {
          // Remove empty text annotation
          annotations.value = annotations.value.filter(a => a.id !== currentAnnotation!.id);
        }
      }
    }
    
    isDrawing.value = false;
    drawStart.value = null;
    currentAnnotation.value = null;
  };

  const addTextAnnotation = (x: number, y: number, text: string) => {
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      type: 'text',
      x,
      y,
      width: 0,
      height: 0,
      color: settings.value.annotationColor,
      strokeWidth: settings.value.annotationStrokeWidth,
      text,
      fontSize: 14,
      fontFamily: 'system-ui, sans-serif',
    };
    
    annotations.value.push(annotation);
  };

  const deleteAnnotation = (id: string) => {
    annotations.value = annotations.value.filter(a => a.id !== id);
  };

  const copyScreenshot = async (dataUrl?: string) => {
    const url = dataUrl || currentScreenshot.value?.dataUrl;
    if (!url) return;

    try {
      await copyToClipboard(url);
      showNotification('Copied to clipboard', 'success');
    } catch (err) {
      console.error('Failed to copy:', err);
      showNotification('Failed to copy to clipboard', 'error');
    }
  };

  const downloadScreenshot = async (dataUrl?: string, filename?: string) => {
    const url = dataUrl || currentScreenshot.value?.dataUrl;
    if (!url) return;

    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `screenshot-${Date.now()}.${settings.value.format}`;
      link.click();
      showNotification('Screenshot downloaded', 'success');
    } catch (err) {
      console.error('Failed to download:', err);
      showNotification('Failed to download', 'error');
    }
  };

  const saveToDisk = async (item: ScreenshotHistoryItem) => {
    try {
      await invoke('save_screenshot', {
        dataUrl: item.dataUrl,
        filename: item.metadata.filename || `screenshot-${item.createdAt}.${settings.value.format}`,
        metadata: item.metadata,
      });
      showNotification('Saved to disk', 'success');
    } catch (err) {
      console.error('Failed to save to disk:', err);
    }
  };

  const deleteScreenshot = async (id: string) => {
    const index = history.value.findIndex(h => h.id === id);
    if (index === -1) return;

    try {
      await invoke('delete_screenshot', { id });
      history.value.splice(index, 1);
      showNotification('Screenshot deleted', 'success');
    } catch (err) {
      console.error('Failed to delete:', err);
      showNotification('Failed to delete', 'error');
    }
  };

  const clearHistory = async () => {
    if (!confirm('Clear all screenshot history?')) return;

    try {
      await invoke('clear_screenshot_history');
      history.value = [];
      showNotification('History cleared', 'success');
    } catch (err) {
      console.error('Failed to clear history:', err);
      showNotification('Failed to clear history', 'error');
    }
  };

  const exportHistory = async () => {
    const data = JSON.stringify(history.value, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screenshot-history-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importHistory = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid history format');
      }

      for (const item of data) {
        if (item.id && item.dataUrl && item.metadata) {
          history.value.unshift(item);
        }
      }

      history.value = history.value.slice(0, settings.value.maxHistory);
      showNotification(`Imported ${data.length} screenshots`, 'success');
    } catch (err) {
      console.error('Failed to import:', err);
      showNotification('Failed to import', 'error');
    }
  };

  const generateThumbnail = async (dataUrl: string, maxSize = 200): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png', 0.7));
      };
      img.src = dataUrl;
    });
  };

  const applyAnnotations = async (dataUrl: string, annotations: Annotation[]): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        
        ctx.drawImage(img, 0, 0);

        for (const annotation of annotations) {
          ctx.strokeStyle = annotation.color;
          ctx.lineWidth = annotation.strokeWidth;
          ctx.fillStyle = annotation.color;
          ctx.font = `${annotation.fontSize || 14}px ${annotation.fontFamily || 'system-ui, sans-serif'}`;

          switch (annotation.type) {
            case 'rect':
              ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
              break;
            case 'circle':
              ctx.beginPath();
              ctx.ellipse(
                annotation.x + annotation.width / 2,
                annotation.y + annotation.height / 2,
                annotation.width / 2,
                annotation.height / 2,
                0, 0, Math.PI * 2
              );
              ctx.stroke();
              break;
            case 'arrow':
              drawArrow(ctx, annotation.x, annotation.y, annotation.x + annotation.width, annotation.y + annotation.height);
              break;
            case 'line':
              ctx.beginPath();
              ctx.moveTo(annotation.x, annotation.y);
              ctx.lineTo(annotation.x + annotation.width, annotation.y + annotation.height);
              ctx.stroke();
              break;
            case 'text':
              ctx.fillText(annotation.text || '', annotation.x, annotation.y);
              break;
            case 'blur':
              // Would apply a blur filter to the region
              break;
            case 'highlight':
              ctx.globalAlpha = 0.3;
              ctx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
              ctx.globalAlpha = 1;
              break;
          }
        }

        resolve(canvas.toDataURL('image/png', 0.9));
      };
      img.src = dataUrl;
    });
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  const copyToClipboard = async (dataUrl: string) => {
    const blob = await (await fetch(dataUrl)).blob();
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // This would integrate with the app's notification system
    console.log(`[${type}] ${message}`);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTimeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  onMounted(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('screenshot-settings');
    if (saved) {
      try {
        settings.value = { ...settings.value, ...JSON.parse(saved) };
      } catch (e) {}
    }

    // Load history from backend
    loadHistory();

    // Keyboard shortcuts
    document.addEventListener('keydown', handleGlobalKeydown);
  });

  onUnmounted(() => {
    document.removeEventListener('keydown', handleGlobalKeydown);
  });

  const handleGlobalKeydown = (e: KeyboardEvent) => {
    // Ctrl+Shift+S for screenshot
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      captureScreenshot();
    }
    
    // Ctrl+Shift+A for area capture
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      captureArea();
    }
    
    // Ctrl+Shift+F for full page
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      captureFullPage();
    }
    
    // Escape to exit annotation mode
    if (e.key === 'Escape' && isAnnotating.value) {
      exitAnnotationMode();
    }
  };

  const loadHistory = async () => {
    try {
      const loaded = await invoke<ScreenshotHistoryItem[]>('get_screenshot_history');
      history.value = loaded;
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const saveSettings = () => {
    localStorage.setItem('screenshot-settings', JSON.stringify(settings.value));
  };

  watch(settings, saveSettings, { deep: true });

  return {
    // State
    isCapturing,
    captureMode,
    isAnnotating,
    annotations,
    history,
    currentScreenshot,
    isAnnotated,
    isLoading,
    error,
    settings,
    annotationTools,
    selectedTool,
    currentAnnotation,
    isDrawing,
    drawStart,

    // Computed
    recentScreenshots,
    totalScreenshots,
    totalStorage,

    // Core actions
    captureScreenshot,
    captureVisible,
    captureFullPage,
    captureArea,
    captureElement,

    // Annotation
    enterAnnotationMode,
    exitAnnotationMode,
    saveAnnotatedScreenshot,
    discardAnnotations,
    undoAnnotation,
    clearAnnotations,
    selectTool,
    startDrawing,
    updateDrawing,
    stopDrawing,
    addTextAnnotation,
    deleteAnnotation,

    // Management
    copyScreenshot,
    downloadScreenshot,
    saveToDisk,
    deleteScreenshot,
    clearHistory,
    exportHistory,
    importHistory,

    // Settings
    settings,
    saveSettings,

    // Utils
    formatFileSize,
    formatTimeAgo,
  };
}