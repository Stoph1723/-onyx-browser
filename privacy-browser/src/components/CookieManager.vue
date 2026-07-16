<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useCookieManager } from '../composables/useCookieManager';
import Button from './ui/Button.vue';
import Input from './ui/Input.vue';
import Switch from './ui/Switch.vue';
import Select from './ui/Select.vue';
import Dialog from './ui/Dialog.vue';

const {
  cookies,
  domains,
  selectedDomain,
  searchQuery,
  filterThirdParty,
  filterSessionOnly,
  filterSecureOnly,
  isLoading,
  selectedCookies,
  domainStats,
  loadCookies,
  deleteCookie,
  deleteDomainCookies,
  deleteSelectedCookies,
  deleteAllCookies,
  clearOnExit,
  setClearOnExit,
  blockThirdPartyCookies,
  setBlockThirdPartyCookies,
  cookieExceptions,
  addException,
  removeException,
  exceptionDomain,
  exceptionAllow,
  exceptionSessionOnly,
  autoRefresh,
  setAutoRefresh,
  refreshInterval,
  setRefreshInterval,
} = useCookieManager();

const showDomainDialog = ref(false);
const showExceptionDialog = ref(false);
const editingException = ref<any>(null);
const editingExceptionIndex = ref<number>(-1);

const sortedDomains = computed(() => {
  return [...domains.value].sort((a, b) => {
    if (selectedDomain.value === a) return -1;
    if (selectedDomain.value === b) return 1;
    return b.cookieCount - a.cookieCount;
  });
});

const filteredCookies = computed(() => {
  let result = cookies.value;
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.value.toLowerCase().includes(q) ||
      c.domain.toLowerCase().includes(q) ||
      c.path.toLowerCase().includes(q)
    );
  }
  
  if (filterThirdParty.value) {
    result = result.filter(c => c.isThirdParty);
  }
  
  if (filterSessionOnly.value) {
    result = result.filter(c => c.session);
  }
  
  if (filterSecureOnly.value) {
    result = result.filter(c => c.secure);
  }
  
  return result;
});

const openExceptionDialog = (exception?: any, index?: number) => {
  if (exception) {
    editingException.value = { ...exception };
    editingExceptionIndex.value = index!;
  } else {
    editingException.value = { domain: '', allow: true, sessionOnly: false };
    editingExceptionIndex.value = -1;
  }
  showExceptionDialog.value = true;
};

const saveException = async () => {
  if (!editingException.value.domain) return;
  
  if (editingExceptionIndex.value >= 0) {
    await removeException(editingExceptionIndex.value);
  }
  await addException(
    editingException.value.domain,
    editingException.value.allow,
    editingException.value.sessionOnly
  );
  showExceptionDialog.value = false;
  editingException.value = null;
  editingExceptionIndex.value = -1;
};

