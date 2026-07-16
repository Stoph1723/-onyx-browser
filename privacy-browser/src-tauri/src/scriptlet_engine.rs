use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
use tracing::{info, warn, debug};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scriptlet {
    pub id: String,
    pub name: String,
    pub description: String,
    pub script: String,
    pub matches: Vec<String>,
    pub excludes: Vec<String>,
    pub run_at: ScriptRunAt,
    pub enabled: bool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum ScriptRunAt {
    DocumentStart,
    DocumentEnd,
    DocumentIdle,
}

impl Default for ScriptRunAt {
    fn default() -> Self {
        ScriptRunAt::DocumentIdle
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InjectionStats {
    pub total_injections: u64,
    pub successful_injections: u64,
    pub failed_injections: u64,
    pub youtube_ads_blocked: u64,
    pub youtube_ads_skipped: u64,
    pub last_injection: Option<u64>,
}

impl Default for InjectionStats {
    fn default() -> Self {
        Self {
            total_injections: 0,
            successful_injections: 0,
            failed_injections: 0,
            youtube_ads_blocked: 0,
            youtube_ads_skipped: 0,
            last_injection: None,
        }
    }
}

pub struct ScriptletEngine {
    scriptlets: Arc<Mutex<HashMap<String, Scriptlet>>>,
    injection_stats: Arc<Mutex<InjectionStats>>,
}

impl ScriptletEngine {
    pub fn new() -> Self {
        let engine = Self {
            scriptlets: Arc::new(Mutex::new(HashMap::new())),
            injection_stats: Arc::new(Mutex::new(InjectionStats::default())),
        };
        
        // Load built-in scriptlets
        engine.load_builtin_scriptlets();
        engine
    }

    fn load_builtin_scriptlets(&self) {
        let scriptlets = vec![
            // YouTube ad blocker
            Scriptlet {
                id: "youtube-ads".to_string(),
                name: "YouTube Ad Blocker".to_string(),
                description: "Blocks YouTube video ads and skips ad segments".to_string(),
                script: include_str!("scriptlets/youtube-ads.js").to_string(),
                matches: vec!["*://*.youtube.com/*".to_string(), "*://youtube.com/*".to_string()],
                excludes: vec![],
                run_at: ScriptRunAt::DocumentStart,
                enabled: true,
            },
            // YouTube ad skipper
            Scriptlet {
                id: "youtube-skip-ads".to_string(),
                name: "YouTube Auto-Skip Ads".to_string(),
                description: "Automatically clicks 'Skip Ad' button on YouTube".to_string(),
                script: include_str!("scriptlets/youtube-skip-ads.js").to_string(),
                matches: vec!["*://*.youtube.com/*".to_string(), "*://youtube.com/*".to_string()],
                excludes: vec![],
                run_at: ScriptRunAt::DocumentIdle,
                enabled: true,
            },
            // Generic ad blocker
            Scriptlet {
                id: "generic-ads".to_string(),
                name: "Generic Ad Blocker".to_string(),
                description: "Removes common ad elements from pages".to_string(),
                script: include_str!("scriptlets/generic-ads.js").to_string(),
                matches: vec!["*://*/*".to_string()],
                excludes: vec!["*://*.youtube.com/*".to_string(), "*://youtube.com/*".to_string()],
                run_at: ScriptRunAt::DocumentIdle,
                enabled: true,
            },
            // Anti-fingerprinting
            Scriptlet {
                id: "anti-fingerprint".to_string(),
                name: "Anti-Fingerprinting".to_string(),
                description: "Protects against canvas, WebGL, audio, and other fingerprinting".to_string(),
                script: include_str!("scriptlets/anti-fingerprint.js").to_string(),
                matches: vec!["*://*/*".to_string()],
                excludes: vec![],
                run_at: ScriptRunAt::DocumentStart,
                enabled: true,
            },
            // Tracking parameter stripper
            Scriptlet {
                id: "strip-tracking-params".to_string(),
                name: "Tracking Parameter Stripper".to_string(),
                description: "Removes utm_, fbclid, gclid, and other tracking parameters from URLs".to_string(),
                script: include_str!("scriptlets/strip-tracking-params.js").to_string(),
                matches: vec!["*://*/*".to_string()],
                excludes: vec![],
                run_at: ScriptRunAt::DocumentStart,
                enabled: true,
            },
            // AMP to HTML redirect
            Scriptlet {
                id: "amp-to-html".to_string(),
                name: "AMP to HTML Redirect".to_string(),
                description: "Redirects AMP pages to their canonical HTML versions".to_string(),
                script: include_str!("scriptlets/amp-to-html.js").to_string(),
                matches: vec!["*://*/amp/*".to_string(), "*://*/amp/".to_string()],
                excludes: vec![],
                run_at: ScriptRunAt::DocumentStart,
                enabled: true,
            },
            // Nitter redirect (Twitter)
            Scriptlet {
                id: "nitter-redirect".to_string(),
                name: "Nitter Redirect".to_string(),
                description: "Redirects Twitter/X links to Nitter instances".to_string(),
                script: include_str!("scriptlets/nitter-redirect.js").to_string(),
                matches: vec!["*://twitter.com/*".to_string(), "*://x.com/*".to_string()],
                excludes: vec![],
                run_at: ScriptRunAt::DocumentStart,
                enabled: true,
            },
            // Invidious redirect (YouTube)
            Scriptlet {
                id: "invidious-redirect".to_string(),
                name: "Invidious Redirect".to_string(),
                description: "Redirects YouTube links to Invidious instances".to_string(),
                script: include_str!("scriptlets/invidious-redirect.js").to_string(),
                matches: vec!["*://*.youtube.com/*".to_string(), "*://youtube.com/*".to_string()],
                excludes: vec![],
                run_at: ScriptRunAt::DocumentStart,
                enabled: true,
            },
            // Libredirect
            Scriptlet {
                id: "libredirect".to_string(),
                name: "LibRedirect".to_string(),
                description: "Redirects to privacy-friendly frontends (Nitter, Invidious, Libreddit, etc.)".to_string(),
                script: include_str!("scriptlets/libredirect.js").to_string(),
                matches: vec!["*://*/*".to_string()],
                excludes: vec![],
                run_at: ScriptRunAt::DocumentStart,
                enabled: true,
            },
        ];

        let mut scriptlets_map = self.scriptlets.lock().unwrap();
        for scriptlet in scriptlets {
            scriptlets_map.insert(scriptlet.id.clone(), scriptlet);
        }

        info!("Loaded {} built-in scriptlets", scriptlets_map.len());
    }

    pub fn register_scriptlet(&self, scriptlet: Scriptlet) -> Result<(), String> {
        let mut scriptlets = self.scriptlets.lock().unwrap();
        if scriptlets.contains_key(&scriptlet.id) {
            return Err(format!("Scriptlet with id '{}' already exists", scriptlet.id));
        }
        scriptlets.insert(scriptlet.id.clone(), scriptlet);
        Ok(())
    }

    pub fn unregister_scriptlet(&self, id: &str) -> Result<(), String> {
        let mut scriptlets = self.scriptlets.lock().unwrap();
        if scriptlets.remove(id).is_none() {
            return Err(format!("Scriptlet with id '{}' not found", id));
        }
        Ok(())
    }

    pub fn get_scriptlet(&self, id: &str) -> Option<Scriptlet> {
        let scriptlets = self.scriptlets.lock().unwrap();
        scriptlets.get(id).cloned()
    }

    pub fn list_scriptlets(&self) -> Vec<Scriptlet> {
        let scriptlets = self.scriptlets.lock().unwrap();
        scriptlets.values().cloned().collect()
    }

    pub fn get_scriptlets_for_url(&self, url: &str, run_at: ScriptRunAt) -> Vec<Scriptlet> {
        let scriptlets = self.scriptlets.lock().unwrap();
        scriptlets
            .values()
            .filter(|s| {
                if !s.enabled {
                    return false;
                }
                if s.run_at != run_at {
                    return false;
                }
                if !self.url_matches(url, &s.matches) {
                    return false;
                }
                if self.url_matches(url, &s.excludes) {
                    return false;
                }
                true
            })
            .cloned()
            .collect()
    }

    fn url_matches(&self, url: &str, patterns: &[String]) -> bool {
        patterns.iter().any(|pattern| self.match_pattern(url, pattern))
    }

    fn match_pattern(&self, url: &str, pattern: &str) -> bool {
        // Convert glob pattern to regex
        let regex_pattern = pattern
            .replace(".", "\\.")
            .replace("*", ".*")
            .replace("?", ".");
        let regex = format!("^{}$", regex_pattern);
        regex::Regex::new(&regex).map(|re| re.is_match(url)).unwrap_or(false)
    }

    /// Generate injection code for a URL
    pub fn generate_injection_code(&self, url: &str, run_at: ScriptRunAt) -> String {
        let scriptlets = self.get_scriptlets_for_url(url, run_at);
        if scriptlets.is_empty() {
            return String::new();
        }

        let mut code = String::new();
        code.push_str("// Privacy Browser Scriptlet Injection\n");
        code.push_str(&format!("// URL: {}\n", url));
        code.push_str(&format!("// RunAt: {:?}\n", run_at));
        code.push_str(&format!("// Timestamp: {}\n\n", std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis()));

        for scriptlet in scriptlets {
            code.push_str(&format!("// Scriptlet: {} - {}\n", scriptlet.name, scriptlet.description));
            code.push_str(&scriptlet.script);
            code.push_str("\n\n");
        }

        // Update stats
        let mut stats = self.injection_stats.lock().unwrap();
        stats.total_injections += 1;
        stats.successful_injections += 1;
        stats.last_injection = Some(std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64);

        code
    }

    pub fn get_stats(&self) -> InjectionStats {
        self.injection_stats.lock().unwrap().clone()
    }

    pub fn increment_youtube_ads_blocked(&self) {
        let mut stats = self.injection_stats.lock().unwrap();
        stats.youtube_ads_blocked += 1;
    }

    pub fn increment_youtube_ads_skipped(&self) {
        let mut stats = self.injection_stats.lock().unwrap();
        stats.youtube_ads_skipped += 1;
    }

    pub fn reset_stats(&self) {
        *self.injection_stats.lock().unwrap() = InjectionStats::default();
    }
}

impl Default for ScriptletEngine {
    fn default() -> Self {
        Self::new()
    }
}