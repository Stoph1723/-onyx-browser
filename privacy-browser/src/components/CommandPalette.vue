import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { invoke } from '@tauri-apps/api/core'

interface Command {
  id: string
  title: string
  description: string
  keywords: string[]
  action: () => void | Promise<void>
  icon?: string
  shortcut?: string
  category: string
}

const { tabs, activeTab, createTab, closeTab, setActiveTab, goBack, goForward, reloadTab } = useTabs()

const isOpen = ref(false)
const query = ref('')
const selectedIndex = ref(0)
const commands = ref<Command[]>([])

const filteredCommands = computed(() => {
  if (!query.value) return commands.value.slice(0, 10)
  const q = query.value.toLowerCase()
  return commands.value
    .map(cmd => ({
      cmd,
      score: calculateScore(cmd, q)
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ cmd }) => cmd)
}

const calculateScore = (cmd: Command, query: string): number => {
  let score = 0
  const title = cmd.title.toLowerCase()
  const desc = cmd.description.toLowerCase()
  const keywords = cmd.keywords.join(' ').toLowerCase()

  if (title.startsWith(query)) score += 100
  else if (title.includes(query)) score += 50

  if (desc.includes(query)) score += 20
  if (keywords.includes(query)) score += 30

  for (const kw of cmd.keywords) {
    if (kw.startsWith(query)) score += 40
    else if (kw.includes(query)) score += 15
  }

  return score
}

const buildCommands = () => {
  const cmds: Command[] = [
    // Tab commands
    { id: 'new-tab', title: 'New Tab', description: 'Open a new tab', keywords: ['new', 'tab', 'open'], action: () => createTab(), icon: 'plus', shortcut: 'Ctrl+T', category: 'Tabs' },
    { id: 'new-private-tab', title: 'New Private Tab', description: 'Open a new private tab', keywords: ['private', 'incognito', 'tab'], action: () => createTab(undefined, true), icon: 'user-secret', shortcut: 'Ctrl+Shift+P', category: 'Tabs' },
    { id: 'close-tab', title: 'Close Tab', description: 'Close the current tab', keywords: ['close', 'tab'], action: () => activeTab.value && closeTab(activeTab.value.id), icon: 'x', shortcut: 'Ctrl+W', category: 'Tabs' },
    { id: 'reopen-tab', title: 'Reopen Closed Tab', description: 'Reopen the last closed tab', keywords: ['reopen', 'restore', 'closed', 'tab'], action: () => { /* implement */ }, icon: 'rotate-ccw', shortcut: 'Ctrl+Shift+T', category: 'Tabs' },
    { id: 'next-tab', title: 'Next Tab', description: 'Switch to the next tab', keywords: ['next', 'tab'], action: () => { /* implement */ }, icon: 'chevron-right', shortcut: 'Ctrl+Tab', category: 'Tabs' },
    { id: 'prev-tab', title: 'Previous Tab', description: 'Switch to the previous tab', keywords: ['previous', 'prev', 'tab'], action: () => { /* implement */ }, icon: 'chevron-left', shortcut: 'Ctrl+Shift+Tab', category: 'Tabs' },

    // Navigation
    { id: 'focus-address', title: 'Focus Address Bar', description: 'Focus the address bar', keywords: ['address', 'url', 'focus', 'search'], action: () => { (document.getElementById('address-input') as HTMLInputElement)?.focus(); }, icon: 'search', shortcut: 'Ctrl+L', category: 'Navigation' },
    { id: 'go-back', title: 'Go Back', description: 'Navigate back', keywords: ['back', 'previous'], action: () => activeTab.value && goBack(activeTab.value.id), icon: 'arrow-left', shortcut: 'Alt+Left', category: 'Navigation' },
    { id: 'go-forward', title: 'Go Forward', description: 'Navigate forward', keywords: ['forward', 'next'], action: () => activeTab.value && goForward(activeTab.value.id), icon: 'arrow-right', shortcut: 'Alt+Right', category: 'Navigation' },
    { id: 'reload', title: 'Reload', description: 'Reload the current page', keywords: ['reload', 'refresh'], action: () => activeTab.value && reloadTab(activeTab.value.id), icon: 'refresh-cw', shortcut: 'Ctrl+R', category: 'Navigation' },
    { id: 'force-reload', title: 'Force Reload', description: 'Reload ignoring cache', keywords: ['force', 'reload', 'cache'], action: () => activeTab.value && reloadTab(activeTab.value.id, true), icon: 'refresh-ccw', shortcut: 'Ctrl+Shift+R', category: 'Navigation' },

    // Privacy
    { id: 'toggle-adblock', title: 'Toggle Ad Blocker', description: 'Enable or disable ad blocking', keywords: ['adblock', 'ads', 'block'], action: () => { /* invoke */ }, icon: 'shield', shortcut: 'Ctrl+Shift+A', category: 'Privacy' },
    { id: 'clear-data', title: 'Clear Browsing Data', description: 'Clear cookies, cache, history', keywords: ['clear', 'data', 'cookies', 'cache', 'history'], action: () => { /* invoke */ }, icon: 'trash-2', category: 'Privacy' },
    { id: 'new-private-window', title: 'New Private Window', description: 'Open a new private browsing window', keywords: ['private', 'incognito', 'window'], action: () => { /* invoke */ }, icon: 'user-secret', shortcut: 'Ctrl+Shift+N', category: 'Privacy' },

    // UI
    { id: 'toggle-sidebar', title: 'Toggle Sidebar', description: 'Show or hide the sidebar', keywords: ['sidebar', 'bookmarks', 'history'], action: () => { /* emit */ }, icon: 'layout', shortcut: 'Ctrl+Shift+B', category: 'View' },
    { id: 'toggle-fullscreen', title: 'Toggle Fullscreen', description: 'Enter or exit fullscreen mode', keywords: ['fullscreen', 'full screen'], action: () => { /* invoke */ }, icon: 'maximize-2', shortcut: 'F11', category: 'View' },
    { id: 'open-settings', title: 'Open Settings', description: 'Open browser settings', keywords: ['settings', 'preferences', 'options'], action: () => { /* emit */ }, icon: 'settings', shortcut: 'Ctrl+,', category: 'View' },
    { id: 'open-downloads', title: 'Open Downloads', description: 'Show downloads panel', keywords: ['downloads', 'download'], action: () => { /* emit */ }, icon: 'download', shortcut: 'Ctrl+J', category: 'View' },
    { id: 'open-history', title: 'Open History', description: 'Show browsing history', keywords: ['history'], action: () => { /* emit */ }, icon: 'clock', shortcut: 'Ctrl+H', category: 'View' },
    { id: 'open-bookmarks', title: 'Open Bookmarks', description: 'Show bookmarks manager', keywords: ['bookmarks', 'favorites'], action: () => { /* emit */ }, icon: 'bookmark', shortcut: 'Ctrl+Shift+O', category: 'View' },

    // Developer
    { id: 'toggle-devtools', title: 'Toggle Developer Tools', description: 'Open or close developer tools', keywords: ['devtools', 'developer', 'inspect', 'debug'], action: () => { /* invoke */ }, icon: 'terminal', shortcut: 'F12', category: 'Developer' },
    { id: 'view-source', title: 'View Page Source', description: 'View the HTML source of the current page', keywords: ['source', 'html', 'view'], action: () => { /* invoke */ }, icon: 'code', shortcut: 'Ctrl+U', category: 'Developer' },

    // Tab management
    ...tabs.slice(0, 9).map((tab, i) => ({
      id: `switch-tab-${tab.id}`,
      title: `Switch to Tab ${i + 1}: ${tab.title || tab.url}`,
      description: `Switch to tab ${i + 1}`,
      keywords: ['tab', String(i + 1), tab.title || '', tab.url || ''],
      action: () => setActiveTab(tab.id),
      icon: 'tab',
      shortcut: `Ctrl+${i + 1}`,
      category: 'Tabs'
    })),
  ]
  commands.value = cmds
}

const selectCommand = (cmd: Command) => {
  cmd.action()
  close()
}

const close = () => {
  isOpen.value = false
  query.value = ''
  selectedIndex.value = 0
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!isOpen.value) return

  switch (e.key) {
    case 'Escape':
      close()
      break
    case 'ArrowDown':
      e.preventDefault()
      selectedIndex.value = Math.min(selectedIndex.value + 1, filteredCommands.value.length - 1)
      break
    case 'ArrowUp':
      e.preventDefault()
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
      break
    case 'Enter':
      e.preventDefault()
      if (filteredCommands.value[selectedIndex.value]) {
        selectCommand(filteredCommands.value[selectedIndex.value])
      }
      break
  }
}

