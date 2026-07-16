<template>
  <div class="adblock-demo">
    <h4 class="demo-title">Ad Blocking Features</h4>
    <div class="demo-grid">
      <DemoCard 
        icon="🎬" 
        label="YouTube Ads" 
        status="Blocked"
        detail="Pre-roll, mid-roll, banner"
      />
      <DemoCard 
        icon="⏭️" 
        label="Auto-Skip" 
        status="Active"
        detail="Skips unskippable after 5s"
      />
      <DemoCard 
        icon="🏷️" 
        label="SponsorBlock" 
        status="Active"
        detail="Skips sponsors, intros, filler"
      />
      <DemoCard 
        icon="🔗" 
        label="Link Cleaning" 
        status="Active"
        detail="Removes utm_, fbclid, gclid"
      />
      <DemoCard 
        icon="🎯" 
        label="Element Zapper" 
        status="Ready"
        detail="Right-click to block any element"
      />
      <DemoCard 
        icon="📊" 
        label="Stats Today" 
        status="Live"
        detail="Updates in real-time"
        :stats="{ blocked: 247, skipped: 12, time: '4.2s' }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import DemoCard from './DemoCard.vue'
</template>

<style scoped>
.adblock-demo {
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