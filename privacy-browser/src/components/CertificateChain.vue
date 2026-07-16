<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';

interface Props {
  cert: any;
}

const props = defineProps<Props>();

const cert = computed(() => props.cert);
const chain = ref<any[]>([]);
const chainLoading = ref(false);
const chainError = ref<string | null>(null);

const loadChain = async () => {
  chainLoading.value = true;
  chainError.value = null;
  try {
    chain.value = await invoke('get_certificate_chain', { fingerprint: cert.value.fingerprint });
  } catch (err) {
    chainError.value = err instanceof Error ? err.message : 'Failed to load chain';
    console.error('Failed to load certificate chain:', err);
  } finally {
    chainLoading.value = false;
  }
};

const getTrustStatus = (chain: any[]) => {
  if (chain.length === 0) return { label: 'Unknown', class: 'unknown' };
  const root = chain[chain.length - 1];
  if (root.selfSigned && root.trusted) return { label: 'Trusted Root', class: 'trusted' };
  if (root.selfSigned) return { label: 'Self-Signed (Untrusted)', class: 'untrusted' };
  return { label: 'Unknown', class: 'unknown' };
};

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString();

const getDaysUntilExpiry = (notAfter: string) => Math.ceil((new Date(notAfter).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

const getStatusClass = (cert: any) => {
  if (cert.revoked) return 'revoked';
  const expiry = new Date(cert.notAfter).getTime();
  if (expiry <= Date.now()) return 'expired';
  if (expiry - Date.now() < 30 * 24 * 60 * 60 * 1000) return 'expiring-soon';
  return 'valid';
};

onMounted(() => {
  loadChain();
});
</script>

<template>
  <div class="cert-chain">
    <div v-if="chainLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading certificate chain...</p>
    </div>

    <div v-else-if="chainError" class="error-state">
      <p>{{ chainError }}</p>
      <button class="retry-btn" @click="loadChain">Retry</button>
    </div>

    <div v-else-if="chain.length === 0" class="empty-state">
      <p>No chain data available</p>
    </div>

    <div v-else class="chain-container">
      <!-- Trust Status -->
      <div class="trust-status" :class="getTrustStatus(chain).class">
        <span class="status-icon">{{ getTrustStatus(chain).class === 'trusted' ? '✅' : '❌' }}</span>
        <span>{{ getTrustStatus(chain).label }}</span>
      </div>

      <!-- Chain Visualization -->
      <div class="chain-visualization">
        <div class="chain-path">
          <div
            v-for="(c, index) in chain"
            :key="c.fingerprint"
            class="chain-node"
            :class="{ root: index === chain.length - 1, intermediate: index < chain.length - 1 }"
          >
            <div class="node-connector" v-if="index < chain.length - 1"></div>
            
            <div class="node-card" :class="getStatusClass(c)">
              <div class="node-level">
                <span v-if="index === 0">🌐 End Entity</span>
                <span v-else-if="index === chain.length - 1">🏛️ Root CA</span>
                <span v-else>🔗 Intermediate CA</span>
              </div>
              
              <div class="node-subject">{{ extractCN(c.subject) }}</div>
              <div class="node-issuer">Issuer: {{ extractCN(c.issuer) }}</div>
              
              <div class="node-validity">
                <span :class="{ expired: getDaysUntilExpiry(c.notAfter) <= 0, warning: getDaysUntilExpiry(c.notAfter) <= 30 && getDaysUntilExpiry(c.notAfter) > 0 }">
                  {{ formatDate(c.notBefore) }} – {{ formatDate(c.notAfter) }}
                </span>
                <span class="days" :class="{ expired: getDaysUntilExpiry(c.notAfter) <= 0, warning: getDaysUntilExpiry(c.notAfter) <= 30 && getDaysUntilExpiry(c.notAfter) > 0 }">
                  {{ getDaysUntilExpiry(c.notAfter) > 0 ? getDaysUntilExpiry(c.notAfter) + ' days' : 'EXPIRED' }}
                </span>
              </div>
              
              <div class="node-fingerprint">{{ c.fingerprint }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Chain Details Table -->
      <div class="chain-details">
        <h3>Chain Details</h3>
        <div class="chain-table-container">
          <table class="chain-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Subject</th>
                <th>Issuer</th>
                <th>Validity</th>
                <th>Status</th>
                <th>Fingerprint</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(c, index) in chain"
                :key="c.fingerprint"
                :class="getStatusClass(c)"
              >
                <td>{{ index === 0 ? 'EE' : index === chain.length - 1 ? 'Root' : 'CA' + index }}</td>
                <td>{{ extractCN(c.subject) }}</td>
                <td>{{ extractCN(c.issuer) }}</td>
                <td>
                  {{ formatDate(c.notBefore) }} – {{ formatDate(c.notAfter) }}
                  <br>
                  <span :class="{ expired: getDaysUntilExpiry(c.notAfter) <= 0, warning: getDaysUntilExpiry(c.notAfter) <= 30 && getDaysUntilExpiry(c.notAfter) > 0 }">
                    {{ getDaysUntilExpiry(c.notAfter) > 0 ? getDaysUntilExpiry(c.notAfter) + ' days' : 'EXPIRED' }}
                  </span>
                </td>
                <td>
                  <span class="status-badge" :class="getStatusClass(c)">
                    {{ getDaysUntilExpiry(c.notAfter) <= 0 ? 'Expired' : c.revoked ? 'Revoked' : getDaysUntilExpiry(c.notAfter) <= 30 ? 'Expiring Soon' : 'Valid' }}
                  </span>
                </td>
                <td class="fingerprint">{{ c.fingerprint }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Verification Details -->
      <div v-if="!chainLoading="chainVerification" class="verification-section">
        <h3>Verification</h3>
        <div class="verification-result" :class="chainVerification.valid ? 'valid' : 'invalid'">
          <span class="verify-icon">{{ chainVerification.valid ? '✅' : '❌' }}</span>
          <span>{{ chainVerification.valid ? 'Chain Verified' : 'Verification Failed' }}</span>
        </div>
        <div v-if="chainVerification.errors.length > 0" class="verify-errors">
          <h4>Errors:</h4>
          <ul>
            <li v-for="error in chainVerification.errors" :key="error">{{ error }}</li>
          </ul>
        </div>
        <div v-if="chainVerification.details.length > 0" class="verify-details">
          <h4>Details:</h4>
          <ul>
            <li v-for="detail in chainVerification.details" :key="detail">{{ detail }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const extractCN = (subject: string) => {
  const match = subject.match(/CN=([^,]+)/);
  return match ? match[1] : subject;
};
</script>

<style scoped>
.cert-chain {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding: var(--space-4);
  max-height: 70vh;
  overflow-y: auto;
}

.loading-state, .error-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  color: var(--fg-tertiary);
  gap: var(--space-3);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-primary);
  border-top-color: var(--color-brand-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.retry-btn {
  padding: var(--space-2) var(--space-4);
  background: var(--color-brand-500);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.trust-status {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  font-weight: var(--font-medium);
}

.trust-status.trusted {
  background: var(--color-success-100);
  color: var(--color-success-700);
  border: 1px solid var(--color-success-300);
}

@media (prefers-color-scheme: dark) {
  .trust-status.trusted {
    background: var(--color-success-900);
    color: var(--color-success-300);
    border-color: var(--color-success-700);
  }
}

.trust-status.untrusted {
  background: var(--color-error-100);
  color: var(--color-error-700);
  border: 1px solid var(--color-error-300);
}

@media (prefers-color-scheme: dark) {
  .trust-status.untrusted {
    background: var(--color-error-900);
    color: var(--color-error-300);
    border-color: var(--color-error-700);
  }
}

.trust-status.unknown {
  background: var(--color-warning-100);
  color: var(--color-warning-700);
  border: 1px solid var(--color-warning-300);
}

@media (prefers-color-scheme: dark) {
  .trust-status.unknown {
    background: var(--color-warning-900);
    color: var(--color-warning-300);
    border-color: var(--color-warning-700);
  }
}

.chain-visualization {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.chain-path {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  position: relative;
}

.chain-path::before {
  content: '';
  position: absolute;
  left: 56px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--border-primary);
}

.chain-node {
  display: flex;
  gap: var(--space-4);
  position: relative;
}

.node-connector {
  position: absolute;
  left: 56px;
  top: 72px;
  bottom: 0;
  width: 2px;
  background: var(--border-primary);
}

.node-card {
  flex: 1;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  transition: var(--transition-fast);
}

.node-card:hover {
  border-color: var(--color-brand-500);
  box-shadow: var(--shadow-md);
}

.node-card.valid {
  border-left: 3px solid var(--color-success-500);
}

.node-card.expiring-soon {
  border-left: 3px solid var(--color-warning-500);
}

.node-card.expired {
  border-left: 3px solid var(--color-error-500);
}

.node-card.revoked {
  border-left: 3px solid var(--color-error-500);
  opacity: 0.7;
}

.node-level {
  display: inline-block;
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  margin-bottom: var(--space-2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.node-card.root .node-level {
  background: var(--color-brand-100);
  color: var(--color-brand-700);
}

@media (prefers-color-scheme: dark) {
  .node-card.root .node-level {
    background: var(--color-brand-900);
    color: var(--color-brand-300);
  }
}

.node-card.intermediate .node-level {
  background: var(--color-brand-100);
  color: var(--color-brand-700);
}

@media (prefers-color-scheme: dark) {
  .node-card.intermediate .node-level {
    background: var(--color-brand-900);
    color: var(--color-brand-300);
  }
}

.node-subject {
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  margin-bottom: var(--space-1);
  word-break: break-all;
}

.node-issuer {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  margin-bottom: var(--space-2);
  word-break: break-all;
}

.node-validity {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--text-xs);
  color: var(--fg-secondary);
}

.node-validity .expired {
  color: var(--color-error-500);
  font-weight: var(--font-bold);
}

.node-validity .warning {
  color: var(--color-warning-500);
  font-weight: var(--font-bold);
}

.node-fingerprint {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--border-primary);
}

/* Chain Details Table */
.chain-details {
  border-top: 1px solid var(--border-primary);
  padding-top: var(--space-4);
}

.chain-details h3 {
  margin: 0 0 var(--space-3);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--fg-secondary);
}

.chain-table-container {
  overflow-x: auto;
}

.chain-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.chain-table th,
.chain-table td {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  border-bottom: 1px solid var(--border-primary);
  vertical-align: top;
}

.chain-table th {
  background: var(--bg-tertiary);
  font-weight: var(--font-semibold);
  color: var(--fg-secondary);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chain-table td {
  vertical-align: top;
}

.chain-table td.fingerprint {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
}

.chain-table tr.expired td {
  opacity: 0.6;
}

.chain-table tr.revoked td {
  opacity: 0.5;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  text-transform: uppercase;
}

.status-badge.valid {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

@media (prefers-color-scheme: dark) {
  .status-badge.valid {
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

.status-badge.revoked {
  background: var(--color-error-100);
  color: var(--color-error-700);
}

@media (prefers-color-scheme: dark) {
  .status-badge.revoked {
    background: var(--color-error-900);
    color: var(--color-error-300);
  }
}

/* Verification Section */
.verification-section {
  border-top: 1px solid var(--border-primary);
  padding-top: var(--space-4);
}

.verification-section h3 {
  margin: 0 0 var(--space-3);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--fg-secondary);
}

.verification-result {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  font-weight: var(--font-medium);
}

.verification-result.valid {
  background: var(--color-success-100);
  color: var(--color-success-700);
  border: 1px solid var(--color-success-300);
}

@media (prefers-color-scheme: dark) {
  .verification-result.valid {
    background: var(--color-success-900);
    color: var(--color-success-300);
    border-color: var(--color-success-700);
  }
}

.verification-result.invalid {
  background: var(--color-error-100);
  color: var(--color-error-700);
  border: 1px solid var(--color-error-300);
}

@media (prefers-color-scheme: dark) {
  .verification-result.invalid {
    background: var(--color-error-900);
    color: var(--color-error-300);
    border-color: var(--color-error-700);
  }
}

.verify-errors, .verify-details {
  margin-top: var(--space-3);
}

.verify-errors h4, .verify-details h4 {
  margin: 0 0 var(--space-2);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--fg-secondary);
}

.verify-errors ul, .verify-details ul {
  margin: 0;
  padding-left: var(--space-4);
  font-size: var(--text-xs);
}

.verify-errors li {
  color: var(--color-error-600);
}

@media (max-width: 768px) {
  .chain-table-container {
    font-size: var(--text-xs);
  }
  
  .chain-table th,
  .chain-table td {
    padding: var(--space-1) var(--space-2);
  }
}
</style>