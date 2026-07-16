<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  cert: any;
}

const props = defineProps<Props>();

const cert = computed(() => props.cert);

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString();

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
</script>

<template>
  <div class="cert-details">
    <div class="section">
      <h3>Subject Details</h3>
      <dl class="info-grid">
        <template v-for="(value, key) in getSubjectFields(cert.subject)" :key="key">
          <dt>{{ key }}</dt>
          <dd>{{ value }}</dd>
        </template>
      </dl>
    </div>

    <div class="section">
      <h3>Issuer Details</h3>
      <dl class="info-grid">
        <template v-for="(value, key) in getIssuerFields(cert.issuer)" :key="key">
          <dt>{{ key }}</dt>
          <dd>{{ value }}</dd>
        </template>
      </dl>
    </div>

    <div class="section">
      <h3>Validity Period</h3>
      <dl class="info-grid">
        <dt>Not Before</dt>
        <dd>{{ formatDate(cert.notBefore) }}</dd>
        <dt>Not After</dt>
        <dd>{{ formatDate(cert.notAfter) }}</dd>
        <dt>Days Until Expiry</dt>
        <dd :class="{ expired: getDaysUntilExpiry(cert.notAfter) <= 0, warning: getDaysUntilExpiry(cert.notAfter) <= 30 }">
          {{ getDaysUntilExpiry(cert.notAfter) > 0 ? getDaysUntilExpiry(cert.notAfter) + ' days' : 'EXPIRED' }}
        </dd>
      </dl>
    </div>

    <div class="section">
      <h3>Public Key Info</h3>
      <dl class="info-grid">
        <dt>Algorithm</dt>
        <dd>{{ cert.publicKeyAlgorithm }}</dd>
        <dt>Key Size</dt>
        <dd>{{ cert.publicKeySize }} bits</dd>
        <dt>Key Usage</dt>
        <dd>{{ cert.keyUsage?.join(', ') || 'N/A' }}</dd>
        <dt>Extended Key Usage</dt>
        <dd>{{ cert.extendedKeyUsage?.join(', ') || 'N/A' }}</dd>
      </dl>
    </div>

    <div class="section">
      <h3>Signature</h3>
      <dl class="info-grid">
        <dt>Algorithm</dt>
        <dd>{{ cert.signatureAlgorithm }}</dd>
        <dt>Signature Value</dt>
        <dd class="fingerprint">{{ cert.signatureValue }}</dd>
      </dl>
    </div>

    <div class="section">
      <h3>Subject Alternative Names</h3>
      <div v-if="cert.subjectAltNames && cert.subjectAltNames.length > 0">
        <ul class="san-list">
          <li v-for="san in cert.subjectAltNames" :key="san">{{ san }}</li>
        </ul>
      </div>
      <p v-else class="empty-text">No Subject Alternative Names</p>
    </div>

    <div class="section">
      <h3>Certificate Policies</h3>
      <div v-if="cert.certificatePolicies && cert.certificatePolicies.length > 0">
        <ul class="policy-list">
          <li v-for="policy in cert.certificatePolicies" :key="policy.oid">
            <span class="policy-oid">{{ policy.oid }}</span>
            <span v-if="policy.url" class="policy-url"><a :href="policy.url" target="_blank">{{ policy.url }}</a></span>
          </li>
        </ul>
      </div>
      <p v-else class="empty-text">No certificate policies</p>
    </div>

    <div class="section">
      <h3>CRL Distribution Points</h3>
      <div v-if="cert.crlDistributionPoints && cert.crlDistributionPoints.length > 0">
        <ul class="crl-list">
          <li v-for="crl in cert.crlDistributionPoints" :key="crl">{{ crl }}</li>
        </ul>
      </div>
      <p v-else class="empty-text">No CRL distribution points</p>
    </div>

    <div class="section">
      <h3>Authority Information Access</h3>
      <div v-if="cert.authorityInfoAccess && cert.authorityInfoAccess.length > 0">
        <ul class="aia-list">
          <li v-for="aia in cert.authorityInfoAccess" :key="aia.accessMethod">
            <span class="aia-method">{{ aia.accessMethod }}</span>
            <span class="aia-url"><a :href="aia.accessLocation" target="_blank">{{ aia.accessLocation }}</a></span>
          </li>
        </ul>
      </div>
      <p v-else class="empty-text">No AIA entries</p>
    </div>
  </div>
</template>

<script>
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString();
const getDaysUntilExpiry = (notAfter: string) => Math.ceil((new Date(notAfter).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
</script>

<style scoped>
.cert-details {
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
  grid-template-columns: 160px 1fr;
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

.fingerprint {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background: var(--bg-tertiary);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  display: inline-block;
  width: 100%;
}

.san-list, .policy-list, .crl-list, .aia-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.san-list li, .crl-list li {
  font-size: var(--text-sm);
  color: var(--fg-primary);
  word-break: break-all;
}

.policy-list li {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.policy-oid {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--fg-secondary);
}

.policy-url a {
  color: var(--color-brand-500);
  text-decoration: none;
}

.policy-url a:hover {
  text-decoration: underline;
}

.aia-list li {
  display: flex;
  gap: var(--space-2);
  font-size: var(--text-sm);
}

.aia-method {
  font-weight: var(--font-medium);
  color: var(--fg-secondary);
  min-width: 120px;
}

.aia-url a {
  color: var(--color-brand-500);
  text-decoration: none;
}

.aia-url a:hover {
  text-decoration: underline;
}

.empty-text {
  color: var(--fg-tertiary);
  font-size: var(--text-sm);
  font-style: italic;
  margin: 0;
}

@media (max-width: 600px) {
  .info-grid dt,
  .info-grid dd {
    grid-column: 1 / -1;
  }
  
  .info-grid dt {
    margin-bottom: 2px;
  }
}
</style>