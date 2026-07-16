<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useCertificateViewer } from '../composables/useCertificateViewer';
import Button from './ui/Button.vue';
import Input from './ui/Input.vue';
import Select from './ui/Select.vue';
import Dialog from './ui/Dialog.vue';

const {
  certificates,
  selectedCertificate,
  selectedCertDetail,
  isLoading,
  error,
  loadCertificates,
  loadCertificateDetail,
  verifyCertificate,
  exportCertificate,
  hstsEntries,
  hstsPreloadList,
  loadHSTS,
  addHSTSEntry,
  removeHSTSEntry,
  hstsIncludeSubdomains,
  hstsMaxAge,
  hstsPreload,
  clearHSTSCache,
} = useCertificateViewer();

const showHSTSDialog = ref(false);
const showExportDialog = ref(false);
const exportFormat = ref<'pem' | 'der'>('pem');
const exportPassword = ref('');
const searchQuery = ref('');
const filterStatus = ref<'all' | 'valid' | 'expired' | 'revoked'>('all');
const sortBy = ref<'expiry' | 'issued' | 'subject' | 'issuer'>('expiry');
const sortDirection = ref<'asc' | 'desc'>('asc');

const filteredCerts = computed(() => {
  let result = certificates.value;
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(c => 
      c.subject.toLowerCase().includes(q) ||
      c.issuer.toLowerCase().includes(q) ||
      c.serialNumber.toLowerCase().includes(q) ||
      c.fingerprint.toLowerCase().includes(q)
    );
  }
  
  if (filterStatus.value !== 'all') {
    const now = Date.now();
    result = result.filter(c => {
      const expiry = new Date(c.notAfter).getTime();
      if (filterStatus.value === 'valid') return expiry > Date.now() && !c.revoked;
      if (filterStatus.value === 'expired') return expiry <= Date.now();
      if (filterStatus.value === 'revoked') return c.revoked;
      return true;
    });
  }
  
  result.sort((a, b) => {
    let comparison = 0;
    switch (sortBy.value) {
      case 'expiry':
        comparison = new Date(a.notAfter).getTime() - new Date(b.notAfter).getTime();
        break;
      case 'issued':
        comparison = new Date(a.notBefore).getTime() - new Date(b.notBefore).getTime();
        break;
      case 'subject':
        comparison = a.subject.localeCompare(b.subject);
        break;
      case 'issuer':
        comparison = a.issuer.localeCompare(b.issuer);
        break;
    }
    return sortDirection.value === 'asc' ? comparison : -comparison;
  });
  
  return result;
});

const statusCounts = computed(() => {
  const now = Date.now();
  return {
    all: certificates.value.length,
    valid: certificates.value.filter(c => new Date(c.notAfter).getTime() > Date.now() && !c.revoked).length,
    expired: certificates.value.filter(c => new Date(c.notAfter).getTime() <= Date.now()).length,
    revoked: certificates.value.filter(c => c.revoked).length,
  };
});

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleString();
};

const formatValidity = (notBefore: string, notAfter: string) => {
  const start = new Date(notBefore);
  const end = new Date(notAfter);
  return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
};

