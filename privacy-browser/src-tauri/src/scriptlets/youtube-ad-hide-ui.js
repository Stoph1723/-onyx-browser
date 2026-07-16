// YouTube Ad UI Hider - Hides ad UI elements on YouTube
// Runs at document_idle

(function() {
    'use strict';

    if (!location.hostname.includes('youtube.com')) return;

    // CSS to hide ad elements
    const adHideCSS = `
        /* Video ads */
        .ytp-ad-module,
        .ytp-ad-player-overlay,
        .ytp-ad-player-overlay-layout,
        .ytp-ad-preview-container,
        .ytp-ad-preview-slot,
        .ytp-ad-preview,
        .ytp-ad-image,
        .ytp-ad-text,
        .ytp-ad-brand,
        .ytp-ad-button-container,
        .ytp-ad-call-to-action,
        .ytp-ad-companion-slot,
        .ytp-ad-companion,
        .ytp-ad-companion-container,
        .ytp-ad-slot,
        .video-ads,
        .ytp-ad-module-slot,
        .ytp-ad-video-preview,
        .ytp-ad-video-preview-container,
        
        /* Overlay ads */
        .ytp-ad-overlay-container,
        .ytp-ad-overlay-slot,
        .ytp-ad-overlay-close-container,
        .ytp-ad-overlay-close-button,
        .video-ads.ytp-ad-overlay,
        
        /* Banner ads */
        .ytp-ad-banner,
        .ytp-ad-banner-container,
        .ytp-ad-banner-slot,
        .ytp-ad-banner-close-button,
        .ytp-ad-banner-content,
        
        /* Masthead ads */
        .ytd-masthead-ad,
        .ytd-masthead-ad-renderer,
        .ytd-promoted-sparkles-web-renderer,
        
        /* Sidebar ads */
        .ytd-promoted-video-renderer,
        .ytd-display-ad-renderer,
        .ytd-ad-slot-renderer,
        .ytd-ad-slot-renderer[style*="display: none"] + *,
        
        /* Homepage ads */
        .ytd-rich-section-renderer[style*="ads"],
        .ytd-rich-grid-slim-media[style*="ad"],
        ytd-rich-item-renderer[is-ad],
        ytd-ad-slot-renderer,
        
        /* Search ads */
        .ytd-video-renderer[style*="ad"],
        .ytd-video-renderer[is-ad],
        .ytd-promoted-sparkles-text-search-renderer,
        
        /* Mobile ads */
        .ytp-ad-mobile-overlay,
        .ytp-ad-mobile-banner,
        
        /* Skip ad button container (hide when no ad) */
        .ytp-ad-skip-button-container:empty,
        .ytp-ad-skip-button-slot:empty,
        
        /* Ad annotations */
        .ytp-annotation.ytp-ad-annotation,
        
        /* Ad markers on progress bar */
        .ytp-ad-marker,
        .ytp-ad-marker-container,
        
        /* Up next ads */
        .ytp-upnext-ad,
        .ytp-upnext-ad-container,
        
        /* Sponsored content labels */
        .ytd-badge-supported-renderer[style*="sponsored"],
        .ytd-badge-renderer[style*="sponsored"],
        
        /* In-feed ads */
        ytd-rich-item-renderer[class*="ad"],
        ytd-rich-item-renderer[is-ad],
        
        /* Shorts ads */
        .ytd-reel-video-renderer[is-ad],
        .ytd-reel-video-renderer[is-ad="true"],
        
        /* Live chat ads */
        .yt-live-chat-ad-banner,
        
        /* Merch shelf ads */
        .ytd-merch-shelf-renderer[style*="ad"],
        
        /* Channel page ads */
        .ytd-channel-header-renderer .ytd-ad-slot-renderer,
        
        /* Playlist ads */
        .ytd-playlist-panel-renderer ytd-ad-slot-renderer,
    `;

    // Inject CSS
    const style = document.createElement('style');
    style.id = 'privacy-browser-youtube-ad-hide';
    style.textContent = adHideCSS;
    document.head.appendChild(style);

    // Additional dynamic hiding for elements added later
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    hideAdElements(node);
                }
            }
        });
    });

    function hideAdElements(root) {
        const adSelectors = [
            'ytd-ad-slot-renderer',
            'ytd-rich-item-renderer[is-ad]',
            'ytd-rich-item-renderer[class*="ad"]',
            'ytd-reel-video-renderer[is-ad]',
            'ytd-reel-video-renderer[is-ad="true"]',
            '.ytd-masthead-ad-renderer',
            '.ytd-promoted-video-renderer',
            '.ytd-promoted-sparkles-web-renderer',
            '.ytd-promoted-sparkles-text-search-renderer',
            '.ytd-display-ad-renderer',
            '.ytd-ad-slot-renderer',
            '.ytp-ad-module',
            '.ytp-ad-overlay-container',
            '.ytp-ad-banner',
            '.video-ads',
        ];

        adSelectors.forEach(selector => {
            const elements = root.querySelectorAll?.(selector);
            if (elements) {
                elements.forEach(el => {
                    if (el.style.display !== 'none') {
                        el.style.setProperty('display', 'none', 'important');
                        el.setAttribute('data-privacy-browser-hidden', 'true');
                    }
                });
            });
        });

        // Hide elements with ad-related attributes
        const adElements = root.querySelectorAll?.('[is-ad], [is-ad="true"], [class*="ad"][class*="renderer"]');
        adElements?.forEach(el => {
            if (el.style.display !== 'none') {
                el.style.setProperty('display', 'none', 'important');
                el.setAttribute('data-privacy-browser-hidden', 'true');
            }
        });
    }

    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initial sweep
    setTimeout(() => hideAdElements(document.body), 100);

    // Also hide on navigation (YouTube is SPA)
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            setTimeout(() => hideAdElements(document.body), 500);
        }
    });

    urlObserver.observe(document, { subtree: true, childList: true });

    // Expose cleanup
    window.__privacyBrowserYoutubeAdHider = {
        destroy: () => {
            observer.disconnect();
            urlObserver.disconnect();
            const style = document.getElementById('privacy-browser-youtube-ad-hide');
            if (style) style.remove();
            
            // Restore hidden elements
            document.querySelectorAll('[data-privacy-browser-hidden="true"]').forEach(el => {
                el.style.removeProperty('display');
                el.removeAttribute('data-privacy-browser-hidden');
            });
        }
    };

    console.log('[Privacy Browser] YouTube ad UI hider loaded');
})();