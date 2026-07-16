<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useWorkspace } from '../composables/useWorkspace';
import Button from './ui/Button.vue';
import Input from './ui/Input.vue';
import Select from './ui/Select.vue';
import Switch from './ui/Switch.vue';
import Dialog from './ui/Dialog.vue';

const {
  workspaces,
  activeWorkspaceId,
  activeWorkspace,
  tabs,
  activeTabId,
  createWorkspace,
  deleteWorkspace,
  renameWorkspace,
  setActiveWorkspace,
  duplicateWorkspace,
  exportWorkspace,
  importWorkspace,
  saveWorkspaceLayout,
  loadWorkspaceLayout,
  createTabInWorkspace,
  moveTabToWorkspace,
  closeWorkspace,
  setWorkspaceSettings,
  workspaceSettings,
  loadWorkspaces,
} = useWorkspace();

const showCreateDialog = ref(false);
const showImportDialog = ref(false);
const showSettingsDialog = ref(false);
const newWorkspaceName = ref('');
const newWorkspaceIcon = ref('📁');
const newWorkspaceColor = ref('#3b82f6');
const editingWorkspaceId = ref<string | null>(null);
const editingWorkspaceName = ref('');
const importFile = ref<File | null>(null);
const showSwitcher = ref(false);
const searchQuery = ref('');

