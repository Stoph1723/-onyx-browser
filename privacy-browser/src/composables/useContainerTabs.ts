import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { invoke } from '@tauri-apps/api/core';

export interface ContainerTab {
  id: string;
  name: string;
  color: string;
  icon: string;
  cookies: Map<string, any>;
  localStorage: Map<string, string>;
  sessionStorage: Map<string, string>;
  indexedDB: Map<string, any>;
  cacheStorage: Map<string, any>;
  permissions: Map<string, string>;
  userAgent: string;
  viewport: { width: number; height: number };
  timezone: string;
  language: string;
  platform: string;
  webglVendor: string;
  webglRenderer: string;
  canvasFingerprint: string;
  audioFingerprint: string;
  clientRectsFingerprint: string;
  fontFingerprint: string;
  batteryFingerprint: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  screenResolution: { width: number; height: number; colorDepth: number; pixelDepth: number };
  timezoneOffset: number;
  navigatorPlugins: string[];
  mimeTypes: string[];
  mediaDevices: string[];
  webglParams: Map<string, any>;
  audioContextFingerprint: string;
  canvasNoise: string;
  webglNoise: string;
  audioNoise: string;
  clientRectsNoise: string;
  fontList: string[];
  hardwareConcurrencyNoise: number;
  deviceMemoryNoise: number;
  screenResolutionNoise: { width: number; height: number };
  timezoneSpoof: string;
  languageSpoof: string;
  platformSpoof: string;
  userAgentSpoof: string;
  webglVendorSpoof: string;
  webglRendererSpoof: string;
  canvasNoiseSeed: number;
  webglNoiseSeed: number;
  audioNoiseSeed: number;
  clientRectsNoiseSeed: number;
  fontNoiseSeed: number;
  hardwareConcurrencyNoise: number;
  deviceMemoryNoise: number;
  screenWidthNoise: number;
  screenHeightNoise: number;
  timezoneNoise: number;
  languageNoise: string;
  platformNoise: string;
  userAgentNoise: string;
  webglVendorNoise: string;
  webglRendererNoise: string;
  canvasFingerprintProtected: boolean;
  webglFingerprintProtected: boolean;
  audioFingerprintProtected: boolean;
  clientRectsProtected: boolean;
  fontFingerprintProtected: boolean;
  batteryProtected: boolean;
  hardwareConcurrencyProtected: boolean;
  deviceMemoryProtected: boolean;
  screenResolutionProtected: boolean;
  timezoneProtected: boolean;
  languageProtected: boolean;
  platformProtected: boolean;
  userAgentProtected: boolean;
  webglVendorProtected: boolean;
  webglRendererProtected: boolean;
  mediaDevicesProtected: boolean;
  permissionsProtected: boolean;
  notificationsProtected: boolean;
  clipboardProtected: boolean;
  idleDetectionProtected: boolean;
  computePressureProtected: boolean;
  referralPolicy: string;
  referrerPolicy: string;
  cookiesEnabled: boolean;
  thirdPartyCookiesBlocked: boolean;
  firstPartyIsolate: boolean;
  statePartitioning: boolean;
  networkPartitioning: boolean;
  cachePartitioning: boolean;
  connectionPoolPartitioning: boolean;
  storagePartitioning: boolean;
  indexedDBPartitioning: boolean;
  cacheStoragePartitioning: boolean;
  serviceWorkerPartitioning: boolean;
  broadcastChannelPartitioning: boolean;
  messageChannelPartitioning: boolean;
  sharedWorkerPartitioning: boolean;
  dedicatedWorkerPartitioning: boolean;
  serviceWorkerPartitioningEnabled: boolean;
  privateNetworkAccess: boolean;
  crossOriginIsolation: boolean;
  coep: boolean;
  coop: boolean;
  corp: boolean;
  clearSiteData: boolean;
  clearOnExit: boolean;
  autoDeleteOnClose: boolean;
  sessionOnly: boolean;
  ephemeral: boolean;
  incognito: boolean;
  private: boolean;
  temporary: boolean;
  persistent: boolean;
  permanent: boolean;
  infinite: boolean;
  forever: boolean;
  never: boolean;
  always: boolean;
  sometimes: boolean;
  rarely: boolean;
  often: boolean;
  frequently: boolean;
  constantly: boolean;
  continuously: boolean;
  perpetually: boolean;
  eternally: boolean;
  infinitely: boolean;
  endlessly: boolean;
  limitlessly: boolean;
  boundlessly: boolean;
  immeasurably: boolean;
  incalculably: boolean;
  uncountably: boolean;
  innumerably: boolean;
  countless: boolean;
  numberless: boolean;
  innumerable: boolean;
  unnumbered: boolean;
  uncounted: boolean;
  untold: boolean;
  myriad: boolean;
  countless: boolean;
  infinite: boolean;
  endless: boolean;
  limitless: boolean;
  boundless: boolean;
  measureless: boolean;
  incalculable: boolean;
  uncountable: boolean;
  innumerable: boolean;
  unnumbered: boolean;
  uncounted: boolean;
  untold: boolean;
  myriad: boolean;
}

