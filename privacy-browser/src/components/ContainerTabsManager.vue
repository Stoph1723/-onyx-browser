<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useContainerTabs } from '../composables/useContainerTabs';
import Button from './ui/Button.vue';
import Input from './ui/Input.vue';
import Select from './ui/Select.vue';
import Switch from './ui/Switch.vue';
import Dialog from './ui/Dialog.vue';

const {
  containers,
  activeContainerId,
  activeContainer,
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
} = useContainerTabs();

const showCreateDialog = ref(false);
const showImportDialog = ref(false);
const showSettingsDialog = ref(false);
const newContainerName = ref('');
const newContainerColor = ref(CONTAINER_COLORS[0]);
const newContainerPreset = ref('personal');
const editingContainerId = ref<string | null>(null);
const editingContainerName = ref('');
const importFile = ref<File | null>(null);
const showProxyDialog = ref(false);
const editingProxyContainerId = ref<string | null>(null);
const proxyConfig = ref({ host: '', port: '', username: '', password: '' });
const showUserAgentDialog = ref(false);
const editingUAContainerId = ref<string | null>(null);
const customUserAgent = ref('');

const filteredContainers = computed(() => containers.value);

const handleCreateContainer = async () => {
  if (!newContainerName.value.trim()) return;
  
  const preset = CONTAINER_PRESETS.find(p => p.name.toLowerCase() === newContainerPreset.value.toLowerCase());
  await createContainer({
    name: newContainerName.value.trim(),
    color: newContainerColor.value,
    preset,
  });
  
  newContainerName.value = '';
  showCreateDialog.value = false;
};

const handleDeleteContainer = async (containerId: string) => {
  if (!confirm('Delete this container and all its data?')) return;
  await deleteContainer(containerId);
};

const handleRenameContainer = async (containerId: string) => {
  if (!editingContainerName.value.trim()) return;
  await renameContainer(containerId, editingContainerName.value.trim());
  editingContainerId.value = null;
  editingContainerName.value = '';
};

const handleDuplicateContainer = async (containerId: string) => {
  await duplicateContainer(containerId);
};

const handleExportContainer = async (containerId: string) => {
  await exportContainer(containerId);
};

const handleImportContainer = async () => {
  if (!importFile.value) return;
  try {
    await importContainer(importFile.value);
    importFile.value = null;
    showImportDialog.value = false;
  } catch (err) {
    console.error('Import failed:', err);
  }
};

const handleClearData = async (containerId: string) => {
  if (!confirm('Clear all data for this container? This cannot be undone.')) return;
  await clearContainerData(containerId);
};

const handleSetProxy = async (containerId: string) => {
  editingProxyContainerId.value = containerId;
  const container = containers.value.find(c => c.id === containerId);
  if (container && (container as any).proxy) {
    const proxy = (container as any).proxy;
    proxyConfig.value = { ...proxy };
  } else {
    proxyConfig.value = { host: '', port: '', username: '', password: '' };
  }
  showProxyDialog.value = true;
};

const handleSaveProxy = async () => {
  if (!editingProxyContainerId.value) return;
  
  const proxy = {
    host: proxyConfig.value.host,
    port: parseInt(proxyConfig.value.port) || 8080,
    username: proxyConfig.value.username || undefined,
    password: proxyConfig.value.password || undefined,
  };
  
  await setContainerProxy(editingProxyContainerId.value, proxy);
  showProxyDialog.value = false;
  editingProxyContainerId.value = null;
  proxyConfig.value = { host: '', port: '', username: '', password: '' };
};

const handleRemoveProxy = async (containerId: string) => {
  await setContainerProxy(containerId, null);
};

const handleSetUserAgent = async (containerId: string) => {
  editingUAContainerId.value = containerId;
  const container = containers.value.find(c => c.id === containerId);
  customUserAgent.value = container?.userAgent || navigator.userAgent;
  showUserAgentDialog.value = true;
};

const handleSaveUserAgent = async () => {
  if (!editingUAContainerId.value) return;
  
  await setContainerUserAgent(editingUAContainerId.value, customUserAgent.value);
  showUserAgentDialog.value = false;
  editingUAContainerId.value = null;
  customUserAgent.value = '';
};

const handleSetViewport = async (containerId: string) => {
  // Would open a dialog for viewport settings
};

const handleSetTimezone = async (containerId: string) => {
  // Would open a dialog for timezone settings
};

const handleSetLanguage = async (containerId: string) => {
  // Would open a dialog for language settings
};

const handleFingerprintSettings = async (containerId: string) => {
  // Would open fingerprint protection settings dialog
};

const handleViewCookies = async (containerId: string) => {
  // Would open cookies management dialog
};