const workspacesList = computed(() => workspaces.value);
const filteredWorkspaces = computed(() => 
  workspaces.value.filter(w => 
    w.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
);

const activeWorkspaceTabs = computed(() => 
  tabs.value.filter(t => t.workspaceId === activeWorkspaceId.value)
);

const handleCreateWorkspace = async () => {
  if (!newWorkspaceName.value.trim()) return;
  await createWorkspace({
    name: newWorkspaceName.value.trim(),
    icon: newWorkspaceIcon.value,
    color: newWorkspaceColor.value,
  });
  newWorkspaceName.value = '';
  newWorkspaceIcon.value = '📁';
  newWorkspaceColor.value = '#3b82f6';
  showCreateDialog.value = false;
};

const handleDeleteWorkspace = async (workspaceId: string) => {
  if (!confirm('Delete this workspace and all its tabs?')) return;
  await deleteWorkspace(workspaceId);
};

const handleRenameWorkspace = async (workspaceId: string) => {
  if (!editingWorkspaceName.value.trim()) return;
  await renameWorkspace(workspaceId, editingWorkspaceName.value.trim());
  editingWorkspaceId.value = null;
  editingWorkspaceName.value = '';
};

const handleDuplicateWorkspace = async (workspaceId: string) => {
  await duplicateWorkspace(workspaceId);
};

const handleExportWorkspace = async (workspaceId: string) => {
  await exportWorkspace(workspaceId);
};

const handleImportWorkspace = async () => {
  if (!importFile.value) return;
  try {
    await importWorkspace(importFile.value);
    importFile.value = null;
    showImportDialog.value = false;
  } catch (err) {
    console.error('Import failed:', err);
  }
};

const handleCloseWorkspace = async (workspaceId: string) => {
  if (!confirm('Close this workspace and all its tabs?')) return;
  await closeWorkspace(workspaceId);
};

const handleSaveLayout = async (workspaceId: string) => {
  await saveWorkspaceLayout(workspaceId);
};

const handleLoadLayout = async (workspaceId: string) => {
  await loadWorkspaceLayout(workspaceId);
};

const handleSwitchWorkspace = async (workspaceId: string) => {
  await setActiveWorkspace(workspaceId);
  showSwitcher.value = false;
};

const openRenameDialog = (workspace: any) => {
  editingWorkspaceId.value = workspace.id;
  editingWorkspaceName.value = workspace.name;
};

const openImportDialog = () => {
  showImportDialog.value = true;
};

const handleImport = async () => {
  if (!importFile.value) return;
  try {
    await importWorkspace(importFile.value);
    importFile.value = null;
    showImportDialog.value = false;
  } catch (err) {
    console.error('Import failed:', err);
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getWorkspaceIcon = (workspace: any) => workspace.icon || '📁';
const getWorkspaceColor = (workspace: any) => workspace.color || '#3b82f6';

onMounted(() => {
  loadWorkspaces();
  
  // Keyboard shortcut for workspace switcher (Ctrl+Shift+W)
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});

const handleKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'W') {
    e.preventDefault();
    showSwitcher.value = !showSwitcher.value;
    if (showSwitcher.value) {
      searchQuery.value = '';
      nextTick(() => {
        const input = document.querySelector('.switcher-search input') as HTMLInputElement;
        input?.focus();
      }
    }
  }
  
  if (e.key === 'Escape') {
    showSwitcher.value = false;
    showCreateDialog.value = false;
    showImportDialog.value = false;
    showSettingsDialog.value = false;
  }
});

// Close switcher when clicking outside
const handleClickOutside = (e: MouseEvent) => {
  if (showSwitcher.value && !(e.target as Element).closest('.workspace-switcher')) {
    showSwitcher.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div class="workspace-manager">
    <!-- Workspace Switcher Overlay -->
    <Teleport to="body">
      <div v-if="showSwitcher" class="workspace-switcher-overlay" @click.self="showSwitcher = false">
        <div class="workspace-switcher">
          <div class="switcher-header">
            <h2>Switch Workspace</h2>
            <div class="switcher-search">
              <Input
                v-model="searchQuery"
                placeholder="Search workspaces..."
                class="switcher-search-input"
                leadingIcon="
                  <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                    <circle cx='11' cy='11' r='8' />
                    <line x1='21' y1='21' x2='16.65' y2='16.65' />
                  </svg>
                "
                autofocus
              />
            </div>
          </div>
          
          <div class="switcher-list">
            <div 
              v-for="workspace in filteredWorkspaces" 
              :key="workspace.id"
              class="switcher-item"
              :class="{ active: activeWorkspaceId === workspace.id }"
              @click="handleSwitchWorkspace(workspace.id)"
            >
              <span class="workspace-icon" :style="{ backgroundColor: getWorkspaceColor(workspace) }">{{ getWorkspaceIcon(workspace) }}</span>
              <div class="workspace-info">
                <span class="workspace-name">{{ workspace.name }}</span>
                <span class="workspace-meta">{{ getTabCount(workspace.id) }} tabs</span>
              </div>
              <span v-if="activeWorkspaceId === workspace.id" class="active-badge">Active</span>
            </div>
            
            <div v-if="filteredWorkspaces.length === 0" class="switcher-empty">
              <p>No workspaces found</p>
              <Button size="sm" variant="primary" @click="showCreateDialog = true; showSwitcher = false">
                Create Workspace
              </Button>
            </div>
            
            <div class="switcher-footer">
              <Button variant="ghost" size="sm" @click="showCreateDialog = true; showSwitcher = false">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Workspace
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Main Manager UI -->
    <div class="workspace-manager">
      <!-- Header -->
      <header class="manager-header">
        <div class="header-left">
          <h2>Workspaces</h2>
          <span class="workspace-count">{{ workspaces.length }} workspaces</span>
        </div>
        <div class="header-actions">
          <Button variant="ghost" size="sm" @click="showSwitcher = true" leadingIcon="
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
              <circle cx='12' cy='12' r='10' />
              <polyline points='12 6 12 12 16 14' />
            </svg>
            Switch (⌘⇧W)
          </Button>
          <Button variant="primary" @click="showCreateDialog = true" leadingIcon="
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
              <line x1='12' y1='5' x2='12' y2='19' />
              <line x1='5' y1='12' x2='19' y2='12' />
            </svg>
            New Workspace
          </Button>
        </div>
      </header>

      <!-- Workspace Grid -->
      <div class="workspace-grid-container">
        <div v-if="workspaces.length === 0" class="empty-state">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.3; margin-bottom: 16px;">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <path d="M12 8v4l4 4" />
          </svg>
          <h3>No Workspaces Yet</h3>
          <p>Create your first workspace to organize your browsing</p>
          <Button variant="primary" @click="showCreateDialog = true" style="margin-top: 16px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create First Workspace
          </Button>
        </div>

        <div v-else class="workspace-grid">
          <WorkspaceCard
            v-for="workspace in workspaces"
            :key="workspace.id"
            :workspace="workspace"
            :active="activeWorkspaceId === workspace.id"
            @click="handleSwitchWorkspace(workspace.id)"
            @contextmenu.prevent="editingWorkspaceId = workspace.id; contextMenuX = event.clientX; contextMenuY = event.clientY; showContextMenu = true"
            :class="{ active: activeWorkspaceId === workspace.id }"
          />
          
          <!-- New Workspace Card -->
          <div class="workspace-card new-workspace-card" @click="showCreateDialog = true">
            <div class="new-workspace-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <span class="new-workspace-text">New Workspace</span>
            <span class="new-workspace-hint">Create a new workspace</span>
          </div>
        </div>
      </div>

      <!-- Context Menu -->
      <Teleport to="body">
        <div v-if="showContextMenu" class="context-menu" :style="{ top: contextMenuY + 'px', left: contextMenuX + 'px' }" @click.outside="showContextMenu = false">
          <div class="context-menu-header">
            <span class="menu-workspace-title">{{ workspaces.find(w => w.id === editingWorkspaceId)?.name }}</span>
          </div>
          <div class="menu-section">
            <button class="menu-item" @click="handleSwitchWorkspace(editingWorkspaceId); showContextMenu = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
              </svg>
              Switch to This Workspace
            </button>
            <button class="menu-item" @click="handleDuplicateWorkspace(editingWorkspaceId); showContextMenu = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Duplicate Workspace
            </button>
            <button class="menu-item" @click="handleExportWorkspace(editingWorkspaceId); showContextMenu = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Export Workspace
            </button>
            <button class="menu-item" @click="editingWorkspaceId = editingWorkspaceId; showContextMenu = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Rename
            </button>
            <button class="menu-item" @click="handleLoadLayout(editingWorkspaceId); showContextMenu = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 3v12" />
                <path d="M8 11l4 4 4-4" />
              </svg>
              Load Layout
            </button>
            <button class="menu-item" @click="handleSaveLayout(editingWorkspaceId); showContextMenu = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 13 13" />
              </svg>
              Save Layout
            </button>
            <button class="menu-item danger" @click="confirmDeleteWorkspace(editingWorkspaceId)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete Workspace
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Create Workspace Dialog -->
    <Dialog v-model:open="showCreateDialog" title="Create Workspace" width="450">
      <div class="dialog-body">
        <Input
          v-model="newWorkspaceName"
          label="Workspace Name"
          placeholder="e.g., Work, Personal, Research"
          @keydown.enter="handleCreateWorkspace"
          autofocus
        />
        
        <div class="form-row">
          <div class="form-group">
            <label>Icon</label>
            <Input
              v-model="newWorkspaceIcon"
              placeholder="📁"
              maxlength="2"
            />
          </div>
          <div class="form-group">
            <label>Color</label>
            <div class="color-picker">
              <button
                v-for="color in workspaceColors"
                :key="color"
                class="color-option"
                :style="{ backgroundColor: color }"
                :class="{ selected: newWorkspaceColor === color }"
                @click="newWorkspaceColor = color"
                :aria-label="color"
                :aria-pressed="newWorkspaceColor === color"
              />
            </div>
          </div>
        </div>
        
        <div class="dialog-actions">
          <Button variant="ghost" @click="showCreateDialog = false">Cancel</Button>
          <Button variant="primary" @click="handleCreateWorkspace" :disabled="!newWorkspaceName.trim()" :loading="isLoading">
            Create Workspace
          </Button>
        </div>
      </Dialog>

      <!-- Import Dialog -->
      <Dialog v-model:open="showImportDialog" title="Import Workspace" width="450">
        <p class="dialog-description">Select a workspace JSON file to import</p>
        <input
          type="file"
          ref="importFileInput"
          accept=".json"
          @change="importFile = $event.target.files[0]"
          class="file-input"
          hidden
        />
        <Button variant="secondary" class="file-input-btn" @click="$refs.importFileInput.click()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Choose File
        </Button>
        <p v-if="importFile" class="selected-file">{{ importFile.name }} ({{ formatFileSize(importFile.size) }})</p>
        <div class="dialog-actions">
          <Button variant="ghost" @click="showImportDialog = false; importFile = null">Cancel</Button>
          <Button variant="primary" @click="handleImportWorkspace" :disabled="!importFile" :loading="isLoading">
            Import Workspace
          </Button>
        </div>
      </Dialog>
    </div>
  </div>
</template>

<script>
const workspaceColors = [
  '#3b82f6', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899',
  '#14b8a6', '#f43f5e', '#6366f1', '#84cc16',
];
</script>

<style scoped>
.workspace-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-secondary);
  overflow: hidden;
}

.manager-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
}

