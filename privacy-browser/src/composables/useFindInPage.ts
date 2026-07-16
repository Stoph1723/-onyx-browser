import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { invoke } from '@tauri-apps/api/core';

export interface FindInPageState {
  isActive: boolean;
  query: string;
  matches: number;
  currentMatch: number;
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
}

export interface FindMatch {
  index: number;
  element: Element;
  text: string;
  rect: DOMRect;
}

export function useFindInPage() {
  const state = ref<FindInPageState>({
    isActive: false,
    query: '',
    matches: 0,
    currentMatch: 0,
    caseSensitive: false,
    wholeWord: false,
    regex: false,
  });

  const matches = ref<FindMatch[]>([]);
  const currentMatchElement = ref<Element | null>(null);
  const isSearching = ref(false);
  const searchTimeout = ref<number | null>(null);
  const highlightClass = 'find-in-page-highlight';
  const currentHighlightClass = 'find-in-page-current';

  const openFind = (initialQuery = '') => {
    state.value.isActive = true;
    state.value.query = initialQuery;
    state.value.matches = 0;
    state.value.currentMatch = 0;
    matches.value = [];
    currentMatchElement.value = null;
    
    if (initialQuery) {
      performSearch();
    }
    
    nextTick(() => {
      const input = document.querySelector('.find-input input') as HTMLInputElement;
      input?.focus();
      input?.select();
    });
  };

  const closeFind = () => {
    state.value.isActive = false;
    state.value.query = '';
    state.value.matches = 0;
    state.value.currentMatch = 0;
    clearHighlights();
    matches.value = [];
    currentMatchElement.value = null;
  };

  const toggleFind = (initialQuery = '') => {
    if (state.value.isActive) {
      closeFind();
    } else {
      openFind(initialQuery);
    }
  };

  const performSearch = async () => {
    if (!state.value.query.trim()) {
      clearHighlights();
      state.value.matches = 0;
      state.value.currentMatch = 0;
      matches.value = [];
      currentMatchElement.value = null;
      return;
    }

    isSearching.value = true;
    clearHighlights();
    matches.value = [];
    state.value.matches = 0;
    state.value.currentMatch = 0;

    try {
      const textNodes = getTextNodes(document.body);
      const query = state.value.query;
      const flags = (state.value.caseSensitive ? '' : 'i') + (state.value.regex ? '' : '');
      let regex: RegExp;

      if (state.value.regex) {
        try {
          regex = new RegExp(query, flags);
        } catch {
          regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
        }
      } else {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordBoundary = state.value.wholeWord ? '\\b' : '';
        regex = new RegExp(`${wordBoundary}${escaped}${wordBoundary}`, flags);
      }

      let matchIndex = 0;
      
      for (const node of textNodes) {
        const text = node.textContent || '';
        let match;
        
        while ((match = regex.exec(text)) !== null) {
          const startOffset = match.index;
          const endOffset = startOffset + match[0].length;
          
          const range = document.createRange();
          range.setStart(node, startOffset);
          range.setEnd(node, endOffset);
          
          const rect = range.getBoundingClientRect();
          
          const matchObj: FindMatch = {
            index: matchIndex++,
            element: node.parentElement!,
            text: match[0],
            rect,
          };
          
          matches.value.push(matchObj);
          
          // Highlight the match
          const highlight = document.createElement('mark');
          highlight.className = highlightClass;
          highlight.dataset.findIndex = String(matchObj.index);
          range.surroundContents(highlight);
          
          // Reset regex lastIndex for non-global regex
          if (!regex.global) break;
        }
      }
      
      state.value.matches = matches.value.length;
      
      if (matches.value.length > 0) {
        state.value.currentMatch = 0;
        scrollToMatch(0);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      isSearching.value = false;
    }
  };

  const clearHighlights = () => {
    const highlights = document.querySelectorAll(`.${highlightClass}`);
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
        parent.normalize();
      }
    });
  };

  const scrollToMatch = (index: number) => {
    if (index < 0 || index >= matches.value.length) return;
    
    const match = matches.value[index];
    if (!match) return;
    
    // Remove current highlight
    if (currentMatchElement.value) {
      currentMatchElement.value.classList.remove(currentHighlightClass);
    }
    
    // Add current highlight
    const highlight = document.querySelector(`.${highlightClass}[data-find-index="${index}"]`);
    if (highlight) {
      highlight.classList.add(currentHighlightClass);
      currentMatchElement.value = highlight;
      
      // Scroll into view
      highlight.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center', 
        inline: 'center' 
      });
    }
    
    state.value.currentMatch = index;
  };

  const nextMatch = () => {
    if (matches.value.length === 0) return;
    const next = (state.value.currentMatch + 1) % matches.value.length;
    scrollToMatch(next);
  };

  const previousMatch = () => {
    if (matches.value.length === 0) return;
    const prev = (state.value.currentMatch - 1 + matches.value.length) % matches.value.length;
    scrollToMatch(prev);
  };

  const updateQuery = (query: string) => {
    state.value.query = query;
    
    if (searchTimeout.value) {
      clearTimeout(searchTimeout.value);
    }
    
    searchTimeout.value = window.setTimeout(() => {
      performSearch();
    }, 150);
  };

  const setCaseSensitive = (value: boolean) => {
    state.value.caseSensitive = value;
    if (state.value.query) performSearch();
  };

  const setWholeWord = (value: boolean) => {
    state.value.wholeWord = value;
    if (state.value.query) performSearch();
  };

  const setRegex = (value: boolean) => {
    state.value.regex = value;
    if (state.value.query) performSearch();
  };

  const replaceMatch = (replacement: string) => {
    if (!currentMatchElement.value || state.value.currentMatch >= matches.value.length) return;
    
    const match = matches.value[state.value.currentMatch];
    const textNode = currentMatchElement.value.firstChild;
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      textNode.textContent = replacement;
      match.text = replacement;
    }
  };

  const replaceAllMatches = (replacement: string) => {
    matches.value.forEach((match, index) => {
      const highlight = document.querySelector(`.${highlightClass}[data-find-index="${index}"]`);
      if (highlight && highlight.firstChild) {
        highlight.firstChild.textContent = replacement;
        match.text = replacement;
      }
    });
  };

  const getTextNodes = (root: Node): Text[] => {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        // Skip script, style, and hidden elements
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tagName = parent.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'textarea', 'input', 'select'].includes(tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.hidden || getComputedStyle(parent).display === 'none' || getComputedStyle(parent).visibility === 'hidden') {
          return NodeFilter.FILTER_REJECT;
        }
        if (node.textContent?.trim() === '') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    
    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }
    
    return textNodes;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!state.value.isActive) return;
    
    if (e.key === 'Escape') {
      closeFind();
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        previousMatch();
      } else {
        nextMatch();
      }
    } else if (e.key === 'F3') {
      if (e.shiftKey) {
        previousMatch();
      } else {
        nextMatch();
      }
    }
  };

  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown);
    if (searchTimeout.value) {
      clearTimeout(searchTimeout.value);
    }
    clearHighlights();
  });

  watch(() => state.value.query, (query) => {
    if (query) {
      performSearch();
    } else {
      clearHighlights();
      state.value.matches = 0;
      state.value.currentMatch = 0;
      matches.value = [];
    }
  });

  return {
    state,
    matches,
    currentMatchElement,
    isSearching,
    openFind,
    closeFind,
    toggleFind,
    performSearch,
    nextMatch,
    previousMatch,
    updateQuery,
    setCaseSensitive,
    setWholeWord,
    setRegex,
    replaceMatch,
    replaceAllMatches,
  };
}