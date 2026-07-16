use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tracing::{info, warn, error};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub privacy: PrivacySettings,
    pub appearance: AppearanceSettings,
    pub general: GeneralSettings,
    pub shortcuts: ShortcutSettings,
    pub search_engines: Vec<SearchEngine>,
    pub extensions: Vec<Extension>,
    pub adblock: AdblockSettings,
    pub advanced: AdvancedSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrivacySettings {
    pub block_ads: bool,
    pub block_trackers: bool,
    pub block_fingerprinting: bool,
    pub block_scripts: bool,
    pub block_malware: bool,
    pub https_only: bool,
    pub block_third_party_cookies: bool,
    pub do_not_track: bool,
    pub clear_on_exit: bool,
    pub disable_webrtc: bool,
    pub disable_prefetch: bool,
    pub doh_provider: DohProvider,
    pub custom_doh_url: String,
    pub cookie_exceptions: HashMap<String, CookieException>,
    pub storage_exceptions: HashMap<String, StorageException>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DohProvider {
    Cloudflare,
    Google,
    Quad9,
    NextDns,
    Custom,
    Disabled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CookieException {
    pub domain: String,
    pub allowed: bool,
    pub session_only: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageException {
    pub origin: String,
    pub allowed: bool,
}

impl Default for PrivacySettings {
    fn default() -> Self {
        Self {
            block_ads: true,
            block_trackers: true,
            block_fingerprinting: true,
            block_scripts: false,
            block_malware: true,
            https_only: true,
            block_third_party_cookies: true,
            do_not_track: true,
            clear_on_exit: false,
            disable_webrtc: false,
            disable_prefetch: true,
            doh_provider: DohProvider::Cloudflare,
            custom_doh_url: String::new(),
            cookie_exceptions: HashMap::new(),
            storage_exceptions: HashMap::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppearanceSettings {
    pub theme: Theme,
    pub accent_color: String,
    pub vertical_tabs: bool,
    pub show_bookmarks_bar: bool,
    pub compact_mode: bool,
    pub background_image: Option<String>,
    pub custom_css: String,
    pub font_size: u32,
    pub font_family: String,
    pub zoom_level: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Theme {
    Light,
    Dark,
    System,
}

impl Default for AppearanceSettings {
    fn default() -> Self {
        Self {
            theme: Theme::System,
            accent_color: "#e94560".to_string(),
            vertical_tabs: false,
            show_bookmarks_bar: true,
            compact_mode: false,
            background_image: None,
            custom_css: String::new(),
            font_size: 14,
            font_family: "Inter, system-ui, sans-serif".to_string(),
            zoom_level: 1.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneralSettings {
    pub startup_behavior: StartupBehavior,
    pub homepage: String,
    pub search_engine: String,
    pub search_suggestions: bool,
    pub download_path: String,
    pub ask_download_location: bool,
    pub open_downloads_on_complete: bool,
    pub default_zoom: f64,
    pub enable_smooth_scrolling: bool,
    pub enable_hardware_acceleration: bool,
    pub language: String,
    pub spell_check_enabled: bool,
    pub spell_check_languages: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum StartupBehavior {
    NewTab,
    RestoreSession,
    Homepage,
    SpecificUrls,
}

impl Default for GeneralSettings {
    fn default() -> Self {
        Self {
            startup_behavior: StartupBehavior::NewTab,
            homepage: "https://duckduckgo.com".to_string(),
            search_engine: "duckduckgo".to_string(),
            search_suggestions: true,
            download_path: dirs::download_dir()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default(),
            ask_download_location: false,
            open_downloads_on_complete: false,
            default_zoom: 1.0,
            enable_smooth_scrolling: true,
            enable_hardware_acceleration: true,
            language: "en-US".to_string(),
            spell_check_enabled: true,
            spell_check_languages: vec!["en-US".to_string()],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShortcutSettings {
    pub shortcuts: HashMap<String, String>,
}

impl Default for ShortcutSettings {
    fn default() -> Self {
        let mut shortcuts = HashMap::new();
        shortcuts.insert("new_tab".to_string(), "Ctrl+T".to_string());
        shortcuts.insert("new_private_window".to_string(), "Ctrl+Shift+N".to_string());
        shortcuts.insert("close_tab".to_string(), "Ctrl+W".to_string());
        shortcuts.insert("reopen_closed_tab".to_string(), "Ctrl+Shift+T".to_string());
        shortcuts.insert("focus_address_bar".to_string(), "Ctrl+L".to_string());
        shortcuts.insert("find_in_page".to_string(), "Ctrl+F".to_string());
        shortcuts.insert("toggle_sidebar".to_string(), "Ctrl+Shift+B".to_string());
        shortcuts.insert("toggle_fullscreen".to_string(), "F11".to_string());
        shortcuts.insert("open_settings".to_string(), "Ctrl+,".to_string());
        shortcuts.insert("open_downloads".to_string(), "Ctrl+J".to_string());
        shortcuts.insert("open_history".to_string(), "Ctrl+H".to_string());
        shortcuts.insert("open_bookmarks".to_string(), "Ctrl+Shift+O".to_string());
        shortcuts.insert("next_tab".to_string(), "Ctrl+Tab".to_string());
        shortcuts.insert("previous_tab".to_string(), "Ctrl+Shift+Tab".to_string());
        shortcuts.insert("reload".to_string(), "Ctrl+R".to_string());
        shortcuts.insert("force_reload".to_string(), "Ctrl+Shift+R".to_string());
        shortcuts.insert("toggle_devtools".to_string(), "F12".to_string());
        shortcuts.insert("toggle_adblock".to_string(), "Ctrl+Shift+A".to_string());
        shortcuts.insert("new_private_tab".to_string(), "Ctrl+Shift+P".to_string());
        
        Self { shortcuts }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchEngine {
    pub id: String,
    pub name: String,
    pub url: String,
    pub suggest_url: Option<String>,
    pub icon_url: Option<String>,
    pub is_default: bool,
    pub is_custom: bool,
}

impl Default for SearchEngine {
    fn default() -> Self {
        Self {
            id: String::new(),
            name: String::new(),
            url: String::new(),
            suggest_url: None,
            icon_url: None,
            is_default: false,
            is_custom: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Extension {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub enabled: bool,
    pub permissions: Vec<String>,
    pub path: String,
    pub manifest: serde_json::Value,
}

impl Default for Extension {
    fn default() -> Self {
        Self {
            id: String::new(),
            name: String::new(),
            version: String::new(),
            description: String::new(),
            author: String::new(),
            enabled: true,
            permissions: Vec::new(),
            path: String::new(),
            manifest: serde_json::json!({}),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdblockSettings {
    pub enabled: bool,
    pub filter_lists: Vec<FilterList>,
    pub custom_rules: Vec<CustomRule>,
    pub blocked_count: u64,
    pub allowed_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterList {
    pub id: String,
    pub name: String,
    pub url: String,
    pub enabled: bool,
    pub last_updated: Option<String>,
    pub rules_count: usize,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomRule {
    pub id: String,
    pub rule: String,
    pub enabled: bool,
    pub comment: String,
    pub created_at: String,
}

impl Default for AdblockSettings {
    fn default() -> Self {
        Self {
            enabled: true,
            filter_lists: vec![
                FilterList {
                    id: "easylist".to_string(),
                    name: "EasyList".to_string(),
                    url: "https://easylist.to/easylist/easylist.txt".to_string(),
                    enabled: true,
                    last_updated: None,
                    rules_count: 0,
                    error: None,
                },
                FilterList {
                    id: "easyprivacy".to_string(),
                    name: "EasyPrivacy".to_string(),
                    url: "https://easylist.to/easylist/easyprivacy.txt".to_string(),
                    enabled: true,
                    last_updated: None,
                    rules_count: 0,
                    error: None,
                },
                FilterList {
                    id: "easylist-cookie".to_string(),
                    name: "EasyList Cookie".to_string(),
                    url: "https://easylist.to/easylist/easylist-cookie.txt".to_string(),
                    enabled: true,
                    last_updated: None,
                    rules_count: 0,
                    error: None,
                },
                FilterList {
                    id: "pgl".to_string(),
                    name: "Peter Lowe's List".to_string(),
                    url: "https://pgl.yoyo.org/adservers/serverlist.php?hostformat=adblockplus&mimetype=plaintext".to_string(),
                    enabled: true,
                    last_updated: None,
                    rules_count: 0,
                    error: None,
                },
                FilterList {
                    id: "adguard-base".to_string(),
                    name: "AdGuard Base".to_string(),
                    url: "https://filters.adtidy.org/extension/chromium/filters/2.txt".to_string(),
                    enabled: false,
                    last_updated: None,
                    rules_count: 0,
                    error: None,
                },
                FilterList {
                    id: "adguard-tracking".to_string(),
                    name: "AdGuard Tracking".to_string(),
                    url: "https://filters.adtidy.org/extension/chromium/filters/4.txt".to_string(),
                    enabled: false,
                    last_updated: None,
                    rules_count: 0,
                    error: None,
                },
                FilterList {
                    id: "adguard-annoyances".to_string(),
                    name: "AdGuard Annoyances".to_string(),
                    url: "https://filters.adtidy.org/extension/chromium/filters/14.txt".to_string(),
                    enabled: false,
                    last_updated: None,
                    rules_count: 0,
                    error: None,
                },
                FilterList {
                    id: "oisd".to_string(),
                    name: "OISD Full".to_string(),
                    url: "https://raw.githubusercontent.com/oisd/adblock/main/filters.txt".to_string(),
                    enabled: false,
                    last_updated: None,
                    rules_count: 0,
                    error: None,
                },
            ],
            custom_rules: Vec::new(),
            blocked_count: 0,
            allowed_count: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdvancedSettings {
    pub enable_devtools: bool,
    pub enable_experimental_features: bool,
    pub log_level: LogLevel,
    pub max_tabs: u32,
    tab_discarding: bool,
    pub memory_saver: bool,
    pub energy_saver: bool,
    pub custom_user_agent: String,
    pub proxy_settings: ProxySettings,
    pub certificate_overrides: Vec<CertificateOverride>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum LogLevel {
    Error,
    Warn,
    Info,
    Debug,
    Trace,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxySettings {
    pub mode: ProxyMode,
    pub server: String,
    pub bypass_list: Vec<String>,
    pub pac_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ProxyMode {
    System,
    Direct,
    Manual,
    Pac,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CertificateOverride {
    pub hostname: String,
    pub fingerprint: String,
    pub allowed: bool,
    pub added_at: String,
}

impl Default for AdvancedSettings {
    fn default() -> Self {
        Self {
            enable_devtools: true,
            enable_experimental_features: false,
            log_level: LogLevel::Info,
            max_tabs: 100,
            tab_discarding: true,
            memory_saver: true,
            energy_saver: false,
            custom_user_agent: String::new(),
            proxy_settings: ProxySettings {
                mode: ProxyMode::System,
                server: String::new(),
                bypass_list: Vec::new(),
                pac_url: String::new(),
            },
            certificate_overrides: Vec::new(),
        }
    }
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            privacy: PrivacySettings::default(),
            appearance: AppearanceSettings::default(),
            general: GeneralSettings::default(),
            shortcuts: ShortcutSettings::default(),
            search_engines: default_search_engines(),
            extensions: Vec::new(),
            adblock: AdblockSettings::default(),
            advanced: AdvancedSettings::default(),
        }
    }
}

fn default_search_engines() -> Vec<SearchEngine> {
    vec![
        SearchEngine {
            id: "duckduckgo".to_string(),
            name: "DuckDuckGo".to_string(),
            url: "https://duckduckgo.com/?q=%s".to_string(),
            suggest_url: Some("https://duckduckgo.com/ac/?q=%s".to_string()),
            icon_url: Some("https://duckduckgo.com/favicon.ico".to_string()),
            is_default: true,
            is_custom: false,
        },
        SearchEngine {
            id: "google".to_string(),
            name: "Google".to_string(),
            url: "https://www.google.com/search?q=%s".to_string(),
            suggest_url: Some("https://www.google.com/complete/search?q=%s".to_string()),
            icon_url: Some("https://www.google.com/favicon.ico".to_string()),
            is_default: false,
            is_custom: false,
        },
        SearchEngine {
            id: "brave".to_string(),
            name: "Brave Search".to_string(),
            url: "https://search.brave.com/search?q=%s".to_string(),
            suggest_url: Some("https://search.brave.com/api/suggest?q=%s".to_string()),
            icon_url: Some("https://search.brave.com/favicon.ico".to_string()),
            is_default: false,
            is_custom: false,
        },
        SearchEngine {
            id: "startpage".to_string(),
            name: "Startpage".to_string(),
            url: "https://www.startpage.com/sp/search?q=%s".to_string(),
            suggest_url: Some("https://www.startpage.com/sp/suggestions?q=%s".to_string()),
            icon_url: Some("https://www.startpage.com/favicon.ico".to_string()),
            is_default: false,
            is_custom: false,
        },
        SearchEngine {
            id: "searx".to_string(),
            name: "SearXNG".to_string(),
            url: "https://searx.be/search?q=%s".to_string(),
            suggest_url: None,
            icon_url: Some("https://searx.be/favicon.ico".to_string()),
            is_default: false,
            is_custom: false,
        },
    ]
}

pub struct SettingsManager {
    settings: Settings,
    config_dir: PathBuf,
}

impl SettingsManager {
    pub fn new() -> Self {
        let config_dir = dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("privacy-browser");
        
        std::fs::create_dir_all(&config_dir).ok();
        
        let mut manager = Self {
            settings: Settings::default(),
            config_dir,
        };
        
        manager.load().ok();
        manager
    }

    fn settings_path(&self) -> PathBuf {
        self.config_dir.join("settings.json")
    }

    pub fn load(&mut self) -> Result<(), String> {
        let path = self.settings_path();
        if path.exists() {
            let content = std::fs::read_to_string(&path)
                .map_err(|e| format!("Failed to read settings: {}", e))?;
            self.settings = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse settings: {}", e))?;
            info!("Settings loaded from {:?}", path);
        }
        Ok(())
    }

    pub fn save(&self) -> Result<(), String> {
        let path = self.settings_path();
        let content = serde_json::to_string_pretty(&self.settings)
            .map_err(|e| format!("Failed to serialize settings: {}", e))?;
        std::fs::write(&path, content)
            .map_err(|e| format!("Failed to write settings: {}", e))?;
        info!("Settings saved to {:?}", path);
        Ok(())
    }

    pub fn get_settings(&self) -> &Settings {
        &self.settings
    }

    pub fn get_settings_mut(&mut self) -> &mut Settings {
        &mut self.settings
    }

    pub fn update_settings(&mut self, settings: Settings) -> Result<(), String> {
        self.settings = settings;
        self.save()
    }

    pub fn update_privacy(&mut self, privacy: PrivacySettings) -> Result<(), String> {
        self.settings.privacy = privacy;
        self.save()
    }

    pub fn update_appearance(&mut self, appearance: AppearanceSettings) -> Result<(), String> {
        self.settings.appearance = appearance;
        self.save()
    }

    pub fn update_general(&mut self, general: GeneralSettings) -> Result<(), String> {
        self.settings.general = general;
        self.save()
    }

    pub fn update_shortcuts(&mut self, shortcuts: ShortcutSettings) -> Result<(), String> {
        self.settings.shortcuts = shortcuts;
        self.save()
    }

    pub fn update_adblock(&mut self, adblock: AdblockSettings) -> Result<(), String> {
        self.settings.adblock = adblock;
        self.save()
    }

    pub fn update_advanced(&mut self, advanced: AdvancedSettings) -> Result<(), String> {
        self.settings.advanced = advanced;
        self.save()
    }

    pub fn add_search_engine(&mut self, engine: SearchEngine) -> Result<(), String> {
        self.settings.search_engines.push(engine);
        self.save()
    }

    pub fn remove_search_engine(&mut self, id: &str) -> Result<(), String> {
        if self.settings.search_engines.iter().any(|e| e.id == id && e.is_default) {
            return Err("Cannot remove default search engine".to_string());
        }
        self.settings.search_engines.retain(|e| e.id != id);
        self.save()
    }

    pub fn set_default_search_engine(&mut self, id: &str) -> Result<(), String> {
        for engine in &mut self.settings.search_engines {
            engine.is_default = engine.id == id;
        }
        self.save()
    }

    pub fn get_extensions(&self) -> Vec<Extension> {
        self.settings.extensions.clone()
    }

    pub fn add_extension(&mut self, extension: Extension) -> Result<(), String> {
        self.settings.extensions.push(extension);
        self.save()
    }

    pub fn remove_extension(&mut self, id: &str) -> Result<(), String> {
        self.settings.extensions.retain(|e| e.id != id);
        self.save()
    }

    pub fn toggle_extension(&mut self, id: &str, enabled: bool) -> Result<(), String> {
        if let Some(ext) = self.settings.extensions.iter_mut().find(|e| e.id == id) {
            ext.enabled = enabled;
            self.save()
        } else {
            Err("Extension not found".to_string())
        }
    }

    pub fn export_settings(&self) -> Result<String, String> {
        serde_json::to_string_pretty(&self.settings)
            .map_err(|e| format!("Failed to export settings: {}", e))
    }

    pub fn import_settings(&mut self, json: &str) -> Result<(), String> {
        let settings: Settings = serde_json::from_str(json)
            .map_err(|e| format!("Failed to parse settings: {}", e))?;
        self.settings = settings;
        self.save()
    }

    pub fn reset_to_defaults(&mut self) -> Result<(), String> {
        self.settings = Settings::default();
        self.save()
    }
}

impl Default for SettingsManager {
    fn default() -> Self {
        Self::new()
    }
}