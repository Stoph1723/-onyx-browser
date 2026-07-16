<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  cert: any;
}

const props = defineProps<Props>();

const cert = computed(() => props.cert);

const getSubjectFields = (subject: string) => {
  const fields: Record<string, string> = {};
  const parts = subject.split(',');
  for (const part of parts) {
    const [key, value] = part.trim().split('=');
    if (key && value) fields[key] = value;
  }
  return fields;
};

const getIssuerFields = (issuer: string) => {
  const fields: Record<string, string> = {};
  const parts = issuer.split(',');
  for (const part of parts) {
    const [key, value] = part.trim().split('=');
    if (key && value) fields[key] = value;
  }
  return fields;
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString();
};

const getDaysUntilExpiry = (notAfter: string) => {
  const diff = new Date(notAfter).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};
</script>

<template>
  <div class="cert-general">
    <div class="section">
      <h3>Subject</h3>
      <dl class="info-grid">
        <template v-for="(value, key) in getSubjectFields(cert.subject)" :key="key">
          <dt>{{ key }}</dt>
          <dd>{{ value }}</dd>
        </template>
      </dl>
    </div>

    <div class="section">
      <h3>Issuer</h3>
      <dl class="info-grid">
        <template v-for="(value, key) in getIssuerFields(cert.issuer)" :key="key">
          <dt>{{ key }}</dt>
          <dd>{{ value }}</dd>
        </template>
      </dl>
    </div>

    <div class="section">
      <h3>Validity</h3>
      <dl class="info-grid">
        <dt>Not Before</dt>
        <dd>{{ formatDate(cert.notBefore) }}</dd>
        <dt>Not After</dt>
        <dd class="expiry-date">
          {{ formatDate(cert.notAfter) }}
          <span class="days-remaining" :class="{ warning: getDaysUntilExpiry(cert.notAfter) <= 30, expired: getDaysUntilExpiry(cert.notAfter) <= 0 }">
            ({{ getDaysUntilExpiry(cert.notAfter) > 0 ? getDaysUntilExpiry(cert.notAfter) + ' days remaining' : 'EXPIRED' }})
          </span>
        </dd>
      </dl>
    </div>

    <div class="section">
      <h3>Certificate Details</h3>
      <dl class="info-grid">
        <dt>Version</dt>
        <dd>v{{ cert.version || 3 }}</dd>
        <dt>Serial Number</dt>
        <dd class="serial-number">{{ cert.serialNumber }}</dd>
        <dt>Signature Algorithm</dt>
        <dd>{{ cert.signatureAlgorithm }}</dd>
        <dt>Public Key Algorithm</dt>
        <dd>{{ cert.publicKeyAlgorithm }}</dd>
        <dt>Public Key Size</dt>
        <dd>{{ cert.publicKeySize }} bits</dd>
        <dt>Fingerprint (SHA-256)</dt>
        <dd class="fingerprint">{{ cert.fingerprint }}</dd>
        <dt>Fingerprint (SHA-1)</dt>
        <dd class="fingerprint">{{ cert.fingerprintSha1 }}</dd>
      </dl>
    </div>

    <div class="section">
      <h3>Status</h3>
      <dl class="info-grid">
        <dt>Revoked</dt>
        <dd :class="{ revoked: cert.revoked }">{{ cert.revoked ? 'Yes' : 'No' }}</dd>
        <template v-if="cert.revoked">
          <dt>Revocation Date</dt>
          <dd>{{ formatDate(cert.revocationDate) }}</dd>
          <dt>Revocation Reason</dt>
          <dd>{{ cert.revocationReason }}</dd>
        </template>
      </dl>
    </div>
  </div>
</template>

<script>
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString();
</script>

<style scoped>
.cert-general {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding: var(--space-4);
  max-height: 70vh;
  overflow-y: auto;
}

.section {
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  background: var(--bg-secondary);
}

.section h3 {
  margin: 0 0 var(--space-3);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--fg-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-grid {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: var(--space-2) var(--space-4);
  margin: 0;
}

.info-grid dt {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  font-weight: var(--font-medium);
}

.info-grid dd {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--fg-primary);
  word-break: break-all;
}

.serial-number,
.fingerprint {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background: var(--bg-tertiary);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  display: inline-block;
  width: 100%;
}

.expiry-date {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.days-remaining {
  font-size: var(--text-xs);
  color: var(--color-warning-500);
  font-weight: var(--font-medium);
}

.days-remaining.expired {
  color: var(--color-error-500);
}

.days-remaining.warning {
  color: var(--color-warning-500);
}

@media (max-width: 600px) {
  .info-grid {
    grid-template-columns: 1fr;
    gap: var(--space-1) var(--space-2);
  }
  
  .info-grid dt {
    margin-bottom: 2px;
  }
}
</style>