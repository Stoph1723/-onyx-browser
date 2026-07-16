<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { usePasswordManager } from '../composables/usePasswordManager';
import Button from './ui/Button.vue';
import Input from './ui/Input.vue';
import Switch from './ui/Switch.vue';
import Select from './ui/Select.vue';
import Dialog from './ui/Dialog.vue';

const { 
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
  unlockVault,
  lockVault,
  initializeVault,
  changeMasterPassword,
  setAutoLockTimeout,
  addPassword,
  updatePassword,
  deletePassword,
  addCreditCard,
  deleteCreditCard,
  addIdentity,
  deleteIdentity,
  addSecureNote,
  deleteSecureNote,
  generatePassword,
  checkPasswordStrength,
  copyToClipboard,
  exportVault,
  importVault,
  toggleFavorite,
  loadData 
} = usePasswordManager();

const showUnlockDialog = ref(true);
const showCreateDialog = ref(false);
const showGeneratorDialog = ref(false);
const showImportDialog = ref(false);
const showExportDialog = ref(false);
const showSettingsDialog = ref(false);
const showEntryDialog = ref(false);
const editingEntry = ref<any>(null);
const editingType = ref<'password' | 'creditCard' | 'identity' | 'secureNote'>('password');
const importData = ref('');
const exportData = ref('');
const autoLockTimeout = ref(15);
const importMasterPassword = ref('');
const exportMasterPassword = ref('');
const currentMasterPassword = ref('');
const newMasterPassword = ref('');
const confirmNewMasterPassword = ref('');

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

const categoryCounts = computed(() => {
  const counts: Record<string, number> = { all: 0 };
  ['passwords', 'creditCards', 'identities', 'secureNotes'].forEach(type => {
    const entries = (passwords.value as any) || [];
    entries.forEach((e: any) => {
      counts.all++;
      const cat = e.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
  });
  return counts;
});

const tabs = [
  { id: 'passwords', label: 'Passwords', icon: 'key' },
  { id: 'creditCards', label: 'Credit Cards', icon: 'credit-card' },
  { id: 'identities', label: 'Identities', icon: 'user' },
  { id: 'secureNotes', label: 'Secure Notes', icon: 'file-text' },
];

const categoryOptions = computed(() => [
  { value: 'all', label: `All (${categoryCounts.value.all || 0})` },
  ...Object.entries(categoryCounts.value)
    .filter(([k]) => k !== 'all')
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, label: `${value} (${count})` }))
]);

const openEntryDialog = (type: typeof editingType.value, entry?: any) => {
  editingType.value = type;
  editingEntry.value = entry ? { ...entry } : getEmptyEntry(type);
  showEntryDialog.value = true;
};

