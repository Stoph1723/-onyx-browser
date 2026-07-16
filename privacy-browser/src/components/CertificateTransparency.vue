<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';

interface Props {
  cert: any;
}

const props = defineProps<Props>();

const cert = computed(() => props.cert);
const scts = ref<any[]>([]);
const ctLoading = ref(false);
const ctError = ref<string | null>(null);
const logs = ref<any[]>([]);

const loadSCTs = async () => {
  if (!props.cert?.fingerprint) return;
  try {
    scts.value = await invoke('get_certificate_scts', { fingerprint: props.cert.fingerprint });
  } catch (err) {
    console.error('Failed to load SCTs:', err);
  }
};

const loadLogs = async () => {
  try {
    logs.value = await invoke('get_ct_logs');
  } catch (err) {
    console.error('Failed to load CT logs:', err);
  }
};

const formatTimestamp = (ts: number) => new Date(ts).toLocaleString();

const getSCTStatus = (sct: any) => {
  const now = Date.now();
  if (sct.timestamp > now) return { label: 'Future', class: 'future' };
  const age = now - sct.timestamp;
  if (age < 24 * 60 * 60 * 1000) return { label: 'Fresh', class: 'fresh' };
  if (age < 7 * 24 * 60 * 60 * 1000) return { label: 'Recent', class: 'recent' };
  return { label: 'Older', class: 'older' };
};

