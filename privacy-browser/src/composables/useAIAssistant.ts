import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';

export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
  streaming?: boolean;
}

export interface AIConversation {
  id: string;
  title: string;
  messages: AIMessage[];
  model: string;
  createdAt: number;
  updatedAt: number;
}

export interface OllamaOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_predict?: number;
  stop?: string[];
  seed?: number;
  num_ctx?: number;
  repeat_penalty?: number;
}

export interface AISummaryOptions {
  length?: 'short' | 'medium' | 'long';
  format?: 'paragraph' | 'bullets' | 'key-points';
  language?: string;
}

export interface AITranslateOptions {
  targetLanguage: string;
  sourceLanguage?: 'auto' | string;
  formal?: boolean;
}

export interface AIWriteOptions {
  type: 'email' | 'article' | 'code' | 'summary' | 'creative' | 'business' | 'academic' | 'social';
  tone?: 'formal' | 'casual' | 'professional' | 'friendly' | 'persuasive' | 'technical';
  length?: 'short' | 'medium' | 'long';
  language?: string;
}

export interface AICodeOptions {
  language: string;
  task: 'generate' | 'explain' | 'debug' | 'refactor' | 'optimize' | 'document' | 'test';
  context?: string;
}

export interface PhishingCheckResult {
  isPhishing: boolean;
  confidence: number;
  indicators: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  details: {
    urlAnalysis: string;
    contentAnalysis: string;
    brandImpersonation: boolean;
    urgencyTactics: boolean;
    credentialHarvesting: boolean;
  };
}