const formatExpiry = (expiry: number) => {
  if (expiry === 0) return 'Session';
  const date = new Date(expiry * 1000);
  const now = new Date();
  if (date < now) return 'Expired';
  return date.toLocaleString();
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getCookieTypeIcon = (cookie: any) => {
  if (cookie.session) return '⏱️';
  if (cookie.isThirdParty) return '🔗';
  if (cookie.secure && cookie.httpOnly) return '🔒';
  if (cookie.secure) return '🔐';
  return '🍪';
};

const copyCookieValue = async (value: string) => {
  await navigator.clipboard.writeText(value);
  // Could show toast
};

const selectDomain = (domain: string) => {
  selectedDomain.value = domain;
  loadCookies();
};

const clearSelection = () => {
  selectedCookies.value = [];
};

const toggleCookieSelection = (cookie: any) => {
  const idx = selectedCookies.value.findIndex(c => c.id === cookie.id);
  if (idx >= 0) {
    selectedCookies.value.splice(idx, 1);
  } else {
    selectedCookies.value.push(cookie);
  }
};

const selectAllCookies = () => {
  selectedCookies.value = filteredCookies.value.map(c => ({ ...c }));
};

const isAllSelected = computed(() => 
  filteredCookies.value.length > 0 && 
  selectedCookies.value.length === filteredCookies.value.length
);

const isSomeSelected = computed(() => 
  selectedCookies.value.length > 0 && 
  selectedCookies.value.length < filteredCookies.value.length
);
</script>

<template>
  <div class="cookie-manager">
    <!-- Header -->
    <header class="manager-header">
      <div class="header-left">
        <h1>🍪 Cookie Manager</h1>
        <span class="stats">{{ cookies.length }} cookies across {{ domains.length }} domains</span>
      </div>
      
      <div class="header-right">
        <div class="filter-group">
          <Input
            v-model="searchQuery"
            placeholder="Search cookies..."
            class="search-input"
            leadingIcon="
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                <circle cx='11' cy='11' r='8' />
                <line x1='21' y1='21' x2='16.65' y2='16.65' />
              </svg>
            "
          />
          
          <div class="filter-chips">
            <label class="filter-chip">
              <input type="checkbox" v-model="filterThirdParty" />
              <span>Third-party</span>
              <span class="chip-count">{{ filteredCookies.filter(c => c.isThirdParty).length }}</span>
            </label>
            <label class="filter-chip">
              <input type="checkbox" v-model="filterSessionOnly" />
              <span>Session only</span>
              <span class="chip-count">{{ filteredCookies.filter(c => c.session).length }}</span>
            </label>
            <label class="filter-chip">
              <input type="checkbox" v-model="filterSecureOnly" />
              <span>Secure</span>
              <span class="chip-count">{{ filteredCookies.filter(c => c.secure).length }}</span>
            </label>
          </div>
        </div>
        
        <Button variant="ghost" size="sm" @click="loadCookies" :disabled="isLoading" leadingIcon="
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
            <polyline points='1 4 1 10 7 10' />
            <path d='M3.51 15a9 9 0 1 0 2.13-9.36L1 10' />
          </svg>
        ">
          Refresh
        </Button>
        
        <Button variant="ghost" size="sm" @click="showDomainDialog = true" leadingIcon="
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
            <circle cx='12' cy='12' r='10' />
            <line x1='12' y1='8' x2='12' y2='12' />
            <line x1='12' y1='16' x2='12.01' y2='16' />
          </svg>
        ">
          Manage Domains
        </Button>
        
        <Button variant="danger" size="sm" @click="deleteAllCookies" :disabled="cookies.length === 0" leadingIcon="
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
            <polyline points='3 6 5 6 21 6' />
            <path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' />
          </svg>
        ">
          Clear All
        </Button>
      </div>
    </header>

    <!-- Domain Sidebar -->
    <aside class="domain-sidebar">
      <div class="sidebar-header">
        <h3>Domains</h3>
        <span class="domain-count">{{ domains.length }}</span>
      </div>
      
      <div class="domain-search">
        <Input
          v-model="domainSearchQuery"
          placeholder="Filter domains..."
          class="compact-input"
          leadingIcon="
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
              <circle cx='11' cy='11' r='8' />
              <line x1='21' y1='21' x2='16.65' y2='16.65' />
            </svg>
          "
        />
      </div>
      
      <div class="domain-list" ref="domainList">
        <div
          v-for="domain in sortedDomains"
          :key="domain"
          class="domain-item"
          :class="{ active: selectedDomain === domain, 'has-cookies': domainStats[domain]?.cookieCount > 0 }"
          @click="selectDomain(domain)"
        >
          <div class="domain-info">
            <span class="domain-name">{{ domain }}</span>
            <span class="domain-count-badge">{{ domainStats[domain]?.cookieCount || 0 }}</span>
          </div>
          <div class="domain-storage">
            <span class="storage-size">{{ formatSize(domainStats[domain]?.totalSize || 0) }}</span>
            <Button
              v-if="selectedDomain !== domain"
              variant="ghost"
              size="xs"
              class="delete-domain-btn"
              @click.stop="deleteDomainCookies(domain)"
              aria-label="Delete all cookies for this domain"
            >
              <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                <polyline points='3 6 5 6 21 6' />
                <path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' />
              </svg>
            </Button>
          </div>
        </div>
        
        <div v-if="sortedDomains.length === 0" class="empty-domains">
          No domains with cookies
        </div>
      </div>
    </aside>

    <!-- Main Cookie List -->
    <main class="cookie-main">
      <div class="list-toolbar">
        <div class="selection-info" v-if="selectedCookies.length > 0">
          <span>{{ selectedCookies.length }} selected</span>
          <Button variant="ghost" size="sm" @click="clearSelection">Clear selection</Button>
          <Button variant="danger" size="sm" @click="deleteSelectedCookies">Delete Selected</Button>
        </div>
        
        <div class="toolbar-actions">
          <label class="select-all-label">
            <input
              type="checkbox"
              :checked="isAllSelected"
              :indeterminate="isSomeSelected"
              @change="isAllSelected ? clearSelection : selectAllCookies"
            />
            <span>Select all</span>
          </label>
          
          <Select
            v-model="cookieSort"
            :options="sortOptions"
            class="sort-select"
          />
        </div>
      </div>

      <div class="cookie-table-container">
        <table class="cookie-table">
          <thead>
            <tr>
              <th class="col-select">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  :indeterminate="isSomeSelected"
                  @change="isAllSelected ? clearSelection : selectAllCookies"
                />
              </th>
              <th class="col-domain" @click="cookieSort = 'domain'; sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'">
                Domain
                <span class="sort-indicator">{{ cookieSort === 'domain' ? (sortDirection === 'asc' ? '↑' : '↓') : '' }}</span>
              </th>
              <th class="col-name" @click="cookieSort = 'name'; sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'">
                Name
                <span class="sort-indicator">{{ cookieSort === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : '' }}</span>
              </th>
              <th class="col-value">Value</th>
              <th class="col-path">Path</th>
              <th class="col-expiry" @click="cookieSort = 'expiry'; sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'">
                Expires
                <span class="sort-indicator">{{ cookieSort === 'expiry' ? (sortDirection === 'asc' ? '↑' : '↓') : '' }}</span>
              </th>
              <th class="col-flags">
                <span class="flag-legend" title="Secure">🔒</span>
                <span class="flag-legend" title="HttpOnly">🛡️</span>
                <span class="flag-legend" title="Session">⏱️</span>
                <span class="flag-legend" title="Third-party">🔗</span>
              </th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="cookie in sortedCookies"
              :key="cookie.id"
              :class="{ selected: isCookieSelected(cookie), 'third-party': cookie.isThirdParty, expired: isCookieExpired(cookie) }"
              @click="toggleCookieSelection(cookie)"
            >
              <td class="col-select">
                <input
                  type="checkbox"
                  :checked="isCookieSelected(cookie)"
                  @click.stop
                />
              </td>
              <td class="col-domain">
                <span class="domain-link" @click.stop="selectDomain(cookie.domain)">{{ cookie.domain }}</span>
                <span v-if="cookie.isThirdParty" class="third-party-badge">Third-party</span>
              </td>
              <td class="col-name">{{ cookie.name }}</td>
              <td class="col-value">
                <div class="value-cell">
                  <span class="value-text">{{ truncateValue(cookie.value) }}</span>
                  <Button
                    variant="ghost"
                    size="xs"
                    class="copy-btn"
                    @click.stop="copyCookieValue(cookie.value)"
                    title="Copy value"
                  >
                    <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                      <rect x='9' y='9' width='13' height='13' rx='2' ry='2' />
                      <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' />
                    </svg>
                  </Button>
                </div>
              </td>
              <td class="col-path">{{ cookie.path }}</td>
              <td class="col-expiry">
                <span :class="{ expired: isCookieExpired(cookie) }">{{ formatExpiry(cookie.expiry) }}</span>
              </td>
              <td class="col-flags">
                <span v-if="cookie.secure" class="flag" title="Secure">🔒</span>
                <span v-if="cookie.httpOnly" class="flag" title="HttpOnly">🛡️</span>
                <span v-if="cookie.session" class="flag" title="Session cookie">⏱️</span>
                <span v-if="cookie.isThirdParty" class="flag" title="Third-party">🔗</span>
                <span v-if="cookie.sameSite" class="flag" title="SameSite: {{ cookie.sameSite }}">🏷️</span>
              </td>
              <td class="col-actions">
                <Button
                  variant="ghost"
                  size="xs"
                  @click.stop="deleteCookie(cookie.id); $event.stopPropagation()"
                  aria-label="Delete cookie"
                >
                  <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                    <polyline points='3 6 5 6 21 6' />
                    <path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' />
                  </svg>
                </Button>
              </td>
            </tr>
            
            <tr v-if="filteredCookies.length === 0" class="empty-row">
              <td colspan="9" class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.3;">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <p>No cookies found</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <!-- Settings Panel (collapsible) -->
    <aside class="settings-panel" :class="{ open: settingsOpen }">
      <div class="settings-header" @click="settingsOpen = !settingsOpen">
        <h3>⚙️ Cookie Settings</h3>
        <svg :class="{ rotated: settingsOpen }" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      
      <div class="settings-content" v-show="settingsOpen" style="overflow: hidden;">
        <div class="setting-group">
          <h4>Global Behavior</h4>
          
          <Switch
            v-model="blockThirdPartyCookies"
            title="Block Third-Party Cookies"
            description="Prevent cross-site tracking cookies"
            @change="setBlockThirdPartyCookies"
          />
          
          <Switch
            v-model="clearOnExit"
            title="Clear on Exit"
            description="Delete all cookies when browser closes"
            @change="setClearOnExit"
          />
          
          <Switch
            v-model="autoRefresh"
            title="Auto Refresh"
            description="Automatically refresh cookie list"
            @change="setAutoRefresh"
          />
          
          <div class="setting-row" v-if="autoRefresh">
            <label>Refresh Interval</label>
            <Select
              v-model="refreshInterval"
              :options="[
                { value: 5, label: '5 seconds' },
                { value: 10, label: '10 seconds' },
                { value: 30, label: '30 seconds' },
                { value: 60, label: '1 minute' }
              ]"
              @change="setRefreshInterval"
            />
          </div>
        </div>
        
        <div class="setting-group">
          <h4>Cookie Exceptions</h4>
          <p class="setting-description">Domains that are allowed/blocked regardless of global settings.</p>
          
          <div class="exception-list">
            <div v-for="(exception, index) in cookieExceptions" :key="exception.domain" class="exception-item">
              <div class="exception-info">
                <span class="exception-domain">{{ exception.domain }}</span>
                <span class="exception-action">{{ exception.allow ? 'Allow' : 'Block' }}</span>
                <span v-if="exception.sessionOnly" class="exception-session">Session only</span>
              </div>
              <div class="exception-actions">
                <Button variant="ghost" size="xs" @click="openExceptionDialog(exception, index)">
                  <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </Button>
                <Button variant="ghost" size="xs" class="danger" @click="removeException(index)">
                  <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                    <polyline points='3 6 5 6 21 6' />
                    <path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' />
                  </svg>
                </Button>
              </div>
            </div>
            
            <Button variant="primary" size="sm" @click="openExceptionDialog" leadingIcon="
              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                <line x1='12' y1='5' x2='12' y2='19' />
                <line x1='5' y1='12' x2='19' y2='12' />
              </svg>
            ">
              Add Exception
            </Button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Domain Dialog -->
    <Dialog v-model:open="showDomainDialog" title="Manage Domains" width="600">
      <div class="domain-management">
        <div class="domain-stats">
          <h4>{{ domains.length }} domains with cookies</h4>
          <p>Total: {{ totalCookies }} cookies, {{ formatSize(totalStorageSize) }} storage</p>
        </div>
        
        <div class="domain-table-container">
          <table class="domain-table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Cookies</th>
                <th>Storage</th>
                <th>Third-party</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="domain in domains" :key="domain">
                <td>{{ domain }}</td>
                <td>{{ domainStats[domain]?.cookieCount || 0 }}</td>
                <td>{{ formatSize(domainStats[domain]?.totalSize || 0) }}</td>
                <td>{{ domainStats[domain]?.thirdPartyCount || 0 }}</td>
                <td>
                  <Button variant="ghost" size="xs" @click="deleteDomainCookies(domain)" class="danger">
                    Delete All
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Dialog>

    <!-- Exception Dialog -->
    <Dialog v-model:open="showExceptionDialog" :title="editingExceptionIndex >= 0 ? 'Edit Exception' : 'Add Exception'" width="450">
      <form @submit.prevent="saveException" class="exception-form">
        <Input
          v-model="editingException.domain"
          label="Domain"
          placeholder=".example.com or example.com"
          required
        />
        
        <div class="form-row">
          <label class="radio-group">
            <input type="radio" v-model="editingException.allow" value="true" />
            <span>Allow cookies</span>
          </label>
          <label class="radio-group">
            <input type="radio" v-model="editingException.allow" value="false" />
            <span>Block cookies</span>
          </label>
        </div>
        
        <Switch
          v-model="editingException.sessionOnly"
          label="Session only (delete on browser close)"
        />
        
        <div class="form-actions">
          <Button variant="ghost" @click="showExceptionDialog = false">Cancel</Button>
          <Button variant="primary" type="submit">
            {{ editingExceptionIndex >= 0 ? 'Save' : 'Add' }}
          </Button>
        </div>
      </form>
    </Dialog>
  </div>
