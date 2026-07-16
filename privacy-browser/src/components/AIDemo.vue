<template>
  <div class="ai-demo">
    <h4 class="demo-title">AI Capabilities</h4>
    <div class="ai-example">
      <span class="ai-label">Try asking:</span>
      <div class="ai-prompts">
        <button class="prompt-btn" @click="setPrompt('Summarize this page in 3 bullets')">
          Summarize this page
        </button>
        <button class="prompt-btn" @click="setPrompt('Translate this page to Spanish')">
          Translate page
        </button>
        <button class="prompt-btn" @click="setPrompt('Write a polite email declining a meeting')">
          Write email
        </button>
        <button class="prompt-btn" @click="setPrompt('Explain this code: [paste code]')">
          Explain code
        </button>
        <button class="prompt-btn" @click="setPrompt('Check this page for phishing signs')">
          Check phishing
        </button>
      </div>
    </div>
    
    <div class="ai-example">
      <span class="ai-label">Example response:</span>
      <div class="ai-response">
        <strong>Summary:</strong> This page discusses the new privacy features in Onyx Browser including built-in ad blocking, fingerprinting protection, and local AI assistant. Key features include YouTube ad blocking, SponsorBlock integration, and container tabs for isolated browsing contexts.
      </div>
    </div>
    
    <div class="demo-info">
      <h4>Privacy-First AI</h4>
      <ul>
        <li>Runs locally via Ollama - no data leaves your device</li>
        <li>No API keys, no cloud, no tracking</li>
        <li>Supports multiple models (Llama 3, CodeLlama, Mistral, etc.)</li>
        <li>Phishing detection runs on-device</li>
        <li>Summarization, translation, coding assistance</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
const setPrompt = (prompt: string) => {
  // This would set the prompt in the AI panel
  console.log('Set prompt:', prompt)
}
</template>

<style scoped>
.ai-demo {
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

.ai-example {
  margin-bottom: 20px;
}

.ai-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--fg-tertiary);
  margin-bottom: 8px;
  display: block;
}

.ai-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.prompt-btn {
  padding: 8px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  color: var(--fg-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.prompt-btn:hover {
  border-color: var(--color-brand-500);
  background: var(--bg-tertiary);
  color: var(--fg-primary);
}

.ai-response {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: 10px;
  padding: 16px;
  font-size: 13px;
  color: var(--fg-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>