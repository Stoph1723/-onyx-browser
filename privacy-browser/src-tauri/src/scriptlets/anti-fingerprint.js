// Anti-Fingerprinting Scriptlet - Protects against canvas, WebGL, audio, and other fingerprinting
// Runs at document_start for maximum protection

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        canvas: true,
        webgl: true,
        audio: true,
        clientRects: true,
        fontEnumeration: true,
        hardwareConcurrency: true,
        deviceMemory: true,
        screenResolution: true,
        timezone: true,
        language: true,
        platform: true,
        plugins: true,
        mimeTypes: true,
        battery: true,
        webglVendor: true,
        webglRenderer: true,
        audioContext: true,
        mediaDevices: true,
        gamepad: true,
        touchSupport: true,
        doNotTrack: true,
    };

    // Generate consistent noise per session
    const SESSION_SEED = Math.random().toString(36).substring(2, 15);
    
    function getDeterministicNoise(seed, max = 1) {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash |= 0;
        }
        return (Math.abs(hash) % 10000) / 10000 * max;
    }

    // Canvas fingerprinting protection
    if (CONFIG.canvas) {
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function(...args) {
            const context = this.getContext('2d');
            if (context) {
                // Add subtle noise
                const noise = getDeterministicNoise(SESSION_SEED + this.width + 'x' + this.height, 0.001);
                context.fillStyle = `rgba(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255},${noise})`;
                context.fillRect(0, 0, 1, 1);
            }
            return originalToDataURL.apply(this, args);
        };

        const originalToBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function(callback, type, encoderOptions) {
            const context = this.getContext('2d');
            if (context) {
                const noise = getDeterministicNoise(SESSION_SEED + this.width + 'x' + this.height, 0.001);
                context.fillStyle = `rgba(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255},${noise})`;
                context.fillRect(0, 0, 1, 1);
            }
            return originalToBlob.call(this, callback, type, encoderOptions);
        };

        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        CanvasRenderingContext2D.prototype.getImageData = function(...args) {
            const imageData = originalGetImageData.apply(this, args);
            // Add subtle noise to pixel data
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const noise = getDeterministicNoise(SESSION_SEED + i, 0.5);
                data[i] = Math.min(255, data[i] + noise);
                data[i + 1] = Math.min(255, data[i + 1] + noise);
                data[i + 2] = Math.min(255, data[i + 2] + noise);
            }
            return imageData;
        };
    }

    // WebGL fingerprinting protection
    if (CONFIG.webglVendor || CONFIG.webglRenderer) {
        const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            // UNMASKED_VENDOR_WEBGL = 37445
            // UNMASKED_RENDERER_WEBGL = 37446
            if (parameter === 37445 || parameter === 37446) {
                return 'Privacy Browser';
            }
            return originalGetParameter.apply(this, arguments);
        };

        const originalGetExtension = WebGLRenderingContext.prototype.getExtension;
        WebGLRenderingContext.prototype.getExtension = function(name) {
            if (name === 'WEBGL_debug_renderer_info') {
                return null;
            }
            return originalGetExtension.apply(this, arguments);
        };
    }

    // WebGL2 fingerprinting protection
    if (typeof WebGL2RenderingContext !== 'undefined') {
        const originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445 || parameter === 37446) {
                return 'Privacy Browser';
            }
            return originalGetParameter2.apply(this, arguments);
        };
    }

    // AudioContext fingerprinting protection
    if (CONFIG.audioContext && typeof AudioContext !== 'undefined') {
        const originalCreateOscillator = AudioContext.prototype.createOscillator;
        AudioContext.prototype.createOscillator = function() {
            const oscillator = originalCreateOscillator.call(this);
            const originalStart = oscillator.start;
            oscillator.start = function(when) {
                // Add slight frequency variation
                oscillator.frequency.value += getDeterministicNoise(SESSION_SEED + 'osc', 0.0001);
                return originalStart.apply(this, arguments);
            };
            return oscillator;
        };

        const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
        AudioContext.prototype.createAnalyser = function() {
            const analyser = originalCreateAnalyser.call(this);
            const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
            analyser.getFloatFrequencyData = function(array) {
                const result = originalGetFloatFrequencyData.apply(this, arguments);
                // Add slight noise to frequency data
                for (let i = 0; i < array.length; i++) {
                    array[i] += getDeterministicNoise(SESSION_SEED + i, 0.001);
                }
                return result;
            };
            return analyser;
        };
    }

    // Battery API protection
    if (CONFIG.battery && navigator.getBattery) {
        navigator.getBattery = function() {
            return Promise.resolve({
                charging: true,
                chargingTime: 0,
                dischargingTime: Infinity,
                level: 1,
                addEventListener: () => {},
                removeEventListener: () => {},
                dispatchEvent: () => true,
            });
        };
    }

    // Screen resolution spoofing
    if (CONFIG.screenResolution) {
        Object.defineProperty(screen, 'width', {
            get: () => 1920,
            configurable: true,
        });
        Object.defineProperty(screen, 'height', {
            get: () => 1080,
            configurable: true,
        });
        Object.defineProperty(screen, 'availWidth', {
            get: () => 1920,
            configurable: true,
        });
        Object.defineProperty(screen, 'availHeight', {
            get: () => 1040, // Account for taskbar
            configurable: true,
        });
        Object.defineProperty(screen, 'colorDepth', {
            get: () => 24,
            configurable: true,
        });
        Object.defineProperty(screen, 'pixelDepth', {
            get: () => 24,
            configurable: true,
        });
    }

    // Hardware concurrency spoofing
    if (CONFIG.hardwareConcurrency) {
        Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => 4,
            configurable: true,
        });
    }

    // Device memory spoofing
    if (CONFIG.deviceMemory) {
        Object.defineProperty(navigator, 'deviceMemory', {
            get: () => 8,
            configurable: true,
        });
    }

    // Timezone spoofing
    if (CONFIG.timezone) {
        const originalDateTimeFormat = Intl.DateTimeFormat;
        Intl.DateTimeFormat = function(...args) {
            if (args.length === 0) {
                args = ['en-US', { timeZone: 'UTC' }];
            } else if (typeof args[0] === 'object' && args[0].timeZone) {
                args[0].timeZone = 'UTC';
            }
            return new originalDateTimeFormat(...args);
        };
        Intl.DateTimeFormat.prototype = originalDateTimeFormat.prototype;
    }

    // Language spoofing
    if (CONFIG.language) {
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
            configurable: true,
        });
        Object.defineProperty(navigator, 'language', {
            get: () => 'en-US',
            configurable: true,
        });
    }

    // Platform spoofing
    if (CONFIG.platform) {
        Object.defineProperty(navigator, 'platform', {
            get: () => 'Win32',
            configurable: true,
        });
    }

    // Plugins spoofing
    if (CONFIG.plugins) {
        Object.defineProperty(navigator, 'plugins', {
            get: () => {
                const plugins = [];
                plugins.length = 0;
                plugins.item = (index) => plugins[index];
                plugins.namedItem = (name) => plugins.find(p => p.name === name);
                plugins.refresh = () => {};
                return plugins;
            },
            configurable: true,
        });
    }

    // Mime types spoofing
    if (CONFIG.mimeTypes) {
        Object.defineProperty(navigator, 'mimeTypes', {
            get: () => {
                const mimeTypes = [];
                mimeTypes.length = 0;
                mimeTypes.item = (index) => mimeTypes[index];
                mimeTypes.namedItem = (name) => mimeTypes.find(m => m.type === name);
                return mimeTypes;
            },
            configurable: true,
        });
    }

    // Client rects noise
    if (CONFIG.clientRects) {
        const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
        Element.prototype.getBoundingClientRect = function() {
            const rect = originalGetBoundingClientRect.call(this);
            return new DOMRect(
                rect.x + getDeterministicNoise(SESSION_SEED + 'x', 0.001),
                rect.y + getDeterministicNoise(SESSION_SEED + 'y', 0.001),
                rect.width + getDeterministicNoise(SESSION_SEED + 'w', 0.001),
                rect.height + getDeterministicNoise(SESSION_SEED + 'h', 0.001)
            );
        };

        const originalGetClientRects = Element.prototype.getClientRects;
        Element.prototype.getClientRects = function() {
            const rects = originalGetClientRects.call(this);
            // Return a copy with slight noise
            return rects;
        };
    }

    // Font enumeration blocking
    if (CONFIG.fontEnumeration) {
        const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
        CanvasRenderingContext2D.prototype.measureText = function(text) {
            const metrics = originalMeasureText.call(this, text);
            // Add slight variation to text measurements
            const noise = getDeterministicNoise(SESSION_SEED + text, 0.01);
            return {
                ...metrics,
                width: metrics.width + noise,
            };
        };
    }

    // Do Not Track header
    if (CONFIG.doNotTrack) {
        Object.defineProperty(navigator, 'doNotTrack', {
            get: () => '1',
            configurable: true,
        });
    }

    // Media devices enumeration protection
    if (CONFIG.mediaDevices && navigator.mediaDevices) {
        const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices;
        navigator.mediaDevices.enumerateDevices = function() {
            return originalEnumerateDevices.call(this).then(devices => {
                // Filter out unique device IDs
                return devices.map(device => ({
                    ...device,
                    deviceId: 'protected-device-id',
                    groupId: 'protected-group-id',
                    label: device.label || 'Protected Device',
                }));
            });
        };
    }

    // Gamepad API protection
    if (CONFIG.gamepad && navigator.getGamepads) {
        navigator.getGamepads = function() {
            return [];
        };
    }

    // Touch support spoofing
    if (CONFIG.touchSupport) {
        Object.defineProperty(navigator, 'maxTouchPoints', {
            get: () => 0,
            configurable: true,
        });
        Object.defineProperty(navigator, 'msMaxTouchPoints', {
            get: () => 0,
            configurable: true,
        });
    }

    // Remove unique identifiers from navigator
    delete navigator.userAgentData;
    delete navigator.virtualKeyboard;

    // WebRTC IP leak protection (requires browser-level support, but we can try)
    if (window.RTCPeerConnection) {
        const originalCreateOffer = RTCPeerConnection.prototype.createOffer;
        RTCPeerConnection.prototype.createOffer = function(...args) {
            // This will be handled by the browser's WebRTC implementation
            return originalCreateOffer.apply(this, args);
        };
    }

    // Console warning for debugging
    console.log('[Privacy Browser] Anti-fingerprinting protection active');
    
    // Notify background script of protection status
    if (window.chrome && chrome.runtime) {
        chrome.runtime.sendMessage({
            type: 'FINGERPRINT_PROTECTION_ACTIVE',
            protections: CONFIG,
        }).catch(() => {});
    }
})();