</template>

<script>
const domainSearchQuery = ref('');
const cookieSort = ref<'domain' | 'name' | 'expiry'>('domain');
const sortDirection = ref<'asc' | 'desc'>('asc');
const settingsOpen = ref(false);
const settingsTabs = ['global', 'exceptions'];
const activeSettingsTab = ref('global');

const sortOptions = [
  { value: 'domain', label: 'Domain' },
  { value: 'name', label: 'Name' },
  { value: 'expiry', label: 'Expires' },
];

const sortedCookies = computed(() => {
  let result = [...filteredCookies.value];
  
  result.sort((a, b) => {
    let comparison = 0;
    switch (cookieSort.value) {
      case 'domain':
        comparison = a.domain.localeCompare(b.domain);
        break;
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'expiry':
        comparison = (a.expiry || 0) - (b.expiry || 0);
        break;
    }
    return sortDirection.value === 'asc' ? comparison : -comparison;
  });
  
  return result;
});

const totalCookies = computed(() => cookies.value.length);
const totalStorageSize = computed(() => 
  cookies.value.reduce((sum, c) => sum + (c.value?.length || 0) + c.name.length, 0)
);

const isCookieSelected = (cookie: any) => 
  selectedCookies.value.some(c => c.id === cookie.id);

const isCookieExpired = (cookie: any) => 
  cookie.expiry > 0 && cookie.expiry * 1000 < Date.now();

