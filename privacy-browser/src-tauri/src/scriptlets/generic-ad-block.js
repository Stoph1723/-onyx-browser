// Generic Ad Blocker - Removes common ad elements from any page
// Runs at document_idle

(function() {
    'use strict';

    // Skip YouTube (handled by dedicated scriptlets)
    if (location.hostname.includes('youtube.com') || location.hostname.includes('youtube-nocookie.com')) {
        return;
    }

    // CSS-based ad hiding
    const adHideCSS = `
        /* Google Ads */
        .adsbygoogle,
        .google-auto-placed,
        .google-ad-container,
        #google_ads_iframe_,
        ins.adsbygoogle,
        
        /* DoubleClick / Google Ad Manager */
        [id*="div-gpt-ad"],
        [id*="google_ads_"],
        [id*="doubleclick"],
        .gpt-ad,
        .goog-ad,
        
        /* Common ad classes */
        .ad,
        .ads,
        .advert,
        .advertisement,
        .ad-banner,
        .ad-container,
        .ad-wrapper,
        .ad-slot,
        .ad-placement,
        .ad-unit,
        .advert-box,
        .advert-wrap,
        
        /* ID patterns */
        [id*="-ad-"],
        [id*="_ad_"],
        [id*="ad-"],
        [id*="_ad"],
        [id^="ad_"],
        [id^="ad-"],
        [id*="adslot"],
        [id*="adunit"],
        [id*="adbanner"],
        
        /* Class patterns */
        [class*="ad-"],
        [class*="-ad"],
        [class*="_ad_"],
        [class*="ad_"],
        [class*="adsense"],
        [class*="advert"],
        [class*="sponsor"],
        [class*="promo"],
        
        /* Data attributes */
        [data-ad],
        [data-ad-slot],
        [data-ad-client],
        [data-ad-unit],
        [data-ad-zone],
        [data-ad-id],
        [data-ad-unit-id],
        [data-ad-unit-path],
        [data-google-query-id],
        
        /* Common ad network classes */
        .carbon-ad,
        .bsa-ad,
        .buysellads,
        .adn-network,
        .adn-ad,
        .taboola,
        .outbrain,
        .revcontent,
        .content-ad,
        .native-ad,
        .sponsored-content,
        .sponsored-link,
        .paid-post,
        .partner-content,
        .recommended-by,
        .related-links,
        
        /* Newsletter/popup overlays */
        .newsletter-popup,
        .email-signup,
        .subscribe-popup,
        .modal-overlay,
        .lightbox,
        .popup-overlay,
        .cookie-banner,
        .cookie-notice,
        .gdpr-banner,
        .consent-banner,
        
        /* Social media ads */
        [data-testid*="ad"],
        [data-testid*="sponsored"],
        [data-testid*="promoted"],
        
        /* Amazon ads */
        #amzn-assoc-ad-,
        
        /* In-feed ads */
        [data-testid*="ad"],
        [data-testid*="sponsored"],
        [data-testid*="promoted"],
    `;

    // Inject CSS
    const style = document.createElement('style');
    style.id = 'privacy-browser-generic-ad-hide';
    style.textContent = adHideCSS;
    document.head.appendChild(style);

    // Dynamic hiding for elements added later
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
            '[id*="ad-"], [id*="_ad"], [id^="ad_"], [id^="ad-"]',
            '[class*="ad-"], [class*="-ad"], [class*="_ad"], [class*="adsense"], [class*="advert"], [class*="sponsor"], [class*="promo"]',
            '[data-ad], [data-ad-slot], [data-ad-client], [data-ad-unit], [data-ad-zone]',
            '.adsbygoogle, .google-auto-placed, .google-ad-container, ins.adsbygoogle',
            '[id*="div-gpt-ad"], [id*="google_ads_"], [id*="doubleclick"], .gpt-ad, .goog-ad',
            '.carbon-ad, .bsa-ad, .buysellads, .adn-network, .adn-ad, .taboola, .outbrain, .revcontent',
            '.content-ad, .native-ad, .sponsored-content, .sponsored-link, .paid-post, .partner-content',
            '.newsletter-popup, .email-signup, .subscribe-popup, .modal-overlay, .lightbox, .popup-overlay',
            '[data-testid*="ad"], [data-testid*="sponsored"], [data-testid*="promoted"]',
            '#amzn-assoc-ad-',
            '[id*="adslot"], [id*="adunit"], [id*="adbanner"]',
            '[class*="ad-"], [class*="-ad"], [class*="adsense"], [class*="advert"], [class*="sponsor"], [class*="promo"]',
        ];

        const elements = root.querySelectorAll?.(
            adSelectors.join(', ')
        );
        
        if (elements) {
            elements.forEach(el => {
                if (el.style.display !== 'none') {
                    el.style.setProperty('display', 'none', 'important');
                    el.setAttribute('data-privacy-browser-ad-hidden', 'true');
                }
            });
        }
    }

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initial sweep
    setTimeout(() => hideAdElements(document.body), 100);

    // Expose cleanup
    window.__privacyBrowserGenericAdBlock = {
        destroy: () => {
            observer.disconnect();
            const style = document.getElementById('privacy-browser-generic-ad-hide');
            if (style) style.remove();
            
            document.querySelectorAll('[data-privacy-browser-ad-hidden="true"]').forEach(el => {
                el.style.removeProperty('display');
                el.removeAttribute('data-privacy-browser-ad-hidden');
            });
        }
    };

    console.log('[Privacy Browser] Generic ad blocker loaded');
})();