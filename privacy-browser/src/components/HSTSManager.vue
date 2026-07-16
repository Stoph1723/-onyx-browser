<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import Button from './ui/Button.vue';
import Input from './ui/Input.vue';
import Switch from './ui/Switch.vue';

interface Props {
  domain: string;
}

const props = defineProps<Props>();

const hstsEntries = ref<any[]>([]);
const hstsPreloadList = ref<any[]>([]);
const hstsIncludeSubdomains = ref(true);
const hstsMaxAge = ref(31536000);
const hstsPreload = ref(false);
const isLoading = ref(false);
const showAddDialog = ref(false);
const editingEntry = ref<any>(null);

const loadHSTS = async () => {
  isLoading.value = true;
  try {
    hstsEntries.value = await invoke('get_hsts_entries', { domain: props.domain });
    hstsPreloadList.value = await invoke('get_hsts_preload_list');
  } catch (err) {
    console.error('Failed to load HSTS:', err);
  } finally {
    isLoading.value = false;
  }
};

const addHSTSEntry = async () => {
  if (!props.domain) return;
  try {
    await invoke('add_hsts_entry', {
      domain: props.domain,
      includeSubdomains: hstsIncludeSubdomains.value,
      maxAge: hstsMaxAge.value,
      preload: hstsPreload.value,
    });
    showAddDialog.value = false;
    await loadHSTS();
  } catch (err) {
    console.error('Failed to add HSTS entry:', err);
  }
};

const removeHSTSEntry = async (domain: string) => {
  if (!confirm(`Remove HSTS for ${domain}?`)) return;
  try {
    await invoke('remove_hsts_entry', { domain });
    await loadHSTS();
  } catch (err) {
    console.error('Failed to remove HSTS entry:', err);
  }
};

const clearHSTSCache = async () => {
  if (!confirm('Clear all HSTS cache? This will remove all HSTS entries.')) return;
  try {
    await invoke('clear_hsts_cache');
    await loadHSTS();
  } catch (err) {
    console.error('Failed to clear HSTS cache:', err);
  }
};

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString();