const truncateValue = (value: string, maxLen = 50) => 
  value.length > maxLen ? value.slice(0, maxLen) + '…' : value;

const formatExpiry = (expiry: number) => {
  if (expiry === 0) return 'Session';
  const date = new Date(expiry * 1000);
  const now = new Date();
  if (date < now) return 'Expired';
  return date.toLocaleString();
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const copyCookieValue = async (value: string) => {
  await navigator.clipboard.writeText(value);
};
</script>

<style scoped>
.cookie-manager {
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

.filter-chips {
  display: flex;
  gap: var(--space-1);
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  color: var(--fg-secondary);
  cursor: pointer;
  transition: var(--transition-fast);
}

.filter-chip:hover {
  background: var(--bg-hover);
}

.filter-chip input {
  margin: 0;
}

.chip-count {
  background: var(--color-brand-500);
  color: white;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  font-size: 10px;
  min-width: 20px;
  text-align: center;
}

/* Layout */
.cookie-manager > .manager-header + * {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Domain Sidebar */
.domain-sidebar {
  width: 280px;
  min-width: 240px;
  max-width: 350px;
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

.domain-count {
  background: var(--color-brand-500);
  color: white;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.domain-search {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-primary);
}

.compact-input {
  width: 100%;
}

.domain-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
}

.domain-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition-fast);
  gap: var(--space-2);
}

.domain-item:hover {
  background: var(--bg-tertiary);
}

.domain-item.active {
  background: var(--accent-muted);
  border-left: 2px solid var(--color-brand-500);
}

.domain-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
  min-width: 0;
}

