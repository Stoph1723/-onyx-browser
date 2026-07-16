// YouTube Ad Blocker - Blocks video ads and ad segments
// Runs at document_start to intercept ad requests early

(function() {
    'use strict';

    // Track if we're on YouTube
    const isYouTube = location.hostname.includes('youtube.com');
    if (!isYouTube) return;

    // Intercept XMLHttpRequest to block ad requests
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        if (isAdUrl(url)) {
            this.abort();
            return;
        }
        return originalXHROpen.apply(this, arguments);
    };

    // Intercept fetch to block ad requests
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
        const url = typeof input === 'string' ? input : input.url;
        if (isAdUrl(url)) {
            return Promise.reject(new Error('Ad request blocked'));
        }
        return originalFetch.apply(this, arguments);
    };

    // Check if URL is an ad request
    function isAdUrl(url) {
        if (!url) return false;
        const urlLower = url.toLowerCase();
        
        // YouTube ad endpoints
        const adPatterns = [
            '/api/stats/ads',
            '/api/stats/watchtime',
            '/pagead/',
            '/ads/',
            '/doubleclick/',
            '/googlesyndication/',
            '/googleadservices/',
            '/adclick.',
            '/adview.',
            '/adsense.',
            '/advertisement.',
            '/sponsorship.',
            '/instream_ad',
            '/video_ads',
            '/video_ads_',
            '/ad_',
            'adformat=',
            'ad_type=',
            'adunit=',
            'ad_slot=',
            'ad_channel=',
            'ad_client=',
            'ad_host=',
            'ad_region=',
            'ad_tag=',
            'ad_url=',
            'ad_dest=',
            'ad_click=',
            'ad_impression=',
            'ad_view=',
            'ad_click_through=',
            'ad_view_through=',
            '/ptracking?',
            '/pagead/',
            '/ads?id=',
            '/ads?',
            '/ad?',
        ];

        return adPatterns.some(pattern => urlLower.includes(pattern));
    }

    // Block ad-related scripts from loading
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
        const element = originalCreateElement.call(this, tagName);
        if (tagName.toLowerCase() === 'script') {
            Object.defineProperty(element, 'src', {
                set: function(src) {
                    if (isAdUrl(src)) {
                        console.log('[Privacy Browser] Blocked ad script:', src);
                        return;
                    }
                    return Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src').set.call(this, src);
                },
                get: function() {
                    return Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src').get.call(this);
                }
            });
        }
        return element;
    });

    // Block ad iframes
    const originalAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function(node) {
        if (node.tagName === 'IFRAME' && isAdUrl(node.src)) {
            console.log('[Privacy Browser] Blocked ad iframe:', node.src);
            return node;
        }
        return originalAppendChild.call(this, node);
    });

    // Override YouTube's ad player
    const originalGetPlayer = window.ytplayer?.getPlayer;
    if (window.ytplayer) {
        window.ytplayer.getPlayer = function() {
            const player = originalGetPlayer?.call(this);
            if (player && player.loadAd) {
                player.loadAd = function() {
                    console.log('[Privacy Browser] Blocked ad load');
                    return Promise.resolve();
                };
            }
            return player;
        };
    }

    // Block YouTube's ad data in ytInitialData
    const originalPush = Array.prototype.push;
    window.ytInitialData = window.ytInitialData || {};
    const originalData = window.ytInitialData;
    
    // Remove ad slots from initial data
    function removeAdsFromData(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        
        if (Array.isArray(obj)) {
            return obj.filter(item => {
                if (item && typeof item === 'object') {
                    const str = JSON.stringify(item).toLowerCase();
                    if (str.includes('ad') && (str.includes('slot') || str.includes('adunit') || str.includes('advertisement'))) {
                        return false;
                    }
                }
                return true;
            }).map(removeAdsFromData);
        }
        
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
            const keyLower = key.toLowerCase();
            if (keyLower.includes('ad') && (keyLower.includes('slot') || keyLower.includes('adunit') || keyLower.includes('advertisement') || keyLower.includes('sponsor'))) {
                continue;
            }
            cleaned[key] = removeAdsFromData(value);
        }
        return cleaned;
    }

    // Clean ytInitialData when it's set
    Object.defineProperty(window, 'ytInitialData', {
        set: function(value) {
            Object.defineProperty(window, 'ytInitialData', {
                value: removeAdsFromData(value),
                writable: true,
                configurable: true
            });
        },
        get: function() {
            return window.ytInitialData;
        },
        configurable: true
    });

    // Notify background script of blocked ad
    function reportBlockedAd(url) {
        if (window.chrome && window.chrome.runtime) {
            window.chrome.runtime.sendMessage({
                type: 'AD_BLOCKED',
                url: url,
                timestamp: Date.now()
            }).catch(() => {});
        }
    }

    // Hook into YouTube's ad reporting
    const originalPostMessage = window.postMessage;
    window.postMessage = function(message, targetOrigin) {
        if (message && message.type === 'ad_response') {
            console.log('[Privacy Browser] Blocked ad response');
            return;
        }
        return originalPostMessage.apply(this, arguments);
    });

    console.log('[Privacy Browser] YouTube ad blocker loaded');
})();