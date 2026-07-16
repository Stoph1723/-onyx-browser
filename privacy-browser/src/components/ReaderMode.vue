<template>
  <div class="reader-mode" v-if="isActive">
    <div class="reader-toolbar">
      <div class="toolbar-left">
        <button class="toolbar-btn" @click="exit" title="Exit Reader Mode (Esc)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <h1 class="reader-title">{{ articleTitle }}</h1>
      </div>
      
      <div class="toolbar-center">
        <button class="toolbar-btn" @click="readAloud" title="Read Aloud (Ctrl+Shift+U)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 5 11 5"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
          </svg>
        </button>
        <button class="toolbar-btn" @click="saveForLater" title="Save to Reading List">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
        <button class="toolbar-btn" @click="share" title="Share">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.42" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
      </div>
      
      <div class="toolbar-right">
        <div class="font-controls">
          <button class="font-btn" @click="decreaseFont" title="Decrease Font (Ctrl+-)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="4" y1="12" x2="20" y2="12"/>
            </svg>
          </button>
          <span class="font-size">{{ fontSize }}px</span>
          <button class="font-btn" @click="increaseFont" title="Increase Font (Ctrl++)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
        
        <div class="theme-controls">
          <button 
            v-for="theme in themes" 
            :key="theme.value" 
            :class="['theme-btn', { active: currentTheme === theme.value }]"
            @click="setTheme(theme.value)"
            :title="theme.label"
          >
            <div class="theme-preview" :class="theme.value"></div>
          </div>
        </div>
        
        <div class="width-controls">
          <button class="width-btn" @click="decreaseWidth" title="Narrower">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <line x1="12" y1="5" x2="12" y2="19"/>
            </svg>
          </button>
          <span class="width-label">{{ Math.round(contentWidth * 100) }}%</span>
          <button class="width-btn" @click="increaseWidth" title="Wider">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <line x1="12" y1="5" x2="12" y2="19"/>
            </svg>
          </button>
        </div>
        
        <div class="image-controls">
          <label class="toggle">
            <input type="checkbox" v-model="showImages" @change="toggleImages">
            <span class="slider"></span>
          </label>
          <span class="control-label">Images</span>
        </div>
      </div>
    </div>
    
    <div class="reader-content" ref="contentRef" :style="contentStyle">
      <article class="reader-article">
        <header class="article-header">
          <h1 class="article-title">{{ articleTitle }}</h1>
          <div class="article-meta" v-if="articleAuthor || articleDate">
            <span v-if="articleAuthor" class="article-author">{{ articleAuthor }}</span>
            <span v-if="articleDate" class="article-date">{{ formatDate(articleDate) }}</span>
          </div>
          <div class="article-stats">
            <span class="stat">{{ wordCount }} words</span>
            <span class="stat">{{ readingTime }} min read</span>
          </div>
        </header>
        
        <div class="article-content" v-html="articleContent"></div>
      </article>
    </div>
    
    <footer class="reader-footer">
      <div class="footer-left">
        <span class="progress">{{ scrollProgress }}% read</span>
      </div>
      <div class="footer-right">
        <button class="footer-btn" @click="print" title="Print">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          </svg>
        </button>
        <button class="footer-btn" @click="saveAsPdf" title="Save as PDF">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useReaderMode } from '../composables/useReaderMode'

const props = defineProps<{
  isActive: boolean
}>()

const emit = defineEmits<{
  exit: []
  toggle: []
  settingsChange: [settings: any]
}>

const {
  isActive,
  articleTitle,
  articleAuthor,
  articleDate,
  articleContent,
  articleExcerpt,
  wordCount,
  readingTime,
  settings,
  scrollProgress,
  contentRef,
  enterReaderMode,
  exitReaderMode,
  toggleReaderMode,
  updateSetting,
  setTheme,
  setFontSize,
  setLineHeight,
  setContentWidth,
  toggleImages,
  toggleLinks,
  print,
  saveAsPdf,
  share,
  readAloud,
  saveForLater,
  exitReaderMode: exit
} = useReaderMode()

const isActive = computed(() => props.isActive)

