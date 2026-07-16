import { ref, computed, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'

interface AdBlockRule {
  id: string
  rule: string
  domain?: string
  type: 'block' | 'allow' | 'redirect'
  enabled: boolean
}

interface BlocklistStats {
  ads: number
  trackers: number
  malware: number
  fingerprinting: number
  total: number
}

const rules = ref<AdBlockRule[]>([])
const stats = ref<{ ads: number; trackers: number; malware: number; fingerprinting: number; total: number }>({ ads: 0, trackers: 0, malware: 0, fingerprinting: 0, total: 0 })
const isEnabled = ref(true)
const loading = ref(false)
const error = ref<string | null>(null)

export function useAdBlock() {
  const loadRules = async () => {
    loading.value = true
    error.value = null
    try {
      const loadedRules = await invoke<AdBlockRule[]>('get_adblock_rules')
      rules.value = loadedRules
      await loadStats()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load rules'
    } finally {
      loading.value = false
    }
  }

  const loadStats = async () => {
    try {
      const loadedStats = await invoke<{ ads: number; trackers: number; malware: number; fingerprinting: number; total: number }>('get_blocklist_stats')
      stats.value = loadedStats
    } catch (err) {
      console.error('Failed to load blocklist stats:', err)
    }
  }

  const toggleAdBlock = async (enabled?: boolean) => {
    const newState = enabled !== undefined ? enabled : !isEnabled.value
    isEnabled.value = newState
    try {
      await invoke('toggle_adblock', { enabled: newState })
    } catch (err) {
      isEnabled.value = !newState
      throw err
    }
  }

  const updateRules = async (newRules: AdBlockRule[]) => {
    try {
      await invoke('update_adblock_rules', { rules: newRules })
      rules.value = newRules
    } catch (err) {
      throw err
    }
  }

  const addCustomRule = async (rule: string, type: 'block' | 'allow' | 'redirect' = 'block') => {
    const newRule: AdBlockRule = {
      id: `custom-${Date.now()}`,
      rule,
      type,
      enabled: true,
    }
    await updateRules([...rules.value, newRule])
  }

  const removeRule = async (ruleId: string) => {
    const newRules = rules.value.filter(r => r.id !== ruleId)
    await updateRules(newRules)
  }

  const toggleRule = async (ruleId: string) => {
    const newRules = rules.value.map(r => 
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    )
    await updateRules(newRules)
  }

  const updateBlocklists = async () => {
    loading.value = true
    error.value = null
    try {
      await invoke('update_blocklists')
      await loadRules()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update blocklists'
      throw err
    } finally {
      loading.value = false
    }
  }

  const getRulesForDomain = (domain: string) => {
    return rules.value.filter(r => 
      !r.domain || r.domain === domain || domain.endsWith('.' + r.domain)
    )
  }

  const isDomainBlocked = (domain: string) => {
    const domainRules = getRulesForDomain(domain)
    return domainRules.some(r => r.enabled && r.type === 'block')
  }

  const getBlockedCount = computed(() => 
    rules.value.filter(r => r.enabled && r.type === 'block').length
  )

  const getAllowedCount = computed(() => 
    rules.value.filter(r => r.enabled && r.type === 'allow').length
  )

  onMounted(() => {
    loadRules()
  })

  return {
    rules,
    stats,
    isEnabled,
    loading,
    error,
    getRulesForDomain,
    isDomainBlocked,
    getBlockedCount,
    getAllowedCount,
    loadRules,
    loadStats,
    toggleAdBlock,
    updateRules,
    addCustomRule,
    removeRule,
    toggleRule,
    updateBlocklists,
  }
}