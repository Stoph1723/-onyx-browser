// SponsorBlock Integration - Skips sponsor segments, intros, outros, filler
// Runs at document_idle

(function() {
    'use strict';

    const isYouTube = location.hostname.includes('youtube.com') || location.hostname.includes('youtube-nocookie.com');
    if (!isYouTube) return;

    const SPONSORBLOCK_API = 'https://sponsor.ajay.app/api/skipSegments';
    const SPONSORBLOCK_OPTIONS_API = 'https://sponsor.ajay.app/api/options';

    // Segment categories to skip
    const CATEGORIES_TO_SKIP = [
        'sponsor',      // Sponsored content
        'selfpromo',    // Self promotion
        'intro',        // Video intro
        'outro',        // Video outro
        'interaction',  // Interaction reminders (like, subscribe)
        'music_offtopic', // Non-music sections in music videos
        'preview',      // Preview/recap
        'filler',       // Filler content
    ];

    // Optional categories (can be enabled in settings)
    const OPTIONAL_CATEGORIES = [
        'poi_highlight', // Point of interest highlight
        'chapter',       // Chapter markers (don't skip, just mark)
    ];

    let currentVideoId = null;
    let segments = [];
    let currentSegmentIndex = -1;
    let isSkipping = false;
    let videoElement = null;
    let checkInterval = null;
    let lastUrl = location.href;
    let userOptions = null;

    const CATEGORIES_TO_SKIP = [
        'sponsor',
        'selfpromo',
        'intro',
        'outro',
        'interaction',
        'music_offtopic',
        'preview',
        'filler',
    ];

    async function fetchVideoSegments(videoId) {
        try {
            const response = await fetch(`${SPONSORBLOCK_API}?videoID=${videoId}&categories=${CATEGORIES_TO_SKIP.join(',')}`);
            if (!response.ok) return null;
            return await response.json();
        } catch (e) {
            console.error('[SponsorBlock] Failed to fetch segments:', e);
            return null;
        }
    }

    async function fetchUserOptions() {
        try {
            const response = await fetch(SPONSORBLOCK_OPTIONS_API);
            if (!response.ok) return null;
            return await response.json();
        } catch (e) {
            console.error('[SponsorBlock] Failed to fetch options:', e);
            return null;
        }
    }

    function getVideoId() {
        // Try multiple ways to get video ID
        const urlParams = new URLSearchParams(location.search);
        let videoId = urlParams.get('v');
        
        if (!videoId) {
            // Try from ytInitialData
            if (window.ytInitialData) {
                try {
                    const data = window.ytInitialData;
                    videoId = data?.videoDetails?.videoId || 
                              data?.currentVideoEndpoint?.watchEndpoint?.videoId;
                } catch (e) {}
            }
        }
        
        if (!videoId) {
            // Try from meta tags
            const meta = document.querySelector('meta[itemprop="videoId"]');
            if (meta) videoId = meta.content;
        }
        
        if (!videoId) {
            // Try from URL path (youtube.com/embed/VIDEO_ID)
            const match = location.pathname.match(/(?:embed|watch|v)\/([a-zA-Z0-9_-]{11})/);
            if (match) videoId = match[1];
        }
        
        return videoId;
    }

    function findVideoElement() {
        // Try multiple selectors for the video element
        const selectors = [
            'video.html5-main-video',
            '#movie_player video',
            '#movie_player-flash',
            'video.html5-main-video',
            '#movie_player video',
            'video[class*="video"]',
            'video',
        ];
        
        for (const selector of selectors) {
            const video = document.querySelector(selector);
            if (video && video.tagName === 'VIDEO') {
                return video;
            }
        }
        return null;
    }

    function loadSegments() {
        const videoId = getVideoId();
        if (!videoId || videoId === currentVideoId) return;
        
        currentVideoId = videoId;
        segments = [];
        
        fetchVideoSegments(videoId).then(data => {
            if (data && data[videoId]) {
                segments = data[videoId].filter(seg => 
                    CATEGORIES_TO_SKIP.includes(seg.category)
                ).sort((a, b) => a.segment[0] - b.segment[0]);
                
                console.log('[SponsorBlock] Loaded', segments.length, 'segments to skip for', videoId);
                segments.forEach(seg => {
                    console.log('[SponsorBlock] Will skip:', seg.category, seg.segment[0], '-', seg.segment[1]);
                });
            }
        });
    }

    function checkAndSkip() {
        if (!videoElement || segments.length === 0) return;
        
        const currentTime = videoElement.currentTime;
        
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const [start, end] = segment.segment;
            
            // Check if we're in a skip segment
            if (currentTime >= start && currentTime < end) {
                if (!isSkipping) {
                    isSkipping = true;
                    currentSegmentIndex = i;
                    console.log('[SponsorBlock] Skipping segment:', segment.category, start, '-', end);
                    
                    // Skip to end of segment
                    videoElement.currentTime = end + 0.5;
                    
                    // Notify background for stats
                    if (window.chrome && chrome.runtime) {
                        chrome.runtime.sendMessage({
                            type: 'SPONSORBLOCK_SKIPPED',
                            category: segment.category,
                            start: start,
                            end: end,
                            videoId: currentVideoId
                        }).catch(() => {});
                    }
                }
                return;
            }
        }
        
        // If we were skipping and now we're past the segment
        if (isSkipping && currentSegmentIndex >= 0) {
            const segment = segments[currentSegmentIndex];
            if (currentTime >= segment.segment[1]) {
                isSkipping = false;
                currentSegmentIndex = -1;
            }
        }
    }

    function findVideoElement() {
        const selectors = [
            'video.html5-main-video',
            '#movie_player video',
            '#movie_player-flash',
            'video.html5-main-video',
            '#movie_player video',
            'video[class*="video"]',
            'video',
        ];
        
        for (const selector of selectors) {
            const video = document.querySelector(selector);
            if (video && video.tagName === 'VIDEO') {
                return video;
            }
        }
        return null;
    }

    function startMonitoring() {
        if (checkInterval) clearInterval(checkInterval);
        
        videoElement = findVideoElement();
        if (!videoElement) {
            // Try again in a bit
            setTimeout(startMonitoring, 1000);
            return;
        }
        
        console.log('[SponsorBlock] Found video element, monitoring started');
        
        // Load segments for current video
        loadSegments();
        
        // Check every 500ms
        checkInterval = setInterval(checkAndSkip, 500);
        
        // Watch for video element changes
        const observer = new MutationObserver(() => {
            const newVideo = findVideoElement();
            if (newVideo && newVideo !== videoElement) {
                videoElement = newVideo;
                loadSegments();
            }
        });
        
        observer.observe(document, { childList: true, subtree: true });
        
        // Watch for URL changes
        const urlObserver = new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                loadSegments();
            }
        });
        urlObserver.observe(document, { subtree: true, childList: true });
        
        // Listen for YouTube navigation
        window.addEventListener('yt-navigate-finish', loadSegments);
        
        // Store observers for cleanup
        window.__sponsorBlockObservers = [observer, urlObserver];
    }

    function cleanup() {
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
        }
        
        if (window.__sponsorBlockObservers) {
            window.__sponsorBlockObservers.forEach(obs => obs.disconnect());
            window.__sponsorBlockObservers = null;
        }
        
        window.removeEventListener('yt-navigate-finish', loadSegments);
        currentVideoId = null;
        segments = [];
        videoElement = null;
    }

    // Initialize when video is ready
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }
        
        // Wait for video player to be ready
        const waitForPlayer = setInterval(() => {
            const player = document.querySelector('#movie_player, #movie_player-flash');
            if (player) {
                clearInterval(waitForPlayer);
                loadSegments();
                startMonitoring();
            }
        }, 500);
        
        // Timeout after 30 seconds
        setTimeout(() => clearInterval(waitForPlayer), 30000);
    }

    // Cleanup on unload
    window.addEventListener('beforeunload', cleanup);
    
    // Handle URL changes (SPA)
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            setTimeout(() => {
                cleanup();
                loadSegments();
                startMonitoring();
            }, 500);
        }
    });
    
    urlObserver.observe(document, { subtree: true, childList: true });

    // Start
    init();
    
    // Expose API
    window.__sponsorBlock = {
        destroy: cleanup,
        getSegments: () => segments,
        getCurrentVideoId: () => currentVideoId,
        skipSegment: (index) => {
            if (segments[index] && videoElement) {
                const [start, end] = segments[index].segment;
                videoElement.currentTime = end + 0.5;
            }
        },
        toggleCategory: (category, enabled) => {
            // Would need to reload segments
        },
    };
    
    console.log('[SponsorBlock] Loaded');
})();