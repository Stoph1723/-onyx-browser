<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { webview } from '@tauri-apps/api/webview';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { Tab } from '../types';

interface Props {
  tab: Tab;
  active: boolean;
}

interface Emits {
  'title-change': [title: string];
  'url-change': [url: string];
  'loading-change': [loading: boolean];
  'favicon-change': [favicon: string];
  'can-go-back-change': [canGoBack: boolean];
  'can-go-forward-change': [canGoForward: boolean];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const webviewRef = ref<HTMLElement | null>(null);
const webviewId = `webview-${props.tab.id}`;
let unlistenFn: (() => void) | null = null;
let initialized = false;

const initWebview = async () => {
  if (initialized) return;

  try {
    await webview.createWebview(webviewId, {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      transparent: false,
      backgroundColor: '#1a1a2e',
      url: props.tab.url || 'https://duckduckgo.com',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) PrivacyBrowser/1.0 Chrome/120.0.0.0 Safari/537.36'
      },
      zoomHotkeysEnabled: true,
      devtools: true,
      skipTaskbar: true,
    });

    const wv = await webview.getWebview(webviewId);

    wv.onPageLoad(({ payload }) => {
      if (payload.event === 'started') {
        emit('loading-change', true);
      } else if (payload.event === 'finished') {
        emit('loading-change', false);
        updateNavigationState();
        updateTitle();
        updateFavicon();
      } else if (payload.event === 'failed') {
        emit('loading-change', false);
      }
    });

    wv.onTitleChange(({ payload }) => {
      emit('title-change', payload);
    });

    wv.onUrlChange(({ payload }) => {
      emit('url-change', payload);
      updateNavigationState();
    });

    unlistenFn = await listen<{ label: string; payload: string }>(`webview-${webviewId}-message`, (event) => {
      if (event.payload === 'favicon') {
        getFavicon();
      }
    });

    initialized = true;
  } catch (error) {
    console.error('Failed to create webview:', error);
  }
};

const updateNavigationState = async () => {
  try {
    const wv = await webview.getWebview(webviewId);
    const [canGoBack, canGoForward] = await Promise.all([
      wv.canGoBack(),
      wv.canGoForward(),
    ]);
    emit('can-go-back-change', canGoBack);
    emit('can-go-forward-change', canGoForward);
  } catch (error) {
    console.error('Failed to get navigation state:', error);
  }
};

const updateTitle = async () => {
  try {
    const wv = await webview.getWebview(webviewId);
    const title = await wv.getTitle();
    if (title) emit('title-change', title);
  } catch (error) {
    console.error('Failed to get title:', error);
  }
};

const updateFavicon = async () => {
  try {
    const wv = await webview.getWebview(webviewId);
    const favicon = await wv.getFavicon();
    if (favicon) emit('favicon-change', favicon);
  } catch (error) {
    console.error('Failed to get favicon:', error);
  }
};

const getFavicon = async () => {
  try {
    const wv = await webview.getWebview(webviewId);
    const favicon = await wv.getFavicon();
    if (favicon) emit('favicon-change', favicon);
  } catch (error) {
    console.error('Failed to get favicon:', error);
  }
};

const navigate = async (url: string) => {
  try {
    const wv = await webview.getWebview(webviewId);
    await wv.navigate(url);
  } catch (error) {
    console.error('Navigation failed:', error);
  }
};

const goBack = async () => {
  try {
    const wv = await webview.getWebview(webviewId);
    await wv.goBack();
  } catch (error) {
    console.error('Go back failed:', error);
  }
};

const goForward = async () => {
  try {
    const wv = await webview.getWebview(webviewId);
    await wv.goForward();
  } catch (error) {
    console.error('Go forward failed:', error);
  }
};

const reload = async () => {
  try {
    const wv = await webview.getWebview(webviewId);
    await wv.reload();
  } catch (error) {
    console.error('Reload failed:', error);
  }
};

const stop = async () => {
  try {
    const wv = await webview.getWebview(webviewId);
    await wv.stop();
  } catch (error) {
    console.error('Stop failed:', error);
  }
};

const executeScript = async (script: string) => {
  try {
    const wv = await webview.getWebview(webviewId);
    return await wv.eval(script);
  } catch (error) {
    console.error('Script execution failed:', error);
  }
};

const injectAdBlocker = async () => {
  try {
    const rules = await invoke<string[]>('get_adblock_rules');
    if (rules.length > 0) {
      await executeScript(`
        const style = document.createElement('style');
        style.textContent = ${JSON.stringify(rules.join('\n'))};
        document.head.appendChild(style);
      `);
    }
  } catch (error) {
    console.error('Ad blocker injection failed:', error);
  }
};

const injectPrivacyProtections = async () => {
  await executeScript(`
    if (!window.privacyProtected) {
      window.privacyProtected = true;

      // Canvas fingerprinting protection
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(...args) {
        const context = this.getContext('2d');
        if (context) {
          context.fillStyle = 'rgba(' + Math.random() * 255 + ',' + Math.random() * 255 + ',' + Math.random() * 255 + ',0.01)';
          context.fillRect(0, 0, 1, 1);
        }
        return originalToDataURL.apply(this, args);
      };

      // WebGL fingerprinting protection
      const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(param) {
        if (param === 37445 || param === 37446) {
          return 'Privacy Browser';
        }
        return originalGetParameter.apply(this, arguments);
      };

      // Battery API protection
      if (navigator.getBattery) {
        navigator.getBattery = () => Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 1
        });
      }

      // Screen resolution spoofing
      Object.defineProperty(screen, 'width', { get: () => 1920 });
      Object.defineProperty(screen, 'height', { get: () => 1080 });
    }
  `);
};

const resizeWebview = async () => {
  if (!webviewRef.value) return;

  const rect = webviewRef.value.getBoundingClientRect();
  try {
    const wv = await webview.getWebview(webviewId);
    await wv.setBounds({
      x: 0,
      y: 0,
      width: Math.max(1, Math.floor(rect.width)),
      height: Math.max(1, Math.floor(rect.height)),
    });
  } catch (error) {
    console.error('Resize failed:', error);
  }
};

watch(() => props.active, async (active) => {
  if (active) {
    if (!initialized) {
      await initWebview();
    }
    await nextTick();
    await resizeWebview();
    await injectAdBlocker();
    await injectPrivacyProtections();
  }
}, { immediate: true });

watch(() => props.tab.url, (url) => {
  if (url && initialized) {
    navigate(url);
  }
});

onMounted(() => {
  window.addEventListener('resize', resizeWebview);
});

onUnmounted(() => {
  window.removeEventListener('resize', resizeWebview);
  if (unlistenFn) unlistenFn();

  webview.destroyWebview(webviewId).catch(console.error);
});
</script>

<template>
  <div
    ref="webviewRef"
    class="webview-container"
    :class="{ active: props.active }"
    style="width: 100%; height: 100%;"
  >
    <div v-if="!props.active && !initialized" class="webview-placeholder">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <p>Click to load</p>
    </div>
  </div>
</template>

<style scoped>
@import '../styles/design-tokens.css';

.webview-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.webview-container.active {
  z-index: 1;
}

.webview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  color: var(--fg-secondary);
  font-size: var(--text-sm);
}

.webview-placeholder svg {
  color: var(--color-brand-500);
  opacity: 0.5;
}
</style>