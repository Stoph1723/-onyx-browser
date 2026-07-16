// Anti-Adblock Killer - Defeats common anti-adblock detection scripts
// Runs at document_start

(function() {
    'use strict';

    // List of known anti-adblock detection functions/objects to neutralize
    const ANTI_ADBLOCK_SIGNATURES = [
        // Common anti-adblock variables
        'adblockDetector',
        'adBlockDetected',
        'adblockDetected',
        'isAdBlockEnabled',
        'adBlockerDetected',
        'detectAdblock',
        'adblockDetect',
        'blockAdblock',
        'adblockWarning',
        'antiAdblock',
        'antiAdBlock',
        'fuckAdBlock',
        'fuckAdblock',
        'adBlocker',
        'AdBlock',
        'adBlock',
        'AdblockDetector',
        'AdBlockDetector',
        
        // Common anti-adblock functions
        'initAdblockDetector',
        'runAdblockDetection',
        'checkAdblock',
        'checkAdBlock',
        'detectAdBlock',
        'showAdblockNotice',
        'showAdblockWarning',
        'displayAdblockMessage',
        
        // Specific known anti-adblock scripts
        'fuckAdBlockOptions',
        'fuckAdBlockInstance',
        'fuckAdBlock',
        'adblockDetectorInstance',
        'adBlockDetectorInstance',
    ];

    // Neutralize known anti-adblock variables
    function neutralizeAntiAdblock() {
        for (const name of ANTI_ADBLOCK_SIGNATURES) {
            if (window[name] !== undefined) {
                // Override with harmless function/value
                try {
                    if (typeof window[name] === 'function') {
                        window[name] = function() { return false; };
                    } else {
                        window[name] = false;
                    }
                    // Make it non-configurable to prevent redefinition
                    Object.defineProperty(window, name, {
                        value: false,
                        writable: false,
                        configurable: false,
                    });
                } catch (e) {
                    // Ignore errors
                }
            }
        }
    }

    // Override common detection methods
    function overrideDetectionMethods() {
        // Override document.querySelector to hide adblock detection elements
        const originalQuerySelector = document.querySelector;
        document.querySelector = function(selector) {
            // Hide common adblock detection elements
            if (selector && (
                selector.includes('adblock') ||
                selector.includes('ad-block') ||
                selector.includes('.adblock') ||
                selector.includes('#adblock') ||
                selector.includes('[adblock]') ||
                selector.includes('.adblock-detected') ||
                selector.includes('.adblock-notice') ||
                selector.includes('.adblock-warning')
            )) {
                return null;
            }
            return originalQuerySelector.call(this, selector);
        };

        const originalQuerySelectorAll = document.querySelectorAll;
        document.querySelectorAll = function(selector) {
            if (selector && (
                selector.includes('adblock') ||
                selector.includes('ad-block') ||
                selector.includes('.adblock') ||
                selector.includes('#adblock') ||
                selector.includes('[adblock]') ||
                selector.includes('.adblock-detected') ||
                selector.includes('.adblock-notice') ||
                selector.includes('.adblock-warning')
            )) {
                return new NodeList();
            }
            return originalQuerySelectorAll.call(this, selector);
        };

        // Override getElementById
        const originalGetElementById = document.getElementById;
        document.getElementById = function(id) {
            if (id && (id.includes('adblock') || id.includes('ad-block'))) {
                return null;
            }
            return originalGetElementById.call(this, id);
        };

        // Override getElementsByClassName
        const originalGetElementsByClassName = document.getElementsByClassName;
        document.getElementsByClassName = function(className) {
            if (className && (className.includes('adblock') || className.includes('ad-block'))) {
                return new HTMLCollection();
            }
            return originalGetElementsByClassName.call(this, className);
        };
    }

    // Block anti-adblock scripts from loading
    function blockAntiAdblockScripts() {
        const originalCreateElement = document.createElement;
        document.createElement = function(tagName) {
            const element = originalCreateElement.call(this, tagName);
            if (tagName.toLowerCase() === 'script') {
                Object.defineProperty(element, 'src', {
                    set: function(src) {
                        if (isAntiAdblockScript(src)) {
                            console.log('[Privacy Browser] Blocked anti-adblock script:', src);
                            return;
                        }
                        return Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src').set.call(this, src);
                    },
                    get: function() {
                        return Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src').get.call(this);
                    },
                    configurable: true
                });
            }
            return element;
        };
    }

    function isAntiAdblockScript(src) {
        if (!src) return false;
        const srcLower = src.toLowerCase();
        const antiAdblockPatterns = [
            'adblock',
            'adblock',
            'antiadblock',
            'anti-adblock',
            'blockadblock',
            'detectadblock',
            'fuckadblock',
            'adblockdetector',
            'adblockdetect',
            'adblockwarning',
            'adblocknotice',
            'pagefair',
            'adblockplus',
            'ublock',
            'adguard',
            'adblockplus.org',
            'getadblock.com',
            'adblockplus.org',
            'adblockplus.org',
            'adblockplus.org',
        ];
        return antiAdblockPatterns.some(pattern => srcLower.includes(pattern));
    }

    // Override console methods to hide anti-adblock logs
    function overrideConsole() {
        const originalLog = console.log;
        console.log = function(...args) {
            const message = args.join(' ');
            if (message.toLowerCase().includes('adblock') || 
                message.toLowerCase().includes('ad block') ||
                message.toLowerCase().includes('fuckadblock')) {
                return;
            }
            return originalLog.apply(this, arguments);
        };

        const originalWarn = console.warn;
        console.warn = function(...args) {
            const message = args.join(' ');
            if (message.toLowerCase().includes('adblock') || 
                message.toLowerCase().includes('ad block')) {
                return;
            }
            return originalWarn.apply(this, arguments);
        };
    }

    // Override localStorage/cookie checks used for adblock detection
    function overrideStorageChecks() {
        const originalGetItem = Storage.prototype.getItem;
        Storage.prototype.getItem = function(key) {
            if (key && (key.includes('adblock') || key.includes('ad_block') || key.includes('adblock'))) {
                return null;
            }
            return originalGetItem.call(this, key);
        };

        const originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) {
            if (key && (key.includes('adblock') || key.includes('ad_block'))) {
                return;
            }
            return originalSetItem.call(this, key, value);
        };
    }

    // Initialize all protections
    function init() {
        neutralizeAntiAdblock();
        overrideDetectionMethods();
        blockAntiAdblockScripts();
        overrideConsole();
        overrideStorageChecks();

        console.log('[Privacy Browser] Anti-adblock killer loaded');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('[Privacy Browser] Anti-adblock killer loaded');
})();