const getEmptyEntry = (type: typeof editingType.value) => {
  const base = {
    id: '',
    title: '',
    category: 'General',
    favorite: false,
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  switch (type) {
    case 'password':
      return { ...base, username: '', email: '', password: '', url: '', totpSecret: '' };
    case 'creditCard':
      return { ...base, name: '', cardholderName: '', number: '', expiryMonth: 1, expiryYear: new Date().getFullYear() + 3, cvv: '', cardType: '' };
    case 'identity':
      return { ...base, name: '', firstName: '', middleName: '', lastName: '', email: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: '', company: '', jobTitle: '' };
    case 'secureNote':
      return { ...base, content: '' };
  }
};

const saveEntry = async () => {
  if (!editingEntry.value) return;
  
  editingEntry.value.updatedAt = new Date().toISOString();
  if (!editingEntry.value.id) {
    editingEntry.value.id = crypto.randomUUID();
    editingEntry.value.createdAt = new Date().toISOString();
  }
  
  try {
    switch (editingType.value) {
      case 'password':
        if (editingEntry.value.id && passwords.value.find(p => p.id === editingEntry.value.id)) {
          await updatePassword(editingEntry.value);
        } else {
          await addPassword(editingEntry.value);
        }
        break;
      case 'creditCard':
        await addCreditCard(editingEntry.value);
        break;
      case 'identity':
        await addIdentity(editingEntry.value);
        break;
      case 'secureNote':
        await addSecureNote(editingEntry.value);
        break;
    }
    showEntryDialog.value = false;
    editingEntry.value = null;
  } catch (error) {
    console.error('Failed to save entry:', error);
  }
};

const deleteEntry = async (type: typeof editingType.value, id: string) => {
  if (!confirm('Are you sure you want to delete this item?')) return;
  
  try {
    switch (type) {
      case 'password':
        await deletePassword(id);
        break;
      case 'creditCard':
        await deleteCreditCard(id);
        break;
      case 'identity':
        await deleteIdentity(id);
        break;
      case 'secureNote':
        await deleteSecureNote(id);
        break;
    }
  } catch (error) {
    console.error('Failed to delete entry:', error);
  }
};

const handleGeneratePassword = async () => {
  const pwd = await generatePassword(
    generatorOptions.value.length,
    generatorOptions.value.uppercase,
    generatorOptions.value.lowercase,
    generatorOptions.value.numbers,
    generatorOptions.value.symbols
  );
  generatedPassword.value = pwd;
  const str = await checkPasswordStrength(pwd);
  strength.value = str;
};

const copyGeneratedPassword = async () => {
  await copyToClipboard(generatedPassword.value);
  generatedPassword.value = '';
};

const handleUnlock = async () => {
  try {
    await unlockVault(masterPassword.value);
    showUnlockDialog.value = false;
    masterPassword.value = '';
    await loadData();
  } catch (error) {
    alert('Invalid master password');
  }
};

const handleInitialize = async () => {
  if (masterPassword.value.length < 8) {
    alert('Master password must be at least 8 characters');
    return;
  }
  try {
    await initializeVault(masterPassword.value);
    showCreateDialog.value = false;
    showUnlockDialog.value = false;
    masterPassword.value = '';
    await loadData();
  } catch (error) {
    alert('Failed to initialize vault');
  }
};

const handleExport = async () => {
  try {
    const data = await exportVault(exportMasterPassword.value);
    exportData.value = data;
    exportMasterPassword.value = '';
    showExportDialog.value = true;
  } catch (error) {
    alert('Failed to export vault');
  }
};

const handleImport = async () => {
  if (!importData.value.trim()) return;
  try {
    await importVault(importMasterPassword.value, importData.value);
    importData.value = '';
    importMasterPassword.value = '';
    showImportDialog.value = false;
    await loadData();
  } catch (error) {
    alert('Failed to import vault');
  }
};

const handleChangeMasterPassword = async () => {
  if (newMasterPassword.value !== confirmNewMasterPassword.value) {
    alert('Passwords do not match');
    return;
  }
  if (newMasterPassword.value.length < 8) {
    alert('New password must be at least 8 characters');
    return;
  }
  try {
    await changeMasterPassword(currentMasterPassword.value, newMasterPassword.value);
    currentMasterPassword.value = '';
    newMasterPassword.value = '';
    confirmNewMasterPassword.value = '';
    showSettingsDialog.value = false;
  } catch (error) {
    alert('Failed to change master password');
  }
};

const formatCardNumber = (num: string) => {
  return num.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
};

const maskCardNumber = (num: string) => {
  const clean = num.replace(/\s/g, '');
  return '•••• •••• •••• ' + clean.slice(-4);
};

const getCardTypeIcon = (type: string) => {
  const icons: Record<string, string> = {
    visa: '💳',
    mastercard: '💳',
    amex: '💳',
    discover: '💳',
  };
  return icons[type.toLowerCase()] || '💳';
};

const strengthColor = computed(() => {
  if (!strength.value) return 'transparent';
  switch (strength.value.strength) {
    case 'VeryWeak': return '#ef4444';
    case 'Weak': return '#f97316';
    case 'Fair': return '#eab308';
    case 'Good': return '#22c55e';
    case 'Strong': return '#16a34a';
    default: return 'transparent';
  }
});

const strengthLabel = computed(() => {
  if (!strength.value) return '';
  return strength.value.strength;
});

const copyField = async (value: string, label: string) => {
  await copyToClipboard(value);
  // Could show toast notification
};

onMounted(async () => {
  if (isInitialized.value) {
    showUnlockDialog.value = true;
  } else {
    showCreateDialog.value = true;
  }
});

watch(isLocked, (locked) => {
  if (locked) {
    showUnlockDialog.value = true;
  }
});
</script>

<template>
  <div class="password-manager">
    <!-- Unlock Dialog -->
    <Dialog v-model:open="showUnlockDialog" title="Unlock Vault" :closable="false" width="420">
      <template #icon>
        <div class="vault-icon locked">🔒</div>
      </template>
      
      <p class="dialog-description">Enter your master password to unlock the vault</p>
      
      <Input
        v-model="masterPassword"
        type="password"
        placeholder="Master password"
        @keydown.enter="handleUnlock"
        autofocus
      />
      
      <div class="dialog-actions">
        <Button variant="primary" @click="handleUnlock" :loading="false">
          Unlock
        </Button>
      </div>
      
      <div v-if="!isInitialized.value" class="dialog-footer">
        <span>First time? </span>
        <button class="link-btn" @click="showUnlockDialog = false; showCreateDialog = true">
          Create new vault
        </button>
      </div>
    </Dialog>

    <!-- Create Vault Dialog -->
    <Dialog v-model:open="showCreateDialog" title="Create New Vault" :closable="false" width="420">
      <template #icon>
        <div class="vault-icon new">🗝️</div>
      </template>
      
      <p class="dialog-description">Create a master password to protect your vault. This password cannot be recovered if forgotten.</p>
      
      <Input
        v-model="masterPassword"
        type="password"
        placeholder="Master password (min 8 characters)"
        @keydown.enter="handleInitialize"
      />
      <Input
        v-model="confirmNewMasterPassword"
        type="password"
        placeholder="Confirm master password"
        @keydown.enter="handleInitialize"
      />
      
      <div class="dialog-actions">
        <Button variant="primary" @click="handleInitialize">
          Create Vault
        </Button>
        <Button variant="ghost" @click="showCreateDialog = false; showUnlockDialog = true">
          Back
        </Button>
      </div>
    </Dialog>

    <!-- Main Vault UI -->
    <div v-if="!isLocked.value" class="vault-container">
      <!-- Header -->
      <header class="vault-header">
        <div class="header-left">
          <div class="vault-icon unlocked">🔓</div>
          <div>
            <h1>Password Manager</h1>
            <p class="vault-status">{{ activeEntries.length }} items</p>
          </div>
        </div>
        
        <div class="header-center">
          <Input
            v-model="searchQuery"
            placeholder="Search passwords, notes, cards..."
            class="search-input"
            leadingIcon="
              <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                <circle cx='11' cy='11' r='8' />
                <line x1='21' y1='21' x2='16.65' y2='16.65' />
              </svg>
            "
          />
        </div>
        
        <div class="header-right">
          <Select
            v-model="activeCategory"
            :options="categoryOptions"
            class="category-select"
            placeholder="All Categories"
          />
          
          <Button variant="ghost" size="sm" @click="showGeneratorDialog = true" leadingIcon="
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
              <path d='M12 2a10 10 0 1 0 10 10' />
              <path d='M12 6v6l4 2' />
            </svg>
          ">
            Generate
          </Button>
          
          <Button variant="ghost" size="sm" @click="showImportDialog = true" leadingIcon="
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
              <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
              <polyline points='17 8 12 3 7 8' />
              <line x1='12' y1='3' x2='12' y2='15' />
            </svg>
          ">
            Import
          </Button>
          
          <Button variant="ghost" size="sm" @click="handleExport" leadingIcon="
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
              <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
              <polyline points='7 10 12 15 17 10' />
              <line x1='12' y1='15' x2='12' y2='3' />
            </svg>
          ">
            Export
          </Button>
          
          <Button variant="ghost" size="sm" @click="showSettingsDialog = true" leadingIcon="
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
              <circle cx='12' cy='12' r='3' />
              <path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z' />
            </svg>
          ">
            Settings
          </Button>
          
          <Button variant="danger" size="sm" @click="lockVault" leadingIcon="
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
              <rect x='3' y='11' width='18' height='11' rx='2' ry='2' />
              <path d='M7 11V7a5 5 0 0 1 10 0v4' />
            </svg>
          ">
            Lock
          </Button>
        </div>
      </header>

      <!-- Tab Navigation -->
      <nav class="tab-nav" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab-btn', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
          role="tab"
          :aria-selected="activeTab === tab.id"
        >
          <component :is="getTabIcon(tab.icon)" class="tab-icon" />
          {{ tab.label }}
        </button>
      </nav>

      <!-- Category Filter -->
      <div class="category-filter">
        <Select
          v-model="activeCategory"
          :options="categoryOptions"
          placeholder="All Categories"
          class="category-select-main"
        />
      </div>

      <!-- Entries List -->
      <div class="entries-container">
        <div v-if="activeEntries.length === 0" class="empty-state">
          <component :is="getEmptyIcon(activeTab)" class="empty-icon" />
          <h3>No {{ activeTab.replace(/([A-Z])/g, ' $1').toLowerCase() }} yet</h3>
          <p>Click the + button to add your first item</p>
          <Button variant="primary" @click="openEntryDialog(activeTab)">
            <component :is="getTabIcon(tabs.find(t => t.id === activeTab)?.icon)" />
            Add {{ activeTab.slice(0, -1) }}
          </Button>
        </div>

        <div v-else class="entries-grid">
          <div
            v-for="entry in activeEntries"
            :key="entry.id"
            class="entry-card"
            :class="{ favorite: entry.favorite }"
          >
            <div class="entry-header">
              <div class="entry-title-row">
                <h4 class="entry-title">{{ entry.title || entry.name }}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  class="favorite-btn"
                  :class="{ active: entry.favorite }"
                  @click.stop="toggleFavorite(activeTab, entry.id)"
                  :aria-label="entry.favorite ? 'Remove from favorites' : 'Add to favorites'"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </Button>
              </div>
              
              <span class="entry-category">{{ entry.category }}</span>
            </div>

            <div class="entry-content" v-if="activeTab === 'passwords'">
              <div class="field-row" v-if="entry.username">
                <span class="field-label">Username</span>
                <span class="field-value">{{ entry.username }}</span>
                <Button variant="ghost" size="xs" @click.stop="copyField(entry.username, 'Username')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </Button>
              </div>
              <div class="field-row" v-if="entry.email">
                <span class="field-label">Email</span>
                <span class="field-value">{{ entry.email }}</span>
                <Button variant="ghost" size="xs" @click.stop="copyField(entry.email, 'Email')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </Button>
              </div>
              <div class="field-row password-row">
                <span class="field-label">Password</span>
                <span class="field-value password-value">{{ '•'.repeat(entry.password?.length || 8) }}</span>
                <Button variant="ghost" size="xs" @click.stop="copyField(entry.password, 'Password')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </Button>
                <Button variant="ghost" size="xs" @click.stop="copyField(entry.password, 'Password')" class="reveal-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </Button>
              </div>
              <div class="field-row" v-if="entry.url">
                <span class="field-label">URL</span>
                <a :href="entry.url" target="_blank" class="field-value url-link">{{ entry.url }}</a>
                <Button variant="ghost" size="xs" @click.stop="copyField(entry.url, 'URL')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </Button>
              </div>
              <div class="field-row" v-if="entry.totpSecret">
                <span class="field-label">2FA</span>
                <span class="field-value totp-code">••••••</span>
                <Button variant="ghost" size="xs" @click.stop="copyField(entry.totpSecret, '2FA Secret')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </Button>
              </div>
            </div>

            <div class="entry-content" v-else-if="activeTab === 'creditCards'">
              <div class="card-display">
                <div class="card-type">{{ getCardTypeIcon(entry.cardType) }} {{ entry.cardType?.toUpperCase() || 'CARD' }}</div>
                <div class="card-number">{{ maskCardNumber(entry.number) }}</div>
                <div class="card-details">
                  <span>{{ entry.cardholderName }}</span>
                  <span>{{ String(entry.expiryMonth).padStart(2, '0') }}/{{ String(entry.expiryYear).slice(-2) }}</span>
                </div>
              </div>
              <div class="field-row" v-if="entry.cvv">
                <span class="field-label">CVV</span>
                <span class="field-value">•••</span>
                <Button variant="ghost" size="xs" @click.stop="copyField(entry.cvv, 'CVV')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </Button>
              </div>
            </div>

            <div class="entry-content" v-else-if="activeTab === 'identities'">
              <div class="field-row" v-if="entry.firstName || entry.lastName">
                <span class="field-label">Name</span>
                <span class="field-value">{{ entry.firstName }} {{ entry.lastName }}</span>
              </div>
              <div class="field-row" v-if="entry.email">
                <span class="field-label">Email</span>
                <span class="field-value">{{ entry.email }}</span>
                <Button variant="ghost" size="xs" @click.stop="copyField(entry.email, 'Email')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </Button>
              </div>
              <div class="field-row" v-if="entry.phone">
                <span class="field-label">Phone</span>
                <span class="field-value">{{ entry.phone }}</span>
                <Button variant="ghost" size="xs" @click.stop="copyField(entry.phone, 'Phone')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </Button>
              </div>
              <div class="field-row" v-if="entry.addressLine1">
                <span class="field-label">Address</span>
                <span class="field-value">{{ entry.addressLine1 }}{{ entry.addressLine2 ? ', ' + entry.addressLine2 : '' }}{{ entry.city ? ', ' + entry.city : '' }}{{ entry.state ? ', ' + entry.state : '' }}{{ entry.postalCode ? ' ' + entry.postalCode : '' }}</span>
              </div>
            </div>

            <div class="entry-content" v-else-if="activeTab === 'secureNotes'">
              <div class="note-content">{{ entry.content }}</div>
            </div>

            <div class="entry-footer">
              <div class="entry-meta">
                <span>Updated {{ formatDate(entry.updatedAt) }}</span>
              </div>
              <div class="entry-actions">
                <Button variant="ghost" size="sm" @click.stop="openEntryDialog(activeTab, entry)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </Button>
                <Button variant="ghost" size="sm" class="delete-btn" @click.stop="deleteEntry(activeTab, entry.id)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Floating Action Button -->
      <Button
        class="fab"
        variant="primary"
        @click="openEntryDialog(activeTab)"
        aria-label="Add new item"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </Button>
    </div>

    <!-- Entry Dialog -->
    <Dialog v-model:open="showEntryDialog" :title="editingEntry?.id ? 'Edit' : 'Add' + ' ' + getTypeLabel(editingType)" width="500">
      <form @submit.prevent="saveEntry" class="entry-form">
        <Input
          v-model="editingEntry.title"
          label="Title"
          placeholder="Enter title"
          required
        />
        <Input
          v-model="editingEntry.category"
          label="Category"
          placeholder="General"
          :datalist="getCategories()"
        />
        
        <div v-if="editingType === 'password'" class="form-grid">
          <Input
            v-model="editingEntry.username"
            label="Username"
            placeholder="Username"
          />
          <Input
            v-model="editingEntry.email"
            label="Email"
            placeholder="email@example.com"
            type="email"
          />
          <Input
            v-model="editingEntry.password"
            label="Password"
            placeholder="Password"
            type="password"
            required
          />
          <Input
            v-model="editingEntry.url"
            label="URL"
            placeholder="https://example.com"
            type="url"
          />
          <Input
            v-model="editingEntry.totpSecret"
            label="TOTP Secret (for 2FA)"
            placeholder="JBSWY3DPEHPK3PXP"
          />
        </div>

        <div v-else-if="editingType === 'creditCard'" class="form-grid">
          <Input
            v-model="editingEntry.name"
            label="Card Nickname"
            placeholder="Personal Visa"
            required
          />
          <Input
            v-model="editingEntry.cardholderName"
            label="Cardholder Name"
            placeholder="John Doe"
            required
          />
          <Input
            v-model="editingEntry.number"
            label="Card Number"
            placeholder="4242 4242 4242 4242"
            @input="editingEntry.number = formatCardNumber(editingEntry.number)"
            required
          />
          <div class="form-row">
            <Input
              v-model.number="editingEntry.expiryMonth"
              label="Expiry Month"
              type="number"
              min="1"
              max="12"
              placeholder="MM"
              required
            />
            <Input
              v-model.number="editingEntry.expiryYear"
              label="Expiry Year"
              type="number"
              min="2024"
              max="2040"
              placeholder="YYYY"
              required
            />
          </div>
          <Input
            v-model="editingEntry.cvv"
            label="CVV"
            placeholder="123"
            type="password"
            required
          />
          <Select
            v-model="editingEntry.cardType"
            label="Card Type"
            :options="[
              { value: 'visa', label: 'Visa' },
              { value: 'mastercard', label: 'Mastercard' },
              { value: 'amex', label: 'American Express' },
              { value: 'discover', label: 'Discover' },
              { value: 'other', label: 'Other' }
            ]"
          />
        </div>

        <div v-else-if="editingType === 'identity'" class="form-grid">
          <Input
            v-model="editingEntry.name"
            label="Identity Name"
            placeholder="Personal / Work"
            required
          />
          <Input
            v-model="editingEntry.firstName"
            label="First Name"
            placeholder="John"
          />
          <Input
            v-model="editingEntry.lastName"
            label="Last Name"
            placeholder="Doe"
          />
          <Input
            v-model="editingEntry.email"
            label="Email"
            placeholder="john@example.com"
            type="email"
          />
          <Input
            v-model="editingEntry.phone"
            label="Phone"
            placeholder="+1 555-123-4567"
          />
          <Input
            v-model="editingEntry.addressLine1"
            label="Address Line 1"
            placeholder="123 Main St"
          />
          <Input
            v-model="editingEntry.addressLine2"
            label="Address Line 2"
            placeholder="Apt 4B"
          />
          <Input
            v-model="editingEntry.city"
            label="City"
            placeholder="New York"
          />
          <Input
            v-model="editingEntry.state"
            label="State"
            placeholder="NY"
          />
          <Input
            v-model="editingEntry.postalCode"
            label="Postal Code"
            placeholder="10001"
          />
          <Input
            v-model="editingEntry.country"
            label="Country"
            placeholder="USA"
          />
          <Input
            v-model="editingEntry.company"
            label="Company"
            placeholder="Acme Inc"
          />
          <Input
            v-model="editingEntry.jobTitle"
            label="Job Title"
            placeholder="Software Engineer"
          />
        </div>

        <div v-else-if="editingType === 'secureNote'">
          <textarea
            v-model="editingEntry.content"
            class="textarea"
            placeholder="Enter your secure note..."
            rows="8"
            required
          />
        </div>

        <div v-if="editingType !== 'secureNote'">
          <Input
            v-model="editingEntry.notes"
            label="Notes"
            placeholder="Additional notes..."
          />
        </div>

        <Switch
          v-model="editingEntry.favorite"
          label="Add to favorites"
        />

        <div class="form-actions">
          <Button variant="ghost" @click="showEntryDialog = false">Cancel</Button>
          <Button variant="primary" type="submit">
            {{ editingEntry.id ? 'Save' : 'Add' }}
          </Button>
        </div>
      </form>
    </Dialog>

    <!-- Password Generator Dialog -->
    <Dialog v-model:open="showGeneratorDialog" title="Generate Password" width="400">
      <div class="generator-content">
        <div class="generated-password-display">
          <input
            v-model="generatedPassword"
            readonly
            class="generated-password"
            placeholder="Click Generate"
          />
          <Button
            variant="ghost"
            size="sm"
            @click="copyGeneratedPassword"
            :disabled="!generatedPassword"
            title="Copy to clipboard"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </Button>
        </div>

        <div v-if="strength" class="strength-meter">
          <div class="strength-bar">
            <div
              class="strength-fill"
              :style="{ width: (strength.score / 10) * 100 + '%', backgroundColor: strengthColor }"
            />
          </div>
          <span class="strength-label">{{ strengthLabel }}</span>
        </div>

        <div class="generator-options">
          <div class="option-row">
            <label>Length: {{ generatorOptions.length }}</label>
            <input
              type="range"
              v-model.number="generatorOptions.length"
              min="8"
              max="64"
              @input="handleGeneratePassword"
            />
          </div>

          <Switch
            v-model="generatorOptions.uppercase"
            label="Uppercase (A-Z)"
            @change="handleGeneratePassword"
          />
          <Switch
            v-model="generatorOptions.lowercase"
            label="Lowercase (a-z)"
            @change="handleGeneratePassword"
          />
          <Switch
            v-model="generatorOptions.numbers"
            label="Numbers (0-9)"
            @change="handleGeneratePassword"
          />
          <Switch
            v-model="generatorOptions.symbols"
            label="Symbols (!@#$%)"
            @change="handleGeneratePassword"
          />
        </div>

        <div class="dialog-actions">
          <Button variant="ghost" @click="showGeneratorDialog = false">Close</Button>
          <Button
            variant="primary"
            @click="copyGeneratedPassword"
            :disabled="!generatedPassword"
          >
            Copy & Close
          </Button>
        </div>
      </div>
    </Dialog>

    <!-- Import Dialog -->
    <Dialog v-model:open="showImportDialog" title="Import Vault" width="500">
      <p class="dialog-description">Paste exported vault JSON data and enter the master password used to encrypt it.</p>
      
      <Input
        v-model="importMasterPassword"
        type="password"
        label="Master Password"
        placeholder="Enter master password for this vault"
      />
      
      <textarea
        v-model="importData"
        class="textarea"
        placeholder="Paste vault JSON here..."
        rows="10"
      />
      
      <div class="dialog-actions">
        <Button variant="ghost" @click="showImportDialog = false">Cancel</Button>
        <Button variant="primary" @click="handleImport" :disabled="!importData.trim() || !importMasterPassword">
          Import Vault
        </Button>
      </div>
    </Dialog>

    <!-- Export Dialog -->
    <Dialog v-model:open="showExportDialog" title="Export Vault" width="500">
      <p class="dialog-description">Enter your master password to export the vault as encrypted JSON.</p>
      
      <Input
        v-model="exportMasterPassword"
        type="password"
        label="Master Password"
        placeholder="Enter master password"
        @keydown.enter="handleExport"
      />
      
      <div v-if="exportData" class="export-output">
        <label>Exported Vault Data (copy and store securely):</label>
        <textarea
          v-model="exportData"
          readonly
          class="textarea export-textarea"
          rows="10"
        />
        <Button variant="ghost" size="sm" @click="copyToClipboard(exportData)">
          Copy to Clipboard
        </Button>
      </div>
      
      <div class="dialog-actions">
        <Button variant="ghost" @click="showExportDialog = false; exportData = ''">Close</Button>
      </div>
    </Dialog>

    <!-- Settings Dialog -->
    <Dialog v-model:open="showSettingsDialog" title="Settings" width="500">
      <div class="settings-tabs">
        <button
          v-for="tab in settingsTabs"
          :key="tab.id"
          :class="['settings-tab', { active: settingsActiveTab === tab.id }]"
          @click="settingsActiveTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="settings-content">
        <div v-if="settingsActiveTab === 'security'">
          <div class="settings-section">
            <h4>Master Password</h4>
            <p class="section-description">Change your master password. You'll need to enter your current password.</p>
            <Input
              v-model="currentMasterPassword"
              type="password"
              label="Current Master Password"
              placeholder="Enter current password"
            />
            <Input
              v-model="newMasterPassword"
              type="password"
              label="New Master Password"
              placeholder="Enter new password (min 8 chars)"
            />
            <Input
              v-model="confirmNewMasterPassword"
              type="password"
              label="Confirm New Password"
              placeholder="Confirm new password"
            />
            <Button variant="primary" @click="handleChangeMasterPassword" :disabled="!currentMasterPassword || !newMasterPassword || newMasterPassword !== confirmNewMasterPassword">
              Change Password
            </Button>
          </div>

          <div class="settings-section">
            <h4>Auto-Lock</h4>
            <p class="section-description">Automatically lock the vault after inactivity.</p>
            <Select
              v-model="autoLockTimeout"
              :options="[
                { value: 0, label: 'Never' },
                { value: 1, label: '1 minute' },
                { value: 5, label: '5 minutes' },
                { value: 15, label: '15 minutes' },
                { value: 30, label: '30 minutes' },
                { value: 60, label: '1 hour' }
              ]"
              @change="setAutoLockTimeout(autoLockTimeout)"
            />
          </div>

          <div class="settings-section">
            <h4>Danger Zone</h4>
            <p class="section-description">Irreversible actions.</p>
            <Button variant="danger" @click="emergencyWipe">Emergency Wipe Vault</Button>
          </div>
        </div>

        <div v-if="settingsActiveTab === 'import-export'">
          <div class="settings-section">
            <h4>Export Vault</h4>
            <p class="section-description">Export your vault as encrypted JSON for backup or migration.</            <Button variant="primary" @click="handleExport; showSettingsDialog = false">
              Export Vault
            </Button>
          </div>

          <div class="settings-section">
            <h4>Import Vault</h4>
            <p class="section-description">Import a previously exported vault JSON file.</p>
            <Button variant="primary" @click="showSettingsDialog = false; showImportDialog = true">
              Import Vault
            </Button>
          </div>
        </div>

        <div v-if="settingsActiveTab === 'advanced'">
          <div class="settings-section">
            <h4>Biometric Unlock</h4>
            <p class="section-description">Use fingerprint or face ID to unlock the vault (requires OS support).</p>
            <Switch v-model="biometricEnabled" label="Enable biometric unlock" />
          </div>

          <div class="settings-section">
            <h4>Plausible Deniability</h4>
            <p class="section-description">Create a decoy vault with a separate password.</p>
            <Button variant="ghost" @click="createDecoyVault">Set Up Decoy Vault</Button>
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script>
const getTabIcon = (name: string) => {
  const icons: Record<string, any> = {
    key: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    'credit-card': () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
    user: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    'file-text': () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  };
  return icons[name] || (() => <svg width="18" height="18" />);
};