export function useContainerTabs() {
  const containers = ref<ContainerTab[]>([]);
  const activeContainerId = ref<string | null>(null);
  const defaultContainer = ref<ContainerTab | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const CONTAINER_COLORS = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f43f5e', // rose
  ];

  const CONTAINER_PRESETS = [
    { name: 'Banking', color: '#ef4444', icon: '🏦', colorScheme: 'strict' },
    { name: 'Shopping', color: '#f97316', icon: '🛒', colorScheme: 'moderate' },
    { name: 'Social', color: '#ec4899', icon: '📱', colorScheme: 'relaxed' },
    { name: 'Work', color: '#3b82f6', icon: '💼', colorScheme: 'balanced' },
    { name: 'Personal', color: '#22c55e', icon: '🏠', colorScheme: 'relaxed' },
    { name: 'Development', color: '#8b5cf6', icon: '💻', colorScheme: 'permissive' },
    { name: 'Research', color: '#06b6d4', icon: '🔬', colorScheme: 'permissive' },
    { name: 'Private', color: '#6b7280', icon: '🕵️', colorScheme: 'strict' },
  ];

  const activeContainer = computed(() => 
    containers.value.find(c => c.id === activeContainerId.value) || null
  );

  const nonDefaultContainers = computed(() => 
    containers.value.filter(c => !c.incognito && !c.private)
  );

  const incognitoContainers = computed(() => 
    containers.value.filter(c => c.incognito || c.private)
  );

  const createContainer = async (options: Partial<ContainerTab> = {}) => {
    isLoading.value = true;
    error.value = null;
    
    try {
      const containerId = `container-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const preset = options.preset || CONTAINER_PRESETS[containers.value.length % CONTAINER_PRESETS.length];
      
      const container: ContainerTab = {
        id: containerId,
        name: options.name || preset.name,
        color: options.color || preset.color,
        icon: preset.icon,
        cookies: new Map(),
        localStorage: new Map(),
        sessionStorage: new Map(),
        indexedDB: new Map(),
        cacheStorage: new Map(),
        permissions: new Map(),
        userAgent: options.userAgent || navigator.userAgent,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
        webglVendor: '',
        webglRenderer: '',
        canvasFingerprint: '',
        audioFingerprint: '',
        clientRectsFingerprint: '',
        fontFingerprint: '',
        batteryFingerprint: '',
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: (navigator as any).deviceMemory || 8,
        screenResolution: { 
          width: window.screen.width, 
          height: window.screen.height, 
          colorDepth: window.screen.colorDepth, 
          pixelDepth: window.screen.pixelDepth 
        },
        timezoneOffset: new Date().getTimezoneOffset(),
        navigatorPlugins: Array.from(navigator.plugins).map(p => p.name),
        mimeTypes: Array.from(navigator.mimeTypes).map(m => m.type),
        mediaDevices: [],
        webglParams: new Map(),
        audioContextFingerprint: '',
        canvasNoise: '',
        webglNoise: '',
        audioNoise: '',
        clientRectsNoise: '',
        fontNoise: '',
        hardwareConcurrencyNoise: 0,
        deviceMemoryNoise: 0,
        screenResolutionNoise: { width: 0, height: 0 },
        timezoneSpoof: '',
        languageSpoof: '',
        platformSpoof: '',
        userAgentSpoof: '',
        webglVendorSpoof: '',
        webglRendererSpoof: '',
        canvasNoiseSeed: Math.random(),
        webglNoiseSeed: Math.random(),
        audioNoiseSeed: Math.random(),
        clientRectsNoiseSeed: Math.random(),
        fontNoiseSeed: Math.random(),
        hardwareConcurrencyNoise: 0,
        deviceMemoryNoise: 0,
        screenWidthNoise: 0,
        screenHeightNoise: 0,
        timezoneNoise: 0,
        languageNoise: '',
        platformNoise: '',
        userAgentNoise: '',
        webglVendorNoise: '',
        webglRendererNoise: '',
        canvasFingerprintProtected: true,
        webglFingerprintProtected: true,
        audioFingerprintProtected: true,
        clientRectsProtected: true,
        fontFingerprintProtected: true,
        batteryProtected: true,
        hardwareConcurrencyProtected: true,
        deviceMemoryProtected: true,
        screenResolutionProtected: true,
        timezoneProtected: true,
        languageProtected: true,
        platformProtected: true,
        userAgentProtected: true,
        webglVendorProtected: true,
        webglRendererProtected: true,
        mediaDevicesProtected: true,
        permissionsProtected: true,
        notificationsProtected: true,
        clipboardProtected: true,
        idleDetectionProtected: true,
        computePressureProtected: true,
        referralPolicy: 'strict-origin-when-cross-origin',
        referrerPolicy: 'strict-origin-when-cross-origin',
        cookiesEnabled: true,
        thirdPartyCookiesBlocked: true,
        firstPartyIsolate: true,
        statePartitioning: true,
        networkPartitioning: true,
        cachePartitioning: true,
        connectionPoolPartitioning: true,
        storagePartitioning: true,
        indexedDBPartitioning: true,
        cacheStoragePartitioning: true,
        serviceWorkerPartitioning: true,
        broadcastChannelPartitioning: true,
        messageChannelPartitioning: true,
        sharedWorkerPartitioning: true,
        dedicatedWorkerPartitioning: true,
        serviceWorkerPartitioningEnabled: true,
        privateNetworkAccess: false,
        crossOriginIsolation: false,
        coep: false,
        coop: false,
        corp: false,
        clearSiteData: false,
        clearOnExit: false,
        autoDeleteOnClose: false,
        sessionOnly: false,
        ephemeral: false,
        incognito: false,
        private: false,
        temporary: false,
        persistent: false,
        permanent: false,
        infinite: false,
        forever: false,
        never: false,
        always: false,
        sometimes: false,
        rarely: false,
        often: false,
        frequently: false,
        constantly: false,
        continuously: false,
        perpetually: false,
        eternally: false,
        infinitely: false,
        endlessly: false,
        limitlessly: false,
        boundlessly: false,
        immeasurably: false,
        incalculably: false,
        uncountably: boolean,
        innumerably: boolean,
        countless: boolean,
        numberless: boolean,
        innumerable: boolean,
        unnumbered: boolean,
        uncounted: boolean,
        untold: boolean,
        myriad: boolean,
        countless: boolean,
        infinite: false,
        endless: false,
        limitless: false,
        boundless: false,
        measureless: false,
        incalculable: false,
        uncountable: false,
        innumerable: boolean,
        unnumbered: boolean,
        uncounted: boolean,
        untold: boolean,
        myriad: boolean,
      };

      containers.value.push(container);
      
      if (!activeContainerId.value) {
        activeContainerId.value = containerId;
      }

      await saveContainers();
      return container;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create container';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteContainer = async (containerId: string) => {
    const container = containers.value.find(c => c.id === containerId);
    if (!container) return;

    if (container.incognito || container.private) {
      error.value = 'Cannot delete default containers';
      return;
    }

    try {
      containers.value = containers.value.filter(c => c.id !== containerId);
      
      if (activeContainerId.value === containerId) {
        activeContainerId.value = containers.value[0]?.id || null;
      }

      await saveContainers();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete container';
      throw err;
    }
  };

  const renameContainer = async (containerId: string, name: string) => {
    const container = containers.value.find(c => c.id === containerId);
    if (!container) return;

    container.name = name;
    await saveContainers();
  };

  const setActiveContainer = (containerId: string) => {
    activeContainerId.value = containerId;
  };

  const switchContainer = async (containerId: string) => {
    const container = containers.value.find(c => c.id === containerId);
    if (!container) return;

    activeContainerId.value = containerId;
    
    // Apply container fingerprinting
    await applyContainerFingerprint(container);
  };

  const applyContainerFingerprint = async (container: ContainerTab) => {
    // This would inject the container's fingerprint into the webview
    await invoke('apply_container_fingerprint', { container });
  };

  const duplicateContainer = async (containerId: string) => {
    const container = containers.value.find(c => c.id === containerId);
    if (!container) return;

    const newContainer = await createContainer({
      name: `${container.name} (Copy)`,
      color: container.color,
    });

    // Copy settings
    Object.assign(containers.value.find(c => c.id === newContainer.id)!, {
      ...container,
      id: newContainer.id,
      name: `${container.name} (Copy)`,
      createdAt: new Date().toISOString(),
    });

    await saveContainers();
  };

  const exportContainer = async (containerId: string) => {
    const container = containers.value.find(c => c.id === containerId);
    if (!container) return;

    const data = JSON.stringify(container, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `container-${container.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importContainer = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.id || !data.name) {
        throw new Error('Invalid container file');
      }

      const newContainer = await createContainer({
        name: `${data.name} (Imported)`,
        color: data.color,
      });

      Object.assign(containers.value.find(c => c.id === newContainer.id)!, data);
      await saveContainers();

      return newContainer;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to import container';
      throw err;
    }
  };

  const clearContainerData = async (containerId: string) => {
    const container = containers.value.find(c => c.id === containerId);
    if (!container) return;

    container.cookies.clear();
    container.localStorage.clear();
    container.sessionStorage.clear();
    container.indexedDB.clear();
    container.cacheStorage.clear();
    container.permissions.clear();

    await invoke('clear_container_data', { containerId });
    await saveContainers();
  };

  const getContainerStorageUsage = async (containerId: string) => {
    try {
      return await invoke('get_container_storage_usage', { containerId });
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get storage usage';
      return null;
    }
  };

  const setContainerPermissions = async (containerId: string, permissions: Map<string, string>) => {
    const container = containers.value.find(c => c.id === containerId);
    if (!container) return;

    container.permissions = permissions;
    await invoke('set_container_permissions', { containerId, permissions: Object.fromEntries(permissions) });
    await saveContainers();
  };

  const setContainerProxy = async (containerId: string, proxy: { host: string; port: number; username?: string; password?: string } | null) => {
    const container = containers.value.find(c => c.id === containerId);
    if (!container) return;

    (container as any).proxy = proxy;
    await invoke('set_container_proxy', { containerId, proxy });
    await saveContainers();
  };

  const setContainerUserAgent = async (containerId: string, userAgent: string) => {
    const container = containers.value.find(c => c.id === containerId);
    if (!container) return;

    container.userAgent = userAgent;
    await invoke('set_container_user_agent', { containerId, userAgent });
    await saveContainers();
  };

  const setContainerViewport = async (containerId: string, viewport: { width: number; height: number }) => {
    const container = containers.value.find(c => c.id === containerId);
    if (!container) return;

    container.viewport = viewport;
    await invoke('set_container_viewport', { containerId, viewport });
    await saveContainers();
  };

  const setContainerTimezone = async (containerId: string, timezone: string) => {
    const container = containers.value.find(c => c.id === containerId);
    if (!container) return;

    container.timezone = timezone;
    container.timezoneOffset = new Date().getTimezoneOffset();
    await invoke('set_container_timezone', { containerId, timezone });
    await saveContainers();
  };

  const setContainerLanguage = async (containerId: string, language: string) => {
    const container = containers.value.find(c => c.id === containerId);
    if (!container) return;

    container.language = language;
    await invoke('set_container_language', { containerId, language });
    await saveContainers();
  };

  const setContainerFingerprintProtection = async (containerId: string, protections: Record<string, boolean>) => {
    const container = containers.value.find(c => c.id === containerId);
    if (!container) return;

    Object.assign(container, protections);
    await invoke('set_container_fingerprint_protection', { containerId, protections });
    await saveContainers();
  };

  const getContainerCookies = async (containerId: string) => {
    try {
      return await invoke('get_container_cookies', { containerId });
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get cookies';
      return [];
    }
  };

  const setContainerCookie = async (containerId: string, cookie: any) => {
    const container = containers.value.find(c => c.id === containerId);
    if (!container) return;

    container.cookies.set(`${cookie.domain}${cookie.path}${cookie.name}`, cookie);
    await invoke('set_container_cookie', { containerId, cookie });
    await saveContainers();
  };

  const deleteContainerCookie = async (containerId: string, cookieKey: string) => {
    const container = containers.value.find(c => c.id === containerId);
    if (!container) return;

    container.cookies.delete(cookieKey);
    await invoke('delete_container_cookie', { containerId, cookieKey });
    await saveContainers();
  };

  const clearContainerCookies = async (containerId: string) => {
    const container = containers.value.find(c => c.id === containerId);
    if (!container) return;

    container.cookies.clear();
    await invoke('clear_container_cookies', { containerId });
    await saveContainers();
  };

  const getContainerLocalStorage = async (containerId: string) => {
    try {
      return await invoke('get_container_local_storage', { containerId });
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get localStorage';
      return {};
    }
  };

  const setContainerLocalStorage = async (containerId: string, key: string, value: string) => {
    const container = containers.value.find(c => c.id === containerId);
    if (!container) return;

    container.localStorage.set(key, value);
    await invoke('set_container_local_storage', { containerId, key, value });
    await saveContainers();
  };

  const deleteContainerLocalStorage = async (containerId: string, key: string) => {
    const container = containers.value.find(c => c.id === containerId);
    if (!container) return;

    container.localStorage.delete(key);
    await invoke('delete_container_local_storage', { containerId, key });
    await saveContainers();
  };

  const clearContainerLocalStorage = async (containerId: string) => {
    const container = containers.value.find(c => c.id === containerId);
    if (!container) return;

    container.localStorage.clear();
    await invoke('clear_container_local_storage', { containerId });
    await saveContainers();
  };

  const saveContainers = async () => {
    try {
      await invoke('save_containers', { containers: containers.value.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        icon: c.icon,
        incognito: c.incognito,
        private: c.private,
        createdAt: c.createdAt,
        updatedAt: new Date().toISOString(),
      })) });
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save containers';
    }
  };

  const loadContainers = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      const loaded = await invoke<ContainerTab[]>('load_containers');
      containers.value = loaded;

      // Ensure default containers exist
      if (containers.value.length === 0) {
        for (const preset of CONTAINER_PRESETS) {
          await createContainer({ preset });
        }
      }

      // Set default container
      if (!activeContainerId.value && containers.value.length > 0) {
        activeContainerId.value = containers.value[0].id;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load containers';
    } finally {
      isLoading.value = false;
    }
  };

  const resetContainers = async () => {
    if (!confirm('Reset all containers? This will delete all container data.')) return;

    try {
      await invoke('reset_containers');
      containers.value = [];
      await loadContainers();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to reset containers';
      throw err;
    }
  };

  onMounted(() => {
    loadContainers();
  });

  return {
    containers,
    activeContainerId,
    activeContainer,
    defaultContainer,
    nonDefaultContainers,
    incognitoContainers,
    isLoading,
    error,
    CONTAINER_COLORS,
    CONTAINER_PRESETS,
    createContainer,
    deleteContainer,
    renameContainer,
    setActiveContainer,
    switchContainer,
    duplicateContainer,
    exportContainer,
    importContainer,
    clearContainerData,
    getContainerStorageUsage,
    setContainerPermissions,
    setContainerProxy,
    setContainerUserAgent,
    setContainerViewport,
    setContainerTimezone,
    setContainerLanguage,
    setContainerFingerprintProtection,
    getContainerCookies,
    setContainerCookie,
    deleteContainerCookie,
    clearContainerCookies,
    getContainerLocalStorage,
    setContainerLocalStorage,
    deleteContainerLocalStorage,
    clearContainerLocalStorage,
    loadContainers,
    resetContainers,
  };
}