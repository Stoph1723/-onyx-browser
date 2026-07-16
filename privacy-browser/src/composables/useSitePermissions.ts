import { ref, computed, watch, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';

export interface PermissionState {
  state: 'grant' | 'deny' | 'ask';
  lastModified: string;
}

export interface OriginPermissions {
  origin: string;
  domain: string;
  permissions: Record<string, 'grant' | 'deny' | 'ask'>;
  hasPermissions: boolean;
  lastModified: string;
}

export interface GlobalPermissionSettings {
  defaults: Record<string, 'grant' | 'deny' | 'ask'>;
  autoBlockThirdParty: boolean;
  askBeforeAllowing: boolean;
}

export const PERMISSION_TYPES = [
  'geolocation',
  'notifications',
  'camera',
  'microphone',
  'clipboard-read',
  'clipboard-write',
  'persistent-storage',
  'idle-detection',
  'payment-handler',
  'background-sync',
  'periodic-background-sync',
  'screen-wake-lock',
  'window-placement',
  'local-fonts',
  'display-capture',
  'midi',
  'midi-sysex',
  'usb',
  'bluetooth',
  'serial',
  'hid',
  'nfc',
  'xr-spatial-tracking',
] as const;

export type PermissionType = typeof PERMISSION_TYPES[number];

export const PERMISSION_LABELS: Record<PermissionType, string> = {
  geolocation: 'Location',
  notifications: 'Notifications',
  camera: 'Camera',
  microphone: 'Microphone',
  'clipboard-read': 'Clipboard Read',
  'clipboard-write': 'Clipboard Write',
  'persistent-storage': 'Persistent Storage',
  'idle-detection': 'Idle Detection',
  'payment-handler': 'Payment Handler',
  'background-sync': 'Background Sync',
  'periodic-background-sync': 'Periodic Sync',
  'screen-wake-lock': 'Wake Lock',
  'window-placement': 'Window Placement',
  'local-fonts': 'Local Fonts',
  'display-capture': 'Screen Capture',
  midi: 'MIDI',
  'midi-sysex': 'MIDI Sysex',
  usb: 'USB Devices',
  bluetooth: 'Bluetooth',
  serial: 'Serial Ports',
  hid: 'HID Devices',
  nfc: 'NFC',
  'xr-spatial-tracking': 'AR/VR Tracking',
};

export const PERMISSION_ICONS: Record<PermissionType, string> = {
  geolocation: '📍',
  notifications: '🔔',
  camera: '📷',
  microphone: '🎤',
  'clipboard-read': '📋',
  'clipboard-write': '📋',
  'persistent-storage': '💾',
  'idle-detection': '⏱️',
  'payment-handler': '💳',
  'background-sync': '🔄',
  'periodic-background-sync': '🔄',
  'screen-wake-lock': '🔆',
  'window-placement': '🪟',
  'local-fonts': '🔤',
  'display-capture': '🖥️',
  midi: '🎵',
  'midi-sysex': '🎵',
  usb: '🔌',
  bluetooth: '📱',
  serial: '🔌',
  hid: '⌨️',
  nfc: '📱',
  'xr-spatial-tracking': '🕶️',
};

export const PERMISSION_DESCRIPTIONS: Record<PermissionType, string> = {
  geolocation: 'Allow sites to access your physical location',
  notifications: 'Allow sites to send desktop notifications',
  camera: 'Allow sites to access your camera',
  microphone: 'Allow sites to access your microphone',
  'clipboard-read': 'Allow sites to read from clipboard',
  'clipboard-write': 'Allow sites to write to clipboard',
  'persistent-storage': 'Allow sites to use persistent storage quota',
  'idle-detection': 'Allow sites to detect when you\'re idle',
  'payment-handler': 'Allow sites to handle payments',
  'background-sync': 'Allow sites to sync in background',
  'periodic-background-sync': 'Allow periodic background sync',
  'screen-wake-lock': 'Allow sites to prevent screen sleep',
  'window-placement': 'Allow sites to control window placement',
  'local-fonts': 'Allow sites to access local fonts',
  'display-capture': 'Allow sites to capture screen content',
  midi: 'Allow sites to access MIDI devices',
  'midi-sysex': 'Allow sites to use MIDI system exclusive messages',
  usb: 'Allow sites to access USB devices',
  bluetooth: 'Allow sites to access Bluetooth devices',
  serial: 'Allow sites to access serial ports',
  hid: 'Allow sites to access HID devices',
  nfc: 'Allow sites to access NFC',
  'xr-spatial-tracking': 'Allow sites to track AR/VR position',
};

export function useSitePermissions() {
  // State
  const permissions = ref<Record<string, Record<string, 'grant' | 'deny' | 'ask'>>>({});
  const origins = ref<OriginPermissions[]>([]);
  const selectedOrigin = ref<string>('');
  const searchQuery = ref('');
  const filterType = ref<'all' | 'grant' | 'deny' | 'ask'>('all');
  const globalSettings = ref<GlobalPermissionSettings>({
    defaults: {},
    autoBlockThirdParty: true,
    askBeforeAllowing: true,
  });
  const isLoading = ref(false);

  const permissionTypes = PERMISSION_TYPES;
  const getPermissionIcon = (type: PermissionType) => PERMISSION_ICONS[type];
  const getPermissionLabel = (type: PermissionType) => PERMISSION_LABELS[type];
  const getPermissionDescription = (type: PermissionType) => PERMISSION_DESCRIPTIONS[type];

  const loadPermissions = async () => {
    isLoading.value = true;
    try {
      const [loadedPermissions, loadedOrigins, loadedGlobal] = await Promise.all([
        invoke<Record<string, Record<string, 'grant' | 'deny' | 'ask'>>>('get_site_permissions'),
        invoke<OriginPermissions[]>('get_site_origins'),
        invoke<GlobalPermissionSettings>('get_global_permission_settings'),
      ]);
      permissions.value = loadedPermissions;
      origins.value = loadedOrigins;
      globalSettings.value = loadedGlobal;
    } catch (error) {
      console.error('Failed to load permissions:', error);
    } finally {
      isLoading.value = false;
    }
  };

  const updatePermission = async (origin: string, type: PermissionType, state: 'grant' | 'deny' | 'ask') => {
    try {
      await invoke('update_site_permission', { origin, type, state });
      await loadPermissions();
    } catch (error) {
      console.error('Failed to update permission:', error);
    }
  };

  const resetOriginPermissions = async (origin: string) => {
    try {
      await invoke('reset_origin_permissions', { origin });
      await loadPermissions();
    } catch (error) {
      console.error('Failed to reset permissions:', error);
    }
  };

  const resetAllPermissions = async () => {
    if (!confirm('Reset ALL site permissions? This cannot be undone.')) return;
    try {
      await invoke('reset_all_permissions');
      await loadPermissions();
    } catch (error) {
      console.error('Failed to reset all permissions:', error);
    }
  };

  const addOriginException = async (origin: string, permissions: Record<string, 'grant' | 'deny' | 'ask'>) => {
    try {
      await invoke('add_origin_exception', { origin, permissions });
      await loadPermissions();
    } catch (error) {
      console.error('Failed to add exception:', error);
    }
  };

  const removeOriginException = async (origin: string) => {
    try {
      await invoke('remove_origin_exception', { origin });
      await loadPermissions();
    } catch (error) {
      console.error('Failed to remove exception:', error);
    }
  };

  const clearOriginData = async (origin: string, types: Record<string, boolean>) => {
    try {
      await invoke('clear_origin_data', { origin, types });
    } catch (error) {
      console.error('Failed to clear origin data:', error);
    }
  };

  const setGlobalDefault = async (type: PermissionType, state: 'grant' | 'deny' | 'ask') => {
    try {
      await invoke('set_global_permission_default', { type, state });
      await loadPermissions();
    } catch (error) {
      console.error('Failed to set global default:', error);
    }
  };

  const filteredOrigins = computed(() => {
    let result = origins.value;
    
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      result = result.filter(o => 
        o.origin.toLowerCase().includes(q) ||
        o.domain.toLowerCase().includes(q)
      );
    }
    
    if (filterType.value !== 'all') {
      result = result.filter(o => 
        Object.values(o.permissions).some(p => p === filterType.value)
      );
    }
    
    return result;
  });

  const originPermissions = computed(() => {
    return permissions.value[selectedOrigin.value] || {};
  });

  const getOriginSecurityStatus = (origin: string) => {
    if (origin.startsWith('https://')) return { label: 'Secure', class: 'secure' };
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return { label: 'Local', class: 'local' };
    return { label: 'Not Secure', class: 'insecure' };
  };

  const formatPermissionState = (state: string) => {
    const labels: Record<string, string> = {
      grant: 'Allow',
      deny: 'Block',
      ask: 'Ask',
    };
    return labels[state] || state;
  };

  const getStateClass = (state: string) => {
    switch (state) {
      case 'grant': return 'state-allow';
      case 'deny': return 'state-block';
      case 'ask': return 'state-ask';
      default: return '';
    }
  };

  const getOriginSecurityStatus = (origin: string) => {
    if (origin.startsWith('https://')) return { label: 'Secure', class: 'secure' };
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return { label: 'Local', class: 'local' };
    return { label: 'Not Secure', class: 'insecure' };
  };

  const formatPermissionState = (state: string) => {
    const labels: Record<string, string> = {
      grant: 'Allow',
      deny: 'Block',
      ask: 'Ask',
    };
    return labels[state] || state;
  };

  const getStateClass = (state: string) => {
    switch (state) {
      case 'grant': return 'state-allow';
      case 'deny': return 'state-block';
      case 'ask': return 'state-ask';
      default: return '';
    }
  };

  const getOriginSecurityStatus = (origin: string) => {
    if (origin.startsWith('https://')) return { label: 'Secure', class: 'secure' };
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return { label: 'Local', class: 'local' };
    return { label: 'Not Secure', class: 'insecure' };
  };

  onMounted(async () => {
    await loadPermissions();
  });

  return {
    permissions,
    origins,
    selectedOrigin,
    searchQuery,
    filterType,
    globalSettings,
    isLoading,
    loadPermissions,
    updatePermission,
    resetOriginPermissions,
    resetAllPermissions,
    addOriginException,
    removeOriginException,
    clearOriginData,
    setGlobalDefault,
    permissionTypes: PERMISSION_TYPES,
    getPermissionIcon,
    getPermissionLabel,
    getPermissionDescription,
    filteredOrigins,
    originPermissions,
    getOriginSecurityStatus,
    formatPermissionState,
    getStateClass,
  };
}