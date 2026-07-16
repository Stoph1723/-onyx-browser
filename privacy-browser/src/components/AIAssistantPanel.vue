<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useAIAssistant } from '../composables/useAIAssistant';
import Button from './ui/Button.vue';
import Input from './ui/Input.vue';
import Select from './ui/Select.vue';
import Switch from './ui/Switch.vue';
import Dialog from './ui/Dialog.vue';

const {
  isAvailable,
  isLoading,
  isStreaming,
  streamingContent,
  models,
  selectedModel,
  conversations,
  activeConversation,
  error,
  settings,
  currentConversation,
  createConversation,
  setActiveConversation,
  addMessage,
  deleteConversation,
  clearConversationHistory,
  generate,
  streamGenerate,
  chat,
  streamChat,
  summarize,
  translate,
  write,
  code,
  pullModel,
  deleteModel,
  formatFileSize,
} = useAIAssistant();

const showPanel = ref(false);
const showModelDialog = ref(false);
const showSettingsDialog = ref(false);
const showNewModelDialog = ref(false);
const newModelName = ref('');
const searchQuery = ref('');
const messageInput = ref('');
const systemPrompt = ref('');
const showSystemPrompt = ref(false);
const activeTab = ref<'chat' | 'history' | 'models' | 'settings'>('chat');
const sidebarWidth = ref(300);
const isResizing = ref(false);

// Model Management
const availableModels = computed(() => models.value.filter(m => 
  m.name.toLowerCase().includes(searchQuery.value.toLowerCase())
));

const installedModels = computed(() => models.value.filter(m => m.details));

// Chat
const sendMessage = async () => {
  if (!messageInput.value.trim() || isLoading.value || isStreaming.value) return;
  
  const userMessage = messageInput.value.trim();
  messageInput.value = '';
  
  let conversation = activeConversation.value;
  if (!conversation) {
    conversation = createConversation();
    setActiveConversation(conversation);
  }
  
  // Add user message
  addMessage(conversation.id, {
    role: 'user',
    content: userMessage,
  });
  
  // Add assistant placeholder
  const assistantMsgId = crypto.randomUUID();
  addMessage(conversation.id, {
    id: assistantMsgId,
    role: 'assistant',
    content: '',
    streaming: true,
  });
  
  try {
    const messages = conversation.messages.filter(m => !m.streaming).map(m => ({
      role: m.role,
      content: m.content,
    }));
    
    let fullResponse = '';
    await streamChat(
      messages,
      { temperature: 0.7 },
      conversation.model,
      (chunk) => {
        fullResponse += chunk;
        // Update the streaming message
        const msg = conversation.messages.find(m => m.id === assistantMsgId);
        if (msg) {
          msg.content = fullResponse;
        }
      }
    );
    
    // Mark as complete
    const msg = conversation.messages.find(m => m.id === assistantMsgId);
    if (msg) {
      msg.streaming = false;
    }
  } catch (err) {
    console.error('Chat error:', err);
    // Remove failed message
    const idx = conversation.messages.findIndex(m => m.id === assistantMsgId);
    if (idx >= 0) conversation.messages.splice(idx, 1);
  }
};

const stopGeneration = () => {
  // Would need to implement abort in backend
};

// Model Management
const handlePullModel = async () => {
  if (!newModelName.value.trim()) return;
  try {
    await pullModel(newModelName.value.trim());
    newModelName.value = '';
    showNewModelDialog.value = false;
  } catch (err) {
    console.error('Pull failed:', err);
  }
};

const handleDeleteModel = async (modelName: string) => {
  if (!confirm(`Delete model ${modelName}?`)) return;
  try {
    await deleteModel(modelName);
  } catch (err) {
    console.error('Delete failed:', err);
  }
};

const selectModel = (modelName: string) => {
  selectedModel.value = modelName;
};

// Conversations
const startNewChat = () => {
  const conv = createConversation();
  setActiveConversation(conv);
};

const handleDeleteConversation = (id: string) => {
  if (confirm('Delete this conversation?')) {
    deleteConversation(id);
  }
};

const handleClearConversation = (id: string) => {
  if (confirm('Clear all messages in this conversation?')) {
    clearConversationHistory(id);
  }
};

