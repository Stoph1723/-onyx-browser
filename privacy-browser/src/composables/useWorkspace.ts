import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { invoke } from '@tauri-apps/api/core';

export interface Workspace {
  id: string;
  name: string;
  icon: string;
  color: string;
  tabIds: string[];
  settings: WorkspaceSettings;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
  layout?: WorkspaceLayout;
}

export interface WorkspaceSettings {
  autoDiscardTabs: boolean;
  discardAfterMinutes: number;
  newTabBehavior: 'blank' | 'homepage' | 'last-tab' | 'new-tab-page';
  defaultSearchEngine: string;
  zoomLevel: number;
  theme: 'light' | 'dark' | 'system';
  showBookmarksBar: boolean;
  showTabsOnTop: boolean;
  enableVerticalTabs: boolean;
  tabGrouping: 'none' | 'domain' | 'manual';
  autoSaveLayout: boolean;
  syncAcrossDevices: boolean;
}

export interface WorkspaceLayout {
  windows: WindowLayout[];
  activeWindowIndex: number;
}

export interface WindowLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  maximized: boolean;
  fullscreen: boolean;
  tabs: TabLayout[];
  activeTabIndex: number;
  sidebarOpen: boolean;
  sidebarWidth: number;
  sidebarPanel: string;
  zoomLevel: number;
}

export interface TabLayout {
  id: string;
  url: string;
  title: string;
  favicon: string;
  pinned: boolean;
  groupId: string | null;
  groupName: string | null;
  groupColor: string | null;
  scrollPosition: { x: number; y: number };
  zoomLevel: number;
  audioMuted: boolean;
  discarded: boolean;
  incognito: boolean;
  containerId: string | null;
  scrollPositionRestored: boolean;
  lastAccessed: number;
}

export interface WorkspaceTab {
  id: string;
  workspaceId: string;
  title: string;
  url: string;
  favicon: string;
  pinned: boolean;
  groupId: string | null;
  groupName: string | null;
  groupColor: string | null;
  active: boolean;
  incognito: boolean;
  containerId: string | null;
  zoomLevel: number;
  audioMuted: boolean;
  discarded: boolean;
  scrollPosition: { x: number; y: number };
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: number;
}

