import { ref, computed, onMounted, onUnmounted } from 'vue';

export interface ZoomState {
  level: number;
  min: number;
  max: number;
  step: number;
  defaultLevel: number;
}

export interface PerSiteZoom {
  [origin: string]: number;
}

export function useZoom() {
  const state = ref<ZoomState>({
    level: 1.0,
    min: 0.25,
    max: 5.0,
    step: 0.1,
    defaultLevel: 1.0,
  });

  const perSiteZoom = ref<PerSiteZoom>({});
  const currentOrigin = ref<string>('');
  const isZooming = ref(false);

  const zoomLevels = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 5.0];

  const zoomIn = () => {
    const current = state.value.level;
    const index = zoomLevels.findIndex(l => l > current + 0.01);
    if (index !== -1) {
      setZoom(zoomLevels[index]);
    } else if (current < state.value.max) {
      setZoom(Math.min(current + state.value.step, state.value.max));
    }
  };

  const zoomOut = () => {
    const current = state.value.level;
    const index = zoomLevels.findLastIndex(l => l < current - 0.01);
    if (index !== -1) {
      setZoom(zoomLevels[index]);
    } else if (current > state.value.min) {
      setZoom(Math.max(current - state.value.step, state.value.min));
    }
  };

  const resetZoom = () => {
    setZoom(state.value.defaultLevel);
  };

  const setZoom = (level: number) => {
    const clamped = Math.max(state.value.min, Math.min(state.value.max, level));
    state.value.level = Math.round(clamped * 100) / 100;
    applyZoom();
  };

  const setZoomTo = (level: number) => {
    setZoom(level);
  };

  const applyZoom = () => {
    document.documentElement.style.setProperty('--zoom-level', String(state.value.level));
    document.body.style.zoom = String(state.value.level);
    
    // For WebView
    if (window.webkitRequestAnimationFrame) {
      document.body.style.webkitTransform = `scale(${state.value.level})`;
      document.body.style.webkitTransformOrigin = '0 0';
    }
  };

  const loadPerSiteZoom = () => {
    try {
      const saved = localStorage.getItem('per-site-zoom');
      if (saved) {
        perSiteZoom.value = JSON.parse(saved);
      }
    } catch (err) {
      console.error('Failed to load per-site zoom:', err);
    }
  };

  const savePerSiteZoom = () => {
    try {
      localStorage.setItem('per-site-zoom', JSON.stringify(perSiteZoom.value));
    } catch (err) {
      console.error('Failed to save per-site zoom:', err);
    }
  };

  const getOriginZoom = (origin: string) => {
    return perSiteZoom.value[origin] || state.value.defaultLevel;
  };

  const setOriginZoom = (origin: string, level: number) => {
    const clamped = Math.max(state.value.min, Math.min(state.value.max, level));
    perSiteZoom.value[origin] = Math.round(clamped * 100) / 100;
    savePerSiteZoom();
    
    if (origin === currentOrigin.value) {
      setZoom(level);
    }
  };

  const removeOriginZoom = (origin: string) => {
    delete perSiteZoom.value[origin];
    savePerSiteZoom();
    
    if (origin === currentOrigin.value) {
      resetZoom();
    }
  };

  const updateCurrentOrigin = (origin: string) => {
    currentOrigin.value = origin;
    const savedZoom = getOriginZoom(origin);
    if (savedZoom !== state.value.defaultLevel) {
      setZoom(savedZoom);
    } else {
      resetZoom();
    }
  };

  const handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY > 0) {
        zoomOut();
      } else {
        zoomIn();
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      e.preventDefault();
      resetZoom();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
      e.preventDefault();
      zoomIn();
    } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
      e.preventDefault();
      zoomOut();
    }
  };

  onMounted(() => {
    loadPerSiteZoom();
    applyZoom();
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    
    // Update origin when navigation happens
    const updateOrigin = () => {
      updateCurrentOrigin(window.location.origin);
    };
    window.addEventListener('popstate', updateOrigin);
    window.addEventListener('pushstate', updateOrigin);
    window.addEventListener('replacestate', updateOrigin);
  };

  onUnmounted(() => {
    window.removeEventListener('wheel', handleWheel);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('popstate', updateOrigin);
    window.removeEventListener('pushstate', updateOrigin);
    window.removeEventListener('replacestate', updateOrigin);
  });

  return {
    state,
    perSiteZoom,
    currentOrigin,
    zoomLevels,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom,
    setZoomTo,
    getOriginZoom,
    setOriginZoom,
    removeOriginZoom,
    updateCurrentOrigin,
    loadPerSiteZoom,
  };
}