const getDaysUntilExpiry = (expiresAt: string) => {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const getStatusClass = (entry: any) => {
  const days = getDaysUntilExpiry(entry.expiresAt);
  if (days <= 0) return 'expired';
  if (days <= 7) return 'expiring-soon';
  return 'active';
};

const getStatusLabel = (entry: any) => {
  const days = getDaysUntilExpiry(entry.expiresAt);
  if (days <= 0) return 'Expired';
  if (days <= 7) return `${days} days`;
  return 'Active';
};

const togglePreload = async (entry: any) => {
  try {
    await invoke('update_hsts_preload', { domain: entry.domain, preload: !entry.preload });
    await loadHSTS();
  } catch (err) {
    console.error('Failed to update preload:', err);
  }
};

onMounted(() => {
  if (props.domain) {
    loadHSTS();
  }
});

watch(() => props.domain, (newDomain) => {
  if (newDomain) {
    loadHSTS();
  }
});
</script>

<template>
  <div class="hsts-manager">
    <div class="hsts-header">
      <h3>HSTS Manager</h3>
      <div class="header-actions">
        <Button variant="ghost" size="sm" @click="loadHSTS" :disabled="isLoading" leadingIcon="
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
            <polyline points='1 4 1 10 7 10' />
            <path d='M3.51 15a9 9 0 1 0 2.13-9.36L1 10' />
          </svg>
        ">
          Refresh
        </Button>
        <Button variant="danger" size="sm" @click="clearHSTSCache" leadingIcon="
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
            <polyline points='3 6 5 6 21 6' />
            <path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' />
          </svg>
        ">
          Clear All
        </Button>
        <Button variant="primary" size="sm" @click="showAddDialog = true" leadingIcon="
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        ">
          Add HSTS
        </Button>
      </div>
    </div>

    <!-- Current Domain HSTS Status -->
    <div v-if="domainEntry" class="current-domain-status">
      <div class="status-header">
        <h4>Current Domain: {{ domainEntry.domain }}</h4>
        <span class="status-badge" :class="getStatusClass(domainEntry)">{{ getStatusLabel(domainEntry) }}</span>
      </div>
      <div class="status-details">
        <div class="detail-item">
          <span class="detail-label">Max Age</span>
          <span class="detail-value">{{ domainEntry.maxAge }}s ({{ Math.floor(domainEntry.maxAge / 86400) }} days)</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Include Subdomains</span>
          <span class="detail-value">{{ domainEntry.includeSubdomains ? 'Yes' : 'No' }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Preload</span>
          <span class="detail-value">
            <Switch
              v-model="domainEntry.preload"
              @change="togglePreload(domainEntry)"
              :disabled="isLoading"
            />
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Expires</span>
          <span class="detail-value" :class="getStatusClass(domainEntry)">
            {{ formatDate(domainEntry.expiresAt) }} ({{ getStatusLabel(domainEntry) }})
          </span>
        </div>
        <div class="status-actions">
          <Button variant="danger" size="sm" @click="removeHSTSEntry(domainEntry.domain)" leadingIcon="
            <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
              <polyline points='3 6 5 6 21 6' />
              <path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' />
            </svg>
          ">
            Remove HSTS
          </Button>
        </div>
      </div>
    </div>

    <!-- HSTS Entries List -->
    <div class="hsts-section">
      <div class="section-header">
        <h3>All HSTS Entries</h3>
        <span class="entry-count">{{ hstsEntries.length }} entries</span>
      </div>

      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading HSTS entries...</p>
      </div>

      <div v-else-if="hstsEntries.length === 0" class="empty-hsts">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.3;">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <p>No HSTS entries configured</p>
        <p class="empty-hint">Add HSTS for domains to enforce HTTPS</p>
      </div>

      <div v-else class="hsts-table-container">
        <table class="hsts-table">
          <thead>
            <tr>
              <th>Domain</th>
              <th>Max Age</th>
              <th>Subdomains</th>
              <th>Preload</th>
              <th>Status</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in hstsEntries" :key="entry.domain" :class="getStatusClass(entry)">
              <td class="domain-cell">
                <span class="domain-name">{{ entry.domain }}</span>
                <span v-if="entry.domain === props.domain" class="current-badge">Current</span>
              </td>
              <td>{{ entry.maxAge }}s ({{ Math.floor(entry.maxAge / 86400) }} days)</td>
              <td>
                <span class="boolean-badge" :class="{ yes: entry.includeSubdomains, no: !entry.includeSubdomains }">
                  {{ entry.includeSubdomains ? 'Yes' : 'No' }}
                </span>
              </td>
              <td>
                <Switch
                  v-model="entry.preload"
                  @change="togglePreload(entry)"
                  :disabled="isLoading"
                />
              </td>
              <td>
                <span class="status-badge" :class="getStatusClass(entry)">
                  {{ getStatusLabel(entry) }}
                </span>
              </td>
              <td>
                <span :class="{ expired: getStatusClass(entry) === 'expired', expiring: getStatusClass(entry) === 'expiring-soon' }">
                  {{ formatDate(entry.expiresAt) }}
                  <br>
                  <span class="days-remaining" :class="getStatusClass(entry)">
                    {{ getStatusLabel(entry) }}
                  </span>
                </td>
                <td class="actions-cell">
                  <Button
                    variant="ghost"
                    size="xs"
                    @click="removeHSTSEntry(entry.domain)"
                    :disabled="isLoading"
                    title="Remove HSTS"
                  >
                    <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                      <polyline points='3 6 5 6 21 6' />
                      <path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' />
                    </svg>
                  </Button>
                </td>
              </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- HSTS Preload List -->
    <div class="hsts-section">
      <div class="section-header">
        <h3>HSTS Preload List</h3>
        <span class="entry-count">{{ hstsPreloadList.length }} domains</span>
      </div>

      <div class="preload-table-container">
        <table class="preload-table">
          <thead>
            <tr>
              <th>Domain</th>
              <th>Policy</th>
              <th>Subdomains</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in hstsPreloadList" :key="entry.domain">
              <td>{{ entry.domain }}</td>
              <td>
                <span class="policy-badge" :class="entry.policy">{{ entry.policy }}</span>
              </td>
              <td>{{ entry.includeSubdomains ? 'Yes' : 'No' }}</td>
              <td>{{ formatDate(entry.submittedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- HSTS Info -->
    <div class="hsts-info">
      <h3>About HSTS</h3>
      <div class="info-cards">
        <div class="info-card">
          <h4>What is HSTS?</h4>
          <p>HTTP Strict Transport Security (HSTS) tells browsers to only connect to a site over HTTPS, preventing SSL stripping attacks.</p>
        </div>
        <div class="info-card">
          <h4>Max Age</h4>
          <p>How long the browser should remember to use HTTPS. Recommended minimum: 1 year (31536000 seconds).</p>
        </div>
        <div class="info-card">
          <h4>Include Subdomains</h4>
          <p>Applies HSTS to all subdomains. Required for preload list submission.</p>
        </div>
        <div class="info-card">
          <h4>Preload List</h4>
          <p>Submits domain to browser preload lists. Permanent - cannot be easily reversed!</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const getDaysUntilExpiry = (expiresAt: string) => {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString();

const getStatusClass = (entry: any) => {
  const days = getDaysUntilExpiry(entry.expiresAt);
  if (days <= 0) return 'expired';
  if (days <= 7) return 'expiring-soon';
  return 'active';
};

const getStatusLabel = (entry: any) => {
  const days = getDaysUntilExpiry(entry.expiresAt);
  if (days <= 0) return 'Expired';
  if (days <= 7) return `${days} days`;
  return 'Active';
};

const domainEntry = computed(() => hstsEntries.value.find(e => e.domain === props.domain) || null);

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString();
</script>

<style scoped>
.hsts-manager {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding: var(--space-4);
  max-height: 70vh;
  overflow-y: auto;
}

.hsts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border-primary);
}

.hsts-header h3 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--fg-secondary);
}

.header-actions {
  display: flex;
  gap: var(--space-2);
}

.current-domain-status {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.status-header h4 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.status-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-primary);
}

.detail-item:last-of-type {
  border-bottom: none;
}

.detail-label {
  font-size: var(--text-sm);
  color: var(--fg-tertiary);
}

.detail-value {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--fg-primary);
}

