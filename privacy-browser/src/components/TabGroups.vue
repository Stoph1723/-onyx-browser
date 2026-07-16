import { ref, computed, watch, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useTabGroups } from '../composables/useTabGroups';
import Button from './ui/Button.vue';
import Input from './ui/Input.vue';
import Select from './ui/Select.vue';

const {
  groups,
  activeGroupId,
  activeGroup,
  tabs,
  activeTabId,
  createGroup,
  deleteGroup,
  renameGroup,
  setActiveGroup,
  moveTabToGroup,
  ungroupTab,
  closeGroup,
  toggleGroupCollapsed,
  groupColors,
  loadGroups,
} = useTabGroups();

const showCreateDialog = ref(false);
const showRenameDialog = ref(false);
const newGroupName = ref('');
const newGroupColor = ref(groupColors[0]);
const renameGroupId = ref<string | null>(null);
const renameGroupName = ref('');
const editingTabGroup = ref<string | null>(null);
const showMoveToGroup = ref(false);
const moveTabId = ref<string | null>(null);

const openCreateDialog = () => {
  newGroupName.value = '';
  newGroupColor.value = groupColors[0];
  showCreateDialog.value = true;
};

const createGroupHandler = async () => {
  if (!newGroupName.value.trim()) return;
  await createGroup(newGroupName.value.trim(), newGroupColor.value);
  showCreateDialog.value = false;
};

const openRenameDialog = (groupId: string) => {
  const group = groups.value.find(g => g.id === groupId);
  if (group) {
    renameGroupId.value = groupId;
    renameGroupName.value = group.name;
    showRenameDialog.value = true;
  }
};

const renameGroupHandler = async () => {
  if (!renameGroupId.value || !renameGroupName.value.trim()) return;
  await renameGroup(renameGroupId.value, renameGroupName.value.trim());
  showRenameDialog.value = false;
  renameGroupId.value = null;
};

const handleDeleteGroup = async (groupId: string) => {
  if (!confirm('Delete this group and all its tabs?')) return;
  await deleteGroup(groupId);
};

const handleCloseGroup = async (groupId: string) => {
  await closeGroup(groupId);
};

const handleMoveTabToGroup = async (tabId: string) => {
  moveTabId.value = tabId;
  showMoveToGroup.value = true;
};

const confirmMoveTab = async (groupId: string) => {
  if (!moveTabId.value) return;
  await moveTabToGroup(moveTabId.value, groupId);
  showMoveToGroup.value = false;
  moveTabId.value = null;
};

const openEditGroup = (groupId: string) => {
  editingTabGroup.value = editingTabGroup.value === groupId ? null : groupId;
};

const handleUngroupTab = async (tabId: string) => {
  await ungroupTab(tabId);
};

const handleAddTabToGroup = async (groupId: string) => {
  const newTab = await invoke('create_tab', { 
    tabId: `tab-${Date.now()}`, 
    url: 'https://duckduckgo.com',
    groupId,
  });
  // The tab will be added via the backend
};

onMounted(() => {
  loadGroups();
});

watch(() => props.activeTabId, (newTabId) => {
  if (newTabId) {
    const tab = tabs.value.find(t => t.id === newTabId);
    if (tab && tab.groupId && tab.groupId !== activeGroupId.value) {
      setActiveGroup(tab.groupId);
    }
  }
}, { immediate: true });
</script>

