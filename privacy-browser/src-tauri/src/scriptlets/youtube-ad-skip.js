// YouTube Ad Skipper - Automatically skips video ads
// Runs at document_idle to interact with the player

(function() {
    'use strict';

    const isYouTube = location.hostname.includes('youtube.com') || location.hostname.includes('youtube-nocookie.com');
    if (!isYouTube) return;

    // Ad skip selector
    const SKIP_BUTTON_SELECTORS = [
        '.ytp-ad-skip-button',
        '.ytp-ad-skip-button-modern',
        '.ytp-ad-skip-button-text',
        '.ytp-ad-skip-button-icon',
        '.ytp-ad-skip-button-container',
        '.ytp-ad-skip-button-slot',
        '[class*="ad-skip-button"]',
        'button[aria-label*="Skip"]',
        'button[aria-label*="skip"]',
    ];

    const AD_CONTAINER_SELECTORS = [
        '.ytp-ad-module',
        '.ytp-ad-overlay-container',
        '.ytp-ad-overlay-slot',
        '.ytp-ad-banner',
        '.ytp-ad-banner-container',
        '.video-ads',
        '.ytp-ad-slot',
        '.ytp-ad-overlay-slot',
        '.ytp-ad-module-slot',
    ];

    let lastUrl = location.href;
    let adSkipCount = 0;
    let observer = null;

    function skipAd() {
        for (const selector of SKIP_BUTTON_SELECTORS) {
            const button = document.querySelector(selector);
            if (button && !button.disabled && button.offsetParent !== null) {
                button.click();
                adSkipCount++;
                console.log('[Privacy Browser] Skipped YouTube ad. Total:', adSkipCount);
                
                // Notify background for stats
                if (window.chrome && chrome.runtime) {
                    try {
                        chrome.runtime.sendMessage({ type: 'youtube-ad-skipped', count: adSkipCount });
                    } catch (e) {}
                }
                return true;
            }
        }
        return false;
    }

    function hideAdContainers() {
        for (const selector of AD_CONTAINER_SELECTORS) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el.style.display !== 'none') {
                    el.style.setProperty('display', 'none', 'important');
                    el.setAttribute('data-privacy-browser-ad-hidden', 'true');
                }
            });
        }
    }

    function restoreAdContainers() {
        const elements = document.querySelectorAll('[data-privacy-browser-ad-hidden="true"]');
        elements.forEach(el => {
            el.style.removeProperty('display');
            el.removeAttribute('data-privacy-browser-ad-hidden');
        });
    }

    function checkForAds() {
        // Check for video ad playing
        const video = document.querySelector('video.html5-main-video');
        if (video) {
            // Check if it's an ad
            const player = document.querySelector('.html5-video-player');
            if (player && (player.classList.contains('ad-showing') || player.classList.contains('ad-playing'))) {
                // Try to skip
                setTimeout(skipAd, 500);
            }
        }

        // Check for skip button
        if (skipAd()) {
            // Ad was skipped, wait a bit then check again
            setTimeout(checkForAds, 1000);
        }

        // Hide ad containers
        hideAdContainers();

        // Check for URL change (SPA navigation)
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            // Reset ad detection
            setTimeout(() => {
                restoreAdContainers();
                setTimeout(checkForAds, 1000);
            }, 500);
        }
    }

    // Check immediately
    checkForAds();

    // Check periodically
    const interval = setInterval(checkForAds, 1000);

    // Watch for video element changes
    const videoObserver = new MutationObserver(() => {
        checkForAds();
    });

    videoObserver.observe(document, { childList: true, subtree: true });

    // Listen for YouTube player events
    window.addEventListener('yt-navigate-finish', () => {
        setTimeout(checkForAds, 500);
    });

    // Hook into YouTube's player API
    const originalPushState = history.pushState;
    history.pushState = function() {
        originalPushState.apply(this, arguments);
        setTimeout(() => {
            lastUrl = location.href;
            checkForAds();
        }, 500);
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function() {
        originalReplaceState.apply(this, arguments);
        setTimeout(() => {
            lastUrl = location.href;
            checkForAds();
        }, 500);
    };

    window.addEventListener('popstate', () => {
        setTimeout(() => {
            lastUrl = location.href;
            checkForAds();
        }, 500);
    });

    // Cleanup function
    window.__privacyBrowserYoutubeAdSkipper = {
        destroy: () => {
            clearInterval(interval);
            videoObserver.disconnect();
            observer?.disconnect();
            const style = document.getElementById('privacy-browser-youtube-ad-skipper');
            if (style) style.remove();
            restoreAdContainers();
        },
        getSkipCount: () => adSkipCount,
        forceSkip: skipAd,
    };

    console.log('[Privacy Browser] YouTube ad skipper loaded');
})();