const getEmptyIcon = (tab: string) => {
  const icons: Record<string, any> = {
    passwords: () => (
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    creditCards: () => (
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
    identities: () => (
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    secureNotes: () => (
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  };
  return icons[tab] || (() => <svg width="64" height="64" />);
};

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    password: 'Password',
    creditCard: 'Credit Card',
    identity: 'Identity',
    secureNote: 'Secure Note',
  };
  return labels[type] || type;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
};

const settingsTabs = [
  { id: 'security', label: 'Security' },
  { id: 'import-export', label: 'Import/Export' },
  { id: 'advanced', label: 'Advanced' },
];
const settingsActiveTab = ref('security');
const biometricEnabled = ref(false);
</script>

<style scoped>
/* Password Manager Styles */
.password-manager {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  color: var(--fg-primary);
  font-family: var(--font-sans);
}

/* Vault Icon */
.vault-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin: 0 auto var(--space-4);
}

.vault-icon.locked {
  background: linear-gradient(135deg, var(--color-brand-500), var(--color-brand-600));
  color: white;
}

.vault-icon.new {
  background: linear-gradient(135deg, var(--color-success-500), var(--color-success-600));
  color: white;
}

.vault-icon.unlocked {
  background: linear-gradient(135deg, var(--color-success-500), var(--color-success-600));
  color: white;
}

/* Dialog Description */
.dialog-description {
  color: var(--fg-secondary);
  font-size: var(--text-sm);
  margin-bottom: var(--space-4);
  text-align: center;
}

.dialog-footer {
  margin-top: var(--space-4);
  text-center;
  color: var(--fg-secondary);
  font-size: var(--text-sm);
}

.link-btn {
  background: none;
  border: none;
  color: var(--color-brand-500);
  font-weight: var(--font-medium);
  cursor: pointer;
  padding: 0;
}

/* Vault Container */
.vault-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Vault Header */
.vault-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  gap: var(--space-4);
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.vault-icon.unlocked {
  width: 40px;
  height: 40px;
  font-size: 20px;
}

.vault-header h1 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin: 0;
}

