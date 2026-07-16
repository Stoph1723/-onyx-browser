<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useSitePermissions } from '../composables/useSitePermissions';
import Button from './ui/Button.vue';
import Input from './ui/Input.vue';
import Switch from './ui/Switch.vue';
import Select from './ui/Select.vue';
import Dialog from './ui/Dialog.vue';

const {
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
  permissionTypes,
  getPermissionIcon,
  getPermissionLabel,
} = useSitePermissions();

const showGlobalSettingsDialog = ref(false);
const showOriginDialog = ref(false);
const showClearDataDialog = ref(false);
const editingOrigin = ref<string>('');
const clearDataTypes = ref({
  cookies: true,
  cache: true,
  localStorage: true,
  indexedDB: true,
  serviceWorkers: true,
  permissions: false,
});

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
  
  return result.sort((a, b) => {
    if (selectedOrigin.value === a.origin) return -1;
    if (selectedOrigin.value === b.origin) return 1;
    return a.domain.localeCompare(b.domain);
  });
});

const originPermissions = computed(() => {
  return permissions.value[selectedOrigin.value] || {};
});

const openOriginDialog = (origin: string) => {
  editingOrigin.value = origin;
  showOriginDialog.value = true;
};

const handlePermissionChange = async (type: string, state: string) => {
  if (!selectedOrigin.value) return;
  await updatePermission(selectedOrigin.value, type, state as any);
};

const handleResetOrigin = async () => {
  if (!selectedOrigin.value) return;
  if (!confirm(`Reset all permissions for ${selectedOrigin.value}?`)) return;
  await resetOriginPermissions(selectedOrigin.value);
};

const handleClearData = async () => {
  if (!selectedOrigin.value) return;
  showClearDataDialog.value = true;
};

const confirmClearData = async () => {
  if (!selectedOrigin.value) return;
  await clearOriginData(selectedOrigin.value, clearDataTypes.value);
  showClearDataDialog.value = false;
};