<template>
  <div class="tab-groups-bar">
    <!-- Group Tabs -->
    <div class="group-tabs" role="tablist">
      <button
        v-for="group in groups"
        :key="group.id"
        class="group-tab"
        :class="{
          active: group.id === activeGroupId,
          collapsed: group.collapsed,
        }"
        :style="{ borderColor: group.color }"
        @click="setActiveGroup(group.id)"
        @dblclick="openRenameDialog(group.id)"
        role="tab"
        :aria-selected="group.id === activeGroupId"
        :aria-controls="group.id"
        :aria-expanded="!group.collapsed"
      >
        <span 
          class="group-color-indicator" 
          :style="{ backgroundColor: group.color }"
        />
        <span class="group-name">{{ group.name }}</span>
        <span class="group-tab-count">{{ group.tabIds?.length || 0 }}</span>
        <button
          class="group-collapse-btn"
          @click.stop="toggleGroupCollapsed(group.id)"
          :aria-label="group.collapsed ? 'Expand' : 'Collapse'"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline :points="group.collapsed ? '9 18 15 12 9 6' : '15 18 9 12 15 6'" />
          </svg>
        </button>
        <button
          class="group-close-btn"
          @click.stop="handleCloseGroup(group.id)"
          aria-label="Close group"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </button>

      <!-- New Group Button -->
      <button class="new-group-btn" @click="openCreateDialog" aria-label="New group">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>

    <!-- Collapsed Group Preview -->
    <div v-if="activeGroup?.collapsed" class="collapsed-preview">
      <div class="preview-content">
        <span>Group collapsed</span>
        <span class="preview-count">{{ activeGroup.tabIds?.length || 0 }} tabs</span>
        <button class="expand-btn" @click="toggleGroupCollapsed(activeGroup.id)">
          Expand
        </button>
      </div>
    </div>
  </div>

  <!-- Create Group Dialog -->
  <Dialog v-model:open="showCreateDialog" title="Create Tab Group" width="400">
    <div class="dialog-body">
      <Input
        v-model="newGroupName"
        label="Group Name"
        placeholder="Enter group name"
        @keydown.enter="createGroupHandler"
        autofocus
      />
      
      <div class="form-group">
        <label>Color</label>
        <div class="color-picker">
          <button
            v-for="color in groupColors"
            :key="color"
            class="color-option"
            :style="{ backgroundColor: color }"
            :class="{ selected: newGroupColor === color }"
            @click="newGroupColor = color"
            :aria-label="Color"
            :aria-pressed="newGroupColor === color"
          />
        </div>
      </div>
      
      <div class="dialog-actions">
        <Button variant="ghost" @click="showCreateDialog = false">Cancel</Button>
        <Button variant="primary" @click="createGroupHandler" :disabled="!newGroupName.trim()">
          Create
        </Button>
      </div>
    </Dialog>

    <!-- Rename Dialog -->
    <Dialog v-model:open="showRenameDialog" :title="'Rename ' + renameGroupName" width="400">
      <Input
        v-model="renameGroupName"
        label="Group Name"
        placeholder="Enter new name"
        @keydown.enter="renameGroupHandler"
        autofocus
      />
      
      <div class="dialog-actions">
        <Button variant="ghost" @click="showRenameDialog = false; renameGroupId = null">Cancel</Button>
        <Button variant="primary" @click="renameGroupHandler" :disabled="!renameGroupName.trim()">
          Rename
        </Button>
      </div>
    </Dialog>

    <!-- Move Tab to Group Dialog -->
    <Dialog v-model:open="showMoveToGroup" title="Move Tab to Group" width="400">
      <p class="dialog-description">Select a group to move the tab to, or create a new group.</p>
      
      <div class="group-options">
        <div 
          v-for="group in groups" 
          :key="group.id"
          class="group-option"
          @click="confirmMoveTab(group.id)"
        >
          <span class="option-color" :style="{ backgroundColor: group.color }" />
          <span class="option-name">{{ group.name }}</span>
          <span class="option-count">{{ group.tabIds?.length || 0 }} tabs</span>
        </div>
        
        <div class="group-option new-group" @click="showMoveToGroup = false; openCreateDialog()">
          <span class="option-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
          <span class="option-name">New Group</span>
        </div>
      </div>
    </Dialog>

    <!-- Context Menu for Tab -->
    <Teleport to="body">
      <div 
        v-if="editingTabGroup" 
        class="tab-group-context-menu"
        :style="{ 
          top: contextMenuY + 'px', 
          left: contextMenuX + 'px' 
        }"
        @click.outside="editingTabGroup = null"
      >
        <div class="context-menu-header">
          <span class="menu-tab-title">{{ tabs.find(t => t.id === editingTabGroup)?.title || 'Tab' }}</span>
        </div>
        
        <div class="menu-section">
          <button class="menu-item" @click="handleMoveTabToGroup(editingTabGroup!); editingTabGroup = null">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 9l7-7 7 7" />
              <path d="M12 16V4" />
            </svg>
            Move to Group
          </button>
          <button class="menu-item" @click="handleUngroupTab(editingTabGroup!); editingTabGroup = null">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12H3" />
            </svg>
            Remove from Group
          </button>
        </div>
        
        <div class="menu-section">
          <button class="menu-item danger" @click="invoke('close_tab', { tabId: editingTabGroup }); editingTabGroup = null">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Close Tab
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
const contextMenuX = ref(0);
const contextMenuY = ref(0);