.detail-value.expiring-soon {
  color: var(--color-warning-500);
  font-weight: var(--font-bold);
}

.detail-value.expired {
  color: var(--color-error-500);
  font-weight: var(--font-bold);
}

.days-remaining {
  font-size: var(--text-xs);
  margin-top: 2px;
}

.days-remaining.expiring-soon {
  color: var(--color-warning-500);
  font-weight: var(--font-bold);
}

.days-remaining.expired {
  color: var(--color-error-500);
  font-weight: var(--font-bold);
}

.status-actions {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-primary);
}

.hsts-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--border-primary);
}

.section-header h3 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--fg-secondary);
}

.entry-count {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  background: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.loading-state, .empty-hsts {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  color: var(--fg-tertiary);
  gap: var(--space-3);
}

.empty-hint {
  font-size: var(--text-sm) !important;
  opacity: 0.7;
}

.hsts-table-container, .preload-table-container {
  overflow-x: auto;
}

.hsts-table, .preload-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.hsts-table th, .hsts-table td,
.preload-table th, .preload-table td {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  border-bottom: 1px solid var(--border-primary);
  vertical-align: middle;
}

.hsts-table th, .preload-table th {
  background: var(--bg-tertiary);
  font-weight: var(--font-semibold);
  color: var(--fg-secondary);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.hsts-table tr.expired td,
.hsts-table tr.expiring-soon td {
  opacity: 0.7;
}

.domain-cell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  white-space: nowrap;
}

.domain-name {
  font-weight: var(--font-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.current-badge {
  font-size: var(--text-xs);
  background: var(--color-brand-100);
  color: var(--color-brand-700);
  padding: 1px 6px;
  border-radius: var(--radius-full);
  font-weight: var(--font-medium);
}

@media (prefers-color-scheme: dark) {
  .current-badge {
    background: var(--color-brand-900);
    color: var(--color-brand-300);
  }
}

.boolean-badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.boolean-badge.yes {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

@media (prefers-color-scheme: dark) {
  .boolean-badge.yes {
    background: var(--color-success-900);
    color: var(--color-success-300);
  }
}

.boolean-badge.no {
  background: var(--color-error-100);
  color: var(--color-error-700);
}

@media (prefers-color-scheme: dark) {
  .boolean-badge.no {
    background: var(--color-error-900);
    color: var(--color-error-300);
  }
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  text-transform: uppercase;
}

.status-badge.active {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

@media (prefers-color-scheme: dark) {
  .status-badge.active {
    background: var(--color-success-900);
    color: var(--color-success-300);
  }
}

.status-badge.expiring-soon {
  background: var(--color-warning-100);
  color: var(--color-warning-700);
}

@media (prefers-color-scheme: dark) {
  .status-badge.expiring-soon {
    background: var(--color-warning-900);
    color: var(--color-warning-300);
  }
}

.status-badge.expired {
  background: var(--color-error-100);
  color: var(--color-error-700);
}

@media (prefers-color-scheme: dark) {
  .status-badge.expired {
    background: var(--color-error-900);
    color: var(--color-error-300);
  }
}

.preload-badge {
  font-size: var(--text-xs);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-weight: var(--font-medium);
  text-transform: capitalize;
}

.preload-badge.preload {
  background: var(--color-brand-100);
  color: var(--color-brand-700);
}

@media (prefers-color-scheme: dark) {
  .preload-badge.preload {
    background: var(--color-brand-900);
    color: var(--color-brand-300);
  }
}

.preload-badge.force-https {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

@media (prefers-color-scheme: dark) {
  .preload-badge.force-https {
    background: var(--color-success-900);
    color: var(--color-success-300);
  }
}

.policy-badge {
  font-size: var(--text-xs);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-weight: var(--font-medium);
  text-transform: capitalize;
}

.policy-badge.preload {
  background: var(--color-brand-100);
  color: var(--color-brand-700);
}

@media (prefers-color-scheme: dark) {
  .policy-badge.preload {
    background: var(--color-brand-900);
    color: var(--color-brand-300);
  }
}

.policy-badge.force-https {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

@media (prefers-color-scheme: dark) {
  .policy-badge.force-https {
    background: var(--color-success-900);
    color: var(--color-success-300);
  }
}

.actions-cell {
  display: flex;
  justify-content: flex-end;
}

.hsts-info {
  border-top: 1px solid var(--border-primary);
  padding-top: var(--space-4);
}

.hsts-info h3 {
  margin: 0 0 var(--space-4);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--fg-secondary);
}

.info-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-3);
}

.info-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.info-card h4 {
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--fg-primary);
}

.info-card p {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--fg-secondary);
  line-height: var(--leading-relaxed);
}

@media (max-width: 768px) {
  .hsts-table, .preload-table {
    font-size: var(--text-xs);
  }
  
  .hsts-table th, .hsts-table td,
  .preload-table th, .preload-table td {
    padding: var(--space-1) var(--space-2);
  }
}
</style>