import { ref, computed, onMounted, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';

export interface SyncState {
  isEnabled: boolean;
  isSyncing: boolean;
  lastSynced: string | null;
  pendingChanges: number;
  error: string | null;
  serverUrl: string;
  username: string;
  encrypted: boolean;
}

export interface SyncData {
  bookmarks: any[];
  history: any[];
  passwords: any[];
  settings: any;
  extensions: any[];
  openTabs: any[];
}

export interface SyncConflict {
  id: string;
  type: string;
  localData: any;
  remoteData: any;
  timestamp: string;
}

export function useSync() {
  const state = ref<SyncState>({
    isEnabled: false,
    isSyncing: false,
    lastSynced: null,
    pendingChanges: 0,
    error: null,
    serverUrl: 'https://sync.privacy-browser.example.com',
    username: '',
    encrypted: true,
  });

  const conflicts = ref<SyncConflict[]>([]);
  const syncData = ref<SyncData | null>(null);
  const isAuthenticating = ref(false);
  const authError = ref<string | null>(null);
  const authCode = ref('');
  const showSetupDialog = ref(false);
  const setupStep = ref<'auth' | 'server' | 'encryption' | 'complete'>('auth');

  const isConnected = computed(() => state.value.isEnabled && state.value.lastSynced !== null);
  const needsSync = computed(() => state.value.pendingChanges > 0);

  const loadSyncState = async () => {
    try {
      const saved = await invoke<SyncState>('sync_get_state');
      state.value = { ...state.value, ...saved };
    } catch (err) {
      console.error('Failed to load sync state:', err);
    }
  };

  const saveSyncState = async () => {
    try {
      await invoke('sync_save_state', { state: state.value });
    } catch (err) {
      console.error('Failed to save sync state:', err);
    }
  };

  const authenticate = async (username: string, password: string) => {
    isAuthenticating.value = true;
    authError.value = null;
    
    try {
      const result = await invoke<{ token: string; userId: string }>('sync_authenticate', { 
        username, 
        password,
        serverUrl: state.value.serverUrl,
      });
      
      state.value.username = username;
      state.value.isEnabled = true;
      await saveSyncState();
      
      // Start initial sync
      await performSync();
      
      return true;
    } catch (err) {
      authError.value = err instanceof Error ? err.message : 'Authentication failed';
      return false;
    } finally {
      isAuthenticating.value = false;
    }
  };

  const logout = async () => {
    try {
      await invoke('sync_logout');
      state.value = {
        isEnabled: false,
        isSyncing: false,
        lastSynced: null,
        pendingChanges: 0,
        error: null,
        serverUrl: state.value.serverUrl,
        username: '',
        encrypted: true,
      };
      await saveSyncState();
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  const performSync = async () => {
    if (state.value.isSyncing) return;
    
    state.value.isSyncing = true;
    state.value.error = null;
    
    try {
      // Collect local data
      const localData = await collectLocalData();
      
      // Send to server
      const result = await invoke<{ 
        success: boolean; 
        serverData: SyncData;
        conflicts: SyncConflict[];
        lastSynced: string;
      }>('sync_perform', { 
        localData,
        serverUrl: state.value.serverUrl,
      });
      
      if (result.success) {
        state.value.lastSynced = result.lastSynced;
        state.value.pendingChanges = 0;
        conflicts.value = result.conflicts;
        
        // Apply remote changes
        if (result.conflicts.length > 0) {
          // Show conflict resolution UI
        } else {
          await applyRemoteData(result.serverData);
        }
      } else {
        throw new Error('Sync failed');
      }
    } catch (err) {
      state.value.error = err instanceof Error ? err.message : 'Sync failed';
      console.error('Sync failed:', err);
    } finally {
      state.value.isSyncing = false;
      await saveSyncState();
    }
  };

  const collectLocalData = async (): Promise<SyncData> => {
    try {
      return await invoke<SyncData>('sync_collect_local_data');
    } catch (err) {
      console.error('Failed to collect local data:', err);
      return {
        bookmarks: [],
        history: [],
        passwords: [],
        settings: {},
        extensions: [],
        openTabs: [],
      };
    }
  };

  const applyRemoteData = async (data: SyncData) => {
    try {
      await invoke('sync_apply_remote_data', { data });
    } catch (err) {
      console.error('Failed to apply remote data:', err);
    }
  };

  const resolveConflict = async (conflictId: string, resolution: 'local' | 'remote' | 'merge') => {
    const conflict = conflicts.value.find(c => c.id === conflictId);
    if (!conflict) return;
    
    try {
      await invoke('sync_resolve_conflict', { 
        conflictId, 
        resolution,
        mergedData: resolution === 'merge' ? conflict.localData : null,
      });
      
      conflicts.value = conflicts.value.filter(c => c.id !== conflictId);
      
      if (conflicts.value.length === 0) {
        // All conflicts resolved, continue sync
        await performSync();
      }
    } catch (err) {
      console.error('Failed to resolve conflict:', err);
    }
  };

  const setupCustomServer = async (url: string) => {
    try {
      await invoke('sync_set_server', { url });
      state.value.serverUrl = url;
      await saveSyncState();
    } catch (err) {
      console.error('Failed to set server:', err);
    }
  };

  const setEncryption = async (enabled: boolean, passphrase?: string) => {
    try {
      await invoke('sync_set_encryption', { enabled, passphrase });
      state.value.encrypted = enabled;
      await saveSyncState();
    } catch (err) {
      console.error('Failed to set encryption:', err);
    }
  };

  const triggerSync = () => {
    if (!state.value.isSyncing) {
      performSync();
    }
  };

  const resetSync = async () => {
    if (!confirm('This will delete all local sync data and disconnect from the server. Continue?')) return;
    
    try {
      await invoke('sync_reset');
      state.value = {
        isEnabled: false,
        isSyncing: false,
        lastSynced: null,
        pendingChanges: 0,
        error: null,
        serverUrl: state.value.serverUrl,
        username: '',
        encrypted: true,
      };
      await saveSyncState();
    } catch (err) {
      console.error('Failed to reset sync:', err);
    }
  };

  const exportSyncData = async () => {
    try {
      return await invoke<string>('sync_export_data');
    } catch (err) {
      console.error('Failed to export sync data:', err);
      return null;
    }
  };

  const importSyncData = async (data: string, passphrase?: string) => {
    try {
      await invoke('sync_import_data', { data, passphrase });
      await performSync();
    } catch (err) {
      console.error('Failed to import sync data:', err);
    }
  };

  const getSyncStats = async () => {
    try {
      return await invoke<{
        totalItems: number;
        lastSyncDuration: number;
        bandwidthUsed: number;
        conflictCount: number;
      }>('sync_get_stats');
    } catch (err) {
      console.error('Failed to get sync stats:', err);
      return null;
    }
  };

  onMounted(async () => {
    await loadSyncState();
    
    // Auto-sync every 15 minutes if enabled
    if (state.value.isEnabled) {
      setInterval(() => {
        if (state.value.isEnabled && !state.value.isSyncing) {
          performSync();
        }
      }, 15 * 60 * 1000);
    }
  });

  return {
    state,
    conflicts,
    syncData,
    isAuthenticating,
    authError,
    authCode,
    showSetupDialog,
    setupStep,
    isConnected,
    needsSync,
    loadSyncState,
    authenticate,
    logout,
    performSync,
    resolveConflict,
    setupCustomServer,
    setEncryption,
    triggerSync,
    resetSync,
    exportSyncData,
    importSyncData,
    getSyncStats,
  };
}