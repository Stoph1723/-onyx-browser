import { ref, computed, watch, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';

export interface PasswordEntry {
  id: string;
  title: string;
  username?: string;
  email?: string;
  password: string;
  url?: string;
  notes?: string;
  category: string;
  favorite: boolean;
  totpSecret?: string;
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
}

export interface CreditCardEntry {
  id: string;
  name: string;
  cardholderName: string;
  number: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  cardType: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IdentityEntry {
  id: string;
  name: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  company?: string;
  jobTitle?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecureNoteEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PasswordStrength {
  score: number;
  strength: 'VeryWeak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  feedback: string[];
}

export interface GeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

export function usePasswordManager() {
  // State
  const isLocked = ref(true);
  const isInitialized = ref(false);
  const passwords = ref<PasswordEntry[]>([]);
  const creditCards = ref<CreditCardEntry[]>([]);
  const identities = ref<IdentityEntry[]>([]);
  const secureNotes = ref<SecureNoteEntry[]>([]);
  const categories = ref<string[]>(['General', 'Finance', 'Shopping', 'Social', 'Work', 'Personal', 'Entertainment', 'Security', 'Health', 'Travel']);
  
  // UI State
  const searchQuery = ref('');
  const activeCategory = ref('all');
  const activeTab = ref<'passwords' | 'creditCards' | 'identities' | 'secureNotes'>('passwords');
  const showGenerator = ref(false);
  const generatorOptions = ref<GeneratorOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });
  const generatedPassword = ref('');
  const strength = ref<PasswordStrength | null>(null);
  const masterPassword = ref('');
  const autoLockTimeout = ref(15);
  
  // Dialogs
  const importData = ref('');
  const exportData = ref('');
  const importMasterPassword = ref('');
  const exportMasterPassword = ref('');
  const currentMasterPassword = ref('');
  const newMasterPassword = ref('');
  const confirmNewMasterPassword = ref('');
  
  // Editing
  const editingEntry = ref<any>(null);
  const editingType = ref<'password' | 'creditCard' | 'identity' | 'secureNote'>('password');
  const showEntryDialog = ref(false);
  const showGeneratorDialog = ref(false);
  const showImportDialog = ref(false);
  const showExportDialog = ref(false);
  const showSettingsDialog = ref(false);
  const settingsActiveTab = ref<'security' | 'import-export' | 'advanced'>('security');
  const biometricEnabled = ref(false);

  // Check vault status on mount
  onMounted(async () => {
    await checkVaultStatus();
    if (!isInitialized.value) {
      // Show create vault dialog
    } else {
      // Show unlock dialog
    }
  });

  const checkVaultStatus = async () => {
    try {
      const initialized = await invoke<boolean>('pm_is_initialized');
      isInitialized.value = initialized;
      
      if (initialized) {
        const locked = await invoke<boolean>('pm_is_vault_locked');
        isLocked.value = locked;
      }
    } catch (error) {
      console.error('Failed to check vault status:', error);
    }
  };

  const unlockVault = async (password: string) => {
    await invoke('pm_unlock_vault', { masterPassword: password });
    isLocked.value = false;
  };

  const lockVault = async () => {
    await invoke('pm_lock_vault');
    isLocked.value = true;
    passwords.value = [];
    creditCards.value = [];
    identities.value = [];
    secureNotes.value = [];
  };

  const initializeVault = async (password: string) => {
    await invoke('pm_initialize_vault', { masterPassword: password });
    isInitialized.value = true;
    isLocked.value = false;
  };

  const changeMasterPassword = async (current: string, newPassword: string) => {
    await invoke('pm_change_master_password', { current, new: newPassword });
  };

  const setAutoLockTimeout = async (minutes: number) => {
    await invoke('pm_set_auto_lock_timeout', { minutes });
    autoLockTimeout.value = minutes;
  };

  const loadData = async () => {
    try {
      const [pwds, cards, ids, notes] = await Promise.all([
        invoke<PasswordEntry[]>('pm_get_passwords'),
        invoke<CreditCardEntry[]>('pm_get_credit_cards'),
        invoke<IdentityEntry[]>('pm_get_identities'),
        invoke<SecureNoteEntry[]>('pm_get_secure_notes'),
      ]);
      passwords.value = pwds;
      creditCards.value = cards;
      identities.value = ids;
      secureNotes.value = notes;
      
      // Extract unique categories
      const allCategories = new Set<string>(['General']);
      [...pwds, ...cards, ...ids, ...notes].forEach(item => {
        if (item.category) allCategories.add(item.category);
      });
      categories.value = Array.from(allCategories).sort();
    } catch (error) {
      console.error('Failed to load vault data:', error);
    }
  };

  // Password CRUD
  const addPassword = async (entry: PasswordEntry) => {
    await invoke('pm_add_password', { entry });
    await loadData();
  };

  const updatePassword = async (entry: PasswordEntry) => {
    await invoke('pm_update_password', { entry });
    await loadData();
  };

  const deletePassword = async (id: string) => {
    await invoke('pm_delete_password', { id });
    await loadData();
  };

  // Credit Card CRUD
  const addCreditCard = async (entry: CreditCardEntry) => {
    await invoke('pm_add_credit_card', { entry });
    await loadData();
  };

  const deleteCreditCard = async (id: string) => {
    await invoke('pm_delete_credit_card', { id });
    await loadData();
  };

  // Identity CRUD
  const addIdentity = async (entry: IdentityEntry) => {
    await invoke('pm_add_identity', { entry });
    await loadData();
  };

  const deleteIdentity = async (id: string) => {
    await invoke('pm_delete_identity', { id });
    await loadData();
  };

  // Secure Note CRUD
  const addSecureNote = async (entry: SecureNoteEntry) => {
    await invoke('pm_add_secure_note', { entry });
    await loadData();
  };

  const deleteSecureNote = async (id: string) => {
    await invoke('pm_delete_secure_note', { id });
    await loadData();
  };

  // Toggle Favorite
  const toggleFavorite = async (type: string, id: string) => {
    // This would update the entry in place
    // For now just reload
    await loadData();
  };

  // Generator
  const generatePassword = async (
    length: number,
    uppercase: boolean,
    lowercase: boolean,
    numbers: boolean,
    symbols: boolean
  ): Promise<string> => {
    return await invoke('pm_generate_password', {
      length,
      include_uppercase: uppercase,
      include_lowercase: lowercase,
      include_numbers: numbers,
      include_symbols: symbols,
    });
  };

  const checkPasswordStrength = async (password: string): Promise<PasswordStrength> => {
    return await invoke('pm_check_password_strength', { password });
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const exportVault = async (masterPassword: string): Promise<string> => {
    return await invoke('pm_export_vault', { masterPassword });
  };

  const importVault = async (masterPassword: string, data: string) => {
    await invoke('pm_import_vault', { masterPassword, data });
  };

  // Computed
  const activeEntries = computed(() => {
    let entries: any[] = [];
    switch (activeTab.value) {
      case 'passwords':
        entries = passwords.value;
        break;
      case 'creditCards':
        entries = creditCards.value;
        break;
      case 'identities':
        entries = identities.value;
        break;
      case 'secureNotes':
        entries = secureNotes.value;
        break;
    }
    
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      entries = entries.filter(e => 
        e.title?.toLowerCase().includes(q) ||
        e.username?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.url?.toLowerCase().includes(q) ||
        e.notes?.toLowerCase().includes(q) ||
        e.name?.toLowerCase().includes(q) ||
        e.cardholderName?.toLowerCase().includes(q) ||
        e.firstName?.toLowerCase().includes(q) ||
        e.lastName?.toLowerCase().includes(q) ||
        e.company?.toLowerCase().includes(q)
      );
    }
    
    if (activeCategory.value !== 'all') {
      entries = entries.filter(e => e.category === activeCategory.value);
    }
    
    return entries.sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt);
    });
  });

  return {
    // State
    isLocked,
    isInitialized,
    passwords,
    creditCards,
    identities,
    secureNotes,
    categories,
    searchQuery,
    activeCategory,
    activeTab,
    showGenerator,
    generatorOptions,
    generatedPassword,
    strength,
    masterPassword,
    autoLockTimeout,
    importData,
    exportData,
    importMasterPassword,
    exportMasterPassword,
    currentMasterPassword,
    newMasterPassword,
    confirmNewMasterPassword,
    editingEntry,
    editingType,
    showEntryDialog,
    showGeneratorDialog,
    showImportDialog,
    showExportDialog,
    showSettingsDialog,
    settingsActiveTab,
    biometricEnabled,
    
    // Methods
    unlockVault,
    lockVault,
    initializeVault,
    changeMasterPassword,
    setAutoLockTimeout,
    loadData,
    addPassword,
    updatePassword,
    deletePassword,
    addCreditCard,
    deleteCreditCard,
    addIdentity,
    deleteIdentity,
    addSecureNote,
    deleteSecureNote,
    toggleFavorite,
    generatePassword,
    checkPasswordStrength,
    copyToClipboard,
    exportVault,
    importVault,
    
    // Computed
    activeEntries,
  };
}