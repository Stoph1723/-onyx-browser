use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};
use tracing::{info, warn, error, debug};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tab {
    pub id: String,
    pub title: String,
    pub url: String,
    pub favicon: String,
    pub loading: bool,
    pub can_go_back: bool,
    pub can_go_forward: bool,
    pub is_private: bool,
    pub pinned: bool,
    pub muted: bool,
    pub webview_id: String,
    pub created_at: String,
    pub last_accessed: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TabState {
    pub tabs: Vec<Tab>,
    pub active_tab_id: Option<String>,
    pub next_tab_id: u64,
}

pub struct TabManager {
    tabs: HashMap<String, Tab>,
    active_tab_id: Option<String>,
    next_tab_id: u64,
    private_windows: HashMap<String, Vec<String>>,
}

impl TabManager {
    pub fn new() -> Self {
        Self {
            tabs: HashMap::new(),
            active_tab_id: None,
            next_tab_id: 0,
            private_windows: HashMap::new(),
        }
    }

    pub async fn create_tab(
        &mut self,
        app: &tauri::AppHandle,
        tab_id: String,
        url: String,
        is_private: bool,
    ) -> Result<(), String> {
        let webview_id = format!("webview-{}", tab_id);
        
        let tab = Tab {
            id: tab_id.clone(),
            title: "New Tab".to_string(),
            url: url.clone(),
            favicon: String::new(),
            loading: true,
            can_go_back: false,
            can_go_forward: false,
            is_private,
            pinned: false,
            muted: false,
            webview_id: webview_id.clone(),
            created_at: chrono::Utc::now().to_rfc3339(),
            last_accessed: chrono::Utc::now().to_rfc3339(),
        };

        let window_label = if is_private {
            format!("private-{}", tab_id)
        } else {
            format!("tab-{}", tab_id)
        };

        let webview_url = tauri::WebviewUrl::App(url.into());
        
        let window = tauri::WebviewWindowBuilder::new(app, &window_label, webview_url)
            .title("Onyx")
            .inner_size(800.0, 600.0)
            .min_inner_size(400.0, 300.0)
            .center()
            .decorations(false)
            .transparent(false)
            .visible(false)
            .resizable(true)
            .maximizable(true)
            .minimizable(true)
            .closable(true)
            .build()
            .map_err(|e| format!("Failed to create webview: {}", e))?;

        window.hide().ok();

        self.tabs.insert(tab_id.clone(), tab);
        
        if self.active_tab_id.is_none() {
            self.active_tab_id = Some(tab_id);
        }

        if is_private {
            self.private_windows
                .entry("private".to_string())
                .or_default()
                .push(window_label);
        }

        Ok(())
    }

    pub async fn close_tab(&mut self, tab_id: String) -> Result<(), String> {
        if let Some(tab) = self.tabs.remove(&tab_id) {
            if let Some(window) = self.get_webview_window(&tab.webview_id) {
                window.close().ok();
            }

            if self.active_tab_id.as_ref() == Some(&tab_id) {
                if let Some(next_tab) = self.tabs.values().next() {
                    self.active_tab_id = Some(next_tab.id.clone());
                } else {
                    self.active_tab_id = None;
                }
            }

            self.private_windows.values_mut().for_each(|windows| {
                windows.retain(|w| w != &tab.webview_id);
            });
        }
        Ok(())
    }

    pub fn set_active_tab(&mut self, tab_id: String) -> Result<(), String> {
        if self.tabs.contains_key(&tab_id) {
            if let Some(current_active) = self.active_tab_id.take() {
                if let Some(tab) = self.tabs.get_mut(&current_active) {
                    tab.last_accessed = chrono::Utc::now().to_rfc3339();
                }
            }
            
            self.active_tab_id = Some(tab_id.clone());
            
            if let Some(tab) = self.tabs.get_mut(&tab_id) {
                tab.last_accessed = chrono::Utc::now().to_rfc3339();
            }
            
            Ok(())
        } else {
            Err("Tab not found".to_string())
        }
    }

    pub async fn navigate_tab(&self, tab_id: String, url: String) -> Result<(), String> {
        if let Some(tab) = self.tabs.get(&tab_id) {
            if let Some(window) = self.get_webview_window(&tab.webview_id) {
                window.navigate(url.as_str()).map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    }

    pub async fn go_back(&self, tab_id: String) -> Result<(), String> {
        if let Some(tab) = self.tabs.get(&tab_id) {
            if let Some(window) = self.get_webview_window(&tab.webview_id) {
                window.eval("window.history.back()").map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    }

    pub async fn go_forward(&self, tab_id: String) -> Result<(), String> {
        if let Some(tab) = self.tabs.get(&tab_id) {
            if let Some(window) = self.get_webview_window(&tab.webview_id) {
                window.eval("window.history.forward()").map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    }

    pub async fn reload_tab(&self, tab_id: String, force: bool) -> Result<(), String> {
        if let Some(tab) = self.tabs.get(&tab_id) {
            if let Some(window) = self.get_webview_window(&tab.webview_id) {
                if force {
                    window.eval("window.location.reload(true)").map_err(|e| e.to_string())?;
                } else {
                    window.eval("window.location.reload()").map_err(|e| e.to_string())?;
                }
            }
        }
        Ok(())
    }

    pub async fn focus_webview(&self, webview_id: String) -> Result<(), String> {
        if let Some(window) = self.get_webview_window(&webview_id) {
            window.set_focus().map_err(|e| e.to_string())?;
            window.show().map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub async fn webview_go_back(&self, webview_id: String) -> Result<(), String> {
        if let Some(window) = self.get_webview_window(&webview_id) {
            window.eval("window.history.back()").map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub async fn webview_go_forward(&self, webview_id: String) -> Result<(), String> {
        if let Some(window) = self.get_webview_window(&webview_id) {
            window.eval("window.history.forward()").map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub async fn webview_reload(&self, webview_id: String, force: bool) -> Result<(), String> {
        if let Some(window) = self.get_webview_window(&webview_id) {
            if force {
                window.eval("window.location.reload(true)").map_err(|e| e.to_string())?;
            } else {
                window.eval("window.location.reload()").map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    }

    pub async fn webview_set_audio_muted(&self, webview_id: String, muted: bool) -> Result<(), String> {
        if let Some(window) = self.get_webview_window(&webview_id) {
            window.eval(&format!("document.querySelectorAll('video, audio').forEach(el => el.muted = {})", muted))
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub fn get_tab(&self, tab_id: &str) -> Option<&Tab> {
        self.tabs.get(tab_id)
    }

    pub fn get_active_tab(&self) -> Option<&Tab> {
        self.active_tab_id.as_ref().and_then(|id| self.tabs.get(id))
    }

    pub fn get_all_tabs(&self) -> Vec<&Tab> {
        self.tabs.values().collect()
    }

    pub fn get_active_tab_id(&self) -> Option<&String> {
        self.active_tab_id.as_ref()
    }

    pub fn update_tab(&mut self, tab_id: &str, updates: TabUpdate) {
        if let Some(tab) = self.tabs.get_mut(tab_id) {
            if let Some(title) = updates.title {
                tab.title = title;
            }
            if let Some(url) = updates.url {
                tab.url = url;
            }
            if let Some(favicon) = updates.favicon {
                tab.favicon = favicon;
            }
            if let Some(loading) = updates.loading {
                tab.loading = loading;
            }
            if let Some(can_go_back) = updates.can_go_back {
                tab.can_go_back = can_go_back;
            }
            if let Some(can_go_forward) = updates.can_go_forward {
                tab.can_go_forward = can_go_forward;
            }
            if let Some(muted) = updates.muted {
                tab.muted = muted;
            }
            if let Some(pinned) = updates.pinned {
                tab.pinned = pinned;
            }
        }
    }

    fn get_webview_window(&self, webview_id: &str) -> Option<tauri::WebviewWindow> {
        tauri::Manager::get_webview_window(webview_id)
    }

    pub fn get_state(&self) -> TabState {
        TabState {
            tabs: self.tabs.values().cloned().collect(),
            active_tab_id: self.active_tab_id.clone(),
            next_tab_id: self.next_tab_id,
        }
    }
}

#[derive(Debug, Default)]
pub struct TabUpdate {
    pub title: Option<String>,
    pub url: Option<String>,
    pub favicon: Option<String>,
    pub loading: Option<bool>,
    pub can_go_back: Option<bool>,
    pub can_go_forward: Option<bool>,
    pub muted: Option<bool>,
    pub pinned: Option<bool>,
}

impl Default for TabManager {
    fn default() -> Self {
        Self::new()
    }
}