const handleViewStorage = async (containerId: string) => {
  // Would open storage viewer dialog
};

const handleViewPermissions = async (containerId: string) => {
  // Would open permissions dialog
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getContainerIcon = (container: any) => {
  if (container.incognito) return '🕵️';
  if (container.private) return '🔒';
  return container.icon || '📦';
};

const getContainerTypeLabel = (container: any) => {
  if (container.incognito) return 'Incognito';
  if (container.private) return 'Private';
  return 'Container';
};

const getContainerTypeClass = (container: any) => {
  if (container.incognito) return 'incognito';
  if (container.private) return 'private';
  return '';
};

onMounted(() => {
  // Load containers on mount
});

onUnmounted(() => {
  // Cleanup
});
</script>

<template>
  <div class="container-tabs-manager">
    <!-- Header -->
    <header class="manager-header">
      <div class="header-left">
        <h2>📦 Container Tabs</h2>
        <span class="container-count">{{ containers.length }} containers</span>
      </div>
      <div class="header-actions">
        <Button variant="secondary" size="sm" @click="showImportDialog = true" leadingIcon="
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
            <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
            <polyline points='17 8 12 3 7 8' />
            <line x1='12' y1='3' x2='12' y2='15' />
          </svg>
          Import
        </Button>
        <Button variant="primary" @click="showCreateDialog = true" leadingIcon="
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
            <line x1='12' y1='5' x2='12' y2='19' />
            <line x1='5' y1='12' x2='19' y2='12' />
          </svg>
          New Container
        </Button>
      </div>
    </header>

    <!-- Container List -->
    <div class="container-list">
      <!-- Incognito/Private Containers -->
      <div v-if="incognitoContainers.length > 0" class="container-section">
        <div class="section-header">
          <h3>🕵️ Private Sessions</h3>
        </div>
        <div class="container-grid">
          <ContainerCard
            v-for="container in incognitoContainers"
            :key="container.id"
            :container="container"
            :active="activeContainerId === container.id"
            @click="switchContainer(container.id)"
            @contextmenu.prevent="editingContainerId = container.id; contextMenuX = event.clientX; contextMenuY = event.clientY; showContextMenu = true"
            :class="{ active: activeContainerId === container.id, incognito: true }"
          />
        </div>
      </div>

      <!-- Regular Containers -->
      <div v-if="nonDefaultContainers.length > 0" class="container-section">
        <div class="section-header">
          <h3>📦 Containers</h3>
          <Button variant="ghost" size="xs" @click="showCreateDialog = true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New
          </Button>
        </div>
        <div class="container-grid">
          <ContainerCard
            v-for="container in nonDefaultContainers"
            :key="container.id"
            :container="container"
            :active="activeContainerId === container.id"
            @click="switchContainer(container.id)"
            @contextmenu.prevent="editingContainerId = container.id; contextMenuX = event.clientX; contextMenuY = event.clientY; showContextMenu = true"
            :class="{ active: activeContainerId === container.id }"
          />
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="containers.length === 0" class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.3; margin-bottom: 16px;">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p>No containers yet</p>
        <p class="empty-hint">Create your first container to isolate browsing sessions</p>
        <Button variant="primary" @click="showCreateDialog = true" style="margin-top: 16px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create First Container
        </Button>
      </div>
    </div>

    <!-- Context Menu -->
    <Teleport to="body">
      <div v-if="showContextMenu" class="context-menu" :style="{ top: contextMenuY + 'px', left: contextMenuX + 'px' }" @click.outside="showContextMenu = false">
        <div class="context-menu-header">
          <span class="menu-tab-title">{{ containers.find(c => c.id === editingContainerId)?.name }}</span>
        </div>
        <div class="menu-section">
          <button class="menu-item" @click="switchContainer(editingContainerId); showContextMenu = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 9l7-7 7 7" />
              <path d="M12 16V4" />
            </svg>
            Switch to This Container
          </button>
          <button class="menu-item" @click="handleDuplicateContainer(editingContainerId); showContextMenu = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Duplicate Container
          </button>
          <button class="menu-item" @click="exportContainer(editingContainerId); showContextMenu = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Export Container
          </button>
          <button class="menu-item" @click="handleViewCookies(editingContainerId); showContextMenu = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Manage Cookies
          </button>
          <button class="menu-item" @click="handleViewStorage(editingContainerId); showContextMenu = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
              <path d="M15 15v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4" />
              <polyline points="10 9 14 9 14 5" />
            </svg>
            Manage Storage
          </button>
          <button class="menu-item" @click="handleViewPermissions(editingContainerId); showContextMenu = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Permissions
          </button>
          <button class="menu-item" @click="handleSetProxy(editingContainerId); showContextMenu = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            Proxy Settings
          </button>
          <button class="menu-item" @click="handleSetUserAgent(editingContainerId); showContextMenu = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            User Agent
          </button>
          <button class="menu-item" @click="handleSetViewport(editingContainerId); showContextMenu = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
              <path d="M15 15v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4" />
            </svg>
            Viewport
          </button>
          <button class="menu-item" @click="handleSetTimezone(editingContainerId); showContextMenu = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Timezone
          </button>
          <button class="menu-item" @click="handleSetLanguage(editingContainerId); showContextMenu = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 8h14" />
              <path d="M17 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2" />
              <path d="M7 16H4a2 2 0 0 1-2-2v-2" />
              <path d="M19 4h2a2 2 0 0 1 2 2v2" />
            </svg>
            Language
          </button>
          <button class="menu-item" @click="handleFingerprintSettings(editingContainerId); showContextMenu = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Fingerprint Protection
          </button>
          <button class="menu-item" @click="handleViewCookies(editingContainerId); showContextMenu = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Manage Cookies
          </button>
          <button class="menu-item" @click="handleViewStorage(editingContainerId); showContextMenu = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
              <path d="M15 15v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4" />
              <polyline points="10 9 14 9 14 5" />
            </svg>
            Manage Storage
          </button>
          <button class="menu-item" @click="handleViewPermissions(editingContainerId); showContextMenu = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Permissions
          </button>
          <button class="menu-item danger" @click="handleDeleteContainer(editingContainerId); showContextMenu = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete Container
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Create Container Dialog -->
    <Dialog v-model:open="showCreateDialog" title="Create New Container" width="450">
      <div class="dialog-body">
        <Input
          v-model="newContainerName"
          label="Container Name"
          placeholder="e.g., Banking, Shopping, Work"
          @keydown.enter="handleCreateContainer"
          autofocus
        />
        
        <div class="form-group">
          <label>Color</label>
          <div class="color-picker">
            <button
              v-for="color in CONTAINER_COLORS"
              :key="color"
              class="color-option"
              :style="{ backgroundColor: color }"
              :class="{ selected: newContainerColor === color }"
              @click="newContainerColor = color"
              :aria-label="color"
              :aria-pressed="newContainerColor === color"
            />
          </div>
        </div>

        <div class="form-group">
          <label>Preset</label>
          <Select
            v-model="newContainerPreset"
            :options="CONTAINER_PRESETS.map(p => ({ value: p.name.toLowerCase(), label: `${p.icon} ${p.name} (${p.colorScheme})` }))"
          />
        </div>

        <div class="dialog-actions">
          <Button variant="ghost" @click="showCreateDialog = false">Cancel</Button>
          <Button variant="primary" @click="handleCreateContainer" :disabled="!newContainerName.trim()" :loading="isLoading">
            Create Container
          </Button>
        </div>
      </Dialog>

      <!-- Import Dialog -->
      <Dialog v-model:open="showImportDialog" title="Import Container" width="450">
        <p class="dialog-description">Select a container JSON file to import</p>
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
          <Button variant="primary" @click="handleImportContainer" :disabled="!importFile" :loading="isLoading">
            Import Container
          </Button>
        </div>
      </Dialog>

      <!-- Proxy Settings Dialog -->
      <Dialog v-model:open="showProxyDialog" title="Proxy Settings" width="450">
        <Input
          v-model="proxyConfig.host"
          label="Proxy Host"
          placeholder="e.g., proxy.example.com"
        />
        <Input
          v-model="proxyConfig.port"
          label="Port"
          type="number"
          placeholder="8080"
        />
        <Input
          v-model="proxyConfig.username"
          label="Username (optional)"
          placeholder="username"
        />
        <Input
          v-model="proxyConfig.password"
          label="Password (optional)"
          type="password"
          placeholder="password"
        />
        <div class="dialog-actions">
          <Button variant="ghost" @click="showProxyDialog = false">Cancel</Button>
          <Button variant="danger" @click="handleRemoveProxy(editingProxyContainerId)" v-if="editingProxyContainerId">
            Remove Proxy
          </Button>
          <Button variant="primary" @click="handleSaveProxy">Save Proxy</Button>
        </div>
      </Dialog>

      <!-- User Agent Dialog -->
      <Dialog v-model:open="showUserAgentDialog" title="Custom User Agent" width="500">
        <Textarea
          v-model="customUserAgent"
          label="User Agent String"
          placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36..."
          rows="4"
        />
        <p class="dialog-hint">Leave empty to use default browser user agent</p>
        <div class="dialog-actions">
          <Button variant="ghost" @click="showUserAgentDialog = false">Cancel</Button>
          <Button variant="primary" @click="handleSaveUserAgent">Save User Agent</Button>
        </div>
      </Dialog>

      <!-- Import File Input -->
      <input
        ref="importFileInput"
        type="file"
        accept=".json"
        @change="importFile = $event.target.files[0]"
        class="hidden-file-input"
      />

      <!-- Error Toast -->
      <div v-if="error" class="error-toast">
        {{ error }}
        <button @click="error = null">&times;</button>
      </div>
    </div>
  </div>
</template>

<script>
const CONTAINER_PRESETS = [
  { name: 'Banking', colorScheme: 'strict', icon: '🏦' },
  { name: 'Shopping', colorScheme: 'moderate', icon: '🛒' },
  { name: 'Social', colorScheme: 'relaxed', icon: '📱' },
  { name: 'Work', colorScheme: 'balanced', icon: '💼' },
  { name: 'Personal', colorScheme: 'relaxed', icon: '🏠' },
  { name: 'Development', colorScheme: 'permissive', icon: '💻' },
  { name: 'Research', colorScheme: 'permissive', icon: '🔬' },
  { name: 'Private', colorScheme: 'strict', icon: '🕵️' },
];

const contextMenuX = ref(0);
const contextMenuY = ref(0);
const showContextMenu = ref(false);
const editingContainerId = ref<string | null>(null);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
</script>

<style scoped>
.container-tabs-manager {
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

.container-count {
  font-size: var(--text-sm);
  color: var(--fg-tertiary);
}

.container-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
}

.container-section {
  margin-bottom: var(--space-4);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-2);
}

