import { ref, computed, onMounted, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';

export interface DevToolsState {
  isOpen: boolean;
  activePanel: string;
  position: 'bottom' | 'right' | 'left' | 'detached';
  dockSide: 'bottom' | 'right';
  height: number;
  width: number;
}

export interface DevToolsPanel {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
}

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  statusText: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  timing: {
    startTime: number;
    dnsStart: number;
    dnsEnd: number;
    connectStart: number;
    connectEnd: number;
    tlsStart: number;
    tlsEnd: number;
    requestStart: number;
    responseStart: number;
    responseEnd: number;
  };
  resourceType: string;
  initiator: string;
  size: number;
  fromCache: boolean;
  blocked: boolean;
  blockedReason?: string;
}

export interface ConsoleMessage {
  id: string;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
  line: number;
  column: number;
  timestamp: number;
  stackTrace?: string;
}

export interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  size?: number;
  transferSize?: number;
  encodedBodySize?: number;
  decodedBodySize?: number;
  resourceType?: string;
}

export interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  documents: number;
  nodes: number;
  listeners: number;
}

export function useDevTools() {
  const state = ref<DevToolsState>({
    isOpen: false,
    activePanel: 'elements',
    position: 'bottom',
    dockSide: 'bottom',
    height: 300,
    width: 400,
  });

  const panels = ref<DevToolsPanel[]>([
    { id: 'elements', label: 'Elements', icon: '📄', enabled: true },
    { id: 'console', label: 'Console', icon: '📟', enabled: true },
    { id: 'sources', label: 'Sources', icon: '📁', enabled: true },
    { id: 'network', label: 'Network', icon: '🌐', enabled: true },
    { id: 'performance', label: 'Performance', icon: '📊', enabled: true },
    { id: 'memory', label: 'Memory', icon: '💾', enabled: true },
    { id: 'application', label: 'Application', icon: '📦', enabled: true },
    { id: 'security', label: 'Security', icon: '🔒', enabled: true },
    { id: 'privacy', label: 'Privacy', icon: '🕵️', enabled: true },
  ]);

  const networkRequests = ref<NetworkRequest[]>([]);
  const consoleMessages = ref<ConsoleMessage[]>([]);
  const performanceEntries = ref<PerformanceEntry[]>([]);
  const memorySnapshots = ref<MemorySnapshot[]>([]);
  
  const networkFilter = ref<string>('');
  const networkFilterType = ref<'all' | 'document' | 'stylesheet' | 'script' | 'image' | 'font' | 'media' | 'manifest' | 'websocket' | 'other'>('all');
  const consoleFilterLevel = ref<'all' | 'log' | 'info' | 'warn' | 'error' | 'debug'>('all');
  const consoleFilterText = ref('');
  
  const isRecording = ref(false);
  const recordingStartTime = ref<number>(0);
  
  const selectedRequest = ref<NetworkRequest | null>(null);
  const selectedMessage = ref<ConsoleMessage | null>(null);

  const filteredNetworkRequests = computed(() => {
    let result = networkRequests.value;
    
    if (networkFilter.value) {
      const q = networkFilter.value.toLowerCase();
      result = result.filter(r => 
        r.url.toLowerCase().includes(q) ||
        r.method.toLowerCase().includes(q) ||
        r.status.toString().includes(q)
      );
    }
    
    if (networkFilterType.value !== 'all') {
      result = result.filter(r => r.resourceType === networkFilterType.value);
    }
    
    return result;
  });

  const filteredConsoleMessages = computed(() => {
    let result = consoleMessages.value;
    
    if (consoleFilterLevel.value !== 'all') {
      result = result.filter(m => m.level === consoleFilterLevel.value);
    }
    
    if (consoleFilterText.value) {
      const q = consoleFilterText.value.toLowerCase();
      result = result.filter(m => 
        m.message.toLowerCase().includes(q) ||
        m.source.toLowerCase().includes(q)
      );
    }
    
    return result;
  });

  const networkStats = computed(() => {
    const requests = networkRequests.value;
    return {
      total: requests.length,
      completed: requests.filter(r => r.status >= 200 && r.status < 400).length,
      failed: requests.filter(r => r.status >= 400 || r.status === 0).length,
      blocked: requests.filter(r => r.blocked).length,
      fromCache: requests.filter(r => r.fromCache).length,
      totalSize: requests.reduce((sum, r) => sum + r.size, 0),
      totalTime: requests.reduce((sum, r) => sum + (r.timing.responseEnd - r.timing.startTime), 0),
    };
  };

  const openDevTools = async (panel: string = 'elements') => {
    state.value.isOpen = true;
    state.value.activePanel = panel;
    try {
      await invoke('open_devtools', { panel });
    } catch (err) {
      console.error('Failed to open devtools:', err);
    }
  };

  const closeDevTools = async () => {
    state.value.isOpen = false;
    try {
      await invoke('close_devtools');
    } catch (err) {
      console.error('Failed to close devtools:', err);
    }
  };

  const toggleDevTools = async (panel?: string) => {
    if (state.value.isOpen) {
      await closeDevTools();
    } else {
      await openDevTools(panel);
    }
  };

  const setActivePanel = async (panelId: string) => {
    const panel = panels.value.find(p => p.id === panelId);
    if (panel && panel.enabled) {
      state.value.activePanel = panelId;
      try {
        await invoke('devtools_set_panel', { panel: panelId });
      } catch (err) {
        console.error('Failed to set panel:', err);
      }
    }
  };

  const setDockSide = async (side: 'bottom' | 'right') => {
    state.value.dockSide = side;
    state.value.position = side;
    try {
      await invoke('devtools_set_dock', { side });
    } catch (err) {
      console.error('Failed to set dock side:', err);
    }
  };

  const setHeight = async (height: number) => {
    state.value.height = Math.max(150, Math.min(height, window.innerHeight - 100));
    try {
      await invoke('devtools_set_height', { height: state.value.height });
    } catch (err) {
      console.error('Failed to set height:', err);
    }
  };

  const setWidth = async (width: number) => {
    state.value.width = Math.max(300, Math.min(width, window.innerWidth - 100));
    try {
      await invoke('devtools_set_width', { width: state.value.width });
    } catch (err) {
      console.error('Failed to set width:', err);
    }
  };

  const clearNetwork = () => {
    networkRequests.value = [];
    selectedRequest.value = null;
    invoke('devtools_clear_network');
  };

  const clearConsole = () => {
    consoleMessages.value = [];
    selectedMessage.value = null;
    invoke('devtools_clear_console');
  };

  const clearPerformance = () => {
    performanceEntries.value = [];
    invoke('devtools_clear_performance');
  };

  const startRecording = async () => {
    isRecording.value = true;
    recordingStartTime.value = Date.now();
    performanceEntries.value = [];
    await invoke('devtools_start_performance_recording');
  };

  const stopRecording = async () => {
    isRecording.value = false;
    await invoke('devtools_stop_performance_recording');
  };

  const takeHeapSnapshot = async () => {
    try {
      const snapshot = await invoke<MemorySnapshot>('devtools_take_heap_snapshot');
      memorySnapshots.value.push(snapshot);
      return snapshot;
    } catch (err) {
      console.error('Failed to take heap snapshot:', err);
    }
  };

  const startProfiling = async () => {
    await invoke('devtools_start_profiling');
  };

  const stopProfiling = async () => {
    await invoke('devtools_stop_profiling');
  };

  const inspectElement = async (selector: string) => {
    await openDevTools('elements');
    await invoke('devtools_inspect_element', { selector });
  };

  const evaluateInConsole = async (expression: string) => {
    try {
      return await invoke('devtools_evaluate', { expression });
    } catch (err) {
      console.error('Console evaluation failed:', err);
      throw err;
    }
  };

  const getEventListeners = async (selector: string) => {
    return await invoke('devtools_get_event_listeners', { selector });
  };

  const getComputedStyles = async (selector: string) => {
    return await invoke('devtools_get_computed_styles', { selector });
  };

  const getAccessibilityTree = async () => {
    return await invoke('devtools_get_accessibility_tree');
  };

  const exportHAR = async () => {
    try {
      return await invoke<Blob>('devtools_export_har');
    } catch (err) {
      console.error('Failed to export HAR:', err);
      throw err;
    }
  };

  const importHAR = async (har: Blob) => {
    try {
      await invoke('devtools_import_har', { har });
    } catch (err) {
      console.error('Failed to import HAR:', err);
      throw err;
    }
  };

  const enablePanel = (panelId: string) => {
    const panel = panels.value.find(p => p.id === panelId);
    if (panel) panel.enabled = true;
  };

  const disablePanel = (panelId: string) => {
    const panel = panels.value.find(p => p.id === panelId);
    if (panel) panel.enabled = false;
  };

  const addNetworkRequest = (request: NetworkRequest) => {
    networkRequests.value.push(request);
  };

  const updateNetworkRequest = (id: string, updates: Partial<NetworkRequest>) => {
    const index = networkRequests.value.findIndex(r => r.id === id);
    if (index >= 0) {
      networkRequests.value[index] = { ...networkRequests.value[index], ...updates };
    }
  };

  const addConsoleMessage = (message: ConsoleMessage) => {
    consoleMessages.value.push(message);
  };

  const addPerformanceEntry = (entry: PerformanceEntry) => {
    performanceEntries.value.push(entry);
  };

  const captureScreenshot = async (options?: { fullPage?: boolean; selector?: string }) => {
    return await invoke<Blob>('devtools_capture_screenshot', options);
  };

  const getColorFormat = async (color: string) => {
    return await invoke('devtools_get_color_format', { color });
  };

  const measureElement = async (selector: string) => {
    return await invoke('devtools_measure_element', { selector });
  };

  const simulateDevice = async (device: string) => {
    await invoke('devtools_simulate_device', { device });
  };

  const simulateNetworkConditions = async (conditions: { offline: boolean; latency: number; downloadThroughput: number; uploadThroughput: number }) => {
    await invoke('devtools_set_network_conditions', conditions);
  };

  const clearNetworkConditions = async () => {
    await invoke('devtools_clear_network_conditions');
  };

  const enableAutoPrettyPrint = async (enabled: boolean) => {
    await invoke('devtools_set_auto_pretty_print', { enabled });
  };

  const setBlackboxPatterns = async (patterns: string[]) => {
    await invoke('devtools_set_blackbox_patterns', { patterns });
  };

  const getBlackboxPatterns = async () => {
    return await invoke<string[]>('devtools_get_blackbox_patterns');
  };

  onMounted(() => {
    // Set up event listeners for devtools events
    window.addEventListener('devtools-network-request', (e: CustomEvent) => {
      addNetworkRequest(e.detail);
    });
    
    window.addEventListener('devtools-console-message', (e: CustomEvent) => {
      addConsoleMessage(e.detail);
    });
    
    window.addEventListener('devtools-performance-entry', (e: CustomEvent) => {
      addPerformanceEntry(e.detail);
    });
  });

  return {
    state,
    panels,
    networkRequests,
    consoleMessages,
    performanceEntries,
    memorySnapshots,
    networkFilter,
    networkFilterType,
    consoleFilterLevel,
    consoleFilterText,
    isRecording,
    recordingStartTime,
    selectedRequest,
    selectedMessage,
    filteredNetworkRequests,
    filteredConsoleMessages,
    networkStats,
    openDevTools,
    closeDevTools,
    toggleDevTools,
    setActivePanel,
    setDockSide,
    setHeight,
    setWidth,
    clearNetwork,
    clearConsole,
    clearPerformance,
    startRecording,
    stopRecording,
    takeHeapSnapshot,
    startProfiling,
    stopProfiling,
    inspectElement,
    evaluateInConsole,
    getEventListeners,
    getComputedStyles,
    getAccessibilityTree,
    exportHAR,
    importHAR,
    enablePanel,
    disablePanel,
    captureScreenshot,
    getColorFormat,
    measureElement,
    simulateDevice,
    simulateNetworkConditions,
    clearNetworkConditions,
    enableAutoPrettyPrint,
    setBlackboxPatterns,
    getBlackboxPatterns,
  };
}