const handleGlobalDefaultChange = async (type: string, state: string) => {
  await setGlobalDefault(type, state as any);
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
</script>

<template>
  <div class="permissions-manager">
    <!-- Header -->
    <header class="manager-header">
      <div class="header-left">
        <h1>🔐 Site Permissions</h1>
        <span class="stats">{{ origins.length }} sites configured</span>
      </div>
      
      <div class="header-right">
        <div class="filter-group">
          <Input
            v-model="searchQuery"
            placeholder="Search sites..."
            class="search-input"
            leadingIcon="
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                <circle cx='11' cy='11' r='8' />
                <line x1='21' y1='21' x2='16.65' y2='16.65' />
              </svg>
            "
          />
          
          <Select
            v-model="filterType"
            :options="[
              { value: 'all', label: 'All' },
              { value: 'grant', label: 'Allowed' },
              { value: 'deny', label: 'Blocked' },
              { value: 'ask', label: 'Ask' },
            ]"
            class="filter-select"
          />
        </div>
        
        <Button variant="ghost" size="sm" @click="loadPermissions" :disabled="isLoading" leadingIcon="
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
            <polyline points='1 4 1 10 7 10' />
            <path d='M3.51 15a9 9 0 1 0 2.13-9.36L1 10' />
          </svg>
        ">
          Refresh
        </Button>
        
        <Button variant="primary" size="sm" @click="showGlobalSettingsDialog = true" leadingIcon="
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
            <circle cx='12' cy='12' r='3' />
            <path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z' />
          </svg>
        ">
          Global Defaults
        </Button>
      </div>
    </header>

    <!-- Main Layout -->
    <div class="permissions-layout">
      <!-- Origin Sidebar -->
      <aside class="origin-sidebar">
        <div class="sidebar-header">
          <h3>Sites</h3>
          <span class="origin-count">{{ origins.length }}</span>
        </div>
        
        <div class="sidebar-search">
          <Input
            v-model="searchQuery"
            placeholder="Filter sites..."
            class="compact-input"
            leadingIcon="
              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                <circle cx='11' cy='11' r='8' />
                <line x1='21' y1='21' x2='16.65' y2='16.65' />
              </svg>
            "
          />
        </div>
        
        <Select
          v-model="filterType"
          :options="[
            { value: 'all', label: 'All' },
            { value: 'grant', label: 'Allowed' },
            { value: 'deny', label: 'Blocked' },
            { value: 'ask', label: 'Ask' },
          ]"
          class="sidebar-filter"
        />
        
        <div class="origin-list" ref="originList">
          <div
            v-for="origin in filteredOrigins"
            :key="origin.origin"
            class="origin-item"
            :class="{ active: selectedOrigin === origin.origin, 'has-permissions': origin.hasPermissions }"
            @click="selectedOrigin = origin.origin"
          >
            <div class="origin-info">
              <div class="origin-security" :class="getOriginSecurityStatus(origin.origin).class">
                {{ getOriginSecurityStatus(origin.origin).label }}
              </div>
              <div class="origin-details">
                <span class="origin-name">{{ origin.domain }}</span>
                <span class="origin-url">{{ origin.origin }}</span>
              </div>
            </div>
            <div class="origin-permission-badges">
              <span
                v-for="(state, type) in origin.permissions"
                :key="type"
                :class="['permission-badge', getStateClass(state)]"
                :title="getPermissionLabel(type)"
              >
                {{ formatPermissionState(state).charAt(0) }}
              </span>
            </div>
          </div>
          
          <div v-if="filteredOrigins.length === 0" class="empty-origins">
            No sites found
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="permissions-main">
        <div v-if="!selectedOrigin" class="empty-state">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.3;">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <h2>Select a site</h2>
          <p>Choose a site from the sidebar to manage its permissions</p>
        </div>

        <div v-else class="origin-detail">
          <!-- Origin Header -->
          <div class="origin-header">
            <div class="origin-main-info">
              <div class="origin-security-badge" :class="getOriginSecurityStatus(selectedOrigin).class">
                {{ getOriginSecurityStatus(selectedOrigin).label }}
              </div>
              <div>
                <h2>{{ permissions[selectedOrigin]?.domain || selectedOrigin }}</h2>
                <p class="origin-url">{{ selectedOrigin }}</p>
              </div>
            </div>
            <div class="origin-actions">
              <Button variant="ghost" size="sm" @click="handleClearData" leadingIcon="
                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                  <circle cx='12' cy='12' r='10' />
                  <line x1='4.93' y1='4.93' x2='19.07' y2='19.07' />
                  <line x1='19.07' y1='4.93' x2='4.93' y2='19.07' />
                </svg>
              ">
                Clear Data
              </Button>
              <Button variant="ghost" size="sm" @click="handleResetOrigin" class="danger" leadingIcon="
                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                  <path d="M3 4h18" />
                  <path d="M19 9l6 6M9 15l6-6" />
                </svg>
              ">
                Reset Permissions
              </Button>
            </div>
          </div>

          <!-- Permissions Grid -->
          <div class="permissions-grid">
            <PermissionCard
              v-for="type in permissionTypes"
              :key="type"
              :type="type"
              :label="getPermissionLabel(type)"
              :icon="getPermissionIcon(type)"
              :state="originPermissions[type] || globalSettings.defaults[type] || 'ask'"
              :globalDefault="globalSettings.defaults[type] || 'ask'"
              :description="getPermissionDescription(type)"
              @change="handlePermissionChange"
            />
          </div>

          <!-- Origin Info -->
          <div class="origin-info-panel">
            <h3>Site Information</h3>
            <dl class="info-list">
              <dt>Origin</dt>
              <dd>{{ selectedOrigin }}</dd>
              <dt>Domain</dt>
              <dd>{{ permissions[selectedOrigin]?.domain || 'N/A' }}</dd>
              <dt>Security</dt>
              <dd><span :class="getOriginSecurityStatus(selectedOrigin).class">{{ getOriginSecurityStatus(selectedOrigin).label }}</span></dd>
              <dt>Permission Entries</dt>
              <dd>{{ Object.keys(originPermissions).length }} configured</dd>
              <dt>Last Modified</dt>
              <dd>{{ permissions[selectedOrigin]?.lastModified || 'Unknown' }}</dd>
            </dl>
          </div>
        </div>
      </main>
    </div>

    <!-- Global Settings Dialog -->
    <Dialog v-model:open="showGlobalSettingsDialog" title="Global Permission Defaults" width="500">
      <p class="dialog-description">Set default permission behavior for new sites. Individual site settings override these defaults.</p>
      
      <div class="global-settings-grid">
        <PermissionCard
          v-for="type in permissionTypes"
          :key="type"
          :type="type"
          :label="getPermissionLabel(type)"
          :icon="getPermissionIcon(type)"
          :state="globalSettings.defaults[type] || 'ask'"
          :isGlobal="true"
          :description="getPermissionDescription(type)"
          @change="handleGlobalDefaultChange"
        />
      </div>
      
      <div class="dialog-actions">
        <Button variant="ghost" @click="showGlobalSettingsDialog = false">Close</Button>
      </div>
    </Dialog>

    <!-- Clear Data Dialog -->
    <Dialog v-model:open="showClearDataDialog" :title="'Clear Data for ' + selectedOrigin" width="450">
      <p class="dialog-description">Select the types of data to clear for this site. This cannot be undone.</p>
      
      <div class="clear-data-options">
        <label v-for="option in clearDataOptions" :key="option.id" class="clear-data-option">
          <input type="checkbox" v-model="clearDataTypes[option.id]" :id="option.id" />
          <div class="option-info">
            <span class="option-icon">{{ option.icon }}</span>
            <div>
              <span class="option-label">{{ option.label }}</span>
              <span class="option-description">{{ option.description }}</span>
            </div>
          </div>
        </label>
      </div>
      
      <div class="dialog-actions">
        <Button variant="ghost" @click="showClearDataDialog = false">Cancel</Button>
        <Button variant="danger" @click="confirmClearData">
          Clear Data
        </Button>
      </div>
    </Dialog>
  </div>