.section-header h3 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--fg-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.container-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-3);
  padding: var(--space-2);
}

.container-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  cursor: pointer;
  transition: var(--transition-fast);
  position: relative;
}

.container-card:hover {
  border-color: var(--border-secondary);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.container-card.active {
  border-color: var(--color-brand-500);
  box-shadow: 0 0 0 1px var(--color-brand-500), var(--shadow-md);
}

.container-card.incognito {
  border-left: 3px solid var(--color-warning-500);
}

.container-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.container-icon {
  font-size: var(--text-xl);
}

.container-name {
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.container-type-badge {
  font-size: var(--text-xs);
  padding: 1px 6px;
  border-radius: var(--radius-full);
  font-weight: var(--font-medium);
}

.container-type-badge.incognito {
  background: var(--color-warning-100);
  color: var(--color-warning-700);
}

@media (prefers-color-scheme: dark) {
  .container-type-badge.incognito {
    background: var(--color-warning-900);
    color: var(--color-warning-300);
  }
}

.container-type-badge.private {
  background: var(--color-error-100);
  color: var(--color-error-700);
}

@media (prefers-color-scheme: dark) {
  .container-type-badge.private {
    background: var(--color-error-900);
    color: var(--color-error-300);
  }
}

.container-type-badge.container {
  background: var(--color-brand-100);
  color: var(--color-brand-700);
}

@media (prefers-color-scheme: dark) {
  .container-type-badge.container {
    background: var(--color-brand-900);
    color: var(--color-brand-300);
  }
}

.container-stats {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  margin-bottom: var(--space-2);
}

.container-color-indicator {
  height: 3px;
  border-radius: var(--radius-full);
  margin-top: var(--space-2);
}

.container-actions {
  display: flex;
  gap: var(--space-1);
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--border-primary);
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
  padding: var(--space-8);
}

.empty-hint {
  font-size: var(--text-sm);
  opacity: 0.7;
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
  background: var(--color-error-50);
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

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.form-group label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--fg-primary);
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

.file-input {
  display: none;
}

.file-input-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.selected-file {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  margin-top: var(--space-2);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-primary);
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

.hidden-file-input {
  display: none;
}

.error-toast {
  position: fixed;
  bottom: var(--space-4);
  right: var(--space-4);
  z-index: var(--z-toast);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-error-100);
  border: 1px solid var(--color-error-300);
  border-radius: var(--radius-lg);
  color: var(--color-error-700);
  font-size: var(--text-sm);
  box-shadow: var(--shadow-xl);
  animation: slideIn var(--duration-normal) var(--ease-out);
}

@media (prefers-color-scheme: dark) {
  .error-toast {
    background: var(--color-error-900);
    border-color: var(--color-error-700);
    color: var(--color-error-300);
  }
}

.error-toast button {
  background: none;
  border: none;
  color: inherit;
  font-size: var(--text-lg);
  cursor: pointer;
  opacity: 0.7;
  transition: var(--transition-fast);
}

.error-toast button:hover {
  opacity: 1;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .container-grid {
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