<template>
  <div class="container-demo">
    <h4 class="demo-title">Container Types</h4>
    <div class="container-types">
      <ContainerType 
        icon="🏦" 
        name="Banking" 
        desc="Strict isolation, no 3rd party"
        color="#ef4444"
      />
      <ContainerType 
        icon="🛒" 
        name="Shopping" 
        desc="Isolated cookies per site"
        color="#f97316"
      />
      <ContainerType 
        icon="📱" 
        name="Social" 
        desc="Isolated from tracking"
        color="#ec4899"
      />
      <ContainerType 
        icon="💼" 
        name="Work" 
        desc="Clean session, no tracking"
        color="#3b82f6"
      />
      <ContainerType 
        icon="🏠" 
        name="Personal" 
        desc="Your private space"
        color="#22c55e"
      />
      <ContainerType 
        icon="💻" 
        name="Development" 
        desc="Permissive for debugging"
        color="#8b5cf6"
      />
      <ContainerType 
        icon="🔬" 
        name="Research" 
        desc="No tracking, no history"
        color="#06b6d4"
      />
      <ContainerType 
        icon="🕵️" 
        name="Private" 
        desc="Ephemeral, auto-delete"
        color="#6b7280"
      />
    </div>
    
    <div class="demo-info">
      <h4>How it works</h4>
      <ul>
        <li>Each container has isolated cookies, localStorage, IndexedDB</li>
        <li>Different fingerprint per container (UA, screen, canvas)</li>
        <li>Different proxy/VPN per container (optional)</li>
        <li>Tabs inherit container from link click or manual assign</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import ContainerType from './ContainerType.vue'
</template>

<style scoped>
.container-demo {
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

.container-types {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
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