.vault-status {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  margin: 0;
}

.header-center {
  flex: 1;
  max-width: 400px;
  min-width: 200px;
}

.search-input {
  width: 100%;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.category-select,
.category-select-main {
  min-width: 160px;
}

/* Tab Navigation */
.tab-nav {
  display: flex;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  padding: 0 var(--space-3);
  overflow-x: auto;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
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

.tab-icon {
  flex-shrink: 0;
}

/* Category Filter */
.category-filter {
  padding: var(--space-2) var(--space-4);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
}

.category-select-main {
  width: 100%;
  max-width: 300px;
}

/* Entries Container */
.entries-container {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  text-align: center;
  color: var(--fg-tertiary);
  gap: var(--space-3);
}

.empty-icon {
  opacity: 0.3;
}

.empty-state h3 {
  margin: 0;
  font-size: var(--text-lg);
  color: var(--fg-secondary);
}

.empty-state p {
  margin: 0;
  font-size: var(--text-sm);
}

.entries-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-3);
}

/* Entry Card */
.entry-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  transition: var(--transition-fast);
  display: flex;
  flex-direction: column;
  position: relative;
}

.entry-card:hover {
  border-color: var(--border-secondary);
  box-shadow: var(--shadow-md);
}

.entry-card.favorite {
  border-color: var(--color-warning-500);
}

