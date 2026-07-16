<template>
  <div class="shortcuts-cheatsheet">
    <h4 class="demo-title">Keyboard Shortcuts</h4>
    <div class="shortcuts-grid">
      <ShortcutRow v-for="sc in shortcuts" :key="sc.action" :shortcut="sc" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Shortcut {
  action: string
  keys: string
  category: string
}

const shortcuts: Shortcut[] = [
  // Tabs
  { action: 'New Tab', keys: 'Ctrl+T', category: 'Tabs' },
  { action: 'New Private Tab', keys: 'Ctrl+Shift+P', category: 'Tabs' },
  { action: 'Close Tab', keys: 'Ctrl+W', category: 'Tabs' },
  { action: 'Reopen Closed Tab', keys: 'Ctrl+Shift+T', category: 'Tabs' },
  { action: 'Next Tab', keys: 'Ctrl+Tab', category: 'Tabs' },
  { action: 'Previous Tab', keys: 'Ctrl+Shift+Tab', category: 'Tabs' },
  { action: 'Switch to Tab 1-8', keys: 'Ctrl+1-8', category: 'Tabs' },
  { action: 'Last Tab', keys: 'Ctrl+9', category: 'Tabs' },
  
  // Navigation
  { action: 'Focus Address Bar', keys: 'Ctrl+L', category: 'Navigation' },
  { action: 'Go Back', keys: 'Alt+←', category: 'Navigation' },
  { action: 'Go Forward', keys: 'Alt+→', category: 'Navigation' },
  { action: 'Reload', keys: 'Ctrl+R', category: 'Navigation' },
  { action: 'Force Reload', keys: 'Ctrl+Shift+R', category: 'Navigation' },
  { action: 'Stop Loading', keys: 'Esc', category: 'Navigation' },
  { action: 'Homepage', keys: 'Alt+Home', category: 'Navigation' },
  
  // Page
  { action: 'Find in Page', keys: 'Ctrl+F', category: 'Page' },
  { action: 'Find Next', keys: 'F3', category: 'Page' },
  { action: 'Find Previous', keys: 'Shift+F3', category: 'Page' },
  { action: 'Zoom In', keys: 'Ctrl++', category: 'Page' },
  { action: 'Zoom Out', keys: 'Ctrl+-', category: 'Page' },
  { action: 'Reset Zoom', keys: 'Ctrl+0', category: 'Page' },
  { action: 'Fullscreen', keys: 'F11', category: 'Page' },
  { action: 'Print', keys: 'Ctrl+P', category: 'Page' },
  { action: 'Save Page', keys: 'Ctrl+S', category: 'Page' },
  { action: 'View Source', keys: 'Ctrl+U', category: 'Page' },
  { action: 'Inspect Element', keys: 'F12', category: 'Page' },
  
  // Privacy
  { action: 'Toggle Ad Blocker', keys: 'Ctrl+Shift+A', category: 'Privacy' },
  { action: 'Clear Browsing Data', keys: 'Ctrl+Shift+Del', category: 'Privacy' },
  { action: 'Open Cookie Manager', keys: 'Ctrl+Shift+O', category: 'Privacy' },
  
  // UI
  { action: 'Toggle Sidebar', keys: 'Ctrl+Shift+B', category: 'UI' },
  { action: 'Open Settings', keys: 'Ctrl+,', category: 'UI' },
  { action: 'Open Downloads', keys: 'Ctrl+J', category: 'UI' },
  { action: 'Open History', keys: 'Ctrl+H', category: 'UI' },
  { action: 'Open Bookmarks', keys: 'Ctrl+Shift+O', category: 'UI' },
  { action: 'Command Palette', keys: 'Ctrl+K', category: 'UI' },
  { action: 'New Private Window', keys: 'Ctrl+Shift+N', category: 'UI' },
  
  // DevTools
  { action: 'Toggle DevTools', keys: 'F12', category: 'Developer' },
  { action: 'Console', keys: 'Ctrl+Shift+J', category: 'Developer' },
  { action: 'Elements', keys: 'Ctrl+Shift+C', category: 'Developer' },
]
</script>

