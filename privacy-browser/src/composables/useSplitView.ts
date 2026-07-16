import { ref, computed, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'

interface SplitViewState {
  isSplit: boolean
  direction: 'horizontal' | 'vertical'
  ratio: number
  primaryTabId?: string
  secondaryTabId?: string
}

export function useSplitView() {
  const state = ref<SplitViewState>({
    isSplit: false,
    direction: 'vertical',
    ratio: 0.5
  })

  const isResizing = ref(false)
  const dragStart = ref<{ x: number; y: number; ratio: number } | null>(null)
  const splitRef = ref<HTMLElement | null>(null)

  const primaryWidth = computed(() => state.value.isSplit && state.value.direction === 'vertical' 
    ? `${state.value.ratio * 100}%` 
    : '100%')
  
  const secondaryWidth = computed(() => state.value.isSplit && state.value.direction === 'vertical' 
    ? `${(1 - state.value.ratio) * 100}%` 
    : '0%')

  const primaryHeight = computed(() => state.value.isSplit && state.value.direction === 'horizontal' 
    ? `${state.value.ratio * 100}%` 
    : '100%')
  
  const secondaryHeight = computed(() => state.value.isSplit && state.value.direction === 'horizontal' 
    ? `${(1 - state.value.ratio) * 100}%` 
    : '0%')

  const splitStyle = computed(() => ({
    left: state.value.direction === 'vertical' ? `${state.value.ratio * 100}%` : '0',
    top: state.value.direction === 'horizontal' ? `${state.value.ratio * 100}%` : '0',
  })

  const toggleSplit = (direction: 'horizontal' | 'vertical' = 'vertical') => {
    if (state.value.isSplit && state.value.direction === direction) {
      closeSplit()
    } else {
      state.value.isSplit = true
      state.value.direction = direction
      state.value.ratio = 0.5
    }
  }

  const closeSplit = () => {
    state.value.isSplit = false
    state.value.primaryTabId = undefined
    state.value.secondaryTabId = undefined
  }

  const swapPanels = () => {
    if (!state.value.isSplit) return
    const temp = state.value.primaryTabId
    state.value.primaryTabId = state.value.secondaryTabId
    state.value.secondaryTabId = temp
  }

  const focusPrimary = () => {
    // Focus the primary panel
  }

  const focusSecondary = () => {
    // Focus the secondary panel
  }

  const setRatio = (ratio: number) => {
    state.value.ratio = Math.max(0.1, Math.min(0.9, ratio))
  }

  const adjustRatio = (delta: number) => {
    setRatio(state.value.ratio + delta)
  }

  const handleMouseDown = (e: MouseEvent) => {
    if (!state.value.isSplit) return
    
    isResizing.value = true
    dragStart.value = {
      x: e.clientX,
      y: e.clientY,
      ratio: state.value.ratio
    }
    
    document.body.style.cursor = state.value.direction === 'horizontal' ? 'row-resize' : 'col-resize'
    document.body.style.userSelect = 'none'
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.value || !dragStart.value) return
    
    const delta = state.value.direction === 'horizontal' 
      ? (e.clientY - dragStart.value.y) / window.innerHeight
      : (e.clientX - dragStart.value.x) / window.innerWidth
    
    const newRatio = Math.max(0.1, Math.min(0.9, dragStart.value.ratio + delta))
    state.value.ratio = newRatio
  }

  const handleMouseUp = () => {
    isResizing.value = false
    dragStart.value = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!state.value.isSplit) return
    
    if (e.ctrlKey && e.shiftKey) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        const delta = e.key === 'ArrowLeft' ? -0.05 : 0.05
        adjustRatio(delta)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        const delta = e.key === 'ArrowUp' ? -0.05 : 0.05
        adjustRatio(delta)
      } else if (e.key === 's') {
        e.preventDefault()
        swapPanels()
      } else if (e.key === 'w') {
        e.preventDefault()
        closeSplit()
      }
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })

  return {
    state,
    isResizing,
    splitRef,
    primaryWidth,
    secondaryWidth,
    primaryHeight,
    secondaryHeight,
    splitStyle,
    toggleSplit,
    closeSplit,
    swapPanels,
    focusPrimary,
    focusSecondary,
    setRatio,
    adjustRatio,
    handleMouseDown
  }
}