.entry-card.favorite::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--color-warning-500), var(--color-warning-400));
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.entry-header {
  margin-bottom: var(--space-3);
}

.entry-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.entry-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.favorite-btn {
  flex-shrink: 0;
}

.favorite-btn.active {
  color: var(--color-warning-500);
}

.entry-category {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  background: var(--bg-tertiary);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  display: inline-block;
}

.entry-content {
  margin-bottom: var(--space-3);
}

.field-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  flex-wrap: wrap;
}

.field-label {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-width: 80px;
  flex-shrink: 0;
}

.field-value {
  font-size: var(--text-sm);
  color: var(--fg-primary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.password-row {
  align-items: center;
}

.password-value {
  font-family: var(--font-mono);
  letter-spacing: 2px;
}

.reveal-btn {
  flex-shrink: 0;
}

.url-link {
  color: var(--color-brand-500);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.url-link:hover {
  text-decoration: underline;
}

.totp-code {
  font-family: var(--font-mono);
  letter-spacing: 4px;
}

.card-display {
  background: linear-gradient(135deg, var(--bg-tertiary), var(--bg-primary));
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  margin-bottom: var(--space-3);
  border: 1px solid var(--border-primary);
}

.card-type {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: var(--space-2);
}

.card-number {
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  font-weight: var(--font-medium);
  letter-spacing: 2px;
  margin-bottom: var(--space-2);
}

.card-details {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-sm);
  color: var(--fg-secondary);
}

.note-content {
  white-space: pre-wrap;
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--fg-secondary);
}

.entry-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-primary);
  margin-top: auto;
}

