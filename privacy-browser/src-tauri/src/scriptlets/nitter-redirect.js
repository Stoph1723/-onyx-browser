// Nitter Redirect - Redirects Twitter/X links to Nitter instances
// Runs at document_start

(function() {
    'use strict';

    // Nitter instances (prioritized)
    const NITTER_INSTANCES = [
        'nitter.net',
        'nitter.it',
        'nitter.fdn.fr',
        'nitter.unixfox.eu',
        'nitter.cz',
        'nitter.fdn.fr',
        'nitter.moomoo.me',
        'nitter.projectsegfau.lt',
        'nitter.pussthecat.org',
        'nitter.1d4.us',
        'nitter.42l.fr',
        'nitter.nixnet.services',
        'nitter.rawbit.ch',
        'nitter.ctrlaltdelete.de',
    ];

    let currentInstanceIndex = 0;

    function getNextInstance() {
        const instance = NITTER_INSTANCES[currentInstanceIndex];
        currentInstanceIndex = (currentInstanceIndex + 1) % NITTER_INSTANCES.length;
        return instance;
    }

    function isTwitterUrl(url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();
            return hostname === 'twitter.com' || 
                   hostname === 'www.twitter.com' || 
                   hostname === 'mobile.twitter.com' ||
                   hostname === 'x.com' ||
                   hostname === 'www.x.com' ||
                   hostname === 'mobile.x.com';
        } catch (e) {
            return false;
        }
    }

    function convertToNitter(url) {
        try {
            const urlObj = new URL(url);
            const instance = getNextInstance();
            
            // Preserve path and query
            const path = urlObj.pathname + urlObj.search + urlObj.hash;
            
            // Nitter uses same paths
            return `https://${instance}${path}`;
        } catch (e) {
            return url;
        }
    }

    // Redirect current page if it's Twitter/X
    if (isTwitterUrl(location.href)) {
        // Don't redirect if already on Nitter or if it's a special page
        if (location.pathname.startsWith('/settings') ||
            location.pathname.startsWith('/i/') ||
            location.pathname.startsWith('/compose') ||
            location.pathname.startsWith('/oauth') ||
            location.pathname.startsWith('/login') ||
            location.pathname.startsWith('/logout')) {
            return;
        }

        const nitterUrl = convertToNitter(location.href);
        if (nitterUrl !== location.href) {
            console.log('[Privacy Browser] Redirecting to Nitter:', nitterUrl);
            
            // Show brief notification
            const message = document.createElement('div');
            message.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #1a1a2e;
                color: #e8e8f0;
                padding: 16px 24px;
                border-radius: 8px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                border: 1px solid #e94560;
                z-index: 2147483647;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                max-width: 300px;
            `;
            message.innerHTML = `
                <strong>🔒 Redirecting to Nitter</strong><br>
                <small>Loading privacy-friendly Twitter frontend...</small>
            `;
            document.body.appendChild(message);
            
            setTimeout(() => {
                location.replace(nitterUrl);
            }, 500);
        }
    }

    // Also rewrite links on the page
    function rewriteTwitterLinks() {
        const links = document.querySelectorAll('a[href]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && isTwitterUrl(href)) {
                // Don't redirect special pages
                try {
                    const url = new URL(href, location.origin);
                    if (url.pathname.startsWith('/settings') ||
                        url.pathname.startsWith('/i/') ||
                        url.pathname.startsWith('/compose') ||
                        url.pathname.startsWith('/oauth') ||
                        url.pathname.startsWith('/login') ||
                        url.pathname.startsWith('/logout')) {
                        return;
                    }
                } catch (e) {}
                
                const nitterUrl = convertToNitter(href);
                if (nitterUrl !== href) {
                    link.setAttribute('data-original-href', href);
                    link.setAttribute('href', nitterUrl);
                }
            }
        });
    }

    // Also rewrite on link click
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a[href]');
        if (link && isTwitterUrl(link.href)) {
            const nitterUrl = convertToNitter(link.href);
            if (nitterUrl !== link.href) {
                link.setAttribute('data-original-href', link.href);
                link.href = nitterUrl;
            }
        }
    }, true);

    // Also handle navigation
    const originalPushState = history.pushState;
    history.pushState = function(state, title, url) {
        if (url && isTwitterUrl(url)) {
            url = convertToNitter(url);
        }
        return originalPushState.call(this, state, title, url);
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function(state, title, url) {
        if (url && isTwitterUrl(url)) {
            url = convertToNitter(url);
        }
        return originalReplaceState.call(this, state, title, url);
    };

    // Rewrite links on page load and dynamically
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(rewriteTwitterLinks, 100);
        });
    } else {
        setTimeout(rewriteTwitterLinks, 100);
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const links = node.querySelectorAll?.('a[href]');
                        if (links) {
                            links.forEach(link => {
                                const href = link.getAttribute('href');
                                if (href && isTwitterUrl(href)) {
                                    const nitterUrl = convertToNitter(href);
                                    if (nitterUrl !== href) {
                                        link.setAttribute('data-original-href', href);
                                        link.setAttribute('href', nitterUrl);
                                    }
                                }
                            });
                    }
                }
            });
        }
    });

    observer.observe(document, { childList: true, subtree: true });

    // Initial rewrite
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(rewriteTwitterLinks, 100));
    } else {
        setTimeout(rewriteTwitterLinks, 100);
    }

    console.log('[Privacy Browser] Nitter redirect loaded');
})();