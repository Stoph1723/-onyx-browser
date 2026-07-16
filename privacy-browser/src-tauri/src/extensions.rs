use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use serde::{Serialize, Deserialize};
use tracing::{info, warn, error};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Extension {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub homepage: Option<String>,
    pub enabled: bool,
    pub permissions: Vec<String>,
    pub path: String,
    pub manifest: serde_json::Value,
    pub installDate: String,
    pub updateDate: Option<String>,
    pub size: u64,
    pub type_: String, // "manifest_v2", "manifest_v3", "theme", "user_script"
    pub icons: HashMap<String, String>,
    pub contentScripts: Vec<ContentScript>,
    pub background: Option<BackgroundScript>,
    pub browserAction: Option<BrowserAction>,
    pub pageAction: Option<PageAction>,
    pub optionsPage: Option<String>,
    pub devMode: boolean,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentScript {
    pub matches: Vec<String>,
    pub excludeMatches: Option<Vec<String>>,
    pub js: Option<Vec<String>>,
    pub css: Option<Vec<String>>,
    pub runAt: String,
    pub allFrames: boolean,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackgroundScript {
    pub scripts: Option<Vec<String>>,
    pub persistent: boolean,
    pub serviceWorker: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserAction {
    pub defaultTitle: String,
    pub defaultPopup: Option<String>,
    pub defaultIcon: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageAction {
    pub defaultTitle: String,
    pub defaultPopup: Option<String>,
    pub defaultIcon: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ExtensionData {
    extensions: HashMap<String, Extension>,
    settings: ExtensionSettings,
    store: ExtensionStore,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ExtensionSettings {
    autoUpdate: boolean,
    devMode: boolean,
    allowIncognito: boolean,
    allowFileAccess: boolean,
    allowLocalStorage: boolean,
    customCss: String,
    customJs: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ExtensionStore {
    extensions: Vec<Extension>,
    categories: Vec<String>,
    featured: Vec<String>,
    searchQuery: String,
    selectedCategory: String,
}

pub struct ExtensionManager {
    data: Arc<Mutex<ExtensionData>>,
    configDir: PathBuf,
}

impl ExtensionManager {
    pub fn new() -> Self {
        let configDir = dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("privacy-browser");
        
        std::fs::create_dir_all(&configDir).ok();
        
        let manager = Self {
            data: Arc::new(Mutex::new(ExtensionData {
                extensions: HashMap::new(),
                settings: ExtensionSettings::default(),
                store: ExtensionStore {
                    extensions: Vec::new(),
                    categories: vec![
                        "All".to_string(),
                        "Productivity".to_string(),
                        "Privacy".to_string(),
                        "Security".to_string(),
                        "Shopping".to_string(),
                        "Social".to_string(),
                        "Developer Tools".to_string(),
                        "Accessibility".to_string(),
                        "Entertainment".to_string(),
                    ],
                    featured: Vec::new(),
                    searchQuery: String::new(),
                    selectedCategory: "All".to_string(),
                },
            }),
            configDir,
        };
        
        manager.load().ok();
        manager
    }

    fn extensions_path(&self) -> PathBuf {
        self.configDir.join("extensions.json")
    }

    fn settings_path(&self) -> PathBuf {
        self.configDir.join("extension_settings.json")
    }

    pub fn load(&mut self) -> Result<(), String> {
        let path = self.extensions_path();
        if path.exists() {
            let content = std::fs::read_to_string(&path)
                .map_err(|e| format!("Failed to read extensions file: {}", e))?;
            let data: ExtensionData = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse extensions: {}", e))?;
            *self.data.lock().unwrap() = data;
        }

        let settingsPath = self.settings_path();
        if settingsPath.exists() {
            let content = std::fs::read_to_string(&settingsPath)
                .map_err(|e| format!("Failed to read extension settings: {}", e))?;
            let settings: ExtensionSettings = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse extension settings: {}", e))?;
            self.data.lock().unwrap().settings = settings;
        }
        
        Ok(())
    }

    fn save(&self) -> Result<(), String> {
        let path = self.extensions_path();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        }

        let data = self.data.lock().unwrap();
        let content = serde_json::to_string_pretty(&*data)
            .map_err(|e| format!("Failed to serialize extensions: {}", e))?;
        std::fs::write(&path, content)
            .map_err(|e| format!("Failed to write extensions file: {}", e))?;

        let settingsPath = self.settings_path();
        let settings = &data.settings;
        let content = serde_json::to_string_pretty(settings)
            .map_err(|e| format!("Failed to serialize settings: {}", e))?;
        std::fs::write(&self.configDir.join("extension_settings.json"), content)
            .map_err(|e| format!("Failed to write extension settings: {}", e))?;

        Ok(())
    }

    pub fn add_extension(&mut self, mut extension: Extension) -> Result<(), String> {
        if extension.id.is_empty() {
            extension.id = Uuid::new_v4().to_string();
        }
        extension.installDate = chrono::Utc::now().to_rfc3339();
        
        let mut data = self.data.lock().unwrap();
        data.extensions.insert(extension.id.clone(), extension);
        drop(data);
        self.save()
    }

    pub fn uninstall_extension(&mut self, id: &str) -> Result<(), String> {
        let mut data = self.data.lock().unwrap();
        if let Some(ext) = data.extensions.get(id) {
            if ext.is_default {
                return Err("Cannot remove default extension".to_string());
            }
        }
        
        data.extensions.remove(id);
        drop(data);
        self.save()
    }

    pub fn enable_extension(&mut self, id: &str, enabled: boolean) -> Result<(), String> {
        let mut data = self.data.lock().unwrap();
        if let Some(ext) = data.extensions.get_mut(id) {
            ext.enabled = enabled;
            drop(data);
            self.save()
        } else {
            Err("Extension not found".to_string())
        }
    }

    pub fn get_extensions(&self) -> Vec<Extension> {
        let data = self.data.lock().unwrap();
        data.extensions.values().cloned().collect()
    }

    pub fn get_extension(&self, id: &str) -> Option<Extension> {
        let data = self.data.lock().unwrap();
        data.extensions.get(id).cloned()
    }

    pub fn add_extension(&mut self, extension: Extension) -> Result<(), String> {
        self.data.lock().unwrap().extensions.insert(extension.id.clone(), extension);
        self.save()
    }

    pub fn remove_extension(&mut self, id: &str) -> Result<(), String> {
        let mut data = self.data.lock().unwrap();
        if data.extensions.remove(id).is_none() {
            return Err("Extension not found".to_string());
        }
        drop(data);
        self.save()
    }

    pub fn toggle_extension(&mut self, id: &str, enabled: boolean) -> Result<(), String> {
        let mut data = self.data.lock().unwrap();
        if let Some(ext) = data.extensions.get_mut(id) {
            ext.enabled = enabled;
            drop(data);
            self.save()
        } else {
            Err("Extension not found".to_string())
        }
    }

    pub fn export_extensions(&self) -> Result<String, String> {
        let data = self.data.lock().unwrap();
        serde_json::to_string_pretty(&data.extensions)
            .map_err(|e| format!("Failed to export extensions: {}", e))
    }

    pub fn import_extensions(&mut self, json: &str) -> Result<(), String> {
        let extensions: Vec<Extension> = serde_json::from_str(json)
            .map_err(|e| format!("Failed to parse extensions: {}", e))?;
        
        let mut data = self.data.lock().unwrap();
        for ext in extensions {
            data.extensions.insert(ext.id.clone(), ext);
        }
        drop(data);
        self.save()
    }

    pub fn get_extensions(&self) -> Vec<Extension> {
        self.data.lock().unwrap().extensions.values().cloned().collect()
    }

    pub fn get_extension(&self, id: &str) -> Option<Extension> {
        self.data.lock().unwrap().extensions.get(id).cloned()
    }

    pub fn get_settings(&self) -> ExtensionSettings {
        self.data.lock().unwrap().settings.clone()
    }

    pub fn update_settings(&mut self, settings: ExtensionSettings) -> Result<(), String> {
        let mut data = self.data.lock().unwrap();
        data.settings = settings;
        drop(data);
        self.save()
    }

    pub fn get_store(&self) -> ExtensionStore {
        self.data.lock().unwrap().store.clone()
    }

    pub fn add_to_store(&mut self, extension: Extension) -> Result<(), String> {
        let mut data = self.data.lock().unwrap();
        data.store.extensions.push(extension);
        drop(data);
        self.save()
    }

    pub fn remove_from_store(&mut self, id: &str) -> Result<(), String> {
        let mut data = self.data.lock().unwrap();
        data.store.extensions.retain(|e| e.id != id);
        drop(data);
        self.save()
    }

    pub fn update_store(&mut self, store: ExtensionStore) -> Result<(), String> {
        let mut data = self.data.lock().unwrap();
        data.store = store;
        drop(data);
        self.save()
    }

    pub fn get_extension_settings(&self) -> ExtensionSettings {
        self.data.lock().unwrap().settings.clone()
    }

    pub fn update_extension_settings(&mut self, settings: ExtensionSettings) -> Result<(), String> {
        let mut data = self.data.lock().unwrap();
        data.settings = settings;
        drop(data);
        self.save()
    }
}

impl Default for ExtensionSettings {
    fn default() -> Self {
        Self {
            autoUpdate: true,
            devMode: false,
            allowIncognito: false,
            allowFileAccess: false,
            allowLocalStorage: true,
            customCss: String::new(),
            customJs: String::new(),
        }
    }
}

impl Default for ExtensionStore {
    fn default() -> Self {
        Self {
            extensions: Vec::new(),
            categories: vec![
                "All".to_string(),
                "Productivity".to_string(),
                "Privacy".to_string(),
                "Security".to_string(),
                "Shopping".to_string(),
                "Social".to_string(),
                "Developer Tools".to_string(),
                "Accessibility".to_string(),
                "Entertainment".to_string(),
            ],
            featured: Vec::new(),
            searchQuery: String::new(),
            selectedCategory: "All".to_string(),
        }
    }
}

impl Default for ExtensionManager {
    fn default() -> Self {
        Self::new()
    }
}