.entry-meta {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
}

.entry-actions {
  display: flex;
  gap: var(--space-1);
}

.delete-btn {
  color: var(--color-error-500);
}

.delete-btn:hover {
  background: var(--color-error-50) !important;
}

/* FAB */
.fab {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-xl);
  z-index: var(--z-sticky);
}

/* Entry Form */
.entry-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-height: 70vh;
  overflow-y: auto;
  padding-right: var(--space-2);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.form-row {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.textarea {
  width: 100%;
  min-height: 120px;
  padding: var(--space-3);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--fg-primary);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  resize: vertical;
  outline: none;
  transition: var(--transition-colors);
}

.textarea:focus {
  border-color: var(--border-focus);
  box-shadow: var(--focus-ring);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--border-primary);
  margin-top: var(--space-2);
}

/* Generator Dialog */
.generator-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.generated-password-display {
  display: flex;
  gap: var(--space-2);
}

.generated-password {
  flex: 1;
  font-family: var(--font-mono);
  font-size: var(--text-base);
  padding: var(--space-3);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--fg-primary);
}

.strength-meter {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.strength-bar {
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  transition: var(--transition-normal);
  border-radius: var(--radius-full);
}

.strength-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--fg-secondary);
}

.generator-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.option-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.option-row label {
  font-size: var(--text-sm);
  color: var(--fg-secondary);
}

