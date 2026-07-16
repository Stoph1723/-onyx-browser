<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  cert: any;
}

const props = defineProps<Props>();

const cert = computed(() => props.cert);

const getExtensionName = (oid: string) => {
  const names: Record<string, string> = {
    '2.5.29.14': 'Subject Key Identifier',
    '2.5.29.35': 'Authority Key Identifier',
    '2.5.29.19': 'Basic Constraints',
    '2.5.29.15': 'Key Usage',
    '2.5.29.37': 'Extended Key Usage',
    '2.5.29.17': 'Subject Alternative Name',
    '2.5.29.32': 'Certificate Policies',
    '2.5.29.31': 'CRL Distribution Points',
    '1.3.6.1.5.5.7.1.1': 'Authority Information Access',
    '1.3.6.1.5.5.7.1.11': 'Subject Information Access',
    '2.5.29.30': 'Name Constraints',
    '2.5.29.36': 'Policy Constraints',
    '2.5.29.54': 'Inhibit Any Policy',
    '1.3.6.1.5.5.7.1.24': 'TLS Feature',
    '1.3.6.1.4.1.11129.2.4.2': 'SCT List (Certificate Transparency)',
    '1.3.6.1.4.1.11129.2.4.3': 'Precertificate SCT List',
  };
  return names[oid] || oid;
};

const getCriticalLabel = (critical: boolean) => critical ? 'Critical' : 'Non-critical';

const formatExtensionValue = (ext: any) => {
  if (typeof ext.parsedValue === 'object') {
    return JSON.stringify(ext.parsedValue, null, 2);
  }
  return ext.value || 'N/A';
};
</script>

<template>
  <div class="cert-extensions">
    <div class="extensions-header">
      <h3>Extensions ({{ cert.extensions?.length || 0 }})</h3>
      <div class="extension-stats">
        <span class="stat critical">{{ criticalCount }} critical</span>
        <span class="stat non-critical">{{ nonCriticalCount }} non-critical</span>
      </div>
    </div>

    <div v-if="cert.extensions && cert.extensions.length > 0" class="extensions-list">
      <div
        v-for="ext in cert.extensions"
        :key="ext.oid"
        class="extension-item"
        :class="{ critical: ext.critical }"
      >
        <div class="extension-header">
          <div class="extension-title">
            <span class="ext-name">{{ getExtensionName(ext.oid) }}</span>
            <span class="ext-oid">{{ ext.oid }}</span>
            <span class="ext-critical" :class="{ 'is-critical': ext.critical }">
              {{ getCriticalLabel(ext.critical) }}
            </span>
          </div>
        </div>
        
        <div class="extension-value" v-if="ext.parsedValue">
          <pre class="extension-json">{{ formatExtensionValue(ext) }}</pre>
        </div>
        
        <div class="extension-value" v-else>
          <pre class="extension-text">{{ ext.value }}</pre>
        </div>
      </div>
    </div>

    <div v-else class="empty-extensions">
      <p>No extensions found</p>
    </div>
  </div>
</template>

<script>
const getDaysUntilExpiry = (notAfter: string) => Math.ceil((new Date(notAfter).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
</script>

<style scoped>
.cert-extensions {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
  max-height: 70vh;
  overflow-y: auto;
}

.extensions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border-primary);
}

.extensions-header h3 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--fg-secondary);
}

.extension-stats {
  display: flex;
  gap: var(--space-3);
}

.stat {
  font-size: var(--text-xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-weight: var(--font-medium);
}

.stat.critical {
  background: var(--color-error-100);
  color: var(--color-error-700);
}

@media (prefers-color-scheme: dark) {
  .stat.critical {
    background: var(--color-error-900);
    color: var(--color-error-300);
  }
}

.stat.non-critical {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

@media (prefers-color-scheme: dark) {
  .stat.non-critical {
    background: var(--color-success-900);
    color: var(--color-success-300);
  }
}

.extensions-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.extension-item {
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
  overflow: hidden;
}

.extension-item.critical {
  border-left: 3px solid var(--color-error-500);
}

.extension-header {
  padding: var(--space-3) var(--space-4);
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
}

.extension-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.ext-name {
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  color: var(--fg-primary);
}

.ext-oid {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  background: var(--bg-primary);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.ext-critical {
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  padding: 1px 6px;
  border-radius: var(--radius-full);
  text-transform: uppercase;
}

.ext-critical.is-critical {
  background: var(--color-error-100);
  color: var(--color-error-700);
}

@media (prefers-color-scheme: dark) {
  .ext-critical.is-critical {
    background: var(--color-error-900);
    color: var(--color-error-300);
  }
}

.ext-critical:not(.is-critical) {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

@media (prefers-color-scheme: dark) {
  .ext-critical:not(.is-critical) {
    background: var(--color-success-900);
    color: var(--color-success-300);
  }
}

.extension-value {
  padding: var(--space-3) var(--space-4);
  max-height: 300px;
  overflow-y: auto;
}

.extension-json {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.extension-text {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--fg-secondary);
}

@media (max-width: 600px) {
  .extension-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }
}
</style>