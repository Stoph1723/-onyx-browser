import { ref, computed, watch, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';

export interface TabGroup {
  id: string;
  name: string;
  color: string;
  tabIds: string[];
  collapsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TabGroupSettings {
  defaultColor: string;
  autoGroup: boolean;
  maxTabsPerGroup: number;
}

export const GROUP_COLORS = [
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

export function useTabGroups() {
  const groups = ref<TabGroup[]>([]);
  const activeGroupId = ref<string | null>(null);
  const tabs = ref<any[]>([]);
  const activeTabId = ref<string | null>(null);
  const settings = ref<TabGroupSettings>({
    defaultColor: GROUP_COLORS[0],
    autoGroup: false,
    maxTabsPerGroup: 50,
  });

  const groupColors = GROUP_COLORS;

  const activeGroup = computed(() => 
    groups.value.find(g => g.id === activeGroupId.value) || null
  );

  const groupTabs = computed(() => {
    if (!activeGroupId.value) return [];
    const group = groups.value.find(g => g.id === activeGroupId.value);
    if (!group) return [];
    return group.tabIds.map(id => tabs.value.find(t => t.id === id)).filter(Boolean);
  });

  const ungroupedTabs = computed(() => 
    tabs.value.filter(t => !t.groupId)
  );

  const groupCounts = computed(() => {
    const counts: Record<string, number> = {};
    tabs.value.forEach(tab => {
      if (tab.groupId) {
        counts[tab.groupId] = (counts[tab.groupId] || 0) + 1;
      }
    });
    return counts;
  });

  const loadGroups = async () => {
    try {
      const [loadedGroups, loadedTabs, loadedSettings] = await Promise.all([
        invoke<TabGroup[]>('get_tab_groups'),
        invoke<any[]>('get_tabs'),
        invoke<TabGroupSettings>('get_tab_group_settings'),
      ]);
      groups.value = loadedGroups;
      tabs.value = loadedTabs;
      settings.value = loadedSettings;
      
      if (loadedGroups.length > 0 && !activeGroupId.value) {
        activeGroupId.value = loadedGroups[0].id;
      }
    } catch (err) {
      console.error('Failed to load tab groups:', err);
    }
  };

  const createGroup = async (name: string, color: string) => {
    const groupId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newGroup: TabGroup = {
      id: groupId,
      name,
      color,
      tabIds: [],
      collapsed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    groups.value.push(newGroup);
    activeGroupId.value = groupId;
    
    try {
      await invoke('create_tab_group', { group: newGroup });
    } catch (err) {
      console.error('Failed to create group:', err);
      groups.value = groups.value.filter(g => g.id !== groupId);
    }
  };

  const deleteGroup = async (groupId: string) => {
    const group = groups.value.find(g => g.id === groupId);
    if (!group) return;
    
    // Close all tabs in group
    for (const tabId of group.tabIds) {
      try {
        await invoke('close_tab', { tabId });
      } catch (err) {
        console.error('Failed to close tab:', err);
      }
    }
    
    groups.value = groups.value.filter(g => g.id !== groupId);
    
    if (activeGroupId.value === groupId) {
      activeGroupId.value = groups.value[0]?.id || null;
    }
    
    try {
      await invoke('delete_tab_group', { groupId });
    } catch (err) {
      console.error('Failed to delete group:', err);
    }
  };

  const renameGroup = async (groupId: string, name: string) => {
    const group = groups.value.find(g => g.id === groupId);
    if (!group) return;
    
    group.name = name;
    group.updatedAt = new Date().toISOString();
    
    try {
      await invoke('rename_tab_group', { groupId, name });
    } catch (err) {
      console.error('Failed to rename group:', err);
    }
  };

  const setActiveGroup = (groupId: string) => {
    activeGroupId.value = groupId;
  };

  const moveTabToGroup = async (tabId: string, groupId: string) => {
    const tab = tabs.value.find(t => t.id === tabId);
    if (!tab) return;
    
    // Remove from old group
    if (tab.groupId) {
      const oldGroup = groups.value.find(g => g.id === tab.groupId);
      if (oldGroup) {
        oldGroup.tabIds = oldGroup.tabIds.filter(id => id !== tabId);
      }
    }
    
    // Add to new group
    tab.groupId = groupId;
    const newGroup = groups.value.find(g => g.id === groupId);
    if (newGroup) {
      newGroup.tabIds.push(tabId);
    }
    
    try {
      await invoke('move_tab_to_group', { tabId, groupId });
    } catch (err) {
      console.error('Failed to move tab:', err);
    }
  };

  const ungroupTab = async (tabId: string) => {
    const tab = tabs.value.find(t => t.id === tabId);
    if (!tab || !tab.groupId) return;
    
    const group = groups.value.find(g => g.id === tab.groupId);
    if (group) {
      group.tabIds = group.tabIds.filter(id => id !== tabId);
    }
    
    tab.groupId = null;
    
    try {
      await invoke('ungroup_tab', { tabId });
    } catch (err) {
      console.error('Failed to ungroup tab:', err);
    }
  };

  const closeGroup = async (groupId: string) => {
    const group = groups.value.find(g => g.id === groupId);
    if (!group) return;
    
    for (const tabId of group.tabIds) {
      try {
        await invoke('close_tab', { tabId });
      } catch (err) {
        console.error('Failed to close tab:', err);
      }
    }
    
    groups.value = groups.value.filter(g => g.id !== groupId);
    
    if (activeGroupId.value === groupId) {
      activeGroupId.value = groups.value[0]?.id || null;
    }
    
    try {
      await invoke('close_tab_group', { groupId });
    } catch (err) {
      console.error('Failed to close group:', err);
    }
  };

  const toggleGroupCollapsed = (groupId: string) => {
    const group = groups.value.find(g => g.id === groupId);
    if (group) {
      group.collapsed = !group.collapsed;
      try {
        await invoke('set_group_collapsed', { groupId, collapsed: group.collapsed });
      } catch (err) {
        console.error('Failed to toggle group collapsed:', err);
      }
    }
  };

  const addTabToGroup = async (groupId: string, tabId: string) => {
    const tab = tabs.value.find(t => t.id === tabId);
    if (!tab) return;
    
    const group = groups.value.find(g => g.id === groupId);
    if (!group) return;
    
    if (tab.groupId) {
      const oldGroup = groups.value.find(g => g.id === tab.groupId);
      if (oldGroup) {
        oldGroup.tabIds = oldGroup.tabIds.filter(id => id !== tabId);
      }
    }
    
    tab.groupId = groupId;
    group.tabIds.push(tabId);
    
    try {
      await invoke('move_tab_to_group', { tabId, groupId });
    } catch (err) {
      console.error('Failed to add tab to group:', err);
    }
  };

  const reorderTabsInGroup = (groupId: string, fromIndex: number, toIndex: number) => {
    const group = groups.value.find(g => g.id === groupId);
    if (!group) return;
    
    const [removed] = group.tabIds.splice(fromIndex, 1);
    group.tabIds.splice(toIndex, 0, removed);
  };

  const getGroupForTab = (tabId: string) => {
    const tab = tabs.value.find(t => t.id === tabId);
    if (!tab || !tab.groupId) return null;
    return groups.value.find(g => g.id === tab.groupId) || null;
  };

  const isTabInGroup = (tabId: string, groupId: string) => {
    const tab = tabs.value.find(t => t.id === tabId);
    return tab?.groupId === groupId;
  };

  const getNextGroup = (currentGroupId?: string) => {
    const currentIndex = groups.value.findIndex(g => g.id === (currentGroupId || activeGroupId.value));
    const nextIndex = (currentIndex + 1) % groups.value.length;
    return groups.value[nextIndex] || null;
  };

  const getPreviousGroup = (currentGroupId?: string) => {
    const currentIndex = groups.value.findIndex(g => g.id === (currentGroupId || activeGroupId.value));
    const prevIndex = currentIndex <= 0 ? groups.value.length - 1 : currentIndex - 1;
    return groups.value[prevIndex] || null;
  };

  return {
    groups,
    activeGroupId,
    activeGroup,
    tabs,
    activeTabId,
    settings,
    groupColors,
    groupTabs,
    ungroupedTabs,
    groupCounts,
    loadGroups,
    createGroup,
    deleteGroup,
    renameGroup,
    setActiveGroup,
    moveTabToGroup,
    ungroupTab,
    closeGroup,
    toggleGroupCollapsed,
    addTabToGroup,
    reorderTabsInGroup,
    getGroupForTab,
    isTabInGroup,
    getNextGroup,
    getPreviousGroup,
  };
}