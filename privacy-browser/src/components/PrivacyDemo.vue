<template>
  <div class="privacy-demo">
    <h4 class="demo-title">Active Protections</h4>
    <div class="demo-grid">
      <DemoCard 
        icon="🛡️" 
        label="Ad Blocker" 
        status="Active"
        detail="Brave engine + custom lists"
      />
      <DemoCard 
        icon="🕵️" 
        label="Tracker Blocker" 
        status="Active"
        detail="EasyPrivacy + custom"
      />
      <DemoCard 
        icon="🎭" 
        label="Fingerprinting" 
        status="Protected"
        detail="Canvas, WebGL, Audio, Battery"
      />
      <DemoCard 
        icon="🔗" 
        label="HTTPS Upgrade" 
        status="Active"
        detail="Automatic HTTPS everywhere"
      />
      <DemoCard 
        icon="🍪" 
        label="Cookie Control" 
        status="Active"
        detail="3rd party blocked, 1st party isolated"
      />
      <DemoCard 
        icon="🔍" 
        label="CNAME Cloaking" 
        status="Blocked"
        detail="Subdomain tracker hiding"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import DemoCard from './DemoCard.vue'
</template>

<style scoped>
.privacy-demo {
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

.demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}
</style>