const handleTabContextMenu = (e: MouseEvent, tabId: string) => {
  e.preventDefault();
  editingTabGroup.value = tabId;
  contextMenuX.value = e.clientX;
  contextMenuY.value = e.clientY;
};

const handleDocumentClick = (e: MouseEvent) => {
  if (editingTabGroup.value && !(e.target as Element).closest('.tab-group-context-menu')) {
    editingTabGroup.value = null;
  }
};

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<style scoped>
.tab-groups-bar {
  display: flex;
  flex-direction: column;
  height: 32px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  user-select: none;
}

.group-tabs {
  display: flex;
  align-items: stretch;
  height: 100%;
  overflow-x: auto;
  padding: 0 var(--space-1);
  gap: var(--space-1);
}

.group-tab {
  display: flex;
  align-items: center;
  height: 100%;
  min-width: 100px;
  max-width: 200px;
  padding: 0 var(--space-3);
  gap: var(--space-2);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--fg-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: var(--transition-fast);
  white-space: nowrap;
  position: relative;
}

.group-tab:hover:not(.active) {
  background: var(--bg-tertiary);
  color: var(--fg-primary);
}

.group-tab.active {
  color: var(--fg-primary);
  border-bottom-color: currentColor;
  background: var(--bg-primary);
}

.group-tab.collapsed {
  max-width: 40px;
}

.group-tab.collapsed .group-name,
.group-tab.collapsed .group-tab-count {
  display: none;
}

.group-color-indicator {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.group-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-tab-count {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  background: var(--bg-tertiary);
  padding: 1px 6px;
  border-radius: var(--radius-full);
  min-width: 24px;
  text-align: center;
}

.group-collapse-btn,
.group-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--fg-secondary);
  cursor: pointer;
  opacity: 0;
  transition: var(--transition-fast);
  flex-shrink: 0;
}

.group-tab:hover .group-collapse-btn,
.group-tab:hover .group-close-btn,
.group-tab.active .group-collapse-btn,
.group-tab.active .group-close-btn {
  opacity: 1;
}

.group-close-btn:hover {
  background: var(--color-error-500);
  color: white;
}

.new-group-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 100%;
  min-width: 32px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--fg-secondary);
  cursor: pointer;
  transition: var(--transition-fast);
  flex-shrink: 0;
}

.new-group-btn:hover {
  background: var(--bg-tertiary);
  color: var(--fg-primary);
  border-bottom-color: var(--color-brand-500);
}

/* Collapsed Preview */
.collapsed-preview {
  height: 40px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--space-4);
  animation: slideDown var(--duration-fast) var(--ease-out);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.preview-content {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--fg-secondary);
  font-size: var(--text-sm);
}

.preview-count {
  background: var(--bg-primary);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.expand-btn {
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--fg-primary);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: var(--transition-fast);
}

.expand-btn:hover {
  background: var(--color-brand-500);
  border-color: var(--color-brand-500);
  color: white;
}

/* Dialog Styles */
.color-picker {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.color-option {
  width: 28px;
  height: 28px;
  border: 2px solid transparent;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: var(--transition-fast);
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.selected {
  border-color: var(--fg-primary);
  box-shadow: 0 0 0 2px var(--color-brand-500);
}

.group-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.group-option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition-fast);
}

.group-option:hover {
  background: var(--bg-tertiary);
}

.group-option.new-group {
  color: var(--color-brand-500);
}

.option-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--color-brand-500);
}

.option-color {
  width: 12px;
  height: 12px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.option-name {
  flex: 1;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.option-count {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
}

/* Context Menu */
.tab-group-context-menu {
  position: fixed;
  z-index: var(--z-popover);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  min-width: 200px;
  overflow: hidden;
}

.context-menu-header {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--border-primary);
}

.menu-tab-title {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.menu-section {
  padding: var(--space-1);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--fg-primary);
  font-size: var(--text-sm);
  text-align: left;
  cursor: pointer;
  transition: var(--transition-fast);
}

.menu-item:hover {
  background: var(--bg-tertiary);
}

.menu-item.danger {
  color: var(--color-error-500);
}

.menu-item.danger:hover {
  background: var(--color-error-50);
}

@media (prefers-color-scheme: dark) {
  .menu-item.danger:hover {
    background: var(--color-error-900);
  }
}
</style>