const themes = [
  { value: 'light', label: 'Light', preview: 'bg-white text-gray-900' },
  { value: 'dark', label: 'Dark', preview: 'bg-gray-900 text-white' },
  { value: 'sepia', label: 'Sepia', preview: 'bg-amber-50 text-amber-900' },
  { value: 'auto', label: 'Auto', preview: 'bg-gradient-to-r from-white to-gray-900' }
] as const

const currentTheme = computed(() => settings.value?.theme || 'auto')

const contentStyle = computed(() => ({
  fontSize: `${settings.value?.fontSize || 18}px`,
  lineHeight: settings.value?.lineHeight || 1.7,
  maxWidth: `${settings.value?.maxWidth || 800}px`,
  fontFamily: settings.value?.fontFamily || 'Georgia, serif',
  color: settings.value?.theme === 'dark' ? '#f1f5f9' : '#1e293b',
  backgroundColor: settings.value?.theme === 'dark' ? '#0f172a' : '#ffffff',
})

const showImages = computed(() => settings.value?.showImages ?? true)
const showLinks = computed(() => settings.value?.showLinks ?? true)

const wordCount = computed(() => {
  if (!articleContent.value) return 0
  const text = articleContent.value.replace(/<[^>]*>/g, '').trim()
  return text.split(/\s+/).filter(Boolean).length
})

const readingTime = computed(() => {
  const count = wordCount.value
  return Math.max(1, Math.ceil(count / 200))
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

const contentRef = ref<HTMLDivElement | null>(null)

const exit = () => {
  emit('exit')
}

const setTheme = (theme: string) => {
  updateSetting('theme', theme)
}

const increaseFont = () => {
  setFontSize(Math.min((settings.value?.fontSize || 18) + 2, 32))
}

const decreaseFont = () => {
  setFontSize(Math.max((settings.value?.fontSize || 18) - 2, 12))
}

const setFontSize = (size: number) => {
  updateSetting('fontSize', size)
}

const increaseWidth = () => {
  setContentWidth(Math.min((settings.value?.maxWidth || 800) + 100, 1200))
}

const decreaseWidth = () => {
  setContentWidth(Math.max((settings.value?.maxWidth || 800) - 100, 400))
}

const setContentWidth = (width: number) => {
  updateSetting('maxWidth', width)
}

const toggleImages = () => {
  updateSetting('showImages', !showImages.value)
}

const toggleLinks = () => {
  updateSetting('showLinks', !showLinks.value)
}

const print = () => {
  window.print()
}

const saveAsPdf = async () => {
  // Implementation would use print API or pdf generation
  console.log('Save as PDF')
}

const share = async () => {
  if (navigator.share) {
    await navigator.share({
      title: articleTitle.value,
      url: window.location.href
    })
  }
}

const readAloud = () => {
  // Speech synthesis API
  const utterance = new SpeechSynthesisUtterance(
    document.querySelector('.reader-content')?.textContent || ''
  )
  speechSynthesis.speak(utterance)
}

const saveForLater = () => {
  // Add to reading list
  console.log('Save for later')
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

const scrollProgress = computed(() => {
  const el = contentRef.value
  if (!el) return 0
  const scrollTop = el.scrollTop
  const scrollHeight = el.scrollHeight - el.clientHeight
  return scrollHeight > 0 ? Math.round((el.scrollTop / scrollHeight) * 100) : 0
}

const print = () => {
  window.print()
}

const saveAsPdf = async () => {
  // Would use a PDF generation library
  console.log('Save as PDF')
}

const share = async () => {
  if (navigator.share) {
    await navigator.share({
      title: articleTitle.value,
      url: window.location.href
    })
  }
}

const readAloud = () => {
  const content = document.querySelector('.reader-content')?.textContent || ''
  const utterance = new SpeechSynthesisUtterance(content)
  speechSynthesis.speak(utterance)
}

const saveForLater = () => {
  // Add to reading list
  console.log('Save for later')
}

const exit = () => {
  emit('exit')
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('exit')
  } else if (e.key === '+' || (e.key === '=' && (e.ctrlKey || e.metaKey))) {
    e.preventDefault()
    increaseFont()
  } else if (e.key === '-' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    decreaseFont()
  } else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    setFontSize(18)
  }
}
</script>

<template>
  <div class="reader-mode" v-if="isActive">
    <div class="reader-toolbar">
      <div class="toolbar-left">
        <button class="toolbar-btn" @click="exit" title="Exit Reader Mode (Esc)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <h1 class="reader-title">{{ articleTitle }}</h1>
      </div>
      
      <div class="toolbar-center">
        <button class="toolbar-btn" @click="readAloud" title="Read Aloud (Ctrl+Shift+U)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 5 11 5"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
          </svg>
        </button>
        <button class="toolbar-btn" @click="saveForLater" title="Save to Reading List">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
        <button class="toolbar-btn" @click="share" title="Share">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.42" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
      </div>
      
      <div class="toolbar-right">
        <div class="font-controls">
          <button class="font-btn" @click="decreaseFont" title="Decrease Font (Ctrl+-)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="4" y1="12" x2="20" y2="12"/>
            </svg>
          </button>
          <span class="font-size">{{ fontSize }}px</span>
          <button class="font-btn" @click="increaseFont" title="Increase Font (Ctrl++)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
        
        <div class="theme-controls">
          <button 
            v-for="theme in themes" 
            :key="theme.value" 
            :class="['theme-btn', { active: currentTheme === theme.value }]"
            @click="setTheme(theme.value)"
            :title="theme.label"
          >
            <div class="theme-preview" :class="theme.value"></div>
          </div>
        </div>
        
        <div class="width-controls">
          <button class="width-btn" @click="decreaseWidth" title="Narrower">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <line x1="12" y1="5" x2="12" y2="19"/>
            </svg>
          </button>
          <span class="width-label">{{ Math.round(contentWidth * 100) }}%</span>
          <button class="width-btn" @click="increaseWidth" title="Wider">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <line x1="12" y1="5" x2="12" y2="19"/>
            </svg>
          </button>
        </div>
        
        <div class="image-controls">
          <label class="toggle">
            <input type="checkbox" v-model="showImages" @change="toggleImages">
            <span class="slider"></span>
          </label>
          <span class="control-label">Images</span>
        </div>
      </div>
    </div>
    
    <div class="reader-content" ref="contentRef" :style="contentStyle">
      <article class="reader-article">
        <header class="article-header">
          <h1 class="article-title">{{ articleTitle }}</h1>
          <div class="article-meta" v-if="articleAuthor || articleDate">
            <span v-if="articleAuthor" class="article-author">{{ articleAuthor }}</span>
            <span v-if="articleDate" class="article-date">{{ formatDate(articleDate) }}</span>
          </div>
          <div class="article-stats">
            <span class="stat">{{ wordCount }} words</span>
            <span class="stat">{{ readingTime }} min read</span>
          </div>
        </header>
        
        <div class="article-content" v-html="articleContent"></div>
      </article>
    </div>
    
    <footer class="reader-footer">
      <div class="footer-left">
        <span class="progress">{{ scrollProgress }}% read</span>
      </div>
      <div class="footer-right">
        <button class="footer-btn" @click="print" title="Print">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          </svg>
        </button>
        <button class="footer-btn" @click="saveAsPdf" title="Save as PDF">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </button>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.reader-mode {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: var(--bg-primary);
  color: var(--fg-primary);
  display: flex;
  flex-direction: column;
  font-family: var(--font-sans);
}

.reader-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  flex-wrap: wrap;
  gap: 16px;
  height: 56px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.toolbar-left, .toolbar-center, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-left {
  flex: 1;
}

.toolbar-center {
  flex: 1;
  justify-content: center;
}

.toolbar-right {
  flex: 1;
  justify-content: flex-end;
}

.reader-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 400px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--fg-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.toolbar-btn:hover {
  background: var(--bg-tertiary);
  color: var(--fg-primary);
}

.font-controls, .theme-controls, .width-controls, .image-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.font-btn, .theme-btn, .width-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: var(--bg-tertiary);
  color: var(--fg-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.font-btn:hover, .theme-btn:hover, .width-btn:hover {
  background: var(--bg-hover);
  color: var(--fg-primary);
}

.font-size {
  font-size: 13px;
  font-weight: 500;
  color: var(--fg-secondary);
  min-width: 40px;
  text-align: center;
}

.theme-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  padding: 0;
  position: relative;
}

.theme-preview {
  width: 24px;
  height: 18px;
  border-radius: 4px;
  border: 2px solid transparent;
}

.theme-btn.active .theme-preview {
  border-color: var(--color-brand-500);
}

.theme-preview.light { background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); }
.theme-preview.dark { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); }
.theme-preview.sepia { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); }
.theme-preview.auto { background: linear-gradient(135deg, #f8fafc 50%, #0f172a 50%); }

.width-btn {
  padding: 0 8px;
  height: 28px;
}

.width-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--fg-secondary);
  min-width: 50px;
  text-align: center;
}

