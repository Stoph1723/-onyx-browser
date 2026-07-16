import { ref, computed, onMounted, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';

export interface Certificate {
  fingerprint: string;
  subject: string;
  issuer: string;
  serialNumber: string;
  notBefore: string;
  notAfter: string;
  version: number;
  signatureAlgorithm: string;
  publicKeyAlgorithm: string;
  publicKeySize: number;
  revoked: boolean;
  revocationReason?: string;
  revocationDate?: string;
  extensions: CertificateExtension[];
  pem: string;
  der: Uint8Array;
}

export interface CertificateExtension {
  oid: string;
  name: string;
  critical: boolean;
  value: string;
  parsedValue?: any;
}

export interface CertificateChain {
  certificates: Certificate[];
  verified: boolean;
  trustPath: string[];
  errors: string[];
}

export interface CTLogEntry {
  logId: string;
  logName: string;
  timestamp: string;
  entryType: string;
  certificate: Certificate;
}

export interface HSTSEntry {
  domain: string;
  includeSubdomains: boolean;
  maxAge: number;
  preload: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface HSTSPreloadEntry {
  domain: string;
  includeSubdomains: boolean;
  policy: 'force-https' | 'preload' | 'both';
}

export function useCertificateViewer() {
  const certificates = ref<Certificate[]>([]);
  const selectedCertificate = ref<Certificate | null>(null);
  const selectedCertDetail = ref<any>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  
  const hstsEntries = ref<HSTSEntry[]>([]);
  const hstsPreloadList = ref<HSTSPreloadEntry[]>([]);
  const hstsIncludeSubdomains = ref(true);
  const hstsMaxAge = ref(31536000);
  const hstsPreload = ref(false);

  const loadCertificates = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      certificates.value = await invoke<Certificate[]>('get_certificates');
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load certificates';
      console.error('Failed to load certificates:', err);
    } finally {
      isLoading.value = false;
    }
  };

  const loadCertificateDetail = async (fingerprint: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      selectedCertDetail.value = await invoke('get_certificate_detail', { fingerprint });
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load certificate detail';
      console.error('Failed to load certificate detail:', err);
    } finally {
      isLoading.value = false;
    }
  };

  const verifyCertificate = async (fingerprint: string) => {
    try {
      return await invoke<{
        valid: boolean;
        trustPath: string[];
        errors: string[];
        details: string[];
      }>('verify_certificate', { fingerprint });
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Verification failed';
      console.error('Verification failed:', err);
      return { valid: false, trustPath: [], errors: ['Verification failed'], details: [] };
    }
  };

  const exportCertificate = async (fingerprint: string, format: 'pem' | 'der', password?: string) => {
    return await invoke<Uint8Array>('export_certificate', { fingerprint, format, password });
  };

  const loadHSTS = async () => {
    try {
      hstsEntries.value = await invoke<HSTSEntry[]>('get_hsts_entries');
      hstsPreloadList.value = await invoke<HSTSPreloadEntry[]>('get_hsts_preload_list');
    } catch (err) {
      console.error('Failed to load HSTS:', err);
    }
  };

  const addHSTSEntry = async (entry: { domain: string; includeSubdomains: boolean; maxAge: number; preload: boolean }) => {
    await invoke('add_hsts_entry', entry);
  };

  const removeHSTSEntry = async (domain: string) => {
    await invoke('remove_hsts_entry', { domain });
  };

  const clearHSTSCache = async () => {
    await invoke('clear_hsts_cache');
  };

  return {
    certificates,
    selectedCertificate,
    selectedCertDetail,
    isLoading,
    error,
    hstsEntries,
    hstsPreloadList,
    hstsIncludeSubdomains,
    hstsMaxAge,
    hstsPreload,
    loadCertificates,
    loadCertificateDetail,
    verifyCertificate,
    exportCertificate,
    loadHSTS,
    addHSTSEntry,
    removeHSTSEntry,
    clearHSTSCache,
  };
}