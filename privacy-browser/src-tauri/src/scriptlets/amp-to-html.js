// AMP to HTML Redirect - Redirects AMP pages to their canonical HTML versions
// Runs at document_start

(function() {
    'use strict';

    // Check if this is an AMP page
    const isAmpPage = document.documentElement.hasAttribute('amp') || 
                      document.documentElement.hasAttribute('⚡') ||
                      location.pathname.includes('/amp/') ||
                      location.pathname.endsWith('/amp') ||
                      location.search.includes('amp=1');

    if (!isAmpPage) return;

    // Try to find canonical link
    let canonicalUrl = null;

    // Method 1: <link rel="canonical">
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink && canonicalLink.href) {
        canonicalUrl = canonicalLink.href;
    }

    // Method 2: <link rel="amphtml"> (reverse)
    if (!canonicalUrl) {
        const amphtmlLink = document.querySelector('link[rel="amphtml"]');
        if (amphtmlLink && amphtmlLink.href) {
            // We're on the AMP page, the canonical is the non-AMP version
            // But we're already on AMP, so we need the reverse
        }
    }

    // Method 3: Remove /amp/ from path
    if (!canonicalUrl) {
        let path = location.pathname;
        if (path.includes('/amp/')) {
            path = path.replace(/\/amp\//g, '/');
        } else if (path.endsWith('/amp')) {
            path = path.slice(0, -4);
        }
        canonicalUrl = location.origin + path + location.search + location.hash;
    }

    // Method 4: Check for amp query param
    if (!canonicalUrl && location.search.includes('amp=')) {
        const url = new URL(location.href);
        url.searchParams.delete('amp');
        canonicalUrl = url.toString();
    }

    if (canonicalUrl && canonicalUrl !== location.href) {
        console.log('[Privacy Browser] Redirecting AMP to canonical:', canonicalUrl);
        
        // Notify user with a brief message before redirect
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
            <strong>🔄 Redirecting from AMP</strong><br>
            <small>Loading canonical HTML version...</small>
        `;
        document.body.appendChild(message);
        
        // Redirect after brief delay
        setTimeout(() => {
            location.replace(canonicalUrl);
        }, 500);
    } else if (canonicalUrl === location.href) {
        // Already on canonical, just clean up AMP attributes
        document.documentElement.removeAttribute('amp');
        document.documentElement.removeAttribute('⚡');
    }

    console.log('[Privacy Browser] AMP to HTML redirect loaded');
})();