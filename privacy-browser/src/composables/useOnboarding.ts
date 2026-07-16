import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: string
  action?: () => Promise<void>
  skipable?: boolean
  target?: string
}

interface OnboardingState {
  isOpen: boolean
  currentStep: number
  completed: boolean
  showSkip: boolean
}

const STORAGE_KEY = 'onyx-onboarding-state'

const defaultSteps = [
  {
    id: 'welcome',
    title: 'Welcome to Onyx',
    description: 'A privacy-first browser that puts you in control. No tracking, no telemetry, no compromises.',
    icon: '🛡️',
    skipable: true
  },
  {
    id: 'privacy',
    title: 'Built-in Privacy Protection',
    description: 'Onyx blocks ads, trackers, and fingerprinting by default. No configuration needed.',
    icon: '🔒',
    skipable: true
  },
  {
    id: 'adblock',
    title: 'Advanced Ad Blocking',
    description: 'Powered by the same engine as Brave. Blocks YouTube ads, sponsored content, and more.',
    icon: '🚫',
    skipable: true
  },
  {
    id: 'fingerprint',
    title: 'Anti-Fingerprinting',
    description: 'Canvas, WebGL, AudioContext, and hardware fingerprinting protection built-in.',
    icon: '🎭',
    skipable: true
  },
  {
    id: 'containers',
    title: 'Container Tabs',
    description: 'Isolate Banking, Shopping, Social, and Work in separate containers with separate cookies and storage.',
    icon: '📦',
    skipable: true
  },
  {
    id: 'workspaces',
    title: 'Workspaces & Profiles',
    description: 'Separate workspaces for Work, Personal, Research with independent tabs, history, and settings.',
    icon: '🏢',
    skipable: true
  },
  {
    id: 'ai',
    title: 'Local AI Assistant',
    description: 'Summarize pages, translate, write code, detect phishing - all running locally via Ollama.',
    icon: '🤖',
    skipable: true
  },
  {
    id: 'shortcuts',
    title: 'Power User Shortcuts',
    description: 'Cmd+K for Command Palette, Ctrl+Shift+B for Sidebar, Ctrl+Shift+A for Ad Block toggle.',
    icon: '⌨️',
    skipable: true
  },
  {
    id: 'complete',
    title: "You're Ready!",
    description: "Onyx is configured with maximum privacy. Customize further in Settings anytime.",
    icon: '🎉',
    skipable: false
  }
]

const STORAGE_KEY = 'onyx-onboarding-complete'

export function useOnboarding() {
  const isOpen = ref(false)
  const currentStep = ref(0)
  const completed = ref(false)
  const showSkip = ref(true)
  const isLoading = ref(false)

  const steps = ref(defaultSteps)

  const currentStepData = computed(() => steps.value[currentStep.value])
  
  const progress = computed(() => ((currentStep.value + 1) / defaultSteps.length) * 100)
  
  const isLastStep = computed(() => currentStep.value >= defaultSteps.length - 1)

  const stepColor = computed(() => {
    const colors: Record<string, string> = {
      welcome: '#00d4aa',
      privacy: '#00d4aa',
      adblock: '#e94560',
      fingerprint: '#8b5cf6',
      containers: '#3b82f6',
      workspaces: '#8b5cf6',
      ai: '#f59e0b',
      shortcuts: '#6366f1',
      complete: '#00d4aa'
    }
    return colors[currentStepData.value?.id] || '#00d4aa'
  })

  const open = async () => {
    const done = await invoke<boolean>('is_onboarding_complete')
    if (!done) {
      isOpen.value = true
      currentStep.value = 0
      completed.value = false
      showSkip.value = true
    }
  }

  const close = () => {
    isOpen.value = false
    currentStep.value = 0
    showSkip.value = true
  }

  const nextStep = async () => {
    if (currentStepData.value.action) {
      await currentStepData.value.action()
    }
    
    if (currentStep.value < defaultSteps.length - 1) {
      currentStep.value++
    } else {
      await completeOnboarding()
    }
  }

  const previousStep = () => {
    if (currentStep.value > 0) {
      currentStep.value--
    }
  }

  const skipStep = () => {
    if (currentStepData.value.skipable) {
      nextStep()
    }
  }

  const completeOnboarding = async () => {
    completed.value = true
    await invoke('set_onboarding_complete')
    close()
  }

  const handleKeydown = (e: KeyboardEvent) => {
    if (!isOpen.value) return
    
    if (e.key === 'Escape') {
      close()
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
      nextStep()
    } else if (e.key === 'ArrowLeft') {
      previousStep()
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
    open()
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })

  return {
    isOpen,
    currentStep,
    completed,
    showSkip,
    isLoading,
    steps: defaultSteps,
    currentStepData,
    progress,
    isLastStep,
    stepColor,
    open,
    close,
    nextStep,
    previousStep,
    skipStep,
    completeOnboarding,
    isLastStep
  }
}