.image-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 12px;
  color: var(--fg-tertiary);
}

.toggle {
  position: relative;
  width: 44px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle .slider {
  position: absolute;
  inset: 0;
  background: var(--border-primary);
  border-radius: 12px;
  transition: 0.3s;
}

.toggle .slider:before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.toggle input:checked + .slider {
  background: var(--color-brand-500);
}

.toggle input:checked + .slider:before {
  transform: translateX(20px);
}

.reader-content {
  flex: 1;
  overflow-y: auto;
  padding: 40px 60px;
  display: flex;
  justify-content: center;
}

.reader-article {
  max-width: 800px;
  width: 100%;
}

.article-header {
  margin-bottom: 40px;
  text-align: center;
}

.article-title {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.2;
  margin: 0 0 16px;
  color: var(--fg-primary);
}

.article-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
  font-size: 14px;
  color: var(--fg-secondary);
}

.article-author {
  font-weight: 500;
}

.article-date {
  color: var(--fg-tertiary);
}

.article-stats {
  display: flex;
  justify-content: center;
  gap: 24px;
  color: var(--fg-tertiary);
  font-size: 14px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
}

.article-content {
  line-height: 1.8;
  font-size: 1.125rem;
}

.article-content p {
  margin-bottom: 1.5em;
  text-align: justify;
  hyphens: auto;
}