</template>

<script>
const clearDataOptions = [
  { id: 'cookies', label: 'Cookies & Site Data', description: 'Logs you out of sites', icon: '🍪' },
  { id: 'cache', label: 'Cached Images & Files', description: 'Frees up space', icon: '📦' },
  { id: 'localStorage', label: 'Local Storage', description: 'Site preferences & data', icon: '💾' },
  { id: 'indexedDB', label: 'IndexedDB', description: 'Large client-side databases', icon: '🗄️' },
  { id: 'serviceWorkers', label: 'Service Workers', description: 'Background scripts & offline data', icon: '⚙️' },
  { id: 'permissions', label: 'Permissions', description: 'Resets all permission decisions', icon: '🔐' },
];
</script>

<style scoped>
.permissions-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  color: var(--fg-primary);
  font-family: var(--font-sans);
}

.manager-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  gap: var(--space-4);
  flex-wrap: wrap;
}

.header-left h1 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.stats {
  font-size: var(--text-sm);
  color: var(--fg-tertiary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.search-input {
  width: 250px;
}

.filter-select {
  min-width: 140px;
}

/* Layout */
.permissions-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Origin Sidebar */
.origin-sidebar {
  width: 320px;
  min-width: 280px;
  max-width: 400px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-primary);
}

.sidebar-header h3 {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin: 0;
}

.origin-count {
  background: var(--color-brand-500);
  color: white;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.sidebar-search {
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--border-primary);
}

.compact-input {
  width: 100%;
}

.sidebar-filter {
  margin: var(--space-2) var(--space-3);
  width: calc(100% - var(--space-3) * 2);
}

.origin-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
}

.origin-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition-fast);
  gap: var(--space-2);
}

.origin-item:hover {
  background: var(--bg-tertiary);
}

.origin-item.active {
  background: var(--accent-muted);
  border-left: 2px solid var(--color-brand-500);
}

.origin-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: 1;
  min-width: 0;
}

.origin-security {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: var(--font-bold);
  flex-shrink: 0;
}

.origin-security.secure {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

@media (prefers-color-scheme: dark) {
  .origin-security.secure {
    background: var(--color-success-900);
    color: var(--color-success-300);
  }
}

.origin-security.local {
  background: var(--color-warning-100);
  color: var(--color-warning-700);
}

@media (prefers-color-scheme: dark) {
  .origin-security.local {
    background: var(--color-warning-900);
    color: var(--color-warning-300);
  }
}

.origin-security.insecure {
  background: var(--color-error-100);
  color: var(--color-error-700);
}

@media (prefers-color-scheme: dark) {
  .origin-security.insecure {
    background: var(--color-error-900);
    color: var(--color-error-300);
  }
}

.origin-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.origin-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.origin-url {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.origin-permission-badges {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
}

.permission-badge {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: var(--font-bold);
}

.permission-badge.state-allow {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

@media (prefers-color-scheme: dark) {
  .permission-badge.state-allow {
    background: var(--color-success-900);
    color: var(--color-success-300);
  }
}

.permission-badge.state-block {
  background: var(--color-error-100);
  color: var(--color-error-700);
}

@media (prefers-color-scheme: dark) {
  .permission-badge.state-block {
    background: var(--color-error-900);
    color: var(--color-error-300);
  }
}

.permission-badge.state-ask {
  background: var(--color-warning-100);
  color: var(--color-warning-700);
}

@media (prefers-color-scheme: dark) {
  .permission-badge.state-ask {
    background: var(--color-warning-900);
    color: var(--color-warning-300);
  }
}

.empty-origins {
  padding: var(--space-4);
  text-align: center;
  color: var(--fg-tertiary);
  font-size: var(--text-sm);
}

/* Permissions Main */
.permissions-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
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

.empty-state h2 {
  margin: 0;
  font-size: var(--text-lg);
  color: var(--fg-secondary);
}

.empty-state p {
  margin: 0;
  font-size: var(--text-sm);
}

.origin-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: var(--space-5);
}

/* Origin Header */
.origin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border-primary);
  margin-bottom: var(--space-5);
  flex-wrap: wrap;
  gap: var(--space-3);
}