.header-left h2 {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.workspace-count {
  font-size: var(--text-sm);
  color: var(--fg-tertiary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.workspace-grid-container {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  text-align: center;
  color: var(--fg-tertiary);
  gap: var(--space-3);
}

.empty-state h3 {
  margin: 0;
  font-size: var(--text-lg);
  color: var(--fg-secondary);
}

.empty-state p {
  margin: 0;
  font-size: var(--text-sm);
}

.workspace-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-4);
  padding: var(--space-2);
}

.workspace-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl);
  padding: var(--space-4);
  cursor: pointer;
  transition: var(--transition-normal);
  position: relative;
  display: flex;
  flex-direction: column;
}

.workspace-card:hover {
  border-color: var(--border-secondary);
  box-shadow: var(--shadow-lg);
  transform: translateY(-4px);
}

.workspace-card.active {
  border-color: var(--color-brand-500);
  box-shadow: 0 0 0 2px var(--color-brand-500), var(--shadow-lg);
}

.workspace-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.workspace-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-2xl);
  flex-shrink: 0;
}

.workspace-info {
  flex: 1;
  min-width: 0;
}

.workspace-name {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--fg-primary);
  margin: 0 0 var(--space-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
}

.tab-count {
  background: var(--bg-tertiary);
  padding: 1px 8px;
  border-radius: var(--radius-full);
  font-weight: var(--font-medium);
}