export function useWorkspace() {
  const workspaces = ref<Workspace[]>([]);
  const activeWorkspaceId = ref<string | null>(null);
  const tabs = ref<WorkspaceTab[]>([]);
  const activeTabId = ref<string | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const workspaceSettings = ref<WorkspaceSettings>({
    autoDiscardTabs: true,
    discardAfterMinutes: 30,
    newTabBehavior: 'new-tab-page',
    defaultSearchEngine: 'duckduckgo',
    zoomLevel: 1.0,
    theme: 'system',
    showBookmarksBar: true,
    showTabsOnTop: true,
    enableVerticalTabs: false,
    tabGrouping: 'none',
    autoSaveLayout: true,
    syncAcrossDevices: false,
  });

  const activeWorkspace = computed(() => 
    workspaces.value.find(w => w.id === activeWorkspaceId.value) || null
  );

  const workspaceTabs = computed(() => 
    tabs.value.filter(t => t.workspaceId === activeWorkspaceId.value)
  );

  const activeTab = computed(() => 
    tabs.value.find(t => t.id === activeTabId.value) || null
  );

  const loadWorkspaces = async () => {
    isLoading.value = true;
    error.value = null;
    
    try {
      const [loadedWorkspaces, loadedTabs, loadedSettings] = await Promise.all([
        invoke<Workspace[]>('get_workspaces'),
        invoke<WorkspaceTab[]>('get_tabs'),
        invoke<WorkspaceSettings>('get_workspace_settings'),
      ]);
      
      workspaces.value = loadedWorkspaces;
      tabs.value = loadedTabs;
      workspaceSettings.value = { ...workspaceSettings.value, ...loadedSettings };
      
      if (workspaces.value.length > 0 && !activeWorkspaceId.value) {
        activeWorkspaceId.value = workspaces.value[0].id;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load workspaces';
      console.error('Failed to load workspaces:', err);
    } finally {
      isLoading.value = false;
    }
  };

  const createWorkspace = async (options: {
    name: string;
    icon?: string;
    color?: string;
  }): Promise<Workspace> => {
    isLoading.value = true;
    error.value = null;
    
    try {
      const workspace = await invoke<Workspace>('create_workspace', {
        name: options.name,
        icon: options.icon || '📁',
        color: options.color || '#3b82f6',
      });
      
      workspaces.value.push(workspace);
      activeWorkspaceId.value = workspace.id;
      
      return workspace;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create workspace';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteWorkspace = async (workspaceId: string) => {
    isLoading.value = true;
    error.value = null;
    
    try {
      await invoke('delete_workspace', { workspaceId });
      
      workspaces.value = workspaces.value.filter(w => w.id !== workspaceId);
      tabs.value = tabs.value.filter(t => t.workspaceId !== workspaceId);
      
      if (activeWorkspaceId.value === workspaceId) {
        activeWorkspaceId.value = workspaces.value[0]?.id || null;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete workspace';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const renameWorkspace = async (workspaceId: string, name: string) => {
    const workspace = workspaces.value.find(w => w.id === workspaceId);
    if (!workspace) return;
    
    workspace.name = name;
    workspace.updatedAt = new Date().toISOString();
    
    try {
      await invoke('rename_workspace', { workspaceId, name });
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to rename workspace';
      throw err;
    }
  };

  const setActiveWorkspace = async (workspaceId: string) => {
    const workspace = workspaces.value.find(w => w.id === workspaceId);
    if (!workspace) return;
    
    activeWorkspaceId.value = workspaceId;
    workspace.lastAccessedAt = new Date().toISOString();
    
    try {
      await invoke('set_active_workspace', { workspaceId });
    } catch (err) {
      console.error('Failed to set active workspace:', err);
    }
  };

  const duplicateWorkspace = async (workspaceId: string) => {
    const workspace = workspaces.value.find(w => w.id === workspaceId);
    if (!workspace) return;
    
    const duplicated = await createWorkspace({
      name: `${workspace.name} (Copy)`,
      icon: workspace.icon,
      color: workspace.color,
    });
    
    // Copy tabs
    const workspaceTabs = tabs.value.filter(t => t.workspaceId === workspaceId);
    for (const tab of workspaceTabs) {
      await createTabInWorkspace(duplicated.id, {
        title: tab.title,
        url: tab.url,
        favicon: tab.favicon,
        pinned: tab.pinned,
        groupId: tab.groupId,
        groupName: tab.groupName,
        groupColor: tab.groupColor,
      });
    }
    
    // Copy layout
    if (workspace.layout) {
      await invoke('save_workspace_layout', { 
        workspaceId: duplicated.id, 
        layout: workspace.layout 
      });
    }
  };

  const exportWorkspace = async (workspaceId: string) => {
    try {
      const workspace = workspaces.value.find(w => w.id === workspaceId);
      const workspaceTabs = tabs.value.filter(t => t.workspaceId === workspaceId);
      
      const exportData = {
        workspace: { ...workspace, exportedAt: new Date().toISOString() },
        tabs: workspaceTabs,
        version: '1.0',
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workspace-${workspace?.name || workspaceId}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to export workspace';
      throw err;
    }
  };

  const importWorkspace = async (file: File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          
          if (!data.workspace || !data.tabs) {
            throw new Error('Invalid workspace file');
          }
          
          const workspace = await createWorkspace({
            name: `${data.workspace.name} (Imported)`,
            icon: data.workspace.icon,
            color: data.workspace.color,
          });
          
          for (const tab of data.tabs) {
            await createTabInWorkspace(workspace.id, {
              title: tab.title,
              url: tab.url,
              favicon: tab.favicon,
              pinned: tab.pinned,
              groupId: tab.groupId,
              groupName: tab.groupName,
              groupColor: tab.groupColor,
            });
          }
          
          if (data.workspace.layout) {
            await invoke('save_workspace_layout', { 
              workspaceId: workspace.id, 
              layout: data.workspace.layout 
            });
          }
          
          resolve(workspace);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const closeWorkspace = async (workspaceId: string) => {
    const workspaceTabs = tabs.value.filter(t => t.workspaceId === workspaceId);
    
    for (const tab of workspaceTabs) {
      await invoke('close_tab', { tabId: tab.id });
    }
    
    await deleteWorkspace(workspaceId);
  };

  const createTabInWorkspace = async (workspaceId: string, tabData: {
    url?: string;
    title?: string;
    favicon?: string;
    pinned?: boolean;
    groupId?: string;
    groupName?: string;
    groupColor?: string;
    incognito?: boolean;
    containerId?: string;
  }) => {
    const tab: WorkspaceTab = {
      id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      workspaceId,
      title: tabData.title || 'New Tab',
      url: tabData.url || 'https://duckduckgo.com',
      favicon: tabData.favicon || '',
      pinned: tabData.pinned || false,
      groupId: tabData.groupId || null,
      groupName: tabData.groupName || null,
      groupColor: tabData.groupColor || null,
      active: false,
      incognito: tabData.incognito || false,
      containerId: tabData.containerId || null,
      zoomLevel: 1.0,
      audioMuted: false,
      discarded: false,
      scrollPosition: { x: 0, y: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAccessedAt: Date.now(),
    };
    
    tabs.value.push(tab);
    
    try {
      await invoke('create_tab', { 
        workspaceId, 
        tab: {
          id: tab.id,
          title: tab.title,
          url: tab.url,
          favicon: tab.favicon,
          pinned: tab.pinned,
          groupId: tab.groupId,
          groupName: tab.groupName,
          groupColor: tab.groupColor,
          incognito: tab.incognito,
          containerId: tab.containerId,
          zoomLevel: tab.zoomLevel,
          audioMuted: tab.audioMuted,
        }
      });
    } catch (err) {
      console.error('Failed to create tab:', err);
    }
    
    return tab;
  };

  const moveTabToWorkspace = async (tabId: string, targetWorkspaceId: string) => {
    const tab = tabs.value.find(t => t.id === tabId);
    if (!tab) return;
    
    tab.workspaceId = targetWorkspaceId;
    tab.updatedAt = new Date().toISOString();
    
    try {
      await invoke('move_tab_to_workspace', { tabId, targetWorkspaceId });
    } catch (err) {
      console.error('Failed to move tab:', err);
    }
  };

  const saveWorkspaceLayout = async (workspaceId: string) => {
    try {
      await invoke('save_workspace_layout', { workspaceId });
    } catch (err) {
      console.error('Failed to save layout:', err);
    }
  };

  const loadWorkspaceLayout = async (workspaceId: string) => {
    try {
      await invoke('load_workspace_layout', { workspaceId });
    } catch (err) {
      console.error('Failed to load layout:', err);
    }
  };

  const setWorkspaceSettings = async (workspaceId: string, settings: Partial<WorkspaceSettings>) => {
    const workspace = workspaces.value.find(w => w.id === workspaceId);
    if (!workspace) return;
    
    workspace.settings = { ...workspace.settings, ...settings };
    workspace.updatedAt = new Date().toISOString();
    
    try {
      await invoke('update_workspace_settings', { workspaceId, settings });
    } catch (err) {
      console.error('Failed to update workspace settings:', err);
    }
  };

  const getTabCount = (workspaceId: string) => {
    return tabs.value.filter(t => t.workspaceId === workspaceId).length;
  };

  const getTabCountByType = (workspaceId: string, type: 'pinned' | 'regular' | 'incognito' | 'discarded') => {
    const workspaceTabs = tabs.value.filter(t => t.workspaceId === workspaceId);
    switch (type) {
      case 'pinned':
        return workspaceTabs.filter(t => t.pinned).length;
      case 'incognito':
        return workspaceTabs.filter(t => t.incognito).length;
      case 'discarded':
        return workspaceTabs.filter(t => t.discarded).length;
      default:
        return workspaceTabs.filter(t => !t.pinned && !t.incognito && !t.discarded).length;
    }
  };

  const getWorkspaceGroups = (workspaceId: string) => {
    const workspaceTabs = tabs.value.filter(t => t.workspaceId === workspaceId);
    const groups = new Map<string, { name: string; color: string; tabs: WorkspaceTab[] }>();
    
    for (const tab of workspaceTabs) {
      if (tab.groupId) {
        const existing = groups.get(tab.groupId);
        if (existing) {
          existing.tabs.push(tab);
        } else {
          groups.set(tab.groupId, {
            name: tab.groupName || 'Group',
            color: tab.groupColor || '#3b82f6',
            tabs: [tab],
          });
        }
      }
    }
    
    return Array.from(groups.entries()).map(([id, group]) => ({
      id,
      ...group,
      tabCount: group.tabs.length,
    }));
  };

  const searchWorkspaces = (query: string) => {
    const lowerQuery = query.toLowerCase();
    return workspaces.value.filter(w => 
      w.name.toLowerCase().includes(lowerQuery) ||
      tabs.value.some(t => t.workspaceId === w.id && 
        (t.title.toLowerCase().includes(lowerQuery) || t.url.toLowerCase().includes(lowerQuery)))
    );
  };

  const getWorkspaceStats = (workspaceId: string) => {
    const workspaceTabs = tabs.value.filter(t => t.workspaceId === workspaceId);
    const totalTabs = workspaceTabs.length;
    const pinnedTabs = workspaceTabs.filter(t => t.pinned).length;
    const incognitoTabs = workspaceTabs.filter(t => t.incognito).length;
    const discardedTabs = workspaceTabs.filter(t => t.discarded).length;
    const groups = getWorkspaceGroups(workspaceId).length;
    
    return {
      totalTabs,
      pinnedTabs,
      incognitoTabs,
      discardedTabs,
      groups,
      activeTab: activeTabId.value && tabs.value.find(t => t.id === activeTabId.value)?.workspaceId === workspaceId,
    };
  };

  const getRecentWorkspaces = (limit = 5) => {
    return workspaces.value
      .sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime())
      .slice(0, limit);
  };

  const getWorkspaceById = (workspaceId: string) => {
    return workspaces.value.find(w => w.id === workspaceId) || null;
  };

  const isWorkspaceEmpty = (workspaceId: string) => {
    return tabs.value.filter(t => t.workspaceId === workspaceId).length === 0;
  };

  const canCloseWorkspace = (workspaceId: string) => {
    return workspaces.value.length > 1;
  };

  const closeWorkspaceWithConfirmation = async (workspaceId: string) => {
    if (!canCloseWorkspace(workspaceId)) {
      error.value = 'Cannot delete the last workspace';
      return false;
    }
    
    if (!confirm('Close this workspace and all its tabs?')) return false;
    
    await closeWorkspace(workspaceId);
    return true;
  };

  onMounted(async () => {
    await loadWorkspaces();
  });

  onUnmounted(() => {
    // Cleanup
  });

  return {
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    tabs,
    activeTabId,
    activeTab,
    workspaceTabs,
    workspaceSettings,
    isLoading,
    error,
    loadWorkspaces,
    createWorkspace,
    deleteWorkspace,
    renameWorkspace,
    setActiveWorkspace,
    duplicateWorkspace,
    exportWorkspace,
    importWorkspace,
    closeWorkspace,
    createTabInWorkspace,
    moveTabToWorkspace,
    saveWorkspaceLayout,
    loadWorkspaceLayout,
    setWorkspaceSettings,
    getTabCount,
    getTabCountByType,
    getWorkspaceGroups,
    searchWorkspaces,
    getWorkspaceStats,
    getRecentWorkspaces,
    getWorkspaceById,
    isWorkspaceEmpty,
    canCloseWorkspace,
    closeWorkspaceWithConfirmation,
  };
}