.origin-main-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.origin-security-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: var(--font-bold);
  flex-shrink: 0;
}

.origin-security-badge.secure {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

@media (prefers-color-scheme: dark) {
  .origin-security-badge.secure {
    background: var(--color-success-900);
    color: var(--color-success-300);
  }
}

.origin-security-badge.local {
  background: var(--color-warning-100);
  color: var(--color-warning-700);
}

@media (prefers-color-scheme: dark) {
  .origin-security-badge.local {
    background: var(--color-warning-900);
    color: var(--color-warning-300);
  }
}

.origin-security-badge.insecure {
  background: var(--color-error-100);
  color: var(--color-error-700);
}

@media (prefers-color-scheme: dark) {
  .origin-security-badge.insecure {
    background: var(--color-error-900);
    color: var(--color-error-300);
  }
}

.origin-header h2 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.origin-url {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--fg-tertiary);
  font-family: var(--font-mono);
}

.origin-actions {
  display: flex;
  gap: var(--space-2);
}

/* Permissions Grid */
.permissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

/* Origin Info Panel */
.origin-info-panel {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.origin-info-panel h3 {
  margin: 0 0 var(--space-3);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.info-list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-2) var(--space-4);
  margin: 0;
  font-size: var(--text-sm);
}

.info-list dt {
  color: var(--fg-tertiary);
  font-weight: var(--font-normal);
}

.info-list dd {
  margin: 0;
  color: var(--fg-primary);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-list dd .secure {
  color: var(--color-success-500);
}

.info-list dd .local {
  color: var(--color-warning-500);
}

.info-list dd .insecure {
  color: var(--color-error-500);
}

/* Permission Card Component */
.PermissionCard {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  transition: var(--transition-fast);
}

.PermissionCard:hover {
  border-color: var(--border-secondary);
  box-shadow: var(--shadow-sm);
}

.PermissionCard.global {
  background: var(--accent-muted);
  border-color: var(--color-brand-500);
}

.permission-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.permission-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.permission-info {
  flex: 1;
  min-width: 0;
}

.permission-label {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin: 0 0 2px;
}

.permission-description {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  margin: 0;
}

.permission-global-badge {
  font-size: var(--text-xs);
  background: var(--color-brand-100);
  color: var(--color-brand-700);
  padding: 1px 6px;
  border-radius: var(--radius-full);
  font-weight: var(--font-medium);
}

@media (prefers-color-scheme: dark) {
  .permission-global-badge {
    background: var(--color-brand-900);
    color: var(--color-brand-300);
  }
}

.permission-controls {
  display: flex;
  gap: var(--space-1);
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  padding: 2px;
}

.permission-btn {
  padding: 6px 12px;
  border: none;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: var(--transition-fast);
  background: transparent;
  color: var(--fg-tertiary);
}

.permission-btn:hover {
  background: var(--bg-primary);
  color: var(--fg-primary);
}

.permission-btn.active {
  background: var(--color-brand-500);
  color: white;
}

.permission-btn.allow.active {
  background: var(--color-success-500);
}

.permission-btn.block.active {
  background: var(--color-error-500);
}

.permission-btn.ask.active {
  background: var(--color-warning-500);
}

.permission-global-note {
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
}

.permission-note-link {
  color: var(--color-brand-500);
  text-decoration: none;
}

.permission-note-link:hover {
  text-decoration: underline;
}

/* Responsive */
@media (max-width: 1024px) {
  .origin-sidebar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: var(--z-sidebar);
    transform: translateX(-100%);
    transition: transform var(--transition-normal);
  }
  
  .origin-sidebar.open {
    transform: translateX(0);
  }
}

@media (max-width: 768px) {
  .manager-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-right {
    justify-content: space-between;
  }
  
  .filter-group {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-input {
    width: 100%;
  }
  
  .filter-select {
    width: 100%;
  }
  
  .permissions-grid {
    grid-template-columns: 1fr;
  }
  
  .origin-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .origin-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>