.article-content h2 {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 2.5rem 0 1rem;
  color: var(--fg-primary);
}

.article-content h3 {
  font-size: 1.375rem;
  font-weight: 600;
  margin: 2rem 0 0.75rem;
  color: var(--fg-primary);
}

.article-content img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 1.5rem 0;
}

.article-content blockquote {
  border-left: 4px solid var(--color-brand-500);
  padding-left: 1.5rem;
  margin: 1.5rem 0;
  font-style: italic;
  color: var(--fg-secondary);
}

.article-content code {
  font-family: var(--font-mono);
  background: var(--bg-tertiary);
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-size: 0.9em;
}

.article-content pre {
  background: #0d1117;
  padding: 1.5rem;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1.5rem 0;
}

.article-content pre code {
  background: transparent;
  padding: 0;
  font-size: 0.875rem;
}

.reader-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-primary);
  position: sticky;
  bottom: 0;
  z-index: 10;
}

.footer-left .progress {
  font-size: 13px;
  color: var(--fg-tertiary);
  font-weight: 500;
}

.footer-right {
  display: flex;
  gap: 8px;
}

.footer-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--fg-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.footer-btn:hover {
  background: var(--bg-tertiary);
  color: var(--fg-primary);
}

.toggle {
  position: relative;
  width: 44px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle .slider {
  position: absolute;
  inset: 0;
  background: var(--border-primary);
  border-radius: 12px;
  transition: 0.3s;
}

.toggle .slider:before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.toggle input:checked + .slider {
  background: var(--color-brand-500);
}

.toggle input:checked + .slider:before {
  transform: translateX(20px);
}

@media (max-width: 768px) {
  .reader-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    height: auto;
    padding: 12px 16px;
  }
  
  .toolbar-left, .toolbar-center, .toolbar-right {
    width: 100%;
    justify-content: center;
  }
  
  .reader-title {
    text-align: center;
  }
  
  .toolbar-center, .toolbar-right {
    order: 2;
  }
  
  .toolbar-left {
    order: 1;
  }
}
</style>