.last-accessed {
  opacity: 0.7;
}

.workspace-actions {
  display: flex;
  gap: var(--space-1);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.workspace-card:hover .workspace-actions {
  opacity: 1;
}

.workspace-card:focus-within .workspace-actions {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--fg-secondary);
  cursor: pointer;
  transition: var(--transition-fast);
}

.action-btn:hover {
  background: var(--bg-tertiary);
  color: var(--fg-primary);
}

.action-btn.danger:hover {
  background: var(--color-error-100);
  color: var(--color-error-600);
}

@media (prefers-color-scheme: dark) {
  .action-btn.danger:hover {
    background: var(--color-error-900);
    color: var(--color-error-400);
  }
}

.new-workspace-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  background: var(--bg-secondary);
  border: 2px dashed var(--border-primary);
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: var(--transition-normal);
  min-height: 200px;
}

.new-workspace-card:hover {
  border-color: var(--color-brand-500);
  background: var(--accent-muted);
}

.new-workspace-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-xl);
  background: var(--color-brand-100);
  color: var(--color-brand-600);
  margin-bottom: var(--space-3);
}

@media (prefers-color-scheme: dark) {
  .new-workspace-icon {
    background: var(--color-brand-900);
    color: var(--color-brand-400);
  }
}

.new-workspace-text {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--fg-primary);
  margin-bottom: var(--space-1);
}

.new-workspace-hint {
  font-size: var(--text-sm);
  color: var(--fg-tertiary);
}

.workspace-card:focus-visible {
  outline: 2px solid var(--color-brand-500);
  outline-offset: 2px;
}

/* Context Menu */
.context-menu {
  position: fixed;
  z-index: var(--z-popover);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  min-width: 220px;
  overflow: hidden;
}

.context-menu-header {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--border-primary);
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
  background: var(--color-error-100);
}

@media (prefers-color-scheme: dark) {
  .menu-item.danger:hover {
    background: var(--color-error-900);
  }
}

/* Create Dialog */
.dialog-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

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

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-primary);
}

.file-input {
  display: none;
}

.file-input-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.selected-file {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  margin-top: var(--space-2);
}

.dialog-description {
  color: var(--fg-secondary);
  font-size: var(--text-sm);
  margin: 0 0 var(--space-4);
}

.dialog-hint {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  margin: 0;
}

.dialog-hint a {
  color: var(--color-brand-500);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-primary);
}

/* Workspace Switcher */
.workspace-switcher-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
}

.workspace-switcher {
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-2xl);
  overflow: hidden;
  animation: slideUp var(--duration-normal) var(--ease-out);
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.switcher-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-primary);
}

.switcher-header h2 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.switcher-search {
  width: 100%;
}

.switcher-search-input {
  width: 100%;
}

.switcher-list {
  max-height: 50vh;
  overflow-y: auto;
}

.switcher-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  transition: var(--transition-fast);
  border-bottom: 1px solid var(--border-primary);
}

.switcher-item:hover {
  background: var(--bg-tertiary);
}

.switcher-item.active {
  background: var(--accent-muted);
}

.workspace-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-lg);
  flex-shrink: 0;
}

.workspace-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.workspace-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--fg-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.workspace-meta {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
}

.active-badge {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--color-brand-100);
  color: var(--color-brand-700);
}

@media (prefers-color-scheme: dark) {
  .active-badge {
    background: var(--color-brand-900);
    color: var(--color-brand-300);
  }
}

.switcher-empty {
  padding: var(--space-8);
  text-align: center;
  color: var(--fg-tertiary);
}

.switcher-empty p {
  margin: 0 0 var(--space-3);
  font-weight: var(--font-medium);
}

.switcher-footer {
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--border-primary);
}

.switcher-empty p {
  margin: 0 0 var(--space-3);
  font-weight: var(--font-medium);
  color: var(--fg-secondary);
}

.empty-hint {
  font-size: var(--text-sm) !important;
  opacity: 0.7;
}

/* Responsive */
@media (max-width: 768px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }
  
  .manager-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }
  
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>