const verifySCT = async (sct: any) => {
  try {
    return await invoke('verify_sct', { sct });
  } catch (err) {
    console.error('SCT verification failed:', err);
    return { valid: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};

const verifyAllSCTs = async () => {
  // Implementation would call backend verification
};

const formatLogUrl = (url: string) => url.replace(/^https?:\/\//, '');

const getLogStatus = (log: any) => {
  if (log.usable) return { label: 'Usable', class: 'usable' };
  if (log.retired) return { label: 'Retired', class: 'retired' };
  return { label: 'Qualified', class: 'qualified' };
};

onMounted(() => {
  loadSCTs();
  loadLogs();
});
</script>

<template>
  <div class="cert-transparency">
    <div class="ct-header">
      <h3>Certificate Transparency</h3>
      <div class="ct-actions">
        <button class="ct-btn" @click="verifyAllSCTs" :disabled="scts.length === 0">
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Verify All SCTs
        </button>
      </div>
    </div>

    <!-- SCTs Section -->
    <div class="ct-section">
      <div class="section-header">
        <h3>Signed Certificate Timestamps (SCTs)</h3>
        <span class="sct-count">{{ scts.length }} SCTs embedded</span>
      </div>

      <div v-if="ctLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading SCTs...</p>
      </div>

      <div v-else-if="scts.length === 0" class="empty-ct">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.3;">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="12" y1="9" x2="12" y2="15" />
          <line x1="9" y1="12" x2="15" y2="12" />
        </svg>
        <p>No SCTs found in this certificate</p>
        <p class="empty-hint">This certificate may not be logged in Certificate Transparency logs</p>
      </div>

      <div v-else class="scts-table-container">
        <table class="scts-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Version</th>
              <th>Log ID</th>
              <th>Timestamp</th>
              <th>Status</th>
              <th>Signature</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(sct, index) in scts" :key="index">
              <td>{{ index + 1 }}</td>
              <td><span class="version-badge">v{{ sct.version }}</span></td>
              <td class="log-id-cell">
                <span class="log-id">{{ sct.logId?.substring(0, 32) }}…</span>
                <span class="log-id-full" v-if="false">{{ sct.logId }}</span>
              </td>
              <td class="timestamp-cell">
                <div class="timestamp-main">{{ formatTimestamp(sct.timestamp) }}</div>
                <div class="timestamp-age" :class="getSCTStatus(sct).class">
                  {{ getSCTStatus(sct).label }}
                </div>
              </td>
              <td>
                <span class="sct-status" :class="getSCTStatus(sct).class">
                  {{ getSCTStatus(sct).label }}
                </span>
              </td>
              <td class="signature-cell">
                <span class="sig-algo">{{ sct.signatureAlgorithm }}</span>
                <div class="sig-preview">{{ sct.signature?.substring(0, 32) }}…</div>
              </td>
              <td class="actions-cell">
                <button class="icon-btn" @click="verifySCT(sct)" title="Verify SCT">
                  <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </button>
                <button class="icon-btn" @click="copySCT(sct)" title="Copy SCT">
                  <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- SCT Summary -->
      <div class="sct-summary">
        <div class="summary-stats">
          <div class="stat-item">
            <span class="stat-value">{{ validSCTCount }}</span>
            <span class="stat-label">Valid</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ freshSCTCount }}</span>
            <span class="stat-label">Fresh (< 24h)</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ uniqueLogCount }}</span>
            <span class="stat-label">Unique Logs</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ scts.length }}</span>
            <span class="stat-label">Total SCTs</span>
          </div>
        </div>
      </div>
    </div>

    <!-- CT Logs Section -->
    <div class="ct-section">
      <div class="section-header">
        <h3>Known CT Logs</h3>
        <span class="log-count">{{ logs.length }} logs</span>
      </div>

      <div class="logs-table-container">
        <table class="logs-table">
          <thead>
            <tr>
              <th>Log Name</th>
              <th>Operator</th>
              <th>URL</th>
              <th>Status</th>
              <th>Key</th>
              <th>MMD</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.key">
              <td>{{ log.name }}</td>
              <td>{{ log.operator }}</td>
              <td class="log-url">
                <a :href="log.url" target="_blank" rel="noopener">{{ formatLogUrl(log.url) }}</a>
              </td>
              <td>
                <span class="log-status" :class="getLogStatus(log).class">
                  {{ getLogStatus(log).label }}
                </span>
              </td>
              <td class="key-cell">{{ log.key?.substring(0, 20) }}…</td>
              <td>{{ log.mmd || 'N/A' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- CT Policy Info -->
    <div class="ct-policy-info">
      <h3>CT Policy Compliance</h3>
      <div class="policy-checks">
        <div class="policy-check" :class="{ pass: policyChecks.minSCTs, fail: !policyChecks.minSCTs }">
          <span class="check-icon">{{ policyChecks.minSCTs ? '✅' : '❌' }}</span>
          <span>Minimum SCTs ({{ policyChecks.minSCTs ? '✓' : '✗' }})</span>
          <span class="check-detail">Chrome: 2 SCTs for certs ≤ 180 days, 3 for > 180 days</span>
        </div>
        <div class="policy-check" :class="{ pass: policyChecks.logDiversity, fail: !policyChecks.logDiversity }">
          <span class="check-icon">{{ policyChecks.logDiversity ? '✅' : '❌' }}</span>
          <span>Log Diversity ({{ policyChecks.logDiversity ? '✓' : '✗' }})</span>
          <span class="check-detail">SCTs from multiple independent logs</span>
        </div>
        <div class="policy-check" :class="{ pass: policyChecks.freshSCTs, fail: !policyChecks.freshSCTs }">
          <span class="check-icon">{{ policyChecks.freshSCTs ? '✅' : '❌' }}</span>
          <span>Fresh SCTs ({{ policyChecks.freshSCTs ? '✓' : '✗' }})</span>
          <span class="check-detail">At least one SCT < 24h old</span>
        </div>
        <div class="policy-check" :class="{ pass: policyChecks.validSignatures, fail: !policyChecks.validSignatures }">
          <span class="check-icon">{{ policyChecks.validSignatures ? '✅' : '❌' }}</span>
          <span>Valid Signatures ({{ policyChecks.validSignatures ? '✓' : '✗' }})</span>
          <span class="check-detail">All SCT signatures cryptographically valid</span>
        </div>
      </div>
    </div>

    <!-- CT Resources -->
    <div class="ct-resources">
      <h3>Resources</h3>
      <div class="resource-links">
        <a href="https://www.certificate-transparency.org/" target="_blank" rel="noopener" class="resource-link">
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Certificate Transparency Project
        </a>
        <a href="https://crt.sh/" target="_blank" rel="noopener" class="resource-link">
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          crt.sh - Certificate Search
        </a>
        <a href="https://transparencyreport.google.com/https/ct" target="_blank" rel="noopener" class="resource-link">
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Google Transparency Report
        </a>
      </div>
    </div>
  </div>
</template>

<script>
const validSCTCount = computed(() => scts.value.filter(s => getSCTStatus(s).class !== 'older').length);
const freshSCTCount = computed(() => scts.value.filter(s => getSCTStatus(s).class === 'fresh').length);
const uniqueLogCount = computed(() => new Set(scts.value.map(s => s.logId)).size);
</script>

<style scoped>
.cert-transparency {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding: var(--space-4);
  max-height: 70vh;
  overflow-y: auto;
}

.ct-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border-primary);
}

