// LibRedirect - Redirects to privacy-friendly frontends
// Runs at document_start

(function() {
    'use strict';

    // Frontend mappings
    const FRONTENDS = {
        // Twitter/X -> Nitter
        'twitter.com': {
            frontend: 'nitter',
            instances: [
                'https://nitter.net',
                'https://nitter.net',
                'https://nitter.1d4.us',
                'https://nitter.kavin.rocks',
                'https://nitter.cz',
                'https://nitter.moomoo.me',
                'https://nitter.privacydev.net',
                'https://nitter.1d4.us',
            ],
            paths: {
                '/': '/',
                '/status/': '/status/',
                '/i/': '/status/',
                '/user/': '/user/',
                '/search': '/search',
                '/hashtag/': '/search?q=%23',
            }
        },
        'x.com': {
            frontend: 'nitter',
            instances: [
                'https://nitter.net',
                'https://nitter.net',
                'https://nitter.1d4.us',
                'https://nitter.kavin.rocks',
                'https://nitter.cz',
                'https://nitter.moomoo.me',
                'https://nitter.privacydev.net',
                'https://nitter.1d4.us',
            ],
            paths: {
                '/': '/',
                '/status/': '/status/',
                '/i/': '/status/',
                '/user/': '/user/',
                '/search': '/search',
                '/hashtag/': '/search?q=%23',
            }
        },

        // YouTube -> Invidious
        'youtube.com': {
            frontend: 'invidious',
            instances: [
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
            ],
            paths: {
                '/watch': '/watch',
                '/watch?v=': '/watch?v=',
                '/shorts/': '/watch?v=',
                '/embed/': '/embed/',
                '/live/': '/watch?v=',
                '/channel/': '/channel/',
                '/c/': '/c/',
                '/user/': '/user/',
                '/@': '/c/',
                '/playlist': '/playlist',
            }
        },
        'youtu.be': {
            frontend: 'invidious',
            instances: [
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
            ],
            paths: {
                '/': '/watch?v=',
            }
        },

        // Reddit -> Libreddit
        'reddit.com': {
            frontend: 'libreddit',
            instances: [
                'https://libreddit.spike.codes',
                'https://libreddit.nixnet.services',
                'https://libreddit.nl',
                'https://libreddit.privacydev.net',
                'https://libreddit.tiekoetter.com',
                'https://libreddit.spike.codes',
                'https://reddit.privacydev.net',
            ],
            paths: {
                '/r/': '/r/',
                '/user/': '/user/',
                '/comments/': '/comments/',
                '/search': '/search',
            }
        },

        // Instagram -> Bibliogram (discontinued, use Pixelfed)
        'instagram.com': {
            frontend: 'pixelfed',
            instances: [
                'https://pixelfed.social',
                'https://pixelfed.de',
                'https://pixelfed.fr',
            ],
            paths: {}
        },

        // TikTok -> ProxiTok
        'tiktok.com': {
            frontend: 'proxitok',
            instances: [
                'https://proxitok.pablodav.eu',
                'https://proxitok.pablodav.eu',
            ],
            paths: {
                '/@': '/@',
                '/video/': '/video/',
            }
        },

        // Medium -> Scribe
        'medium.com': {
            frontend: 'scribe',
            instances: [
                'https://scribe.rip',
            ],
            paths: {
                '/': '/',
            }
        },

        // Imgur -> Rimgo
        'imgur.com': {
            frontend: 'rimgo',
            instances: [
                'https://rimgo.vercel.app',
                'https://rimgo.privacydev.net',
            ],
            paths: {
                '/gallery/': '/gallery/',
                '/a/': '/a/',
                '/': '/',
            }
        },

        // Google Maps -> OpenStreetMap
        'maps.google.com': {
            frontend: 'openstreetmap',
            instances: [
                'https://www.openstreetmap.org',
            ],
            paths: {
                '/maps/': '/search?query=',
                '/place/': '/search?query=',
            }
        },
    };

    function getRandomInstance(instances) {
        return instances[Math.floor(Math.random() * instances.length)];
    }

    function getFrontendConfig(hostname) {
        // Check exact match first
        if (FRONTENDS[hostname]) return FRONTENDS[hostname];
        
        // Check subdomain matches
        for (const [domain, config] of Object.entries(FRONTENDS)) {
            if (hostname.endsWith('.' + domain) || hostname === domain) {
                return config;
            }
        }
        return null;
    }

    function convertUrl(url) {
        try {
            const urlObj = new URL(url);
            const config = getFrontendConfig(urlObj.hostname);
            if (!config) return url;

            const instance = getRandomInstance(config.instances);
            let newPath = urlObj.pathname + urlObj.search + urlObj.hash;

            // Apply path mappings
            for (const [oldPath, newPathPrefix] of Object.entries(config.paths)) {
                if (urlObj.pathname.startsWith(oldPath)) {
                    newPath = newPathPrefix + urlObj.pathname.slice(oldPath.length) + urlObj.search + urlObj.hash;
                    break;
                }
            }

            return `${instance}${newPath}`;
        } catch (e) {
            return url;
        }
    }

    function shouldRedirect(url) {
        try {
            const urlObj = new URL(url);
            return !!getFrontendConfig(urlObj.hostname);
        } catch {
            return false;
        }
    }

    // Rewrite links on the page
    function rewriteLinks() {
        const links = document.querySelectorAll('a[href]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && shouldRedirect(href)) {
                const newUrl = convertUrl(href);
                if (newUrl !== href) {
                    link.setAttribute('data-original-href', href);
                    link.setAttribute('href', newUrl);
                    link.setAttribute('data-libredirect', 'true');
                }
            }
        });

        // Also rewrite form actions
        const forms = document.querySelectorAll('form[action]');
        forms.forEach(form => {
            const action = form.getAttribute('action');
            if (action && shouldRedirect(action)) {
                form.setAttribute('data-original-action', action);
                form.setAttribute('action', convertUrl(action));
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
                                if (href && shouldRedirect(href)) {
                                    const newUrl = convertUrl(href);
                                    if (newUrl !== href) {
                                        link.setAttribute('data-original-href', href);
                                        link.setAttribute('href', newUrl);
                                        link.setAttribute('data-libredirect', 'true');
                                    }
                                }
                            });
                        const forms = node.querySelectorAll?.('form[action]');
                        if (forms) {
                            forms.forEach(form => {
                                const action = form.getAttribute('action');
                                if (action && shouldRedirect(action)) {
                                    form.setAttribute('data-original-action', action);
                                    form.setAttribute('action', convertUrl(action));
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
            }, 100);
        });
    } else {
        setTimeout(() => {
            rewriteLinks();
        }, 100);
    }

    // Handle SPA navigation
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            setTimeout(() => {
                rewriteLinks();
            }, 100);
        }
    });

    urlObserver.observe(document, { subtree: true, childList: true });

    // Expose API
    window.__privacyBrowserLibRedirect = {
        destroy: () => {
            observer.disconnect();
            urlObserver.disconnect();
        },
        convertUrl,
        shouldRedirect,
        getFrontendConfig,
    };

    console.log('[Privacy Browser] LibRedirect loaded');
})();