const generateTitle = (messages: any[]) => {
  const firstUserMsg = messages.find(m => m.role === 'user');
  return firstUserMsg ? firstUserMsg.content.slice(0, 50) : 'New Conversation';
};

// Quick Actions
const handleSummarize = async () => {
  if (!activeConversation.value) return;
  const text = activeConversation.value.messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => m.content)
    .join('\n\n');
  if (!text) return;
  
  const summary = await summarize(text, { length: 'medium', format: 'bullets' });
  addMessage(activeConversation.value!.id, {
    role: 'assistant',
    content: `**Summary:**\n\n${summary}`,
  });
};

const handleTranslate = async () => {
  // Would open a dialog for target language
};

const handleWriteEmail = async () => {
  // Would open a dialog for topic
};

const handleCodeHelp = async () => {
  // Would open a dialog for code task
};

// Export/Import
const exportConversation = (conversation: any) => {
  const data = JSON.stringify(conversation, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `conversation-${conversation.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const importConversation = async (file: File) => {
  const text = await file.text();
  const data = JSON.parse(text);
  if (data.id && data.messages) {
    conversations.value.unshift(data);
    saveConversations();
  }
};

const saveConversations = () => {
  try {
    localStorage.setItem('ai-conversations', JSON.stringify(conversations.value));
  } catch (err) {
    console.error('Failed to save:', err);
  }
};

// Resize handler
const startResize = (e: MouseEvent) => {
  e.preventDefault();
  isResizing.value = true;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  
  const handleMove = (e: MouseEvent) => {
    const newWidth = Math.max(280, Math.min(600, e.clientX));
    sidebarWidth.value = newWidth;
  };
  
  const handleUp = () => {
    isResizing.value = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('mouseup', handleUp);
  };
  
  document.addEventListener('mousemove', handleMove);
  document.addEventListener('mouseup', handleUp);
};

onMounted(() => {
  // Load settings
  const saved = localStorage.getItem('ai-settings');
  if (saved) {
    try {
      settings.value = { ...settings.value, ...JSON.parse(saved) };
    } catch (e) {}
  }
});

onUnmounted(() => {
  saveConversations();
});

watch(settings, () => {
  localStorage.setItem('ai-settings', JSON.stringify(settings.value));
}, { deep: true });
</script>

<template>
  <div class="ai-assistant-panel" :class="{ open: showPanel }">
    <!-- Resize Handle -->
    <div 
      class="resize-handle" 
      @mousedown="startResize"
      :class="{ 'panel-right': false }"
    ></div>

    <div class="panel-container" :style="{ width: sidebarWidth + 'px' }">
      <!-- Header -->
      <header class="panel-header">
        <div class="header-left">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a10 10 0 0 1 10 10c0 1.8-.6 3.5-1.6 4.8" />
            <path d="M8 14v5a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-5" />
            <path d="M12 2v5" />
            <path d="M12 19v2" />
            <path d="m4.93 16.93 1.41 1.41" />
            <path d="m17.66 16.93-1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="M6.34 17.66l-1.41 1.41" />
            <path d="M19.07 4.93l-1.41-1.41" />
          </svg>
          <h2>AI Assistant</h2>
        </div>
        <div class="header-actions">
          <button class="icon-btn" @click="activeTab = 'chat'" :class="{ active: activeTab === 'chat' }" title="Chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button class="icon-btn" @click="activeTab = 'history'" :class="{ active: activeTab === 'history' }" title="History">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
          <button class="icon-btn" @click="activeTab = 'models'" :class="{ active: activeTab === 'models' }" title="Models">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 12h12" />
              <path d="M10 16h4" />
            </svg>
          </button>
          <button class="icon-btn" @click="showSettingsDialog = true" title="Settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <button class="icon-btn close-btn" @click="showPanel = false" title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      <!-- Tab Navigation -->
      <nav class="tab-nav" role="tablist">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
          role="tab"
          :aria-selected="activeTab === tab.id"
        >
          <component :is="tab.icon" />
          {{ tab.label }}
        </button>
      </nav>

      <!-- Tab Panels -->
      <div class="tab-panels">
        <!-- Chat Tab -->
        <div v-if="activeTab === 'chat'" class="tab-panel" role="tabpanel">
          <div class="chat-container">
            <div class="messages-area" ref="messagesArea">
              <div v-if="!activeConversation" class="welcome-screen">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.3; margin-bottom: 16px;">
                  <path d="M12 2a10 10 0 0 1 10 10c0 1.8-.6 3.5-1.6 4.8" />
                  <path d="M8 14v5a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-5" />
                  <path d="M12 2v5" />
                  <path d="M12 19v2" />
                  <path d="m4.93 16.93 1.41 1.41" />
                  <path d="m17.66 16.93-1.41 1.41" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                  <path d="M6.34 17.66l-1.41 1.41" />
                  <path d="M19.07 4.93l-1.41-1.41" />
                </svg>
                <h3>Welcome to AI Assistant</h3>
                <p>Start a new conversation or select a model to begin</p>
                <div class="welcome-actions">
                  <button class="btn-primary" @click="startNewChat">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    New Chat
                  </button>
                  <button class="btn-secondary" @click="activeTab = 'models'">
                    Browse Models
                  </button>
                </div>
                <div class="quick-actions">
                  <h4>Quick Actions</h4>
                  <div class="action-grid">
                    <button class="action-btn" @click="handleSummarize">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      <span>Summarize</span>
                    </button>
                    <button class="action-btn" @click="handleTranslate">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      <span>Translate</span>
                    </button>
                    <button class="action-btn" @click="handleWriteEmail">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                      <span>Write Email</span>
                    </button>
                    <button class="action-btn" @click="handleCodeHelp">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                      <span>Code Help</span>
                    </button>
                  </div>
                </div>
              </div>

              <div v-else class="messages-list">
                <div 
                  v-for="msg in activeConversation.messages" 
                  :key="msg.id"
                  :class="['message', msg.role, { streaming: msg.streaming }]"
                >
                  <div class="message-avatar">
                    <svg v-if="msg.role === 'user'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M12 2a10 10 0 0 1 10 10c0 1.8-.6 3.5-1.6 4.8" />
                      <path d="M8 14v5a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-5" />
                      <path d="M12 2v5" />
                      <path d="M12 19v2" />
                    </svg>
                  </div>
                  <div class="message-content">
                    <div class="message-text" v-html="formatMessage(msg.content)"></div>
                    <div class="message-meta">
                      <span class="msg-time">{{ formatTime(msg.timestamp) }}</span>
                      <span v-if="msg.model" class="msg-model">{{ msg.model }}</span>
                    </div>
                    <div v-if="msg.streaming" class="streaming-indicator">
                      <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Input Area -->
            <div class="input-area">
              <div class="input-toolbar">
                <button class="tool-btn" @click="showSystemPrompt = !showSystemPrompt" title="System Prompt">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2a10 10 0 0 1 10 10c0 1.8-.6 3.5-1.6 4.8" />
                    <path d="M8 14v5a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-5" />
                  </svg>
                </button>
                <button class="tool-btn" title="Attach File">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </button>
                <button class="tool-btn" title="Code Block">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                </button>
              </div>
              <div v-if="showSystemPrompt" class="system-prompt-input">
                <Input
                  v-model="systemPrompt"
                  placeholder="System prompt (optional)..."
                  class="system-prompt-field"
                />
              </div>
              <div class="message-input-container">
                <textarea
                  v-model="messageInput"
                  @keydown.enter.exact="sendMessage"
                  @keydown.shift.enter="addNewline"
                  placeholder="Message AI..."
                  class="message-input"
                  :disabled="isLoading || isStreaming"
                  rows="1"
                  ref="messageTextarea"
                ></textarea>
                <div class="input-actions">
                  <button class="icon-btn" @click="sendMessage" :disabled="!messageInput.trim() || isLoading || isStreaming" title="Send">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                  <button v-if="isStreaming" class="icon-btn stop-btn" @click="stopGeneration" title="Stop">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

        <!-- History Tab -->
        <div v-if="activeTab === 'history'" class="tab-panel" role="tabpanel">
          <div class="history-header">
            <h3>Conversation History</h3>
            <Input
              v-model="searchQuery"
              placeholder="Search conversations..."
              class="search-input"
              leadingIcon="
                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                  <circle cx='11' cy='11' r='8' />
                  <line x1='21' y1='21' x2='16.65' y2='16.65' />
                </svg>
              "
            />
          </div>
          <div class="history-list">
            <div 
              v-for="conv in filteredConversations" 
              :key="conv.id"
              :class="['history-item', { active: activeConversation?.id === conv.id }]"
              @click="setActiveConversation(conv)"
            >
              <div class="conv-info">
                <h4>{{ conv.title }}</h4>
                <span class="conv-meta">{{ conv.messages.length }} messages • {{ formatDate(conv.updatedAt) }}</span>
              </div>
              <div class="conv-actions">
                <button class="icon-btn small" @click.stop="exportConversation(conv)" title="Export">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </button>
                <button class="icon-btn small danger" @click.stop="handleDeleteConversation(conv.id)" title="Delete">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
            <div v-if="filteredConversations.length === 0" class="empty-history">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.3;">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <p>No conversations yet</p>
              <button class="btn-primary" @click="startNewChat">Start New Chat</button>
            </div>
          </div>
        </div>

        <!-- Models Tab -->
        <div v-if="activeTab === 'models'" class="tab-panel" role="tabpanel">
          <div class="models-header">
            <h3>Available Models</h3>
            <div class="models-actions">
              <button class="btn-secondary" @click="showNewModelDialog = true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Pull Model
              </button>
            </div>
          </div>
          
          <Input
            v-model="searchQuery"
            placeholder="Search models..."
            class="model-search"
            leadingIcon="
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                <circle cx='11' cy='11' r='8' />
                <line x1='21' y1='21' x2='16.65' y2='16.65' />
              </svg>
            "
          />

          <div class="models-grid">
            <div v-for="model in availableModels" :key="model.name" class="model-card" :class="{ selected: selectedModel === model.name }">
              <div class="model-header">
                <div class="model-info">
                  <h4>{{ model.name }}</h4>
                  <span class="model-size">{{ formatFileSize(model.size) }}</span>
                </div>
                <span class="model-tag" v-if="selectedModel === model.name">Active</span>
              </div>
              <div class="model-details">
                <div class="detail-row">
                  <span>Family:</span>
                  <span>{{ model.details?.family || 'N/A' }}</span>
                </div>
                <div class="detail-row">
                  <span>Parameters:</span>
                  <span>{{ model.details?.parameter_size || 'N/A' }}</span>
                </div>
                <div class="detail-row">
                  <span>Quantization:</span>
                  <span>{{ model.details?.quantization_level || 'N/A' }}</span>
                </div>
              </div>
              <div class="model-actions">
                <button 
                  class="btn-primary small" 
                  @click="selectModel(model.name)"
                  :disabled="selectedModel === model.name"
                >
                  {{ selectedModel === model.name ? 'Active' : 'Select' }}
                </button>
                <button class="btn-danger small" @click="handleDeleteModel(model.name)" title="Delete">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Settings Tab -->
        <div v-if="activeTab === 'settings'" class="tab-panel" role="tabpanel">
          <div class="settings-content">
            <div class="settings-section">
              <h3>General</h3>
              <div class="setting-row">
                <label>Default Model</label>
                <Select
                  v-model="settings.defaultModel"
                  :options="models.map(m => ({ value: m.name, label: m.name }))"
                />
              </div>
              <div class="setting-row">
                <label>Max History</label>
                <Input
                  v-model.number="settings.maxHistory"
                  type="number"
                  min="10"
                  max="200"
                />
              </div>
              <div class="setting-row">
                <Switch v-model="settings.autoSaveConversations" label="Auto-save conversations" />
              </div>
              <div class="setting-row">
                <Switch v-model="settings.enablePhishingDetection" label="Enable Phishing Detection" />
              </div>
            </div>

            <div class="settings-section">
              <h3>Default Generation Options</h3>
              <div class="setting-row">
                <label>Temperature: {{ settings.defaultOptions.temperature }}</label>
                <input type="range" v-model.number="settings.defaultOptions.temperature" min="0" max="2" step="0.1" />
              </div>
              <div class="setting-row">
                <label>Top P: {{ settings.defaultOptions.top_p }}</label>
                <input type="range" v-model.number="settings.defaultOptions.top_p" min="0" max="1" step="0.05" />
              </div>
              <div class="setting-row">
                <label>Top K: {{ settings.defaultOptions.top_k }}</label>
                <input type="range" v-model.number="settings.defaultOptions.top_k" min="1" max="100" step="1" />
              </div>
              <div class="setting-row">
                <label>Max Tokens: {{ settings.defaultOptions.num_predict }}</label>
                <input type="range" v-model.number="settings.defaultOptions.num_predict" min="100" max="8192" step="100" />
              </div>
              <div class="setting-row">
                <label>Context Window: {{ settings.defaultOptions.num_ctx }}</label>
                <input type="range" v-model.number="settings.defaultOptions.num_ctx" min="512" max="32768" step="512" />
              </div>
              <div class="setting-row">
                <label>Repeat Penalty: {{ settings.defaultOptions.repeat_penalty }}</label>
                <input type="range" v-model.number="settings.defaultOptions.repeat_penalty" min="1" max="2" step="0.05" />
              </div>
            </div>

            <div class="settings-section">
              <h3>Phishing Detection</h3>
              <div class="setting-row">
                <label>Check Interval (ms)</label>
                <Input v-model.number="settings.phishingCheckInterval" type="number" min="1000" step="1000" />
              </div>
            </div>

            <div class="settings-section">
              <h3>Data Management</h3>
              <div class="data-actions">
                <button class="btn-secondary" @click="exportAllConversations">Export All Conversations</button>
                <button class="btn-secondary" @click="importConversations">Import Conversations</button>
                <button class="btn-danger" @click="clearAllConversations">Clear All History</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Model Pull Dialog -->
      <Dialog v-model:open="showNewModelDialog" title="Pull New Model" width="450">
        <Input
          v-model="newModelName"
          label="Model Name"
          placeholder="e.g., llama3.2, codellama, mistral"
          @keydown.enter="handlePullModel"
          autofocus
        />
        <p class="dialog-hint">Enter the model name from <a href="https://ollama.com/library" target="_blank">Ollama Library</a></p>
        <div class="dialog-actions">
          <Button variant="ghost" @click="showNewModelDialog = false">Cancel</Button>
          <Button variant="primary" @click="handlePullModel" :loading="isLoading">Pull Model</Button>
        </div>
      </Dialog>

      <!-- Settings Dialog -->
      <Dialog v-model:open="showSettingsDialog" title="AI Settings" width="500">
        <!-- Settings content would go here -->
        <div class="dialog-actions">
          <Button variant="ghost" @click="showSettingsDialog = false">Close</Button>
        </div>
      </Dialog>

      <!-- Error Toast -->
      <div v-if="error" class="error-toast">
        {{ error }}
        <button @click="error = null">&times;</button>
      </div>
    </div>
  </div>
</template>

<script>
const tabs = [
  { id: 'chat', label: 'Chat', icon: () => h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, [h('path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' })]) },
  { id: 'history', label: 'History', icon: () => h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, [h('circle', { cx: 12, cy: 12, r: 10 }), h('polyline', { points: '12 6 12 12 16 14' })]) },
  { id: 'models', label: 'Models', icon: () => h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, [h('rect', { x: 2, y: 4, width: 20, height: 16, rx: 2 }), h('path', { d: 'M6 12h12' }), h('path', { d: 'M10 16h4' })]) },
  { id: 'settings', label: 'Settings', icon: () => h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, [h('circle', { cx: 12, cy: 12, r: 3 }), h('path', { d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z' }) }) },
];
</script>

<style scoped>
.ai-assistant-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-sidebar);
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-primary);
  transform: translateX(100%);
  transition: transform var(--duration-normal) var(--ease-out);
  box-shadow: var(--shadow-xl);
  font-family: var(--font-sans);
}

.ai-assistant-panel.open {
  transform: translateX(0);
}

.resize-handle {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  z-index: 10;
}

.resize-handle:hover {
  background: var(--color-brand-500);
}

.panel-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.header-left h2 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--fg-secondary);
  cursor: pointer;
  transition: var(--transition-fast);
}

.icon-btn:hover {
  background: var(--bg-tertiary);
  color: var(--fg-primary);
}

.icon-btn.active {
  background: var(--accent-muted);
  color: var(--color-brand-500);
}

.close-btn:hover {
  background: var(--color-error-100) !important;
  color: var(--color-error-600) !important;
}

@media (prefers-color-scheme: dark) {
  .close-btn:hover {
    background: var(--color-error-900) !important;
    color: var(--color-error-400) !important;
  }
}

.tab-nav {
  display: flex;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  padding: 0 var(--space-2);
  overflow-x: auto;
  flex-shrink: 0;
}

.tab-nav button {
  padding: var(--space-2) var(--space-3);
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--fg-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: var(--transition-fast);
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.tab-nav button:hover {
  color: var(--fg-primary);
  background: var(--bg-tertiary);
}

.tab-nav button.active {
  color: var(--color-brand-500);
  border-bottom-color: var(--color-brand-500);
}

.tab-panels {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tab-panel {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Chat Tab */
.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.welcome-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  text-align: center;
  padding: var(--space-8);
  color: var(--fg-tertiary);
}

.welcome-screen h3 {
  margin: var(--space-4) 0 var(--space-2);
  font-size: var(--text-lg);
  color: var(--fg-primary);
}

.welcome-screen p {
  margin: 0 0 var(--space-6);
  font-size: var(--text-sm);
}

.welcome-actions {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-8);
}

.quick-actions h4 {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin: 0 0 var(--space-3);
  color: var(--fg-secondary);
}

.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
  color: var(--fg-primary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: var(--transition-fast);
}

.action-btn:hover {
  border-color: var(--color-brand-500);
  background: var(--accent-muted);
}

.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  flex: 1;
  overflow-y: auto;
}

.message {
  display: flex;
  gap: var(--space-3);
  max-width: 85%;
  animation: fadeIn var(--duration-fast) var(--ease-out);
}

.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message.assistant {
  align-self: flex-start;
}

.message.streaming {
  opacity: 0.8;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.message-avatar {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--bg-tertiary);
  color: var(--fg-secondary);
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-text {
  line-height: var(--leading-relaxed);
  font-size: var(--text-sm);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.message-text pre {
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  overflow-x: auto;
  margin: var(--space-2) 0;
  font-size: var(--text-xs);
}

.message-text code {
  font-family: var(--font-mono);
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
}

.message-text pre code {
  background: transparent;
  padding: 0;
  font-size: inherit;
}

.message-text ul, .message-text ol {
  margin: var(--space-2) 0;
  padding-left: var(--space-6);
}

.message-text blockquote {
  border-left: 3px solid var(--color-brand-500);
  padding-left: var(--space-3);
  margin: var(--space-2) 0;
  color: var(--fg-secondary);
  font-style: italic;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-1);
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
}

.msg-model {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background: var(--bg-tertiary);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.streaming-indicator {
  margin-top: var(--space-1);
  color: var(--color-brand-500);
}

.typing-dots {
  display: inline-flex;
  gap: 2px;
}

.typing-dots span {
  animation: bounce 1.4s infinite ease-in-out both;
}

.typing-dots span:nth-child(1) { animation-delay: -0.32s; }
.typing-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.input-area {
  padding: var(--space-3) var(--space-4);
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-primary);
  flex-shrink: 0;
}

.input-toolbar {
  display: flex;
  gap: var(--space-1);
  margin-bottom: var(--space-2);
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--fg-secondary);
  cursor: pointer;
  transition: var(--transition-fast);
}

.tool-btn:hover {
  background: var(--bg-tertiary);
  color: var(--fg-primary);
}

.system-prompt-input {
  margin-bottom: var(--space-2);
}

.system-prompt-field {
  width: 100%;
}

.message-input-container {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
}

.message-input {
  flex: 1;
  min-height: 44px;
  max-height: 150px;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  background: var(--bg-primary);
  color: var(--fg-primary);
  font-family: inherit;
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  resize: none;
  outline: none;
  transition: var(--transition-fast);
}

.message-input:focus {
  border-color: var(--border-focus);
  box-shadow: var(--focus-ring);
}

.message-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.input-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.stop-btn {
  color: var(--color-error-500) !important;
}

.stop-btn:hover {
  background: var(--color-error-100) !important;
  color: var(--color-error-600) !important;
}

@media (prefers-color-scheme: dark) {
  .stop-btn:hover {
    background: var(--color-error-900) !important;
    color: var(--color-error-400) !important;
  }
}

/* History Tab */
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-primary);
}

.history-header h3 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.search-input {
  width: 200px;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition-fast);
  gap: var(--space-3);
}

.history-item:hover {
  background: var(--bg-tertiary);
}

.history-item.active {
  background: var(--accent-muted);
}

.conv-info {
  flex: 1;
  min-width: 0;
}

.conv-info h4 {
  margin: 0 0 2px;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-meta {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
}

.conv-actions {
  display: flex;
  gap: var(--space-1);
  opacity: 0;
  transition: var(--transition-fast);
}

.history-item:hover .conv-actions {
  opacity: 1;
}

.icon-btn.small {
  width: 24px;
  height: 24px;
}

.icon-btn.danger {
  color: var(--color-error-500);
}

.icon-btn.danger:hover {
  background: var(--color-error-100);
  color: var(--color-error-600);
}

@media (prefers-color-scheme: dark) {
  .icon-btn.danger:hover {
    background: var(--color-error-900);
    color: var(--color-error-400);
  }
}

.empty-history {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  text-align: center;
  color: var(--fg-tertiary);
  gap: var(--space-3);
  padding: var(--space-8);
}

.empty-history p {
  margin: 0;
  font-weight: var(--font-medium);
  color: var(--fg-secondary);
}

/* Models Tab */
.models-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-primary);
}

.models-header h3 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.models-actions {
  display: flex;
  gap: var(--space-2);
}

.model-search {
  width: 100%;
  max-width: 300px;
  margin: 0 var(--space-4) var(--space-3);
}

.models-grid {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-3);
}

.model-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  transition: var(--transition-fast);
}

.model-card:hover {
  border-color: var(--border-secondary);
  box-shadow: var(--shadow-md);
}

.model-card.selected {
  border-color: var(--color-brand-500);
  background: var(--accent-muted);
}

.model-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.model-info h4 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.model-size {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  font-family: var(--font-mono);
}

.model-tag {
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  padding: 1px 6px;
  border-radius: var(--radius-full);
  background: var(--color-brand-100);
  color: var(--color-brand-700);
}

@media (prefers-color-scheme: dark) {
  .model-tag {
    background: var(--color-brand-900);
    color: var(--color-brand-300);
  }
}

.model-details {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  margin-bottom: var(--space-2);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2px;
}

.detail-row span:first-child {
  color: var(--fg-secondary);
}

.model-actions {
  display: flex;
  gap: var(--space-2);
}

.btn-small {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-xs);
}

/* Settings Tab */
.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
}

.settings-section {
  margin-bottom: var(--space-6);
}

.settings-section h3 {
  margin: 0 0 var(--space-3);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--fg-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border-primary);
}

.setting-row label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  min-width: 160px;
}

.setting-row input[type="range"] {
  flex: 1;
  max-width: 200px;
}

.data-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* Dialogs */
.dialog-hint {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  margin: var(--space-2) 0 0;
}

.dialog-hint a {
  color: var(--color-brand-500);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-primary);
}

/* Error Toast */
.error-toast {
  position: fixed;
  bottom: var(--space-4);
  right: var(--space-4);
  z-index: var(--z-toast);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-error-100);
  border: 1px solid var(--color-error-300);
  border-radius: var(--radius-lg);
  color: var(--color-error-700);
  font-size: var(--text-sm);
  box-shadow: var(--shadow-xl);
  animation: slideIn var(--duration-normal) var(--ease-out);
}

@media (prefers-color-scheme: dark) {
  .error-toast {
    background: var(--color-error-900);
    border-color: var(--color-error-700);
    color: var(--color-error-300);
  }
}

.error-toast button {
  background: none;
  border: none;
  color: inherit;
  font-size: var(--text-lg);
  cursor: pointer;
  opacity: 0.7;
  transition: var(--transition-fast);
}

.error-toast button:hover {
  opacity: 1;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .ai-assistant-panel {
    width: 100vw;
    max-width: 100%;
  }
  
  .welcome-actions {
    flex-direction: column;
  }
  
  .action-grid {
    grid-template-columns: 1fr;
  }
  
  .models-grid {
    grid-template-columns: 1fr;
  }
  
  .search-input {
    width: 100%;
  }
  
  .filter-group {
    flex-direction: column;
  }
  
  .header-right {
    width: 100%;
    justify-content: space-between;
  }
}
</style>