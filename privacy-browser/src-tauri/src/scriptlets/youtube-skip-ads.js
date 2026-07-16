// YouTube Auto-Skip Ads - Automatically clicks "Skip Ad" button
// Runs at document_idle

(function() {
    'use strict';

    if (!location.hostname.includes('youtube.com')) return;

    let skipCheckInterval = null;
    let skipAttempts = 0;
    const maxSkipAttempts = 30; // Try for 30 seconds

    function trySkipAd() {
        // Try multiple selectors for skip button
        const skipSelectors = [
            '.ytp-ad-skip-button',
            '.ytp-ad-skip-button-modern',
            '.ytp-ad-skip-button-container button',
            '.video-ads .ytp-ad-skip-button',
            '.ad-showing .ytp-ad-skip-button',
            'button[aria-label*="Skip"]',
            'button[aria-label*="skip" i]',
            '.ytp-ad-skip-button-slot button',
        ];

        for (const selector of skipSelectors) {
            const skipButton = document.querySelector(selector);
            if (skipButton && !skipButton.disabled && skipButton.offsetParent !== null) {
                skipButton.click();
                console.log('[Privacy Browser] Skipped YouTube ad');
                
                // Report skip to background
                if (window.chrome && window.chrome.runtime) {
                    chrome.runtime.sendMessage({
                        type: 'YOUTUBE_AD_SKIPPED',
                        timestamp: Date.now()
                    }).catch(() => {});
                }
                
                return true;
            }
        }
        return false;
    }

    // Check for overlay ads (bottom banner)
    function closeOverlayAds() {
        const overlaySelectors = [
            '.ytp-ad-overlay-close-button',
            '.ytp-ad-overlay-close-container button',
            '.video-ads .ytp-ad-overlay-close-button',
        ];

        for (const selector of overlaySelectors) {
            const closeButton = document.querySelector(selector);
            if (closeButton && closeButton.offsetParent !== null) {
                closeButton.click();
                console.log('[Privacy Browser] Closed overlay ad');
                return true;
            }
        }
        return false;
    }

    // Check for bumper ads (unskippable short ads)
    function handleBumperAds() {
        // Bumper ads are typically 6 seconds and unskippable
        // We can't skip them, but we can mute them
        const video = document.querySelector('video.html5-main-video');
        if (video && video.duration <= 7 && document.querySelector('.ytp-ad-player-overlay')) {
            video.muted = true;
            console.log('[Privacy Browser] Muted bumper ad');
        }
    }

    function checkForAds() {
        const skipped = trySkipAd();
        const closed = closeOverlayAds();
        handleBumperAds();

        if (skipped || closed) {
            skipAttempts = 0; // Reset on success
        } else {
            skipAttempts++;
        }

        if (skipAttempts >= maxSkipAttempts) {
            stopChecking();
        }
    }

    function startChecking() {
        if (skipCheckInterval) return;
        skipAttempts = 0;
        skipCheckInterval = setInterval(checkForAds, 1000);
        // Also check immediately
        checkForAds();
    }

    function stopChecking() {
        if (skipCheckInterval) {
            clearInterval(skipCheckInterval);
            skipCheckInterval = null;
        }
    }

    // Start when video player is ready
    function waitForPlayer() {
        const player = document.querySelector('#movie_player, #movie_player-flash');
        if (player) {
            startChecking();
        } else {
            setTimeout(waitForPlayer, 500);
        }
    }

    // Also check when URL changes (SPA navigation)
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            stopChecking();
            setTimeout(startChecking, 1000);
        }
    });

    urlObserver.observe(document, { subtree: true, childList: true });

    // Start watching
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForPlayer);
    } else {
        waitForPlayer();
    }

    // Cleanup on unload
    window.addEventListener('beforeunload', () => {
        stopChecking();
        urlObserver.disconnect();
    });

    console.log('[Privacy Browser] YouTube auto-skip loaded');
})();