const getDaysUntilExpiry = (notAfter: string) => {
  const diff = new Date(notAfter).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const getStatusClass = (cert: any) => {
  const now = Date.now();
  const expiry = new Date(cert.notAfter).getTime();
  if (cert.revoked) return 'revoked';
  if (expiry <= Date.now()) return 'expired';
  if (expiry - Date.now() < 30 * 24 * 60 * 60 * 1000) return 'expiring-soon';
  return 'valid';
};

const getStatusLabel = (cert: any) => {
  if (cert.revoked) return 'Revoked';
  const now = Date.now();
  const expiry = new Date(cert.notAfter).getTime();
  if (expiry <= Date.now()) return 'Expired';
  const days = Math.ceil((expiry - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 30) return `Expires in ${days} days`;
  return 'Valid';
};

const exportCert = async () => {
  if (!selectedCertificate.value) return;
  try {
    const data = await exportCertificate(selectedCertificate.value.fingerprint, exportFormat.value, exportPassword.value || undefined);
    const blob = new Blob([data], { type: exportFormat.value === 'pem' ? 'application/x-pem-file' : 'application/x-x509-ca-cert' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCertificate.value.subject.replace(/[^a-zA-Z0-9]/g, '_')}.${exportFormat.value === 'pem' ? 'pem' : 'der'}`;
    a.click();
    URL.revokeObjectURL(url);
    showExportDialog.value = false;
  } catch (error) {
    console.error('Export failed:', error);
  }
};

const handleVerify = async () => {
  if (!selectedCertificate.value) return;
  try {
    const result = await verifyCertificate(selectedCertificate.value.fingerprint);
    alert(`Verification: ${result.valid ? 'Valid' : 'Invalid'}\n${result.details.join('\n')}`);
  } catch (error) {
    console.error('Verification failed:', error);
  }
};

const saveHSTSEntry = async () => {
  if (!selectedCertificate.value) return;
  try {
    await addHSTSEntry({
      domain: selectedCertificate.value.subject.match(/CN=([^,]+)/)?.[1] || '',
      includeSubdomains: hstsIncludeSubdomains.value,
      maxAge: hstsMaxAge.value,
      preload: hstsPreload.value,
    });
    await loadHSTS();
    showHSTSDialog.value = false;
  } catch (error) {
    console.error('Failed to add HSTS entry:', error);
  }
};

onMounted(async () => {
  await loadCertificates();
  await loadHSTS();
});
</script>

<template>
  <div class="certificate-viewer">
    <!-- Header -->
    <header class="manager-header">
      <div class="header-left">
        <h1>🔐 Certificate Viewer</h1>
        <span class="stats">{{ certificates.length }} certificates</span>
      </div>
      
      <div class="header-right">
        <div class="filter-group">
          <Input
            v-model="searchQuery"
            placeholder="Search certificates..."
            class="search-input"
            leadingIcon="
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                <circle cx='11' cy='11' r='8' />
                <line x1='21' y1='21' x2='16.65' y2='16.65' />
              </svg>
            "
          />
          
          <Select
            v-model="filterStatus"
            :options="[
              { value: 'all', label: 'All' },
              { value: 'valid', label: 'Valid' },
              { value: 'expired', label: 'Expired' },
              { value: 'revoked', label: 'Revoked' },
            ]"
            class="filter-select"
          />
          
          <Select
            v-model="sortBy"
            :options="[
              { value: 'expiry', label: 'Expires' },
              { value: 'issued', label: 'Issued' },
              { value: 'subject', label: 'Subject' },
              { value: 'issuer', label: 'Issuer' },
            ]"
            class="filter-select"
          />
          
          <Button variant="ghost" size="sm" @click="sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'" title="Toggle sort order">
            <svg :class="{ rotated: sortDirection === 'desc' }" width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
              <line x1="12" y1="2" x2="12" y2="22" />
              <polyline points="7 12 12 17 17 12" />
            </svg>
          </Button>
        </div>
        
        <Button variant="ghost" size="sm" @click="loadCertificates" :disabled="isLoading" leadingIcon="
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
            <polyline points='1 4 1 10 7 10' />
            <path d='M3.51 15a9 9 0 1 0 2.13-9.36L1 10' />
          </svg>
        ">
          Refresh
        </Button>
      </div>
    </header>

    <!-- Status Bar -->
    <div class="status-bar">
      <div class="status-counts">
        <span class="count all">{{ statusCounts.all }} total</span>
        <span class="count valid">✅ {{ statusCounts.valid }} valid</span>
        <span class="count expiring">⚠️ {{ statusCounts.expiring || 0 }} expiring soon</span>
        <span class="count expired">❌ {{ statusCounts.expired }} expired</span>
        <span class="count revoked">🚫 {{ statusCounts.revoked }} revoked</span>
      </div>
    </div>

    <!-- Main Content -->
    <div class="viewer-layout">
      <!-- Certificate List -->
      <aside class="cert-list-panel">
        <div class="panel-header">
          <h3>Certificates</h3>
          <div class="panel-controls">
            <Select
              v-model="sortBy"
              :options="[
                { value: 'expiry', label: 'Expires' },
                { value: 'issued', label: 'Issued' },
                { value: 'subject', label: 'Subject' },
                { value: 'issuer', label: 'Issuer' },
              ]"
              class="compact-select"
            />
            <Button variant="ghost" size="xs" @click="sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'" title="Toggle sort">
              <svg :class="{ rotated: sortDirection === 'desc' }" width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                <line x1="12" y1="2" x2="12" y2="22" />
                <polyline points="7 12 12 17 17 12" />
              </svg>
            </Button>
          </div>
        </div>
        
        <div class="cert-list" ref="certList">
          <div
            v-for="cert in filteredCerts"
            :key="cert.fingerprint"
            class="cert-item"
            :class="{ selected: selectedCertificate?.fingerprint === cert.fingerprint, [getStatusClass(cert)]: true }"
            @click="selectedCertificate = cert"
          >
            <div class="cert-status-indicator" :class="getStatusClass(cert)"></div>
            <div class="cert-info">
              <div class="cert-subject">{{ extractCN(cert.subject) }}</div>
              <div class="cert-issuer">{{ extractCN(cert.issuer) }}</div>
              <div class="cert-validity">
                <span :class="getStatusClass(cert)">{{ getStatusLabel(cert) }}</span>
                <span>•</span>
                <span>Expires: {{ formatDate(cert.notAfter) }}</span>
              </div>
            </div>
            <div class="cert-status-badge" :class="getStatusClass(cert)">
              {{ getStatusLabel(cert).split(' ')[0] }}
            </div>
          </div>
          
          <div v-if="filteredCerts.length === 0" class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.3;">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="12" y1="9" x2="12" y2="15" />
              <line x1="9" y1="12" x2="15" y2="12" />
            </svg>
            <p>No certificates found</p>
          </div>
        </div>
      </aside>

      <!-- Certificate Detail -->
      <main class="cert-detail-panel">
        <div v-if="!selectedCertificate" class="empty-detail">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.3;">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="12" y1="9" x2="12" y2="15" />
            <line x1="9" y1="12" x2="15" y2="12" />
          </svg>
          <h2>Select a certificate</h2>
          <p>Choose a certificate from the list to view details</p>
        </div>

        <div v-else class="cert-detail">
          <!-- Certificate Header -->
          <div class="detail-header">
            <div class="cert-summary">
              <div class="cert-status-large" :class="getStatusClass(selectedCertificate)">
                <span class="status-icon">{{ getStatusIcon(selectedCertificate) }}</span>
                <span class="status-text">{{ getStatusLabel(selectedCertificate) }}</span>
              </div>
              <div class="cert-main-info">
                <h2>{{ extractCN(selectedCertificate.subject) }}</h2>
                <p class="cert-issuer">Issued by: {{ extractCN(selectedCertificate.issuer) }}</p>
                <div class="validity-period">
                  <span>Valid: {{ formatValidity(selectedCertificate.notBefore, selectedCertificate.notAfter) }}</span>
                  <span v-if="getDaysUntilExpiry(selectedCertificate.notAfter) > 0 && getDaysUntilExpiry(selectedCertificate.notAfter) <= 30" class="expiry-warning">
                    ⚠️ Expires in {{ getDaysUntilExpiry(selectedCertificate.notAfter) }} days
                  </span>
                  <span v-else-if="getDaysUntilExpiry(selectedCertificate.notAfter) <= 0" class="expired-badge">
                    ❌ Expired {{ Math.abs(getDaysUntilExpiry(selectedCertificate.notAfter)) }} days ago
                  </span>
                </div>
              </div>
            </div>
            
            <div class="header-actions">
              <Button variant="ghost" size="sm" @click="handleVerify" leadingIcon="
                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              ">
                Verify
              </Button>
              <Button variant="ghost" size="sm" @click="showExportDialog = true" leadingIcon="
                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              ">
                Export
              </Button>
              <Button variant="primary" size="sm" @click="showHSTSDialog = true" leadingIcon="
                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              ">
                Add HSTS
              </Button>
            </div>
          </div>

          <!-- Certificate Tabs -->
          <div class="detail-tabs">
            <div class="tab-nav">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                :class="['tab-btn', { active: activeTab === tab.id }]"
                @click="activeTab = tab.id"
              >
                {{ tab.label }}
              </button>
            </div>

            <div class="tab-content">
              <!-- General Tab -->
              <div v-if="activeTab === 'general'" class="tab-panel">
                <CertificateGeneral :cert="selectedCertificate" />
              </div>

              <!-- Details Tab -->
              <div v-if="activeTab === 'details'" class="tab-panel">
                <CertificateDetails :cert="selectedCertificate" />
              </div>

              <!-- Extensions Tab -->
              <div v-if="activeTab === 'extensions'" class="tab-panel">
                <CertificateExtensions :cert="selectedCertificate" />
              </div>

              <!-- Chain Tab -->
              <div v-if="activeTab === 'chain'" class="tab-panel">
                <CertificateChain :cert="selectedCertificate" />
              </div>

              <!-- Transparency Tab -->
              <div v-if="activeTab === 'transparency'" class="tab-panel">
                <CertificateTransparency :cert="selectedCertificate" />
              </div>

              <!-- HSTS Tab -->
              <div v-if="activeTab === 'hsts'" class="tab-panel">
                <HSTSManager :domain="extractCN(selectedCertificate.subject)" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>

    <!-- Export Dialog -->
    <Dialog v-model:open="showExportDialog" title="Export Certificate" width="450">
      <p class="dialog-description">Export the selected certificate in PEM or DER format.</      <div class="export-options">
        <div class="option-group">
          <label>Format</label>
          <Select
            v-model="exportFormat"
            :options="[
              { value: 'pem', label: 'PEM (Base64 encoded)' },
              { value: 'der', label: 'DER (Binary)' },
            ]"
          />
        </div>
        
        <div class="option-group">
          <label>Password Protection (optional)</label>
          <Input
            v-model="exportPassword"
            type="password"
            placeholder="Leave empty for no password"
          />
          <p class="option-hint">Only applies to PKCS#12 format. For PEM/DER, certificate is exported unencrypted.</p>
        </div>
      </div>
      
      <div class="dialog-actions">
        <Button variant="ghost" @click="showExportDialog = false">Cancel</Button>
        <Button variant="primary" @click="exportCert">
          Export Certificate
        </Button>
      </div>
    </Dialog>

    <!-- HSTS Dialog -->
    <Dialog v-model:open="showHSTSDialog" :title="'Add HSTS for ' + extractCN(selectedCertificate?.subject)" width="500">
      <p class="dialog-description">Configure HSTS (HTTP Strict Transport Security) for this domain.</p>
      
      <div class="hsts-form">
        <div class="form-group">
          <label>Domain</label>
          <Input
            v-model="hstsDomain"
            :value="extractCN(selectedCertificate?.subject) || ''"
            placeholder="example.com"
          />
        </div>
        
        <Switch
          v-model="hstsIncludeSubdomains"
          title="Include Subdomains"
          description="Apply HSTS to all subdomains (includeSubDomains directive)"
        />
        
        <div class="form-group">
          <label>Max Age (seconds)</label>
          <Input
            v-model.number="hstsMaxAge"
            type="number"
            :value="31536000"
            min="0"
            max="63072000"
          />
          <p class="field-hint">31536000 = 1 year (recommended minimum)</p>
        </div>
        
        <Switch
          v-model="hstsPreload"
          title="Preload"
          description="Submit to HSTS preload list (requires includeSubDomains and max-age ≥ 1 year)"
        />
        
        <div class="form-warning">
          ⚠️ HSTS preload submission is permanent and cannot be easily reversed. Ensure HTTPS works correctly for all subdomains before enabling.
        </div>
      </div>
      
      <div class="dialog-actions">
        <Button variant="ghost" @click="showHSTSDialog = false">Cancel</Button>
        <Button variant="primary" @click="saveHSTSEntry">Add HSTS Entry</Button>
      </div>
    </Dialog>

    <!-- Error Dialog -->
    <Dialog v-model:open="showErrorDialog" title="Error" width="400" v-if="error">
      <p>{{ error }}</p>
      <div class="dialog-actions">
        <Button variant="primary" @click="error = null">OK</Button>
      </div>
    </Dialog>
  </div>
</template>

<script>
const tabs = [
  { id: 'general', label: 'General' },
  { id: 'details', label: 'Details' },
  { id: 'extensions', label: 'Extensions' },
  { id: 'chain', label: 'Chain' },
  { id: 'transparency', label: 'CT Logs' },
  { id: 'hsts', label: 'HSTS' },
];
const activeTab = ref('general');
const hstsDomain = ref('');
const showErrorDialog = ref(false);
const error = ref<string | null>(null);

const extractCN = (subject: string) => {
  const match = subject.match(/CN=([^,]+)/);
  return match ? match[1] : subject;
};

const getStatusIcon = (cert: any) => {
  if (cert.revoked) return '🚫';
  const now = Date.now();
  const expiry = new Date(cert.notAfter).getTime();
  if (expiry <= Date.now()) return '❌';
  if (expiry - Date.now() < 30 * 24 * 60 * 60 * 1000) return '⚠️';
  return '✅';
};
</script>

<style scoped>
.certificate-viewer {
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

.status-bar {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-5);
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
  font-size: var(--text-xs);
  flex-wrap: wrap;
}

.count {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-weight: var(--font-medium);
}

.count.all { background: var(--bg-tertiary); color: var(--fg-secondary); }
.count.valid { background: var(--color-success-100); color: var(--color-success-700); }
@media (prefers-color-scheme: dark) { .count.valid { background: var(--color-success-900); color: var(--color-success-300); } }
.count.expiring { background: var(--color-warning-100); color: var(--color-warning-700); }
@media (prefers-color-scheme: dark) { .count.expiring { background: var(--color-warning-900); color: var(--color-warning-300); } }
.count.expired { background: var(--color-error-100); color: var(--color-error-700); }
@media (prefers-color-scheme: dark) { .count.expired { background: var(--color-error-900); color: var(--color-error-300); } }
.count.revoked { background: var(--color-error-100); color: var(--color-error-700); }
@media (prefers-color-scheme: dark) { .count.revoked { background: var(--color-error-900); color: var(--color-error-300); } }

.viewer-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Certificate List Panel */
.cert-list-panel {
  width: 380px;
  min-width: 320px;
  max-width: 500px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-primary);
}

.panel-header h3 {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin: 0;
}

.panel-controls {
  display: flex;
  gap: var(--space-2);
}

.compact-select {
  width: 140px;
}

.cert-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
}

.cert-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition-fast);
  border-left: 3px solid transparent;
}

.cert-item:hover {
  background: var(--bg-tertiary);
}

.cert-item.selected {
  background: var(--accent-muted);
  border-left-color: var(--color-brand-500);
}

.cert-status-indicator {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  margin-top: 4px;
  flex-shrink: 0;
}

.cert-item.valid .cert-status-indicator {
  background: var(--color-success-500);
}

.cert-item.expiring-soon .cert-status-indicator {
  background: var(--color-warning-500);
}

.cert-item.expired .cert-status-indicator {
  background: var(--color-error-500);
}

.cert-item.revoked .cert-status-indicator {
  background: var(--color-error-500);
  opacity: 0.6;
}

.cert-info {
  flex: 1;
  min-width: 0;
}

.cert-subject {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.cert-issuer {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.cert-validity {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
}

.cert-status-badge {
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  padding: 1px 6px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.cert-status-badge.valid {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

@media (prefers-color-scheme: dark) {
  .cert-status-badge.valid {
    background: var(--color-success-900);
    color: var(--color-success-300);
  }
}

.cert-status-badge.expiring-soon {
  background: var(--color-warning-100);
  color: var(--color-warning-700);
}

@media (prefers-color-scheme: dark) {
  .cert-status-badge.expiring-soon {
    background: var(--color-warning-900);
    color: var(--color-warning-300);
  }
}

.cert-status-badge.expired {
  background: var(--color-error-100);
  color: var(--color-error-700);
}

@media (prefers-color-scheme: dark) {
  .cert-status-badge.expired {
    background: var(--color-error-900);
    color: var(--color-error-300);
  }
}

.cert-status-badge.revoked {
  background: var(--color-error-100);
  color: var(--color-error-700);
}

@media (prefers-color-scheme: dark) {
  .cert-status-badge.revoked {
    background: var(--color-error-900);
    color: var(--color-error-300);
  }
}

.empty-state {
  padding: var(--space-6) var(--space-4);
  text-align: center;
  color: var(--fg-tertiary);
}

.empty-state svg {
  margin-bottom: var(--space-3);
}

/* Certificate Detail Panel */
.cert-detail-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.empty-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  text-align: center;
  color: var(--fg-tertiary);
  gap: var(--space-3);
}

.empty-detail h2 {
  margin: 0;
  font-size: var(--text-lg);
  color: var(--fg-secondary);
}

.empty-detail p {
  margin: 0;
  font-size: var(--text-sm);
}

.cert-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: var(--space-5);
}

/* Detail Header */
.detail-header {
  margin-bottom: var(--space-5);
}

.cert-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border-primary);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}

.cert-status-large {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  min-width: 180px;
  flex-shrink: 0;
}

.cert-status-large.valid {
  border-color: var(--color-success-500);
  background: var(--color-success-50);
}

@media (prefers-color-scheme: dark) {
  .cert-status-large.valid {
    background: var(--color-success-900);
    border-color: var(--color-success-500);
  }
}

.cert-status-large.expiring-soon {
  border-color: var(--color-warning-500);
  background: var(--color-warning-50);
}

@media (prefers-color-scheme: dark) {
  .cert-status-large.expiring-soon {
    background: var(--color-warning-900);
    border-color: var(--color-warning-500);
  }
}

.cert-status-large.expired {
  border-color: var(--color-error-500);
  background: var(--color-error-50);
}

@media (prefers-color-scheme: dark) {
  .cert-status-large.expired {
    background: var(--color-error-900);
    border-color: var(--color-error-500);
  }
}

.cert-status-large.revoked {
  border-color: var(--color-error-500);
  background: var(--color-error-50);
  opacity: 0.8;
}

@media (prefers-color-scheme: dark) {
  .cert-status-large.revoked {
    background: var(--color-error-900);
    border-color: var(--color-error-500);
  }
}

.status-icon {
  font-size: 28px;
}

.status-text {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--fg-secondary);
}

.cert-main-info {
  flex: 1;
  min-width: 0;
}

.cert-main-info h2 {
  margin: 0 0 var(--space-1);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cert-issuer {
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
  color: var(--fg-tertiary);
}

.validity-period {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--fg-secondary);
}

.expiry-warning {
  color: var(--color-warning-600);
  font-weight: var(--font-medium);
}

@media (prefers-color-scheme: dark) {
  .expiry-warning {
    color: var(--color-warning-400);
  }
}

.expired-badge {
  color: var(--color-error-600);
  font-weight: var(--font-bold);
}

@media (prefers-color-scheme: dark) {
  .expired-badge {
    color: var(--color-error-400);
  }
}

.header-actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

/* Tabs */
.detail-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-nav {
  display: flex;
  border-bottom: 1px solid var(--border-primary);
  gap: var(--space-1);
  padding: 0 var(--space-2);
  margin-bottom: var(--space-4);
  overflow-x: auto;
}

.tab-btn {
  padding: var(--space-2) var(--space-4);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--fg-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: var(--transition-fast);
  white-space: nowrap;
}

.tab-btn:hover {
  color: var(--fg-primary);
  background: var(--bg-tertiary);
}

.tab-btn.active {
  color: var(--color-brand-500);
  border-bottom-color: var(--color-brand-500);
}

.tab-content {
  flex: 1;
  overflow-y: auto;
}

.tab-panel {
  animation: fadeIn var(--duration-fast) var(--ease-out);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Dialog Description */
.dialog-description {
  color: var(--fg-secondary);
  font-size: var(--text-sm);
  margin-bottom: var(--space-4);
}

/* Export Options */
.export-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.option-group label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--fg-primary);
}

.option-hint {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  margin: 0;
}

/* HSTS Form */
.hsts-form {
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

.field-hint {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  margin: 0;
}

.form-warning {
  padding: var(--space-3);
  background: var(--color-warning-50);
  border: 1px solid var(--color-warning-200);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  color: var(--color-warning-700);
  line-height: var(--leading-relaxed);
}

@media (prefers-color-scheme: dark) {
  .form-warning {
    background: var(--color-warning-900);
    border-color: var(--color-warning-700);
    color: var(--color-warning-300);
  }
}

/* HSTS Manager Component */
.hsts-manager {
  padding: var(--space-4) 0;
}

.hsts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.hsts-header h3 {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.hsts-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.hsts-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  gap: var(--space-4);
}

.hsts-entry-info {
  flex: 1;
  min-width: 0;
}

.hsts-entry-domain {
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-1);
}

.hsts-entry-flags {
  display: flex;
  gap: var(--space-2);
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  flex-wrap: wrap;
}

.hsts-flag {
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  font-weight: var(--font-medium);
}

.hsts-flag.preload {
  background: var(--color-brand-100);
  color: var(--color-brand-700);
}

@media (prefers-color-scheme: dark) {
  .hsts-flag.preload {
    background: var(--color-brand-900);
    color: var(--color-brand-300);
  }
}

.hsts-entry-actions {
  display: flex;
  gap: var(--space-2);
}

.hsts-empty {
  text-align: center;
  padding: var(--space-8);
  color: var(--fg-tertiary);
}

.hsts-empty svg {
  margin-bottom: var(--space-3);
  opacity: 0.3;
}

/* Responsive */
@media (max-width: 1024px) {
  .cert-list-panel {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: var(--z-sidebar);
    transform: translateX(-100%);
    transition: transform var(--transition-normal);
  }
  
  .cert-list-panel.open {
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
  
  .cert-summary {
    flex-direction: column;
    align-items: stretch;
  }
  
  .cert-status-large {
    min-width: auto;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>