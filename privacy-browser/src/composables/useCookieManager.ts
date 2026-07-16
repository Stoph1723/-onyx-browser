import { ref, computed, watch, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';

export interface Cookie {
  id: string;
  name: string;
  value: string;
  domain: string;
  path: string;
  expiry: number; // Unix timestamp, 0 = session
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'Strict' | 'Lax' | 'None' | '';
  session: boolean;
  isThirdParty: boolean;
  size: number;
}

export interface DomainStats {
  cookieCount: number;
  thirdPartyCount: number;
  totalSize: number;
}

export interface CookieException {
  domain: string;
  allow: boolean;
  sessionOnly: boolean;
}

export function useCookieManager() {
  // State
  const cookies = ref<Cookie[]>([]);
  const domains = ref<string[]>([]);
  const domainStats = ref<Record<string, DomainStats>>({});
  const selectedDomain = ref<string>('');
  const searchQuery = ref('');
  const filterThirdParty = ref(false);
  const filterSessionOnly = ref(false);
  const filterSecureOnly = ref(false);
  const isLoading = ref(false);
  const selectedCookies = ref<Cookie[]>([]);
  
  // Settings
  const clearOnExit = ref(false);
  const blockThirdPartyCookies = ref(true);
  const cookieExceptions = ref<CookieException[]>([]);
  const autoRefresh = ref(false);
  const refreshInterval = ref(30);
  
  // Exception dialog
  const editingException = ref<CookieException>({ domain: '', allow: true, sessionOnly: false });
  
  // Computed
  const filteredCookies = computed(() => {
    let result = cookies.value;
    
    if (selectedDomain.value) {
      result = result.filter(c => c.domain === selectedDomain.value);
    }
    
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

  const loadCookies = async () => {
    isLoading.value = true;
    try {
      const [loadedCookies, loadedDomains, loadedStats] = await Promise.all([
        invoke<Cookie[]>('get_cookies', { domain: selectedDomain.value || null }),
        invoke<string[]>('get_cookie_domains'),
        invoke<Record<string, DomainStats>>('get_cookie_domain_stats'),
      ]);
      cookies.value = loadedCookies;
      domains.value = loadedDomains;
      domainStats.value = loadedStats;
    } catch (error) {
      console.error('Failed to load cookies:', error);
    } finally {
      isLoading.value = false;
    }
  };

  const deleteCookie = async (id: string) => {
    try {
      await invoke('delete_cookie', { id });
      await loadCookies();
    } catch (error) {
      console.error('Failed to delete cookie:', error);
    }
  };

  const deleteDomainCookies = async (domain: string) => {
    if (!confirm(`Delete all cookies for ${domain}?`)) return;
    try {
      await invoke('delete_domain_cookies', { domain });
      await loadCookies();
    } catch (error) {
      console.error('Failed to delete domain cookies:', error);
    }
  };

  const deleteSelectedCookies = async () => {
    if (selectedCookies.value.length === 0) return;
    if (!confirm(`Delete ${selectedCookies.value.length} selected cookies?`)) return;
    try {
      const ids = selectedCookies.value.map(c => c.id);
      await invoke('delete_cookies', { ids });
      selectedCookies.value = [];
      await loadCookies();
    } catch (error) {
      console.error('Failed to delete selected cookies:', error);
    }
  };

  const deleteAllCookies = async () => {
    if (cookies.value.length === 0) return;
    if (!confirm('Delete ALL cookies? This cannot be undone.')) return;
    try {
      await invoke('delete_all_cookies');
      await loadCookies();
    } catch (error) {
      console.error('Failed to delete all cookies:', error);
    }
  };

  const setClearOnExit = async (enabled: boolean) => {
    clearOnExit.value = enabled;
    try {
      await invoke('set_cookie_clear_on_exit', { enabled });
    } catch (error) {
      console.error('Failed to set clear on exit:', error);
    }
  };

  const setBlockThirdPartyCookies = async (enabled: boolean) => {
    blockThirdPartyCookies.value = enabled;
    try {
      await invoke('set_block_third_party_cookies', { enabled });
    } catch (error) {
      console.error('Failed to set block third party cookies:', error);
    }
  };

  const addException = async (domain: string, allow: boolean, sessionOnly: boolean) => {
    try {
      await invoke('add_cookie_exception', { domain, allow, sessionOnly });
      await loadExceptions();
    } catch (error) {
      console.error('Failed to add exception:', error);
    }
  };

  const removeException = async (index: number) => {
    try {
      const exception = cookieExceptions.value[index];
      await invoke('remove_cookie_exception', { domain: exception.domain });
      await loadExceptions();
    } catch (error) {
      console.error('Failed to remove exception:', error);
    }
  };

  const loadExceptions = async () => {
    try {
      cookieExceptions.value = await invoke<CookieException[]>('get_cookie_exceptions');
    } catch (error) {
      console.error('Failed to load exceptions:', error);
    }
  };

  const setAutoRefresh = async (enabled: boolean) => {
    autoRefresh.value = enabled;
    try {
      await invoke('set_cookie_auto_refresh', { enabled });
    } catch (error) {
      console.error('Failed to set auto refresh:', error);
    }
  };

  const setRefreshInterval = async (seconds: number) => {
    refreshInterval.value = seconds;
    try {
      await invoke('set_cookie_refresh_interval', { seconds });
    } catch (error) {
      console.error('Failed to set refresh interval:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const [clear, block, exceptions, auto, interval] = await Promise.all([
        invoke<boolean>('get_cookie_clear_on_exit'),
        invoke<boolean>('get_block_third_party_cookies'),
        invoke<CookieException[]>('get_cookie_exceptions'),
        invoke<boolean>('get_cookie_auto_refresh'),
        invoke<number>('get_cookie_refresh_interval'),
      ]);
      clearOnExit.value = clear;
      blockThirdPartyCookies.value = block;
      cookieExceptions.value = exceptions;
      autoRefresh.value = auto;
      refreshInterval.value = interval;
    } catch (error) {
      console.error('Failed to load cookie settings:', error);
    }
  };

  onMounted(async () => {
    await loadSettings();
    await loadExceptions();
    await loadCookies();
  });

  return {
    // State
    cookies,
    domains,
    domainStats,
    selectedDomain,
    searchQuery,
    filterThirdParty,
    filterSessionOnly,
    filterSecureOnly,
    isLoading,
    selectedCookies,
    clearOnExit,
    blockThirdPartyCookies,
    cookieExceptions,
    autoRefresh,
    refreshInterval,
    editingException,
    
    // Methods
    loadCookies,
    deleteCookie,
    deleteDomainCookies,
    deleteSelectedCookies,
    deleteAllCookies,
    setClearOnExit,
    setBlockThirdPartyCookies,
    addException,
    removeException,
    setAutoRefresh,
    setRefreshInterval,
    loadSettings,
    loadExceptions,
    
    // Computed
    filteredCookies,
  };
}