export function useAIAssistant() {
  const isAvailable = ref(false);
  const isLoading = ref(false);
  const models = ref<OllamaModel[]>([]);
  const selectedModel = ref<string>('');
  const conversations = ref<AIConversation[]>([]);
  const activeConversation = ref<AIConversation | null>(null);
  const isStreaming = ref(false);
  const streamingContent = ref('');
  const error = ref<string | null>(null);
  
  const settings = ref<{
    defaultModel: string;
    defaultOptions: OllamaOptions;
    autoSaveConversations: boolean;
    maxHistory: number;
    enablePhishingDetection: boolean;
    phishingCheckInterval: number;
  }>({
    defaultModel: '',
    defaultOptions: {
      temperature: 0.7,
      top_p: 0.9,
      top_k: 40,
      num_predict: 2048,
      num_ctx: 4096,
      repeat_penalty: 1.1,
    },
    autoSaveConversations: true,
    maxHistory: 50,
    enablePhishingDetection: true,
    phishingCheckInterval: 5000,
  });

  const availableModels = computed(() => models.value);
  const currentConversation = computed(() => activeConversation.value);

  // Check Ollama availability
  const checkOllama = async () => {
    try {
      const available = await invoke<boolean>('ollama_check');
      isAvailable.value = available;
      if (available) {
        await loadModels();
      }
    } catch (err) {
      isAvailable.value = false;
      console.error('Ollama check failed:', err);
    }
  };

  const loadModels = async () => {
    try {
      models.value = await invoke<OllamaModel[]>('ollama_list_models');
      if (models.value.length > 0 && !selectedModel.value) {
        selectedModel.value = models.value[0].name;
        settings.value.defaultModel = models.value[0].name;
      }
    } catch (err) {
      console.error('Failed to load models:', err);
    }
  };

  const pullModel = async (modelName: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      await invoke('ollama_pull_model', { name: modelName });
      await loadModels();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to pull model';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteModel = async (modelName: string) => {
    try {
      await invoke('ollama_delete_model', { name: modelName });
      await loadModels();
    } catch (err) {
      console.error('Failed to delete model:', err);
      throw err;
    }
  };

  // Chat/Generate
  const generate = async (
    prompt: string,
    options?: OllamaOptions,
    model?: string
  ): Promise<string> => {
    isLoading.value = true;
    error.value = null;
    try {
      const result = await invoke<string>('ollama_generate', {
        model: model || selectedModel.value || settings.value.defaultModel,
        prompt,
        options: { ...settings.value.defaultOptions, ...options },
      });
      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Generation failed';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const streamGenerate = async (
    prompt: string,
    options?: OllamaOptions,
    model?: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> => {
    isStreaming.value = true;
    streamingContent.value = '';
    error.value = null;
    
    try {
      const result = await invoke<string>('ollama_stream_generate', {
        model: model || selectedModel.value || settings.value.defaultModel,
        prompt,
        options: { ...settings.value.defaultOptions, ...options },
        onChunk: (chunk: string) => {
          streamingContent.value += chunk;
          onChunk?.(chunk);
        },
      });
      isStreaming.value = false;
      return result;
    } catch (err) {
      isStreaming.value = false;
      error.value = err instanceof Error ? err.message : 'Stream generation failed';
      throw err;
    }
  };

  // Chat/Conversation
  const chat = async (
    messages: AIMessage[],
    options?: OllamaOptions,
    model?: string
  ): Promise<string> => {
    isLoading.value = true;
    error.value = null;
    try {
      const result = await invoke<string>('ollama_chat', {
        model: model || selectedModel.value || settings.value.defaultModel,
        messages,
        options: { ...settings.value.defaultOptions, ...options },
      });
      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Chat failed';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const streamChat = async (
    messages: AIMessage[],
    options?: OllamaOptions,
    model?: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> => {
    isStreaming.value = true;
    streamingContent.value = '';
    error.value = null;
    
    try {
      const result = await invoke<string>('ollama_stream_chat', {
        model: model || selectedModel.value || settings.value.defaultModel,
        messages,
        options: { ...settings.value.defaultOptions, ...options },
        onChunk: (chunk: string) => {
          streamingContent.value += chunk;
          onChunk?.(chunk);
        },
      });
      isStreaming.value = false;
      return result;
    } catch (err) {
      isStreaming.value = false;
      error.value = err instanceof Error ? err.message : 'Stream chat failed';
      throw err;
    }
  };

  // Conversation Management
  const createConversation = (model?: string): AIConversation => {
    const conversation: AIConversation = {
      id: crypto.randomUUID(),
      title: 'New Conversation',
      messages: [],
      model: model || selectedModel.value || settings.value.defaultModel,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    conversations.value.unshift(conversation);
    if (settings.value.autoSaveConversations) {
      saveConversations();
    }
    return conversation;
  };

  const setActiveConversation = (conversation: AIConversation) => {
    activeConversation.value = conversation;
  };

  const addMessage = (conversationId: string, message: Omit<AIMessage, 'id' | 'timestamp'>) => {
    const conversation = conversations.value.find(c => c.id === conversationId);
    if (conversation) {
      conversation.messages.push({
        ...message,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      });
      conversation.updatedAt = Date.now();
      if (conversation.messages.length === 1) {
        conversation.title = message.content.slice(0, 50);
      }
      if (settings.value.autoSaveConversations) {
        saveConversations();
      }
    }
  };

  const deleteConversation = (conversationId: string) => {
    conversations.value = conversations.value.filter(c => c.id !== conversationId);
    if (activeConversation.value?.id === conversationId) {
      activeConversation.value = null;
    }
    saveConversations();
  };

  const clearConversationHistory = (conversationId: string) => {
    const conversation = conversations.value.find(c => c.id === conversationId);
    if (conversation) {
      conversation.messages = [];
      conversation.updatedAt = Date.now();
      saveConversations();
    }
  };

  const saveConversations = () => {
    try {
      const data = conversations.value.slice(0, settings.value.maxHistory);
      localStorage.setItem('ai-conversations', JSON.stringify(data));
    } catch (err) {
      console.error('Failed to save conversations:', err);
    }
  };

  const loadConversations = () => {
    try {
      const saved = localStorage.getItem('ai-conversations');
      if (saved) {
        conversations.value = JSON.parse(saved);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  // Specialized AI Functions
  const summarize = async (
    text: string,
    options?: AISummaryOptions
  ): Promise<string> => {
    const prompt = `Summarize the following text${options?.length ? ` in ${options.length} format` : ''}${options?.format ? ` as ${options.format}` : ''}${options?.language ? ` in ${options.language}` : ''}:\n\n${text}`;
    return generate(prompt, { temperature: 0.3, num_predict: options?.length === 'long' ? 1024 : 512 });
  };

  const translate = async (
    text: string,
    options: AITranslateOptions
  ): Promise<string> => {
    const prompt = `Translate the following text to ${options.targetLanguage}${options.sourceLanguage && options.sourceLanguage !== 'auto' ? ` from ${options.sourceLanguage}` : ''}${options.formal ? ' in a formal tone' : ''}:\n\n${text}`;
    return generate(prompt, { temperature: 0.3 });
  };

  const write = async (
    prompt: string,
    options: AIWriteOptions
  ): Promise<string> => {
    const systemPrompt = `You are an expert writer. Write a ${options.type}${options.tone ? ` in a ${options.tone} tone` : ''}${options.length ? ` of ${options.length} length` : ''}${options.language ? ` in ${options.language}` : ''}.`;
    const messages: AIMessage[] = [
      { id: 'sys', role: 'system', content: systemPrompt, timestamp: Date.now() },
      { id: 'usr', role: 'user', content: prompt, timestamp: Date.now() },
    ];
    return chat(messages, { temperature: options.type === 'creative' ? 0.8 : 0.7 });
  };

  const code = async (
    prompt: string,
    options: AICodeOptions
  ): Promise<string> => {
    const systemPrompt = `You are an expert ${options.language} developer. ${options.task.charAt(0).toUpperCase() + options.task.slice(1)} the following code${options.context ? ` with context: ${options.context}` : ''}. Provide clean, well-commented code.`;
    const messages: AIMessage[] = [
      { id: 'sys', role: 'system', content: systemPrompt, timestamp: Date.now() },
      { id: 'usr', role: 'user', content: prompt, timestamp: Date.now() },
    ];
    return chat(messages, { temperature: 0.2, num_predict: 4096 });
  };

  // Phishing Detection
  const checkPhishing = async (url: string, pageContent?: string): Promise<PhishingCheckResult> => {
    if (!settings.value.enablePhishingDetection) {
      return { isPhishing: false, confidence: 0, indicators: [], riskLevel: 'low', details: { urlAnalysis: '', contentAnalysis: '', brandImpersonation: false, urgencyTactics: false, credentialHarvesting: false } };
    }
    
    try {
      return await invoke<PhishingCheckResult>('ollama_check_phishing', { url, pageContent });
    } catch (err) {
      console.error('Phishing check failed:', err);
      return { isPhishing: false, confidence: 0, indicators: [], riskLevel: 'low', details: { urlAnalysis: '', contentAnalysis: '', brandImpersonation: false, urgencyTactics: false, credentialHarvesting: false } };
    }
  };

  const startPhishingMonitor = (interval?: number) => {
    // This would be implemented with a background timer
    // Checking current tab URL periodically
  };

  const stopPhishingMonitor = () => {
    // Stop the monitor
  };

  // Embeddings
  const getEmbeddings = async (texts: string[], model?: string): Promise<number[][]> => {
    try {
      return await invoke<number[][]>('ollama_embeddings', { model: model || 'nomic-embed-text', texts });
    } catch (err) {
      console.error('Embeddings failed:', err);
      return [];
    }
  };

  // Model Management
  const getModelInfo = async (modelName: string) => {
    try {
      return await invoke<any>('ollama_model_info', { name: modelName });
    } catch (err) {
      console.error('Failed to get model info:', err);
      return null;
    }
  };

  // Utility
  const countTokens = async (text: string, model?: string): Promise<number> => {
    try {
      return await invoke<number>('ollama_count_tokens', { model: model || selectedModel.value, text });
    } catch (err) {
      // Rough estimation: ~4 chars per token
      return Math.ceil(text.length / 4);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  onMounted(async () => {
    loadConversations();
    await checkOllama();
  });

  onUnmounted(() => {
    stopPhishingMonitor();
  });

  watch(settings, () => {
    try {
      localStorage.setItem('ai-settings', JSON.stringify(settings.value));
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }, { deep: true });

  return {
    // State
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
    
    // Computed
    availableModels,
    currentConversation,
    
    // Core
    checkOllama,
    loadModels,
    pullModel,
    deleteModel,
    generate,
    streamGenerate,
    chat,
    streamChat,
    
    // Conversations
    createConversation,
    setActiveConversation,
    addMessage,
    deleteConversation,
    clearConversationHistory,
    loadConversations,
    saveConversations,
    
    // Specialized
    summarize,
    translate,
    write,
    code,
    checkPhishing,
    startPhishingMonitor,
    stopPhishingMonitor,
    getEmbeddings,
    getModelInfo,
    countTokens,
    
    // Model Management
    pullModel,
    deleteModel,
    getModelInfo,
    
    // Utils
    formatFileSize,
  };
}