.option-row input[type="range"] {
  flex: 1;
  max-width: 200px;
  margin-left: var(--space-3);
}

/* Export Output */
.export-output {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.export-textarea {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

/* Settings Dialog */
.settings-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-primary);
  margin-bottom: var(--space-4);
  gap: var(--space-1);
}

.settings-tab {
  padding: var(--space-2) var(--space-4);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--fg-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: var(--transition-fast);
}

.settings-tab:hover {
  color: var(--fg-primary);
}

.settings-tab.active {
  color: var(--color-brand-500);
  border-bottom-color: var(--color-brand-500);
}

.settings-content {
  max-height: 60vh;
  overflow-y: auto;
}

.settings-section {
  margin-bottom: var(--space-6);
}

.settings-section h4 {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin: 0 0 var(--space-1);
  color: var(--fg-primary);
}

.section-description {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  margin: 0 0 var(--space-3);
}

.export-output {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.export-textarea {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  min-height: 200px;
}

/* Dialog Actions */
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-primary);
}

/* Responsive */
@media (max-width: 768px) {
  .vault-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-center {
    order: 3;
    max-width: none;
  }
  
  .header-right {
    order: 2;
    justify-content: flex-end;
  }
  
  .entries-grid {
    grid-template-columns: 1fr;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .fab {
    bottom: var(--space-4);
    right: var(--space-4);
    width: 48px;
    height: 48px;
  }
}
</style>