.ct-header h3 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--fg-secondary);
}

.ct-actions {
  display: flex;
  gap: var(--space-2);
}

.ct-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  color: var(--fg-secondary);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: var(--transition-fast);
}

.ct-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--color-brand-500);
  color: var(--color-brand-500);
}

.ct-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ct-section {
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

.sct-count, .log-count {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  background: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  color: var(--fg-tertiary);
  gap: var(--space-3);
}

.empty-ct {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  text-align: center;
  color: var(--fg-tertiary);
  gap: var(--space-3);
}

.empty-ct p:first-of-type {
  font-weight: var(--font-medium);
  color: var(--fg-secondary);
}

.empty-hint {
  font-size: var(--text-sm) !important;
  opacity: 0.7;
}

.scts-table-container {
  overflow-x: auto;
}

.scts-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.scts-table th,
.scts-table td {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  border-bottom: 1px solid var(--border-primary);
  vertical-align: middle;
}

.scts-table th {
  background: var(--bg-tertiary);
  font-weight: var(--font-semibold);
  color: var(--fg-secondary);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.version-badge {
  font-size: var(--text-xs);
  background: var(--bg-tertiary);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  color: var(--fg-secondary);
}

.log-id-cell {
  max-width: 150px;
}

.log-id {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.timestamp-cell {
  white-space: nowrap;
}

.timestamp-main {
  font-size: var(--text-xs);
  color: var(--fg-primary);
}

.timestamp-age {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.timestamp-age.fresh {
  color: var(--color-success-500);
}

@media (prefers-color-scheme: dark) {
  .timestamp-age.fresh {
    color: var(--color-success-400);
  }
}

.timestamp-age.recent {
  color: var(--color-brand-500);
}

.timestamp-age.older {
  color: var(--color-warning-500);
}

.timestamp-age.future {
  color: var(--color-warning-500);
}

.sct-status {
  display: inline-block;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  text-transform: uppercase;
}

.sct-status.fresh {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

@media (prefers-color-scheme: dark) {
  .sct-status.fresh {
    background: var(--color-success-900);
    color: var(--color-success-300);
  }
}

.sct-status.recent {
  background: var(--color-brand-100);
  color: var(--color-brand-700);
}

@media (prefers-color-scheme: dark) {
  .sct-status.recent {
    background: var(--color-brand-900);
    color: var(--color-brand-300);
  }
}

.sct-status.older {
  background: var(--color-warning-100);
  color: var(--color-warning-700);
}

@media (prefers-color-scheme: dark) {
  .sct-status.older {
    background: var(--color-warning-900);
    color: var(--color-warning-300);
  }
}

.sct-status.future {
  background: var(--color-warning-100);
  color: var(--color-warning-700);
}

@media (prefers-color-scheme: dark) {
  .sct-status.future {
    background: var(--color-warning-900);
    color: var(--color-warning-300);
  }
}

.signature-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 150px;
}

.sig-algo {
  font-size: var(--text-xs);
  color: var(--fg-secondary);
  font-weight: var(--font-medium);
}

.sig-preview {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  background: var(--bg-tertiary);
  padding: 1px 4px;
  border-radius: var(--radius-sm);
}

.actions-cell {
  display: flex;
  gap: var(--space-1);
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  color: var(--fg-secondary);
  cursor: pointer;
  transition: var(--transition-fast);
}

.icon-btn:hover {
  background: var(--bg-hover);
  border-color: var(--color-brand-500);
  color: var(--color-brand-500);
}

.sct-summary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-primary);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-2) var(--space-3);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  min-width: 80px;
}

.stat-value {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--color-brand-500);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* CT Logs Table */
.logs-table-container {
  overflow-x: auto;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.logs-table th,
.logs-table td {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  border-bottom: 1px solid var(--border-primary);
  vertical-align: top;
}

.logs-table th {
  background: var(--bg-tertiary);
  font-weight: var(--font-semibold);
  color: var(--fg-secondary);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.log-url {
  max-width: 200px;
}

.log-url a {
  color: var(--color-brand-500);
  text-decoration: none;
  font-size: var(--text-xs);
  font-family: var(--font-mono);
}

.log-url a:hover {
  text-decoration: underline;
}

.log-status {
  display: inline-block;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  text-transform: uppercase;
}

.log-status.usable {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

@media (prefers-color-scheme: dark) {
  .log-status.usable {
    background: var(--color-success-900);
    color: var(--color-success-300);
  }
}

.log-status.retired {
  background: var(--color-warning-100);
  color: var(--color-warning-700);
}

@media (prefers-color-scheme: dark) {
  .log-status.retired {
    background: var(--color-warning-900);
    color: var(--color-warning-300);
  }
}

.log-status.qualified {
  background: var(--color-brand-100);
  color: var(--color-brand-700);
}

@media (prefers-color-scheme: dark) {
  .log-status.qualified {
    background: var(--color-brand-900);
    color: var(--color-brand-300);
  }
}

.key-cell {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
}

/* CT Policy Info */
.ct-policy-info {
  border-top: 1px solid var(--border-primary);
  padding-top: var(--space-4);
}

.ct-policy-info h3 {
  margin: 0 0 var(--space-4);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--fg-secondary);
}

.policy-checks {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.policy-check {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-primary);
  background: var(--bg-secondary);
}

.policy-check.pass {
  border-color: var(--color-success-300);
  background: var(--color-success-50);
}

@media (prefers-color-scheme: dark) {
  .policy-check.pass {
    background: var(--color-success-900);
    border-color: var(--color-success-700);
  }
}

.policy-check.fail {
  border-color: var(--color-error-300);
  background: var(--color-error-50);
}

@media (prefers-color-scheme: dark) {
  .policy-check.fail {
    background: var(--color-error-900);
    border-color: var(--color-error-700);
  }
}

.check-icon {
  font-size: var(--text-lg);
  flex-shrink: 0;
  margin-top: 2px;
}

.check-detail {
  flex: 1;
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  line-height: var(--leading-relaxed);
}

.policy-check .check-icon {
  font-size: var(--text-lg);
}

/* CT Resources */
.ct-resources {
  border-top: 1px solid var(--border-primary);
  padding-top: var(--space-4);
}

.ct-resources h3 {
  margin: 0 0 var(--space-3);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--fg-secondary);
}

.resource-links {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.resource-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  color: var(--fg-primary);
  text-decoration: none;
  transition: var(--transition-fast);
}

.resource-link:hover {
  background: var(--bg-hover);
  border-color: var(--color-brand-500);
  color: var(--color-brand-500);
}

.resource-link svg {
  color: var(--fg-tertiary);
  flex-shrink: 0;
}

.resource-link:hover svg {
  color: var(--color-brand-500);
}

@media (max-width: 768px) {
  .scts-table,
  .logs-table {
    font-size: var(--text-xs);
  }
  
  .scts-table th,
  .scts-table td,
  .logs-table th,
  .logs-table td {
    padding: var(--space-1) var(--space-2);
  }
}
</style>