// YouTube Ad Request Blocker - Blocks ad network requests at the network level
// Runs at document_start to intercept requests early

(function() {
    'use strict';

    const isYouTube = location.hostname.includes('youtube.com') || location.hostname.includes('youtube-nocookie.com');
    if (!isYouTube) return;

    // Ad URL patterns to block
    const AD_URL_PATTERNS = [
        // Google Ads
        '/pagead/',
        '/ads?id=',
        '/ads?',
        '/ad?',
        '/adclick.',
        '/adview.',
        '/adsense.',
        '/advertisement.',
        '/sponsorship.',
        '/doubleclick/',
        '/googlesyndication/',
        '/googleadservices/',
        '/googleads.',
        '/googleads.',
        
        // YouTube specific ad endpoints
        '/api/stats/ads',
        '/api/stats/watchtime',
        '/ptracking?',
        '/pagead/',
        '/ads?id=',
        '/ads?',
        '/ad?',
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
        
        // YouTube specific
        '/api/stats/ads',
        '/api/stats/watchtime',
        '/get_video_info?ad',
        '/get_video_info?adformat',
        '/get_video_info?ad_tag',
        '/get_video_info?ad_tag_url',
        '/get_video_info?ad_tag_type',
        '/get_video_info?ad_tag_format',
        '/get_video_info?ad_tag_parameters',
        '/api/stats/qoe',
        '/api/stats/ads',
        '/api/stats/watchtime',
        
        // DoubleClick
        '/doubleclick.net/',
        '/doubleclick.com/',
        '.doubleclick.',
        
        // Google Syndication
        '/googlesyndication.',
        '/pagead2.',
        '/pagead/',
        '/adsense.',
        
        // Ad networks
        '/ads.',
        '/ad.',
        '/adserver.',
        '/adserver.',
        '/advertising.',
        '/advert.',
        '/banner.',
        '/click.',
        '/tracking.',
        '/analytics.',
        '/collect.',
        '/collect?',
        '/pixel.',
        '/beacon.',
        '/beacon?',
        '/event.',
        '/event?',
        
        // Video ad specific
        '/videoplayback?ad',
        '/videoplayback?adformat',
        '/videoplayback?adtag',
        '/videoplayback?adtagurl',
        '/videoplayback?adtagtype',
        '/videoplayback?adtagformat',
        '/videoplayback?adtagparameters',
        '/videoplayback?adformat',
        '/videoplayback?adtype',
        '/videoplayback?adunit',
        '/videoplayback?adslot',
        '/videoplayback?adchannel',
        '/videoplayback?adclient',
        '/videoplayback?adhost',
        '/videoplayback?adregion',
        '/videoplayback?adtag',
        '/videoplayback?adurl',
        '/videoplayback?addest',
        '/videoplayback?adclick',
        '/videoplayback?adimpression',
        '/videoplayback?adview',
        '/videoplayback?adclickthrough',
        '/videoplayback?adviewthrough',
    ];

    const AD_DOMAINS = [
        'doubleclick.net',
        'doubleclick.com',
        'googlesyndication.com',
        'googleadservices.com',
        'googleads.g.doubleclick.net',
        'pagead2.googlesyndication.com',
        'pagead2.googlesyndication.com',
        'adservice.google.com',
        'adservice.google.com',
        'adservice.google.ca',
        'adservice.google.co.uk',
        'adservice.google.de',
        'adservice.google.fr',
        'adservice.google.es',
        'adservice.google.it',
        'adservice.google.nl',
        'adservice.google.pl',
        'adservice.google.com.br',
        'adservice.google.com.mx',
        'adservice.google.com.au',
        'adservice.google.co.jp',
        'adservice.google.co.in',
        'adservice.google.com.hk',
        'adservice.google.com.tw',
        'adservice.google.com.sg',
        'adservice.google.co.id',
        'adservice.google.com.ph',
        'adservice.google.com.my',
        'adservice.google.com.vn',
        'adservice.google.com.th',
        'adservice.google.co.th',
        'adservice.google.co.id',
        'adservice.google.com.vn',
        'adservice.google.co.th',
        'adservice.google.co.id',
        'adservice.google.com.vn',
        'adservice.google.co.th',
        'adservice.google.co.id',
        'adservice.google.com.vn',
        'googlesyndication.com',
        'googleadservices.com',
        'googleadservices.com',
        'googletagservices.com',
        'googletagmanager.com',
        'googletagmanager.com',
        'googletagmanager.com',
        'googletagmanager.com',
    ];

    function isAdUrl(url) {
        if (!url) return false;
        const urlLower = url.toLowerCase();
        
        // Check patterns
        if (AD_URL_PATTERNS.some(pattern => urlLower.includes(pattern.toLowerCase()))) {
            return true;
        }
        
        // Check domains
        try {
            const urlObj = new URL(url);
            if (AD_DOMAINS.some(domain => urlObj.hostname.includes(domain))) {
                return true;
            }
        } catch (e) {
            // Invalid URL, check anyway
        }
        
        return false;
    }

    // Override XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        if (isAdUrl(url)) {
            console.log('[Privacy Browser] Blocked ad XHR:', url);
            this.abort();
            // Notify background for stats
            if (window.chrome && chrome.runtime) {
                chrome.runtime.sendMessage({ type: 'youtube-ad-blocked', url });
            }
            return;
        }
        return originalXHROpen.apply(this, arguments);
    };

    // Override fetch
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
        const url = typeof input === 'string' ? input : input.url;
        if (isAdUrl(url)) {
            console.log('[Privacy Browser] Blocked ad fetch:', url);
            return Promise.reject(new Error('Ad request blocked by Privacy Browser'));
        }
        return originalFetch.apply(this, arguments);
    };

    // Override navigator.sendBeacon
    const originalSendBeacon = navigator.sendBeacon;
    navigator.sendBeacon = function(url, data) {
        if (isAdUrl(url)) {
            console.log('[Privacy Browser] Blocked ad beacon:', url);
            return false;
        }
        return originalSendBeacon.call(this, url, data);
    };

    // Override Image constructor (used for tracking pixels)
    const originalImage = window.Image;
    window.Image = function() {
        const img = new originalImage();
        const originalSrcSetter = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src').set;
        Object.defineProperty(this, 'src', {
            set: function(src) {
                if (isAdUrl(src)) {
                    console.log('[Privacy Browser] Blocked ad image:', src);
                    return;
                }
                return originalSrcSetter.call(this, src);
            },
            get: function() {
                return originalSrcGetter.call(this);
            }
        });
        return img;
    };

    const originalSrcGetter = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src').get;

    // Override HTMLScriptElement src
    const originalScriptSrcSetter = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src').set;
    Object.defineProperty(HTMLScriptElement.prototype, 'src', {
        set: function(src) {
            if (typeof src === 'string' && isAdUrl(src)) {
                console.log('[Privacy Browser] Blocked ad script:', src);
                return;
            }
            return originalScriptSrcSetter.call(this, src);
        },
        get: Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src').get
    });

    // Override HTMLLinkElement href (for preload/prefetch)
    const originalLinkHrefSetter = Object.getOwnPropertyDescriptor(HTMLLinkElement.prototype, 'href').set;
    Object.defineProperty(HTMLLinkElement.prototype, 'href', {
        set: function(href) {
            if (typeof href === 'string' && isAdUrl(href)) {
                console.log('[Privacy Browser] Blocked ad link preload:', href);
                return;
            }
            return originalLinkHrefSetter.call(this, href);
        },
        get: Object.getOwnPropertyDescriptor(HTMLLinkElement.prototype, 'href').get
    });

    // Block WebSocket connections to ad servers
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
        if (isAdUrl(url)) {
            console.log('[Privacy Browser] Blocked ad WebSocket:', url);
            throw new Error('Ad WebSocket blocked');
        }
        return new originalWebSocket(url, protocols);
    };

    // Block EventSource connections
    const originalEventSource = window.EventSource;
    window.EventSource = function(url, options) {
        if (isAdUrl(url)) {
            console.log('[Privacy Browser] Blocked ad EventSource:', url);
            throw new Error('Ad EventSource blocked');
        }
        return new originalEventSource(url, options);
    };

    // Notify background for stats
    function notifyAdBlocked(url) {
        if (window.chrome && chrome.runtime) {
            try {
                chrome.runtime.sendMessage({ type: 'youtube-ad-blocked', url });
            } catch (e) {
                // Extension context invalidated, ignore
            }
        }
    }

    // Listen for YouTube navigation (SPA)
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            // Re-scan for ads on navigation
        }
    });

    urlObserver.observe(document, { subtree: true, childList: true });

    console.log('[Privacy Browser] YouTube ad request blocker loaded');
})();