.domain-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.domain-count-badge {
  background: var(--bg-tertiary);
  color: var(--fg-tertiary);
  padding: 1px 6px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  min-width: 24px;
  text-align: center;
}

.domain-storage {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.storage-size {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  font-family: var(--font-mono);
}

.delete-domain-btn {
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.domain-item:hover .delete-domain-btn {
  opacity: 1;
}

.empty-domains {
  padding: var(--space-4);
  text-align: center;
  color: var(--fg-tertiary);
  font-size: var(--text-sm);
}

/* Cookie Main */
.cookie-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  gap: var(--space-3);
  flex-wrap: wrap;
}

.selection-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-brand-500);
  font-weight: var(--font-medium);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.select-all-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--fg-secondary);
  cursor: pointer;
}

.sort-select {
  min-width: 140px;
}

.cookie-table-container {
  flex: 1;
  overflow: auto;
}

.cookie-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.cookie-table th,
.cookie-table td {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  border-bottom: 1px solid var(--border-primary);
  white-space: nowrap;
}

.cookie-table th {
  background: var(--bg-tertiary);
  font-weight: var(--font-semibold);
  color: var(--fg-secondary);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.cookie-table th:hover {
  background: var(--bg-hover);
}

.cookie-table tbody tr {
  transition: var(--transition-fast);
}

.cookie-table tbody tr:hover {
  background: var(--bg-tertiary);
}

.cookie-table tbody tr.selected {
  background: var(--accent-muted);
}

.cookie-table tbody tr.third-party {
  background: var(--color-warning-50);
}

@media (prefers-color-scheme: dark) {
  .cookie-table tbody tr.third-party {
    background: rgba(245, 158, 11, 0.1);
  }
}

.cookie-table tbody tr.expired {
  opacity: 0.5;
}

.cookie-table tbody tr.expired td {
  color: var(--fg-tertiary);
}

/* Column widths */
.col-select { width: 40px; text-align: center; }
.col-domain { width: 200px; }
.col-name { width: 180px; }
.col-value { width: 250px; }
.col-path { width: 120px; }
.col-expiry { width: 160px; }
.col-flags { width: 120px; text-align: center; }
.col-actions { width: 50px; text-align: center; }

/* Cell content */
.domain-link {
  color: var(--color-brand-500);
  text-decoration: none;
  font-weight: var(--font-medium);
}

.domain-link:hover {
  text-decoration: underline;
}

.third-party-badge {
  display: inline-block;
  margin-left: var(--space-1);
  padding: 1px 6px;
  background: var(--color-warning-100);
  color: var(--color-warning-700);
  border-radius: var(--radius-xs);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

@media (prefers-color-scheme: dark) {
  .third-party-badge {
    background: var(--color-warning-900);
    color: var(--color-warning-300);
  }
}

.value-cell {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.value-text {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: var(--radius-xs);
}

.copy-btn {
  flex-shrink: 0;
}

.col-expiry .expired {
  color: var(--color-error-500);
  font-weight: var(--font-medium);
}

.flag {
  font-size: 12px;
  margin: 0 2px;
}

.flag-legend {
  opacity: 0.3;
  font-size: 10px;
}

.delete-btn {
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.cookie-table tbody tr:hover .delete-btn {
  opacity: 1;
}

.empty-row td {
  padding: var(--space-8) var(--space-4) !important;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  color: var(--fg-tertiary);
}

/* Settings Panel */
.settings-panel {
  width: 320px;
  min-width: 280px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-primary);
  cursor: pointer;
  user-select: none;
}

.settings-header h3 {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin: 0;
}

.settings-header svg {
  transition: transform var(--transition-fast);
}

.settings-header svg.rotated {
  transform: rotate(180deg);
}

.settings-content {
  padding: var(--space-4);
  overflow-y: auto;
  flex: 1;
}

.setting-group {
  margin-bottom: var(--space-6);
}

.setting-group h4 {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--fg-tertiary);
  margin: 0 0 var(--space-3);
}

.setting-description {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  margin: 0 0 var(--space-3);
}

.setting-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.setting-row label {
  font-size: var(--text-sm);
  color: var(--fg-secondary);
  min-width: 100px;
}

/* Exception List */
.exception-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.exception-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.exception-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
  min-width: 0;
}

.exception-domain {
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.exception-action {
  padding: 1px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.exception-action:has-text("Allow") {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

.exception-action:has-text("Block") {
  background: var(--color-error-100);
  color: var(--color-error-700);
}

@media (prefers-color-scheme: dark) {
  .exception-action:has-text("Allow") {
    background: var(--color-success-900);
    color: var(--color-success-300);
  }
  .exception-action:has-text("Block") {
    background: var(--color-error-900);
    color: var(--color-error-300);
  }
}

.exception-session {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  background: var(--bg-primary);
  padding: 1px 6px;
  border-radius: var(--radius-full);
}

.exception-actions {
  display: flex;
  gap: var(--space-1);
}

.exception-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-row {
  display: flex;
  gap: var(--space-4);
}

.radio-group {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  cursor: pointer;
}

.radio-group input {
  margin: 0;
}

/* Domain Dialog */
.domain-management {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.domain-stats h4 {
  margin: 0 0 var(--space-1);
}

.domain-stats p {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--fg-tertiary);
}

.domain-table-container {
  overflow-x: auto;
}

.domain-table {
  width: 100%;
  border-collapse: collapse;
}

.domain-table th,
.domain-table td {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  border-bottom: 1px solid var(--border-primary);
}

.domain-table th {
  background: var(--bg-tertiary);
  font-weight: var(--font-semibold);
  color: var(--fg-secondary);
}

/* Responsive */
@media (max-width: 1024px) {
  .domain-sidebar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: var(--z-sidebar);
    transform: translateX(-100%);
    transition: transform var(--transition-normal);
  }
  
  .domain-sidebar.open {
    transform: translateX(0);
  }
  
  .settings-panel {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: var(--z-sidebar);
    transform: translateX(100%);
    transition: transform var(--transition-normal);
  }
  
  .settings-panel.open {
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
  
  .filter-chips {
    display: none;
  }
  
  .search-input {
    width: 100%;
  }
  
  .cookie-table-container {
    font-size: var(--text-xs);
  }
  
  .cookie-table th,
  .cookie-table td {
    padding: var(--space-1) var(--space-2);
  }
  
  .col-path, .col-flags {
    display: none;
  }
}
</style>