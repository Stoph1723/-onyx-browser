// Invidious Redirect - Redirects YouTube links to Invidious instances
// Runs at document_start

(function() {
    'use strict';

    const isYouTube = location.hostname.includes('youtube.com') || location.hostname.includes('youtube-nocookie.com');
    if (isYouTube) return; // Don't redirect if already on YouTube

    // Invidious instances (randomized for load balancing)
    const INVIDIOUS_INSTANCES = [
        'https://yewtu.be',
        'https://invidious.snopyta.org',
        'https://invidious.kavin.rocks',
        'https://invidious.nerdvpn.de',
        'https://invidious.flokinet.to',
        'https://invidious.projectsegfau.lt',
        'https://invidious.privacydev.net',
        'https://invidious.tiekoetter.com',
        'https://invidious.048596.xyz',
        'https://invidious.sethforprivacy.com',
    ];

    // Pick a random instance
    const INSTANCE = INVIDIOUS_INSTANCES[Math.floor(Math.random() * INVIDIOUS_INSTANCES.length)];

    // YouTube URL patterns to redirect
    const YOUTUBE_PATTERNS = [
        /^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /^https?:\/\/(www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /^https?:\/\/(www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
        /^https?:\/\/(www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /^https?:\/\/(www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
        /^https?:\/\/(www\.)?youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
        /^https?:\/\/(www\.)?youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
        /^https?:\/\/(www\.)?youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
        /^https?:\/\/(www\.)?youtube\.com\/@([a-zA-Z0-9_-]+)/,
        /^https?:\/\/(www\.)?youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
    ];

    function isYouTubeUrl(url) {
        return YOUTUBE_PATTERNS.some(pattern => pattern.test(url));
    }

    function convertToInvidious(url) {
        // Video watch page
        let match = url.match(/^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
        if (match) {
            const videoId = match[2];
            const params = new URLSearchParams(new URL(url).search);
            params.delete('v');
            const query = params.toString() ? '?' + params.toString() : '';
            return `${INSTANCE}/watch?v=${videoId}${query}`;
        }

        // youtu.be short links
        match = url.match(/^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        if (match) {
            const videoId = match[1];
            const params = new URLSearchParams(new URL(url).search);
            const query = params.toString() ? '?' + params.toString() : '';
            return `${INSTANCE}/watch?v=${videoId}${query}`;
        }

        // Embed URLs
        match = url.match(/^https?:\/\/(www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
        if (match) {
            const videoId = match[2];
            return `${INSTANCE}/embed/${videoId}`;
        }

        // Shorts
        match = url.match(/^https?:\/\/(www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
        if (match) {
            const videoId = match[2];
            return `${INSTANCE}/watch?v=${videoId}`;
        }

        // Live
        match = url.match(/^https?:\/\/(www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
        if (match) {
            const videoId = match[2];
            return `${INSTANCE}/watch?v=${videoId}`;
        }

        // Channel
        match = url.match(/^https?:\/\/(www\.)?youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
        if (match) {
            const channelId = match[2];
            return `${INSTANCE}/channel/${channelId}`;
        }

        // Custom URL (c/ or @)
        match = url.match(/^https?:\/\/(www\.)?youtube\.com\/(?:c\/|@)([a-zA-Z0-9_-]+)/);
        if (match) {
            const handle = match[2];
            return `${INSTANCE}/c/${handle}`;
        }

        // User
        match = url.match(/^https?:\/\/(www\.)?youtube\.com\/user\/([a-zA-Z0-9_-]+)/);
        if (match) {
            const username = match[2];
            return `${INSTANCE}/user/${username}`;
        }

        // Playlist
        match = url.match(/^https?:\/\/(www\.)?youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/);
        if (match) {
            const playlistId = match[2];
            return `${INSTANCE}/playlist?list=${playlistId}`;
        }

        return url;
    }

    function isYouTubeUrlTest(url) {
        return YOUTUBE_PATTERNS.some(pattern => pattern.test(url));
    }

    function convertToInvidious(url) {
        return convertToInvidious(url);
    }

    // Rewrite links on the page
    function rewriteLinks() {
        const links = document.querySelectorAll('a[href]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && isYouTubeUrlTest(href)) {
                const newUrl = convertToInvidious(href);
                if (newUrl !== href) {
                    link.setAttribute('data-original-href', href);
                    link.setAttribute('href', newUrl);
                    link.setAttribute('data-invidious-redirect', 'true');
                }
            }
        });
    }

    // Also rewrite form actions
    function rewriteForms() {
        const forms = document.querySelectorAll('form[action]');
        forms.forEach(form => {
            const action = form.getAttribute('action');
            if (action && isYouTubeUrlTest(action)) {
                form.setAttribute('data-original-action', action);
                form.setAttribute('action', convertToInvidious(action));
            }
        });
    }

    // Handle dynamic content
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const links = node.querySelectorAll?.('a[href]');
                        if (links) {
                            links.forEach(link => {
                                const href = link.getAttribute('href');
                                if (href && isYouTubeUrlTest(href)) {
                                    const newUrl = convertToInvidious(href);
                                    if (newUrl !== href) {
                                        link.setAttribute('data-original-href', href);
                                        link.setAttribute('href', newUrl);
                                        link.setAttribute('data-invidious-redirect', 'true');
                                    }
                                }
                            });
                        const forms = node.querySelectorAll?.('form[action]');
                        if (forms) {
                            forms.forEach(form => {
                                const action = form.getAttribute('action');
                                if (action && isYouTubeUrlTest(action)) {
                                    form.setAttribute('data-original-action', action);
                                    form.setAttribute('action', convertToInvidious(action));
                                }
                            });
                    }
                });
            }
        });
    });

    observer.observe(document, { childList: true, subtree: true });

    // Initial rewrite
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                rewriteLinks();
                rewriteForms();
            }, 100);
        });
    } else {
        setTimeout(() => {
            rewriteLinks();
            rewriteForms();
        }, 100);
    }

    // Also handle navigation (SPA)
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            setTimeout(() => {
                rewriteLinks();
                rewriteForms();
            }, 100);
        }
    });

    urlObserver.observe(document, { subtree: true, childList: true });

    // Expose for cleanup
    window.__privacyBrowserInvidiousRedirect = {
        destroy: () => {
            observer.disconnect();
            urlObserver.disconnect();
        }
    };

    console.log('[Privacy Browser] Invidious redirect loaded');
})();