<template>
  <div class="shortcuts-cheatsheet">
    <h4 class="demo-title">Keyboard Shortcuts</h4>
    <div class="shortcuts-categories">
      <div v-for="category in categories" :key="category" class="shortcut-category">
        <h5 class="category-title">{{ category }}</h5>
        <div class="shortcuts-grid">
          <ShortcutRow 
            v-for="sc in shortcutsByCategory[category]" 
            :key="sc.action" 
            :shortcut="sc" 
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const shortcuts = [
  // Tabs
  { action: 'New Tab', keys: 'Ctrl+T', category: 'Tabs' },
  { action: 'New Private Tab', keys: 'Ctrl+Shift+P', category: 'Tabs' },
  { action: 'Close Tab', keys: 'Ctrl+W', category: 'Tabs' },
  { action: 'Reopen Closed Tab', keys: 'Ctrl+Shift+T', category: 'Tabs' },
  { action: 'Next Tab', keys: 'Ctrl+Tab', category: 'Tabs' },
  { action: 'Previous Tab', keys: 'Ctrl+Shift+Tab', category: 'Tabs' },
  { action: 'Switch to Tab 1-8', keys: 'Ctrl+1-8', category: 'Tabs' },
  { action: 'Last Tab', keys: 'Ctrl+9', category: 'Tabs' },
  
  // Navigation
  { action: 'Focus Address Bar', keys: 'Ctrl+L', category: 'Navigation' },
  { action: 'Go Back', keys: 'Alt+←', category: 'Navigation' },
  { action: 'Go Forward', keys: 'Alt+→', category: 'Navigation' },
  { action: 'Reload', keys: 'Ctrl+R', category: 'Navigation' },
  { action: 'Force Reload', keys: 'Ctrl+Shift+R', category: 'Navigation' },
  { action: 'Stop Loading', keys: 'Esc', category: 'Navigation' },
  { action: 'Homepage', keys: 'Alt+Home', category: 'Navigation' },
  
  // Page
  { action: 'Find in Page', keys: 'Ctrl+F', category: 'Page' },
  { action: 'Find Next', keys: 'F3', category: 'Page' },
  { action: 'Find Previous', keys: 'Shift+F3', category: 'Page' },
  { action: 'Zoom In', keys: 'Ctrl++', category: 'Page' },
  { action: 'Zoom Out', keys: 'Ctrl+-', category: 'Page' },
  { action: 'Reset Zoom', keys: 'Ctrl+0', category: 'Page' },
  { action: 'Fullscreen', keys: 'F11', category: 'Page' },
  { action: 'Print', keys: 'Ctrl+P', category: 'Page' },
  { action: 'Save Page', keys: 'Ctrl+S', category: 'Page' },
  { action: 'View Source', keys: 'Ctrl+U', category: 'Page' },
  { action: 'Inspect Element', keys: 'F12', category: 'Page' },
  
  // Privacy
  { action: 'Toggle Ad Blocker', keys: 'Ctrl+Shift+A', category: 'Privacy' },
  { action: 'Clear Browsing Data', keys: 'Ctrl+Shift+Del', category: 'Privacy' },
  { action: 'Open Cookie Manager', keys: 'Ctrl+Shift+O', category: 'Privacy' },
  
  // UI
  { action: 'Toggle Sidebar', keys: 'Ctrl+Shift+B', category: 'UI' },
  { action: 'Open Settings', keys: 'Ctrl+,', category: 'UI' },
  { action: 'Open Downloads', keys: 'Ctrl+J', category: 'UI' },
  { action: 'Open History', keys: 'Ctrl+H', category: 'UI' },
  { action: 'Open Bookmarks', keys: 'Ctrl+Shift+O', category: 'UI' },
  { action: 'Command Palette', keys: 'Ctrl+K', category: 'UI' },
  { action: 'New Private Window', keys: 'Ctrl+Shift+N', category: 'UI' },
  
  // DevTools
  { action: 'Toggle DevTools', keys: 'F12', category: 'Developer' },
  { action: 'Console', keys: 'Ctrl+Shift+J', category: 'Developer' },
  { action: 'Elements', keys: 'Ctrl+Shift+C', category: 'Developer' },
]

const categories = ['Tabs', 'Navigation', 'Page', 'Privacy', 'UI', 'Developer']

const shortcutsByCategory = {
  Tabs: shortcuts.filter(s => s.category === 'Tabs'),
  Navigation: shortcuts.filter(s => s.category === 'Navigation'),
  Page: shortcuts.filter(s => s.category === 'Page'),
  Privacy: shortcuts.filter(s => s.category === 'Privacy'),
  UI: shortcuts.filter(s => s.category === 'UI'),
  Developer: shortcuts.filter(s => s.category === 'Developer'),
}
</script>

<template>
  <div class="shortcuts-cheatsheet">
    <h4 class="demo-title">Keyboard Shortcuts</h4>
    <div class="shortcuts-categories">
      <div v-for="category in categories" :key="category" class="shortcut-category">
        <h5 class="category-title">{{ category }}</h5>
        <div class="shortcuts-grid">
          <div 
            v-for="sc in shortcutsByCategory[category]" 
            :key="sc.action" 
            class="shortcut-row"
          >
            <span class="shortcut-action">{{ sc.action }}</span>
            <kbd class="shortcut-key">{{ sc.keys }}</kbd>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shortcuts-cheatsheet {
  padding: 16px;
}

.demo-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--fg-secondary);
  margin: 0 0 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.shortcuts-categories {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.shortcut-category {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 10px;
  padding: 16px;
}

.category-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--fg-secondary);
  margin: 0 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  transition: all 0.15s ease;
}

.shortcut-row:hover {
  background: var(--bg-tertiary);
  border-color: var(--color-brand-500);
}

.shortcut-action {
  font-size: 12px;
  color: var(--fg-primary);
  flex: 1;
}

.shortcut-key {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--fg-secondary);
  white-space: nowrap;
}

.kbd {
  padding: 2px 6px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--fg-secondary);
}
</style>