const open = () => {
  isOpen.value = true
  selectedIndex.value = 0
  buildCommands()
  nextTick(() => {
    (document.querySelector('.command-input') as HTMLInputElement)?.focus()
  })
}

watch(() => isOpen.value, (val) => {
  if (val) {
    document.addEventListener('keydown', handleKeydown)
    document.body.style.overflow = 'hidden'
  } else {
    document.removeEventListener('keydown', handleKeydown)
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      open()
    }
  })
})
</script>

<template>
  <Transition name="fade">
    <div v-if="isOpen" class="command-overlay" @click.self="close">
      <div class="command-panel">
        <div class="command-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="command-icon">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            class="command-input"
            v-model="query"
            placeholder="Type a command or search..."
            autocomplete="off"
            spellcheck="false"
            aria-label="Command palette"
          >
          <kbd class="command-hint">⌘K</kbd>
        </div>

        <div class="command-list" role="listbox" aria-label="Commands">
          <div
            v-for="(cmd, index) in filteredCommands"
            :key="cmd.id"
            class="command-item"
            :class="{ selected: index === selectedIndex }"
            role="option"
            :aria-selected="index === selectedIndex"
            @click="selectCommand(cmd)"
            @mousemove="selectedIndex = index"
          >
            <span v-if="cmd.icon" class="command-item-icon" v-html="cmd.icon" />
            <div class="command-item-content">
              <span class="command-item-title">{{ cmd.title }}</span>
              <span class="command-item-description">{{ cmd.description }}</span>
            </div>
            <span v-if="cmd.shortcut" class="command-item-shortcut">{{ cmd.shortcut }}</span>
            <span class="command-item-category">{{ cmd.category }}</span>
          </div>

          <div v-if="filteredCommands.length === 0 && query" class="command-empty">
            No commands found for "{{ query }}"
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--duration-normal) var(--ease-out);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.command-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  z-index: var(--z-modal);
  animation: fadeIn var(--duration-normal) var(--ease-out);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.command-panel {
  width: 90%;
  max-width: 720px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-2xl);
  overflow: hidden;
  box-shadow: var(--shadow-2xl);
  animation: slideUp var(--duration-normal) var(--ease-out);
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.command-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-primary);
}

.command-icon {
  color: var(--color-brand-500);
  flex-shrink: 0;
}

.command-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--fg-primary);
  font-size: var(--text-lg);
  font-family: inherit;
  width: 100%;
}

.command-input::placeholder {
  color: var(--fg-muted);
}

.command-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-1) var(--space-3);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--fg-tertiary);
  flex-shrink: 0;
}

.command-list {
  max-height: 50vh;
  overflow-y: auto;
  padding: var(--space-2);
}

.command-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: var(--transition-colors);
}

.command-item:hover,
.command-item.selected {
  background: var(--bg-tertiary);
}

.command-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--fg-tertiary);
  flex-shrink: 0;
}

.command-item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.command-item-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--fg-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.command-item-description {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.command-item-shortcut {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--fg-tertiary);
  flex-shrink: 0;
}

.command-item-category {
  font-size: var(--text-xs);
  color: var(--fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.command-empty {
  padding: var(--space-6);
  text-align: center;
  color: var(--fg-tertiary);
  font-size: var(--text-sm);
}
</style>