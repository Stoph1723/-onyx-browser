<template>
  <div class="workspace-demo">
    <h4 class="demo-title">Workspaces</h4>
    <div class="workspace-cards">
      <WorkspaceMini
        v-for="ws in workspaces"
        :key="ws.id"
        :workspace="ws"
        :is-active="ws.id === 'work'"
      />
    </div>
    
    <div class="demo-info">
      <h4>Features</h4>
      <ul>
        <li>Separate tabs, cookies, history per workspace</li>
        <li>Save & restore window layouts</li>
        <li>Switch instantly with ⌘⇧W</li>
        <li>Sync layouts across devices (encrypted)</li>
        <li>Auto-save layout on close</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
const workspaces = [
  { id: 'personal', name: 'Personal', icon: '🏠', color: '#22c55e', tabs: 8 },
  { id: 'work', name: 'Work', icon: '💼', color: '#3b82f6', tabs: 12, active: true },
  { id: 'research', name: 'Research', icon: '🔬', color: '#06b6d4', tabs: 15 },
  { id: 'dev', name: 'Development', icon: '💻', color: '#8b5cf6', tabs: 6 },
]

interface Workspace {
  id: string
  name: string
  icon: string
  color: string
  tabs: number
  active?: boolean
}
</script>

<template>
  <div class="workspace-demo">
    <h4 class="demo-title">Workspaces</h4>
    <div class="workspace-cards">
      <div 
        v-for="ws in workspaces" 
        :key="ws.id"
        class="workspace-mini"
        :class="{ active: ws.active }"
        :style="{ borderColor: ws.active ? ws.color : 'transparent' }"
      >
        <div class="mini-icon" :style="{ backgroundColor: ws.color }">
          <span v-html="ws.icon"></span>
        </div>
        <span class="mini-name">{{ ws.name }}</span>
        <span class="mini-count">{{ ws.tabs }} tabs</span>
      </div>
    </div>
    
    <div class="demo-info">
      <h4>Features</h4>
      <ul>
        <li>Separate tabs, cookies, history per workspace</li>
        <li>Save & restore window layouts</li>
        <li>Switch instantly with ⌘⇧W</li>
        <li>Sync layouts across devices (encrypted)</li>
        <li>Auto-save layout on close</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
const workspaces = [
  { id: 'personal', name: 'Personal', icon: '🏠', color: '#22c55e', tabs: 8 },
  { id: 'work', name: 'Work', icon: '💼', color: '#3b82f6', tabs: 12, active: true },
  { id: 'research', name: 'Research', icon: '🔬', color: '#06b6d4', tabs: 15 },
  { id: 'dev', name: 'Development', icon: '💻', color: '#8b5cf6', tabs: 6 },
]
</script>

<style scoped>
.workspace-demo {
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

.workspace-cards {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.workspace-mini {
  flex: 1;
  min-width: 100px;
  max-width: 140px;
  padding: 16px;
  background: var(--bg-secondary);
  border: 2px solid var(--border-primary);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.workspace-mini.active {
  border-color: var(--active-color);
  background: var(--accent-muted);
}

.workspace-mini:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.mini-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  font-size: 20px;
}

.mini-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-primary);
}

.mini-count {
  font-size: 11px;
  color: var(--fg-tertiary);
  background: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.demo-info {
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 10px;
}

.demo-info h4 {
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-secondary);
  margin: 0 0 12px;
}

.demo-info ul {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: var(--fg-tertiary);
  line-height: 1.8;
}

.demo-info li {
  margin-bottom: 4px;
}
</style>